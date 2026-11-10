import { useState } from 'react'
import { HeadphonesIcon, HeadphonesOffIcon, MicIcon, MicOffIcon, PhoneOffIcon } from '../icons'
import { useVoiceStore } from '../../stores/useVoiceStore'
import { StillAvatarImage } from './StillAvatarImage'
import { CallElapsed } from './CallHeaderMeta'

export interface FloatingCallParticipant {
  userId: string
  displayName: string
  avatarUrl?: string
  isSpeaking: boolean
  isMuted?: boolean
  isDeafened?: boolean
  isScreenSharing?: boolean
}

export interface FloatingCallPanelProps {
  channelName?: string
  spaceName?: string
  participants?: FloatingCallParticipant[]
  currentUserId: string
  isMuted?: boolean
  isDeafened?: boolean
  onToggleMute?: () => void
  onToggleDeafen?: () => void
  onLeave?: () => void
  /** Leva de volta à tela da chamada */
  onReturn?: () => void
}

const COLLAPSED_KEY = 'echo-call-panel-collapsed'
const MAX_AVATARS = 5

/**
 * Quando mostrar o painel: há uma chamada de voz conectada e a pessoa NÃO está olhando para ela agora.
 * "Olhando" = na área de servidores com o canal de voz da chamada aberto (aí a própria tela já mostra tudo).
 * Vale também com a barra de canais aberta: o painel é o atalho que o dono quer sempre à mão (a v0.62.0 o
 * escondia nesse caso e ele pediu de volta).
 */
export function shouldShowFloatingCall(opts: {
  isConnected: boolean
  activeVoiceChannelId: string | null | undefined
  page: string
  selectedChannelId: string | null | undefined
}): boolean {
  if (!opts.isConnected || !opts.activeVoiceChannelId) return false
  const viewingCall = opts.page === 'Servidores' && opts.selectedChannelId === opts.activeVoiceChannelId
  return !viewingCall
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function Avatar({ p, size }: { p: FloatingCallParticipant; size: 'md' | 'sm' }) {
  return (
    <span className={`fcp-avatar fcp-avatar-${size} ${p.isSpeaking ? 'is-speaking' : ''}`} title={p.displayName}>
      {/* Foto parada: o painel fica na tela a chamada toda, e um GIF vivo aqui era redesenho sem fim */}
      {p.avatarUrl ? <StillAvatarImage src={p.avatarUrl} maxSize={80} /> : <span aria-hidden="true">{(p.displayName || '?').slice(0, 1).toUpperCase()}</span>}
      {p.isMuted && (
        <span className="fcp-avatar-flag" aria-hidden="true">
          <MicOffIcon style={{ width: 8, height: 8 }} />
        </span>
      )}
    </span>
  )
}

export function FloatingCallPanel({
  channelName: propChannelName,
  spaceName,
  participants: propParticipants,
  currentUserId,
  isMuted: propIsMuted,
  isDeafened: propIsDeafened,
  onToggleMute: propOnToggleMute,
  onToggleDeafen: propOnToggleDeafen,
  onLeave: propOnLeave,
  onReturn
}: FloatingCallPanelProps) {
  const storeChannel = useVoiceStore((s) => s.activeVoiceChannel)
  const storeParticipants = useVoiceStore((s) => s.participants)
  const storeMuted = useVoiceStore((s) => s.isMuted)
  const storeDeafened = useVoiceStore((s) => s.isDeafened)
  const storeToggleMute = useVoiceStore((s) => s.handleToggleMute)
  const storeToggleDeafen = useVoiceStore((s) => s.handleToggleDeafen)
  const storeLeave = useVoiceStore((s) => s.handleLeaveVoice)

  const channelName = propChannelName ?? storeChannel?.name ?? 'Chamada de Voz'
  const participants = propParticipants ?? storeParticipants
  const isMuted = propIsMuted ?? storeMuted
  const isDeafened = propIsDeafened ?? storeDeafened
  const onToggleMute = propOnToggleMute ?? storeToggleMute
  const onToggleDeafen = propOnToggleDeafen ?? storeToggleDeafen
  const onLeave = propOnLeave ?? storeLeave

  const [collapsed, setCollapsed] = useState(readCollapsed)

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // sem armazenamento: só não lembra da escolha
      }
      return next
    })
  }

  // Quem está falando agora (sem contar a si mesmo, que já sabe); se ninguém, o texto fica calmo
  const speakers = participants.filter((p) => p.isSpeaking && !p.isMuted)
  const others = speakers.filter((p) => p.userId !== currentUserId)
  const main = others[0] ?? speakers[0]
  const speakingText = main
    ? main.userId === currentUserId && others.length === 0
      ? 'Você está falando'
      : others.length > 1
        ? `${others[0].displayName} e mais ${others.length - 1} falando`
        : `${others[0]?.displayName ?? main.displayName} está falando`
    : 'Ninguém falando agora'

  // O falante vem primeiro na fileira, para aparecer mesmo com muita gente na chamada
  const ordered = [...participants].sort((a, b) => Number(b.isSpeaking) - Number(a.isSpeaking))
  const shown = ordered.slice(0, MAX_AVATARS)
  const extra = participants.length - shown.length

  if (collapsed) {
    const face = main ?? participants.find((p) => p.userId !== currentUserId) ?? participants[0]
    return (
      <section className="floating-call-panel is-collapsed" role="region" aria-label="Chamada de voz em andamento">
        <button type="button" className="fcp-collapsed-main" onClick={toggleCollapsed} aria-label={`Expandir a chamada em ${channelName}`} title="Expandir">
          <span className="fcp-live-dot" aria-hidden="true" />
          {face ? <Avatar p={face} size="sm" /> : null}
          <span className="fcp-collapsed-name">{main ? main.displayName : channelName}</span>
        </button>
        <button
          type="button"
          className={`fcp-icon-btn ${isMuted ? 'is-off' : ''}`}
          onClick={onToggleMute}
          aria-label={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
          aria-pressed={isMuted}
          title={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
        >
          {isMuted ? <MicOffIcon style={{ width: 15, height: 15 }} /> : <MicIcon style={{ width: 15, height: 15 }} />}
        </button>
      </section>
    )
  }

  return (
    <section className="floating-call-panel" role="region" aria-label="Chamada de voz em andamento">
      <header className="fcp-header">
        <span className="fcp-live-dot" aria-hidden="true" />
        <div className="fcp-titles">
          <strong className="fcp-channel" title={channelName}>{channelName}</strong>
          {/* Espaço e o tempo de chamada: "Amigos da Madrugada · 12:34" */}
          <span className="fcp-space" title={spaceName}>
            {spaceName ? `${spaceName} · ` : ''}<CallElapsed />
          </span>
        </div>
        <button type="button" className="fcp-collapse-btn" onClick={toggleCollapsed} aria-label="Recolher o painel da chamada" title="Recolher">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </header>

      <div className="fcp-people" aria-label={`${participants.length} pessoas na chamada`}>
        {shown.map((p) => <Avatar key={p.userId} p={p} size="md" />)}
        {extra > 0 ? <span className="fcp-more" aria-label={`mais ${extra} pessoas`}>+{extra}</span> : null}
      </div>

      <p className={`fcp-speaking ${main ? 'is-active' : ''}`}>{speakingText}</p>

      <div className="fcp-actions">
        <button
          type="button"
          className={`fcp-icon-btn ${isMuted ? 'is-off' : ''}`}
          onClick={onToggleMute}
          aria-label={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
          aria-pressed={isMuted}
          title={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
        >
          {isMuted ? <MicOffIcon style={{ width: 16, height: 16 }} /> : <MicIcon style={{ width: 16, height: 16 }} />}
        </button>
        <button
          type="button"
          className={`fcp-icon-btn ${isDeafened ? 'is-off' : ''}`}
          onClick={onToggleDeafen}
          aria-label={isDeafened ? 'Voltar a ouvir a chamada' : 'Parar de ouvir a chamada'}
          aria-pressed={isDeafened}
          title={isDeafened ? 'Voltar a ouvir' : 'Ensurdecer'}
        >
          {isDeafened ? <HeadphonesOffIcon style={{ width: 16, height: 16 }} /> : <HeadphonesIcon style={{ width: 16, height: 16 }} />}
        </button>
        <button type="button" className="fcp-return-btn" onClick={onReturn}>
          Voltar à chamada
        </button>
        <button type="button" className="fcp-icon-btn is-leave" onClick={onLeave} aria-label="Sair da chamada" title="Sair da chamada">
          <PhoneOffIcon style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </section>
  )
}
