// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupWindowIpc } from '../ipc/window.js'
import { app, shell, desktopCapturer } from 'electron'

vi.mock('electron', () => ({
  app: {
    quit: vi.fn(),
    getPath: vi.fn().mockReturnValue('C:\\EchoMockPath')
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(true)
  },
  desktopCapturer: {
    getSources: vi.fn().mockResolvedValue([{ id: 'screen:1', name: 'Tela 1' }])
  },
  Notification: class {
    show = vi.fn()
  }
}))

describe('Electron IPC - Window & Lifecycle', () => {
  let handlers = {}
  let mockMainWindow
  let isQuittingState = false
  const safeHandle = (channel, handler) => {
    handlers[channel] = handler
  }
  const setIsQuitting = (flag) => {
    isQuittingState = flag
  }

  beforeEach(() => {
    handlers = {}
    isQuittingState = false
    mockMainWindow = {
      minimize: vi.fn(),
      maximize: vi.fn(),
      unmaximize: vi.fn(),
      isMaximized: vi.fn().mockReturnValue(false),
      close: vi.fn(),
      isFullScreen: vi.fn().mockReturnValue(false),
      setFullScreen: vi.fn().mockImplementation((flag) => {
        mockMainWindow.isFullScreen.mockReturnValue(flag)
      }),
      isDestroyed: vi.fn().mockReturnValue(false)
    }
    vi.clearAllMocks()

    setupWindowIpc(safeHandle, () => mockMainWindow, setIsQuitting, process.cwd(), true)
  })

  it('registra todos os canais fundamentais de controle de janela', () => {
    expect(handlers['window-minimize']).toBeTypeOf('function')
    expect(handlers['window-maximize']).toBeTypeOf('function')
    expect(handlers['window-close']).toBeTypeOf('function')
    expect(handlers['app-quit']).toBeTypeOf('function')
    expect(handlers['window-is-maximized']).toBeTypeOf('function')
    expect(handlers['window-set-fullscreen']).toBeTypeOf('function')
    expect(handlers['shell:openExternal']).toBeTypeOf('function')
    expect(handlers['get-sources']).toBeTypeOf('function')
  })

  it('chama minimize() no evento window-minimize', () => {
    handlers['window-minimize']()
    expect(mockMainWindow.minimize).toHaveBeenCalled()
  })

  it('alterna entre maximize() e unmaximize() no evento window-maximize', () => {
    // Quando não maximizado -> maximize
    mockMainWindow.isMaximized.mockReturnValue(false)
    handlers['window-maximize']()
    expect(mockMainWindow.maximize).toHaveBeenCalled()

    // Quando já maximizado -> unmaximize
    mockMainWindow.isMaximized.mockReturnValue(true)
    handlers['window-maximize']()
    expect(mockMainWindow.unmaximize).toHaveBeenCalled()
  })

  it('fecha a janela no evento window-close', () => {
    handlers['window-close']()
    expect(mockMainWindow.close).toHaveBeenCalled()
  })

  it('define flag de saída e encerra o app no evento app-quit', () => {
    handlers['app-quit']()
    expect(isQuittingState).toBe(true)
    expect(app.quit).toHaveBeenCalled()
  })

  it('altera estado de tela cheia no evento window-set-fullscreen', () => {
    const res = handlers['window-set-fullscreen'](null, true)
    expect(mockMainWindow.setFullScreen).toHaveBeenCalledWith(true)
    expect(res).toBe(true)
  })

  it('shell:openExternal abre links seguros (https://, http://, mailto:)', async () => {
    const validUrl = 'https://echo.gg/invite'
    const success = await handlers['shell:openExternal'](null, validUrl)

    expect(success).toBe(true)
    expect(shell.openExternal).toHaveBeenCalledWith(validUrl)
  })

  it('shell:openExternal bloqueia protocolos potencialmente perigosos (file://, javascript:)', async () => {
    const unsafeUrl = 'file:///C:/Windows/System32/cmd.exe'
    const success = await handlers['shell:openExternal'](null, unsafeUrl)

    expect(success).toBe(false)
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('get-sources obtém lista de telas e janelas capturáveis', async () => {
    const sources = await handlers['get-sources']()
    expect(desktopCapturer.getSources).toHaveBeenCalled()
    expect(sources[0]).toMatchObject({ id: 'screen:1', name: 'Tela 1', type: 'screen' })
  })

  it('gerencia flash-frame na janela principal', () => {
    mockMainWindow.flashFrame = vi.fn()
    const res = handlers['flash-frame'](null, true)
    expect(mockMainWindow.flashFrame).toHaveBeenCalledWith(true)
    expect(res).toEqual({ success: true })

    handlers['flash-frame'](null, false)
    expect(mockMainWindow.flashFrame).toHaveBeenCalledWith(false)
  })

  it('gerencia set-badge-count no app', () => {
    app.setBadgeCount = vi.fn()
    const res = handlers['set-badge-count'](null, 5)
    expect(app.setBadgeCount).toHaveBeenCalledWith(5)
    expect(res).toEqual({ success: true, count: 5 })
  })
})
