import { describe, it, expect, vi } from 'vitest'
import { areMessageRowPropsEqual, type MessageRowProps, type MessageFeedItem } from '../MessageList'

const baseUser: any = { id: 'user-1', user_metadata: {} }
const baseChannel: any = { id: 'ch-1', name: 'geral', type: 'text' }

function createSampleFeedItem(id: string, body: string, extra: Partial<MessageFeedItem> = {}): MessageFeedItem {
  return {
    type: 'message',
    key: `msg-${id}`,
    message: {
      id,
      channel_id: 'ch-1',
      body,
      author_id: 'user-1',
      created_at: '2026-11-01T12:00:00Z',
      updated_at: '2026-11-01T12:00:00Z',
      status: 'sent'
    },
    index: 0,
    msgDate: new Date('2026-11-01T12:00:00Z'),
    isDifferentDay: false,
    isConsecutive: false,
    displayedBody: body,
    replyQuoteText: null,
    isForwarded: false,
    isMentioned: false,
    msgRole: null,
    isPinned: false,
    canManagePins: false,
    reactions: {},
    authorClanTag: null,
    authorClanTagColor: '',
    isSelf: true,
    authorBadge: null,
    resolvedAuthorName: 'Lag',
    ...extra
  }
}

function createSampleProps(item: MessageFeedItem, overrides: Partial<MessageRowProps> = {}): MessageRowProps {
  return {
    item,
    user: baseUser,
    presenceData: {},
    serverRoles: [],
    memberRoleMap: {},
    currentSpace: null,
    selectedChannel: baseChannel,
    isThreadList: false,
    setReplyingToMessage: vi.fn(),
    toggleReaction: vi.fn(),
    isMessageSaved: () => false,
    toggleSaveMessage: vi.fn(),
    togglePinMessage: vi.fn(),
    handleDeleteMessage: vi.fn(),
    filteredMessages: [],
    myNameFont: 'default',
    setInspectedMember: vi.fn(),
    openLightbox: vi.fn(),
    profileDisplayName: 'Lag',
    activePlayingVoiceNote: null,
    handleToggleVoicePlay: vi.fn(),
    voiceNotePlaySpeed: 1,
    handleChangeVoiceSpeed: vi.fn(),
    voiceNoteAudioRef: { current: null },
    retrySendMessage: vi.fn(),
    ...overrides
  }
}

describe('areMessageRowPropsEqual (Memoização fina de mensagens)', () => {
  it('retorna true quando as propriedades da mensagem permanecem idênticas', () => {
    const item1 = createSampleFeedItem('m1', 'Olá turma')
    const item2 = createSampleFeedItem('m1', 'Olá turma')
    const prev = createSampleProps(item1)
    const next = createSampleProps(item2)

    expect(areMessageRowPropsEqual(prev, next)).toBe(true)
  })

  it('retorna false quando o texto da mensagem foi editado', () => {
    const item1 = createSampleFeedItem('m1', 'Texto antigo')
    const item2 = createSampleFeedItem('m1', 'Texto novo')
    const prev = createSampleProps(item1)
    const next = createSampleProps(item2)

    expect(areMessageRowPropsEqual(prev, next)).toBe(false)
  })

  it('retorna false quando o status da mensagem muda (ex: sending -> sent)', () => {
    const item1 = createSampleFeedItem('m1', 'Msg', {
      message: { id: 'm1', body: 'Msg', author_id: 'user-1', created_at: '', status: 'sending' }
    })
    const item2 = createSampleFeedItem('m1', 'Msg', {
      message: { id: 'm1', body: 'Msg', author_id: 'user-1', created_at: '', status: 'sent' }
    })
    const prev = createSampleProps(item1)
    const next = createSampleProps(item2)

    expect(areMessageRowPropsEqual(prev, next)).toBe(false)
  })

  it('retorna false quando uma nova reação é adicionada à mensagem', () => {
    const item1 = createSampleFeedItem('m1', 'Msg', { reactions: {} })
    const item2 = createSampleFeedItem('m1', 'Msg', { reactions: { '🔥': ['user-2'] } })
    const prev = createSampleProps(item1)
    const next = createSampleProps(item2)

    expect(areMessageRowPropsEqual(prev, next)).toBe(false)
  })

  it('retorna false quando a nota de voz DESTA mensagem começa a tocar', () => {
    const item = createSampleFeedItem('m1', 'Áudio', {
      message: { id: 'm1', body: 'Áudio', author_id: 'user-1', created_at: '', attachment_type: 'audio', attachment_url: 'http://audio.mp3', status: 'sent' }
    })
    const prev = createSampleProps(item, { activePlayingVoiceNote: null })
    const next = createSampleProps(item, { activePlayingVoiceNote: 'm1' })

    expect(areMessageRowPropsEqual(prev, next)).toBe(false)
  })

  it('retorna true quando uma nota de voz de OUTRA mensagem começa a tocar (evita re-render inútil)', () => {
    const item = createSampleFeedItem('m1', 'Texto normal')
    const prev = createSampleProps(item, { activePlayingVoiceNote: null })
    const next = createSampleProps(item, { activePlayingVoiceNote: 'm-outra' })

    expect(areMessageRowPropsEqual(prev, next)).toBe(true)
  })

  it('retorna false quando o status de fixado muda', () => {
    const item1 = createSampleFeedItem('m1', 'Msg', { isPinned: false })
    const item2 = createSampleFeedItem('m1', 'Msg', { isPinned: true })
    const prev = createSampleProps(item1)
    const next = createSampleProps(item2)

    expect(areMessageRowPropsEqual(prev, next)).toBe(false)
  })

  it('retorna false quando a mensagem é favoritada/salva', () => {
    const item = createSampleFeedItem('m1', 'Msg')
    const prev = createSampleProps(item, { isMessageSaved: () => false })
    const next = createSampleProps(item, { isMessageSaved: (id) => id === 'm1' })

    expect(areMessageRowPropsEqual(prev, next)).toBe(false)
  })
})
