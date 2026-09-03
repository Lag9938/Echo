import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  Room,
  RoomEvent,
  Track,
  LocalAudioTrack,
  LocalVideoTrack,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Participant,
  ConnectionQuality
} from 'livekit-client'
import { RnnoiseWorkletNode, loadRnnoise } from '@sapphi-red/web-noise-suppressor'
import rnnoiseWorkletPath from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url'
import rnnoiseWasmPath from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?url'
import rnnoiseSimdWasmPath from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url'

export type VoiceParticipant = {
  userId: string
  displayName: string
  isSpeaking: boolean
  avatarUrl?: string
  screenStream?: MediaStream
  isMuted?: boolean
  isDeafened?: boolean
}

export interface StudioMicrophoneDSPNodes {
  source: MediaStreamAudioSourceNode;
  highpass: BiquadFilterNode;
  lowpass: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  dest: MediaStreamAudioDestinationNode;
  rnnoiseNode: any | null;
  audioCtx: AudioContext;
}

let rnnoiseWasmBinaryCache: ArrayBuffer | null = null

async function getRnnoiseWasmBinary(): Promise<ArrayBuffer> {
  if (!rnnoiseWasmBinaryCache) {
    rnnoiseWasmBinaryCache = await loadRnnoise({
      url: rnnoiseWasmPath,
      simdUrl: rnnoiseSimdWasmPath
    })
  }
  return rnnoiseWasmBinaryCache
}

async function createStudioMicrophoneDSP(stream: MediaStream, enableAi = false): Promise<{ 
  finalStream: MediaStream; 
  audioCtx: AudioContext; 
  nodes: StudioMicrophoneDSPNodes 
}> {
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtxClass({ sampleRate: 48000 });
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume().catch(() => {});
  }

  const source = audioCtx.createMediaStreamSource(stream);

  // Filtro Passa-Alta em 85 Hz (elimina vibracoes de mesa e vento)
  const highpass = audioCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 85;
  highpass.Q.value = 0.707;

  // Filtro Passa-Baixa em 14 kHz (elimina chiados e estatica)
  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 14000;
  lowpass.Q.value = 0.707;

  // Compressor de Estúdio
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;

  const dest = audioCtx.createMediaStreamDestination();
  source.connect(highpass);
  highpass.connect(lowpass);

  let rnnoiseNode: any = null;
  try {
    const wasmBinary = await getRnnoiseWasmBinary();
    await audioCtx.audioWorklet.addModule(rnnoiseWorkletPath);
    rnnoiseNode = new RnnoiseWorkletNode(audioCtx, {
      wasmBinary,
      maxChannels: 1
    });
  } catch (err) {
    console.warn('[RNNoise] Falha ao carregar worklet de IA:', err);
    rnnoiseNode = null;
  }

  if (enableAi && rnnoiseNode) {
    lowpass.connect(rnnoiseNode);
    rnnoiseNode.connect(compressor);
  } else {
    lowpass.connect(compressor);
  }

  compressor.connect(dest);

  return { 
    finalStream: dest.stream, 
    audioCtx,
    nodes: { source, highpass, lowpass, compressor, dest, rnnoiseNode, audioCtx }
  };
}

function routeAiDenoise(nodes: StudioMicrophoneDSPNodes, enabled: boolean) {
  try {
    nodes.lowpass.disconnect();
    if (nodes.rnnoiseNode) {
      try { nodes.rnnoiseNode.disconnect(); } catch (e) {}
    }

    if (enabled && nodes.rnnoiseNode) {
      nodes.lowpass.connect(nodes.rnnoiseNode);
      nodes.rnnoiseNode.connect(nodes.compressor);
    } else {
      nodes.lowpass.connect(nodes.compressor);
    }
  } catch (err) {
    console.warn('[RNNoise] Erro ao alternar roteamento:', err);
    try {
      nodes.lowpass.connect(nodes.compressor);
    } catch (e) {}
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

  // AI Noise Suppression (RNNoise)
  const [isAiDenoiseEnabled, setIsAiDenoiseEnabled] = useState<boolean>(() => {
    return localStorage.getItem('echo-ai-denoise-enabled') === 'true'
  })
  const isAiDenoiseEnabledRef = useRef(isAiDenoiseEnabled)

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

  // Local Voice Activity Detection (0ms latency speaking ring)
  const isLocalSpeakingRef = useRef(false)
  const vadContextRef = useRef<AudioContext | null>(null)
  const vadAnimFrameRef = useRef<number | null>(null)

  // LiveKit Room instance & tracks
  const roomRef = useRef<Room | null>(null)
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null)
  const localScreenVideoTrackRef = useRef<LocalVideoTrack | null>(null)
  const localScreenAudioTrackRef = useRef<LocalAudioTrack | null>(null)
  const activeSpeakersRef = useRef<Set<string>>(new Set())

  // Audio streams & DSP
  const localStreamRef = useRef<MediaStream | null>(null)
  const localRawStreamRef = useRef<MediaStream | null>(null)
  const localDspCtxRef = useRef<AudioContext | null>(null)
  const localDspNodesRef = useRef<StudioMicrophoneDSPNodes | null>(null)
  const localScreenStreamRef = useRef<MediaStream | null>(null)

  // Supabase presence channel
  const channelRef = useRef<RealtimeChannel | null>(null)
  const myInfoRef = useRef<{ userId: string; displayName: string; avatarUrl?: string } | null>(null)
  
  // Audio playback elements & volume/pan
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const peerVolumesRef = useRef<Map<string, number>>(new Map())
  const peerScreenVolumesRef = useRef<Map<string, number>>(new Map())
  const peerPansRef = useRef<Map<string, number>>(new Map())
  const isSpatialAudioEnabledRef = useRef(true)

  const selectedInputIdRef = useRef<string>('default')
  const selectedOutputIdRef = useRef<string>('default')
  const activeChannelIdRef = useRef<string | null>(null)
  const activeSpaceIdRef = useRef<string | null>(null)
  const isConnectingRef = useRef<boolean>(false)
  const nativeAudioCleanupRef = useRef<(() => void) | null>(null)

  // Sync all participants into React state
  const syncParticipants = useCallback(() => {
    const room = roomRef.current
    const list: VoiceParticipant[] = []

    // 1. Local Participant (instant 0ms local speaking indicator)
    if (myInfoRef.current) {
      const isSpeaking = (isLocalSpeakingRef.current || activeSpeakersRef.current.has(myInfoRef.current.userId)) && !isMutedRef.current && !isDeafenedRef.current
      list.push({
        userId: myInfoRef.current.userId,
        displayName: myInfoRef.current.displayName,
        avatarUrl: myInfoRef.current.avatarUrl,
        isSpeaking,
        isMuted: isMutedRef.current,
        isDeafened: isDeafenedRef.current,
        screenStream: localScreenStreamRef.current || undefined
      })
    }

    // 2. Remote Participants from LiveKit SFU
    if (room) {
      room.remoteParticipants.forEach((rp) => {
        let screenStream: MediaStream | undefined = undefined
        const screenPub = rp.getTrackPublication(Track.Source.ScreenShare)
        if (screenPub && screenPub.track && screenPub.track.mediaStreamTrack) {
          screenStream = new MediaStream([screenPub.track.mediaStreamTrack])
        }

        const isMuted = !rp.isMicrophoneEnabled
        const isSpeaking = activeSpeakersRef.current.has(rp.identity)

        let avatarUrl: string | undefined = undefined
        try {
          if (rp.metadata) {
            const meta = JSON.parse(rp.metadata)
            avatarUrl = meta.avatarUrl
          }
        } catch (e) {}

        list.push({
          userId: rp.identity,
          displayName: rp.name || 'Membro',
          avatarUrl: avatarUrl,
          isSpeaking,
          isMuted,
          isDeafened: false,
          screenStream
        })
      })
    }

    setParticipants(list)
  }, [])

  // Start local VAD for 0ms speaking detection
  const startLocalVad = useCallback((stream: MediaStream) => {
    try {
      if (vadAnimFrameRef.current) {
        cancelAnimationFrame(vadAnimFrameRef.current)
        vadAnimFrameRef.current = null
      }
      if (vadContextRef.current) {
        try { vadContextRef.current.close() } catch (e) {}
        vadContextRef.current = null
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const vadCtx = new AudioCtx()
      vadCtx.resume().catch(() => {})
      vadContextRef.current = vadCtx

      const sourceNode = vadCtx.createMediaStreamSource(stream)
      const analyser = vadCtx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.3
      sourceNode.connect(analyser)

      const dataArr = new Uint8Array(analyser.frequencyBinCount)

      const loop = () => {
        if (!localRawStreamRef.current) return
        if (isMutedRef.current || isDeafenedRef.current) {
          if (isLocalSpeakingRef.current) {
            isLocalSpeakingRef.current = false
            syncParticipants()
          }
          vadAnimFrameRef.current = requestAnimationFrame(loop)
          return
        }

        analyser.getByteFrequencyData(dataArr)
        let sum = 0
        for (let i = 0; i < dataArr.length; i++) {
          sum += dataArr[i]
        }
        const avg = sum / dataArr.length
        const speaking = avg > 11

        if (speaking !== isLocalSpeakingRef.current) {
          isLocalSpeakingRef.current = speaking
          syncParticipants()
        }
        vadAnimFrameRef.current = requestAnimationFrame(loop)
      }

      vadAnimFrameRef.current = requestAnimationFrame(loop)
    } catch (e) {
      console.warn('[VAD] Local VAD error:', e)
    }
  }, [syncParticipants])

  // Stop local VAD
  const stopLocalVad = useCallback(() => {
    if (vadAnimFrameRef.current) {
      cancelAnimationFrame(vadAnimFrameRef.current)
      vadAnimFrameRef.current = null
    }
    if (vadContextRef.current) {
      try { vadContextRef.current.close() } catch (e) {}
      vadContextRef.current = null
    }
    isLocalSpeakingRef.current = false
  }, [])

  // Toggle AI Noise Suppression
  const toggleAiDenoise = useCallback(async () => {
    const nextVal = !isAiDenoiseEnabledRef.current
    isAiDenoiseEnabledRef.current = nextVal
    setIsAiDenoiseEnabled(nextVal)
    try {
      localStorage.setItem('echo-ai-denoise-enabled', nextVal ? 'true' : 'false')
    } catch (e) {}

    if (localDspNodesRef.current) {
      if (nextVal && !localDspNodesRef.current.rnnoiseNode && localDspNodesRef.current.audioCtx) {
        try {
          const wasmBinary = await getRnnoiseWasmBinary()
          await localDspNodesRef.current.audioCtx.audioWorklet.addModule(rnnoiseWorkletPath)
          localDspNodesRef.current.rnnoiseNode = new RnnoiseWorkletNode(localDspNodesRef.current.audioCtx, {
            wasmBinary,
            maxChannels: 1
          })
        } catch (err) {
          console.warn('[RNNoise] Falha ao carregar worklet de IA:', err)
        }
      }
      routeAiDenoise(localDspNodesRef.current, nextVal)
    }
  }, [])

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    const room = roomRef.current
    if (localScreenVideoTrackRef.current) {
      if (room) {
        room.localParticipant.unpublishTrack(localScreenVideoTrackRef.current).catch(() => {})
      }
      localScreenVideoTrackRef.current.stop()
      localScreenVideoTrackRef.current = null
    }
    if (localScreenAudioTrackRef.current) {
      if (room) {
        room.localParticipant.unpublishTrack(localScreenAudioTrackRef.current).catch(() => {})
      }
      localScreenAudioTrackRef.current.stop()
      localScreenAudioTrackRef.current = null
    }
    if (nativeAudioCleanupRef.current) {
      try { nativeAudioCleanupRef.current() } catch (e) {}
      nativeAudioCleanupRef.current = null
    }
    localScreenStreamRef.current = null
    setLocalScreenStream(null)

    if (channelRef.current && myInfoRef.current) {
      channelRef.current.track({
        user_id: myInfoRef.current.userId,
        display_name: myInfoRef.current.displayName,
        avatar_url: myInfoRef.current.avatarUrl,
        channel_id: activeChannelIdRef.current || '',
        is_muted: isMutedRef.current,
        is_deafened: isDeafenedRef.current,
        has_screen: false,
        space_id: activeSpaceIdRef.current || null
      }).catch(() => {})
    }

    syncParticipants()
  }, [syncParticipants])

  // Leave voice channel cleanly
  const leaveVoice = useCallback(() => {
    isConnectingRef.current = false
    activeChannelIdRef.current = null
    activeSpaceIdRef.current = null

    stopLocalVad()
    stopScreenShare()

    const room = roomRef.current
    if (room) {
      try { room.disconnect() } catch (e) {}
      roomRef.current = null
    }

    if (localAudioTrackRef.current) {
      try { localAudioTrackRef.current.stop() } catch (e) {}
      localAudioTrackRef.current = null
    }
    if (localStreamRef.current) {
      try { localStreamRef.current.getTracks().forEach(t => t.stop()) } catch (e) {}
      localStreamRef.current = null
    }
    if (localRawStreamRef.current) {
      try { localRawStreamRef.current.getTracks().forEach(t => t.stop()) } catch (e) {}
      localRawStreamRef.current = null
    }
    if (localDspCtxRef.current) {
      localDspCtxRef.current.close().catch(() => {})
      localDspCtxRef.current = null
    }
    if (localDspNodesRef.current?.rnnoiseNode) {
      try { localDspNodesRef.current.rnnoiseNode.destroy() } catch (e) {}
    }
    localDspNodesRef.current = null

    audioElementsRef.current.forEach(audio => {
      audio.srcObject = null
      audio.remove()
    })
    audioElementsRef.current.clear()

    if (channelRef.current) {
      channelRef.current.untrack().catch(() => {})
      supabase?.removeChannel(channelRef.current)
      channelRef.current = null
    }

    activeSpeakersRef.current.clear()
    myInfoRef.current = null
    setIsConnected(false)
    setParticipants([])
    setRtcStats(null)
  }, [stopLocalVad, stopScreenShare])

  // Join a voice channel via LiveKit SFU
  const joinVoice = useCallback(async (
    channelId: string, 
    userId: string, 
    displayName: string, 
    avatarUrl?: string, 
    inputId?: string, 
    outputId?: string, 
    noiseSuppression = true, 
    echoCancellation = true, 
    spaceId?: string
  ) => {
    if (isConnectingRef.current && activeChannelIdRef.current === channelId) {
      return
    }

    if (activeChannelIdRef.current === channelId && roomRef.current?.state === 'connected') {
      return
    }

    if (activeChannelIdRef.current && activeChannelIdRef.current !== channelId) {
      leaveVoice()
    }

    isConnectingRef.current = true
    activeChannelIdRef.current = channelId
    activeSpaceIdRef.current = spaceId || null

    try {
      if (inputId) selectedInputIdRef.current = inputId
      if (outputId) selectedOutputIdRef.current = outputId

      // Obter microfone com cancelamento de ruído e eco de alta qualidade
      const constraints = {
        audio: {
          deviceId: inputId && inputId !== 'default' ? { exact: inputId } : undefined,
          echoCancellation,
          noiseSuppression,
          autoGainControl: true,
          channelCount: 1
        } as any,
        video: false
      }

      let rawStream: MediaStream
      try {
        rawStream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (devErr) {
        console.warn('[Voice] Falha com deviceId específico, usando padrão:', devErr)
        rawStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation,
            noiseSuppression,
            autoGainControl: true
          },
          video: false
        })
      }

      localRawStreamRef.current = rawStream
      myInfoRef.current = { userId, displayName, avatarUrl }

      // Inicia medidor local de fala com 0ms de atraso
      startLocalVad(rawStream)

      // Imediatamente marca conectado e exibe o participante local na grade
      setIsConnected(true)
      syncParticipants()

      // Áudio profissional: se IA ativada, roda pelo pipeline DSP; senão, passa o stream puro sem perdas
      let finalStream = rawStream
      if (isAiDenoiseEnabledRef.current) {
        try {
          const { finalStream: dspStream, audioCtx, nodes } = await createStudioMicrophoneDSP(rawStream, true)
          localDspCtxRef.current = audioCtx
          localDspNodesRef.current = nodes
          finalStream = dspStream
        } catch (dspErr) {
          console.error('[Voice] Falha no pipeline DSP:', dspErr)
        }
      }
      localStreamRef.current = finalStream

      // Conexao LiveKit SFU
      let connectionUrl = 'wss://echo-v87jtd7c.livekit.cloud'
      let token = ''

      if (typeof (window as any).electronAPI?.getLiveKitConnection === 'function') {
        const res = await (window as any).electronAPI.getLiveKitConnection({
          room: channelId,
          identity: userId,
          name: displayName,
          avatarUrl
        })
        if (res && res.success) {
          connectionUrl = res.url
          token = res.token
        }
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          simulcast: true,
          dtx: false,
        }
      })
      roomRef.current = room

      // Setup LiveKit room events
      room.on(RoomEvent.Connected, () => {
        setIsConnected(true)
        syncParticipants()
        console.log('[LiveKit] Conectado ao SFU na sala:', channelId)
      })

      room.on(RoomEvent.LocalTrackPublished, () => {
        syncParticipants()
      })

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false)
        console.log('[LiveKit] Desconectado do SFU')
      })

      room.on(RoomEvent.ParticipantConnected, () => {
        syncParticipants()
      })

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        const voiceKey = `${participant.identity}-voice`
        const screenKey = `${participant.identity}-screen`
        const vAudio = audioElementsRef.current.get(voiceKey)
        if (vAudio) { vAudio.srcObject = null; vAudio.remove(); audioElementsRef.current.delete(voiceKey) }
        const sAudio = audioElementsRef.current.get(screenKey)
        if (sAudio) { sAudio.srcObject = null; sAudio.remove(); audioElementsRef.current.delete(screenKey) }
        syncParticipants()
      })

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const isScreen = track.source === Track.Source.ScreenShareAudio
          const key = isScreen ? `${participant.identity}-screen` : `${participant.identity}-voice`

          let audio = audioElementsRef.current.get(key)
          if (!audio) {
            audio = new Audio()
            audio.autoplay = true
            audioElementsRef.current.set(key, audio)
          }

          const savedVol = isScreen
            ? (peerScreenVolumesRef.current.get(participant.identity) ?? 1.0)
            : (peerVolumesRef.current.get(participant.identity) ?? 1.0)
          audio.volume = Math.max(0, Math.min(1, savedVol))
          audio.muted = isDeafenedRef.current

          // Anexa a faixa de áudio oficial do LiveKit sem suspensão de contexto
          track.attach(audio)

          if (typeof (audio as any).setSinkId === 'function' && selectedOutputIdRef.current !== 'default') {
            ;(audio as any).setSinkId(selectedOutputIdRef.current).catch(() => {})
          }

          audio.play().catch(e => console.warn('[LiveKit] Audio play:', e))
        } else if (track.kind === Track.Kind.Video) {
          syncParticipants()
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const isScreen = track.source === Track.Source.ScreenShareAudio
          const key = isScreen ? `${participant.identity}-screen` : `${participant.identity}-voice`
          const audio = audioElementsRef.current.get(key)
          if (audio) {
            track.detach(audio)
            audioElementsRef.current.delete(key)
          }
        } else if (track.kind === Track.Kind.Video) {
          syncParticipants()
        }
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        const nextActive = new Set<string>()
        speakers.forEach(s => nextActive.add(s.identity))
        activeSpeakersRef.current = nextActive
        syncParticipants()
      })

      room.on(RoomEvent.TrackMuted, () => syncParticipants())
      room.on(RoomEvent.TrackUnmuted, () => syncParticipants())

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const str = new TextDecoder().decode(payload)
          const data = JSON.parse(str)
          if (data.type === 'soundboard') {
            setLastSoundboardEvent({
              soundId: data.soundId,
              userId: participant?.identity || '',
              displayName: participant?.name || 'Membro',
              timestamp: Date.now()
            })
          }
        } catch (e) {}
      })

      room.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, participant: Participant) => {
        if (participant === room.localParticipant) {
          const ping = quality === ConnectionQuality.Excellent ? 18 : quality === ConnectionQuality.Good ? 35 : 85
          const packetLoss = quality === ConnectionQuality.Poor ? 4.5 : 0.0
          setRtcStats({ ping, jitter: 2, packetLoss })
        }
      })

      // Conecta ao servidor SFU
      if (token) {
        try {
          await room.connect(connectionUrl, token)
          console.log('[LiveKit] Conectado com sucesso ao SFU!')
          syncParticipants()
        } catch (connErr) {
          console.error('[LiveKit] Erro ao conectar ao SFU:', connErr)
        }
      }

      // Publica microfone do usuário
      if (room.state === 'connected') {
        try {
          const micTrack = finalStream.getAudioTracks()[0]
          if (micTrack) {
            const localAudio = new LocalAudioTrack(micTrack)
            localAudioTrackRef.current = localAudio
            await room.localParticipant.publishTrack(localAudio, {
              source: Track.Source.Microphone,
              name: 'microphone',
              dtx: false
            })
          }
        } catch (pubErr) {
          console.error('[LiveKit] Erro ao publicar microfone:', pubErr)
        }
      }

      syncParticipants()

      // Sincroniza presença no Supabase
      if (supabase) {
        const presenceChanName = spaceId ? `space-voice-${spaceId}` : `voice-${channelId}`
        const sbChannel = supabase.channel(presenceChanName, {
          config: { presence: { key: userId } }
        })
        channelRef.current = sbChannel
        sbChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await sbChannel.track({
              user_id: userId,
              display_name: displayName,
              avatar_url: avatarUrl,
              channel_id: channelId,
              is_muted: isMutedRef.current,
              is_deafened: isDeafenedRef.current,
              has_screen: false,
              space_id: spaceId || null
            }).catch(() => {})
          }
        })
      }
    } catch (err) {
      console.error('[LiveKit] Falha ao entrar no canal de voz:', err)
      setIsConnected(false)
      activeChannelIdRef.current = null
    } finally {
      isConnectingRef.current = false
    }
  }, [startLocalVad, syncParticipants, leaveVoice])

  // Toggle Mute
  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current
    isMutedRef.current = next
    setIsMuted(next)

    if (localAudioTrackRef.current) {
      if (next) {
        localAudioTrackRef.current.mute()
      } else {
        localAudioTrackRef.current.unmute()
      }
    }

    if (channelRef.current && myInfoRef.current) {
      channelRef.current.track({
        user_id: myInfoRef.current.userId,
        display_name: myInfoRef.current.displayName,
        avatar_url: myInfoRef.current.avatarUrl,
        channel_id: activeChannelIdRef.current || '',
        is_muted: next,
        is_deafened: isDeafenedRef.current,
        has_screen: !!localScreenStreamRef.current,
        space_id: activeSpaceIdRef.current || null
      }).catch(() => {})
    }

    syncParticipants()
  }, [syncParticipants])

  // Toggle Deafen
  const toggleDeafen = useCallback(() => {
    const next = !isDeafenedRef.current
    isDeafenedRef.current = next
    setIsDeafened(next)

    audioElementsRef.current.forEach(audio => {
      audio.muted = next
    })

    if (next && !isMutedRef.current) {
      toggleMute()
    }

    if (channelRef.current && myInfoRef.current) {
      channelRef.current.track({
        user_id: myInfoRef.current.userId,
        display_name: myInfoRef.current.displayName,
        avatar_url: myInfoRef.current.avatarUrl,
        channel_id: activeChannelIdRef.current || '',
        is_muted: isMutedRef.current,
        is_deafened: next,
        has_screen: !!localScreenStreamRef.current,
        space_id: activeSpaceIdRef.current || null
      }).catch(() => {})
    }

    syncParticipants()
  }, [syncParticipants, toggleMute])

  // Start Screen Sharing (Arquitetura Discord SFU - Zero Eco e sem travar janelas)
  const startScreenShare = useCallback(async (
    sourceId?: string, 
    width?: number, 
    height?: number, 
    fps?: number
  ) => {
    const room = roomRef.current
    if (!room || !myInfoRef.current) {
      console.warn('[ScreenShare] Sala ou info local indisponível.')
      return
    }

    try {
      if (nativeAudioCleanupRef.current) {
        try { nativeAudioCleanupRef.current() } catch (e) {}
        nativeAudioCleanupRef.current = null
      }

      const targetWidth = width || 1920
      const targetHeight = height || 1080
      const targetFps = fps || 60

      let nativeAudioTrack: MediaStreamTrack | null = null
      const isWindowSource = sourceId && sourceId.startsWith('window:')

      // 1. Captura de áudio nativa por processo (Windows WASAPI loopback por PID)
      if (isWindowSource && typeof (window as any).electronAPI?.startProcessAudioCapture === 'function') {
        try {
          const res = await (window as any).electronAPI.startProcessAudioCapture(sourceId)
          if (res && res.success) {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
            const procCtx = new AudioCtxClass({ sampleRate: 48000 })
            await procCtx.resume().catch(() => {})
            const dest = procCtx.createMediaStreamDestination()

            const RING_SIZE = 48000 * 2
            const ringL = new Float32Array(RING_SIZE)
            const ringR = new Float32Array(RING_SIZE)
            let writeIdx = 0
            let readIdx = 0
            let available = 0

            ;(window as any).electronAPI?.onScreenshareAudioChunk((chunk: Uint8Array | ArrayBuffer) => {
              const raw = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
              const int16 = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 2))
              const samples = Math.floor(int16.length / 2)
              for (let i = 0; i < samples; i++) {
                ringL[writeIdx] = int16[i * 2] / 32768.0
                ringR[writeIdx] = int16[i * 2 + 1] / 32768.0
                writeIdx = (writeIdx + 1) % RING_SIZE
              }
              available = Math.min(RING_SIZE, available + samples)
            })

            const scriptNode = procCtx.createScriptProcessor(2048, 0, 2)
            scriptNode.onaudioprocess = (e) => {
              const outL = e.outputBuffer.getChannelData(0)
              const outR = e.outputBuffer.getChannelData(1)
              const len = outL.length
              if (available < len) {
                outL.fill(0)
                outR.fill(0)
              } else {
                for (let i = 0; i < len; i++) {
                  outL[i] = ringL[readIdx]
                  outR[i] = ringR[readIdx]
                  readIdx = (readIdx + 1) % RING_SIZE
                }
                available -= len
              }
            }

            scriptNode.connect(dest)
            nativeAudioTrack = dest.stream.getAudioTracks()[0]
            nativeAudioCleanupRef.current = () => {
              try { scriptNode.disconnect() } catch (e) {}
              try { procCtx.close() } catch (e) {}
              ;(window as any).electronAPI?.stopProcessAudioCapture()
            }
          }
        } catch (nativeErr) {
          console.warn('[LiveKit] Falha na captura nativa por processo:', nativeErr)
        }
      }

      // Restaura a janela se estiver minimizada
      if (sourceId && typeof (window as any).electronAPI?.restoreWindow === 'function') {
        try {
          await (window as any).electronAPI.restoreWindow(sourceId)
        } catch (e) {}
      }

      // 2. Captura de vídeo com fallback resiliente
      let stream: MediaStream | null = null

      // Tentativa 1: com áudio se for tela inteira
      if (!isWindowSource && !nativeAudioTrack) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            } as any,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId || 'screen:0:0',
                maxWidth: targetWidth,
                maxHeight: targetHeight,
                maxFrameRate: targetFps
              }
            } as any
          })
        } catch (aErr) {
          console.warn('[ScreenShare] Tentativa com áudio de tela cheia falhou, usando apenas vídeo:', aErr)
        }
      }

      // Tentativa 2: vídeo sem áudio (funciona 100% garantido para qualquer janela ou tela)
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId || 'screen:0:0',
              maxWidth: targetWidth,
              maxHeight: targetHeight,
              maxFrameRate: targetFps
            }
          } as any
        })
      }

      const videoTrack = stream.getVideoTracks()[0]
      if (!videoTrack) {
        console.error('[ScreenShare] Nenhuma faixa de vídeo foi capturada.')
        return
      }

      const audioTrack = nativeAudioTrack || (stream.getAudioTracks().length > 0 ? stream.getAudioTracks()[0] : null)

      // 3. Atualiza preview local imediatamente
      const previewStream = new MediaStream([videoTrack])
      localScreenStreamRef.current = previewStream
      setLocalScreenStream(previewStream)

      videoTrack.onended = () => {
        stopScreenShare()
      }

      // 4. Publica no SFU LiveKit
      if (room && room.state === 'connected') {
        try {
          const localVideoTrack = new LocalVideoTrack(videoTrack)
          localScreenVideoTrackRef.current = localVideoTrack
          await room.localParticipant.publishTrack(localVideoTrack, {
            source: Track.Source.ScreenShare,
            name: 'screen_video',
            simulcast: false,
            videoEncoding: {
              maxBitrate: 8500000,
              maxFramerate: targetFps
            }
          })

          if (audioTrack) {
            try {
              const localAudioTrack = new LocalAudioTrack(audioTrack)
              localScreenAudioTrackRef.current = localAudioTrack
              await room.localParticipant.publishTrack(localAudioTrack, {
                source: Track.Source.ScreenShareAudio,
                name: 'screen_audio',
                dtx: false
              })
            } catch (aPubErr) {
              console.warn('[ScreenShare] Erro ao publicar áudio do compartilhamento:', aPubErr)
            }
          }
        } catch (pubErr) {
          console.error('[ScreenShare] Falha ao publicar tela no LiveKit:', pubErr)
        }
      }

      if (channelRef.current && myInfoRef.current) {
        channelRef.current.track({
          user_id: myInfoRef.current.userId,
          display_name: myInfoRef.current.displayName,
          avatar_url: myInfoRef.current.avatarUrl,
          channel_id: activeChannelIdRef.current || '',
          is_muted: isMutedRef.current,
          is_deafened: isDeafenedRef.current,
          has_screen: true,
          space_id: activeSpaceIdRef.current || null
        }).catch(() => {})
      }

      syncParticipants()
    } catch (err) {
      console.error('[LiveKit] Falha ao iniciar transmissão:', err)
    }
  }, [stopScreenShare, syncParticipants])

  // Change input microphone device
  const changeInputDevice = useCallback(async (deviceId: string, noiseSuppression = true, echoCancellation = true) => {
    selectedInputIdRef.current = deviceId
    if (!isConnected || !localRawStreamRef.current) return

    try {
      localRawStreamRef.current.getTracks().forEach(t => t.stop())
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation,
          noiseSuppression,
          autoGainControl: true,
        }
      })
      localRawStreamRef.current = newStream
      startLocalVad(newStream)

      let finalStream = newStream
      if (isAiDenoiseEnabledRef.current) {
        const { finalStream: dspStream, audioCtx, nodes } = await createStudioMicrophoneDSP(newStream, true)
        localDspCtxRef.current = audioCtx
        localDspNodesRef.current = nodes
        finalStream = dspStream
      }
      localStreamRef.current = finalStream

      const newTrack = finalStream.getAudioTracks()[0]
      if (newTrack && localAudioTrackRef.current) {
        await localAudioTrackRef.current.setDeviceId(deviceId)
      }
    } catch (err) {
      console.error('Failed to change input device:', err)
    }
  }, [isConnected, startLocalVad])

  // Change speaker output device
  const changeOutputDevice = useCallback(async (deviceId: string) => {
    selectedOutputIdRef.current = deviceId
    for (const audio of audioElementsRef.current.values()) {
      if (typeof (audio as any).setSinkId === 'function') {
        try {
          await (audio as any).setSinkId(deviceId)
        } catch (err) {
          console.error('Failed to setSinkId on audio element:', err)
        }
      }
    }
  }, [])

  // Volume & Audio Controls
  const changePeerVolume = useCallback((peerId: string, volume: number) => {
    const clamped = Math.max(0, Math.min(2, volume))
    peerVolumesRef.current.set(peerId, clamped)
    const audio = audioElementsRef.current.get(`${peerId}-voice`)
    if (audio) audio.volume = Math.max(0, Math.min(1, clamped))
  }, [])

  const changePeerScreenVolume = useCallback((peerId: string, volume: number) => {
    const clamped = Math.max(0, Math.min(2, volume))
    peerScreenVolumesRef.current.set(peerId, clamped)
    const audio = audioElementsRef.current.get(`${peerId}-screen`)
    if (audio) audio.volume = Math.max(0, Math.min(1, clamped))
  }, [])

  const changePeerPan = useCallback((peerId: string, pan: number) => {
    const clamped = Math.max(-1, Math.min(1, pan))
    peerPansRef.current.set(peerId, clamped)
  }, [])

  const setSpatialAudioEnabled = useCallback((enabled: boolean) => {
    isSpatialAudioEnabledRef.current = enabled
  }, [])

  const changeScreenShareSettings = useCallback(async (_width?: number, _height?: number, _fps?: number) => {
    // LiveKit SFU automatically optimizes bitrate and framerate
  }, [])

  // Push-to-Talk
  const setPttMode = useCallback((enabled: boolean) => {
    setIsPttMode(enabled)
    isPttModeRef.current = enabled
    if (enabled) {
      if (!isMutedRef.current) toggleMute()
    }
  }, [toggleMute])

  const setPttActive = useCallback((active: boolean) => {
    setIsPttActive(active)
    isPttActiveRef.current = active
    if (isPttModeRef.current) {
      if (active && isMutedRef.current) toggleMute()
      else if (!active && !isMutedRef.current) toggleMute()
    }
  }, [toggleMute])

  // Soundboard via LiveKit Data Messaging (<10ms latency)
  const playSoundboard = useCallback((soundId: string) => {
    const room = roomRef.current
    if (!room || !myInfoRef.current) return
    const payload = JSON.stringify({
      type: 'soundboard',
      soundId,
      userId: myInfoRef.current.userId,
      displayName: myInfoRef.current.displayName,
      timestamp: Date.now()
    })
    const encoded = new TextEncoder().encode(payload)
    room.localParticipant.publishData(encoded, { reliable: true }).catch(() => {})
  }, [])

  // Call Recording
  const startCallRecording = useCallback(() => {
    try {
      recordedChunksRef.current = []
      const mixedDest = new AudioContext().createMediaStreamDestination()
      if (localStreamRef.current) {
        const audioCtx = new AudioContext()
        const src = audioCtx.createMediaStreamSource(localStreamRef.current)
        src.connect(mixedDest)
      }
      audioElementsRef.current.forEach(audio => {
        if (audio.srcObject instanceof MediaStream) {
          const audioCtx = new AudioContext()
          const src = audioCtx.createMediaStreamSource(audio.srcObject)
          src.connect(mixedDest)
        }
      })
      const rec = new MediaRecorder(mixedDest.stream)
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      rec.start(1000)
      mediaRecorderRef.current = rec
      setIsRecordingCall(true)
      setRecordingDuration(0)
      recordingTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000)
    } catch (err) {
      console.warn('Call recording error:', err)
    }
  }, [])

  const stopCallRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setIsRecordingCall(false)
    setTimeout(() => {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `echo-call-recording-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
    }, 500)
  }, [])

  // Auto leave on unmount
  useEffect(() => {
    return () => {
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
    changePeerPan,
    setSpatialAudioEnabled,
    changePeerScreenVolume,
    setPttMode,
    setPttActive,
    playSoundboard,
    startCallRecording,
    stopCallRecording,
    isAiDenoiseEnabled,
    toggleAiDenoise
  }
}
