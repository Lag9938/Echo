import type { User } from '@supabase/supabase-js'
import type { Space, FriendshipRequest } from '../../types'
import type { VoiceParticipant } from '../../lib/useVoiceChannel'
import { MemberProfileModal } from './MemberProfileModal'

export interface MemberProfileModalWrapperProps {
  inspectedMember: any
  onClose: () => void
  user: User
  onlineUsers: Set<string>
  participants: VoiceParticipant[]
  presenceData: Record<string, any>
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  spaces: Space[]
  expandedSpace: string | null
  avatarDecoration?: string | null
  profileEffect?: string | null
  activeVoiceChannel?: { name: string } | null
  showToast: (title: string, message: string, type?: any) => void
  friendships: FriendshipRequest[]
  onAddFriend: (targetUserId: string, targetName: string) => Promise<void>
  onAcceptFriend: (friendshipId: string) => Promise<void>
  handleOpenDirectChat: (targetId: string, targetUser: any) => void
  setVolumeControlUser: (user: any) => void
}

export function MemberProfileModalWrapper({
  inspectedMember,
  onClose,
  user,
  onlineUsers,
  participants,
  presenceData,
  presenceStatus,
  myGamePresence,
  spaces,
  expandedSpace,
  avatarDecoration,
  profileEffect,
  activeVoiceChannel,
  showToast,
  friendships,
  onAddFriend,
  onAcceptFriend,
  handleOpenDirectChat,
  setVolumeControlUser
}: MemberProfileModalWrapperProps) {
  if (!inspectedMember) return null

  const isOnline = onlineUsers.has(inspectedMember.user.id) || participants.some(p => p.userId === inspectedMember.user.id)
  const userPresenceStatus = isOnline ? (presenceData[inspectedMember.user.id]?.presence_status || 'online') : 'offline'
  const rawCustomStatus = presenceData[inspectedMember.user.id]?.custom_status
  const isSameAsName = rawCustomStatus && (rawCustomStatus.trim().toLowerCase() === inspectedMember.user.display_name.trim().toLowerCase())
  const validCustomStatus = (rawCustomStatus && !isSameAsName) ? rawCustomStatus : null
  const memberClanTag = localStorage.getItem(`echo-clan-tag-${inspectedMember.user.id}`) || (inspectedMember.user.id === user.id ? localStorage.getItem(`echo-clan-tag-${user.id}`) : null)
  const memberClanTagColor = localStorage.getItem(`echo-clan-tag-color-${inspectedMember.user.id}`) || (inspectedMember.user.id === user.id ? localStorage.getItem(`echo-clan-tag-color-${user.id}`) : '#00f2fe') || '#00f2fe'
  const activeGameObj = inspectedMember.user.id === user.id 
    ? (presenceStatus !== 'invisible' ? myGamePresence : null)
    : (presenceData[inspectedMember.user.id]?.game_presence || presenceData[inspectedMember.user.id]?.current_game || null)
  const activeGame = activeGameObj?.name || null
  const activeGameStartedAt = activeGameObj?.startedAt || null
  const isVoiceUser = participants.some(p => p.userId === inspectedMember.user.id)
  const currentActiveSpace = spaces.find(s => s.id === expandedSpace) || spaces[0] || null
  const isServerOwner = currentActiveSpace?.creator_id === inspectedMember.user.id
  const voicePeer = participants.find(p => p.userId === inspectedMember.user.id)
  const inspectedDeco = inspectedMember.user.id === user.id
    ? avatarDecoration
    : (presenceData[inspectedMember.user.id]?.avatar_decoration || (inspectedMember.user as any).avatar_decoration || null)
  const inspectedEffect = inspectedMember.user.id === user.id
    ? profileEffect
    : (presenceData[inspectedMember.user.id]?.profile_effect || (inspectedMember.user as any).profile_effect || null)

  return (
    <MemberProfileModal
      inspectedMember={inspectedMember}
      onClose={onClose}
      currentUser={user}
      isOnline={isOnline}
      userPresenceStatus={userPresenceStatus}
      validCustomStatus={validCustomStatus}
      memberClanTag={memberClanTag}
      memberClanTagColor={memberClanTagColor}
      activeGame={activeGame}
      activeGameStartedAt={activeGameStartedAt}
      isVoiceUser={isVoiceUser}
      voiceChannelName={activeVoiceChannel?.name}
      isServerOwner={isServerOwner}
      avatarDecoration={inspectedDeco}
      profileEffect={inspectedEffect}
      voicePeer={voicePeer}
      showToast={showToast}
      friendships={friendships}
      onAddFriend={onAddFriend}
      onAcceptFriend={onAcceptFriend}
      onOpenDM={(targetId) => {
        handleOpenDirectChat(targetId, inspectedMember.user)
      }}
      onAdjustVolume={(peer) => {
        setVolumeControlUser(peer)
        onClose()
      }}
    />
  )
}
