import { useRef } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type {
  Space,
  Channel,
  ServerRole,
  ServerEmoji,
  ServerAuditLog,
  RolePermissions
} from '../../types'
import {
  getServerGradient,
  getServerInitials
} from '../../lib/formatters'
import {
  FileTextIcon,
  HashtagIcon,
  LinkIcon,
  SettingsIcon,
  ShieldIcon,
  SmileIcon,
  UserMinusIcon,
  UsersIcon
} from '../icons'

import { SpaceOverviewTab, SERVER_BANNER_PRESETS } from './spaceStudio/SpaceOverviewTab'
import { SpaceRolesTab } from './spaceStudio/SpaceRolesTab'
import { SpaceChannelsTab } from './spaceStudio/SpaceChannelsTab'
import { SpaceEmojisTab } from './spaceStudio/SpaceEmojisTab'
import { SpaceMembersTab } from './spaceStudio/SpaceMembersTab'
import { SpaceAuditTab } from './spaceStudio/SpaceAuditTab'
import { SpaceInvitesTab } from './spaceStudio/SpaceInvitesTab'
import { SpaceDangerTab } from './spaceStudio/SpaceDangerTab'

export { SERVER_BANNER_PRESETS }

export interface SpaceStudioModalProps {
  isOpen: boolean
  onClose: () => void
  editingSpace: Space | null
  user: User
  profileDisplayName: string
  displayName?: string
  serverRoles: ServerRole[]
  serverEmojis: ServerEmoji[]
  serverAuditLogs: ServerAuditLog[]
  editingSpaceMembers: any[]
  loadingEditingMembers: boolean
  memberRoleMap: Record<string, string[]>
  spaceChannels: Record<string, Channel[]>
  mutedSpaces: Set<string>
  toggleMuteSpace: (spaceId: string) => void
  activeSpaceTab: 'geral' | 'roles' | 'emojis' | 'channels' | 'members' | 'audit' | 'invites' | 'danger'
  setActiveSpaceTab: (tab: 'geral' | 'roles' | 'emojis' | 'channels' | 'members' | 'audit' | 'invites' | 'danger') => void
  editingSpaceName: string
  setEditingSpaceName: (name: string) => void
  editingSpaceDescription: string
  setEditingSpaceDescription: (desc: string) => void
  editingSpaceIconUrl: string
  setEditingSpaceIconUrl: (url: string) => void
  editingSpaceBannerUrl: string
  setEditingSpaceBannerUrl: (url: string) => void
  editingSpaceBannerTheme: string
  setEditingSpaceBannerTheme: (theme: string) => void
  editingSpaceWelcomeChannelId: string
  setEditingSpaceWelcomeChannelId: (id: string) => void
  uploadingSpaceIcon: boolean
  uploadingSpaceBanner: boolean
  memberSearchQuery: string
  setMemberSearchQuery: (q: string) => void
  selectedRoleId: string | null
  setSelectedRoleId: (id: string | null) => void
  selectedMemberId: string | null
  setSelectedMemberId: (id: string | null) => void
  newEmojiName: string
  setNewEmojiName: (name: string) => void
  uploadingEmoji: boolean
  editingChannelSettingsId: string | null
  setEditingChannelSettingsId: (id: string | null) => void
  setShowNewChannel: (spaceId: string | null) => void
  setNewChannelCategory: (cat: string) => void
  setNewChannelName: (name: string) => void
  setNewChannelTopic: (topic: string) => void
  handleSpaceIconUpload: (file: File) => void
  handleRemoveSpaceIcon: () => void
  handleSpaceBannerUpload: (file: File) => void
  handleRemoveSpaceBanner: () => void
  handleSaveSpaceSettings: (e?: FormEvent) => void
  handleCreateRole: () => void
  handleUpdateRole: (roleId: string, updates: Partial<ServerRole>) => void
  handleDeleteRole: (roleId: string) => void
  moveRole: (roleId: string, direction: 'up' | 'down') => void
  handleCreateEmoji: (file: File, name: string) => void
  handleDeleteEmoji: (emojiId: string) => void
  moveChannel: (channelId: string, direction: 'up' | 'down') => void
  updateChannelSettings: (channelId: string, updates: Partial<Channel>) => void
  renameChannel: (channelId: string, newName: string) => void
  deleteChannel: (channelId: string) => void
  getUserHighestRole: (spaceId: string, userId: string) => ServerRole | null
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  toggleMemberRole: (spaceId: string, targetUserId: string, roleId: string) => void
  handleRoleChange: (memberUserId: string, newRole: 'owner' | 'moderator' | 'member', memberName: string) => void
  handleKickMember: (memberId: string, memberName: string) => void
  handleDeleteSpace: () => void
  loadSpaceEmojis: (spaceId: string) => void
  loadEditingSpaceMembers: (spaceId: string) => void
  showToast: (title: string, message: string, type?: any) => void
}

export function SpaceStudioModal({
  isOpen,
  onClose,
  editingSpace,
  user,
  profileDisplayName,
  displayName,
  serverRoles,
  serverEmojis,
  serverAuditLogs,
  editingSpaceMembers,
  loadingEditingMembers,
  memberRoleMap,
  spaceChannels,
  mutedSpaces,
  toggleMuteSpace,
  activeSpaceTab,
  setActiveSpaceTab,
  editingSpaceName,
  setEditingSpaceName,
  editingSpaceDescription,
  setEditingSpaceDescription,
  editingSpaceIconUrl,
  setEditingSpaceIconUrl,
  editingSpaceBannerUrl,
  setEditingSpaceBannerUrl,
  editingSpaceBannerTheme,
  setEditingSpaceBannerTheme,
  editingSpaceWelcomeChannelId,
  setEditingSpaceWelcomeChannelId,
  uploadingSpaceIcon,
  uploadingSpaceBanner,
  memberSearchQuery,
  setMemberSearchQuery,
  selectedRoleId,
  setSelectedRoleId,
  selectedMemberId,
  setSelectedMemberId,
  newEmojiName,
  setNewEmojiName,
  uploadingEmoji,
  editingChannelSettingsId,
  setEditingChannelSettingsId,
  setShowNewChannel,
  setNewChannelCategory,
  setNewChannelName,
  setNewChannelTopic,
  handleSpaceIconUpload,
  handleRemoveSpaceIcon,
  handleSpaceBannerUpload,
  handleRemoveSpaceBanner,
  handleSaveSpaceSettings,
  handleCreateRole,
  handleUpdateRole,
  handleDeleteRole,
  moveRole,
  handleCreateEmoji,
  handleDeleteEmoji,
  moveChannel,
  updateChannelSettings,
  renameChannel,
  deleteChannel,
  getUserHighestRole,
  canUserDo,
  toggleMemberRole,
  handleRoleChange,
  handleKickMember,
  handleDeleteSpace,
  loadSpaceEmojis,
  loadEditingSpaceMembers,
  showToast
}: SpaceStudioModalProps) {
  const navTrackRef = useRef<HTMLDivElement | null>(null)
  const isDraggingNavRef = useRef(false)
  const navStartXRef = useRef(0)
  const navScrollLeftRef = useRef(0)

  if (!isOpen || !editingSpace) return null

  return (
    <div className="space-studio-overlay">
      <div className="space-studio-container">
        {/* Studio Header: Identity + Close Action */}
        <header className="space-studio-header">
          <div className="space-studio-header-left">
            <div 
              className="space-studio-header-avatar"
              style={{ background: editingSpaceIconUrl ? 'transparent' : getServerGradient(editingSpace.name) }}
            >
              {editingSpaceIconUrl ? (
                <img src={editingSpaceIconUrl} alt={editingSpace.name} />
              ) : (
                getServerInitials(editingSpace.name)
              )}
            </div>
            <div className="space-studio-header-info">
              <div className="space-studio-header-title-row">
                <h2>{editingSpace.name}</h2>
                <span className="space-studio-badge">✦ Espaço Echo</span>
              </div>
              <p className="space-studio-header-sub">Painel de Configurações & Gestão da Comunidade</p>
            </div>
          </div>

          <div className="space-studio-header-right">
            <button 
              type="button" 
              className="space-studio-close-btn-discord"
              onClick={() => onClose()}
              title="Fechar Configurações (ESC)"
            >
              <div className="space-studio-close-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
              <span className="space-studio-close-label">ESC</span>
            </button>
          </div>
        </header>

        {/* Horizontal Segmented Tabs Navigation with Wheel Scroll & Drag-to-Scroll */}
        <div className="space-studio-nav-wrapper">
          <button 
            type="button" 
            className="space-studio-nav-arrow left"
            onClick={() => navTrackRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
            title="Rolar abas para a esquerda"
          >
            ‹
          </button>

          <nav 
            ref={navTrackRef}
            className="space-studio-nav-track"
            onWheel={(e) => {
              if (navTrackRef.current) {
                navTrackRef.current.scrollLeft += e.deltaY
              }
            }}
            onMouseDown={(e) => {
              isDraggingNavRef.current = true
              navStartXRef.current = e.pageX - (navTrackRef.current?.offsetLeft || 0)
              navScrollLeftRef.current = navTrackRef.current?.scrollLeft || 0
            }}
            onMouseMove={(e) => {
              if (!isDraggingNavRef.current || !navTrackRef.current) return
              e.preventDefault()
              const x = e.pageX - (navTrackRef.current.offsetLeft || 0)
              const walk = (x - navStartXRef.current) * 1.5
              navTrackRef.current.scrollLeft = navScrollLeftRef.current - walk
            }}
            onMouseUp={() => {
              isDraggingNavRef.current = false
            }}
            onMouseLeave={() => {
              isDraggingNavRef.current = false
            }}
          >
            <button 
              type="button" 
              className={`space-studio-tab-btn ${activeSpaceTab === 'geral' ? 'active' : ''}`}
              onClick={() => setActiveSpaceTab('geral')}
            >
              <SettingsIcon style={{ width: '15px', height: '15px' }} />
              <span>Identidade & Perfil</span>
            </button>

            <button 
              type="button" 
              className={`space-studio-tab-btn ${activeSpaceTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveSpaceTab('roles')}
            >
              <ShieldIcon style={{ width: '15px', height: '15px' }} />
              <span>Cargos & Acessos</span>
              {serverRoles.length > 0 && <span className="space-studio-tab-badge">{serverRoles.length}</span>}
            </button>

            <button 
              type="button" 
              className={`space-studio-tab-btn ${activeSpaceTab === 'channels' ? 'active' : ''}`}
              onClick={() => setActiveSpaceTab('channels')}
            >
              <HashtagIcon style={{ width: '15px', height: '15px' }} />
              <span>Canais</span>
              <span className="space-studio-tab-badge">{(spaceChannels[editingSpace.id] ?? []).length}</span>
            </button>

            <button 
              type="button" 
              className={`space-studio-tab-btn ${activeSpaceTab === 'emojis' ? 'active' : ''}`}
              onClick={() => {
                setActiveSpaceTab('emojis')
                loadSpaceEmojis(editingSpace.id)
              }}
            >
              <SmileIcon style={{ width: '15px', height: '15px' }} />
              <span>Emojis</span>
              {serverEmojis.length > 0 && <span className="space-studio-tab-badge">{serverEmojis.length}</span>}
            </button>

            <button 
              type="button" 
              className={`space-studio-tab-btn ${activeSpaceTab === 'members' ? 'active' : ''}`}
              onClick={() => {
                setActiveSpaceTab('members')
                loadEditingSpaceMembers(editingSpace.id)
              }}
            >
              <UsersIcon style={{ width: '15px', height: '15px' }} />
              <span>Integrantes</span>
              <span className="space-studio-tab-badge">{editingSpaceMembers.length || 1}</span>
            </button>

            <button 
              type="button" 
              className={`space-studio-tab-btn ${activeSpaceTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveSpaceTab('audit')}
            >
              <FileTextIcon style={{ width: '15px', height: '15px' }} />
              <span>Registro de Ações</span>
            </button>

            <button 
              type="button" 
              className={`space-studio-tab-btn ${activeSpaceTab === 'invites' ? 'active' : ''}`}
              onClick={() => setActiveSpaceTab('invites')}
            >
              <LinkIcon style={{ width: '15px', height: '15px' }} />
              <span>Convites</span>
            </button>

            {editingSpace.creator_id === user.id && (
              <button 
                type="button" 
                className={`space-studio-tab-btn danger ${activeSpaceTab === 'danger' ? 'active' : ''}`}
                onClick={() => setActiveSpaceTab('danger')}
              >
                <UserMinusIcon style={{ width: '15px', height: '15px' }} />
                <span>Encerrar Espaço</span>
              </button>
            )}
          </nav>

          <button 
            type="button" 
            className="space-studio-nav-arrow right"
            onClick={() => navTrackRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
            title="Rolar abas para a direita"
          >
            ›
          </button>
        </div>

        {/* Studio Content Body */}
        <div className="space-studio-content-body">
          {activeSpaceTab === 'geral' && (
            <SpaceOverviewTab
              editingSpace={editingSpace}
              editingSpaceName={editingSpaceName}
              setEditingSpaceName={setEditingSpaceName}
              editingSpaceDescription={editingSpaceDescription}
              setEditingSpaceDescription={setEditingSpaceDescription}
              editingSpaceIconUrl={editingSpaceIconUrl}
              setEditingSpaceIconUrl={setEditingSpaceIconUrl}
              editingSpaceBannerUrl={editingSpaceBannerUrl}
              setEditingSpaceBannerUrl={setEditingSpaceBannerUrl}
              editingSpaceBannerTheme={editingSpaceBannerTheme}
              setEditingSpaceBannerTheme={setEditingSpaceBannerTheme}
              editingSpaceWelcomeChannelId={editingSpaceWelcomeChannelId}
              setEditingSpaceWelcomeChannelId={setEditingSpaceWelcomeChannelId}
              uploadingSpaceIcon={uploadingSpaceIcon}
              uploadingSpaceBanner={uploadingSpaceBanner}
              handleSpaceIconUpload={handleSpaceIconUpload}
              handleRemoveSpaceIcon={handleRemoveSpaceIcon}
              handleSpaceBannerUpload={handleSpaceBannerUpload}
              handleRemoveSpaceBanner={handleRemoveSpaceBanner}
              handleSaveSpaceSettings={handleSaveSpaceSettings}
              spaceChannels={spaceChannels}
              mutedSpaces={mutedSpaces}
              toggleMuteSpace={toggleMuteSpace}
            />
          )}

          {activeSpaceTab === 'roles' && (
            <SpaceRolesTab
              serverRoles={serverRoles}
              selectedRoleId={selectedRoleId}
              setSelectedRoleId={setSelectedRoleId}
              handleCreateRole={handleCreateRole}
              handleUpdateRole={handleUpdateRole}
              handleDeleteRole={handleDeleteRole}
              moveRole={moveRole}
              profileDisplayName={profileDisplayName}
              displayName={displayName}
            />
          )}

          {activeSpaceTab === 'channels' && (
            <SpaceChannelsTab
              editingSpace={editingSpace}
              spaceChannels={spaceChannels}
              serverRoles={serverRoles}
              editingChannelSettingsId={editingChannelSettingsId}
              setEditingChannelSettingsId={setEditingChannelSettingsId}
              setShowNewChannel={setShowNewChannel}
              setNewChannelCategory={setNewChannelCategory}
              setNewChannelName={setNewChannelName}
              setNewChannelTopic={setNewChannelTopic}
              moveChannel={moveChannel}
              deleteChannel={deleteChannel}
              renameChannel={renameChannel}
              updateChannelSettings={updateChannelSettings}
            />
          )}

          {activeSpaceTab === 'emojis' && (
            <SpaceEmojisTab
              newEmojiName={newEmojiName}
              setNewEmojiName={setNewEmojiName}
              handleCreateEmoji={handleCreateEmoji}
              handleDeleteEmoji={handleDeleteEmoji}
              uploadingEmoji={uploadingEmoji}
              showToast={showToast}
              serverEmojis={serverEmojis}
            />
          )}

          {activeSpaceTab === 'members' && (
            <SpaceMembersTab
              editingSpace={editingSpace}
              editingSpaceMembers={editingSpaceMembers}
              loadingEditingMembers={loadingEditingMembers}
              memberSearchQuery={memberSearchQuery}
              setMemberSearchQuery={setMemberSearchQuery}
              selectedMemberId={selectedMemberId}
              setSelectedMemberId={setSelectedMemberId}
              user={user}
              getUserHighestRole={getUserHighestRole}
              memberRoleMap={memberRoleMap}
              serverRoles={serverRoles}
              canUserDo={canUserDo}
              toggleMemberRole={toggleMemberRole}
              handleRoleChange={handleRoleChange}
              handleKickMember={handleKickMember}
            />
          )}

          {activeSpaceTab === 'audit' && (
            <SpaceAuditTab serverAuditLogs={serverAuditLogs} />
          )}

          {activeSpaceTab === 'invites' && (
            <SpaceInvitesTab
              editingSpace={editingSpace}
              showToast={showToast}
            />
          )}

          {activeSpaceTab === 'danger' && editingSpace.creator_id === user.id && (
            <SpaceDangerTab handleDeleteSpace={handleDeleteSpace} />
          )}
        </div>
      </div>
    </div>
  )
}
