import type { ReactNode } from 'react'
import { AvatarDecoration } from '../AvatarDecoration'
import { GameLogo } from '../GameLogos'
import { formatGameDuration } from '../../lib/formatters'
import {
  SparklesIcon,
  SettingsIcon,
  CheckIcon,
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
  return (
    <div className={`sidebar-profile-footer${call ? ' has-call' : ''}${showStatusMenu ? ' status-open' : ''}`}>
      {call && <ProfileCallPopover call={call} presenceStatus={presenceStatus} onChangeStatus={updatePresenceStatus} />}
      <div className="profile-footer-card">
        <div className="profile-footer-top-row">
          <div 
            className="profile-footer-info" 
            onClick={() => setShowStatusMenu?.(!showStatusMenu)} 
            title="Alterar Status de Presença"
            style={{ cursor: 'pointer' }}
            tabIndex={call ? 0 : undefined}
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
                <span className="profile-footer-sub-status in-call" title={`Na chamada · ${call.channelName}`}>
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
            {showStatusMenu && (
              <div className="status-picker-popover" onClick={(e) => e.stopPropagation()}>
                <span className="status-picker-heading">Definir status</span>
                {([
                  ['online', 'Online', 'Disponível'],
                  ['idle', 'Ausente', 'Inativo'],
                  ['dnd', 'Não perturbe', 'Silenciar'],
                  ['invisible', 'Invisível', 'Aparecer offline']
                ] as const).map(([value, label, sub]) => (
                  <button
                    key={value}
                    type="button"
                    className={`status-picker-option ${value}${presenceStatus === value ? ' selected' : ''}`}
                    onClick={() => { updatePresenceStatus(value); setShowStatusMenu?.(false); }}
                  >
                    <span className="status-dot-bullet">
                      <StatusGlyph status={value} size={16} withGlow={presenceStatus === value} />
                    </span>
                    <div className="status-meta">
                      <strong>{label}</strong>
                      <span>{sub}</span>
                    </div>
                    {presenceStatus === value && <CheckIcon className="status-picker-check" />}
                  </button>
                ))}
              </div>
            )}
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

/** Painel que sobe sobre o rodapé quando o mouse (ou o teclado) chega nele: mutar, silenciar e sair da chamada. */
function ProfileCallPopover({
  call,
  presenceStatus,
  onChangeStatus
}: {
  call: FooterCallControls
  presenceStatus: string
  onChangeStatus: (status: any) => void
}) {
  const statusOptions = [
    ['online', 'Online'],
    ['idle', 'Ausente'],
    ['dnd', 'Não perturbe'],
    ['invisible', 'Invisível']
  ] as const
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
            <strong title={call.channelName}>{call.channelName}</strong>
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

        {/* Na chamada o rodapé mostra "Na chamada · sala" no lugar do status; este seletor deixa trocar o status sem sair dela */}
        <div className="profile-call-status" role="radiogroup" aria-label="Status de presença">
          <div className="profile-call-status-options">
            {statusOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={presenceStatus === value}
                className={`profile-call-status-btn ${value}${presenceStatus === value ? ' selected' : ''}`}
                title={label}
                onClick={() => onChangeStatus(value)}
              >
                <StatusGlyph status={value} size={16} />
              </button>
            ))}
          </div>
          <span className="profile-call-status-current">
            {statusOptions.find(([value]) => value === presenceStatus)?.[1] ?? 'Online'}
          </span>
        </div>

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
