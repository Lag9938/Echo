// Orçamento de vídeos de decoração tocando ao mesmo tempo.
//
// Cada decoração de avatar em vídeo é um <video> com canal alfa (WebM VP9), que o Chromium decodifica no processador
// (não existe decodificação por placa de vídeo para vídeo com transparência) e ainda recompõe a cada quadro. Medido no
// app: 19 vídeos tocando custaram ~1 núcleo inteiro. Numa lista de membros onde todo mundo usa a mesma decoração, tocar
// todos é o que fazia o Echo consumir 20% da CPU.
//
// Por isso só alguns vídeos tocam de verdade ao mesmo tempo; os demais ficam parados num quadro bonito (o anel inteiro).
// Quando um deles sai da tela (ou some), o lugar passa para o próximo da fila.

export const MAX_PLAYING_VIDEO_DECORATIONS = 3

const active = new Set<object>()
const waiting = new Map<object, () => void>()

/** Pede um lugar para tocar. Devolve true se já pode tocar; senão `onGranted` é chamado quando sobrar um lugar. */
export function acquireVideoSlot(token: object, onGranted: () => void): boolean {
  if (active.has(token)) return true
  if (active.size < MAX_PLAYING_VIDEO_DECORATIONS) {
    waiting.delete(token)
    active.add(token)
    return true
  }
  waiting.set(token, onGranted)
  return false
}

/** Devolve o lugar (ou sai da fila) e passa o lugar ao próximo que esperava */
export function releaseVideoSlot(token: object): void {
  const had = active.delete(token)
  waiting.delete(token)
  if (!had) return
  while (active.size < MAX_PLAYING_VIDEO_DECORATIONS && waiting.size > 0) {
    const [next, granted] = waiting.entries().next().value as [object, () => void]
    waiting.delete(next)
    active.add(next)
    granted()
  }
}

/** Só para testes */
export function resetVideoSlots(): void {
  active.clear()
  waiting.clear()
}
