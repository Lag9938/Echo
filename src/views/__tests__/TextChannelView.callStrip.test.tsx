import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TextChannelView } from '../TextChannelView'

const noop = () => {}
const user: any = { id: 'me', user_metadata: {} }
const channels: any[] = [
  { id: 't1', name: 'geral', type: 'text', space_id: 's1' },
  { id: 'c1', name: 'Callzinha', type: 'voice', space_id: 's1' }
]

const props: any = {
  currentSpace: { id: 's1', name: 'Espaço', creator_id: 'me' },
  selectedChannel: channels[0],
  messages: [{ id: 'm1', channel_id: 't1', body: 'oi', created_at: new Date().toISOString(), author_id: 'a', profile: { display_name: 'ana' }, status: 'sent' }],
  hasMoreMessages: false,
  isLoadingMore: false,
  loadMoreMessages: noop,
  messagesContainerRef: { current: null },
  messagesEndRef: { current: null },
  user,
  profileDisplayName: 'Eu',
  presenceData: { a: { current_game: { name: 'VALORANT' } } },
  onlineUsers: new Set<string>(),
  serverRoles: [],
  memberRoleMap: {},
  canUserDo: () => true,
  getUserHighestRole: () => null,
  isMessageSaved: () => false,
  toggleSaveMessage: noop,
  handleDeleteMessage: noop,
  retrySendMessage: noop,
  replyingToMessage: null,
  setReplyingToMessage: noop,
  messageReactions: {},
  toggleReaction: noop,
  activePlayingVoiceNote: null,
  handleToggleVoicePlay: noop,
  voiceNotePlaySpeed: 1,
  handleChangeVoiceSpeed: noop,
  voiceNoteAudioRef: { current: null },
  draft: '',
  setDraft: noop,
  send: noop,
  isUploading: false,
  handleChatFileUpload: noop,
  isVoiceNoteRecording: false,
  voiceNoteDuration: 0,
  startVoiceNoteRecording: noop,
  stopVoiceNoteRecording: noop,
  cancelVoiceNoteRecording: noop,
  slowmodeCooldown: 0,
  showSearchInput: false,
  setShowSearchInput: noop,
  searchQuery: '',
  setSearchQuery: noop,
  showPinnedMessagesPanel: false,
  setShowPinnedMessagesPanel: noop,
  showMembersList: false,
  setShowMembersList: noop,
  pinnedMessages: {},
  togglePinMessage: noop,
  spaceMembers: [],
  spaceChannels: { s1: channels },
  activeVoiceChannelId: 'c1',
  participants: [{ userId: 'me', displayName: 'Eu' }, { userId: 'a', displayName: 'ana', isSpeaking: false }],
  spaceVoiceUsers: { c1: [{ userId: 'a', displayName: 'ana' }] },
  setSpaceForAddMembers: noop,
  setInspectedMember: noop,
  setHoveredMemberPopover: noop,
  hoverTimeoutRef: { current: null },
  postChannelMessage: noop,
  supabase: null
}

describe('TextChannelView', () => {
  it('renderiza com uma chamada em andamento (faixa) sem quebrar', () => {
    const { container } = render(<TextChannelView {...props} />)
    expect(container.querySelector('.call-strip')).toBeTruthy()
    expect(container.textContent).toContain('na call')
  })

  it('renderiza sem ninguém em chamada', () => {
    const { container } = render(<TextChannelView {...props} spaceVoiceUsers={{}} participants={[]} activeVoiceChannelId={null} />)
    expect(container.querySelector('.call-strip')).toBeNull()
  })
})
