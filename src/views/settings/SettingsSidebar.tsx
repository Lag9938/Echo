import { memo } from 'react'
import type { Page } from '../../types'
import {
  MicIcon,
  SparklesIcon,
  UserIcon,
  PaletteIcon,
  WindowsIcon,
  ShieldIcon,
  KeyboardIcon
} from '../../components/icons'
import { ColoredBackpackIcon } from '../../components/ColoredIcons'
import { UnifiedUserProfileFooter } from '../../components/sidebar/UnifiedUserProfileFooter'

export type SettingsTab = 'profile' | 'subscription' | 'inventory' | 'audio' | 'keybinds' | 'appearance' | 'windows' | 'changelog' | 'privacy'

export interface SettingsSidebarProps {
  setPage: (page: Page) => void
  activeSettingsTab: SettingsTab
  setActiveSettingsTab: (tab: SettingsTab) => void
  isPremiumUser: boolean
  onSignOut?: () => void
  profileDisplayName: string
  profileAvatarUrl: string
  presenceStatus?: 'online' | 'idle' | 'dnd' | 'invisible'
  showStatusMenu?: boolean
  setShowStatusMenu?: (val: boolean) => void
  updatePresenceStatus?: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
  theme: string
  toggleTheme: () => void
  onOpenWhatsNew?: () => void
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  avatarDecoration?: string | null
}

export const SettingsSidebar = memo(function SettingsSidebar({
  setPage,
  activeSettingsTab,
  setActiveSettingsTab,
  isPremiumUser,
  onSignOut,
  profileDisplayName,
  profileAvatarUrl,
  presenceStatus = 'online',
  showStatusMenu = false,
  setShowStatusMenu,
  updatePresenceStatus,
  theme,
  toggleTheme,
  onOpenWhatsNew,
  myGamePresence,
  avatarDecoration
}: SettingsSidebarProps) {
  return (
    <aside className="settings-sidebar">
      <div className="settings-sidebar-scrollable">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px 8px 14px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Configurações</span>
          <button 
            type="button" 
            onClick={() => setPage('Servidores')} 
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease' }}
            title="Voltar para os espaços"
          >
            ✕
          </button>
        </div>
        <div className="settings-menu">
          <span className="settings-menu-category">Sua Conta</span>
          <button 
            className={`menu-item ${activeSettingsTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('profile')}
          >
            <UserIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
            <span>Meu Perfil</span>
          </button>
          <button 
            className={`menu-item ${activeSettingsTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('subscription')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', flexShrink: 0 }}>
                <defs>
                  <linearGradient id="menuProCrownGrad" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
                <path d="M3 6L6.5 16H17.5L21 6L15.5 11L12 4L8.5 11L3 6Z" fill="url(#menuProCrownGrad)" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="3" cy="6" r="1.5" fill="#fef08a" />
                <circle cx="12" cy="4" r="1.5" fill="#fef08a" />
                <circle cx="21" cy="6" r="1.5" fill="#fef08a" />
                <rect x="6.5" y="17.5" width="11" height="2" rx="1" fill="url(#menuProCrownGrad)" stroke="#f59e0b" strokeWidth="0.8" />
              </svg>
              <span>Assinatura</span>
            </div>
            <span style={{
              fontSize: '9px',
              fontWeight: '800',
              padding: '1px 6px',
              borderRadius: '5px',
              background: isPremiumUser ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              border: isPremiumUser ? '1px solid #10b981' : '1px solid #f59e0b',
              color: isPremiumUser ? '#34d399' : '#fbbf24',
              letterSpacing: '0.04em'
            }}>
              {isPremiumUser ? 'ATIVO' : 'PRO'}
            </span>
          </button>
          <button 
            className={`menu-item ${activeSettingsTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('inventory')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ColoredBackpackIcon size={17} style={{ verticalAlign: 'middle' }} />
              <span>Inventário</span>
            </div>
            <span className="echo-inv-menu-badge">NOVO</span>
          </button>
          <button 
            className={`menu-item ${activeSettingsTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('appearance')}
          >
            <PaletteIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
            <span>Aparência</span>
          </button>

          <span className="settings-menu-category" style={{ marginTop: '8px' }}>Aplicativo & Sistema</span>
          <button 
            className={`menu-item ${activeSettingsTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('audio')}
          >
            <MicIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
            <span>Voz e Áudio</span>
          </button>
          <button 
            className={`menu-item ${activeSettingsTab === 'keybinds' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('keybinds')}
          >
            <KeyboardIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
            <span>Teclas de Atalho</span>
          </button>
          <button 
            className={`menu-item ${activeSettingsTab === 'windows' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('windows')}
          >
            <WindowsIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
            <span>Windows & Overlay</span>
          </button>
          <button 
            className={`menu-item ${activeSettingsTab === 'changelog' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('changelog')}
          >
            <SparklesIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
            <span>Novidades & Versões</span>
          </button>
          <button 
            className={`menu-item ${activeSettingsTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('privacy')}
          >
            <ShieldIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
            <span>Privacidade & Bloqueios</span>
          </button>

          {onSignOut && (
            <button 
              type="button" 
              className="settings-signout-btn" 
              onClick={onSignOut}
              title="Desconectar do Echo"
            >
              <span>Sair da Conta</span>
            </button>
          )}
        </div>
      </div>

      <UnifiedUserProfileFooter
        displayName={profileDisplayName}
        avatarUrl={profileAvatarUrl}
        presenceStatus={presenceStatus}
        showStatusMenu={showStatusMenu}
        setShowStatusMenu={setShowStatusMenu || (() => {})}
        updatePresenceStatus={updatePresenceStatus || (() => {})}
        theme={theme as 'light' | 'dark'}
        toggleTheme={toggleTheme}
        onOpenSettings={() => setPage('Configurações')}
        onOpenWhatsNew={onOpenWhatsNew}
        onSignOut={onSignOut}
        myGamePresence={myGamePresence}
        avatarDecoration={avatarDecoration}
      />
    </aside>
  )
})
