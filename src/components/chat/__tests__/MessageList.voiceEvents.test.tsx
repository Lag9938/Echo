import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MessageList } from '../MessageList'
import { CallStrip } from '../CallStrip'

const noop = () => {}
const user: any = { id: 'me', user_metadata: {} }
const baseProps: any = {
  messagesContainerRef: { current: null },
  messagesEndRef: { current: null },
  selectedChannel: { id: 't1', name: 'geral', type: 'text', space_id: 's1' },
  currentSpace: { id: 's1', name: 'Espaço', creator_id: 'me' },
  hasMoreMessages: false,
  isLoadingMore: false,
  loadMoreMessages: noop,
  searchQuery: '',
  user,
  profileDisplayName: 'Eu',
  presenceData: {},
  serverRoles: [],
  memberRoleMap: {},
  canUserDo: () => true,
  getUserHighestRole: () => null,
  setInspectedMember: noop,
  toggleReaction: noop,
  setReplyingToMessage: noop,
  isMessageSaved: () => false,
  toggleSaveMessage: noop,
  pinnedMessages: {},
  togglePinMessage: noop,
  handleDeleteMessage: noop,
  openLightbox: noop,
  activePlayingVoiceNote: null,
  handleToggleVoicePlay: noop,
  voiceNotePlaySpeed: 1,
  handleChangeVoiceSpeed: noop,
  voiceNoteAudioRef: { current: null },
  retrySendMessage: noop,
  messageReactions: {}
}
const t = (min: number) => new Date(Date.UTC(2026, 8, 26, 12, min)).toISOString()

describe('MessageList com eventos de voz', () => {
  it('renderiza mensagens, imagem com nome de arquivo e eventos antes/depois', () => {
    const filteredMessages: any[] = [
      { id: 'm1', channel_id: 't1', body: 'oi', created_at: t(0), author_id: 'a', profile: { display_name: 'ana' }, status: 'sent' },
      { id: 'm2', channel_id: 't1', body: 'foto.png', created_at: t(10), author_id: 'a', attachment_url: 'https://x/y.png', attachment_type: 'image', profile: { display_name: 'ana' }, status: 'sent' }
    ]
    const voiceEvents = [
      { id: 'e1', at: Date.UTC(2026, 8, 26, 12, 5), kind: 'join' as const, text: 'bia entrou na call' },
      { id: 'e2', at: Date.UTC(2026, 8, 26, 12, 30), kind: 'music' as const, text: 'O bot tocou "X"' }
    ]
    const { container } = render(<MessageList {...baseProps} filteredMessages={filteredMessages} voiceEvents={voiceEvents} />)
    const order = [...container.querySelectorAll('.msg-row, .voice-event')].map((e) => (e.classList.contains('voice-event') ? 'evento' : 'msg'))
    expect(order).toEqual(['msg', 'evento', 'msg', 'evento'])
    expect(container.textContent).not.toContain('foto.png')
  })

  it('sem eventos e sem mensagens não quebra', () => {
    const { container } = render(<MessageList {...baseProps} filteredMessages={[]} />)
    expect(container.querySelector('.messages-area')).toBeTruthy()
  })
})

describe('CallStrip', () => {
  it('renderiza com pessoas sem nome definido', () => {
    const { container } = render(
      <CallStrip
        summary={{ channelId: 'c1', channelName: 'Call', people: [{ userId: 'a', displayName: '' }, { userId: 'b', displayName: 'bia' }], activityText: null }}
        isInCall={false}
        onJoin={vi.fn()}
      />
    )
    expect(container.textContent).toContain('2 pessoas na call')
  })
})
