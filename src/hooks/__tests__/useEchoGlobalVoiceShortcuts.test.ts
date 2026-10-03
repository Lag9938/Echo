import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEchoGlobalVoiceShortcuts } from '../useEchoGlobalVoiceShortcuts'

type Toggle = (action: string) => void

describe('useEchoGlobalVoiceShortcuts', () => {
  let api: {
    registerGlobalVoiceShortcut: ReturnType<typeof vi.fn>
    unregisterGlobalVoiceShortcut: ReturnType<typeof vi.fn>
    onGlobalVoiceToggle: ReturnType<typeof vi.fn>
  }
  let press: Toggle
  let removeListener: ReturnType<typeof vi.fn>

  const makeOptions = (overrides: Record<string, unknown> = {}) => ({
    handleToggleMute: vi.fn(),
    handleToggleDeafen: vi.fn(),
    toggleAiDenoise: vi.fn(),
    isAiDenoiseEnabled: false,
    showToast: vi.fn(),
    ...overrides
  })

  beforeEach(() => {
    localStorage.clear()
    removeListener = vi.fn()
    press = () => {}
    api = {
      registerGlobalVoiceShortcut: vi.fn().mockResolvedValue({ success: true }),
      unregisterGlobalVoiceShortcut: vi.fn(),
      onGlobalVoiceToggle: vi.fn((callback: Toggle) => {
        press = callback
        return removeListener
      })
    }
    ;(window as any).electronAPI = api
  })

  afterEach(() => {
    delete (window as any).electronAPI
  })

  it('registra as três teclas padrão ao abrir', async () => {
    renderHook(() => useEchoGlobalVoiceShortcuts(makeOptions()))

    await waitFor(() => expect(api.registerGlobalVoiceShortcut).toHaveBeenCalledTimes(3))
    expect(api.registerGlobalVoiceShortcut.mock.calls).toEqual([
      ['toggle-mute', 'F8'],
      ['toggle-deafen', 'F9'],
      ['toggle-ai-denoise', 'F7']
    ])
  })

  it('usa as teclas salvas e desregistra a que está como "none"', async () => {
    localStorage.setItem('echo-shortcut-mute', 'F10')
    localStorage.setItem('echo-shortcut-deafen', 'none')
    renderHook(() => useEchoGlobalVoiceShortcuts(makeOptions()))

    await waitFor(() => expect(api.registerGlobalVoiceShortcut).toHaveBeenCalledWith('toggle-mute', 'F10'))
    expect(api.unregisterGlobalVoiceShortcut).toHaveBeenCalledWith('toggle-deafen')
    expect(api.registerGlobalVoiceShortcut).not.toHaveBeenCalledWith('toggle-deafen', expect.anything())
  })

  it('tecla recusada avisa uma vez só, mesmo com a tela renderizando de novo várias vezes', async () => {
    // Bug real: o aviso renderizava a tela, a tela registrava de novo, e o aviso aparecia sem parar
    api.registerGlobalVoiceShortcut.mockImplementation(async (action: string) => ({ success: action !== 'toggle-ai-denoise' }))
    const showToast = vi.fn()
    let options = makeOptions({ showToast })
    const { rerender } = renderHook(() => useEchoGlobalVoiceShortcuts(options))

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1))
    expect(showToast.mock.calls[0][0]).toBe('Atalho não pôde ser ativado')
    expect(showToast.mock.calls[0][1]).toContain('"F7"')

    for (let i = 0; i < 5; i++) {
      // Como no app: as ações mudam de identidade a cada renderização
      options = makeOptions({ showToast })
      rerender()
    }
    await act(async () => { await Promise.resolve() })

    expect(api.registerGlobalVoiceShortcut).toHaveBeenCalledTimes(3)
    expect(showToast).toHaveBeenCalledTimes(1)
  })

  it('trocar a tecla registra de novo; se a nova também for recusada, avisa de novo', async () => {
    api.registerGlobalVoiceShortcut.mockImplementation(async (action: string) => ({ success: action !== 'toggle-mute' }))
    const showToast = vi.fn()
    const { result } = renderHook(() => useEchoGlobalVoiceShortcuts(makeOptions({ showToast })))
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1))

    act(() => result.current.setMuteShortcut('F4'))

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(2))
    expect(api.registerGlobalVoiceShortcut).toHaveBeenCalledWith('toggle-mute', 'F4')
    expect(showToast.mock.calls[1][1]).toContain('"F4"')
  })

  it('o ouvinte é inscrito uma vez e sempre chama a ação mais recente', () => {
    const first = makeOptions()
    let options = first
    const { rerender, unmount } = renderHook(() => useEchoGlobalVoiceShortcuts(options))

    const latest = makeOptions()
    options = latest
    rerender()

    act(() => press('toggle-mute'))
    act(() => press('toggle-deafen'))

    expect(api.onGlobalVoiceToggle).toHaveBeenCalledTimes(1)
    expect(first.handleToggleMute).not.toHaveBeenCalled()
    expect(latest.handleToggleMute).toHaveBeenCalledTimes(1)
    expect(latest.handleToggleDeafen).toHaveBeenCalledTimes(1)

    unmount()
    expect(removeListener).toHaveBeenCalledTimes(1)
  })

  it('a tecla do filtro de ruído alterna o filtro e avisa o novo estado', () => {
    let options = makeOptions({ isAiDenoiseEnabled: false })
    const { rerender } = renderHook(() => useEchoGlobalVoiceShortcuts(options))

    act(() => press('toggle-ai-denoise'))
    expect(options.toggleAiDenoise).toHaveBeenCalledTimes(1)
    expect(options.showToast).toHaveBeenCalledWith('Filtro de Ruído IA', 'Supressão por IA Ativada', 'info')

    options = makeOptions({ isAiDenoiseEnabled: true })
    rerender()
    act(() => press('toggle-ai-denoise'))
    expect(options.showToast).toHaveBeenCalledWith('Filtro de Ruído IA', 'Supressão por IA Desativada', 'info')
  })

  it('fora do Electron (sem a API) não faz nada e não quebra', () => {
    delete (window as any).electronAPI
    const { result } = renderHook(() => useEchoGlobalVoiceShortcuts(makeOptions()))
    expect(result.current.muteShortcut).toBe('F8')
  })
})
