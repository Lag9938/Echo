import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

const insert = vi.hoisted(() => vi.fn())

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: () => ({ insert }) },
  isSupabaseConfigured: true
}))

import { MusicBotModal } from '../MusicBotModal'
import { MusicBotParticipantCard } from '../../voice/MusicBotParticipantCard'
import { useMusicBotStore } from '../../../stores/useMusicBotStore'
import type { MusicBotState } from '../../../lib/musicBotState'

const CHANNEL = 'c1'
const ME = 'me'

const playing = (overrides: Partial<MusicBotState> = {}): MusicBotState => ({
  v: 1,
  status: 'playing',
  current: { title: 'Motley Crew', url: 'https://x.test/1', durationSeconds: 180 },
  positionMs: 30_000,
  queue: [{ id: 'q7', title: 'Próxima Faixa', url: 'https://x.test/2', durationSeconds: 200 }],
  queueTotal: 1,
  history: [],
  volume: 100,
  liveVolume: true,
  ...overrides
} as MusicBotState)

const sentCommands = () => insert.mock.calls.map(([row]) => row.body)

describe('Painel do bot de música', () => {
  beforeEach(() => {
    localStorage.clear()
    insert.mockResolvedValue({ error: null })
    act(() => {
      useMusicBotStore.getState().setMyVolume(100)
      useMusicBotStore.getState().update(true, playing())
    })
  })

  const open = () => render(<MusicBotModal isOpen onClose={vi.fn()} channelId={CHANNEL} userId={ME} channelName="Callzinha" />)

  it('fechado não desenha nada', () => {
    const { container } = render(<MusicBotModal isOpen={false} onClose={vi.fn()} channelId={CHANNEL} userId={ME} />)
    expect(container.firstChild).toBeNull()
  })

  it('pedir música manda "!play" no canal, em nome de quem pediu', async () => {
    open()
    fireEvent.change(screen.getByLabelText('Link ou nome da música'), { target: { value: '  never gonna give you up ' } })
    fireEvent.click(screen.getByText('Tocar'))

    await waitFor(() => expect(insert).toHaveBeenCalledWith({ channel_id: CHANNEL, author_id: ME, body: '!play never gonna give you up' }))
  })

  it('sem nada digitado, avisa e não manda comando', () => {
    open()
    fireEvent.click(screen.getByText('Tocar'))
    expect(screen.getByText('Cole um link ou digite o nome da música.')).toBeTruthy()
    expect(insert).not.toHaveBeenCalled()
  })

  it('pausar, pular e parar mandam o comando certo', async () => {
    open()
    fireEvent.click(screen.getByLabelText('Pausar'))
    await waitFor(() => expect(sentCommands()).toContain('!pause'))
    fireEvent.click(screen.getByLabelText('Pular'))
    await waitFor(() => expect(sentCommands()).toContain('!skip'))
    fireEvent.click(screen.getByLabelText('Parar e desconectar o bot'))
    await waitFor(() => expect(sentCommands()).toContain('!stop'))
  })

  it('o volume do painel é individual: muda só aqui e não manda nada para o bot', () => {
    open()
    fireEvent.change(screen.getByLabelText('Volume do bot para você'), { target: { value: '40' } })

    expect(useMusicBotStore.getState().myVolume).toBe(40)
    expect(insert).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText('Silenciar só para mim'))
    expect(useMusicBotStore.getState().myVolume).toBe(0)
    fireEvent.click(screen.getByLabelText('Restaurar volume'))
    expect(useMusicBotStore.getState().myVolume).toBe(40)
    expect(insert).not.toHaveBeenCalled()
  })

  it('volume geral fora de 100% aparece com o botão de voltar, que manda "!volume 100"', async () => {
    act(() => useMusicBotStore.getState().update(true, playing({ volume: 30 })))
    open()

    expect(screen.getByText(/O volume geral do bot está em 30% para todos/)).toBeTruthy()
    fireEvent.click(screen.getByText('Voltar para 100%'))
    await waitFor(() => expect(sentCommands()).toContain('!volume 100'))
  })

  it('remover da fila usa o id da faixa, não a posição', async () => {
    open()
    fireEvent.click(screen.getByLabelText('Remover da fila: Próxima Faixa'))
    await waitFor(() => expect(sentCommands()).toContain('!remove q7'))
  })

  it('erro ao enviar o comando aparece no painel', async () => {
    insert.mockResolvedValue({ error: { message: 'permissão negada' } })
    open()
    fireEvent.click(screen.getByLabelText('Pular'))
    expect(await screen.findByText(/Não foi possível enviar o comando/)).toBeTruthy()
  })
})

describe('Cartão do bot de música na chamada', () => {
  beforeEach(() => {
    localStorage.clear()
    insert.mockResolvedValue({ error: null })
    act(() => {
      useMusicBotStore.getState().setMyVolume(100)
      useMusicBotStore.getState().update(true, playing())
    })
  })

  const renderCard = (handlers: { onOpenModal?: () => void; onOpenAvatarPicker?: () => void } = {}) =>
    render(
      <MusicBotParticipantCard
        participant={{ userId: 'music-bot-c1', displayName: 'Echo Music Bot', isSpeaking: true } as any}
        channelId={CHANNEL}
        userId={ME}
        onOpenModal={handlers.onOpenModal ?? vi.fn()}
        onOpenAvatarPicker={handlers.onOpenAvatarPicker ?? vi.fn()}
      />
    )

  it('mostra a faixa atual e o estado', () => {
    const { container } = renderCard()
    expect(container.textContent).toContain('Motley Crew')
    expect(container.textContent).toContain('TOCANDO')
  })

  it('clicar no cartão abre o painel; os botões rápidos não abrem', async () => {
    const onOpenModal = vi.fn()
    const { container } = renderCard({ onOpenModal })

    fireEvent.click(screen.getByTitle('Pausar música'))
    await waitFor(() => expect(sentCommands()).toEqual(['!pause']))
    fireEvent.click(screen.getByTitle('Pular faixa (!skip)'))
    await waitFor(() => expect(sentCommands()).toEqual(['!pause', '!skip']))
    expect(onOpenModal).not.toHaveBeenCalled()

    fireEvent.click(container.querySelector('.music-bot-card') as HTMLElement)
    expect(onOpenModal).toHaveBeenCalledTimes(1)
  })

  it('pausado, o botão rápido manda "!resume"', async () => {
    act(() => useMusicBotStore.getState().update(true, playing({ status: 'paused' })))
    renderCard()
    fireEvent.click(screen.getByTitle('Continuar música'))
    await waitFor(() => expect(sentCommands()).toEqual(['!resume']))
  })

  it('clicar no ícone do bot abre a escolha de ícone, não o painel', () => {
    const onOpenModal = vi.fn()
    const onOpenAvatarPicker = vi.fn()
    renderCard({ onOpenModal, onOpenAvatarPicker })

    fireEvent.click(screen.getByTitle('Clique para trocar o ícone do bot'))
    expect(onOpenAvatarPicker).toHaveBeenCalledTimes(1)
    expect(onOpenModal).not.toHaveBeenCalled()
  })
})
