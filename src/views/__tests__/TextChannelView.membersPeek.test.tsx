import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { TextChannelView } from '../TextChannelView'

const noop = () => {}
const user: any = { id: 'me', user_metadata: {} }
const channels: any[] = [{ id: 't1', name: 'geral', type: 'text', space_id: 's1' }]

const props: any = {
  currentSpace: { id: 's1', name: 'Espaço', creator_id: 'me' },
  selectedChannel: channels[0],
  messages: [],
  hasMoreMessages: false,
  isLoadingMore: false,
  loadMoreMessages: noop,
  messagesContainerRef: { current: null },
  messagesEndRef: { current: null },
  user,
  profileDisplayName: 'Eu',
  presenceData: {},
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
  activeVoiceChannelId: null,
  participants: [],
  spaceVoiceUsers: {},
  setSpaceForAddMembers: noop,
  setInspectedMember: noop,
  setHoveredMemberPopover: noop,
  hoverTimeoutRef: { current: null },
  postChannelMessage: noop,
  supabase: null
}

describe('TextChannelView: espiar a lista de membros', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('passar o mouse no botão de membros abre a lista como espiada', () => {
    const { container } = render(<TextChannelView {...props} />)
    expect(container.querySelector('.members-sidebar')).toBeNull()
    const btn = container.querySelector('button[title="Mostrar Lista de Membros"]') as HTMLElement
    expect(btn).toBeTruthy()
    fireEvent.mouseEnter(btn)
    act(() => { vi.advanceTimersByTime(200) })
    expect(container.querySelector('.members-sidebar.is-peek')).toBeTruthy()
    expect(container.querySelector('.members-sidebar')!.parentElement!.className).toBe('chat-workspace-wrapper')
  })
})
