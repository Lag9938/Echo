import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { captureFeatures, readCaptureMode, writeCaptureMode, DEFAULT_CAPTURE_MODE } from '../services/captureMode.js'

describe('modo de captura de tela', () => {
  const file = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'echo-capture-')), 'capture-mode.json')

  it('o padrão é o modo acelerado, com exatamente as opções que foram medidas', () => {
    // Estas duas opções juntas são o que manteve ~45–57 FPS de tela inteira com a placa de vídeo saturada
    // (contra 28–39 sem elas). ZeroCopyDesktopCapture sozinha não mudou nada na medição.
    expect(DEFAULT_CAPTURE_MODE).toBe('fast')
    expect(captureFeatures('fast')).toBe(
      'ZeroCopyDesktopCapture,WebRtcAllowWgcUsingTexture,WindowsGraphicsCapture,MediaFoundationD3D11VideoCapture,PlatformHEVCDecoderSupport,CanvasOopRasterization,ZeroCopyVideoCapture'
    )
  })

  it('o modo compatível volta exatamente às opções de antes', () => {
    expect(captureFeatures('compat')).toBe(
      'WindowsGraphicsCapture,MediaFoundationD3D11VideoCapture,PlatformHEVCDecoderSupport,CanvasOopRasterization,ZeroCopyVideoCapture'
    )
  })

  it('sem arquivo, com arquivo quebrado ou com valor estranho vale o padrão', () => {
    const f = file()
    expect(readCaptureMode(f)).toBe('fast')
    fs.writeFileSync(f, '{ isto não é json')
    expect(readCaptureMode(f)).toBe('fast')
    fs.writeFileSync(f, JSON.stringify({ mode: 'turbo' }))
    expect(readCaptureMode(f)).toBe('fast')
  })

  it('grava a escolha e lê de volta; valor inválido não é gravado', () => {
    const f = file()
    expect(writeCaptureMode(f, 'compat')).toBe('compat')
    expect(readCaptureMode(f)).toBe('compat')
    expect(writeCaptureMode(f, 'qualquer')).toBeNull()
    expect(readCaptureMode(f)).toBe('compat')
    expect(writeCaptureMode(f, 'fast')).toBe('fast')
    expect(readCaptureMode(f)).toBe('fast')
  })

  it('o app aplica o modo salvo na inicialização (antes de qualquer janela)', () => {
    const main = fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf8')
    expect(main).toContain("app.commandLine.appendSwitch('enable-features', captureFeatures(startupCaptureMode))")
    expect(main.split("appendSwitch('enable-features'").length).toBe(2)
  })
})
