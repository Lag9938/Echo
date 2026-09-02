import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { playJoinSound, playLeaveSound, playMuteSound, playUnmuteSound, playDeafenSound, playUndeafenSound, playScreenStartSound, playScreenStopSound, playSoundboardEffect } from './soundEffects'

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

function createAntiEchoIsolationDSP(
  sysStream: MediaStream,
  remoteStreams: MediaStream[]
): { finalStream: MediaStream; audioCtx: AudioContext | null } {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) {
      return { finalStream: sysStream, audioCtx: null };
    }
    const audioCtx = new AudioCtxClass();
    const sysSource = audioCtx.createMediaStreamSource(sysStream);

    // 1. Path A: Graves e Agudos do Jogo (Impactos, Passos, Músicas, Explosões - 100% Intocados)
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 260;

    const highpass = audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 3800;

    // 2. Path B: Faixa de Frequência da Voz Humana (260 Hz - 3800 Hz)
    const vocalBandFilter = audioCtx.createBiquadFilter();
    vocalBandFilter.type = 'bandpass';
    vocalBandFilter.frequency.value = 1400;
    vocalBandFilter.Q.value = 0.5;

    const vocalBandGain = audioCtx.createGain();
    vocalBandGain.gain.value = 1.0;

    // Conexões de áudio
    sysSource.connect(lowpass);
    sysSource.connect(highpass);
    sysSource.connect(vocalBandFilter);
    vocalBandFilter.connect(vocalBandGain);

    // 3. Master Mixer & Compressor dinâmico para nivelamento de som de jogo
    const masterMixer = audioCtx.createGain();
    lowpass.connect(masterMixer);
    highpass.connect(masterMixer);
    vocalBandGain.connect(masterMixer);

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 6;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.1;

    const dest = audioCtx.createMediaStreamDestination();
    masterMixer.connect(compressor);
    compressor.connect(dest);

    // 4. Sidechain Detector de Voz dos Participantes da Chamada
    // Quando qualquer pessoa falar na chamada, a faixa vocal da transmissão é silenciada instantaneamente
    const analysers: AnalyserNode[] = [];
    if (remoteStreams && remoteStreams.length > 0) {
      for (const rStream of remoteStreams) {
        try {
          if (rStream.getAudioTracks().length > 0 && rStream.getAudioTracks()[0].readyState === 'live') {
            const rSource = audioCtx.createMediaStreamSource(rStream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            rSource.connect(analyser);
            analysers.push(analyser);
          }
        } catch (e) {}
      }
    }

    if (analysers.length > 0) {
      const buffer = new Uint8Array(128);
      let lastVoiceDetectedTime = 0;

      const checkVoiceActivity = () => {
        if (audioCtx.state === 'closed') return;

        let maxVolume = 0;
        for (const an of analysers) {
          an.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i];
          }
          const avg = sum / buffer.length;
          if (avg > maxVolume) maxVolume = avg;
        }

        const now = Date.now();
        if (maxVolume > 10) {
          lastVoiceDetectedTime = now;
          // Silencia imediatamente a faixa vocal do loopback em 10ms
          vocalBandGain.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.01);
        } else if (now - lastVoiceDetectedTime > 280) {
          // Restaura o som ambiente do jogo quando ninguém estiver falando
          vocalBandGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.06);
        }

        requestAnimationFrame(checkVoiceActivity);
      };

      requestAnimationFrame(checkVoiceActivity);
    }

    return { finalStream: dest.stream, audioCtx };
  } catch (err) {
    console.warn('createAntiEchoIsolationDSP fallback:', err);
    return { finalStream: sysStream, audioCtx: null };
  }
}

function optimizeVideoSection(section: string): string {
  let lines = section.split('\r\n');
  let hasBandwidth = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('b=AS:') || lines[i].startsWith('b=TIAS:')) {
      lines[i] = 'b=AS:8500\r\nb=TIAS:8500000';
      hasBandwidth = true;
      break;
    }
  }

  if (!hasBandwidth) {
    lines.splice(1, 0, 'b=AS:8500', 'b=TIAS:8500000');
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('a=rtpmap:') && (lines[i].toLowerCase().includes('h264/90000') || lines[i].toLowerCase().includes('vp8/90000') || lines[i].toLowerCase().includes('vp9/90000') || lines[i].toLowerCase().includes('av1/90000'))) {
      const match = lines[i].match(/a=rtpmap:(\d+)\s+/i);
      if (match) {
        const pt = match[1];
        let foundFmtp = false;
        for (let j = 0; j < lines.length; j++) {
          if (lines[j].startsWith(`a=fmtp:${pt}`)) {
            foundFmtp = true;
            if (!lines[j].includes('x-google-max-bitrate')) {
              lines[j] += ';x-google-min-bitrate=2500;x-google-max-bitrate=8500;x-google-start-bitrate=5000';
            }
            break;
          }
        }
        if (!foundFmtp) {
          lines.push(`a=fmtp:${pt} x-google-min-bitrate=2500;x-google-max-bitrate=8500;x-google-start-bitrate=5000`);
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
    const isHighQuality = (width && width >= 1920) || targetFps === 60 || width === 0;
    
    // Alocação máxima de bitrate para ultra-definição 60 FPS (padrão Discord Nitro)
    const maxBitrate = isHighQuality ? 8500000 : (targetFps >= 60 ? 5500000 : 3500000);
    
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
  
  // Push-to-Talk (PTT)
  const [isPttMode, setIsPttMode] = useState(false)
  const [isPttActive, setIsPttActive] = useState(false)
  const isPttModeRef = useRef(false)
  const isPttActiveRef = useRef(false)

  // Soundboard
  const [lastSoundboardEvent, setLastSoundboardEvent] = useState<{ soundId: string; userId: string; displayName: string; timestamp: number } | null>(null)

  // Call Recording
  const [isRecordingCall, setIsRecordingCall] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      const track = event.track
      const remoteStream = event.streams[0] || new MediaStream([track])

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
          audio.volume = Math.max(0, Math.min(1, savedVol))
          audio.muted = isDeafenedRef.current
          audioElementsRef.current.set(key, audio)
        }
        audio.muted = isDeafenedRef.current
        audio.srcObject = remoteStream
        audio.play().catch(e => {
          console.warn('[WebRTC] Audio autoplay initial play:', e)
        })

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

        track.onunmute = () => {
          syncParticipants()
        }

        // Handle track stop cleanly
        const handleStop = () => {
          const info = participantsMapRef.current.get(remoteUserId)
          if (info && info.screenStream) {
            delete info.screenStream
            syncParticipants()
          }
        }
        track.onended = handleStop
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
      console.log(`[WebRTC] Peer ${remoteUserId} connection state: ${pc.connectionState}`)
      if (pc.connectionState === 'failed') {
        setTimeout(() => {
          if (pc.connectionState === 'failed') {
            console.warn(`[WebRTC] Peer ${remoteUserId} connection permanently failed, cleaning up.`)
            cleanupPeer(remoteUserId)
          }
        }, 5000)
      }
      // Note: 'disconnected' state is transient and can recover automatically!
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

      try {
        const isOfferCollision = pc.signalingState !== 'stable'
        if (isOfferCollision) {
          if (myInfoRef.current && myInfoRef.current.userId > from) {
            await pc.setLocalDescription({ type: 'rollback' }).catch(() => {})
          } else {
            return
          }
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sdp))

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
      } catch (err) {
        console.warn('[WebRTC] sdp-offer negotiation error:', err)
      }
    }

    if (event === 'sdp-answer') {
      const sdp = payload.sdp as RTCSessionDescriptionInit
      const pc = peersRef.current.get(from)
      if (!pc) return

      try {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp))

          // Apply any pending ICE candidates
          const pending = pendingCandidatesRef.current.get(from) ?? []
          for (const c of pending) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
          }
          pendingCandidatesRef.current.delete(from)
        }
      } catch (err) {
        console.warn('[WebRTC] sdp-answer negotiation error:', err)
      }
    }

    if (event === 'ice-candidate') {
      const candidate = payload.candidate as RTCIceCandidateInit
      const pc = peersRef.current.get(from)
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
          console.warn('[WebRTC] Add ICE candidate failed:', err)
        })
      } else {
        // Queue the candidate for later
        const pending = pendingCandidatesRef.current.get(from) ?? []
        pending.push(candidate)
        pendingCandidatesRef.current.set(from, pending)
      }
    }
  }, [createPeerConnection, syncParticipants])

  // Initiate connection to a peer (we create the offer)
  const initiateConnection = useCallback(async (remoteUserId: string) => {
    let pc = peersRef.current.get(remoteUserId)
    if (!pc) pc = createPeerConnection(remoteUserId)
    if (!pc) return

    try {
      if (pc.signalingState !== 'stable') return

      let offer = await pc.createOffer()
      const optimizedSdp = optimizeSDP(offer.sdp || '')
      const finalOffer = { type: offer.type, sdp: optimizedSdp }
      await pc.setLocalDescription(finalOffer)

      channelRef.current?.send({
        type: 'broadcast',
        event: 'sdp-offer',
        payload: { from: myInfoRef.current!.userId, to: remoteUserId, sdp: finalOffer },
      })
    } catch (err) {
      console.warn('[WebRTC] initiateConnection error for peer', remoteUserId, err)
    }
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
        const isLocalSpeaking = !isLocalMuted && avg > SPEAKING_THRESHOLD
        updates[myInfoRef.current.userId] = isLocalSpeaking

        // PROTEÇÃO CONTRA RETORNO DO ESPECTADOR:
        // Enquanto o usuário local estiver falando, o áudio das telas transmitidas é reduzido suavemente
        // garantindo que ele NUNCA escute sua própria voz de volta com delay
        for (const [key, audioEl] of audioElementsRef.current.entries()) {
          if (key.endsWith('-screen')) {
            const peerId = key.replace('-screen', '')
            const savedVol = peerScreenVolumesRef.current.get(peerId) !== undefined ? peerScreenVolumesRef.current.get(peerId)! : 1.0
            if (isLocalSpeaking) {
              audioEl.volume = Math.max(0, Math.min(1, savedVol * 0.05))
            } else {
              audioEl.volume = Math.max(0, Math.min(1, savedVol))
            }
          }
        }
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
      realtimeChannel.on('broadcast', { event: 'screenshare-started' }, ({ payload }) => {
        const peerId = (payload as Record<string, string>)?.from
        if (peerId && peerId !== userId) {
          ensurePeerConnection(peerId)
          syncParticipants()
        }
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
      realtimeChannel.on('broadcast', { event: 'soundboard-play' }, ({ payload }) => {
        const p = payload as { soundId: string; userId: string; displayName: string }
        if (p && p.soundId) {
          const sfxVol = parseFloat(localStorage.getItem('echo-sfx-volume') || '0.5')
          playSoundboardEffect(p.soundId, sfxVol)
          setLastSoundboardEvent({
            soundId: p.soundId,
            userId: p.userId,
            displayName: p.displayName || 'Alguém',
            timestamp: Date.now()
          })
        }
      })

      const ensurePeerConnection = (peerId: string) => {
        if (!peersRef.current.has(peerId)) {
          if (userId < peerId) {
            initiateConnection(peerId)
          }
        }
      }

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

            const existing = participantsMapRef.current.get(peerId)
            participantsMapRef.current.set(peerId, { 
              displayName: peerName || 'Membro',
              avatarUrl: peerAvatar,
              screenStream: existing?.screenStream,
              isMuted: peerMuted,
              isDeafened: peerDeafened
            })
            syncParticipants()

            ensurePeerConnection(peerId)
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
              ensurePeerConnection(p.user_id)
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

  const screenDspCtxRef = useRef<AudioContext | null>(null)

  // Start sharing screen
  const startScreenShare = useCallback(async (sourceId?: string, width?: number, height?: number, fps?: number, audioMode: 'anti-echo' | 'full' | 'none' = 'anti-echo') => {
    if (!isConnected || !myInfoRef.current) return
    try {
      if (screenDspCtxRef.current) {
        try { screenDspCtxRef.current.close() } catch (e) {}
        screenDspCtxRef.current = null
      }

      let stream: MediaStream | null = null
      const targetWidth = width || 1920
      const targetHeight = height || 1080
      const targetFps = fps || 60

      const audioConstraint = (audioMode !== 'none') ? {
        mandatory: {
          chromeMediaSource: 'desktop'
        }
      } as any : false

      if (sourceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraint,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                maxWidth: targetWidth,
                maxHeight: targetHeight,
                maxFrameRate: targetFps
              }
            } as any
          })
        } catch (firstErr) {
          console.warn('Initial desktop video+audio capture failed, trying basic capture:', firstErr)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraint,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: sourceId
                }
              } as any
            })
          } catch (secErr) {
            console.warn('Direct window capture failed (likely Exclusive Fullscreen game). Automatically falling back to seamless screen capture:', secErr)
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraint,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: 'screen:0:0',
                  maxWidth: targetWidth,
                  maxHeight: targetHeight,
                  maxFrameRate: targetFps
                }
              } as any
            })
          }
        }

        // Processamento Anti-Eco Inteligente (DSP) se habilitado
        if (stream && audioMode === 'anti-echo') {
          const rawAudioTracks = stream.getAudioTracks()
          if (rawAudioTracks.length > 0) {
            try {
              const rawAudioTrack = rawAudioTracks[0]
              const rawAudioStream = new MediaStream([rawAudioTrack])

              const remoteVoiceStreams: MediaStream[] = []
              for (const [key, audioEl] of audioElementsRef.current.entries()) {
                if (key.endsWith('-voice') && audioEl.srcObject instanceof MediaStream) {
                  remoteVoiceStreams.push(audioEl.srcObject)
                }
              }

              const { finalStream, audioCtx } = createAntiEchoIsolationDSP(rawAudioStream, remoteVoiceStreams)
              if (audioCtx) {
                screenDspCtxRef.current = audioCtx
                const cleanAudioTracks = finalStream.getAudioTracks()
                if (cleanAudioTracks.length > 0) {
                  stream.removeTrack(rawAudioTrack)
                  stream.addTrack(cleanAudioTracks[0])
                }
              }
            } catch (dspErr) {
              console.warn('Anti-echo DSP warning (continuing with clean system audio):', dspErr)
            }
          }
        }
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          audio: audioMode !== 'none',
          video: {
            width: { ideal: targetWidth },
            height: { ideal: targetHeight },
            frameRate: { ideal: targetFps }
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

      if (spaceVoiceChannelRef.current && myInfoRef.current) {
        spaceVoiceChannelRef.current.track({
          user_id: myInfoRef.current.userId,
          display_name: myInfoRef.current.displayName,
          avatar_url: myInfoRef.current.avatarUrl,
          channel_id: activeChannelIdRef.current,
          is_muted: isMutedRef.current,
          is_deafened: isDeafenedRef.current,
          is_speaking: false,
          has_screen: true
        }).catch(() => {})
      }

      if (channelRef.current && myInfoRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'screenshare-started',
          payload: {
            from: myInfoRef.current.userId
          }
        })
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
      if (screenDspCtxRef.current) {
        try { screenDspCtxRef.current.close() } catch (e) {}
        screenDspCtxRef.current = null
      }
      localScreenStreamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop())
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

  // Change screen share encoding settings on the fly (resolution/fps) without resetting native video track
  const changeScreenShareSettings = useCallback(async (width?: number, height?: number, fps?: number) => {
    if (!localScreenStreamRef.current) return
    try {
      for (const sender of screenSendersRef.current.values()) {
        await applyVideoSenderParameters(sender, width, height, fps)
      }
      console.log('Successfully adjusted live video sender encoding parameters:', { width, height, fps })
    } catch (err) {
      console.error('Failed to update live video sender parameters:', err)
    }
  }, [])

  const changePeerVolume = useCallback((peerId: string, volume: number) => {
    const clamped = Math.max(0, Math.min(1, isNaN(volume) ? 1 : volume))
    peerVolumesRef.current.set(peerId, clamped)
    const audio = audioElementsRef.current.get(`${peerId}-voice`) || audioElementsRef.current.get(peerId)
    if (audio) {
      audio.volume = clamped
    }
  }, [])

  const changePeerScreenVolume = useCallback((peerId: string, volume: number) => {
    const clamped = Math.max(0, Math.min(1, isNaN(volume) ? 1 : volume))
    peerScreenVolumesRef.current.set(peerId, clamped)
    const audio = audioElementsRef.current.get(`${peerId}-screen`)
    if (audio) {
      audio.volume = clamped
    }
  }, [])

  // Push-to-Talk (PTT) controls
  const setPttMode = useCallback((enabled: boolean) => {
    isPttModeRef.current = enabled
    setIsPttMode(enabled)
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        if (enabled) {
          audioTrack.enabled = isPttActiveRef.current
        } else {
          audioTrack.enabled = !isMutedRef.current
        }
      }
    }
  }, [])

  const setPttActive = useCallback((active: boolean) => {
    isPttActiveRef.current = active
    setIsPttActive(active)
    if (isPttModeRef.current && localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack && !isMutedRef.current && !isDeafenedRef.current) {
        audioTrack.enabled = active
      }
    }
  }, [])

  // Soundboard Trigger
  const playSoundboard = useCallback((soundId: string) => {
    const sfxVol = parseFloat(localStorage.getItem('echo-sfx-volume') || '0.5')
    playSoundboardEffect(soundId, sfxVol)
    if (myInfoRef.current) {
      setLastSoundboardEvent({
        soundId,
        userId: myInfoRef.current.userId,
        displayName: myInfoRef.current.displayName,
        timestamp: Date.now()
      })
    }
    if (channelRef.current && myInfoRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'soundboard-play',
        payload: {
          soundId,
          userId: myInfoRef.current.userId,
          displayName: myInfoRef.current.displayName
        }
      }).catch(() => {})
    }
  }, [])

  // Local Call Recording (mixes local mic + all remote peers into downloadable webm)
  const startCallRecording = useCallback(() => {
    if (isRecordingCall) return
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
      const recCtx = new AudioCtxClass()
      const dest = recCtx.createMediaStreamDestination()

      if (localStreamRef.current) {
        try {
          const localSrc = recCtx.createMediaStreamSource(localStreamRef.current)
          localSrc.connect(dest)
        } catch (e) {}
      }

      audioElementsRef.current.forEach(audio => {
        if (audio.srcObject instanceof MediaStream) {
          try {
            const remoteSrc = recCtx.createMediaStreamSource(audio.srcObject)
            remoteSrc.connect(dest)
          } catch (e) {}
        }
      })

      const mediaRecorder = new MediaRecorder(dest.stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      })

      recordedChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.style.display = 'none'
          a.href = url
          a.download = `Echo-Chamada-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`
          document.body.appendChild(a)
          a.click()
          setTimeout(() => {
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
          }, 200)
        }
        recCtx.close().catch(() => {})
      }

      mediaRecorder.start(1000)
      mediaRecorderRef.current = mediaRecorder
      setIsRecordingCall(true)
      setRecordingDuration(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Failed to start call recording:', err)
    }
  }, [isRecordingCall])

  const stopCallRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    setIsRecordingCall(false)
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
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      leaveVoice()
    }
  }, [leaveVoice])

  return { 
    participants, 
    isMuted, 
    isDeafened,
    isConnected, 
    localScreenStream,
    rtcStats,
    isPttMode,
    isPttActive,
    lastSoundboardEvent,
    isRecordingCall,
    recordingDuration,
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
    changePeerScreenVolume,
    setPttMode,
    setPttActive,
    playSoundboard,
    startCallRecording,
    stopCallRecording
  }
}
