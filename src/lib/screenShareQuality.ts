// Regras de qualidade da transmissão de tela: quanto de bitrate cada combinação de resolução e FPS pode
// usar, e quem pode transmitir a 60 FPS.

/** Fonte escolhida para transmitir (janela ou tela), como vem da lista do Electron */
export interface ShareSource {
  id?: string
  type?: string
  name?: string
  isGame?: boolean
}

export type ShareFps = 15 | 30 | 60

/**
 * Teto de bitrate do vídeo da transmissão, em bits por segundo.
 *   1080p ou mais: 8 Mbps a 60 FPS, 5 Mbps a 30 FPS ou menos
 *   720p:          5 Mbps a 60 FPS, 3 Mbps a 30 FPS ou menos
 * Antes eram 5 / 3 / 3 / 1,8 Mbps, pouco para jogo com muito movimento: o codificador mantém os quadros e
 * sacrifica a nitidez, então a imagem borrava nas cenas rápidas. O valor é um teto: tela parada usa bem menos.
 * `width` indefinido = resolução nativa da fonte, tratada como alta.
 */
export function screenShareBitrate(width: number | undefined, fps: number): number {
  const high = (width ?? 1920) > 1280
  const fast = fps >= 60
  if (high) return fast ? 8_000_000 : 5_000_000
  return fast ? 5_000_000 : 3_000_000
}

/**
 * Limites de taxa e de quadros para PUBLICAR a tela no LiveKit.
 * Vão nas duas opções de propósito: para uma faixa de tela o LiveKit lê só `screenShareEncoding` (e, se ela
 * faltar, aplica o padrão dele, de 15 FPS a 2,5 Mbps); `videoEncoding` fica para o caso de a faixa ser tratada
 * como vídeo comum.
 */
export function screenSharePublishEncoding(maxBitrate: number, maxFramerate: number) {
  const encoding = { maxBitrate, maxFramerate }
  return { videoEncoding: encoding, screenShareEncoding: encoding }
}

/**
 * 60 FPS só para jogos e telas inteiras. Janela de navegador, editor ou qualquer outro aplicativo fica em
 * no máximo 30 FPS: não ganha nada com 60 e gastaria o dobro de processamento e de rede.
 */
export function isSixtyFpsAllowed(source: ShareSource | null | undefined, sourceId?: string | null): boolean {
  const id = sourceId ?? source?.id ?? ''
  const isScreen = source?.type === 'screen' || id.startsWith('screen:')
  const isGame = Boolean(source?.isGame || (source?.name || '').toLowerCase().includes('(jogo)'))
  return isScreen || isGame
}

/** O FPS que de fato vale para a fonte: o pedido, limitado a 30 quando 60 não é permitido */
export function effectiveShareFps(requested: ShareFps, source: ShareSource | null | undefined, sourceId?: string | null): ShareFps {
  if (requested === 60 && !isSixtyFpsAllowed(source, sourceId)) return 30
  return requested
}
