import { AvatarDecoration } from '../AvatarDecoration'
import { GameLogo } from '../GameLogos'
import { formatGameDuration } from '../../lib/formatters'
import { SparklesIcon, SettingsIcon } from '../icons'

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
  avatarDecoration
}: UnifiedUserProfileFooterProps) {
  return (
    <div className="sidebar-profile-footer">
      <div className="profile-footer-card">
        <div className="profile-footer-top-row">
          <div 
            className="profile-footer-info" 
            onClick={() => setShowStatusMenu?.(!showStatusMenu)} 
            title="Alterar Status de Presença"
            style={{ cursor: 'pointer' }}
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
              <span className="profile-footer-sub-status">
                {presenceStatus === 'online' && 'Online'}
                {presenceStatus === 'idle' && 'Ausente'}
                {presenceStatus === 'dnd' && 'Não Perturbar'}
                {presenceStatus === 'invisible' && 'Invisível'}
              </span>
            </div>
            {showStatusMenu && (
              <div className="status-picker-popover" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('online'); setShowStatusMenu?.(false); }}>
                  <span className="status-dot-bullet online" />
                  <div className="status-meta">
                    <strong>Online</strong>
                    <span>Disponível</span>
                  </div>
                </button>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('idle'); setShowStatusMenu?.(false); }}>
                  <span className="status-dot-bullet idle" />
                  <div className="status-meta">
                    <strong>Ausente</strong>
                    <span>Inativo</span>
                  </div>
                </button>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('dnd'); setShowStatusMenu?.(false); }}>
                  <span className="status-dot-bullet dnd" />
                  <div className="status-meta">
                    <strong>Não perturbe</strong>
                    <span>Silenciar</span>
                  </div>
                </button>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('invisible'); setShowStatusMenu?.(false); }}>
                  <span className="status-dot-bullet invisible" />
                  <div className="status-meta">
                    <strong>Invisível</strong>
                    <span>Aparecer offline</span>
                  </div>
                </button>
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
