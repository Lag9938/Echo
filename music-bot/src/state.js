// Estado do bot publicado para o app do Echo.
//
// O bot escreve um JSON nos metadados do próprio participante do LiveKit. O app já está na mesma sala e
// recebe a mudança em tempo real (evento ParticipantMetadataChanged), sem tabela nem migração no banco —
// e só quem está na chamada enxerga.
//
// Se mudar o formato, aumente STATE_VERSION: o app ignora versões que não conhece.

import { queueLabel } from './queueOps.js'

export const STATE_VERSION = 1

const MAX_QUEUE = 30
const MAX_HISTORY = 8
const MAX_TITLE = 90
const MAX_URL = 300
const MIN_PUBLISH_INTERVAL_MS = 300

const truncate = (text, max) => {
  const value = String(text ?? '')
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

/** Posição atual da faixa em ms, descontando o tempo em que ficou pausada. */
export function getPositionMs(session, now = Date.now()) {
  if (!session.current || session.trackStartedAt == null) return 0
  const end = session.paused && session.pausedAt != null ? session.pausedAt : now
  return Math.max(0, end - session.trackStartedAt - (session.pausedTotalMs || 0))
}

function deriveStatus(session) {
  if (session.current) return session.paused ? 'paused' : 'playing'
  if (session.loading) return 'loading'
  return 'idle'
}

/** Foto do estado da sessão no formato que o app lê. */
export function buildSnapshot(session, now = Date.now()) {
  const current = session.current
    ? {
        title: truncate(session.current.title, MAX_TITLE),
        durationSeconds: session.current.durationSeconds || null,
        positionMs: getPositionMs(session, now),
        source: session.current.source || null
      }
    : null

  const queue = (session.queue || []).slice(0, MAX_QUEUE).map(item => ({
    id: typeof item === 'object' ? item.id || null : null,
    title: truncate(queueLabel(item), MAX_TITLE)
  }))

  const history = (session.history || []).slice(0, MAX_HISTORY).map(entry => ({
    title: truncate(entry.title, MAX_TITLE),
    // URL longa demais não vale a pena no metadado: sem ela o app só não oferece "tocar de novo"
    url: entry.url && String(entry.url).length <= MAX_URL ? String(entry.url) : null
  }))

  return {
    v: STATE_VERSION,
    status: deriveStatus(session),
    volume: Math.round((session.volume ?? 1) * 100),
    current,
    queue,
    queueTotal: (session.queue || []).length,
    history,
    updatedAt: now
  }
}

/**
 * Publica o estado nos metadados do participante do bot. Várias mudanças seguidas viram uma só
 * publicação (a foto é tirada na hora de enviar, então sempre vai o estado mais recente).
 */
export function publishState(session) {
  if (!session?.room || session.publishTimer) return

  const wait = Math.max(0, MIN_PUBLISH_INTERVAL_MS - (Date.now() - (session.lastPublishAt || 0)))
  session.publishTimer = setTimeout(async () => {
    session.publishTimer = null
    session.lastPublishAt = Date.now()
    try {
      await session.room.localParticipant.updateMetadata(JSON.stringify(buildSnapshot(session)))
    } catch (err) {
      console.warn('[State] Falha ao publicar estado do bot:', err?.message || err)
    }
  }, wait)
}

/** Cancela uma publicação pendente (a sessão está sendo encerrada). */
export function cancelPublish(session) {
  if (session?.publishTimer) {
    clearTimeout(session.publishTimer)
    session.publishTimer = null
  }
}
