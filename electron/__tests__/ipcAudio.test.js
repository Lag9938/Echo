// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupAudioIpc, stopAudioCapture } from '../ipc/audio.js'

describe('Electron IPC - Audio Capture', () => {
  let handlers = {}
  let mockMainWindow
  const safeHandle = (channel, handler) => {
    handlers[channel] = handler
  }

  beforeEach(() => {
    handlers = {}
    mockMainWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: {
        send: vi.fn()
      }
    }
    setupAudioIpc(safeHandle, () => mockMainWindow, process.cwd(), true)
  })

  it('registra os canais de captura e parada de áudio', () => {
    expect(handlers['start-process-audio-capture']).toBeTypeOf('function')
    expect(handlers['stop-process-audio-capture']).toBeTypeOf('function')
  })

  it('rejeita sourceId nulo ou inválido', async () => {
    const result = await handlers['start-process-audio-capture'](null, null)
    expect(result).toEqual({ success: false, reason: 'Invalid sourceId' })
  })

  it('rejeita tipo de source não suportado', async () => {
    const result = await handlers['start-process-audio-capture'](null, 'custom:unsupported-device')
    expect(result).toEqual({ success: false, reason: 'Unsupported source type' })
  })

  it('rejeita window sem HWND especificado', async () => {
    const result = await handlers['start-process-audio-capture'](null, 'window:')
    expect(result).toEqual({ success: false, reason: 'Invalid HWND' })
  })

  it('para o processo de captura de áudio com sucesso', async () => {
    const result = await handlers['stop-process-audio-capture']()
    expect(result).toEqual({ success: true })
  })
})
