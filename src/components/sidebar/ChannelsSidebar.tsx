import React from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type { VoiceParticipant } from '../../lib/useVoiceChannel'
import type { Space, Channel, Page, RolePermissions } from '../../types'
import { UnifiedUserProfileFooter } from './UnifiedUserProfileFooter'
import { copyToClipboard } from '../../lib/clipboard'
import {
  BellIcon,
  BellOffIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HashtagIcon,
  HeadphonesIcon,
  HeadphonesOffIcon,
  LinkIcon,
  LogOutIcon,
  MegaphoneIcon,
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
  PlusIcon,
  RecordCallIcon,
  ScreenIcon,
  SearchIcon,
  SettingsIcon,
  SoundboardIcon,
  UserPlusIcon,
  UsersIcon,
  VolumeIcon
} from '../icons'

export interface ChannelsSidebarProps {
  spaces: Space[]
  expandedSpace: string | null
  user: User
  profileDisplayName: string
  profileAvatarUrl: string
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  showStatusMenu: boolean
  setShowStatusMenu: (val: boolean) => void
  updatePresenceStatus: (val: 'online' | 'idle' | 'dnd' | 'invisible') => void
  theme: string
  toggleTheme: () => void
  setPage: (page: Page) => void
  setShowWhatsNewModal: (val: boolean) => void
  onSignOut: () => void
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  avatarDecoration?: string | null
  setAddSpaceModalTab: (tab: 'options' | 'create' | 'join') => void
  setShowAddSpaceModal: (val: boolean) => void
  showServerDropdown: boolean
  setShowServerDropdown: React.Dispatch<React.SetStateAction<boolean>>
  openSpaceSettings: (space: Space) => void
  setChannelForInvite: (val: { channel: Channel; space: Space } | null) => void
  setSpaceForAddMembers: (space: Space) => void
  showNewChannel: string | null
  setShowNewChannel: (spaceId: string | null) => void
  newChannelName: string
  setNewChannelName: (name: string) => void
  newChannelType: 'text' | 'voice'
  setNewChannelType: (type: 'text' | 'voice') => void
  newChannelCategory: string
  setNewChannelCategory: (cat: string) => void
  createChannel: (e: FormEvent, spaceId: string) => void
  mutedSpaces: Set<string>
  toggleMuteSpace: (spaceId: string) => void
  handleLeaveSpace: (space: Space) => void
  channelSearchQuery: string
  setChannelSearchQuery: (q: string) => void
  channelSearchInputRef?: React.RefObject<HTMLInputElement | null>
  collapsedCategories: Set<string>
  toggleCategoryCollapse: (spaceId: string, category: string) => void
  spaceChannels: Record<string, Channel[]>
  unreadChannels: Set<string>
  selectedChannel: Channel | null
  setSelectedChannel: (ch: Channel | null) => void
  spaceVoiceUsers: Record<string, any[]>
  activeVoiceChannelId: string | null
  participants: VoiceParticipant[]
  handleJoinVoice: (channelId: string, spaceId: string) => void
  handleLeaveVoice: () => void
  isPttMode: boolean
  pttKey: string
  isPttActive: boolean
  isVoiceReconnecting: boolean
  activeVoiceChannel?: Channel | null
  currentSpace: Space | null
  rtcStats?: any
  isMuted: boolean
  handleToggleMute: () => void
  isDeafened: boolean
  handleToggleDeafen: () => void
  setShowSoundboardModal: (val: boolean) => void
  isRecordingCall: boolean
  startCallRecording: () => void
  stopCallRecording: () => void
  recordingDuration: number
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  setVolumeControlUser: (user: any) => void
  spaceMembers: any[]
  isConnected: boolean
  showToast: (title: string, message: string, type?: any) => void
}

export function ChannelsSidebar({
  spaces,
  expandedSpace,
  user,
  profileDisplayName,
  profileAvatarUrl,
  presenceStatus,
  showStatusMenu,
  setShowStatusMenu,
  updatePresenceStatus,
  theme,
  toggleTheme,
  setPage,
  setShowWhatsNewModal,
  onSignOut,
  myGamePresence,
  avatarDecoration,
  setAddSpaceModalTab,
  setShowAddSpaceModal,
  showServerDropdown,
  setShowServerDropdown,
  openSpaceSettings,
  setChannelForInvite,
  setSpaceForAddMembers,
  showNewChannel,
  setShowNewChannel,
  newChannelName,
  setNewChannelName,
  newChannelType,
  setNewChannelType,
  newChannelCategory,
  setNewChannelCategory,
  createChannel,
  mutedSpaces,
  toggleMuteSpace,
  handleLeaveSpace,
  channelSearchQuery,
  setChannelSearchQuery,
  channelSearchInputRef,
  collapsedCategories,
  toggleCategoryCollapse,
  spaceChannels,
  unreadChannels,
  selectedChannel,
  setSelectedChannel,
  spaceVoiceUsers,
  activeVoiceChannelId,
  participants,
  handleJoinVoice,
  handleLeaveVoice,
  isPttMode,
  pttKey,
  isPttActive,
  isVoiceReconnecting,
  activeVoiceChannel,
  currentSpace,
  rtcStats,
  isMuted,
  handleToggleMute,
  isDeafened,
  handleToggleDeafen,
  setShowSoundboardModal,
  isRecordingCall,
  startCallRecording,
  stopCallRecording,
  recordingDuration,
  canUserDo,
  setVolumeControlUser,
  spaceMembers,
  isConnected,
  showToast
}: ChannelsSidebarProps) {
const activeSpace = spaces.find(s => s.id === expandedSpace) || spaces[0] || null

          if (!activeSpace) {
            return (
              <aside className="sidebar channels-sidebar channels-sidebar-empty">
                <div className="empty-servers-prompt">
                  <div className="empty-servers-icon">
                    <UsersIcon style={{ width: '40px', height: '40px', color: 'var(--text-muted)', opacity: 0.6 }} />
                  </div>
                  <h3>Nenhum espaço encontrado</h3>
                  <p>Crie sua própria comunidade gamer ou explore espaços públicos.</p>
                  <button 
                    type="button" 
                    className="empty-create-server-btn"
                    onClick={() => { setAddSpaceModalTab('options'); setShowAddSpaceModal(true) }}
                  >
                    ＋ Criar um Espaço
                  </button>
                </div>
                <UnifiedUserProfileFooter
                  displayName={profileDisplayName}
                  avatarUrl={profileAvatarUrl}
                  presenceStatus={presenceStatus}
                  showStatusMenu={showStatusMenu}
                  setShowStatusMenu={setShowStatusMenu}
                  updatePresenceStatus={updatePresenceStatus}
                  theme={theme}
                  toggleTheme={toggleTheme}
                  onOpenSettings={() => setPage('Configurações')}
                  onOpenWhatsNew={() => setShowWhatsNewModal(true)}
                  onSignOut={onSignOut}
                  myGamePresence={myGamePresence}
                  avatarDecoration={avatarDecoration}
                />
              </aside>
            )
          }

          const channels = spaceChannels[activeSpace.id] ?? []
          const filteredChannels = channels.filter(ch => !channelSearchQuery.trim() || ch.name.toLowerCase().includes(channelSearchQuery.toLowerCase()))

          // Grouping channels
          const categoriesMap: Record<string, Channel[]> = {}
          const uncategorizedText: Channel[] = []
          const uncategorizedVoice: Channel[] = []

          filteredChannels.forEach(ch => {
            if (ch.category && ch.category.trim()) {
              const cat = ch.category.trim()
              if (!categoriesMap[cat]) categoriesMap[cat] = []
              categoriesMap[cat].push(ch)
            } else if (ch.type === 'text') {
              uncategorizedText.push(ch)
            } else {
              uncategorizedVoice.push(ch)
            }
          })

          const categoryEntries = Object.entries(categoriesMap)

          const renderChannelNode = (ch: Channel) => {
            if (ch.type === 'text') {
              return (
                <button 
                  key={ch.id} 
                  type="button"
                  className={`channel-item ${selectedChannel?.id === ch.id ? 'active' : ''} ${unreadChannels.has(ch.id) ? 'unread' : ''}`} 
                  onClick={() => setSelectedChannel(ch)}
                >
                  <span className="ch-icon">{ch.is_announcement ? <MegaphoneIcon style={{ color: 'var(--accent-color)' }} /> : <HashtagIcon />}</span>
                  <span className="channel-item-name">{ch.name}</span>
                  {ch.is_announcement && <span className="channel-badge-pill">Avisos</span>}
                  {unreadChannels.has(ch.id) && <span className="channel-unread-dot" />}
                  <span
                    className="channel-action-btn invite-btn"
                    title={`Convidar amigos para #${ch.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setChannelForInvite({ channel: ch, space: activeSpace })
                    }}
                  >
                    <UserPlusIcon style={{ width: '13px', height: '13px' }} />
                  </span>
                </button>
              )
            }

            const isActive = activeVoiceChannelId === ch.id
            let channelVoiceUsers: VoiceParticipant[]
            if (isActive) {
              const map = new Map<string, VoiceParticipant>()
              participants.forEach(p => map.set(p.userId, p))
              const spUsers = spaceVoiceUsers[ch.id] || []
              spUsers.forEach(p => {
                if (!map.has(p.userId)) map.set(p.userId, p)
              })
              channelVoiceUsers = Array.from(map.values())
            } else {
              channelVoiceUsers = (spaceVoiceUsers[ch.id] || []).filter(u => !user?.id || u.userId !== user.id)
            }

            return (
              <div key={ch.id} className="voice-channel-node">
                <button 
                  type="button"
                  className={`channel-item voice-item ${selectedChannel?.id === ch.id ? 'active' : ''} ${isActive ? 'in-voice' : ''}`} 
                  onClick={() => {
                    setSelectedChannel(ch)
                    if (activeVoiceChannelId !== ch.id || !isConnected) {
                      handleJoinVoice(ch.id, ch.space_id)
                    }
                  }}
                >
                  <span className="ch-icon"><VolumeIcon /></span>
                  <span className="channel-item-name">{ch.name}</span>
                  {channelVoiceUsers.some(p => p.screenStream && p.screenStream.getVideoTracks().length > 0) && (
                    <span className="channel-live-badge" title="Transmissão ao vivo em andamento">
                      ● AO VIVO
                    </span>
                  )}
                  {ch.user_limit && ch.user_limit > 0 ? (
                    <span className="voice-channel-limit-badge">
                      {channelVoiceUsers.length}/{ch.user_limit}
                    </span>
                  ) : channelVoiceUsers.length > 0 ? (
                    <span className="voice-channel-limit-badge">
                      {channelVoiceUsers.length}
                    </span>
                  ) : null}
                  <span
                    className="channel-action-btn invite-btn"
                    title={`Convidar amigos para a chamada ${ch.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setChannelForInvite({ channel: ch, space: activeSpace })
                    }}
                  >
                    <UserPlusIcon style={{ width: '13px', height: '13px' }} />
                  </span>
                </button>
                {channelVoiceUsers.length > 0 && (
                  <div className="sidebar-voice-users">
                    {channelVoiceUsers.map(p => (
                      <div 
                        key={p.userId} 
                        className={`sidebar-voice-user ${p.isSpeaking ? 'speaking' : ''}`}
                        onClick={() => {
                          if (isActive && p.userId !== user.id) {
                            setVolumeControlUser(p)
                          }
                        }}
                        style={{ cursor: (isActive && p.userId !== user.id) ? 'pointer' : 'default' }}
                        title={(isActive && p.userId !== user.id) ? "Ajustar volume de áudio" : p.displayName}
                      >
                        <div className={`sidebar-voice-avatar ${p.isSpeaking ? 'speaking-wave' : ''}`}>
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.displayName} className="sidebar-avatar-img" />
                          ) : (
                            p.displayName.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <span className="sidebar-voice-name">{p.displayName}</span>
                        <div className="sidebar-voice-user-icons">
                          {p.screenStream && p.screenStream.getVideoTracks().length > 0 && (
                            <span title="Transmitindo tela" style={{ color: '#ef4444', display: 'inline-flex' }}>
                              <ScreenIcon style={{ width: '13px', height: '13px' }} />
                            </span>
                          )}
                          {p.isMuted && (
                            <span title="Microfone Silenciado" style={{ color: '#e0554c', display: 'inline-flex', alignItems: 'center' }}>
                              <MicOffIcon style={{ width: '13px', height: '13px' }} />
                            </span>
                          )}
                          {p.isDeafened && (
                            <span title="Áudio Silenciado (Ensurdecido)" style={{ color: '#e0554c', display: 'inline-flex', alignItems: 'center' }}>
                              <HeadphonesOffIcon style={{ width: '13px', height: '13px' }} />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <aside className="sidebar channels-sidebar">
              {/* Server Header Card with Dropdown Menu */}
              <div 
                className="server-header-card" 
                onClick={() => setShowServerDropdown(prev => !prev)}
                style={{
                  background: activeSpace.banner_url ? `url(${activeSpace.banner_url}) center/cover` : undefined
                }}
              >
                <div className="server-header-card-content" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                  <div className="server-avatar-squircle">
                    {activeSpace.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="server-header-info" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 className="server-title" title={activeSpace.name} style={{ margin: 0, fontSize: '15px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeSpace.name}
                    </h3>
                    {activeSpace.creator_id === user.id && (
                      <span className="server-crown-badge" title="Você é o Dono do Espaço" style={{ flexShrink: 0 }}>👑</span>
                    )}
                  </div>
                  <span className={`server-dropdown-chevron ${showServerDropdown ? 'open' : ''}`} style={{ transition: 'transform 0.2s ease', transform: showServerDropdown ? 'rotate(180deg)' : 'none', color: 'var(--text-muted)' }}>▾</span>
                </div>

                {/* Echo Server Command Hub */}
                {showServerDropdown && (
                  <div className="server-dropdown-menu" onClick={e => e.stopPropagation()}>
                    <div className="server-hub-banner">
                      <div className="server-hub-title-row">
                        <span className="server-hub-title">{activeSpace.name}</span>
                        {activeSpace.creator_id === user.id && (
                          <span className="server-owner-chip">👑 Dono</span>
                        )}
                      </div>
                      <div className="server-hub-meta-stats">
                        <span className="server-stat-chip channels" title={`${channels.length} canais neste espaço`}>
                          <HashtagIcon style={{ width: '12px', height: '12px' }} />
                          <span><strong>{channels.length}</strong> canais</span>
                        </span>
                        <span className="server-stat-chip members" title={`${spaceMembers.length} membros neste espaço`}>
                          <UsersIcon style={{ width: '12px', height: '12px' }} />
                          <span><strong>{spaceMembers.length}</strong> membros</span>
                        </span>
                      </div>
                    </div>

                    <button 
                      type="button"
                      className="server-dropdown-item" 
                      onClick={() => { setShowServerDropdown(false); openSpaceSettings(activeSpace); }}
                    >
                      <SettingsIcon style={{ width: '15px', height: '15px', color: '#94a3b8' }} />
                      <span>Configurações do Espaço</span>
                    </button>
                    <button 
                      type="button"
                      className="server-dropdown-item" 
                      onClick={() => {
                        setShowServerDropdown(false)
                        setSpaceForAddMembers(activeSpace)
                      }}
                      style={{ color: 'var(--accent-color, #00f2fe)', fontWeight: 600 }}
                    >
                      <UserPlusIcon style={{ width: '15px', height: '15px', color: 'var(--accent-color, #00f2fe)' }} />
                      <span>Convidar Amigos / Adicionar Membros</span>
                    </button>
                    <button 
                      type="button"
                      className="server-dropdown-item" 
                      onClick={() => { setShowServerDropdown(false); setShowNewChannel(activeSpace.id); setNewChannelCategory(''); }}
                    >
                      <PlusIcon style={{ width: '15px', height: '15px', color: '#38bdf8' }} />
                      <span>Novo Canal</span>
                    </button>
                    <button 
                      type="button"
                      className="server-dropdown-item" 
                      onClick={() => {
                        setShowServerDropdown(false)
                        const inviteLink = `echo://invite/${activeSpace.id}`
                        copyToClipboard(inviteLink)
                        showToast("Link Copiado!", `Link de convite do espaço "${activeSpace.name}" copiado para a área de transferência.`, 'info')
                      }}
                    >
                      <LinkIcon style={{ width: '15px', height: '15px', color: '#10b981' }} />
                      <span>Compartilhar Link de Convite</span>
                    </button>
                    <div className="server-dropdown-divider" />
                    <button 
                      type="button"
                      className="server-dropdown-item" 
                      onClick={() => { setShowServerDropdown(false); toggleMuteSpace(activeSpace.id); }}
                    >
                      {mutedSpaces.has(activeSpace.id) ? <BellIcon /> : <BellOffIcon />}
                      <span>{mutedSpaces.has(activeSpace.id) ? 'Ativar Notificações' : 'Silenciar Espaço'}</span>
                    </button>
                    {activeSpace.creator_id !== user.id && (
                      <button 
                        type="button"
                        className="server-dropdown-item danger" 
                        onClick={() => { setShowServerDropdown(false); handleLeaveSpace(activeSpace); }}
                      >
                        <LogOutIcon />
                        <span>Sair do Espaço</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Channel Search Input */}
              <div className="channels-search-wrap">
                <div className="channels-search-box" onClick={() => channelSearchInputRef?.current?.focus()}>
                  <span className="channels-search-icon"><SearchIcon style={{ width: '13px', height: '13px' }} /></span>
                  <input
                    ref={channelSearchInputRef}
                    type="text"
                    placeholder="Buscar canais... (Ctrl+K)"
                    value={channelSearchQuery}
                    onChange={e => setChannelSearchQuery(e.target.value)}
                    className="channels-search-input"
                  />
                  {channelSearchQuery && (
                    <button 
                      type="button"
                      className="channels-search-clear" 
                      onClick={() => setChannelSearchQuery('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="sidebar-scrollable">
                <div className="channels-tree">
                  {uncategorizedText.length > 0 && (
                    <div className="channel-group">
                      <div className="channel-category-header-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 4px 10px' }}>
                        <span className="channel-group-label" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.6px' }}>CANAIS DE TEXTO</span>
                        {currentSpace && (canUserDo(currentSpace.id, user.id, 'manageChannels') || currentSpace.creator_id === user.id) && (
                          <button 
                            type="button" 
                            onClick={() => { setShowNewChannel(activeSpace.id); setNewChannelCategory(''); }} 
                            title="Criar canal de texto" 
                            className="category-add-channel-btn"
                          >
                            ＋
                          </button>
                        )}
                      </div>
                      {uncategorizedText.map(renderChannelNode)}
                    </div>
                  )}

                  {uncategorizedVoice.length > 0 && (
                    <div className="channel-group">
                      <div className="channel-category-header-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 4px 10px' }}>
                        <span className="channel-group-label" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.6px' }}>CANAIS DE VOZ</span>
                        {currentSpace && (canUserDo(currentSpace.id, user.id, 'manageChannels') || currentSpace.creator_id === user.id) && (
                          <button 
                            type="button" 
                            onClick={() => { setShowNewChannel(activeSpace.id); setNewChannelCategory(''); }} 
                            title="Criar canal de voz" 
                            className="category-add-channel-btn"
                          >
                            ＋
                          </button>
                        )}
                      </div>
                      {uncategorizedVoice.map(renderChannelNode)}
                    </div>
                  )}

                  {/* Categorias com botão + integrado */}
                  {categoryEntries.map(([catName, catChannels]) => {
                    const isCatCollapsed = collapsedCategories.has(`${activeSpace.id}::${catName}`)
                    return (
                      <div key={catName} className="channel-category-group">
                        <div className="channel-category-header-wrap">
                          <button 
                            type="button" 
                            className="channel-category-header" 
                            onClick={() => toggleCategoryCollapse(activeSpace.id, catName)}
                          >
                            <span className="category-chevron">
                              {isCatCollapsed ? <ChevronRightIcon style={{ width: '11px', height: '11px' }} /> : <ChevronDownIcon style={{ width: '11px', height: '11px' }} />}
                            </span>
                            <span className="category-name">{catName.toUpperCase()}</span>
                          </button>
                          <button
                            type="button"
                            className="category-add-channel-btn"
                            title={`Criar canal em ${catName}`}
                            onClick={() => {
                              setShowNewChannel(activeSpace.id)
                              setNewChannelCategory(catName)
                            }}
                          >
                            ＋
                          </button>
                        </div>
                        {!isCatCollapsed && (
                          <div className="category-channels-list">
                            {catChannels.map(renderChannelNode)}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {filteredChannels.length === 0 && channelSearchQuery && (
                    <div className="channels-search-empty">
                      Nenhum canal encontrado para "{channelSearchQuery}"
                    </div>
                  )}

                  <button className="add-channel-btn" onClick={() => { setShowNewChannel(activeSpace.id); setNewChannelCategory(''); }}>
                    <PlusIcon />
                    <span>Novo Canal</span>
                  </button>
                </div>

                {/* Echo Channel Studio Modal */}
                {showNewChannel === activeSpace.id && (
                  <div className="echo-channel-modal-overlay" onClick={() => { setShowNewChannel(null); setNewChannelName(''); setNewChannelCategory(''); }}>
                    <div className="echo-channel-modal" onClick={e => e.stopPropagation()}>
                      <div className="echo-channel-modal-header">
                        <h3 className="echo-channel-modal-title">
                          <span>Criar Canal</span>
                          {newChannelCategory && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>em {newChannelCategory}</span>}
                        </h3>
                        <button 
                          type="button" 
                          className="echo-channel-modal-close" 
                          onClick={() => { setShowNewChannel(null); setNewChannelName(''); setNewChannelCategory(''); }}
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={(e) => createChannel(e, activeSpace.id)}>
                        <div className="echo-channel-modal-body">
                          <div>
                            <div className="echo-ch-section-label">Tipo de Canal</div>
                            <div className="echo-ch-type-grid">
                              <div 
                                className={`echo-ch-type-card ${newChannelType === 'text' ? 'active' : ''}`}
                                onClick={() => setNewChannelType('text')}
                              >
                                <div className="echo-ch-type-card-header">
                                  <HashtagIcon />
                                  <span>Texto</span>
                                </div>
                                <div className="echo-ch-type-card-desc">
                                  Envie mensagens, imagens, figurinhas e compartilhe links.
                                </div>
                              </div>

                              <div 
                                className={`echo-ch-type-card ${newChannelType === 'voice' ? 'active' : ''}`}
                                onClick={() => setNewChannelType('voice')}
                              >
                                <div className="echo-ch-type-card-header">
                                  <VolumeIcon />
                                  <span>Voz & Vídeo</span>
                                </div>
                                <div className="echo-ch-type-card-desc">
                                  Converse em tempo real com baixa latência e transmissão.
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="echo-ch-section-label">Nome do Canal</div>
                            <div className="echo-ch-input-wrapper">
                              <span className="echo-ch-input-prefix">
                                {newChannelType === 'text' ? '#' : '🔊'}
                              </span>
                              <input 
                                className="echo-ch-input"
                                value={newChannelName} 
                                onChange={e => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                                placeholder={newChannelType === 'text' ? "ex: geral, novidades" : "ex: lounge, squad"} 
                                required 
                                minLength={2} 
                                autoFocus
                              />
                            </div>
                            <div className="echo-ch-suggestions">
                              {(newChannelType === 'text' 
                                ? ['geral', 'jogos', 'clipes', 'anúncios', 'memes'] 
                                : ['lounge', 'squad-1', 'bate-papo', 'músicas', 'duo']
                              ).map(tag => (
                                <button
                                  key={tag}
                                  type="button"
                                  className="echo-ch-suggestion-chip"
                                  onClick={() => setNewChannelName(tag)}
                                >
                                  +{tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="echo-channel-modal-footer">
                          <button 
                            type="button" 
                            className="echo-ch-modal-btn cancel"
                            onClick={() => { setShowNewChannel(null); setNewChannelName(''); setNewChannelCategory(''); }}
                          >
                            Cancelar
                          </button>
                          <button type="submit" className="echo-ch-modal-btn submit">
                            Criar Canal
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Docked Voice Status Panel (Ergonomic 2-row layout) */}
                {activeVoiceChannelId && (
                  <div className="voice-status-panel">
                    <div className="voice-status-header-row">
                      <div className="voice-status-info">
                        <div className="connection-quality-indicator" style={{ position: 'relative', cursor: 'pointer' }}>
                          <div className={`connection-bars ${isVoiceReconnecting ? 'reconnecting' : (rtcStats && rtcStats.ping < 100 ? 'good' : rtcStats && rtcStats.ping < 200 ? 'medium' : 'bad')}`}>
                            <i /><i /><i />
                          </div>
                          
                          {/* Tooltip de Estatísticas RTC */}
                          <div className="connection-stats-tooltip">
                            <strong>Conexão RTC</strong>
                            <div className="stat-row"><span>Latência (Ping):</span> <strong>{rtcStats ? `${rtcStats.ping} ms` : 'Medindo...'}</strong></div>
                            <div className="stat-row"><span>Jitter:</span> <strong>{rtcStats ? `${rtcStats.jitter} ms` : '0 ms'}</strong></div>
                            <div className="stat-row"><span>Perda de Pacotes:</span> <strong>{rtcStats ? `${rtcStats.packetLoss} %` : '0 %'}</strong></div>
                          </div>
                        </div>
                        <div className="voice-status-text">
                          <span className="voice-status-label" style={isVoiceReconnecting ? { color: '#f59e0b', fontWeight: 600 } : undefined}>
                            {isVoiceReconnecting ? 'Reconectando...' : 'Voz conectada'}
                          </span>
                          <span className="voice-status-channel" title={activeVoiceChannel?.name}>{activeVoiceChannel?.name}</span>
                        </div>
                      </div>

                      <button 
                        type="button" 
                        className="voice-disconnect-btn" 
                        onClick={handleLeaveVoice} 
                        title="Desconectar da chamada de voz"
                      >
                        <PhoneOffIcon style={{ width: '12px', height: '12px' }} />
                        <span>Sair</span>
                      </button>
                    </div>

                    {isPttMode && (
                      <div style={{ textAlign: 'center', padding: '4px 8px', background: isPttActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', margin: '4px 0 6px', border: isPttActive ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)', fontSize: '11px', fontWeight: 600, color: isPttActive ? '#10b981' : 'var(--text-secondary)' }}>
                        {isPttActive ? '🟢 Transmitindo Voz' : `PTT: [${pttKey.replace('Key', '')}]`}
                      </div>
                    )}

                    <div className="voice-status-actions-grid">
                      <button className={`voice-action-btn ${isMuted ? 'muted' : ''}`} onClick={handleToggleMute} title={isMuted ? "Desmutar microfone" : "Mutar microfone"}>
                        {isMuted ? <MicOffIcon /> : <MicIcon />}
                      </button>
                      <button className={`voice-action-btn ${isDeafened ? 'muted' : ''}`} onClick={handleToggleDeafen} title={isDeafened ? "Desensurdecer" : "Ensurdecer (Mutar todos)"}>
                        {isDeafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
                      </button>
                      <button className="voice-action-btn" onClick={() => setShowSoundboardModal(true)} title="Soundboard Gamer">
                        <SoundboardIcon />
                      </button>
                      <button className={`voice-action-btn ${isRecordingCall ? 'recording' : ''}`} onClick={isRecordingCall ? stopCallRecording : startCallRecording} title={isRecordingCall ? `Gravando chamada (${recordingDuration}s)` : "Gravar chamada"}>
                        <RecordCallIcon isRecording={isRecordingCall} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Footer */}
              <UnifiedUserProfileFooter
                displayName={profileDisplayName}
                avatarUrl={profileAvatarUrl}
                presenceStatus={presenceStatus}
                showStatusMenu={showStatusMenu}
                setShowStatusMenu={setShowStatusMenu}
                updatePresenceStatus={updatePresenceStatus}
                theme={theme}
                toggleTheme={toggleTheme}
                onOpenSettings={() => setPage('Configurações')}
                onOpenWhatsNew={() => setShowWhatsNewModal(true)}
                onSignOut={onSignOut}
                myGamePresence={myGamePresence}
                avatarDecoration={avatarDecoration}
              />
            </aside>
          )
}
