import type { User } from '@supabase/supabase-js'
import type { VoiceParticipant } from '../lib/useVoiceChannel'

export interface RolePermissions {
  administrator?: boolean;
  manageChannels?: boolean;
  manageMessages?: boolean;
  kickMembers?: boolean;
  muteMembers?: boolean;
  moveMembers?: boolean;
  disconnectMembers?: boolean;
  sendInAnnouncementChannels?: boolean;
}

export interface ServerRole {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: RolePermissions;
  isDefault?: boolean;
}

export interface ServerAuditLog {
  id: string;
  timestamp: string;
  author_name: string;
  action: string;
  details?: string;
}

export interface ServerEmoji {
  id: string;
  name: string;
  url: string;
  created_at: string;
  creator_id?: string;
}

export interface PinnedMessage {
  id: string;
  channel_id: string;
  message_id: string;
  body: string;
  author_name: string;
  author_avatar?: string;
  created_at: string;
  pinned_at: string;
  pinned_by_name: string;
  attachment_url?: string;
  attachment_type?: string;
}

export interface Space { 
  id: string; 
  name: string; 
  description: string; 
  creator_id: string; 
  created_at?: string;
  icon_url?: string | null;
  banner_url?: string | null;
  banner_theme?: string | null;
  welcome_channel_id?: string | null;
  member_count?: number;
  roles?: ServerRole[];
  emojis?: ServerEmoji[];
}

export interface Channel { 
  id: string; 
  name: string; 
  type: 'text' | 'voice'; 
  space_id: string;
  topic?: string;
  position?: number;
  is_announcement?: boolean;
  user_limit?: number;
  slowmode_seconds?: number;
  category?: string;
  is_private?: boolean;
  allowed_role_ids?: string[];
}

export interface Message { 
  id: string; 
  tempId?: string;
  body: string; 
  created_at: string; 
  author_id: string; 
  profile?: { display_name: string; avatar_url?: string };
  attachment_url?: string;
  attachment_type?: string;
  status?: 'sending' | 'sent' | 'failed';
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  attachment_url?: string;
  attachment_type?: string;
  created_at: string;
}

export interface Toast {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'message' | 'friend';
}

export interface FriendshipRequest {
  id: string
  user: { id: string; display_name: string; avatar_url?: string }
  status: 'pending' | 'accepted'
  initiatorId: string
}

export interface SavedMessageItem {
  id: string;
  sourceType: 'channel' | 'dm';
  sourceName: string;
  spaceId?: string;
  channelId?: string;
  dmUserId?: string;
  authorName: string;
  authorAvatar?: string;
  authorId: string;
  body: string;
  attachmentUrl?: string;
  attachmentType?: string;
  createdAt: string;
  savedAt: number;
}

export interface MemberProfileModalProps {
  inspectedMember: {
    user: { id: string; display_name: string; avatar_url?: string }
    joined_at?: string
    roleName?: string
    roleColor?: string
    roles?: ServerRole[]
  }
  onClose: () => void
  currentUser: User | null
  isOnline: boolean
  userPresenceStatus: string
  validCustomStatus: string | null
  memberClanTag: string | null
  memberClanTagColor: string
  activeGame: string | null
  activeGameStartedAt?: number | null
  isVoiceUser: boolean
  voiceChannelName?: string
  isServerOwner: boolean
  avatarDecoration?: string | null
  profileEffect?: string | null
  onOpenDM: (targetId: string) => void
  onAdjustVolume?: (peer: VoiceParticipant) => void
  voicePeer?: VoiceParticipant
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  friendships?: FriendshipRequest[]
  onAddFriend?: (targetUserId: string, targetName: string) => Promise<void>
  onAcceptFriend?: (friendshipId: string) => Promise<void>
}

export type Page = 'Amigos' | 'Mensagens' | 'Servidores' | 'Descobrir' | 'Configurações' | 'Loja'

