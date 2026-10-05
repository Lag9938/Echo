import fs from 'node:fs'

// Modo de captura de tela do Chromium, escolhido na inicialização (são opções de linha de comando).
//
// "fast" (padrão): os quadros capturados ficam na placa de vídeo, como texturas, em vez de serem copiados
//   para a memória um a um. Essa cópia espera a placa de vídeo terminar o que está fazendo; com um jogo
//   ocupando a placa, cada captura demorava e o Chromium ainda espaça as capturas pelo dobro desse tempo.
//   Medido neste projeto (RTX 5060, tela inteira 1080p a 60, placa saturada por outro processo):
//     jogo a ~150 FPS: 32–35 FPS antes, 54–56 depois
//     jogo a ~77 FPS:  37–39 FPS antes, 45–57 depois
//     jogo a ~44 FPS:  28 FPS antes,    44–45 depois
//   Sem carga não muda (53–58 FPS nos dois) e a captura de janela continua em 60.
// "compat": como era antes, para a placa de vídeo ou driver que não se der bem com o modo novo.

export const CAPTURE_MODES = ['fast', 'compat']
export const DEFAULT_CAPTURE_MODE = 'fast'

const BASE_FEATURES = [
  'WindowsGraphicsCapture',
  'MediaFoundationD3D11VideoCapture',
  'PlatformHEVCDecoderSupport',
  'CanvasOopRasterization',
  'ZeroCopyVideoCapture'
]
const FAST_CAPTURE_FEATURES = ['ZeroCopyDesktopCapture', 'WebRtcAllowWgcUsingTexture']

/** Valor de --enable-features para o modo de captura */
export function captureFeatures(mode) {
  return (mode === 'compat' ? BASE_FEATURES : [...FAST_CAPTURE_FEATURES, ...BASE_FEATURES]).join(',')
}

/** Lê o modo salvo; arquivo ausente, ilegível ou com valor estranho vale o padrão */
export function readCaptureMode(file) {
  try {
    const mode = JSON.parse(fs.readFileSync(file, 'utf8'))?.mode
    return CAPTURE_MODES.includes(mode) ? mode : DEFAULT_CAPTURE_MODE
  } catch {
    return DEFAULT_CAPTURE_MODE
  }
}

/** Salva o modo (vale na próxima abertura do app). Devolve o modo salvo, ou null se o valor não existe. */
export function writeCaptureMode(file, mode) {
  if (!CAPTURE_MODES.includes(mode)) return null
  fs.writeFileSync(file, JSON.stringify({ mode }))
  return mode
}

// O modo com que ESTA execução do app foi aberta (para a tela dizer se a troca ainda depende de reiniciar)
let activeMode = DEFAULT_CAPTURE_MODE
export function setActiveCaptureMode(mode) { activeMode = mode }
export function getActiveCaptureMode() { return activeMode }
