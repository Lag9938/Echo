import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MessageList, jumpToMessage } from '../MessageList'

const ME = 'user-me'
const ANA = 'user-ana'
const t = (min: number) => new Date(Date.UTC(2026, 9, 3, 12, min)).toISOString()

function makeProps(overrides: Record<string, unknown> = {}): any {
  return {
    messagesContainerRef: { current: null },
    messagesEndRef: { current: null },
    selectedChannel: { id: 't1', name: 'geral', type: 'text', space_id: 's1' },
    currentSpace: { id: 's1', name: 'Trupe', creator_id: ME },
    hasMoreMessages: false,
    isLoadingMore: false,
    loadMoreMessages: vi.fn(),
    searchQuery: '',
    user: { id: ME, user_metadata: {} },
    profileDisplayName: 'Eu',
    presenceData: {},
    serverRoles: [],
    memberRoleMap: {},
    canUserDo: () => true,
    getUserHighestRole: () => null,
    setInspectedMember: vi.fn(),
    toggleReaction: vi.fn(),
    setReplyingToMessage: vi.fn(),
    isMessageSaved: () => false,
    toggleSaveMessage: vi.fn(),
    pinnedMessages: {},
    togglePinMessage: vi.fn(),
    handleDeleteMessage: vi.fn(),
    openLightbox: vi.fn(),
    activePlayingVoiceNote: null,
    handleToggleVoicePlay: vi.fn(),
    voiceNotePlaySpeed: 1,
    handleChangeVoiceSpeed: vi.fn(),
    voiceNoteAudioRef: { current: null },
    retrySendMessage: vi.fn(),
    messageReactions: {},
    ...overrides
  }
}

const makeMsg = (id: string, min: number) => ({
  id,
  channel_id: 't1',
  author_id: min % 2 === 0 ? ME : ANA,
  body: `Mensagem de teste ${id}`,
  created_at: t(min),
  profile: { display_name: min % 2 === 0 ? 'Eu' : 'Ana' },
  status: 'sent' as const
})

describe('Virtualização do Chat (MessageList com @tanstack/react-virtual)', () => {
  it('renderiza com segurança e estabilidade uma lista longa de mensagens', () => {
    // 60 mensagens
    const filteredMessages = Array.from({ length: 60 }, (_, i) => makeMsg(`m-${i + 1}`, i))
    const { container } = render(<MessageList {...makeProps({ filteredMessages })} />)

    const area = container.querySelector('.messages-area')
    expect(area).toBeTruthy()
    expect(area?.classList.contains('messages-area')).toBe(true)

    // O container de mensagens está presente
    const flow = container.querySelector('.messages-flow')
    expect(flow).toBeTruthy()
  })

  it('jumpToMessage funciona e destaca a mensagem com a classe msg-jump-highlight', () => {
    const filteredMessages = [
      makeMsg('jump-target-1', 1),
      makeMsg('jump-target-2', 2)
    ]
    const { container } = render(<MessageList {...makeProps({ filteredMessages })} />)

    const jumped = jumpToMessage('jump-target-1')
    expect(jumped).toBe(true)

    const targetEl = container.querySelector('[data-message-id="jump-target-1"]')
    expect(targetEl?.classList.contains('msg-jump-highlight')).toBe(true)
  })

  it('jumpToMessage retorna false para ids de mensagens que não existem no feed', () => {
    const filteredMessages = [makeMsg('m-1', 1)]
    render(<MessageList {...makeProps({ filteredMessages })} />)

    const notFound = jumpToMessage('msg-que-nao-existe-999')
    expect(notFound).toBe(false)
  })
})
