import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEchoAutoUpdate } from '../useEchoAutoUpdate'
import { useEchoInviteLinks } from '../useEchoInviteLinks'
import { useEchoNotificationNavigation } from '../useEchoNotificationNavigation'

afterEach(() => {
  delete (window as any).electronAPI
})

describe('useEchoAutoUpdate', () => {
  it('acompanha a atualização: baixando com progresso, depois pronta', () => {
    const handlers: Record<string, (payload: any) => void> = {}
    ;(window as any).electronAPI = {
      onUpdateAvailable: (cb: any) => { handlers.available = cb },
      onUpdateProgress: (cb: any) => { handlers.progress = cb },
      onUpdateReady: (cb: any) => { handlers.ready = cb }
    }
    const { result } = renderHook(() => useEchoAutoUpdate())
    expect(result.current).toEqual({ updateStatus: 'idle', updateVersion: '', updateProgress: 0 })

    act(() => handlers.available({ version: '0.52.0' }))
    act(() => handlers.progress({ percent: 42 }))
    expect(result.current).toEqual({ updateStatus: 'downloading', updateVersion: '0.52.0', updateProgress: 42 })

    act(() => handlers.ready({ version: '0.52.0' }))
    expect(result.current.updateStatus).toBe('ready')
  })

  it('fora do Electron fica parado em "idle"', () => {
    const { result } = renderHook(() => useEchoAutoUpdate())
    expect(result.current.updateStatus).toBe('idle')
  })
})

describe('useEchoInviteLinks', () => {
  let process: ReturnType<typeof vi.fn<(url: string) => Promise<void>>>
  let deepLink: (url: string) => void
  let initialUrl: string | null

  beforeEach(() => {
    process = vi.fn().mockResolvedValue(undefined)
    initialUrl = null
    deepLink = () => {}
    ;(window as any).electronAPI = {
      onDeepLinkInvite: (cb: (url: string) => void) => { deepLink = cb },
      getInitialInviteUrl: () => Promise.resolve(initialUrl)
    }
  })

  const render = (userId: string | undefined) => {
    const processSpaceInviteRef = { current: process as ((url: string) => Promise<void>) | null }
    return renderHook(({ id }: { id: string | undefined }) => useEchoInviteLinks({ userId: id, processSpaceInviteRef }), {
      initialProps: { id: userId }
    })
  }

  it('convite colado dentro do app (evento) é processado', () => {
    render('me')
    act(() => { window.dispatchEvent(new CustomEvent('echo-process-invite', { detail: { input: 'echo://invite/abc123defg' } })) })
    expect(process).toHaveBeenCalledWith('echo://invite/abc123defg')
  })

  it('link aberto pelo sistema é processado; texto que não é convite é ignorado', () => {
    render('me')
    act(() => deepLink('echo://invite/abc123defg'))
    act(() => deepLink('https://exemplo.test/qualquer-coisa'))
    expect(process.mock.calls).toEqual([['echo://invite/abc123defg']])
  })

  it('o app aberto por um link de convite processa esse link ao iniciar', async () => {
    initialUrl = 'https://lag9938.github.io/Echo/invite?code=abc123defg'
    render('me')
    await waitFor(() => expect(process).toHaveBeenCalledWith(initialUrl))
  })

  it('convite que chega antes do login espera e é processado uma vez quando a pessoa entra', () => {
    const { rerender } = render(undefined)
    act(() => deepLink('echo://invite/abc123defg'))
    expect(process).not.toHaveBeenCalled()

    rerender({ id: 'me' })
    expect(process).toHaveBeenCalledTimes(1)
    expect(process).toHaveBeenCalledWith('echo://invite/abc123defg')

    rerender({ id: 'me' })
    expect(process).toHaveBeenCalledTimes(1)
  })
})

describe('useEchoNotificationNavigation', () => {
  const geral = { id: 't1', name: 'geral', type: 'text', space_id: 's1' } as any
  let clicked: (data: any) => void

  const makeOptions = () => ({
    spaces: [{ id: 's1', name: 'Trupe' }] as any[],
    spaceChannelsRef: { current: { s1: [geral] } },
    handleOpenDirectChat: vi.fn(),
    handleOpenGroup: vi.fn(),
    setExpandedSpace: vi.fn(),
    setSelectedChannel: vi.fn(),
    setPage: vi.fn()
  })

  beforeEach(() => {
    clicked = () => {}
    ;(window as any).electronAPI = { onNotificationClicked: (cb: (data: any) => void) => { clicked = cb } }
  })

  it('notificação de DM abre a conversa na página de amigos', () => {
    const options = makeOptions()
    renderHook(() => useEchoNotificationNavigation(options))
    act(() => clicked({ type: 'dm', senderId: 'ana' }))
    expect(options.handleOpenDirectChat).toHaveBeenCalledWith('ana')
    expect(options.setPage).toHaveBeenCalledWith('Amigos')
  })

  it('notificação de grupo abre o grupo', () => {
    const options = makeOptions()
    renderHook(() => useEchoNotificationNavigation(options))
    act(() => clicked({ type: 'group', groupId: 'g1' }))
    expect(options.handleOpenGroup).toHaveBeenCalledWith('g1')
    expect(options.setPage).toHaveBeenCalledWith('Amigos')
  })

  it('notificação de canal expande o espaço, seleciona o canal e vai para os servidores', () => {
    const options = makeOptions()
    renderHook(() => useEchoNotificationNavigation(options))
    act(() => clicked({ type: 'channel', channelId: 't1' }))
    expect(options.setExpandedSpace).toHaveBeenCalledWith('s1')
    expect(options.setSelectedChannel).toHaveBeenCalledWith(geral)
    expect(options.setPage).toHaveBeenCalledWith('Servidores')
  })

  it('canal que não existe mais, ou notificação vazia, não navega', () => {
    const options = makeOptions()
    renderHook(() => useEchoNotificationNavigation(options))
    act(() => clicked({ type: 'channel', channelId: 'sumiu' }))
    act(() => clicked(null))
    expect(options.setPage).not.toHaveBeenCalled()
  })

  it('a notificação do próprio app (evento) navega igual e para de ouvir ao sair', () => {
    delete (window as any).electronAPI
    const options = makeOptions()
    const { unmount } = renderHook(() => useEchoNotificationNavigation(options))
    act(() => { window.dispatchEvent(new CustomEvent('echo-notification-clicked', { detail: { type: 'dm', senderId: 'ana' } })) })
    expect(options.handleOpenDirectChat).toHaveBeenCalledTimes(1)

    unmount()
    act(() => { window.dispatchEvent(new CustomEvent('echo-notification-clicked', { detail: { type: 'dm', senderId: 'ana' } })) })
    expect(options.handleOpenDirectChat).toHaveBeenCalledTimes(1)
  })
})
