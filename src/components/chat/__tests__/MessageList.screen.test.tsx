import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, fireEvent } from '@testing-library/react'
import { MessageList } from '../MessageList'

const ME = 'me'
const ANA = 'ana'
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

const message = (id: string, author: string, min: number, extra: Record<string, unknown> = {}) => ({
  id,
  channel_id: 't1',
  author_id: author,
  body: `mensagem ${id}`,
  created_at: t(min),
  profile: { display_name: author === ME ? 'Eu' : 'Ana' },
  status: 'sent',
  ...extra
})

describe('Tela do chat (lista de mensagens)', () => {
  it('mostra texto, imagem, figurinha, áudio, arquivo e links incorporados sem quebrar', () => {
    const filteredMessages = [
      message('m1', ANA, 0),
      message('m2', ANA, 10, { body: 'foto.png', attachment_url: 'https://x.test/foto.png', attachment_type: 'image' }),
      message('m3', ME, 20, { body: 'Sticker', attachment_url: 'https://x.test/s.webp', attachment_type: 'sticker' }),
      message('m4', ME, 30, { body: 'audio', attachment_url: 'https://x.test/a.webm', attachment_type: 'audio' }),
      message('m5', ANA, 40, { body: 'relatorio.pdf', attachment_url: 'https://x.test/r.pdf', attachment_type: 'file' }),
      message('m6', ANA, 50, { body: 'olha https://www.youtube.com/watch?v=kXSWacxP_CU' }),
      message('m7', ME, 60, { body: '!play https://music.youtube.com/watch?v=kXSWacxP_CU' }),
      message('m8', ANA, 70, { body: 'veja https://exemplo.test/pagina' })
    ]
    const { container } = render(<MessageList {...makeProps({ filteredMessages })} />)

    expect(container.querySelectorAll('.msg-row')).toHaveLength(8)
    expect(container.querySelector('.msg-attachment-img')?.getAttribute('src')).toBe('https://x.test/foto.png')
    expect(container.querySelector('img[alt="sticker"]')).toBeTruthy()
    expect(container.querySelector('.msg-attachment-file')?.textContent).toContain('relatorio.pdf')
    expect(container.querySelectorAll('.youtube-embed')).toHaveLength(2)
    expect(container.querySelector('.youtube-music-embed')).toBeTruthy()
    expect(container.querySelector('.generic-embed')?.textContent).toContain('exemplo.test')
  })

  it('agrupa mensagens seguidas da mesma pessoa e separa quando muda o dia', () => {
    const filteredMessages = [
      message('m1', ANA, 0),
      message('m2', ANA, 2),
      message('m3', ANA, 60 * 24 + 5)
    ]
    const { container } = render(<MessageList {...makeProps({ filteredMessages })} />)

    const cards = [...container.querySelectorAll('.msg-card')]
    expect(cards.map((c) => c.classList.contains('msg-consecutive'))).toEqual([false, true, false])
    expect(container.querySelectorAll('.chat-date-divider')).toHaveLength(2)
  })

  it('clicar na imagem abre em tela cheia; reagir, responder e excluir chamam as ações certas', () => {
    const props = makeProps({
      filteredMessages: [message('m1', ME, 0, { body: 'foto.png', attachment_url: 'https://x.test/foto.png', attachment_type: 'image' })]
    })
    const { container } = render(<MessageList {...props} />)

    fireEvent.click(container.querySelector('.msg-attachment-img') as HTMLElement)
    expect(props.openLightbox).toHaveBeenCalledWith('https://x.test/foto.png')

    fireEvent.click(container.querySelector('.hover-action-btn[title="Reagir com 🔥"]') as HTMLElement)
    expect(props.toggleReaction).toHaveBeenCalledWith('m1', '🔥')

    fireEvent.click(container.querySelector('.hover-action-btn[title="Responder a esta mensagem"]') as HTMLElement)
    expect(props.setReplyingToMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }))

    fireEvent.click(container.querySelector('.hover-action-btn.delete-btn') as HTMLElement)
    expect(props.handleDeleteMessage).toHaveBeenCalledWith('m1')
  })

  it('quem não pode moderar não vê o botão de excluir na mensagem dos outros', () => {
    const props = makeProps({
      canUserDo: () => false,
      currentSpace: { id: 's1', name: 'Trupe', creator_id: 'outro' },
      filteredMessages: [message('m1', ANA, 0)]
    })
    const { container } = render(<MessageList {...props} />)
    expect(container.querySelector('.hover-action-btn.delete-btn')).toBeNull()
  })

  it('mostra reações com contagem, mensagem com falha e o botão de tentar de novo', () => {
    const failed = message('m2', ME, 5, { status: 'failed' })
    const props = makeProps({
      filteredMessages: [message('m1', ANA, 0), failed],
      messageReactions: { m1: { '🔥': [ME, ANA] } }
    })
    const { container } = render(<MessageList {...props} />)

    const pill = container.querySelector('.reaction-pill') as HTMLElement
    expect(pill.textContent).toBe('🔥2')
    expect(pill.classList.contains('reacted')).toBe(true)

    fireEvent.click(container.querySelector('.msg-retry-btn') as HTMLElement)
    expect(props.retrySendMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'm2' }))
  })

  it('o nome e a foto de quem escreveu vêm dos membros do espaço, não da presença', () => {
    const props = makeProps({
      filteredMessages: [message('m1', ANA, 0)],
      spaceMembers: [{ user: { id: ANA, display_name: 'Ana Real', avatar_url: 'https://x.test/ana.png' } }],
      presenceData: { [ANA]: { display_name: 'Impostor', avatar_url: 'https://x.test/falso.png' } }
    })
    const { container } = render(<MessageList {...props} />)

    expect(container.querySelector('.msg-meta strong')?.textContent).toBe('Ana Real')
    expect(container.querySelector('.msg-avatar img')?.getAttribute('src')).toBe('https://x.test/ana.png')
  })
})

describe('Animações dentro do chat', () => {
  // Bug real: as barrinhas do efeito de nome animavam `height`, cada mensagem crescia e encolhia uma fração
  // de pixel sem parar e o chat inteiro tremia. Dentro da lista, animação só pode usar transform e opacity.
  it('as barrinhas do efeito de nome não animam propriedades que mexem no layout', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/calls.css'), 'utf8')
    const keyframes = css.match(/@keyframes soundwaveBar\s*\{([\s\S]*?\})\s*\}/)
    expect(keyframes).not.toBeNull()
    const animated = [...keyframes![1].matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1])
    expect(animated.length).toBeGreaterThan(0)
    expect(animated.filter((prop) => !['transform', 'opacity'].includes(prop))).toEqual([])
  })
})
