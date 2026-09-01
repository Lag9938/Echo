import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { playJoinSound, playLeaveSound, playMuteSound, playUnmuteSound, playDeafenSound, playUndeafenSound, playScreenStartSound, playScreenStopSound } from './soundEffects'

export type VoiceParticipant = {
  userId: string
  displayName: string
  isSpeaking: boolean
  avatarUrl?: string
  screenStream?: MediaStream
  isMuted?: boolean
  isDeafened?: boolean
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

// Threshold for speaking detection (0-255)
const SPEAKING_THRESHOLD = 25
const SPEAKING_CHECK_INTERVAL = 150

function optimizeSDP(sdp: string): string {
  // O SDP é composto por seções de mídia que começam com "m="
  const sections = sdp.split('\r\nm=');
  let isFirstAudio = true;
  
  for (let i = 1; i < sections.length; i++) {
    let section = sections[i];
    if (section.startsWith('audio')) {
      // A primeira seção de áudio encontrada é sempre a do microfone.
      // Qualquer seção subsequente é a da transmissão de tela (screenshare).
      if (isFirstAudio) {
        // Voz (Microfone): Mono, 64kbps, DTX ativo
        section = optimizeAudioSection(section, { stereo: 0, bitrate: 64000, dtx: 1 });
        isFirstAudio = false;
      } else {
        // Transmissão de tela (Jogo): Stereo, 128kbps, DTX inativo
        section = optimizeAudioSection(section, { stereo: 1, bitrate: 128000, dtx: 0 });
      }
      sections[i] = section;
    } else if (section.startsWith('video')) {
      // Otimização de vídeo de jogo para WebRTC (60 FPS, Bitrate alto sem pixelização)
      section = optimizeVideoSection(section);
      sections[i] = section;
    }
  }
  
  return sections.join('\r\nm=');
}

function optimizeAudioSection(section: string, config: { stereo: number; bitrate: number; dtx: number }): string {
  let lines = section.split('\r\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('a=rtpmap:') && lines[i].toLowerCase().includes('opus/48000/2')) {
      const match = lines[i].match(/a=rtpmap:(\d+)\s+opus/i);
      if (match) {
        const payloadType = match[1];
        for (let j = 0; j < lines.length; j++) {
          if (lines[j].startsWith(`a=fmtp:${payloadType}`)) {
            lines[j] = `a=fmtp:${payloadType} maxaveragebitrate=${config.bitrate};stereo=${config.stereo};sprop-stereo=${config.stereo};useinbandfec=1;usedtx=${config.dtx};cbr=0;maxplaybackrate=48000;sprop-maxcapturerate=48000;minptime=10`;
            break;
          }
        }
      }
    }
  }
  return lines.join('\r\n');
}

function createStudioMicrophoneDSP(stream: MediaStream): { finalStream: MediaStream; audioCtx: AudioContext } {
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtxClass({ sampleRate: 48000 });
  const source = audioCtx.createMediaStreamSource(stream);

  // 1. Filtro Passa-Alta em 85 Hz (elimina vibrações de mesa, sopro e vento de ventoinhas)
  const highpass = audioCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 85;
  highpass.Q.value = 0.707;

  // 2. Filtro Passa-Baixa em 14 kHz (elimina ruído elétrico de microfones USB e chiados de alta frequência)
  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 14000;
  lowpass.Q.value = 0.707;

  // 3. Compressor Dinâmico de Estúdio (nivelamento automático de voz para som quente e broadcast)
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;

  const dest = audioCtx.createMediaStreamDestination();
  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(compressor);
  compressor.connect(dest);

  return { finalStream: dest.stream, audioCtx };
}

function optimizeVideoSection(section: string): string {
  let lines = section.split('\r\n');
  let hasBandwidth = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('b=AS:') || lines[i].startsWith('b=TIAS:')) {
      lines[i] = 'b=AS:8000\r\nb=TIAS:8000000';
      hasBandwidth = true;
      break;
    }
  }

  if (!hasBandwidth) {
    lines.splice(1, 0, 'b=AS:8000', 'b=TIAS:8000000');
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('a=rtpmap:') && (lines[i].toLowerCase().includes('h264/90000') || lines[i].toLowerCase().includes('vp8/90000') || lines[i].toLowerCase().includes('vp9/90000'))) {
      const match = lines[i].match(/a=rtpmap:(\d+)\s+/i);
      if (match) {
        const pt = match[1];
        let foundFmtp = false;
        for (let j = 0; j < lines.length; j++) {
          if (lines[j].startsWith(`a=fmtp:${pt}`)) {
            foundFmtp = true;
            if (!lines[j].includes('x-google-max-bitrate')) {
              lines[j] += ';x-google-min-bitrate=2000;x-google-max-bitrate=8000;x-google-start-bitrate=4500';
            }
            break;
          }
        }
        if (!foundFmtp) {
          lines.push(`a=fmtp:${pt} x-google-min-bitrate=2000;x-google-max-bitrate=8000;x-google-start-bitrate=4500`);
        }
      }
    }
  }

  return lines.join('\r\n');
}

async function applyVideoSenderParameters(sender: RTCRtpSender, width?: number, _height?: number, fps?: number) {
  try {
    const parameters = sender.getParameters();
    if (!parameters.encodings || parameters.encodings.length === 0) {
      parameters.encodings = [{}];
    }
    const targetFps = fps || 60;
    const isHighQuality = (width && width >= 1920) || targetFps === 60;
    
    // Alta alocação de bitrate para eliminar pixelização e manter nitidez 60 FPS
    const maxBitrate = isHighQuality ? 6000000 : (targetFps >= 60 ? 4000000 : 2500000);
    
    parameters.encodings[0].maxBitrate = maxBitrate;
    parameters.encodings[0].maxFramerate = targetFps;
    parameters.encodings[0].scaleResolutionDownBy = 1.0;
    parameters.degradationPreference = 'maintain-framerate';
    
    await sender.setParameters(parameters);
  } catch (e) {
    console.warn('Could not apply video sender parameters:', e);
  }
}

function preferHardwareVideoCodecs(pc: RTCPeerConnection) {
  if (typeof RTCRtpReceiver.getCapabilities === 'function') {
    const capabilities = RTCRtpReceiver.getCapabilities('video');
    if (capabilities && capabilities.codecs) {
      const h264Codecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264');
      const otherCodecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() !== 'video/h264');
      const sortedCodecs = [...h264Codecs, ...otherCodecs];
      
      const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
      for (const transceiver of transceivers) {
        if (transceiver.receiver.track && transceiver.receiver.track.kind === 'video') {
          if (typeof transceiver.setCodecPreferences === 'function') {
            try {
              transceiver.setCodecPreferences(sortedCodecs);
            } catch (e) {}
          }
        }
      }
    }
  }
}

export function useVoiceChannel() {
  const [participants, setParticipants] = useState<VoiceParticipant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null)
  const [rtcStats, setRtcStats] = useState<{ ping: number; jitter: number; packetLoss: number } | null>(null)

  const isMutedRef = useRef(false)
  const isDeafenedRef = useRef(false)

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const localRawStreamRef = useRef<MediaStream | null>(null)
  const localDspCtxRef = useRef<AudioContext | null>(null)
  const localScreenStreamRef = useRef<MediaStream | null>(null)
  const screenSendersRef = useRef<Map<string, RTCRtpSender>>(new Map()) // Tracks video senders per peer
  const screenAudioSendersRef = useRef<Map<string, RTCRtpSender>>(new Map()) // Tracks audio senders per peer
  const channelRef = useRef<RealtimeChannel | null>(null)
  const myInfoRef = useRef<{ userId: string; displayName: string; avatarUrl?: string } | null>(null)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  
  // Analysers
  const analysersRef = useRef<Map<string, { analyser: AnalyserNode; ctx: AudioContext }>>(new Map())
  const localAnalyserRef = useRef<{ analyser: AnalyserNode; ctx: AudioContext } | null>(null)
  
  // Selected devices configuration
  const selectedInputIdRef = useRef<string>('default')
  const selectedOutputIdRef = useRef<string>('default')

  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const peerVolumesRef = useRef<Map<string, number>>(new Map()) // Tracks local volume per peer
  const peerScreenVolumesRef = useRef<Map<string, number>>(new Map()) // Tracks local screenshare volume per peer
  const participantsMapRef = useRef<Map<string, { displayName: string; avatarUrl?: string; screenStream?: MediaStream; isMuted?: boolean; isDeafened?: boolean }>>(new Map())
  const activeChannelIdRef = useRef<string | null>(null)
  const activeSpaceIdRef = useRef<string | null>(null)
  const spaceVoiceChannelRef = useRef<RealtimeChannel | null>(null)

  // Update participants list from the map
  const syncParticipants = useCallback(() => {
    const list: VoiceParticipant[] = []
    // Add self
    if (myInfoRef.current) {
      list.push({
        userId: myInfoRef.current.userId,
        displayName: myInfoRef.current.displayName,
        avatarUrl: myInfoRef.current.avatarUrl,
        isSpeaking: false,
        screenStream: localScreenStreamRef.current || undefined,
        isMuted: isDeafenedRef.current || isMutedRef.current,
        isDeafened: isDeafenedRef.current
      })
    }
    // Add others
    participantsMapRef.current.forEach((info, id) => {
      if (id !== myInfoRef.current?.userId) {
        const isLive = info.screenStream && info.screenStream.getVideoTracks().some(t => t.readyState === 'live' && !t.muted)
        list.push({
          userId: id,
          displayName: info.displayName,
          avatarUrl: info.avatarUrl,
          isSpeaking: false,
          screenStream: isLive ? info.screenStream : undefined,
          isMuted: info.isMuted,
          isDeafened: info.isDeafened
        })
      }
    })
    setParticipants(list)
  }, [])

  // Create a peer connection for a remote user
  const createPeerConnection = useCallback((remoteUserId: string) => {
    if (!localStreamRef.current || !supabase) return undefined

    const pc = new RTCPeerConnection(ICE_SERVERS)
    preferHardwareVideoCodecs(pc)

    // Add local audio tracks
    localStreamRef.current.getAudioTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!)
    })

    // If we are currently sharing screen, add the video and audio tracks to this new peer connection too!
    if (localScreenStreamRef.current) {
      const videoTrack = localScreenStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        const sender = pc.addTrack(videoTrack, localScreenStreamRef.current)
        screenSendersRef.current.set(remoteUserId, sender)
        applyVideoSenderParameters(sender)
      }
      const audioTrack = localScreenStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        const sender = pc.addTrack(audioTrack, localScreenStreamRef.current)
        screenAudioSendersRef.current.set(remoteUserId, sender)
      }
    }

    // Handle remote tracks (audio or video)
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0]
      if (!remoteStream) return

      const track = event.track
      if (track.kind === 'audio') {
        // Detect if this is screenshare audio (stream contains a video track) or normal microphone voice
        const isScreen = remoteStream.getVideoTracks().length > 0
        const key = isScreen ? `${remoteUserId}-screen` : `${remoteUserId}-voice`
        
        let audio = audioElementsRef.current.get(key)
        if (!audio) {
          audio = new Audio()
          audio.autoplay = true
          const savedVol = isScreen
            ? (peerScreenVolumesRef.current.get(remoteUserId) !== undefined ? peerScreenVolumesRef.current.get(remoteUserId)! : 1.0)
            : (peerVolumesRef.current.get(remoteUserId) !== undefined ? peerVolumesRef.current.get(remoteUserId)! : 1.0)
          audio.volume = savedVol
          audio.muted = isDeafenedRef.current
          audioElementsRef.current.set(key, audio)
        }
        audio.muted = isDeafenedRef.current
        audio.srcObject = remoteStream

        // Set output device if configured
        if (typeof audio.setSinkId === 'function' && selectedOutputIdRef.current !== 'default') {
          audio.setSinkId(selectedOutputIdRef.current).catch(err => {
            console.error('Error setting sinkId during peer connection setup:', err)
          })
        }

        // Set up speaking detection
        try {
          const ctx = new AudioContext()
          const source = ctx.createMediaStreamSource(remoteStream)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 512
          source.connect(analyser)
          analysersRef.current.set(remoteUserId, { analyser, ctx })
        } catch {
          // AudioContext may fail in some environments
        }
      } else if (track.kind === 'video') {
        // This is a screen share stream from the remote user!
        const current = participantsMapRef.current.get(remoteUserId) || { displayName: 'Membro' }
        participantsMapRef.current.set(remoteUserId, {
          ...current,
          screenStream: remoteStream
        })
        syncParticipants()

        // Handle track stop and mute cleanly
        const handleStop = () => {
          const info = participantsMapRef.current.get(remoteUserId)
          if (info && info.screenStream) {
            delete info.screenStream
            syncParticipants()
          }
        }
        track.onended = handleStop
        track.onmute = () => {
          setTimeout(() => {
            if (track.readyState === 'ended' || track.muted) {
              handleStop()
            }
          }, 300)
        }
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: myInfoRef.current!.userId,
            to: remoteUserId,
            candidate: event.candidate.toJSON(),
          },
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupPeer(remoteUserId)
      }
    }

    peersRef.current.set(remoteUserId, pc)
    return pc
  }, [syncParticipants])

  // Clean up a single peer
  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId)
    if (pc) { pc.close(); peersRef.current.delete(peerId) }

    audioElementsRef.current.forEach((audio, key) => {
      if (key === peerId || key.startsWith(`${peerId}-`)) {
        audio.srcObject = null
        audioElementsRef.current.delete(key)
      }
    })

    const a = analysersRef.current.get(peerId)
    if (a) { a.ctx.close().catch(() => {}); analysersRef.current.delete(peerId) }

    screenSendersRef.current.delete(peerId)
    pendingCandidatesRef.current.delete(peerId)
    participantsMapRef.current.delete(peerId)
    syncParticipants()
  }, [syncParticipants])

  // Handle incoming signaling messages
  const handleSignal = useCallback(async (event: string, payload: Record<string, unknown>) => {
    const from = payload.from as string
    const to = payload.to as string

    // Ignore messages not meant for us
    if (to !== myInfoRef.current?.userId) return

    if (event === 'sdp-offer') {
      const sdp = payload.sdp as RTCSessionDescriptionInit
      let pc = peersRef.current.get(from)
      if (!pc) pc = createPeerConnection(from)
      if (!pc) return

      await pc.setRemoteDescription(new RTCSessionDescription(sdp))

      // Check if remote peer stopped sharing video
      const transceivers = pc.getTransceivers ? pc.getTransceivers() : []
      const hasLiveVideoTrack = transceivers.some(t => t.receiver.track && t.receiver.track.kind === 'video' && t.currentDirection !== 'inactive' && t.currentDirection !== 'sendonly' && t.receiver.track.readyState === 'live')
      if (!hasLiveVideoTrack) {
        const info = participantsMapRef.current.get(from)
        if (info && info.screenStream) {
          info.screenStream.getTracks().forEach(t => t.stop())
          delete info.screenStream
          syncParticipants()
        }
      }

      // Apply any pending ICE candidates
      const pending = pendingCandidatesRef.current.get(from) ?? []
      for (const c of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      }
      pendingCandidatesRef.current.delete(from)

      let answer = await pc.createAnswer()
      const optimizedSdp = optimizeSDP(answer.sdp || '')
      const finalAnswer = { type: answer.type, sdp: optimizedSdp }
      await pc.setLocalDescription(finalAnswer)

      channelRef.current?.send({
        type: 'broadcast',
        event: 'sdp-answer',
        payload: { from: myInfoRef.current!.userId, to: from, sdp: finalAnswer },
      })
    }

    if (event === 'sdp-answer') {
      const sdp = payload.sdp as RTCSessionDescriptionInit
      const pc = peersRef.current.get(from)
      if (!pc) return
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))

      // Check if remote peer stopped sharing video
      const transceivers = pc.getTransceivers ? pc.getTransceivers() : []
      const hasLiveVideoTrack = transceivers.some(t => t.receiver.track && t.receiver.track.kind === 'video' && t.currentDirection !== 'inactive' && t.currentDirection !== 'sendonly' && t.receiver.track.readyState === 'live')
      if (!hasLiveVideoTrack) {
        const info = participantsMapRef.current.get(from)
        if (info && info.screenStream) {
          info.screenStream.getTracks().forEach(t => t.stop())
          delete info.screenStream
          syncParticipants()
        }
      }

      // Apply any pending ICE candidates
      const pending = pendingCandidatesRef.current.get(from) ?? []
      for (const c of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      }
      pendingCandidatesRef.current.delete(from)
    }

    if (event === 'ice-candidate') {
      const candidate = payload.candidate as RTCIceCandidateInit
      const pc = peersRef.current.get(from)
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      } else {
        // Queue the candidate for later
        const pending = pendingCandidatesRef.current.get(from) ?? []
        pending.push(candidate)
        pendingCandidatesRef.current.set(from, pending)
      }
    }
  }, [createPeerConnection])

  // Initiate connection to a peer (we create the offer)
  const initiateConnection = useCallback(async (remoteUserId: string) => {
    let pc = peersRef.current.get(remoteUserId)
    if (!pc) pc = createPeerConnection(remoteUserId)
    if (!pc) return

    let offer = await pc.createOffer()
    const optimizedSdp = optimizeSDP(offer.sdp || '')
    const finalOffer = { type: offer.type, sdp: optimizedSdp }
    await pc.setLocalDescription(finalOffer)

    channelRef.current?.send({
      type: 'broadcast',
      event: 'sdp-offer',
      payload: { from: myInfoRef.current!.userId, to: remoteUserId, sdp: finalOffer },
    })
  }, [createPeerConnection])

  // Start speaking detection interval
  const startSpeakingDetection = useCallback(() => {
    if (speakingIntervalRef.current) return

    speakingIntervalRef.current = setInterval(() => {
      const updates: Record<string, boolean> = {}

      // Check local stream speaking (Glow own name)
      if (localAnalyserRef.current && myInfoRef.current) {
        const data = new Uint8Array(localAnalyserRef.current.analyser.frequencyBinCount)
        localAnalyserRef.current.analyser.getByteFrequencyData(data)
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length
        
        // Muted local microphone shouldn't trigger speaking
        const isLocalMuted = localStreamRef.current?.getAudioTracks()[0]?.enabled === false
        updates[myInfoRef.current.userId] = !isLocalMuted && avg > SPEAKING_THRESHOLD
      }

      // Check remote streams
      analysersRef.current.forEach((a, peerId) => {
        const data = new Uint8Array(a.analyser.frequencyBinCount)
        a.analyser.getByteFrequencyData(data)
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length
        updates[peerId] = avg > SPEAKING_THRESHOLD
      })

      setParticipants(prev =>
        prev.map(p => ({
          ...p,
          isSpeaking: updates[p.userId] ?? p.isSpeaking,
        }))
      )
    }, SPEAKING_CHECK_INTERVAL)
  }, [])

  // Join a voice channel (with custom device selection inputs and optional spaceId)
  const joinVoice = useCallback(async (channelId: string, userId: string, displayName: string, avatarUrl?: string, inputId?: string, outputId?: string, noiseSuppression = true, echoCancellation = true, spaceId?: string) => {
    if (!supabase || isConnected) return

    try {
      if (inputId) selectedInputIdRef.current = inputId
      if (outputId) selectedOutputIdRef.current = outputId

      activeChannelIdRef.current = channelId
      activeSpaceIdRef.current = spaceId || null

      // Get microphone access with requested constraints
      const constraints = {
        audio: {
          deviceId: inputId && inputId !== 'default' ? { exact: inputId } : undefined,
          echoCancellation: echoCancellation,
          noiseSuppression: noiseSuppression,
          autoGainControl: true,
          channelCount: 1,
          googEchoCancellation: echoCancellation,
          googNoiseSuppression: noiseSuppression,
          googAutoGainControl: true,
          googHighpassFilter: true,
          googNoiseReduction: noiseSuppression
        } as any,
        video: false
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localRawStreamRef.current = stream
      myInfoRef.current = { userId, displayName, avatarUrl }

      let finalStream = stream
      try {
        const { finalStream: dspStream, audioCtx } = createStudioMicrophoneDSP(stream)
        localDspCtxRef.current = audioCtx
        finalStream = dspStream
      } catch (dspErr) {
        console.error('Failed to initialize local microphone DSP pipeline:', dspErr)
      }

      localStreamRef.current = finalStream

      // Setup local audio analyser for speaking detection (connect to final filtered stream)
      try {
        const ctx = new AudioContext()
        const source = ctx.createMediaStreamSource(finalStream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        localAnalyserRef.current = { analyser, ctx }
      } catch (err) {
        console.error('Failed to setup local audio analyser:', err)
      }

      // Create the Supabase Realtime channel for WebRTC signaling
      const realtimeChannel = supabase.channel(`voice-${channelId}`, {
        config: { presence: { key: userId } },
      })

      channelRef.current = realtimeChannel

      // Listen for signaling broadcasts
      realtimeChannel.on('broadcast', { event: 'sdp-offer' }, ({ payload }) => {
        handleSignal('sdp-offer', payload as Record<string, unknown>)
      })
      realtimeChannel.on('broadcast', { event: 'sdp-answer' }, ({ payload }) => {
        handleSignal('sdp-answer', payload as Record<string, unknown>)
      })
      realtimeChannel.on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        handleSignal('ice-candidate', payload as Record<string, unknown>)
      })
      realtimeChannel.on('broadcast', { event: 'screenshare-stopped' }, ({ payload }) => {
        const peerId = (payload as Record<string, string>)?.from
        if (peerId) {
          const info = participantsMapRef.current.get(peerId)
          if (info) {
            delete info.screenStream
            syncParticipants()
          }
        }
      })

      // Handle presence: peer joins
      realtimeChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
        for (const presence of newPresences) {
          const p = presence as Record<string, any>
          const peerId = p.user_id
          const peerName = p.display_name
          const peerAvatar = p.avatar_url
          const peerMuted = !!p.is_muted
          const peerDeafened = !!p.is_deafened
          if (peerId && peerId !== userId) {
            const sfxVol = parseFloat(localStorage.getItem('echo-sfx-volume') || '0.5')
            playJoinSound(sfxVol)

            participantsMapRef.current.set(peerId, { 
              displayName: peerName || 'Membro',
              avatarUrl: peerAvatar,
              isMuted: peerMuted,
              isDeafened: peerDeafened
            })
            syncParticipants()

            if (userId < peerId) {
              initiateConnection(peerId)
            }
          }
        }
      })

      // Handle presence: peer leaves
      realtimeChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        for (const presence of leftPresences) {
          const peerId = (presence as Record<string, string>).user_id
          if (peerId && peerId !== userId) {
            const sfxVol = parseFloat(localStorage.getItem('echo-sfx-volume') || '0.5')
            playLeaveSound(sfxVol)
            cleanupPeer(peerId)
          }
        }
      })

      // Handle presence sync (existing users when we join or status updates)
      realtimeChannel.on('presence', { event: 'sync' }, () => {
        const state = realtimeChannel.presenceState()
        Object.entries(state).forEach(([_key, presences]) => {
          for (const presence of presences) {
            const p = presence as Record<string, any>
            if (p.user_id && p.user_id !== userId) {
              const existing = participantsMapRef.current.get(p.user_id)
              participantsMapRef.current.set(p.user_id, { 
                displayName: p.display_name || 'Membro',
                avatarUrl: p.avatar_url,
                screenStream: existing?.screenStream,
                isMuted: !!p.is_muted,
                isDeafened: !!p.is_deafened
              })
            }
          }
        })
        syncParticipants()
      })

      // Subscribe and track presence on room channel
      await realtimeChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await realtimeChannel.track({
            user_id: userId,
            display_name: displayName,
            avatar_url: avatarUrl,
            online_at: new Date().toISOString(),
            is_muted: isMutedRef.current,
            is_deafened: isDeafenedRef.current,
          })
        }
      })

      // Also track presence on space-wide channel for sidebar visibility
      if (spaceId) {
        const spacePresenceChannel = supabase.channel(`space-voice-${spaceId}`, {
          config: { presence: { key: userId } }
        })
        spaceVoiceChannelRef.current = spacePresenceChannel
        spacePresenceChannel.subscribe(async (s) => {
          if (s === 'SUBSCRIBED') {
            await spacePresenceChannel.track({
              user_id: userId,
              display_name: displayName,
              avatar_url: avatarUrl,
              channel_id: channelId,
              is_muted: isMutedRef.current,
              is_deafened: isDeafenedRef.current,
              is_speaking: false,
              has_screen: !!localScreenStreamRef.current
            }).catch(() => {})
          }
        })
      }

      setIsConnected(true)
      const sfxVol = parseFloat(localStorage.getItem('echo-sfx-volume') || '0.5')
      playJoinSound(sfxVol)
      startSpeakingDetection()
    } catch (err) {
      console.error('Failed to join voice channel:', err)
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
  }, [isConnected, handleSignal, initiateConnection, cleanupPeer, syncParticipants, startSpeakingDetection])

  // Leave voice channel
  const leaveVoice = useCallback(() => {
    if (localStreamRef.current) {
      const sfxVol = parseFloat(localStorage.getItem('echo-sfx-volume') || '0.5')
      playLeaveSound(sfxVol)
    }

    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current)
      speakingIntervalRef.current = null
    }

    // Stop local analyser
    if (localAnalyserRef.current) {
      localAnalyserRef.current.ctx.close().catch(() => {})
      localAnalyserRef.current = null
    }

    // Stop screen share
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop())
      localScreenStreamRef.current = null
      setLocalScreenStream(null)
    }
    screenSendersRef.current.clear()
    screenAudioSendersRef.current.clear()

    // Close all peer connections
    peersRef.current.forEach((pc) => pc.close())
    peersRef.current.clear()

    // Stop local audio stream (both raw and processed)
    if (localRawStreamRef.current) {
      localRawStreamRef.current.getTracks().forEach(t => t.stop())
      localRawStreamRef.current = null
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null

    // Close local DSP context
    if (localDspCtxRef.current) {
      localDspCtxRef.current.close().catch(() => {})
      localDspCtxRef.current = null
    }

    // Clean up audio elements
    audioElementsRef.current.forEach(audio => { audio.srcObject = null })
    audioElementsRef.current.clear()

    // Clean up analysers
    analysersRef.current.forEach(a => a.ctx.close().catch(() => {}))
    analysersRef.current.clear()

    // Leave space-wide realtime channel
    if (spaceVoiceChannelRef.current && supabase) {
      spaceVoiceChannelRef.current.untrack().catch(() => {})
      supabase.removeChannel(spaceVoiceChannelRef.current)
      spaceVoiceChannelRef.current = null
    }

    // Leave room realtime channel
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    activeSpaceIdRef.current = null
    activeChannelIdRef.current = null
    pendingCandidatesRef.current.clear()
    participantsMapRef.current.clear()
    myInfoRef.current = null
    isMutedRef.current = false
    isDeafenedRef.current = false
    setParticipants([])
    setIsConnected(false)
    setIsMuted(false)
    setIsDeafened(false)
  }, [])

  // Toggle deafen (mutes all incoming audio + mutes own microphone)
  const toggleDeafen = useCallback(() => {
    const nextDeafened = !isDeafenedRef.current
    isDeafenedRef.current = nextDeafened
    setIsDeafened(nextDeafened)

    const sfxVol = parseFloat(localStorage.getItem('echo-sfx-volume') || '0.5')

    if (nextDeafened) {
      playDeafenSound(sfxVol)
      // Mute all incoming audio streams (voice and screenshare)
      audioElementsRef.current.forEach(audio => {
        audio.muted = true
      })
      // Mute local microphone
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = false
        }
      }
    } else {
      playUndeafenSound(sfxVol)
      // Unmute all incoming audio streams
      audioElementsRef.current.forEach(audio => {
        audio.muted = false
      })
      // Restore microphone based on user's mute setting
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = !isMutedRef.current
        }
      }
    }

    if (channelRef.current && myInfoRef.current) {
      channelRef.current.track({
        user_id: myInfoRef.current.userId,
        display_name: myInfoRef.current.displayName,
        avatar_url: myInfoRef.current.avatarUrl,
        online_at: new Date().toISOString(),
        is_muted: nextDeafened ? true : isMutedRef.current,
        is_deafened: nextDeafened,
      }).catch(() => {})
    }

    if (spaceVoiceChannelRef.current && myInfoRef.current) {
      spaceVoiceChannelRef.current.track({
        user_id: myInfoRef.current.userId,
        display_name: myInfoRef.current.displayName,
        avatar_url: myInfoRef.current.avatarUrl,
        channel_id: activeChannelIdRef.current,
        is_muted: nextDeafened ? true : isMutedRef.current,
        is_deafened: nextDeafened,
        is_speaking: false,
        has_screen: !!localScreenStreamRef.current
      }).catch(() => {})
    }

    syncParticipants()
  }, [syncParticipants])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (isDeafenedRef.current) {
      // If user is deafened and clicks mute/unmute, undeafen them and unmute
      toggleDeafen()
      return
    }

    if (!localStreamRef.current) return
    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      const nextMuted = audioTrack.enabled // If enabled, we will mute it (next is muted = true)
      audioTrack.enabled = !nextMuted
      isMutedRef.current = nextMuted
      setIsMuted(nextMuted)

      const sfxVol = parseFloat(localStorage.getItem('echo-sfx-volume') || '0.5')
      if (nextMuted) {
        playMuteSound(sfxVol)
      } else {
        playUnmuteSound(sfxVol)
      }

      if (channelRef.current && myInfoRef.current) {
        channelRef.current.track({
          user_id: myInfoRef.current.userId,
          display_name: myInfoRef.current.displayName,
          avatar_url: myInfoRef.current.avatarUrl,
          online_at: new Date().toISOString(),
          is_muted: nextMuted,
          is_deafened: isDeafenedRef.current,
        }).catch(() => {})
      }

      if (spaceVoiceChannelRef.current && myInfoRef.current) {
        spaceVoiceChannelRef.current.track({
          user_id: myInfoRef.current.userId,
          display_name: myInfoRef.current.displayName,
          avatar_url: myInfoRef.current.avatarUrl,
          channel_id: activeChannelIdRef.current,
          is_muted: nextMuted,
          is_deafened: isDeafenedRef.current,
          is_speaking: false,
          has_screen: !!localScreenStreamRef.current
        }).catch(() => {})
      }

      syncParticipants()
    }
  }, [toggleDeafen, syncParticipants])

  // Change input microphone device in real-time
  const changeInputDevice = useCallback(async (deviceId: string, noiseSuppression = true, echoCancellation = true) => {
    selectedInputIdRef.current = deviceId
    if (!isConnected || !localStreamRef.current) return

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId: { exact: deviceId },
          echoCancellation: echoCancellation,
          noiseSuppression: noiseSuppression,
          autoGainControl: true,
          channelCount: 1,
          googEchoCancellation: echoCancellation,
          googNoiseSuppression: noiseSuppression,
          googAutoGainControl: true,
          googHighpassFilter: true,
          googNoiseReduction: noiseSuppression
        } as any,
        video: false
      })
      // Close old DSP context and stop raw tracks
      if (localDspCtxRef.current) {
        localDspCtxRef.current.close().catch(() => {})
        localDspCtxRef.current = null
      }
      if (localRawStreamRef.current) {
        localRawStreamRef.current.getTracks().forEach(t => t.stop())
      }
      localRawStreamRef.current = newStream

      let finalStream = newStream
      try {
        const { finalStream: dspStream, audioCtx } = createStudioMicrophoneDSP(newStream)
        localDspCtxRef.current = audioCtx
        finalStream = dspStream
      } catch (dspErr) {
        console.error('Failed to initialize local microphone DSP pipeline on device change:', dspErr)
      }

      const newTrack = finalStream.getAudioTracks()[0]

      const oldTracks = localStreamRef.current.getAudioTracks()
      oldTracks.forEach(t => t.stop())

      localStreamRef.current.removeTrack(oldTracks[0])
      localStreamRef.current.addTrack(newTrack)

      // Replace audio track on all active WebRTC peer connections
      for (const pc of peersRef.current.values()) {
        const senders = pc.getSenders()
        const audioSender = senders.find(s => s.track?.kind === 'audio')
        if (audioSender) {
          await audioSender.replaceTrack(newTrack)
        }
      }

      // Re-create local analyser for volume tracking (connect to final filtered stream)
      if (localAnalyserRef.current) {
        localAnalyserRef.current.ctx.close().catch(() => {})
      }
      try {
        const ctx = new AudioContext()
        const source = ctx.createMediaStreamSource(finalStream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        localAnalyserRef.current = { analyser, ctx }
      } catch (e) {}

    } catch (err) {
      console.error('Failed to change input device:', err)
    }
  }, [isConnected])

  // Change output speaker device in real-time
  const changeOutputDevice = useCallback(async (deviceId: string) => {
    selectedOutputIdRef.current = deviceId

    for (const audio of audioElementsRef.current.values()) {
      if (typeof audio.setSinkId === 'function') {
        try {
          await audio.setSinkId(deviceId)
        } catch (err) {
          console.error('Failed to setSinkId on audio element:', err)
        }
      }
    }
  }, [])

  // Start sharing screen
  const startScreenShare = useCallback(async (sourceId?: string, width?: number, height?: number, fps?: number) => {
    if (!isConnected || !myInfoRef.current) return
    try {
      let stream: MediaStream | null = null
      if (sourceId) {
        let captureSuccess = false
        if (sourceId.startsWith('window:') && (window as any).electronAPI) {
          try {
            const res = await (window as any).electronAPI.startProcessAudioCapture(sourceId)
            if (res && res.success) {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: sourceId,
                    minWidth: width || 1280,
                    maxWidth: width || 1280,
                    minHeight: height || 720,
                    maxHeight: height || 720,
                    minFrameRate: fps || 30,
                    maxFrameRate: fps || 30
                  }
                } as any
              })

              const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
              const audioCtx = new AudioCtxClass({ sampleRate: 48000 })
              const dest = audioCtx.createMediaStreamDestination()

              const audioQueueL: Float32Array[] = []
              const audioQueueR: Float32Array[] = []
              let currentBufferL: Float32Array | null = null
              let currentBufferR: Float32Array | null = null
              let currentBufferIndex = 0

              const scriptNode = audioCtx.createScriptProcessor(2048, 0, 2)
              scriptNode.onaudioprocess = (e) => {
                const outL = e.outputBuffer.getChannelData(0)
                const outR = e.outputBuffer.getChannelData(1)
                let written = 0

                while (written < outL.length) {
                  if (currentBufferL && currentBufferR && currentBufferIndex < currentBufferL.length) {
                    outL[written] = currentBufferL[currentBufferIndex]
                    outR[written] = currentBufferR[currentBufferIndex]
                    currentBufferIndex++
                    written++
                  } else {
                    if (audioQueueL.length > 0) {
                      currentBufferL = audioQueueL.shift() || null
                      currentBufferR = audioQueueR.shift() || null
                      currentBufferIndex = 0
                    } else {
                      outL[written] = 0
                      outR[written] = 0
                      written++
                    }
                  }
                }
              }

              scriptNode.connect(dest)

              let leftoverBuffer: Uint8Array | null = null

              ;(window as any).electronAPI.onScreenshareAudioChunk((chunk: Uint8Array) => {
                let dataToProcess = chunk.slice()
                if (leftoverBuffer && leftoverBuffer.length > 0) {
                  const combined = new Uint8Array(leftoverBuffer.length + dataToProcess.length)
                  combined.set(leftoverBuffer, 0)
                  combined.set(dataToProcess, leftoverBuffer.length)
                  dataToProcess = combined
                  leftoverBuffer = null
                }

                const remainder = dataToProcess.length % 4
                if (remainder > 0) {
                  leftoverBuffer = dataToProcess.slice(dataToProcess.length - remainder)
                  dataToProcess = dataToProcess.slice(0, dataToProcess.length - remainder)
                }

                if (dataToProcess.length === 0) return

                const samplesCount = dataToProcess.length / 2
                const view = new DataView(dataToProcess.buffer, dataToProcess.byteOffset, dataToProcess.byteLength)
                const floatL = new Float32Array(samplesCount / 2)
                const floatR = new Float32Array(samplesCount / 2)

                for (let i = 0; i < samplesCount / 2; i++) {
                  const leftInt = view.getInt16(i * 4, true)
                  const rightInt = view.getInt16(i * 4 + 2, true)
                  floatL[i] = leftInt / 32768.0
                  floatR[i] = rightInt / 32768.0
                }

                audioQueueL.push(floatL)
                audioQueueR.push(floatR)

                if (audioQueueL.length > 40) {
                  audioQueueL.splice(0, 15)
                  audioQueueR.splice(0, 15)
                }
              })

              const gameAudioTrack = dest.stream.getAudioTracks()[0]
              if (gameAudioTrack) {
                stream.addTrack(gameAudioTrack)
              }

              ;(stream as any)._audioCtx = audioCtx;
              ;(stream as any)._scriptNode = scriptNode;
              captureSuccess = true
              console.log('Successfully initialized process-isolated audio capture via C# helper.')
            }
          } catch (captureErr) {
            console.error('Failed to bind process loopback audio, falling back to system loopback:', captureErr)
          }
        }

        if (!captureSuccess) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId
              }
            } as any,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                minWidth: width || 1280,
                maxWidth: width || 1280,
                minHeight: height || 720,
                maxHeight: height || 720,
                minFrameRate: fps || 30,
                maxFrameRate: fps || 30
              }
            } as any
          })
        }
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: {
            width: width ? { ideal: width } : 1280,
            height: height ? { ideal: height } : 720,
            frameRate: fps ? { ideal: fps } : 30
          }
        })
      }

      if (!stream) {
        throw new Error('Screen capture stream could not be initialized.')
      }

      localScreenStreamRef.current = stream
      setLocalScreenStream(stream)

      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]

      if (videoTrack) {
        if ('contentHint' in videoTrack) {
          (videoTrack as any).contentHint = 'motion';
        }

        for (const [peerId, pc] of peersRef.current.entries()) {
          preferHardwareVideoCodecs(pc)
          const existingVideoSender = screenSendersRef.current.get(peerId)
          let sender: RTCRtpSender
          if (existingVideoSender) {
            await existingVideoSender.replaceTrack(videoTrack)
            sender = existingVideoSender
          } else {
            sender = pc.addTrack(videoTrack, stream)
            screenSendersRef.current.set(peerId, sender)
          }

          await applyVideoSenderParameters(sender, width, height, fps)

          if (audioTrack) {
            const existingAudioSender = screenAudioSendersRef.current.get(peerId)
            if (existingAudioSender) {
              await existingAudioSender.replaceTrack(audioTrack)
            } else {
              const sender = pc.addTrack(audioTrack, stream)
              screenAudioSendersRef.current.set(peerId, sender)
            }
          }

          // Trigger renegotiation with optimized SDP
          let offer = await pc.createOffer()
          const optimizedSdp = optimizeSDP(offer.sdp || '')
          const finalOffer = { type: offer.type, sdp: optimizedSdp }
          await pc.setLocalDescription(finalOffer)
          channelRef.current?.send({
            type: 'broadcast',
            event: 'sdp-offer',
            payload: {
              from: myInfoRef.current.userId,
              to: peerId,
              sdp: finalOffer
            }
          })
        }

        videoTrack.onended = () => {
          stopScreenShare()
        }
      }

      const sfxVol = parseFloat(localStorage.getItem('echo-sfx-volume') || '0.5')
      playScreenStartSound(sfxVol)
      syncParticipants()
    } catch (err) {
      console.error('Error starting screen share:', err)
    }
  }, [isConnected, syncParticipants])

  // Stop sharing screen
  const stopScreenShare = useCallback(async () => {
    if (localScreenStreamRef.current) {
      const stream = localScreenStreamRef.current
      if ((stream as any)._audioCtx) {
        try {
          ((stream as any)._audioCtx as AudioContext).close()
        } catch (e) {}
      }
      if ((stream as any)._scriptNode) {
        try {
          ((stream as any)._scriptNode as ScriptProcessorNode).disconnect()
        } catch (e) {}
      }

      if ((window as any).electronAPI && typeof (window as any).electronAPI.stopProcessAudioCapture === 'function') {
        try {
          await (window as any).electronAPI.stopProcessAudioCapture()
        } catch (e) {}
      }

      stream.getTracks().forEach(t => t.stop())
      localScreenStreamRef.current = null
      setLocalScreenStream(null)
      const sfxVol = parseFloat(localStorage.getItem('echo-sfx-volume') || '0.5')
      playScreenStopSound(sfxVol)
    }

    for (const [peerId, pc] of peersRef.current.entries()) {
      const sender = screenSendersRef.current.get(peerId)
      if (sender) {
        try {
          pc.removeTrack(sender)
        } catch (e) {}
        screenSendersRef.current.delete(peerId)
      }

      const audioSender = screenAudioSendersRef.current.get(peerId)
      if (audioSender) {
        try {
          pc.removeTrack(audioSender)
        } catch (e) {}
        screenAudioSendersRef.current.delete(peerId)
      }

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        channelRef.current?.send({
          type: 'broadcast',
          event: 'sdp-offer',
          payload: {
            from: myInfoRef.current!.userId,
            to: peerId,
            sdp: offer
          }
        })
      } catch (e) {}
    }

    if (channelRef.current && myInfoRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'screenshare-stopped',
        payload: {
          from: myInfoRef.current.userId
        }
      })
    }

    if (spaceVoiceChannelRef.current && myInfoRef.current) {
      spaceVoiceChannelRef.current.track({
        user_id: myInfoRef.current.userId,
        display_name: myInfoRef.current.displayName,
        avatar_url: myInfoRef.current.avatarUrl,
        channel_id: activeChannelIdRef.current,
        is_muted: isMutedRef.current,
        is_deafened: isDeafenedRef.current,
        is_speaking: false,
        has_screen: false
      }).catch(() => {})
    }

    syncParticipants()
  }, [syncParticipants])

  // Change screen share constraints on the fly (resolution/fps)
  const changeScreenShareSettings = useCallback(async (width?: number, height?: number, fps?: number) => {
    if (!localScreenStreamRef.current) return
    const track = localScreenStreamRef.current.getVideoTracks()[0]
    if (!track) return

    try {
      const constraints: MediaTrackConstraints = {}
      if (width) constraints.width = { ideal: width }
      if (height) constraints.height = { ideal: height }
      if (fps) constraints.frameRate = { ideal: fps }

      await track.applyConstraints(constraints)
      for (const sender of screenSendersRef.current.values()) {
        await applyVideoSenderParameters(sender, width, height, fps)
      }
      console.log('Successfully applied new video track constraints and sender parameters:', constraints)
    } catch (err) {
      console.error('Failed to apply video track constraints:', err)
    }
  }, [])

  const changePeerVolume = useCallback((peerId: string, volume: number) => {
    peerVolumesRef.current.set(peerId, volume)
    const audio = audioElementsRef.current.get(`${peerId}-voice`) || audioElementsRef.current.get(peerId)
    if (audio) {
      audio.volume = volume
    }
  }, [])

  const changePeerScreenVolume = useCallback((peerId: string, volume: number) => {
    peerScreenVolumesRef.current.set(peerId, volume)
    const audio = audioElementsRef.current.get(`${peerId}-screen`)
    if (audio) {
      audio.volume = volume
    }
  }, [])

  // Monitor RTC Connection quality metrics (ping, jitter, packet loss)
  useEffect(() => {
    if (!isConnected) {
      setRtcStats(null)
      return
    }
    const interval = setInterval(async () => {
      if (peersRef.current.size === 0) {
        setRtcStats(null)
        return
      }
      try {
        const pc = Array.from(peersRef.current.values())[0]
        const stats = await pc.getStats()
        let ping = 0
        let jitter = 0
        let packetLoss = 0

        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            ping = Math.round((report.currentRoundTripTime || 0) * 1000)
          }
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            jitter = Math.round((report.jitter || 0) * 1000)
            const lost = report.packetsLost || 0
            const received = report.packetsReceived || 1
            packetLoss = Math.round((lost / (received + lost)) * 10000) / 100
          }
        })
        setRtcStats({ ping, jitter, packetLoss })
      } catch (e) {
        console.error("Error reading RTC stats:", e)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [isConnected])

  // Cleanup on unmount
  useEffect(() => {
    return () => { leaveVoice() }
  }, [leaveVoice])

  return { 
    participants, 
    isMuted, 
    isDeafened,
    isConnected, 
    localScreenStream,
    rtcStats,
    joinVoice, 
    leaveVoice, 
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    changeInputDevice,
    changeOutputDevice,
    changeScreenShareSettings,
    changePeerVolume,
    changePeerScreenVolume
  }
}
