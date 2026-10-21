import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { AvatarDecoration } from '../AvatarDecoration'
import { GameLogo } from '../GameLogos'
import { formatGameDuration } from '../../lib/formatters'
import {
  SparklesIcon,
  SettingsIcon,
  MicIcon,
  MicOffIcon,
  HeadphonesIcon,
  HeadphonesOffIcon,
  PhoneOffIcon,
  SoundboardIcon,
  ScreenIcon
} from '../icons'
import { StatusGlyph } from '../StatusGlyph'

/** Chamada em andamento: o rodapé mostra o estado dela e abre, ao passar o mouse, o painel com os controles. */
export interface FooterCallControls {
  channelName: string
  /** Relógio da chamada (ou qualquer nó) mostrado no cabeçalho do painel */
  elapsed: ReactNode
  isReconnecting: boolean
  /** A pessoa já está olhando a sala da chamada: o painel não oferece "voltar" nem os atalhos que a sala já tem */
  isViewingCall: boolean
  isMuted: boolean
  isDeafened: boolean
  onToggleMute: () => void
  onToggleDeafen: () => void
  onLeave: () => void
  onReturn?: () => void
  onOpenSoundboard?: () => void
  onTogglePiP?: () => void
  isPiPActive?: boolean
  rtcStats?: { ping: number; jitter: number; packetLoss: number } | null
  connectionQuality?: 'good' | 'medium' | 'bad' | 'reconnecting'
  /** Texto do modo "apertar para falar", quando ligado */
  pttLabel?: string | null
  pttActive?: boolean
}

export interface UnifiedUserProfileFooterProps {
  displayName: string
  avatarUrl?: string
  presenceStatus: string
  showStatusMenu?: boolean
  setShowStatusMenu?: (show: any) => void
  updatePresenceStatus: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
  theme?: string
  toggleTheme?: () => void
  onOpenSettings?: () => void
  onOpenWhatsNew?: () => void
  onSignOut?: () => void
  myGamePresence?: { name: string; icon?: string; startedAt?: number } | null
  avatarDecoration?: string | null
  userId?: string
  call?: FooterCallControls | null
}

const STATUS_OPTIONS = [
  ['online', 'Online'],
  ['idle', 'Ausente'],
  ['dnd', 'Não perturbe'],
  ['invisible', 'Invisível']
] as const

export function UnifiedUserProfileFooter({
  displayName,
  avatarUrl,
  presenceStatus,
  showStatusMenu,
  setShowStatusMenu,
  updatePresenceStatus,
  onOpenSettings,
  onOpenWhatsNew,
  myGamePresence,
  avatarDecoration,
  call
}: UnifiedUserProfileFooterProps) {
  const handleSelectStatus = (status: 'online' | 'idle' | 'dnd' | 'invisible') => {
    updatePresenceStatus(status)
    setShowStatusMenu?.(false)
  }

  // O painel da chamada também abre com o mouse em cima e com o foco: fechado pelo clique, ele fica fechado até o
  // mouse sair do rodapé (senão o segundo clique no perfil não fechava nada)
  const [callDismissed, setCallDismissed] = useState(false)
  const handleProfileClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (call && showStatusMenu) {
      setCallDismissed(true)
      event.currentTarget.blur()
    } else {
      setCallDismissed(false)
    }
    setShowStatusMenu?.(!showStatusMenu)
  }

  return (
    <div
      className={`sidebar-profile-footer${call ? ' has-call' : ''}${showStatusMenu ? ' status-open' : ''}${callDismissed ? ' call-dismissed' : ''}`}
      onMouseLeave={() => setCallDismissed(false)}
    >
      {call && (
        <ProfileCallPopover
          call={call}
          presenceStatus={presenceStatus}
          onChangeStatus={handleSelectStatus}
        />
      )}
      {!call && showStatusMenu && (
        <div
          className="profile-status-inline-popover"
          role="dialog"
          aria-label="Status de presença"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="profile-call-card profile-status-only-card">
            <ProfileStatusRow presenceStatus={presenceStatus} onChangeStatus={handleSelectStatus} />
          </div>
        </div>
      )}
      <div className="profile-footer-card">
        <div className="profile-footer-top-row">
          <div
            className="profile-footer-info"
            onClick={handleProfileClick}
            style={{ cursor: 'pointer' }}
            tabIndex={0}
          >
            <div className="profile-footer-avatar-wrap" style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0 }}>
              <div className="profile-footer-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} />
                ) : (
                  displayName.slice(0, 1).toUpperCase()
                )}
              </div>
              {avatarDecoration && avatarDecoration !== 'none' && (
                <AvatarDecoration decorationId={avatarDecoration} />
              )}
              <span className={`profile-status-indicator ${presenceStatus}`} />
            </div>
            <div className="profile-footer-names">
              <span className="profile-footer-display-name">{displayName}</span>
              {call ? (
                <span className="profile-footer-sub-status in-call">
                  <i className={`profile-call-dot${call.isReconnecting ? ' reconnecting' : ''}`} aria-hidden="true" />
                  {call.isReconnecting ? 'Reconectando…' : `Na chamada · ${call.channelName}`}
                </span>
              ) : (
                <span className="profile-footer-sub-status">
                  {presenceStatus === 'online' && 'Online'}
                  {presenceStatus === 'idle' && 'Ausente'}
                  {presenceStatus === 'dnd' && 'Não Perturbar'}
                  {presenceStatus === 'invisible' && 'Invisível'}
                </span>
              )}
            </div>
          </div>

          <div className="profile-footer-actions">
            {onOpenWhatsNew && (
              <button type="button" className="profile-footer-btn" onClick={onOpenWhatsNew} title="Novidades & Versões">
                <SparklesIcon style={{ width: '13px', height: '13px', color: '#facc15' }} />
              </button>
            )}
            {onOpenSettings && (
              <button type="button" className="profile-footer-btn" onClick={onOpenSettings} title="Configurações">
                <SettingsIcon />
              </button>
            )}
          </div>
        </div>

        {myGamePresence && presenceStatus !== 'invisible' && (
          <div className="profile-footer-activity-card" title={`Jogando ${myGamePresence.name}${myGamePresence.startedAt ? ` • ${formatGameDuration(myGamePresence.startedAt)}` : ''}`}>
            <div className="profile-footer-activity-logo">
              <GameLogo gameName={myGamePresence.name} size={22} />
            </div>
            <div className="profile-footer-activity-details">
              <span className="profile-footer-activity-label">JOGANDO</span>
              <span className="profile-footer-activity-gamename">{myGamePresence.name}</span>
              {myGamePresence.startedAt && (
                <span className="profile-footer-activity-elapsed">{formatGameDuration(myGamePresence.startedAt)}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileStatusRow({
  presenceStatus,
  onChangeStatus
}: {
  presenceStatus: string
  onChangeStatus: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
}) {
  return (
    <div className="profile-call-status" role="radiogroup" aria-label="Status de presença">
      <div className="profile-call-status-options">
        {STATUS_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={presenceStatus === value}
            className={`profile-call-status-btn ${value}${presenceStatus === value ? ' selected' : ''}`}
            title={label}
            onClick={() => onChangeStatus(value)}
          >
            <StatusGlyph status={value} size={15} />
          </button>
        ))}
      </div>
      <span className="profile-call-status-current">
        {STATUS_OPTIONS.find(([value]) => value === presenceStatus)?.[1] ?? 'Online'}
      </span>
    </div>
  )
}

/** Painel que sobe sobre o rodapé quando o mouse (ou o teclado) chega nele: mutar, silenciar, status e sair da chamada. */
function ProfileCallPopover({
  call,
  presenceStatus,
  onChangeStatus
}: {
  call: FooterCallControls
  presenceStatus: string
  onChangeStatus: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
}) {
  return (
    <div className="profile-call-popover" role="group" aria-label="Controles da chamada">
      <div className="profile-call-card">
        <button
          type="button"
          className={`profile-call-head${call.isViewingCall ? '' : ' clickable'}`}
          onClick={() => { if (!call.isViewingCall) call.onReturn?.() }}
          disabled={call.isViewingCall}
        >
          <i className={`profile-call-dot${call.isReconnecting ? ' reconnecting' : ''}`} aria-hidden="true" />
          <span className="profile-call-title">
            <strong>{call.channelName}</strong>
            <small>{call.isViewingCall ? 'Você está nesta sala' : 'Voltar à chamada ›'}</small>
          </span>
          <span className="profile-call-elapsed">{call.isReconnecting ? 'Reconectando…' : call.elapsed}</span>
        </button>

        <div className="profile-call-toggles">
          <button
            type="button"
            className={`profile-call-toggle${call.isMuted ? ' is-off' : ''}`}
            aria-pressed={call.isMuted}
            onClick={call.onToggleMute}
            title={call.isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
          >
            {call.isMuted ? <MicOffIcon /> : <MicIcon />}
            <span>{call.isMuted ? 'Mutado' : 'Mutar'}</span>
          </button>
          <button
            type="button"
            className={`profile-call-toggle${call.isDeafened ? ' is-off' : ''}`}
            aria-pressed={call.isDeafened}
            onClick={call.onToggleDeafen}
            title={call.isDeafened ? 'Desensurdecer' : 'Silenciar (ensurdecer)'}
          >
            {call.isDeafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
            <span>{call.isDeafened ? 'Silenciado' : 'Silenciar'}</span>
          </button>
          {call.onOpenSoundboard && (
            <button type="button" className="profile-call-toggle" onClick={call.onOpenSoundboard} title="Soundboard">
              <SoundboardIcon />
              <span>Sons</span>
            </button>
          )}
          {call.onTogglePiP && (
            <button
              type="button"
              className={`profile-call-toggle${call.isPiPActive ? ' is-active' : ''}`}
              aria-pressed={Boolean(call.isPiPActive)}
              onClick={call.onTogglePiP}
              title={call.isPiPActive ? 'Fechar mini player' : 'Abrir mini player flutuante da transmissão'}
            >
              <ScreenIcon />
              <span>Tela</span>
            </button>
          )}
        </div>

        <ProfileStatusRow presenceStatus={presenceStatus} onChangeStatus={onChangeStatus} />

        {call.pttLabel && (
          <div className={`profile-call-ptt${call.pttActive ? ' active' : ''}`}>{call.pttLabel}</div>
        )}

        <button type="button" className="profile-call-leave" onClick={call.onLeave}>
          <PhoneOffIcon />
          <span>Sair da chamada</span>
        </button>
      </div>
    </div>
  )
}

