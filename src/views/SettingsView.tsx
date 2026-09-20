import { useState, lazy, Suspense } from 'react'
import { WhatsNewModal } from '../components/WhatsNewModal'
const CosmeticsInventory = lazy(() => import('../components/CosmeticsInventory').then(m => ({ default: m.CosmeticsInventory })))
import type { Page } from '../types'
import { SettingsSidebar, type SettingsTab } from './settings/SettingsSidebar'
import { ProfileTab } from './settings/ProfileTab'
import { AppearanceTab } from './settings/AppearanceTab'
import { WindowsTab } from './settings/WindowsTab'
import { AudioVideoTab } from './settings/AudioVideoTab'
import { KeybindsTab } from './settings/KeybindsTab'
import { SubscriptionTab } from './settings/SubscriptionTab'

export interface SettingsViewProps {
  userId: string
  userCreatedAt?: string
  isServerOwner?: boolean
  currentDisplayName: string
  currentAvatarUrl: string
  customStatus: string
  avatarDecoration?: string | null
  profileEffect?: string | null
  avatarFrame?: string
  cardFinish?: 'none' | 'holographic' | 'glass' | 'carbon'
  nameEffect?: string
  onEquipDecoration?: (id: string) => Promise<void> | void
  onEquipProfileEffect?: (id: string) => Promise<void> | void
  onEquipAvatarFrame?: (id: string) => void
  onEquipCardFinish?: (id: string) => void
  onEquipNameEffect?: (id: string) => void
  initialTab?: SettingsTab
  onOpenShop?: (targetTab?: 'decorations' | 'profile_effects' | 'auras' | 'finishes' | 'name_effects') => void
  onProfileUpdate: (name: string, avatar: string, bannerUrl?: string, bannerPreset?: string) => void
  onCustomStatusUpdate: (status: string) => void
  audioInputs: MediaDeviceInfo[]
  audioOutputs: MediaDeviceInfo[]
  selectedInputId: string
  selectedOutputId: string
  onInputDeviceChange: (id: string) => void
  onOutputDeviceChange: (id: string) => void
  audioError: string | null
  onRefreshDevices: () => void
  profileDisplayName: string
  profileAvatarUrl: string
  theme: string
  toggleTheme: () => void
  selectTheme: (themeId: string) => void
  isPremiumUser: boolean
  setPage: (page: Page) => void
  onSignOut: () => void
  presenceStatus?: 'online' | 'idle' | 'dnd' | 'invisible'
  showStatusMenu?: boolean
  setShowStatusMenu?: (val: boolean) => void
  updatePresenceStatus?: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
  onOpenWhatsNew?: () => void
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  noiseSuppressionEnabled: boolean
  echoCancellationEnabled: boolean
  onNoiseSuppressionChange: (val: boolean) => void
  onEchoCancellationChange: (val: boolean) => void
  sfxVolume: number
  onSfxVolumeChange: (val: number) => void
  noiseGateEnabled?: boolean
  noiseGateThreshold?: number
  onNoiseGateEnabledChange?: (val: boolean) => void
  onNoiseGateThresholdChange?: (val: number) => void
  spatialAudioEnabled?: boolean
  onToggleSpatialAudio?: (val: boolean) => void
  onResetAllPans?: () => void
  isAiDenoiseEnabled?: boolean
  onToggleAiDenoise?: (val?: boolean) => void
  customAccentColor?: string
  onCustomAccentColorChange?: (color: string) => void
  chatDensity?: 'cozy' | 'compact'
  onChatDensityChange?: (density: 'cozy' | 'compact') => void
  performanceMode?: boolean
  onPerformanceModeChange?: (val: boolean) => void
  pttModeSetting?: boolean
  onPttModeChange?: (val: boolean) => void
  pttKey?: string
  onPttKeyChange?: (val: string) => void
  onToggleOverlay?: () => void
  muteShortcut?: string
  onMuteShortcutChange?: (key: string) => void
  deafenShortcut?: string
  onDeafenShortcutChange?: (key: string) => void
  aiDenoiseShortcut?: string
  onAiDenoiseShortcutChange?: (key: string) => void
  onSimulateSubscription?: () => void
  onResetSubscription?: () => void
  userEmail?: string
  onSubscriptionSuccess?: () => void
  blockedProfiles?: Array<{ id: string; display_name: string; avatar_url?: string }>
  onUnblockUser?: (targetId: string, targetName: string) => Promise<void> | void
}

export function SettingsView({
  userId,
  userCreatedAt,
  isServerOwner,
  currentDisplayName,
  currentAvatarUrl,
  customStatus,
  avatarDecoration,
  profileEffect,
  avatarFrame,
  cardFinish,
  nameEffect,
  onEquipDecoration,
  onEquipProfileEffect,
  onEquipAvatarFrame,
  onEquipCardFinish,
  onEquipNameEffect,
  initialTab,
  onOpenShop,
  onProfileUpdate,
  onCustomStatusUpdate,
  audioInputs,
  audioOutputs,
  selectedInputId,
  selectedOutputId,
  onInputDeviceChange,
  onOutputDeviceChange,
  audioError,
  onRefreshDevices,
  profileDisplayName,
  profileAvatarUrl,
  theme,
  toggleTheme,
  selectTheme,
  isPremiumUser,
  setPage,
  onSignOut,
  presenceStatus = 'online',
  showStatusMenu = false,
  setShowStatusMenu,
  updatePresenceStatus,
  onOpenWhatsNew,
  myGamePresence,
  noiseSuppressionEnabled,
  echoCancellationEnabled,
  onNoiseSuppressionChange,
  onEchoCancellationChange,
  sfxVolume,
  onSfxVolumeChange,
  noiseGateEnabled = false,
  noiseGateThreshold = -45,
  onNoiseGateEnabledChange = () => {},
  onNoiseGateThresholdChange = () => {},
  spatialAudioEnabled = true,
  onToggleSpatialAudio = () => {},
  onResetAllPans = () => {},
  isAiDenoiseEnabled = false,
  onToggleAiDenoise = () => {},
  customAccentColor = '',
  onCustomAccentColorChange,
  chatDensity = 'cozy',
  onChatDensityChange,
  performanceMode = false,
  onPerformanceModeChange,
  pttModeSetting,
  onPttModeChange,
  pttKey,
  onPttKeyChange,
  onToggleOverlay,
  muteShortcut,
  onMuteShortcutChange,
  deafenShortcut,
  onDeafenShortcutChange,
  aiDenoiseShortcut,
  onAiDenoiseShortcutChange,
  onSimulateSubscription,
  onResetSubscription,
  userEmail,
  onSubscriptionSuccess,
  blockedProfiles = [],
  onUnblockUser
}: SettingsViewProps) {
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>(initialTab || 'profile')

  if (initialTab && initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab)
    setActiveSettingsTab(initialTab)
  }

  return (
    <section className="settings-workspace">
      <SettingsSidebar
        setPage={setPage}
        activeSettingsTab={activeSettingsTab}
        setActiveSettingsTab={setActiveSettingsTab}
        isPremiumUser={isPremiumUser}
        onSignOut={onSignOut}
        profileDisplayName={profileDisplayName}
        profileAvatarUrl={profileAvatarUrl}
        presenceStatus={presenceStatus}
        showStatusMenu={showStatusMenu}
        setShowStatusMenu={setShowStatusMenu}
        updatePresenceStatus={updatePresenceStatus}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenWhatsNew={onOpenWhatsNew}
        myGamePresence={myGamePresence}
        avatarDecoration={avatarDecoration}
      />

      <section className="settings-content">
        {activeSettingsTab === 'profile' && (
          <ProfileTab
            userId={userId}
            userCreatedAt={userCreatedAt}
            isServerOwner={isServerOwner}
            isPremiumUser={isPremiumUser}
            currentDisplayName={currentDisplayName}
            currentAvatarUrl={currentAvatarUrl}
            customStatus={customStatus}
            avatarDecoration={avatarDecoration}
            profileEffect={profileEffect}
            avatarFrame={avatarFrame}
            cardFinish={cardFinish}
            nameEffect={nameEffect}
            onEquipDecoration={onEquipDecoration}
            onEquipProfileEffect={onEquipProfileEffect}
            onEquipAvatarFrame={onEquipAvatarFrame}
            onEquipCardFinish={onEquipCardFinish}
            onEquipNameEffect={onEquipNameEffect}
            onOpenShop={onOpenShop}
            onProfileUpdate={onProfileUpdate}
            onCustomStatusUpdate={onCustomStatusUpdate}
          />
        )}

        {activeSettingsTab === 'inventory' && (
          <div className="settings-container echo-inventory-settings-pane" style={{ maxWidth: '100%', padding: '24px 32px' }}>
            <Suspense fallback={<div className="empty-main"><div className="loader" /><span>Carregando Inventário…</span></div>}>
              <CosmeticsInventory
                userId={userId}
                displayName={profileDisplayName || currentDisplayName}
                avatarUrl={profileAvatarUrl || currentAvatarUrl}
                currentDecoration={avatarDecoration || ''}
                currentProfileEffect={profileEffect || ''}
                currentAvatarFrame={avatarFrame || 'aura-cyan'}
                currentCardFinish={cardFinish || 'none'}
                clanTag={localStorage.getItem(`echo-clan-tag-${userId}`) || ''}
                clanTagColor={localStorage.getItem(`echo-clan-tag-color-${userId}`) || '#00f2fe'}
                bio={localStorage.getItem(`echo-bio-${userId}`) || '🎮 Jogador ativo no Echo • Pronto para squad e clutch.'}
                bannerPreset={localStorage.getItem(`echo-banner-preset-${userId}`) || 'synthwave'}
                bannerCustom={localStorage.getItem(`echo-banner-custom-${userId}`) || ''}
                onEquipDecoration={async (id) => {
                  if (onEquipDecoration) await onEquipDecoration(id)
                }}
                onEquipProfileEffect={async (id) => {
                  if (onEquipProfileEffect) await onEquipProfileEffect(id)
                }}
                onEquipAvatarFrame={(id) => {
                  if (onEquipAvatarFrame) onEquipAvatarFrame(id)
                  localStorage.setItem(`echo-avatar-frame-${userId}`, id)
                }}
                onEquipCardFinish={(id) => {
                  if (onEquipCardFinish) onEquipCardFinish(id)
                  localStorage.setItem(`echo-card-finish-${userId}`, id)
                }}
                currentNameEffect={nameEffect || 'resonance_cyan'}
                onEquipNameEffect={(id) => {
                  if (onEquipNameEffect) onEquipNameEffect(id)
                }}
                onOpenShop={(targetTab) => {
                  if (onOpenShop) onOpenShop(targetTab)
                }}
              />
            </Suspense>
          </div>
        )}

        {activeSettingsTab === 'subscription' && (
          <SubscriptionTab
            isPremiumUser={isPremiumUser}
            onSimulateSubscription={onSimulateSubscription}
            onResetSubscription={onResetSubscription}
            userId={userId}
            userEmail={userEmail}
            userName={profileDisplayName || currentDisplayName}
            onSubscriptionSuccess={onSubscriptionSuccess}
          />
        )}

        {activeSettingsTab === 'audio' && (
          <AudioVideoTab
            audioInputs={audioInputs}
            audioOutputs={audioOutputs}
            selectedInputId={selectedInputId}
            selectedOutputId={selectedOutputId}
            onInputDeviceChange={onInputDeviceChange}
            onOutputDeviceChange={onOutputDeviceChange}
            audioError={audioError}
            onRefreshDevices={onRefreshDevices}
            noiseSuppressionEnabled={noiseSuppressionEnabled}
            echoCancellationEnabled={echoCancellationEnabled}
            onNoiseSuppressionChange={onNoiseSuppressionChange}
            onEchoCancellationChange={onEchoCancellationChange}
            sfxVolume={sfxVolume}
            onSfxVolumeChange={onSfxVolumeChange}
            noiseGateEnabled={noiseGateEnabled}
            noiseGateThreshold={noiseGateThreshold}
            onNoiseGateEnabledChange={onNoiseGateEnabledChange}
            onNoiseGateThresholdChange={onNoiseGateThresholdChange}
            spatialAudioEnabled={spatialAudioEnabled}
            onToggleSpatialAudio={onToggleSpatialAudio}
            onResetAllPans={onResetAllPans}
            isAiDenoiseEnabled={isAiDenoiseEnabled}
            onToggleAiDenoise={onToggleAiDenoise}
            pttModeSetting={pttModeSetting}
            onPttModeChange={onPttModeChange}
            pttKey={pttKey}
            onPttKeyChange={onPttKeyChange}
            onToggleOverlay={onToggleOverlay}
            muteShortcut={muteShortcut}
            deafenShortcut={deafenShortcut}
            aiDenoiseShortcut={aiDenoiseShortcut}
            onNavigateToKeybinds={() => setActiveSettingsTab('keybinds')}
          />
        )}

        {activeSettingsTab === 'keybinds' && (
          <KeybindsTab
            pttModeSetting={pttModeSetting}
            onPttModeChange={onPttModeChange}
            pttKey={pttKey}
            onPttKeyChange={onPttKeyChange}
            muteShortcut={muteShortcut}
            onMuteShortcutChange={onMuteShortcutChange}
            deafenShortcut={deafenShortcut}
            onDeafenShortcutChange={onDeafenShortcutChange}
            aiDenoiseShortcut={aiDenoiseShortcut}
            onAiDenoiseShortcutChange={onAiDenoiseShortcutChange}
            onToggleOverlay={onToggleOverlay}
          />
        )}

        {activeSettingsTab === 'appearance' && (
          <AppearanceTab
            theme={theme}
            selectTheme={selectTheme}
            isPremiumUser={isPremiumUser}
            customAccentColor={customAccentColor}
            onCustomAccentColorChange={onCustomAccentColorChange}
            chatDensity={chatDensity}
            onChatDensityChange={onChatDensityChange}
            performanceMode={performanceMode}
            onPerformanceModeChange={onPerformanceModeChange}
          />
        )}

        {activeSettingsTab === 'windows' && (
          <WindowsTab onToggleOverlay={onToggleOverlay} />
        )}

        {activeSettingsTab === 'changelog' && (
          <div className="settings-content-card" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <WhatsNewModal isOpen={true} isEmbedded={true} />
          </div>
        )}

        {activeSettingsTab === 'privacy' && (
          <div className="settings-content-card" style={{ padding: '24px 32px' }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px 0' }}>Privacidade & Bloqueios</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Gerencie os usuários que você bloqueou no Echo. Usuários bloqueados não podem enviar mensagens diretas para você nem interagir no privado.
              </p>
            </div>

            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                Usuários Bloqueados ({blockedProfiles.length})
              </h3>

              {blockedProfiles.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 10,
                  border: '1px solid var(--border-color)',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}>
                  <p style={{ margin: 0, fontSize: 13 }}>Nenhum usuário bloqueado no momento.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {blockedProfiles.map(p => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 8,
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={p.display_name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'var(--bg-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 13
                          }}>
                            {p.display_name?.slice(0, 1)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13.5, display: 'block' }}>
                            {p.display_name}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                            ID: {p.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>

                      {onUnblockUser && (
                        <button
                          type="button"
                          onClick={() => onUnblockUser(p.id, p.display_name)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            background: 'rgba(234, 179, 8, 0.15)',
                            border: '1px solid rgba(234, 179, 8, 0.4)',
                            color: '#facc15',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Desbloquear
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </section>
  )
}
