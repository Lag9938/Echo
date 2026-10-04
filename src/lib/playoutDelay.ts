// Reserva de reprodução ("jitter buffer") de uma faixa recebida pelo WebRTC: quanto o navegador guarda
// antes de tocar/mostrar. Mais reserva = reprodução mais constante quando a rede oscila, e mais atraso.

interface DelayableTrack {
  setPlayoutDelay?: (seconds: number) => void
  receiver?: { playoutDelayHint?: number; jitterBufferTarget?: number | null } | null
}

/**
 * Pede ao navegador uma reserva de `delayMs` para a faixa. Usa as três formas que existem (a do LiveKit e
 * as duas do WebRTC, a antiga em segundos e a atual em milissegundos), porque nem toda versão tem todas.
 * Nunca lança erro: se o navegador recusar, a faixa só fica sem a reserva.
 */
export function setTrackPlayoutDelay(track: DelayableTrack | null | undefined, delayMs: number): void {
  if (!track) return
  const ms = Math.max(0, Number.isFinite(delayMs) ? delayMs : 0)
  const seconds = ms / 1000
  try {
    if (typeof track.setPlayoutDelay === 'function') track.setPlayoutDelay(seconds)
  } catch {
    // segue para o receptor
  }
  const receiver = track.receiver
  if (!receiver) return
  try {
    if ('playoutDelayHint' in receiver) receiver.playoutDelayHint = seconds
    if ('jitterBufferTarget' in receiver) receiver.jitterBufferTarget = ms
  } catch {
    // o navegador recusou o valor: fica como estava
  }
}

/**
 * Reservas de uma transmissão de tela que este app assiste. O vídeo leva a "fluidez" escolhida; o áudio
 * leva a mesma coisa mais o ajuste manual de sincronia labial, para o som não chegar antes da imagem.
 */
export function screenPlayoutDelays(smoothingMs: number, audioSyncDelayMs: number): { videoMs: number; audioMs: number } {
  const smoothing = Math.max(0, smoothingMs || 0)
  return { videoMs: smoothing, audioMs: smoothing + Math.max(0, audioSyncDelayMs || 0) }
}
