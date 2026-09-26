// Operações puras sobre a fila de reprodução (sem I/O), para poderem ser testadas.
//
// Cada item da fila é { id, url, title }. A fila também aceita itens antigos que sejam só uma string.
// O `id` (q1, q2, ...) é estável: o painel do app remove/promove por id, assim o comando continua
// correto mesmo que a fila ande (uma música começar a tocar) entre o clique e a chegada do comando.

const ID_RE = /^q\d+$/i

/** Cria um item de fila com id novo. `session.seq` é o contador da sessão. */
export function newQueueItem(session, { url, title }) {
  session.seq = (session.seq || 0) + 1
  return { id: `q${session.seq}`, url, title: title || null }
}

/** Texto para mostrar no chat/painel: título se houver, senão a URL/consulta. */
export function queueLabel(item) {
  if (item && typeof item === 'object') return item.title || item.url || 'Música'
  return String(item ?? 'Música')
}

/**
 * Localiza um item da fila por posição (1, 2, 3...) ou por id (q7 ou #q7).
 * Devolve o índice (base 0) ou -1 se não existir.
 */
export function findQueueIndex(queue, ref) {
  const text = String(ref ?? '').trim()
  if (!text) return -1

  if (/^\d+$/.test(text)) {
    const index = parseInt(text, 10) - 1
    return index >= 0 && index < queue.length ? index : -1
  }

  const id = text.replace(/^#/, '')
  if (!ID_RE.test(id)) return -1
  return queue.findIndex(item => item && typeof item === 'object' && String(item.id).toLowerCase() === id.toLowerCase())
}

/** Remove o item do índice e o devolve. */
export function removeAt(queue, index) {
  const [removed] = queue.splice(index, 1)
  return removed
}

/** Move o item do índice para o início da fila ("tocar em seguida") e o devolve. */
export function moveToFront(queue, index) {
  const [item] = queue.splice(index, 1)
  queue.unshift(item)
  return item
}
