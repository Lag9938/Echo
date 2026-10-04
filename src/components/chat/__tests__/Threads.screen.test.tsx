import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageList } from '../MessageList'
import { ThreadPanel, type ThreadListProps } from '../ThreadPanel'

const ME = 'me'
const ANA = 'ana'
const t = (min: number) => new Date(Date.UTC(2026, 9, 4, 12, min)).toISOString()

const message = (id: string, author: string, min: number, extra: Record<string, unknown> = {}) => ({
  id,
  channel_id: 't1',
  author_id: author,
  body: `mensagem ${id}`,
  created_at: t(min),
  profile: { display_name: author === ME ? 'Eu' : 'Ana' },
  status: 'sent',
  ...extra
}) as any

function listProps(overrides: Record<string, unknown> = {}): any {
  return {
    selectedChannel: { id: 't1', name: 'geral', type: 'text', space_id: 's1' },
    currentSpace: { id: 's1', name: 'Trupe', creator_id: ME },
    user: { id: ME, user_metadata: {} },
    profileDisplayName: 'Eu',
    presenceData: {},
    serverRoles: [],
    memberRoleMap: {},
    spaceMembers: [],
    canUserDo: () => true,
    getUserHighestRole: () => null,
    setInspectedMember: vi.fn(),
    toggleReaction: vi.fn(),
    isMessageSaved: () => false,
    toggleSaveMessage: vi.fn(),
    openLightbox: vi.fn(),
    activePlayingVoiceNote: null,
    handleToggleVoicePlay: vi.fn(),
    voiceNotePlaySpeed: 1,
    handleChangeVoiceSpeed: vi.fn(),
    voiceNoteAudioRef: { current: null },
    messageReactions: {},
    ...overrides
  }
}

function channelProps(overrides: Record<string, unknown> = {}): any {
  return {
    ...listProps(),
    messagesContainerRef: { current: null },
    messagesEndRef: { current: null },
    hasMoreMessages: false,
    isLoadingMore: false,
    loadMoreMessages: vi.fn(),
    searchQuery: '',
    setReplyingToMessage: vi.fn(),
    pinnedMessages: {},
    togglePinMessage: vi.fn(),
    handleDeleteMessage: vi.fn(),
    retrySendMessage: vi.fn(),
    ...overrides
  }
}

describe('Tópicos no chat principal', () => {
  it('mensagem com tópico mostra "N respostas" e o clique abre o tópico', () => {
    const root = message('r1', ANA, 0)
    const onOpenThread = vi.fn()
    const { container } = render(<MessageList {...channelProps({
      filteredMessages: [root, message('m2', ME, 10)],
      onOpenThread,
      threadSummaries: { r1: { rootId: 'r1', replyCount: 3, lastReplyAt: t(30), participantIds: [ANA, ME] } }
    })} />)

    const chips = container.querySelectorAll('.thread-chip')
    expect(chips).toHaveLength(1)
    expect(chips[0].textContent).toContain('3 respostas')
    expect(chips[0].textContent).toContain('última às')

    fireEvent.click(chips[0])
    expect(onOpenThread).toHaveBeenCalledWith(root)
  })

  it('tópico com resposta ainda não vista fica destacado', () => {
    const { container } = render(<MessageList {...channelProps({
      filteredMessages: [message('r1', ANA, 0)],
      onOpenThread: vi.fn(),
      threadSummaries: { r1: { rootId: 'r1', replyCount: 1, lastReplyAt: t(30), participantIds: [ANA] } },
      unreadThreadRoots: { r1: 't1' }
    })} />)

    const chip = container.querySelector('.thread-chip') as HTMLElement
    expect(chip.classList.contains('has-unread')).toBe(true)
    expect(chip.textContent).toContain('nova resposta')
  })

  it('toda mensagem enviada tem o botão "Responder em tópico"; a que ainda está enviando não', () => {
    const onOpenThread = vi.fn()
    const sent = message('m1', ANA, 0)
    const { container } = render(<MessageList {...channelProps({
      filteredMessages: [sent, message('temp-1', ME, 5, { status: 'sending' })],
      onOpenThread
    })} />)

    const buttons = container.querySelectorAll('.hover-action-btn.thread-btn')
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0])
    expect(onOpenThread).toHaveBeenCalledWith(sent)
  })

  it('com os tópicos desligados (banco sem a migração) não aparece nada de tópico', () => {
    const { container } = render(<MessageList {...channelProps({
      filteredMessages: [message('r1', ANA, 0)],
      threadSummaries: { r1: { rootId: 'r1', replyCount: 3, lastReplyAt: t(30), participantIds: [ANA] } }
    })} />)
    expect(container.querySelector('.thread-chip')).toBeNull()
    expect(container.querySelector('.thread-btn')).toBeNull()
  })
})

describe('Painel do tópico', () => {
  const root = message('r1', ANA, 0, { body: 'vamos marcar o jogo?' })

  const renderPanel = (overrides: Record<string, unknown> = {}) => {
    const props = {
      root,
      replies: [message('a', ME, 5, { body: 'sexta às 21h', thread_root_id: 'r1' }), message('b', ANA, 6, { body: 'fechado', thread_root_id: 'r1' })],
      isLoading: false,
      notice: '',
      canSend: true,
      onClose: vi.fn(),
      onSend: vi.fn().mockResolvedValue(true),
      onRetry: vi.fn(),
      onDelete: vi.fn(),
      listProps: listProps() as ThreadListProps,
      ...overrides
    }
    return { props, ...render(<ThreadPanel {...(props as any)} />) }
  }

  it('mostra a mensagem de origem, a contagem e as respostas', () => {
    const { container } = renderPanel()
    expect(container.querySelector('.thread-panel-root')?.textContent).toContain('vamos marcar o jogo?')
    expect(container.querySelector('.thread-panel-root')?.textContent).toContain('Ana')
    expect(container.querySelector('.thread-panel-divider')?.textContent).toBe('2 respostas')
    expect(container.querySelectorAll('.msg-row')).toHaveLength(2)
    expect(container.textContent).toContain('sexta às 21h')
  })

  it('dentro do tópico não há tópico dentro de tópico, nem fixar ou responder citando', () => {
    const { container } = renderPanel()
    expect(container.querySelector('.thread-btn')).toBeNull()
    expect(container.querySelector('.thread-chip')).toBeNull()
    expect(container.querySelector('.hover-action-btn[title="Responder a esta mensagem"]')).toBeNull()
    expect(container.querySelector('.channel-welcome-hero')).toBeNull()
  })

  it('Enter envia a resposta e limpa o campo; Shift+Enter não envia', async () => {
    const { props } = renderPanel()
    const input = screen.getByLabelText('Responder no tópico') as HTMLTextAreaElement

    fireEvent.change(input, { target: { value: 'eu topo' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(props.onSend).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(props.onSend).toHaveBeenCalledWith('eu topo'))
    expect(input.value).toBe('')
  })

  it('campo vazio não envia', () => {
    const { props, container } = renderPanel()
    fireEvent.submit(container.querySelector('.thread-panel-composer') as HTMLFormElement)
    expect(props.onSend).not.toHaveBeenCalled()
    expect((container.querySelector('.thread-panel-send') as HTMLButtonElement).disabled).toBe(true)
  })

  it('excluir a própria resposta chama a exclusão do tópico', () => {
    const { props, container } = renderPanel()
    fireEvent.click(container.querySelector('.hover-action-btn.delete-btn') as HTMLElement)
    expect(props.onDelete).toHaveBeenCalledWith('a')
  })

  it('sem permissão de escrever: lê as respostas, mas não há campo de resposta', () => {
    const { container } = renderPanel({ canSend: false })
    expect(container.querySelector('.thread-panel-composer')).toBeNull()
    expect(container.textContent).toContain('Você não tem permissão para escrever neste canal.')
    expect(container.querySelectorAll('.msg-row')).toHaveLength(2)
  })

  it('tópico sem respostas convida a responder; carregando avisa que está carregando', () => {
    const empty = renderPanel({ replies: [] })
    expect(empty.container.querySelector('.thread-panel-divider')?.textContent).toBe('Nenhuma resposta ainda')
    expect(empty.container.querySelector('.thread-panel-empty')).toBeTruthy()
    empty.unmount()

    const loading = renderPanel({ replies: [], isLoading: true })
    expect(loading.container.querySelector('.thread-panel-divider')?.textContent).toBe('Carregando respostas…')
  })

  it('aviso de falha aparece no painel; fechar pelo botão e pela tecla Esc', () => {
    const { props, container } = renderPanel({ notice: 'Não foi possível enviar a resposta.' })
    expect(container.querySelector('.thread-panel-notice')?.textContent).toBe('Não foi possível enviar a resposta.')

    fireEvent.click(screen.getByLabelText('Fechar tópico'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(props.onClose).toHaveBeenCalledTimes(2)
  })
})
