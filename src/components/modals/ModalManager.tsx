import React, { Suspense, lazy } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type { 
  Space, 
  Channel, 
  FriendshipRequest, 
  SavedMessageItem, 
  Page, 
  ServerRole, 
  ServerAuditLog, 
  ServerEmoji,
  RolePermissions 
} from '../../types'
import { supabase } from '../../lib/supabase'

import { HoveredMemberPopover } from '../sidebar/HoveredMemberPopover'
import { SoundboardToast } from './SoundboardToast'

const AddSpaceModal = lazy(() => import('./AddSpaceModal').then(m => ({ default: m.AddSpaceModal })))
const ScreenPickerModal = lazy(() => import('./ScreenPickerModal').then(m => ({ default: m.ScreenPickerModal })))
const VolumeControlModal = lazy(() => import('./VolumeControlModal').then(m => ({ default: m.VolumeControlModal })))
const ConfirmModal = lazy(() => import('./ConfirmModal').then(m => ({ default: m.ConfirmModal })))
const MemberProfileModalWrapper = lazy(() => import('./MemberProfileModalWrapper').then(m => ({ default: m.MemberProfileModalWrapper })))
const ChannelInviteModal = lazy(() => import('./ChannelInviteModal').then(m => ({ default: m.ChannelInviteModal })))
const SpaceAddMembersModal = lazy(() => import('./SpaceAddMembersModal').then(m => ({ default: m.SpaceAddMembersModal })))
const SoundboardModal = lazy(() => import('./SoundboardModal').then(m => ({ default: m.SoundboardModal })))
const WhatsNewModal = lazy(() => import('../WhatsNewModal').then(m => ({ default: m.WhatsNewModal })))
const SavedMessagesModal = lazy(() => import('./SavedMessagesModal').then(m => ({ default: m.SavedMessagesModal })))
const ImageLightboxModal = lazy(() => import('./ImageLightboxModal').then(m => ({ default: m.ImageLightboxModal })))
const AfkPromptModal = lazy(() => import('./AfkModals').then(m => ({ default: m.AfkPromptModal })))
const AfkDisconnectedModal = lazy(() => import('./AfkModals').then(m => ({ default: m.AfkDisconnectedModal })))
const IncomingCallModal = lazy(() => import('./IncomingCallModal').then(m => ({ default: m.IncomingCallModal })))
const SpaceStudioModal = lazy(() => import('./SpaceStudioModal').then(m => ({ default: m.SpaceStudioModal })))
const CommandPaletteModal = lazy(() => import('./CommandPaletteModal').then(m => ({ default: m.CommandPaletteModal })))

export interface ModalManagerProps {
  user: User
  displayName: string
  profileDisplayName: string
  profileEffect: string
  avatarDecoration: string
  onlineUsers: Set<string>
  participants: any[]
  presenceData: Record<string, any>
  presenceStatus: any
  myGamePresence: any
  spaces: Space[]
  expandedSpace: string | null
  setExpandedSpace: (id: string | null) => void
  selectedChannel: Channel | null
  setSelectedChannel: (c: Channel | null) => void
  spaceChannels: Record<string, Channel[]>
  spaceMembers: any[]
  activeVoiceChannel: Channel | null
  activeVoiceChannelId: string | null
  isMuted: boolean
  isDeafened: boolean
  handleToggleMute: () => void
  handleToggleDeafen: () => void
  handleJoinVoice: (channelId: string, explicitSpaceId?: string) => Promise<void>
  showToast: (title: string, message: string, type?: any) => void
  friendships: FriendshipRequest[]
  sendFriendRequestToUser: (userId: string) => Promise<void>
  acceptFriendRequest: (friendshipId: string) => Promise<void>
  handleOpenDirectChat: (friendId: string) => void
  blockedUserIds: Set<string>
  blockUser: (userId: string, name?: string) => Promise<void>
  unblockUser: (userId: string, name?: string) => Promise<void>
  setPage: (page: Page) => void

  // Add Space
  showAddSpaceModal: boolean
  setShowAddSpaceModal: (show: boolean) => void
  addSpaceModalTab: 'options' | 'create' | 'join'
  setAddSpaceModalTab: (tab: 'options' | 'create' | 'join') => void
  newSpace: string
  setNewSpace: (val: string) => void
  creating: boolean
  createSpace: (e: FormEvent) => Promise<void> | void
  joinSpaceCode: string
  setJoinSpaceCode: (code: string) => void
  joining: boolean
  joinSpace: (e: FormEvent) => Promise<void> | void

  // Screen Picker
  showScreenPicker: boolean
  setShowScreenPicker: (show: boolean) => void
  screenSources: any[]
  setScreenSources: (sources: any[]) => void
  screenPickerTab: 'screens' | 'windows'
  setScreenPickerTab: (tab: 'screens' | 'windows') => void
  selectedPickerSourceId: string | null
  setSelectedPickerSourceId: (id: string | null) => void
  selectScreenSource: (source: any, fps?: number, quality?: string) => Promise<void>
  screenQuality: any
  setScreenQuality: (q: any) => void
  screenFps: any
  setScreenFps: (fps: any) => void
  isPremiumUser: boolean
  setShowSubscriptionModal: (show: boolean) => void

  // Space Studio
  showSpaceSettingsModal: boolean
  setShowSpaceSettingsModal: (show: boolean) => void
  editingSpace: Space | null
  serverRoles: ServerRole[]
  serverEmojis: ServerEmoji[]
  serverAuditLogs: ServerAuditLog[]
  editingSpaceMembers: any[]
  loadingEditingMembers: boolean
  memberRoleMap: Record<string, string[]>
  mutedSpaces: Set<string>
  toggleMuteSpace: (spaceId: string) => void
  activeSpaceTab: any
  setActiveSpaceTab: (tab: any) => void
  editingSpaceName: string
  setEditingSpaceName: (n: string) => void
  editingSpaceDescription: string
  setEditingSpaceDescription: (d: string) => void
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
  setNewEmojiName: (n: string) => void
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
  moveRole: (roleId: string, dir: 'up' | 'down') => void
  handleCreateEmoji: (file: File, name: string) => void
  handleDeleteEmoji: (emojiId: string) => void
  moveChannel: (channelId: string, dir: 'up' | 'down') => void
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

  // Volume Control
  volumeControlUser: any
  setVolumeControlUser: (u: any) => void
  userVolumes: Record<string, number>
  setUserVolumes: (v: Record<string, number>) => void
  userStereoPans: Record<string, number>
  setUserStereoPans: (p: Record<string, number>) => void
  changePeerPan: (userId: string, pan: number) => void
  spatialAudioEnabled: boolean
  setSpatialAudioEnabledState: (enabled: boolean) => void
  handleServerMute: (userId: string) => void
  handleDisconnectParticipant: (userId: string) => void
  handleMoveParticipant: (userId: string, targetChannelId: string, targetChannelName?: string) => void

  // Confirm Modal
  confirmModalConfig: any
  setConfirmModalConfig: (c: any) => void

  // Member Profile & Hover Popover
  inspectedMember: any
  setInspectedMember: (m: any) => void
  hoveredMemberPopover: any
  setHoveredMemberPopover: (h: any) => void
  hoverTimeoutRef: React.MutableRefObject<any>

  // Channel Invite & Space Add Members
  channelForInvite: { channel: Channel; space: Space } | null
  setChannelForInvite: (c: { channel: Channel; space: Space } | null) => void
  socialChannelRef: React.MutableRefObject<any>
  spaceForAddMembers: Space | null
  setSpaceForAddMembers: (s: Space | null) => void
  handleAddMemberToSpace: (spaceId: string, friend: any) => Promise<any>

  // Soundboard
  showSoundboardModal: boolean
  setShowSoundboardModal: (show: boolean) => void
  playSoundboard: (soundId: string) => void
  lastSoundboardEvent: any

  // Whats New
  showWhatsNewModal: boolean
  setShowWhatsNewModal: (show: boolean) => void

  // Saved Messages
  showSavedMessagesModal: boolean
  setShowSavedMessagesModal: (show: boolean) => void
  savedMessages: SavedMessageItem[]
  setSavedMessages: React.Dispatch<React.SetStateAction<SavedMessageItem[]>>
  handleJumpToSavedMessage: (msg: SavedMessageItem) => void

  // AFK Modals
  showAfkPrompt: boolean
  afkCountdown: number
  handleAfkStay: () => void
  showAfkDisconnectedModal: boolean
  setShowAfkDisconnectedModal: (show: boolean) => void
  lastAfkChannelRef: React.MutableRefObject<any>
  lastActivityRef: React.MutableRefObject<number>

  // Direct Call
  incomingCall: any
  acceptIncomingCall: () => void
  rejectIncomingCall: () => void
}

export function ModalManager(props: ModalManagerProps) {
  const {
    user,
    displayName,
    profileDisplayName,
    profileEffect,
    avatarDecoration,
    onlineUsers,
    participants,
    presenceData,
    presenceStatus,
    myGamePresence,
    spaces,
    expandedSpace,
    setExpandedSpace,
    selectedChannel,
    setSelectedChannel,
    spaceChannels,
    spaceMembers,
    activeVoiceChannel,
    activeVoiceChannelId,
    isMuted,
    isDeafened,
    handleToggleMute,
    handleToggleDeafen,
    handleJoinVoice,
    showToast,
    friendships,
    sendFriendRequestToUser,
    acceptFriendRequest,
    handleOpenDirectChat,
    blockedUserIds,
    blockUser,
    unblockUser,
    setPage,

    // Add Space
    showAddSpaceModal,
    setShowAddSpaceModal,
    addSpaceModalTab,
    setAddSpaceModalTab,
    newSpace,
    setNewSpace,
    creating,
    createSpace,
    joinSpaceCode,
    setJoinSpaceCode,
    joining,
    joinSpace,

    // Screen Picker
    showScreenPicker,
    setShowScreenPicker,
    screenSources,
    setScreenSources,
    screenPickerTab,
    setScreenPickerTab,
    selectedPickerSourceId,
    setSelectedPickerSourceId,
    selectScreenSource,
    screenQuality,
    setScreenQuality,
    screenFps,
    setScreenFps,
    isPremiumUser,
    setShowSubscriptionModal,

    // Space Studio
    showSpaceSettingsModal,
    setShowSpaceSettingsModal,
    editingSpace,
    serverRoles,
    serverEmojis,
    serverAuditLogs,
    editingSpaceMembers,
    loadingEditingMembers,
    memberRoleMap,
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

    // Volume Control
    volumeControlUser,
    setVolumeControlUser,
    userVolumes,
    setUserVolumes,
    userStereoPans,
    setUserStereoPans,
    changePeerPan,
    spatialAudioEnabled,
    setSpatialAudioEnabledState,
    handleServerMute,
    handleDisconnectParticipant,
    handleMoveParticipant,

    // Confirm Modal
    confirmModalConfig,
    setConfirmModalConfig,

    // Member Profile & Hover Popover
    inspectedMember,
    setInspectedMember,
    hoveredMemberPopover,
    setHoveredMemberPopover,
    hoverTimeoutRef,

    // Channel Invite & Space Add Members
    channelForInvite,
    setChannelForInvite,
    socialChannelRef,
    spaceForAddMembers,
    setSpaceForAddMembers,
    handleAddMemberToSpace,

    // Soundboard
    showSoundboardModal,
    setShowSoundboardModal,
    playSoundboard,
    lastSoundboardEvent,

    // Whats New
    showWhatsNewModal,
    setShowWhatsNewModal,

    // Saved Messages
    showSavedMessagesModal,
    setShowSavedMessagesModal,
    savedMessages,
    setSavedMessages,
    handleJumpToSavedMessage,

    // AFK
    showAfkPrompt,
    afkCountdown,
    handleAfkStay,
    showAfkDisconnectedModal,
    setShowAfkDisconnectedModal,
    lastAfkChannelRef,
    lastActivityRef,

    // Direct Call
    incomingCall,
    acceptIncomingCall,
    rejectIncomingCall
  } = props

  return (
    <Suspense fallback={null}>
      {/* Create/Join Space Modal */}
      <AddSpaceModal
        isOpen={showAddSpaceModal}
        onClose={() => setShowAddSpaceModal(false)}
        addSpaceModalTab={addSpaceModalTab}
        setAddSpaceModalTab={setAddSpaceModalTab}
        newSpace={newSpace}
        setNewSpace={setNewSpace}
        creating={creating}
        createSpace={createSpace}
        joinSpaceCode={joinSpaceCode}
        setJoinSpaceCode={setJoinSpaceCode}
        joining={joining}
        joinSpace={joinSpace}
      />

      {/* Screen Selection Modal */}
      <ScreenPickerModal
        isOpen={showScreenPicker}
        onClose={() => setShowScreenPicker(false)}
        screenSources={screenSources}
        setScreenSources={setScreenSources}
        screenPickerTab={screenPickerTab}
        setScreenPickerTab={setScreenPickerTab}
        selectedPickerSourceId={selectedPickerSourceId}
        setSelectedPickerSourceId={setSelectedPickerSourceId}
        selectScreenSource={selectScreenSource}
        screenQuality={screenQuality}
        setScreenQuality={setScreenQuality}
        screenFps={screenFps}
        setScreenFps={setScreenFps}
        isPremiumUser={isPremiumUser}
        onOpenSubscription={() => setShowSubscriptionModal(true)}
      />

      {/* Echo Space Studio Modal */}
      <Suspense fallback={null}>
        <SpaceStudioModal
          isOpen={showSpaceSettingsModal}
          onClose={() => setShowSpaceSettingsModal(false)}
          editingSpace={editingSpace}
          user={user}
          profileDisplayName={profileDisplayName}
          displayName={displayName}
          serverRoles={serverRoles}
          serverEmojis={serverEmojis}
          serverAuditLogs={serverAuditLogs}
          editingSpaceMembers={editingSpaceMembers}
          loadingEditingMembers={loadingEditingMembers}
          memberRoleMap={memberRoleMap}
          spaceChannels={spaceChannels}
          mutedSpaces={mutedSpaces}
          toggleMuteSpace={toggleMuteSpace}
          activeSpaceTab={activeSpaceTab}
          setActiveSpaceTab={setActiveSpaceTab}
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
          memberSearchQuery={memberSearchQuery}
          setMemberSearchQuery={setMemberSearchQuery}
          selectedRoleId={selectedRoleId}
          setSelectedRoleId={setSelectedRoleId}
          selectedMemberId={selectedMemberId}
          setSelectedMemberId={setSelectedMemberId}
          newEmojiName={newEmojiName}
          setNewEmojiName={setNewEmojiName}
          uploadingEmoji={uploadingEmoji}
          editingChannelSettingsId={editingChannelSettingsId}
          setEditingChannelSettingsId={setEditingChannelSettingsId}
          setShowNewChannel={setShowNewChannel}
          setNewChannelCategory={setNewChannelCategory}
          setNewChannelName={setNewChannelName}
          setNewChannelTopic={setNewChannelTopic}
          handleSpaceIconUpload={handleSpaceIconUpload}
          handleRemoveSpaceIcon={handleRemoveSpaceIcon}
          handleSpaceBannerUpload={handleSpaceBannerUpload}
          handleRemoveSpaceBanner={handleRemoveSpaceBanner}
          handleSaveSpaceSettings={handleSaveSpaceSettings}
          handleCreateRole={handleCreateRole}
          handleUpdateRole={handleUpdateRole}
          handleDeleteRole={handleDeleteRole}
          moveRole={moveRole}
          handleCreateEmoji={handleCreateEmoji}
          handleDeleteEmoji={handleDeleteEmoji}
          moveChannel={moveChannel}
          updateChannelSettings={updateChannelSettings}
          renameChannel={renameChannel}
          deleteChannel={deleteChannel}
          getUserHighestRole={getUserHighestRole}
          canUserDo={canUserDo}
          toggleMemberRole={toggleMemberRole}
          handleRoleChange={handleRoleChange}
          handleKickMember={handleKickMember}
          handleDeleteSpace={handleDeleteSpace}
          loadSpaceEmojis={loadSpaceEmojis}
          loadEditingSpaceMembers={loadEditingSpaceMembers}
          showToast={showToast}
        />
      </Suspense>

      {/* User Volume & 3D Spatial Audio Modal */}
      {(() => {
        const currentSpaceId = activeVoiceChannel?.space_id || selectedChannel?.space_id || expandedSpace || undefined
        const currentSpace = spaces.find(s => s.id === currentSpaceId)
        const isSpaceOwner = currentSpace ? currentSpace.creator_id === user.id : false
        const availableVoiceChannels = currentSpaceId && spaceChannels[currentSpaceId]
          ? spaceChannels[currentSpaceId].filter(c => c.type === 'voice' && c.id !== activeVoiceChannelId)
          : []

        return (
          <VolumeControlModal
            volumeControlUser={volumeControlUser}
            onClose={() => setVolumeControlUser(null)}
            userVolumes={userVolumes}
            setUserVolumes={setUserVolumes}
            userStereoPans={userStereoPans}
            setUserStereoPans={setUserStereoPans}
            changePeerPan={changePeerPan}
            spatialAudioEnabled={spatialAudioEnabled}
            setSpatialAudioEnabledState={setSpatialAudioEnabledState}
            participants={participants}
            currentUserId={user.id}
            spaceId={currentSpaceId}
            isSpaceOwner={isSpaceOwner}
            canUserDo={canUserDo}
            availableVoiceChannels={availableVoiceChannels}
            serverMuteParticipant={handleServerMute}
            disconnectParticipant={handleDisconnectParticipant}
            moveParticipant={handleMoveParticipant}
          />
        )
      })()}

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        config={confirmModalConfig}
        onClose={() => setConfirmModalConfig(null)}
      />

      {/* Member Profile Card Modal */}
      <MemberProfileModalWrapper
        inspectedMember={inspectedMember}
        onClose={() => setInspectedMember(null)}
        user={user}
        onlineUsers={onlineUsers}
        participants={participants}
        presenceData={presenceData}
        presenceStatus={presenceStatus}
        myGamePresence={myGamePresence}
        spaces={spaces}
        expandedSpace={expandedSpace}
        avatarDecoration={avatarDecoration}
        profileEffect={profileEffect}
        activeVoiceChannel={activeVoiceChannel}
        showToast={showToast}
        friendships={friendships}
        onAddFriend={sendFriendRequestToUser}
        onAcceptFriend={acceptFriendRequest}
        handleOpenDirectChat={handleOpenDirectChat}
        setVolumeControlUser={setVolumeControlUser}
        blockedUserIds={blockedUserIds}
        onBlockUser={blockUser}
        onUnblockUser={unblockUser}
      />

      {/* Member Hover Popover Card */}
      <HoveredMemberPopover
        hoveredMemberPopover={hoveredMemberPopover}
        setHoveredMemberPopover={setHoveredMemberPopover}
        setInspectedMember={setInspectedMember}
        hoverTimeoutRef={hoverTimeoutRef}
        currentUserId={user.id}
        currentUserProfileEffect={profileEffect}
        currentUserAvatarDecoration={avatarDecoration}
        presenceData={presenceData}
        onOpenDM={(targetUserId) => {
          handleOpenDirectChat(targetUserId)
          setPage('Amigos')
        }}
        blockedUserIds={blockedUserIds}
        onBlockUser={blockUser}
        onUnblockUser={unblockUser}
      />

      {/* Channel / Voice Channel Invite Modal */}
      {channelForInvite && (
        <ChannelInviteModal
          channel={channelForInvite.channel}
          space={channelForInvite.space}
          onClose={() => setChannelForInvite(null)}
          friendships={friendships}
          onSendDMInvite={async (friendUserId, inviteMessage) => {
            if (!supabase || !user) return
            await supabase.from('direct_messages').insert({
              sender_id: user.id,
              receiver_id: friendUserId,
              body: inviteMessage
            })
            socialChannelRef.current?.send({
              type: 'broadcast',
              event: 'dm-event',
              payload: {
                receiverId: friendUserId,
                senderId: user.id,
                senderName: profileDisplayName || displayName || 'Amigo',
                body: inviteMessage
              }
            })
          }}
          showToast={showToast as any}
        />
      )}

      {/* Space Add Members Modal */}
      {spaceForAddMembers && (
        <SpaceAddMembersModal
          space={spaceForAddMembers}
          onClose={() => setSpaceForAddMembers(null)}
          friendships={friendships}
          spaceMembers={spaceMembers}
          onlineUsers={onlineUsers}
          onAddMember={async (friend) => {
            return await handleAddMemberToSpace(spaceForAddMembers.id, friend)
          }}
          showToast={showToast as any}
        />
      )}

      {/* Soundboard Modal & Toast */}
      <SoundboardModal
        isOpen={showSoundboardModal}
        onClose={() => setShowSoundboardModal(false)}
        onPlaySound={playSoundboard}
      />
      <SoundboardToast lastEvent={lastSoundboardEvent} />

      {/* WhatsNew Modal */}
      <WhatsNewModal 
        isOpen={showWhatsNewModal} 
        onClose={() => setShowWhatsNewModal(false)} 
      />

      {/* Saved Messages Modal */}
      <SavedMessagesModal 
        isOpen={showSavedMessagesModal}
        onClose={() => setShowSavedMessagesModal(false)}
        savedMessages={savedMessages}
        onUnstar={(msgId) => {
          setSavedMessages(prev => prev.filter(m => m.id !== msgId))
          showToast('Estrela removida', 'Mensagem removida dos seus itens salvos.', 'info')
        }}
        onJumpToMessage={handleJumpToSavedMessage}
      />

      {/* Lightbox Modal */}
      <ImageLightboxModal />

      {/* AFK Modals */}
      <AfkPromptModal
        isOpen={showAfkPrompt}
        afkCountdown={afkCountdown}
        onStay={handleAfkStay}
      />
      <AfkDisconnectedModal
        isOpen={showAfkDisconnectedModal}
        onClose={() => setShowAfkDisconnectedModal(false)}
        canReconnect={!!lastAfkChannelRef.current?.channelId}
        onReconnect={() => {
          if (lastAfkChannelRef.current?.channelId) {
            handleJoinVoice(lastAfkChannelRef.current.channelId, lastAfkChannelRef.current.spaceId)
          }
          setShowAfkDisconnectedModal(false)
          lastActivityRef.current = Date.now()
        }}
      />

      {/* Incoming Call Modal */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />

      {/* Command Palette Modal */}
      <Suspense fallback={null}>
        <CommandPaletteModal
          spaces={spaces}
          channels={Object.values(spaceChannels).flat()}
          friendships={friendships}
          isMuted={isMuted}
          isDeafened={isDeafened}
          toggleMute={handleToggleMute}
          toggleDeafen={handleToggleDeafen}
          onSelectSpace={(spaceId) => {
            setExpandedSpace(spaceId)
            setPage('Servidores')
          }}
          onSelectChannel={(ch) => {
            setSelectedChannel(ch)
            setExpandedSpace(ch.space_id)
            setPage('Servidores')
            if (ch.type === 'voice') {
              handleJoinVoice(ch.id, ch.space_id)
            }
          }}
          onSelectFriend={(friendId) => {
            handleOpenDirectChat(friendId)
            setPage('Amigos')
          }}
          setPage={setPage}
          setShowSpaceStudio={setShowSpaceSettingsModal}
          setShowSoundboard={setShowSoundboardModal}
        />
      </Suspense>
    </Suspense>
  )
}
