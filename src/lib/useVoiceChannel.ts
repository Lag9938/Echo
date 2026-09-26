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
  TrackPublication,
  ConnectionQuality,
  VideoQuality,
  DisconnectReason
} from 'livekit-client'
import { RnnoiseWorkletNode, loadRnnoise } from '@sapphi-red/web-noise-suppressor'
import rnnoiseWorkletPath from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url'
import rnnoiseWasmPath from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?url'
import rnnoiseSimdWasmPath from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url'
import noiseGateWorkletPath from './audio/noiseGateWorklet.ts?worker&url'
import { NOISE_GATE_PROCESSOR, type NoiseGateParams } from './audio/noiseGate'
import { browserNoiseSuppression } from './audio/noiseSuppression'
import { playJoinSound, playLeaveSound, playSoundboardEffect } from './soundEffects'
import { trackVoiceJoined, trackVoiceLeft, trackScreenShareStarted, trackScreenShareStopped } from './analytics'
import { installPresenceTrackThrottle } from './presenceThrottle'
import { isMusicBotIdentity, parseMusicBotState, encodeMusicBotVolume, MUSIC_BOT_CONTROL_TOPIC } from './musicBotState'
import { useMusicBotStore } from '../stores/useMusicBotStore'
import { parseModerationNotice } from './voiceModeration'

export type VoiceParticipant = {
  userId: string
  displayName: string
  isSpeaking: boolean
  avatarUrl?: string
  screenStream?: MediaStream
  isScreenSharing?: boolean
  isMuted?: boolean
  isDeafened?: boolean
  screenFps?: number
  cameraStream?: MediaStream
  isCameraOn?: boolean
}

export interface StudioMicrophoneDSPNodes {
  source: MediaStreamAudioSourceNode;
  highpass: BiquadFilterNode;
  lowpass: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  limiter: DynamicsCompressorNode;
  dest: MediaStreamAudioDestinationNode;
  rnnoiseNode: any | null;
  /** Noise Gate (null se o worklet não carregou: o áudio segue sem portão) */
  gate: AudioWorkletNode | null;
  audioCtx: AudioContext;
}

const DEFAULT_NOISE_GATE: NoiseGateParams = { enabled: false, thresholdDb: -45 }

function applyNoiseGateParams(gate: AudioWorkletNode | null, params: NoiseGateParams) {
  if (!gate) return
  const now = gate.context.currentTime
  // Valor salvo inválido (ex.: NaN no localStorage) volta para o padrão em vez de derrubar o áudio
  const threshold = Number.isFinite(params.thresholdDb)
    ? Math.min(0, Math.max(-100, params.thresholdDb))
    : DEFAULT_NOISE_GATE.thresholdDb
  gate.parameters.get('enabled')?.setValueAtTime(params.enabled ? 1 : 0, now)
  gate.parameters.get('thresholdDb')?.setValueAtTime(threshold, now)
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

async function createStudioMicrophoneDSP(
  stream: MediaStream,
  enableAi = false,
  gateParams: NoiseGateParams = DEFAULT_NOISE_GATE,
  onGateChange?: (open: boolean) => void
): Promise<{
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

  // Compressor de Estúdio (Nivelamento Suave)
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;

  // Brickwall Peak Limiter (Corta 100% dos picos que excedem -2 dBFS, eliminando estouros)
  const limiter = audioCtx.createDynamicsCompressor();
  limiter.threshold.value = -2.0;
  limiter.knee.value = 0.0;
  limiter.ratio.value = 20.0;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;

  // Configuração estritamente MONO para garantir que a voz toque perfeitamente nos dois lados do fone
  const dest = audioCtx.createMediaStreamDestination();
  dest.channelCount = 1;
  dest.channelCountMode = 'explicit';

  compressor.channelCount = 1;
  compressor.channelCountMode = 'explicit';

  limiter.channelCount = 1;
  limiter.channelCountMode = 'explicit';

  source.connect(highpass);
  highpass.connect(lowpass);

  // O modelo de IA só é carregado quando a supressão por IA está ligada (antes carregava em toda chamada)
  let rnnoiseNode: any = null;
  if (enableAi) {
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
  }

  // Noise Gate depois da IA (mede a voz já sem o ruído de fundo) e antes do compressor (que levantaria o ruído)
  let gate: AudioWorkletNode | null = null;
  try {
    await audioCtx.audioWorklet.addModule(noiseGateWorkletPath);
    gate = new AudioWorkletNode(audioCtx, NOISE_GATE_PROCESSOR, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1]
    });
    applyNoiseGateParams(gate, gateParams);
    gate.port.onmessage = (event) => onGateChange?.(!!event.data?.open);
    gate.connect(compressor);
  } catch (err) {
    console.warn('[NoiseGate] Falha ao carregar o portão de ruído:', err);
    gate = null;
  }

  const nodes: StudioMicrophoneDSPNodes = { source, highpass, lowpass, compressor, limiter, dest, rnnoiseNode, gate, audioCtx };
  routeAiDenoise(nodes, enableAi);

  compressor.connect(limiter);
  limiter.connect(dest);

  return {
    finalStream: dest.stream,
    audioCtx,
    nodes
  };
}

function routeAiDenoise(nodes: StudioMicrophoneDSPNodes, enabled: boolean) {
  try {
    nodes.lowpass.disconnect();
    if (nodes.rnnoiseNode) {
      try { nodes.rnnoiseNode.disconnect(); } catch (e) {}
    }

    const next: AudioNode = nodes.gate ?? nodes.compressor;
    if (enabled && nodes.rnnoiseNode) {
      nodes.lowpass.connect(nodes.rnnoiseNode);
      nodes.rnnoiseNode.connect(next);
    } else {
      nodes.lowpass.connect(next);
    }
  } catch (err) {
    console.warn('[RNNoise] Erro ao alternar roteamento:', err);
    try {
      nodes.lowpass.connect(nodes.compressor);
    } catch (e) {}
  }
}

export function useVoiceChannel(options?: { 
  onDisconnected?: () => void; 
  sfxVolume?: number;
  onServerMuted?: () => void;
  onKickedFromVoice?: () => void;
  onMovedToVoiceChannel?: (targetChannelId: string, targetChannelName?: string) => void;
  onReconnectMediaNotice?: (title: string, message: string) => void;
  /** Portão de ruído das Configurações > Voz (aplicado ao vivo, sem reconectar) */
  noiseGate?: NoiseGateParams;
}) {
  const onDisconnectedRef = useRef(options?.onDisconnected)
  useEffect(() => {
    onDisconnectedRef.current = options?.onDisconnected
  }, [options?.onDisconnected])

  const sfxVolumeRef = useRef(options?.sfxVolume ?? 0.5)
  useEffect(() => {
    if (options?.sfxVolume !== undefined) {
      sfxVolumeRef.current = options.sfxVolume
    }
  }, [options?.sfxVolume])

  const onServerMutedRef = useRef(options?.onServerMuted)
  useEffect(() => {
    onServerMutedRef.current = options?.onServerMuted
  }, [options?.onServerMuted])

  const onKickedFromVoiceRef = useRef(options?.onKickedFromVoice)
  useEffect(() => {
    onKickedFromVoiceRef.current = options?.onKickedFromVoice
  }, [options?.onKickedFromVoice])

  const onMovedToVoiceChannelRef = useRef(options?.onMovedToVoiceChannel)
  useEffect(() => {
    onMovedToVoiceChannelRef.current = options?.onMovedToVoiceChannel
  }, [options?.onMovedToVoiceChannel])

  const onReconnectMediaNoticeRef = useRef(options?.onReconnectMediaNotice)
  useEffect(() => {
    onReconnectMediaNoticeRef.current = options?.onReconnectMediaNotice
  }, [options?.onReconnectMediaNotice])

  const [participants, setParticipants] = useState<VoiceParticipant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null)
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null)
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

  // Preferências do navegador (supressão/eco) em uso, para recriar o microfone ao alternar a IA
  const noiseSuppressionPrefRef = useRef(true)
  const echoCancellationPrefRef = useRef(true)

  // Noise Gate: parâmetros atuais e se o portão está aberto (o indicador de "falando" segue o portão)
  const noiseGateEnabled = options?.noiseGate?.enabled ?? DEFAULT_NOISE_GATE.enabled
  const noiseGateThresholdDb = options?.noiseGate?.thresholdDb ?? DEFAULT_NOISE_GATE.thresholdDb
  const noiseGateRef = useRef<NoiseGateParams>({ enabled: noiseGateEnabled, thresholdDb: noiseGateThresholdDb })
  const isGateOpenRef = useRef(false)
  const rebuildMicrophoneRef = useRef<(() => Promise<void>) | null>(null)
  const handleGateChange = useCallback((open: boolean) => {
    isGateOpenRef.current = open
  }, [])

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
  const localCameraVideoTrackRef = useRef<LocalVideoTrack | null>(null)
  const localCameraStreamRef = useRef<MediaStream | null>(null)
  const remoteCameraStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const activeSpeakersRef = useRef<Set<string>>(new Set())

  // Audio streams & DSP
  const localStreamRef = useRef<MediaStream | null>(null)
  const localRawStreamRef = useRef<MediaStream | null>(null)
  const localDspCtxRef = useRef<AudioContext | null>(null)
  const localDspNodesRef = useRef<StudioMicrophoneDSPNodes | null>(null)

  // Mudou o portão nas configurações: aplica na hora no microfone em uso
  useEffect(() => {
    noiseGateRef.current = { enabled: noiseGateEnabled, thresholdDb: noiseGateThresholdDb }
    applyNoiseGateParams(localDspNodesRef.current?.gate ?? null, noiseGateRef.current)
  }, [noiseGateEnabled, noiseGateThresholdDb])
  const localScreenStreamRef = useRef<MediaStream | null>(null)

  // Supabase presence channel
  const channelRef = useRef<RealtimeChannel | null>(null)
  const myInfoRef = useRef<{ userId: string; displayName: string; avatarUrl?: string } | null>(null)

  // Analytics timing refs
  const voiceJoinTimeRef = useRef<number | null>(null)
  const screenShareStartTimeRef = useRef<number | null>(null)
  
  // Audio playback elements & volume/pan
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const peerVolumesRef = useRef<Map<string, number>>(new Map())
  const peerScreenVolumesRef = useRef<Map<string, number>>(new Map())
  const peerPansRef = useRef<Map<string, number>>(new Map())
  const isSpatialAudioEnabledRef = useRef(true)

  // Active Stream Tiles tracking (muting background audio when video player is visible on screen to enable native WebRTC Lip-Sync without echo)
  const activeStreamTilesRef = useRef<Set<string>>(new Set())

  // Screen Audio Lip-Sync Delay State (WebRTC jitterBufferTarget & playoutDelayHint)
  const [screenAudioSyncDelayMs, setScreenAudioSyncDelayMs] = useState<number>(() => {
    try {
      if (!localStorage.getItem('echo-screen-audio-delay-v3')) {
        localStorage.removeItem('echo-screen-audio-delay-ms')
        localStorage.setItem('echo-screen-audio-delay-v3', 'true')
        return 0
      }
      const saved = localStorage.getItem('echo-screen-audio-delay-ms')
      return saved !== null ? Math.max(0, Math.min(1000, parseInt(saved, 10))) : 0
    } catch (e) {
      return 0
    }
  })
  const screenAudioSyncDelayMsRef = useRef<number>(screenAudioSyncDelayMs)
  screenAudioSyncDelayMsRef.current = screenAudioSyncDelayMs

  const selectedInputIdRef = useRef<string>('default')
  const selectedOutputIdRef = useRef<string>('default')
  const activeChannelIdRef = useRef<string | null>(null)
  const activeSpaceIdRef = useRef<string | null>(null)
  const isConnectingRef = useRef<boolean>(false)
  const nativeAudioCleanupRef = useRef<(() => void) | null>(null)
  const remoteScreenStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const overrideProfilesRef = useRef<Map<string, { displayName?: string; avatarUrl?: string }>>(new Map())
  const voicePresenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const localTargetFpsRef = useRef<number>(30)

  const sendVoicePresence = useCallback(async (
    action: 'join' | 'leave' | 'update',
    overrides?: { isMuted?: boolean; isDeafened?: boolean; hasScreen?: boolean }
  ) => {
    const ch = channelRef.current
    const info = myInfoRef.current
    const chId = activeChannelIdRef.current
    const spId = activeSpaceIdRef.current
    if (!ch || !info || !chId) return

    const muted = overrides?.isMuted !== undefined ? overrides.isMuted : isMutedRef.current
    const deafened = overrides?.isDeafened !== undefined ? overrides.isDeafened : isDeafenedRef.current
    const screen = overrides?.hasScreen !== undefined ? overrides.hasScreen : !!localScreenStreamRef.current

    const payload = {
      action,
      user_id: info.userId,
      display_name: info.displayName,
      avatar_url: info.avatarUrl,
      channel_id: chId,
      space_id: spId || null,
      is_muted: muted,
      is_deafened: deafened,
      has_screen: screen
    }

    try {
      if (action === 'leave') {
        ch.send({ type: 'broadcast', event: 'voice_presence_update', payload }).catch(() => {})
        await ch.untrack().catch(() => {})
      } else {
        await ch.track({
          user_id: info.userId,
          display_name: info.displayName,
          avatar_url: info.avatarUrl,
          channel_id: chId,
          is_muted: muted,
          is_deafened: deafened,
          has_screen: screen,
          space_id: spId || null
        })
        ch.send({ type: 'broadcast', event: 'voice_presence_update', payload }).catch(() => {})
      }
    } catch (err) {
      console.warn('[Voice Presence] Falha ao sincronizar presença:', err)
    }
  }, [])

  // Reconnection Loop State
  // Último metadado do bot de música visto (para só atualizar o store quando mudar)
  const musicBotRawRef = useRef<string | null | undefined>(undefined)
  const musicBotPresentRef = useRef<boolean | undefined>(undefined)

  const [isReconnecting, setIsReconnecting] = useState(false)
  // Oscilação de rede enquanto o próprio LiveKit tenta se recuperar (antes do loop de reconexão do app assumir)
  const [isNetworkUnstable, setIsNetworkUnstable] = useState(false)
  // Câmera/tela ativas quando a conexão caiu, para religar a câmera depois de uma reconexão total
  const pendingMediaRestoreRef = useRef<{ camera: boolean; cameraDeviceId?: string; screen: boolean } | null>(null)
  const [reconnectCountdown, setReconnectCountdown] = useState(5)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const isReconnectingRef = useRef(false)
  const isManualDisconnectRef = useRef(false)
  const reconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastJoinParamsRef = useRef<{
    channelId: string
    userId: string
    displayName: string
    avatarUrl?: string
    inputId?: string
    outputId?: string
    noiseSuppression?: boolean
    echoCancellation?: boolean
    spaceId?: string
  } | null>(null)
  const startReconnectionLoopRef = useRef<() => void>(() => {})
  const attemptReconnectRef = useRef<() => Promise<void>>(async () => {})
  const toggleMuteRef = useRef<() => void>(() => {})

  const applyScreenAudioDelayToTrack = useCallback((track: any, delayMs: number) => {
    if (!track) return
    const delaySec = delayMs / 1000
    try {
      if (typeof track.setPlayoutDelay === 'function') {
        track.setPlayoutDelay(delaySec)
      }
    } catch (e) {}

    const receiver = track.receiver
    if (receiver) {
      try {
        if ('playoutDelayHint' in receiver) {
          receiver.playoutDelayHint = delaySec
        }
        if ('jitterBufferTarget' in receiver) {
          receiver.jitterBufferTarget = delayMs
        }
      } catch (e) {}
    }
  }, [])

  const changeScreenAudioSyncDelay = useCallback((delayMs: number) => {
    const clamped = Math.max(0, Math.min(1000, delayMs))
    setScreenAudioSyncDelayMs(clamped)
    screenAudioSyncDelayMsRef.current = clamped
    try {
      localStorage.setItem('echo-screen-audio-delay-ms', clamped.toString())
    } catch (e) {}

    if (roomRef.current) {
      roomRef.current.remoteParticipants.forEach((rp) => {
        const audioPub = rp.getTrackPublication(Track.Source.ScreenShareAudio)
        if (audioPub && audioPub.track) {
          applyScreenAudioDelayToTrack(audioPub.track, clamped)
        }
      })
    }
  }, [applyScreenAudioDelayToTrack])

  // Sync all participants into React state
  const syncParticipants = useCallback(() => {
    const room = roomRef.current
    const list: VoiceParticipant[] = []

    // 1. Local Participant (instant 0ms local speaking indicator)
    if (myInfoRef.current) {
      const isSpeaking = (isLocalSpeakingRef.current || activeSpeakersRef.current.has(myInfoRef.current.userId)) && !isMutedRef.current && !isDeafenedRef.current
      const localOverride = overrideProfilesRef.current.get(myInfoRef.current.userId)
      list.push({
        userId: myInfoRef.current.userId,
        displayName: localOverride?.displayName || myInfoRef.current.displayName,
        avatarUrl: localOverride?.avatarUrl !== undefined ? localOverride.avatarUrl : myInfoRef.current.avatarUrl,
        isSpeaking,
        isMuted: isMutedRef.current,
        isDeafened: isDeafenedRef.current,
        screenStream: localScreenStreamRef.current || undefined,
        isScreenSharing: !!(localScreenStreamRef.current && localScreenStreamRef.current.getVideoTracks().length > 0),
        screenFps: localTargetFpsRef.current || 30,
        cameraStream: localCameraStreamRef.current || undefined,
        isCameraOn: !!(localCameraStreamRef.current && localCameraStreamRef.current.getVideoTracks().length > 0)
      })
    }

    // 2. Remote Participants from LiveKit SFU (com unificação de áudio e vídeo no mesmo MediaStream para Lip-Sync nativo)
    if (room) {
      room.remoteParticipants.forEach((rp) => {
        let screenStream: MediaStream | undefined = undefined
        // Nota: Câmera e Compartilhamento de Tela são fontes distintas (Track.Source.Camera vs
        // Track.Source.ScreenShare) — antes de existir publicação real de câmera, este fallback
        // nunca disparava. Removido para não confundir vídeo de câmera com tela compartilhada.
        const screenPub = rp.getTrackPublication(Track.Source.ScreenShare)
        const screenAudioPub = rp.getTrackPublication(Track.Source.ScreenShareAudio)

        let remoteScreenFps = 30
        const trackName = screenPub?.trackName || (screenPub?.track as any)?.name || ''
        if (trackName.includes('fps')) {
          const match = trackName.match(/(\d+)fps/)
          if (match) remoteScreenFps = parseInt(match[1], 10)
        }

        if (screenPub && screenPub.track && screenPub.track.mediaStreamTrack) {
          const videoTrack = screenPub.track.mediaStreamTrack
          const audioTrack = screenAudioPub?.track?.mediaStreamTrack

          let existing = remoteScreenStreamsRef.current.get(rp.identity)
          const curVideoTrack = existing?.getVideoTracks()[0]
          const curAudioTrack = existing?.getAudioTracks()[0]

          const needsRecreate = !existing 
            || !curVideoTrack 
            || curVideoTrack.id !== videoTrack.id 
            || (audioTrack ? curAudioTrack?.id !== audioTrack.id : false)

          if (needsRecreate || !existing) {
            const tracks: MediaStreamTrack[] = [videoTrack]
            if (audioTrack) {
              tracks.push(audioTrack)
            }
            existing = new MediaStream(tracks)
            remoteScreenStreamsRef.current.set(rp.identity, existing)
          } else if (audioTrack && existing.getAudioTracks().length === 0) {
            existing.addTrack(audioTrack)
          }
          screenStream = existing
        } else {
          remoteScreenStreamsRef.current.delete(rp.identity)
        }

        const isScreenSharing = Boolean((screenPub && !screenPub.isMuted) || (screenStream && screenStream.getVideoTracks().length > 0))

        // Vídeo de câmera (webcam) — publicação separada da de tela, mesmo padrão de cache de MediaStream
        let cameraStream: MediaStream | undefined = undefined
        const cameraPub = rp.getTrackPublication(Track.Source.Camera)
        if (cameraPub && cameraPub.track && cameraPub.track.mediaStreamTrack) {
          const camVideoTrack = cameraPub.track.mediaStreamTrack
          const existingCam = remoteCameraStreamsRef.current.get(rp.identity)
          const curCamTrack = existingCam?.getVideoTracks()[0]
          if (!existingCam || !curCamTrack || curCamTrack.id !== camVideoTrack.id) {
            const camStream = new MediaStream([camVideoTrack])
            remoteCameraStreamsRef.current.set(rp.identity, camStream)
            cameraStream = camStream
          } else {
            cameraStream = existingCam
          }
        } else {
          remoteCameraStreamsRef.current.delete(rp.identity)
        }
        const isCameraOn = Boolean(cameraPub && !cameraPub.isMuted && cameraStream && cameraStream.getVideoTracks().length > 0)

        const isMuted = !rp.isMicrophoneEnabled
        const isSpeaking = activeSpeakersRef.current.has(rp.identity)

        let avatarUrl: string | undefined = undefined
        try {
          if (rp.metadata) {
            const meta = JSON.parse(rp.metadata)
            avatarUrl = meta.avatarUrl
          }
        } catch (e) {}

        const profileOverride = overrideProfilesRef.current.get(rp.identity)
        const finalDisplayName = profileOverride?.displayName || rp.name || 'Membro'
        const finalAvatarUrl = profileOverride?.avatarUrl !== undefined ? profileOverride.avatarUrl : avatarUrl

        list.push({
          userId: rp.identity,
          displayName: finalDisplayName,
          avatarUrl: finalAvatarUrl,
          isSpeaking,
          isMuted,
          // O LiveKit não sabe disso: useEchoVoiceSession completa com a presença do Supabase
          isDeafened: false,
          screenStream,
          isScreenSharing,
          screenFps: remoteScreenFps,
          cameraStream,
          isCameraOn
        })
      })
    }

    // Bot de Música: o bot publica o estado (fila, faixa atual...) nos metadados do próprio participante.
    // Só atualiza o store quando algo mudou, porque syncParticipants roda a cada troca de "falando".
    const botParticipant = room
      ? Array.from(room.remoteParticipants.values()).find(rp => isMusicBotIdentity(rp.identity))
      : undefined
    const botRaw = botParticipant?.metadata ?? null
    const botPresent = Boolean(botParticipant)
    if (botRaw !== musicBotRawRef.current || botPresent !== musicBotPresentRef.current) {
      musicBotRawRef.current = botRaw
      musicBotPresentRef.current = botPresent
      useMusicBotStore.getState().update(botPresent, parseMusicBotState(botRaw))
    }

    setParticipants(list)
  }, [])

  // ── Otimização Discord: Assinatura Dinâmica de Vídeo (Economia de Banda Oracle Cloud) ──
  const subscriptionOptionsRef = useRef<{
    activeSharerId?: string | null
    viewMode?: 'focus' | 'grid'
    isWatching?: boolean
    isCameraVisible?: boolean
  }>({ isWatching: true, viewMode: 'focus', isCameraVisible: true })

  const updateScreenSubscriptions = useCallback((opts?: {
    activeSharerId?: string | null
    viewMode?: 'focus' | 'grid'
    isWatching?: boolean
    isCameraVisible?: boolean
  }) => {
    if (opts) {
      subscriptionOptionsRef.current = {
        ...subscriptionOptionsRef.current,
        ...opts
      }
    }
    const currentOpts = subscriptionOptionsRef.current
    const room = roomRef.current
    if (!room || room.state !== 'connected') return

    const isWatching = currentOpts.isWatching ?? true
    const viewMode = currentOpts.viewMode ?? 'focus'
    const activeSharerId = currentOpts.activeSharerId
    const isCameraVisible = currentOpts.isCameraVisible ?? true

    room.remoteParticipants.forEach((rp) => {
      // Câmeras: só são exibidas no grid de participantes e ficam ocultas enquanto o usuário assiste a uma
      // transmissão, está em outro canal/página ou com a janela minimizada. setEnabled(false) pausa o
      // encaminhamento no SFU (0 Kbps) sem desfazer a assinatura.
      // O tamanho de cada tile depende de quantas pessoas dividem o grid, então a camada do simulcast
      // acompanha: 720p com até 2 pessoas, 360p até 6 e 180p acima disso.
      const cameraPub = rp.getTrackPublication(Track.Source.Camera)
      if (cameraPub) {
        const tileCount = room.remoteParticipants.size + 1
        cameraPub.setEnabled(isCameraVisible)
        cameraPub.setVideoQuality(
          tileCount <= 2 ? VideoQuality.HIGH : tileCount <= 6 ? VideoQuality.MEDIUM : VideoQuality.LOW
        )
      }

      const screenPub = rp.getTrackPublication(Track.Source.ScreenShare)
      const shouldSubscribe = isWatching && (viewMode === 'grid' || !activeSharerId || activeSharerId === rp.identity)
      if (screenPub) {
        // Se o espectador não estiver visualizando a tela, corta a transmissão de vídeo (0 Kbps)
        // No modo foco, assina apenas a tela selecionada. No modo grade, assina todas.
        // A tela é publicada sem simulcast (uma única camada), então não existe qualidade menor para
        // o modo grade: cada tela assinada consome o bitrate completo, mesmo em miniatura.
        if (screenPub.isSubscribed !== shouldSubscribe) {
          screenPub.setSubscribed(shouldSubscribe)
        }
      }

      // Se o usuário não estiver assistindo à transmissão (fechou/ocultou o vídeo), corta o áudio da tela (0 Kbps)
      const screenAudioPub = rp.getTrackPublication(Track.Source.ScreenShareAudio)
      if (screenAudioPub) {
        if (screenAudioPub.isSubscribed !== shouldSubscribe) {
          screenAudioPub.setSubscribed(shouldSubscribe)
        }
      }

      const screenAudio = audioElementsRef.current.get(`${rp.identity}-screen`)
      if (screenAudio) {
        screenAudio.muted = isDeafenedRef.current || !shouldSubscribe || activeStreamTilesRef.current.has(rp.identity)
      }
    })
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
        // Com o portão ativo, só conta como falando quando o som realmente está sendo transmitido
        const gateActive = noiseGateRef.current.enabled && !!localDspNodesRef.current?.gate
        const speaking = avg > 11 && (!gateActive || isGateOpenRef.current)

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

    // Em chamada: recria o microfone. Além de ligar/desligar o RNNoise, isso liga/desliga a supressão do
    // navegador (que não pode ser trocada num microfone já aberto) para as duas não rodarem juntas.
    if (localRawStreamRef.current && isConnected) {
      await rebuildMicrophoneRef.current?.()
    }
  }, [isConnected])

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

    if (screenShareStartTimeRef.current) {
      const dur = (Date.now() - screenShareStartTimeRef.current) / 1000
      trackScreenShareStopped(dur)
      screenShareStartTimeRef.current = null
    }

    sendVoicePresence('update', { hasScreen: false })

    syncParticipants()
  }, [syncParticipants, sendVoicePresence])

  // Stop local webcam (video call — MVP: apenas câmera, sem configurações extras por enquanto)
  const stopCamera = useCallback(() => {
    const room = roomRef.current
    if (localCameraVideoTrackRef.current) {
      if (room) {
        room.localParticipant.unpublishTrack(localCameraVideoTrackRef.current).catch(() => {})
      }
      localCameraVideoTrackRef.current.stop()
      localCameraVideoTrackRef.current = null
    }
    if (localCameraStreamRef.current) {
      try { localCameraStreamRef.current.getTracks().forEach(t => t.stop()) } catch (e) {}
    }
    localCameraStreamRef.current = null
    setLocalCameraStream(null)

    syncParticipants()
  }, [syncParticipants])

  // Start local webcam and publish it to the room (Track.Source.Camera — separado do Track.Source.ScreenShare)
  const startCamera = useCallback(async (deviceId?: string, onError?: (message: string) => void) => {
    const room = roomRef.current
    if (!room || !myInfoRef.current) {
      console.warn('[Camera] Sala ou info local indisponível.')
      onError?.('Você precisa estar conectado a uma chamada de voz para ligar a câmera.')
      return
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      console.error('[Camera] navigator.mediaDevices.getUserMedia indisponível neste ambiente.')
      onError?.('Este dispositivo não oferece suporte a captura de câmera.')
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      })
    } catch (err: any) {
      console.error('[Camera] Falha ao capturar vídeo da câmera:', err)
      const name = err?.name || ''
      let message = 'Não foi possível ligar a câmera.'
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        message = 'Permissão de câmera negada. Verifique em Configurações do Windows → Privacidade e Segurança → Câmera se "Permitir que apps de área de trabalho acessem sua câmera" está ativado, e se o Echo tem permissão de câmera.'
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        message = 'Nenhuma câmera foi encontrada neste computador.'
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        message = 'Não foi possível acessar a câmera. Ela pode estar sendo usada por outro aplicativo.'
      } else if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
        message = 'A câmera selecionada não suporta as configurações necessárias.'
      } else if (err?.message) {
        message = `Não foi possível ligar a câmera: ${err.message}`
      }
      onError?.(message)
      return
    }

    try {
      const videoTrack = stream.getVideoTracks()[0]
      if (!videoTrack) {
        console.error('[Camera] Nenhuma faixa de vídeo foi capturada.')
        try { stream.getTracks().forEach(t => t.stop()) } catch (e) {}
        onError?.('Não foi possível capturar vídeo da câmera.')
        return
      }

      localCameraStreamRef.current = stream
      setLocalCameraStream(stream)

      videoTrack.onended = () => {
        stopCamera()
      }

      if (room.state === 'connected') {
        try {
          const localVideoTrack = new LocalVideoTrack(videoTrack)
          localCameraVideoTrackRef.current = localVideoTrack

          await room.localParticipant.publishTrack(localVideoTrack, {
            source: Track.Source.Camera,
            name: 'camera_video',
            simulcast: true,
            videoEncoding: {
              maxBitrate: 1200000,
              maxFramerate: 30
            }
          })
        } catch (pubErr) {
          console.error('[Camera] Falha ao publicar câmera no LiveKit:', pubErr)
          onError?.('Sua câmera ligou, mas não foi possível transmiti-la para os outros participantes. Tente novamente.')
        }
      }

      syncParticipants()
    } catch (err) {
      console.error('[Camera] Falha ao iniciar câmera:', err)
      onError?.('Não foi possível ligar a câmera.')
    }
  }, [stopCamera, syncParticipants])

  // Leave voice channel cleanly
  const leaveVoice = useCallback(() => {
    isManualDisconnectRef.current = true
    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    isReconnectingRef.current = false
    setIsReconnecting(false)
    setIsNetworkUnstable(false)
    lastJoinParamsRef.current = null
    pendingMediaRestoreRef.current = null

    if (voiceJoinTimeRef.current && activeChannelIdRef.current) {
      const dur = (Date.now() - voiceJoinTimeRef.current) / 1000
      trackVoiceLeft(activeChannelIdRef.current, dur)
      voiceJoinTimeRef.current = null
    }

    isConnectingRef.current = false
    activeChannelIdRef.current = null
    activeSpaceIdRef.current = null

    stopLocalVad()
    stopScreenShare()
    stopCamera()
    remoteScreenStreamsRef.current.clear()
    remoteCameraStreamsRef.current.clear()

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

    activeStreamTilesRef.current.clear()

    audioElementsRef.current.forEach(audio => {
      audio.srcObject = null
      audio.remove()
    })
    if (voicePresenceIntervalRef.current) {
      clearInterval(voicePresenceIntervalRef.current)
      voicePresenceIntervalRef.current = null
    }

    if (channelRef.current) {
      try {
        const payload = {
          action: 'leave',
          user_id: myInfoRef.current?.userId,
          channel_id: activeChannelIdRef.current,
          space_id: activeSpaceIdRef.current
        }
        channelRef.current.send({
          type: 'broadcast',
          event: 'voice_presence_update',
          payload
        }).catch(() => {})
        channelRef.current.untrack().catch(() => {})
      } catch (e) {}
      // Preservamos o canal aberto no Supabase para que a escuta contínua de presença das salas não seja interrompida
      channelRef.current = null
    }

    activeSpeakersRef.current.clear()
    overrideProfilesRef.current.clear()
    myInfoRef.current = null
    setIsConnected(false)
    setParticipants([])
    setRtcStats(null)
    musicBotRawRef.current = undefined
    musicBotPresentRef.current = undefined
    useMusicBotStore.getState().reset()
  }, [stopLocalVad, stopScreenShare, stopCamera])

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

    if (!isReconnectingRef.current) {
      isManualDisconnectRef.current = false
      lastJoinParamsRef.current = {
        channelId,
        userId,
        displayName,
        avatarUrl,
        inputId,
        outputId,
        noiseSuppression,
        echoCancellation,
        spaceId
      }
    }

    isConnectingRef.current = true
    activeChannelIdRef.current = channelId
    activeSpaceIdRef.current = spaceId || null

    try {
      if (inputId) selectedInputIdRef.current = inputId
      if (outputId) selectedOutputIdRef.current = outputId

      noiseSuppressionPrefRef.current = noiseSuppression
      echoCancellationPrefRef.current = echoCancellation
      const browserNs = browserNoiseSuppression(noiseSuppression, isAiDenoiseEnabledRef.current)

      // Obter microfone com cancelamento de ruído e eco de alta qualidade
      const constraints = {
        audio: {
          deviceId: inputId && inputId !== 'default' ? { exact: inputId } : undefined,
          echoCancellation,
          noiseSuppression: browserNs,
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
            noiseSuppression: browserNs,
            autoGainControl: true
          },
          video: false
        })
      }

      localRawStreamRef.current = rawStream
      myInfoRef.current = { userId, displayName, avatarUrl }

      // Inicia medidor local de fala com 0ms de atraso
      startLocalVad(rawStream)
      syncParticipants()

      // Áudio profissional: sempre cria o pipeline DSP mono para permitir alternar IA instantaneamente
      let finalStream = rawStream
      try {
        const { finalStream: dspStream, audioCtx, nodes } = await createStudioMicrophoneDSP(
          rawStream,
          isAiDenoiseEnabledRef.current,
          noiseGateRef.current,
          handleGateChange
        )
        localDspCtxRef.current = audioCtx
        localDspNodesRef.current = nodes
        finalStream = dspStream
        if (isMutedRef.current && audioCtx.state === 'running') {
          audioCtx.suspend().catch(() => {})
        }
      } catch (dspErr) {
        console.error('[Voice] Falha no pipeline DSP:', dspErr)
      }
      localStreamRef.current = finalStream

      // Conexao LiveKit SFU (Oracle Cloud Always Free Server Ampere)
      let connectionUrl = 'wss://137-131-144-255.sslip.io'
      let token = ''

      // 1. Tenta obter o token autenticado diretamente via Supabase Edge Function segura
      if (supabase) {
        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke('livekit-token', {
            body: {
              room: channelId,
              identity: userId,
              name: displayName,
              avatarUrl
            }
          })
          if (!fnError && fnData && fnData.success && fnData.token) {
            connectionUrl = (!fnData.url || fnData.url.includes('136-248-75-151'))
              ? 'wss://137-131-144-255.sslip.io'
              : fnData.url
            token = fnData.token
            console.log('[LiveKit] Token seguro obtido via Edge Function!')
          } else if (fnError) {
            console.warn('[LiveKit] Edge Function retornou aviso/erro:', fnError)
          }
        } catch (fnErr) {
          console.warn('[LiveKit] Falha ao invocar Edge Function livekit-token:', fnErr)
        }
      }

      // 2. Fallback de contingência para ambiente desktop Electron (ex: dev local com livekit-server.exe)
      if (!token && typeof (window as any).electronAPI?.getLiveKitConnection === 'function') {
        try {
          const res = await (window as any).electronAPI.getLiveKitConnection({
            room: channelId,
            identity: userId,
            name: displayName,
            avatarUrl
          })
          if (res && res.success && res.token) {
            connectionUrl = (!res.url || res.url.includes('136-248-75-151'))
              ? 'wss://137-131-144-255.sslip.io'
              : res.url
            token = res.token
          }
        } catch (ipcErr) {
          console.warn('[LiveKit] Falha no token IPC:', ipcErr)
        }
      }

      if (!token) {
        throw new Error('Não foi possível gerar credenciais seguras para conectar à sala de voz')
      }

      const room = new Room({
        // adaptiveStream fica desligado: os tiles usam MediaStream próprio (não track.attach), então o
        // LiveKit não enxergaria o elemento de vídeo e pausaria a faixa. A economia de câmera é feita
        // manualmente em updateScreenSubscriptions.
        adaptiveStream: false,
        // dynacast: quem transmite para de codificar/enviar camadas que nenhum espectador está recebendo
        dynacast: true,
        publishDefaults: {
          simulcast: false,
          videoCodec: 'vp8',
          dtx: true,
        }
      })
      roomRef.current = room

      // Volume do bot de música em tempo real: mensagem de dados direto ao bot na sala, sem banco nem chat
      useMusicBotStore.getState().setSendVolume(async (percent: number) => {
        const target = roomRef.current
        if (!target) return false
        const bot = Array.from(target.remoteParticipants.values()).find(rp => isMusicBotIdentity(rp.identity))
        if (!bot) return false
        try {
          await target.localParticipant.publishData(encodeMusicBotVolume(percent), {
            reliable: true,
            topic: MUSIC_BOT_CONTROL_TOPIC,
            destinationIdentities: [bot.identity]
          })
          return true
        } catch {
          return false
        }
      })

      // Setup LiveKit room events
      room.on(RoomEvent.Connected, () => {
        setIsConnected(true)
        setIsNetworkUnstable(false)
        setIsReconnecting(false)
        isReconnectingRef.current = false
        setReconnectAttempt(0)
        if (reconnectTimerRef.current) {
          clearInterval(reconnectTimerRef.current)
          reconnectTimerRef.current = null
        }
        syncParticipants()
        updateScreenSubscriptions()
        console.log('[LiveKit] Conectado ao SFU na sala:', channelId)
      })

      room.on(RoomEvent.Reconnecting, () => {
        console.log('[LiveKit] Reconectando ao SFU...')
        setIsNetworkUnstable(true)
      })

      room.on(RoomEvent.Reconnected, () => {
        console.log('[LiveKit] Reconectado com sucesso ao SFU!')
        setIsNetworkUnstable(false)
        setIsConnected(true)
        setIsReconnecting(false)
        isReconnectingRef.current = false
        setReconnectAttempt(0)
        if (reconnectTimerRef.current) {
          clearInterval(reconnectTimerRef.current)
          reconnectTimerRef.current = null
        }
        syncParticipants()
        updateScreenSubscriptions()
      })

      room.on(RoomEvent.LocalTrackPublished, () => {
        syncParticipants()
      })

      room.on(RoomEvent.Disconnected, (reason) => {
        console.warn('[LiveKit] Desconectado do SFU. Motivo:', reason)
        setIsConnected(false)
        setIsNetworkUnstable(false)
        if (isManualDisconnectRef.current) {
          if (onDisconnectedRef.current) {
            onDisconnectedRef.current()
          }
          return
        }

        // Removido da sala pela API de servidor (moderação): não é queda de rede, então não reconecta.
        // Só o servidor produz esse motivo; um participante comum não consegue forjá-lo.
        if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
          leaveVoice()
          onDisconnectedRef.current?.()
          onKickedFromVoiceRef.current?.()
          return
        }

        // Queda inesperada (perda de Wi-Fi, roteador reiniciando, queda de rede prolongada)
        // Dispara o loop contínuo de reconexão
        startReconnectionLoopRef.current()
      })

      room.on(RoomEvent.ParticipantConnected, () => {
        syncParticipants()
        updateScreenSubscriptions()
        playJoinSound(sfxVolumeRef.current)
      })

      room.on(RoomEvent.TrackPublished, (pub: RemoteTrackPublication) => {
        syncParticipants()
        if (pub && (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.Camera)) {
          updateScreenSubscriptions()
        }
      })

      room.on(RoomEvent.TrackUnpublished, () => {
        syncParticipants()
      })

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        remoteScreenStreamsRef.current.delete(participant.identity)
        remoteCameraStreamsRef.current.delete(participant.identity)
        activeStreamTilesRef.current.delete(participant.identity)
        const voiceKey = `${participant.identity}-voice`
        const screenKey = `${participant.identity}-screen`

        const vAudio = audioElementsRef.current.get(voiceKey)
        if (vAudio) { vAudio.srcObject = null; vAudio.remove(); audioElementsRef.current.delete(voiceKey) }
        const sAudio = audioElementsRef.current.get(screenKey)
        if (sAudio) { sAudio.srcObject = null; sAudio.remove(); audioElementsRef.current.delete(screenKey) }
        syncParticipants()
        updateScreenSubscriptions()
        playLeaveSound(sfxVolumeRef.current)
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

          // Se for áudio de tela e a StreamTile estiver ativa na tela, o áudio de fundo fica mudo
          // para dar lugar ao som unificado com Lip-Sync nativo do WebRTC via C++ no <video>!
          // Se o usuário não estiver assistindo à transmissão, o áudio de tela também é silenciado.
          const isWatching = subscriptionOptionsRef.current.isWatching ?? true
          audio.muted = isDeafenedRef.current || savedVol === 0 || (isScreen && (!isWatching || activeStreamTilesRef.current.has(participant.identity)))

          if (isScreen) {
            applyScreenAudioDelayToTrack(track, screenAudioSyncDelayMsRef.current)
          }

          track.attach(audio)

          if (typeof (audio as any).setSinkId === 'function' && selectedOutputIdRef.current !== 'default') {
            ;(audio as any).setSinkId(selectedOutputIdRef.current).catch(() => {})
          }

          audio.play().catch(e => console.warn('[LiveKit] Audio play:', e))
          syncParticipants()
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
          syncParticipants()
        } else if (track.kind === Track.Kind.Video) {
          // Distingue a fonte para não apagar o cache errado (câmera vs. tela compartilhada)
          if (track.source === Track.Source.Camera) {
            remoteCameraStreamsRef.current.delete(participant.identity)
          } else {
            remoteScreenStreamsRef.current.delete(participant.identity)
          }
          syncParticipants()
        }
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        const nextActive = new Set<string>()
        speakers.forEach(s => nextActive.add(s.identity))
        activeSpeakersRef.current = nextActive
        syncParticipants()
      })

      // Aviso de moderação: vem nos metadados do PRÓPRIO participante, que só a API de servidor do LiveKit
      // escreve (Edge Function voice-moderation, depois de conferir cargo e hierarquia de quem pediu)
      const handledModerationIds = new Set<string>()
      room.on(RoomEvent.ParticipantMetadataChanged, (_prevMetadata: string | undefined, participant: Participant) => {
        if (participant === room.localParticipant) {
          const notice = parseModerationNotice(participant.metadata)
          if (notice && !handledModerationIds.has(notice.id)) {
            handledModerationIds.add(notice.id)
            if (notice.type === 'mute') {
              if (!isMutedRef.current) toggleMuteRef.current()
              onServerMutedRef.current?.()
            } else if (notice.type === 'disconnect') {
              leaveVoice()
              onKickedFromVoiceRef.current?.()
            } else if (notice.channelId) {
              leaveVoice()
              onMovedToVoiceChannelRef.current?.(notice.channelId, notice.channelName)
            }
          }
        }
        syncParticipants()
      })
      room.on(RoomEvent.TrackMuted, (publication: TrackPublication, participant: Participant) => {
        // Microfone silenciado pelo SFU (moderação) sem passar por toggleMute: acompanha o estado para a
        // interface e a presença não mostrarem o microfone aberto
        if (participant === room.localParticipant && publication.source === Track.Source.Microphone && !isMutedRef.current) {
          toggleMuteRef.current()
        }
        syncParticipants()
      })
      room.on(RoomEvent.TrackUnmuted, () => syncParticipants())

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const str = new TextDecoder().decode(payload)
          const data = JSON.parse(str)
          if (data.type === 'soundboard') {
            if (!isDeafenedRef.current) {
              const vol = sfxVolumeRef.current !== undefined ? sfxVolumeRef.current : 0.6
              playSoundboardEffect(data.soundId, vol)
            }
            setLastSoundboardEvent({
              soundId: data.soundId,
              userId: data.userId || participant?.identity || '',
              displayName: data.displayName || participant?.name || 'Alguém',
              timestamp: Date.now()
            })
          } else if (data.type === 'profile_update') {
            const targetUserId = data.userId || participant?.identity
            if (targetUserId) {
              overrideProfilesRef.current.set(targetUserId, {
                displayName: data.displayName,
                avatarUrl: data.avatarUrl
              })
              syncParticipants()
            }
          }
          // Comandos de moderação (server_mute/disconnect_member/move_member) que chegam por aqui são
          // ignorados de propósito: qualquer participante consegue forjá-los. A moderação vem do servidor.
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
          voiceJoinTimeRef.current = Date.now()
          trackVoiceJoined(channelId)
          setIsConnected(true)
          syncParticipants()
        } catch (connErr) {
          console.error('[LiveKit] Erro ao conectar ao SFU:', connErr)
          throw connErr
        }
      }

      // Sem a permissão "Falar" (cargos do espaço) o token não deixa publicar: entra só ouvindo
      const canPublish = room.localParticipant.permissions?.canPublish !== false
      if (room.state === 'connected' && !canPublish) {
        setIsMuted(true)
        isMutedRef.current = true
        onReconnectMediaNoticeRef.current?.('Somente ouvindo', 'Seus cargos neste espaço não têm a permissão "Falar".')
      }

      // Publica microfone do usuário
      if (room.state === 'connected' && canPublish) {
        try {
          const micTrack = finalStream.getAudioTracks()[0]
          if (micTrack) {
            const localAudio = new LocalAudioTrack(micTrack)
            localAudioTrackRef.current = localAudio
            await room.localParticipant.publishTrack(localAudio, {
              source: Track.Source.Microphone,
              name: 'microphone',
              dtx: true
            })
          }
        } catch (pubErr) {
          console.error('[LiveKit] Erro ao publicar microfone:', pubErr)
        }
      }

      syncParticipants()

      // Sincroniza presença no Supabase para que membros fora da call vejam quem está dentro
      if (supabase) {
        const presenceChanName = spaceId ? `space-voice-${spaceId}` : `voice-${channelId}`
        const sbChannel = supabase.channel(presenceChanName, {
          config: { presence: { key: userId } }
        })
        // Normalmente é o mesmo canal já criado por useEchoVoiceSession (a instalação é idempotente)
        installPresenceTrackThrottle(sbChannel, { keepAliveMs: 15000 })
        channelRef.current = sbChannel

        const doTrack = async () => {
          try {
            await sbChannel.track({
              user_id: userId,
              display_name: displayName,
              avatar_url: avatarUrl,
              channel_id: channelId,
              is_muted: isMutedRef.current,
              is_deafened: isDeafenedRef.current,
              has_screen: false,
              space_id: spaceId || null
            })
            sbChannel.send({
              type: 'broadcast',
              event: 'voice_presence_update',
              payload: {
                action: 'join',
                user_id: userId,
                display_name: displayName,
                avatar_url: avatarUrl,
                channel_id: channelId,
                space_id: spaceId || null,
                is_muted: isMutedRef.current,
                is_deafened: isDeafenedRef.current,
                has_screen: false
              }
            }).catch(() => {})
            console.log('[Voice Presence] Usuário registrado na presença com sucesso:', channelId)
          } catch (trErr) {
            console.warn('[Voice Presence] Erro ao registrar presença:', trErr)
          }
        }

        // Aguarda o canal estar pronto (joined) de forma resiliente
        const startTrackingWithRetry = async () => {
          let attempts = 0
          while (attempts < 20) {
            if ((sbChannel as any).state === 'joined') {
              await doTrack()
              return
            }
            await new Promise(r => setTimeout(r, 200))
            attempts++
          }
          await doTrack()
        }
        startTrackingWithRetry()

        if (voicePresenceIntervalRef.current) {
          clearInterval(voicePresenceIntervalRef.current)
        }
        voicePresenceIntervalRef.current = setInterval(() => {
          if (activeChannelIdRef.current === channelId) {
            doTrack()
          }
        }, 10000)
      }
    } catch (err) {
      console.error('[LiveKit] Falha ao entrar no canal de voz:', err)
      if (isReconnectingRef.current) {
        stopLocalVad()
        stopScreenShare()
        const r = roomRef.current
        if (r) {
          try { r.disconnect() } catch (e) {}
          roomRef.current = null
        }
      } else {
        leaveVoice()
      }
      throw err
    } finally {
      isConnectingRef.current = false
    }
  }, [startLocalVad, syncParticipants, leaveVoice, stopLocalVad, stopScreenShare])

  const attemptReconnect = useCallback(async () => {
    if (isManualDisconnectRef.current || !lastJoinParamsRef.current) return
    const params = lastJoinParamsRef.current

    try {
      console.log(`[LiveKit] Tentativa de reconexão contínua ao canal: ${params.channelId}`)

      // room.disconnect() para todas as faixas locais, mas o estado de câmera/tela do app continuaria "ligado".
      // Guarda o que estava ativo (só na primeira tentativa — nas seguintes já foi limpo) e limpa o estado.
      if (!pendingMediaRestoreRef.current && (localCameraStreamRef.current || localScreenStreamRef.current)) {
        pendingMediaRestoreRef.current = {
          camera: !!localCameraStreamRef.current,
          cameraDeviceId: localCameraStreamRef.current?.getVideoTracks()[0]?.getSettings().deviceId,
          screen: !!localScreenStreamRef.current
        }
      }
      if (localCameraStreamRef.current) stopCamera()
      if (localScreenStreamRef.current) stopScreenShare()

      if (roomRef.current) {
        try { roomRef.current.disconnect() } catch (e) {}
        roomRef.current = null
      }
      isConnectingRef.current = false

      await joinVoice(
        params.channelId,
        params.userId,
        params.displayName,
        params.avatarUrl,
        params.inputId,
        params.outputId,
        params.noiseSuppression,
        params.echoCancellation,
        params.spaceId
      )
      console.log('[LiveKit] Chamada restabelecida com sucesso!')
      setIsReconnecting(false)
      isReconnectingRef.current = false
      setReconnectAttempt(0)
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      // Religa a câmera automaticamente. A tela não é retomada sozinha: exige escolher a fonte de novo.
      const restore = pendingMediaRestoreRef.current
      pendingMediaRestoreRef.current = null
      if (restore) {
        if (restore.camera && !localCameraStreamRef.current) {
          await startCamera(restore.cameraDeviceId, (message) => {
            onReconnectMediaNoticeRef.current?.('Câmera desligada', message)
          })
        }
        if (restore.screen) {
          onReconnectMediaNoticeRef.current?.(
            'Transmissão encerrada',
            'Sua conexão caiu e a transmissão de tela foi interrompida. Inicie a transmissão novamente para retomar.'
          )
        }
      }
    } catch (err) {
      console.warn('[LiveKit] Falha na tentativa de reconexão (rede offline), reagendando em 5s...', err)
      startReconnectionLoopRef.current()
    }
  }, [joinVoice, startCamera, stopCamera, stopScreenShare])
  attemptReconnectRef.current = attemptReconnect

  const startReconnectionLoop = useCallback(() => {
    if (isManualDisconnectRef.current || !lastJoinParamsRef.current) return
    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    isReconnectingRef.current = true
    setIsReconnecting(true)
    setReconnectCountdown(5)
    setReconnectAttempt(prev => prev + 1)

    // Limpa instâncias antigas de áudio para evitar ruído órfão
    audioElementsRef.current.forEach(audio => {
      audio.srcObject = null
      audio.remove()
    })
    audioElementsRef.current.clear()

    let currentSec = 5
    reconnectTimerRef.current = setInterval(async () => {
      currentSec -= 1
      if (currentSec > 0) {
        setReconnectCountdown(currentSec)
      } else {
        if (reconnectTimerRef.current) {
          clearInterval(reconnectTimerRef.current)
          reconnectTimerRef.current = null
        }
        await attemptReconnectRef.current()
      }
    }, 1000)
  }, [])
  startReconnectionLoopRef.current = startReconnectionLoop

  const retryVoiceReconnect = useCallback(async () => {
    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    await attemptReconnectRef.current()
  }, [])

  const cancelVoiceReconnect = useCallback(() => {
    isManualDisconnectRef.current = true
    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    isReconnectingRef.current = false
    setIsReconnecting(false)
    lastJoinParamsRef.current = null
    leaveVoice()
    if (onDisconnectedRef.current) {
      onDisconnectedRef.current()
    }
  }, [leaveVoice])

  // Ouvinte nativo do sistema operacional: quando o sinal de internet voltar, tenta na hora
  useEffect(() => {
    const handleOnline = () => {
      if (isReconnectingRef.current) {
        console.log('[Network] Sinal de internet online restabelecido! Disparando reconexão imediata...')
        retryVoiceReconnect()
      }
    }
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [retryVoiceReconnect])

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

    // Economia de CPU e bateria: suspende o AudioContext do DSP quando o mic estiver mutado
    if (localDspCtxRef.current) {
      if (next && localDspCtxRef.current.state === 'running') {
        localDspCtxRef.current.suspend().catch(() => {})
      } else if (!next && localDspCtxRef.current.state === 'suspended') {
        localDspCtxRef.current.resume().catch(() => {})
      }
    }

    sendVoicePresence('update', { isMuted: next })

    syncParticipants()
  }, [syncParticipants, sendVoicePresence])
  toggleMuteRef.current = toggleMute

  // Toggle Deafen
  const toggleDeafen = useCallback(() => {
    const next = !isDeafenedRef.current
    isDeafenedRef.current = next
    setIsDeafened(next)

    audioElementsRef.current.forEach((audio, key) => {
      if (key.endsWith('-screen')) {
        const participantId = key.replace(/-screen$/, '')
        const isWatching = subscriptionOptionsRef.current.isWatching ?? true
        const sVol = peerScreenVolumesRef.current.get(participantId) ?? 1.0
        audio.muted = next || sVol === 0 || !isWatching || activeStreamTilesRef.current.has(participantId)
      } else {
        const participantId = key.replace(/-voice$/, '')
        const vVol = peerVolumesRef.current.get(participantId) ?? 1.0
        audio.muted = next || vVol === 0
      }
    })

    if (next && !isMutedRef.current) {
      toggleMute()
    }

    sendVoicePresence('update', { isDeafened: next })

    syncParticipants()
  }, [syncParticipants, toggleMute, sendVoicePresence])

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

      const targetWidth = Math.min(width || 1920, 1920)
      const targetHeight = Math.min(height || 1080, 1080)
      const targetFps = Math.min(fps || 60, 60)
      localTargetFpsRef.current = targetFps

      let nativeAudioTrack: MediaStreamTrack | null = null
      const isWindowSource = sourceId && sourceId.startsWith('window:')

      // 1. Captura de áudio nativa por processo (Windows WASAPI loopback por PID para janelas ou Exclusão do Echo para tela inteira)
      if (typeof (window as any).electronAPI?.startProcessAudioCapture === 'function') {
        try {
          const res = await (window as any).electronAPI.startProcessAudioCapture(sourceId || 'screen:0:0')
          if (res && res.success) {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
            const procCtx = new AudioCtxClass({ sampleRate: 48000 })
            await procCtx.resume().catch(() => {})
            const dest = procCtx.createMediaStreamDestination()

            // Processador de alta fidelidade com sincronização labial (Drift Correction) e zero robotização
            let workletNode: AudioWorkletNode | null = null
            let scriptNode: ScriptProcessorNode | null = null

            try {
              const workletCode = `
                class ScreenAudioWorkletProcessor extends AudioWorkletProcessor {
                  constructor() {
                    super();
                    this.RING = 48000;
                    this.ringL = new Float32Array(this.RING);
                    this.ringR = new Float32Array(this.RING);
                    this.writeIdx = 0;
                    this.readIdx = 0;
                    this.available = 0;
                    this.targetLatency = 960;  // ~20ms (Buffer ultra-baixo para absorver jitter sem causar atraso no áudio)
                    this.maxLatency = 1920;    // ~40ms (Teto máximo para drift correction)
                    this.isPrimed = false;

                    this.port.onmessage = (e) => {
                      const left = e.data.left;
                      const right = e.data.right;
                      const len = left.length;
                      for (let i = 0; i < len; i++) {
                        this.ringL[this.writeIdx] = left[i];
                        this.ringR[this.writeIdx] = right[i];
                        this.writeIdx = (this.writeIdx + 1) % this.RING;
                      }
                      this.available = Math.min(this.RING, this.available + len);

                      // Soft Drift Correction: Se o áudio acumular mais que maxLatency (ex: pico de CPU),
                      // salta o excesso para colar de volta nos 20ms da captura em tempo real!
                      if (this.available > this.maxLatency) {
                        const excess = this.available - this.targetLatency;
                        this.readIdx = (this.readIdx + excess) % this.RING;
                        this.available = this.targetLatency;
                      }
                    };
                  }

                  process(inputs, outputs) {
                    const output = outputs[0];
                    if (!output || output.length < 2) return true;
                    const outL = output[0];
                    const outR = output[1];
                    const len = outL.length;

                    if (!this.isPrimed) {
                      if (this.available >= this.targetLatency) {
                        this.isPrimed = true;
                      } else {
                        outL.fill(0);
                        outR.fill(0);
                        return true;
                      }
                    }

                    if (this.available < len) {
                      outL.fill(0);
                      outR.fill(0);
                      return true;
                    }

                    for (let i = 0; i < len; i++) {
                      outL[i] = this.ringL[this.readIdx];
                      outR[i] = this.ringR[this.readIdx];
                      this.readIdx = (this.readIdx + 1) % this.RING;
                    }
                    this.available -= len;
                    return true;
                  }
                }
                registerProcessor('screen-audio-processor', ScreenAudioWorkletProcessor);
              `
              const blob = new Blob([workletCode], { type: 'application/javascript' })
              const workletUrl = URL.createObjectURL(blob)
              await procCtx.audioWorklet.addModule(workletUrl)
              URL.revokeObjectURL(workletUrl)

              workletNode = new AudioWorkletNode(procCtx, 'screen-audio-processor', {
                numberOfInputs: 0,
                numberOfOutputs: 1,
                outputChannelCount: [2]
              })
              workletNode.connect(dest)

              ;(window as any).electronAPI?.onScreenshareAudioChunk((chunk: Uint8Array | ArrayBuffer) => {
                const raw = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
                const int16 = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 2))
                const samples = Math.floor(int16.length / 2)
                if (samples <= 0) return

                const left = new Float32Array(samples)
                const right = new Float32Array(samples)
                for (let i = 0; i < samples; i++) {
                  left[i] = int16[i * 2] / 32768.0
                  right[i] = int16[i * 2 + 1] / 32768.0
                }
                workletNode?.port.postMessage({ left, right }, [left.buffer, right.buffer])
              })
            } catch (workletErr) {
              console.warn('[ScreenShareAudio] AudioWorklet fallback para ScriptProcessor com drift correction:', workletErr)

              const RING_SIZE = 48000
              const ringL = new Float32Array(RING_SIZE)
              const ringR = new Float32Array(RING_SIZE)
              let writeIdx = 0
              let readIdx = 0
              let available = 0
              let isPrimed = false
              const TARGET_LATENCY = 960  // ~20ms
              const MAX_LATENCY = 1920    // ~40ms

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

                if (available > MAX_LATENCY) {
                  const excess = available - TARGET_LATENCY
                  readIdx = (readIdx + excess) % RING_SIZE
                  available = TARGET_LATENCY
                }
              })

              scriptNode = procCtx.createScriptProcessor(1024, 0, 2)
              scriptNode.onaudioprocess = (e) => {
                const outL = e.outputBuffer.getChannelData(0)
                const outR = e.outputBuffer.getChannelData(1)
                const len = outL.length

                if (!isPrimed) {
                  if (available >= TARGET_LATENCY) {
                    isPrimed = true
                  } else {
                    outL.fill(0)
                    outR.fill(0)
                    return
                  }
                }

                const samplesToRead = Math.min(len, available)

                for (let i = 0; i < samplesToRead; i++) {
                  outL[i] = ringL[readIdx]
                  outR[i] = ringR[readIdx]
                  readIdx = (readIdx + 1) % RING_SIZE
                }
                available -= samplesToRead

                for (let i = samplesToRead; i < len; i++) {
                  outL[i] = 0
                  outR[i] = 0
                }
              }
              scriptNode.connect(dest)
            }

            nativeAudioTrack = dest.stream.getAudioTracks()[0]
            if (nativeAudioTrack) {
              try {
                await nativeAudioTrack.applyConstraints({
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: false,
                  channelCount: 2
                })
              } catch (e) {}
            }

            nativeAudioCleanupRef.current = () => {
              try { workletNode?.disconnect() } catch (e) {}
              try { scriptNode?.disconnect() } catch (e) {}
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
                minFrameRate: Math.min(targetFps, 30),
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
              minFrameRate: Math.min(targetFps, 30),
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

      // 3. Atualiza preview local imediatamente (com áudio para o medidor de volume detectar som)
      const previewTracks: MediaStreamTrack[] = [videoTrack]
      if (audioTrack) {
        previewTracks.push(audioTrack)
      }
      const previewStream = new MediaStream(previewTracks)
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

          try {
            localVideoTrack.mediaStreamTrack.contentHint = 'motion'
          } catch (e) {}

          // Bitrate e taxa de quadros para alta fidelidade e fluidez 60 FPS:
          // 1080p 60fps = 5.0 Mbps | 1080p 30fps = 3.0 Mbps | 720p 60fps = 3.0 Mbps | 720p 30fps = 1.8 Mbps
          const calculatedBitrate = targetWidth > 1280
            ? (targetFps >= 60 ? 5000000 : 3000000)
            : (targetFps >= 60 ? 3000000 : 1800000)

          await room.localParticipant.publishTrack(localVideoTrack, {
            source: Track.Source.ScreenShare,
            name: `screen_video_${targetFps}fps`,
            simulcast: false,
            videoCodec: 'h264',
            videoEncoding: {
              maxBitrate: calculatedBitrate,
              maxFramerate: targetFps
            },
            degradationPreference: 'maintain-framerate'
          })

          screenShareStartTimeRef.current = Date.now()
          trackScreenShareStarted(`${targetHeight}p`, targetFps)

          if (audioTrack) {
            try {
              const localAudioTrack = new LocalAudioTrack(audioTrack)
              localScreenAudioTrackRef.current = localAudioTrack
              await room.localParticipant.publishTrack(localAudioTrack, {
                source: Track.Source.ScreenShareAudio,
                name: 'screen_audio',
                dtx: false,
                audioPreset: {
                  maxBitrate: 128000
                }
              })
            } catch (aPubErr) {
              console.warn('[ScreenShare] Erro ao publicar áudio do compartilhamento:', aPubErr)
            }
          }
        } catch (pubErr) {
          console.error('[ScreenShare] Falha ao publicar tela no LiveKit:', pubErr)
        }
      }

      sendVoicePresence('update', { hasScreen: true })

      syncParticipants()
    } catch (err) {
      console.error('[LiveKit] Falha ao iniciar transmissão:', err)
    }
  }, [stopScreenShare, syncParticipants, sendVoicePresence])

  // Change input microphone device
  const changeInputDevice = useCallback(async (deviceId: string, noiseSuppression = true, echoCancellation = true) => {
    selectedInputIdRef.current = deviceId
    noiseSuppressionPrefRef.current = noiseSuppression
    echoCancellationPrefRef.current = echoCancellation
    if (!isConnected || !localRawStreamRef.current) return

    try {
      localRawStreamRef.current.getTracks().forEach(t => t.stop())
      if (localDspCtxRef.current) {
        try { localDspCtxRef.current.close() } catch (e) {}
        localDspCtxRef.current = null
      }
      if (localDspNodesRef.current?.rnnoiseNode) {
        try { localDspNodesRef.current.rnnoiseNode.destroy() } catch (e) {}
      }
      localDspNodesRef.current = null

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation,
          noiseSuppression: browserNoiseSuppression(noiseSuppression, isAiDenoiseEnabledRef.current),
          autoGainControl: true,
          channelCount: 1
        }
      })
      localRawStreamRef.current = newStream
      startLocalVad(newStream)

      let finalStream = newStream
      try {
        const { finalStream: dspStream, audioCtx, nodes } = await createStudioMicrophoneDSP(
          newStream,
          isAiDenoiseEnabledRef.current,
          noiseGateRef.current,
          handleGateChange
        )
        localDspCtxRef.current = audioCtx
        localDspNodesRef.current = nodes
        finalStream = dspStream
        if (isMutedRef.current && audioCtx.state === 'running') {
          audioCtx.suspend().catch(() => {})
        }
      } catch (dspErr) {
        console.error('[Voice] Falha no DSP após troca de dispositivo:', dspErr)
      }
      localStreamRef.current = finalStream

      const newTrack = finalStream.getAudioTracks()[0]
      if (newTrack && localAudioTrackRef.current) {
        await localAudioTrackRef.current.replaceTrack(newTrack, true)
      }
    } catch (err) {
      console.error('Failed to change input device:', err)
    }
  }, [isConnected, startLocalVad, handleGateChange])

  // Usado pela alternância da IA: recria o microfone atual com as mesmas preferências
  useEffect(() => {
    rebuildMicrophoneRef.current = () => changeInputDevice(
      selectedInputIdRef.current || 'default',
      noiseSuppressionPrefRef.current,
      echoCancellationPrefRef.current
    )
  }, [changeInputDevice])

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
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, clamped))
      audio.muted = isDeafenedRef.current || clamped === 0
    }
  }, [])

  const changePeerScreenVolume = useCallback((peerId: string, volume: number) => {
    const clamped = Math.max(0, Math.min(2, volume))
    peerScreenVolumesRef.current.set(peerId, clamped)
    const audio = audioElementsRef.current.get(`${peerId}-screen`)
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, clamped))
      const isWatching = subscriptionOptionsRef.current.isWatching ?? true
      audio.muted = isDeafenedRef.current || clamped === 0 || !isWatching || activeStreamTilesRef.current.has(peerId)
    }
  }, [])

  // Gerencia ativação do player de vídeo na tela para desmutar som do <video> com Lip-Sync nativo
  // e silenciar o áudio duplicado de fundo enquanto o player de tela estiver ativo
  useEffect(() => {
    const handleTileActive = (e: any) => {
      const { userId, active } = e.detail || {}
      if (!userId) return
      if (active) {
        activeStreamTilesRef.current.add(userId)
      } else {
        activeStreamTilesRef.current.delete(userId)
      }
      const bgAudio = audioElementsRef.current.get(`${userId}-screen`)
      if (bgAudio) {
        const isWatching = subscriptionOptionsRef.current.isWatching ?? true
        bgAudio.muted = isDeafenedRef.current || !isWatching || activeStreamTilesRef.current.has(userId)
      }
    }
    window.addEventListener('echo-stream-tile-active', handleTileActive as EventListener)
    return () => {
      window.removeEventListener('echo-stream-tile-active', handleTileActive as EventListener)
    }
  }, [])

  const changePeerPan = useCallback((peerId: string, pan: number) => {
    const clamped = Math.max(-1, Math.min(1, pan))
    peerPansRef.current.set(peerId, clamped)
  }, [])

  const setSpatialAudioEnabled = useCallback((enabled: boolean) => {
    isSpatialAudioEnabledRef.current = enabled
  }, [])

  const changeScreenShareSettings = useCallback(async (width?: number, height?: number, fps?: number) => {
    if (localScreenVideoTrackRef.current) {
      try {
        const constraints: MediaTrackConstraints = {}
        if (width) constraints.width = { max: width, ideal: width }
        if (height) constraints.height = { max: height, ideal: height }
        if (fps) constraints.frameRate = { max: fps, ideal: fps }
        await localScreenVideoTrackRef.current.mediaStreamTrack.applyConstraints(constraints)

        // Atualiza parâmetros de codificação diretamente no RTCRtpSender do WebRTC/LiveKit
        const sender = (localScreenVideoTrackRef.current as any).sender as RTCRtpSender | undefined
        if (sender && typeof sender.getParameters === 'function') {
          const params = sender.getParameters()
          if (params && params.encodings && params.encodings.length > 0) {
            if (fps) {
              params.encodings[0].maxFramerate = fps
            }
            if (width && fps) {
              const newBitrate = width > 1280
                ? (fps >= 60 ? 5000000 : 3000000)
                : (fps >= 60 ? 3000000 : 1800000)
              params.encodings[0].maxBitrate = newBitrate
            }
            if ((params as any).degradationPreference) {
              ;(params as any).degradationPreference = (fps && fps >= 60) ? 'maintain-framerate' : 'balanced'
            }
            await sender.setParameters(params).catch((paramErr) => {
              console.warn('[ScreenShare] Erro ao atualizar parâmetros de codificação no sender:', paramErr)
            })
          }
        }
      } catch (e) {
        console.warn('[ScreenShare] Erro ao aplicar novas configurações na faixa de vídeo:', e)
      }
    }
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
    // 1. Toca o efeito sonoro localmente para quem clicou ouvir de imediato
    if (!isDeafenedRef.current) {
      const vol = sfxVolumeRef.current !== undefined ? sfxVolumeRef.current : 0.6
      playSoundboardEffect(soundId, vol)
    }

    setLastSoundboardEvent({
      soundId,
      userId: myInfoRef.current?.userId || '',
      displayName: myInfoRef.current?.displayName || 'Você',
      timestamp: Date.now()
    })

    // 2. Se estiver em chamada, transmite via LiveKit para os outros membros da sala
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

  // Atualiza perfil local (nome e avatar) em tempo real sem precisar sair e entrar da sala
  const updateLocalProfile = useCallback((displayName: string, avatarUrl?: string) => {
    if (myInfoRef.current) {
      myInfoRef.current.displayName = displayName
      if (avatarUrl !== undefined) {
        myInfoRef.current.avatarUrl = avatarUrl
      }
      overrideProfilesRef.current.set(myInfoRef.current.userId, {
        displayName,
        avatarUrl: myInfoRef.current.avatarUrl
      })
    }
    const room = roomRef.current
    if (room && room.localParticipant) {
      try {
        const payload = JSON.stringify({
          type: 'profile_update',
          userId: myInfoRef.current?.userId || room.localParticipant.identity,
          displayName,
          avatarUrl: myInfoRef.current?.avatarUrl
        })
        const encoder = new TextEncoder()
        room.localParticipant.publishData(encoder.encode(payload), { reliable: true }).catch((err) => {
          console.warn('[LiveKit] Falha ao enviar profile_update via DataChannel:', err)
        })
      } catch (e) {}
    }
    syncParticipants()
  }, [syncParticipants])

  // Auto leave on unmount (usando ref estável para NUNCA disparar em re-renderizações normais)
  const leaveVoiceRef = useRef(leaveVoice)
  useEffect(() => {
    leaveVoiceRef.current = leaveVoice
  }, [leaveVoice])

  useEffect(() => {
    return () => {
      leaveVoiceRef.current()
    }
  }, [])

  return { 
    participants, 
    isMuted, 
    isDeafened,
    isConnected,
    localScreenStream,
    localCameraStream,
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
    startCamera,
    stopCamera,
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
    toggleAiDenoise,
    updateScreenSubscriptions,
    updateLocalProfile,
    screenAudioSyncDelayMs,
    changeScreenAudioSyncDelay,
    isReconnecting,
    isNetworkUnstable,
    reconnectCountdown,
    reconnectAttempt,
    retryVoiceReconnect,
    cancelVoiceReconnect
  }
}
