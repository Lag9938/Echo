import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEchoAutoUpdate } from '../useEchoAutoUpdate'

function fakeApi(initial?: { status: 'idle' | 'downloading' | 'ready'; version: string; percent: number }) {
  const handlers: Record<string, (payload: any) => void> = {}
  const api = {
    onUpdateAvailable: vi.fn((cb) => { handlers.available = cb }),
    onUpdateProgress: vi.fn((cb) => { handlers.progress = cb }),
    onUpdateReady: vi.fn((cb) => { handlers.ready = cb }),
    getUpdateState: vi.fn(async () => initial),
    ackUpdateReady: vi.fn()
  }
  ;(window as any).electronAPI = api
  return { api, handlers }
}

describe('useEchoAutoUpdate', () => {
  afterEach(() => { delete (window as any).electronAPI })

  it('atualização pronta: mostra o aviso e confirma ao processo principal', () => {
    const { api, handlers } = fakeApi({ status: 'idle', version: '', percent: 0 })
    const { result } = renderHook(() => useEchoAutoUpdate())
    act(() => handlers.ready({ version: '2.0.0' }))
    expect(result.current.updateStatus).toBe('ready')
    expect(result.current.updateVersion).toBe('2.0.0')
    // Sem esta confirmação o processo principal assume e abre uma janela do sistema
    expect(api.ackUpdateReady).toHaveBeenCalledWith('2.0.0')
  })

  it('a atualização já estava pronta antes de a tela carregar: busca o estado e mostra o aviso', async () => {
    // Bug real: o aviso era enviado uma vez só; se a tela ainda não estava ouvindo, ele se perdia
    const { api } = fakeApi({ status: 'ready', version: '2.0.0', percent: 100 })
    const { result } = renderHook(() => useEchoAutoUpdate())
    await vi.waitFor(() => expect(result.current.updateStatus).toBe('ready'))
    expect(result.current.updateVersion).toBe('2.0.0')
    expect(api.ackUpdateReady).toHaveBeenCalledWith('2.0.0')
  })

  it('download em andamento ao abrir: mostra o progresso, sem confirmar nada', async () => {
    const { api } = fakeApi({ status: 'downloading', version: '2.0.0', percent: 40 })
    const { result } = renderHook(() => useEchoAutoUpdate())
    await vi.waitFor(() => expect(result.current.updateStatus).toBe('downloading'))
    expect(result.current.updateProgress).toBe(40)
    expect(api.ackUpdateReady).not.toHaveBeenCalled()
  })

  it('o estado buscado ao abrir não desfaz um "pronta" que já chegou', async () => {
    const { handlers } = fakeApi({ status: 'downloading', version: '2.0.0', percent: 40 })
    const { result } = renderHook(() => useEchoAutoUpdate())
    act(() => handlers.ready({ version: '2.0.0' }))
    await act(async () => { await Promise.resolve() })
    expect(result.current.updateStatus).toBe('ready')
  })

  it('fora do Electron (ou num Electron mais antigo, sem as funções novas) não quebra', () => {
    expect(() => renderHook(() => useEchoAutoUpdate())).not.toThrow()
    const handlers: Record<string, (payload: any) => void> = {}
    ;(window as any).electronAPI = {
      onUpdateAvailable: (cb: any) => { handlers.available = cb },
      onUpdateProgress: () => {},
      onUpdateReady: (cb: any) => { handlers.ready = cb }
    }
    const { result } = renderHook(() => useEchoAutoUpdate())
    act(() => handlers.ready({ version: '2.0.0' }))
    expect(result.current.updateStatus).toBe('ready')
  })
})
