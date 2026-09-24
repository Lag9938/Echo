// O Supabase Realtime aceita no máximo 5 atualizações de Presence (track/untrack) a cada 30s por cliente.
// Ao passar disso ele registra ClientPresenceRateLimitReached e FECHA o canal: quem estourou some da
// presença e para de receber atualizações até reconectar (jogo não aparece, call aparece incompleta).
//
// Este wrapper garante que um canal nunca envie mais de 1 track a cada `minIntervalMs`, para qualquer
// chamador (o app tem vários pontos que chamam track diretamente):
//  - payload igual ao último enviado (ignorando online_at) é descartado, exceto como batimento a cada `keepAliveMs`;
//  - mudanças em rajada são coalescidas: só o estado mais recente é enviado, no fim do intervalo.

const DEFAULT_MIN_INTERVAL_MS = 8000
const DEFAULT_KEEP_ALIVE_MS = 25000

export interface PresenceThrottleOptions {
  minIntervalMs?: number
  keepAliveMs?: number
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

function payloadKey(payload: any): string {
  if (!payload || typeof payload !== 'object') return stableStringify(payload)
  const { online_at: _ignored, ...rest } = payload
  return stableStringify(rest)
}

export function installPresenceTrackThrottle<T extends { track?: any; untrack?: any }>(
  channel: T,
  options: PresenceThrottleOptions = {}
): T {
  const ch = channel as any
  if (!ch || typeof ch.track !== 'function' || ch.__echoTrackThrottled) return channel
  ch.__echoTrackThrottled = true

  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS
  const keepAliveMs = options.keepAliveMs ?? DEFAULT_KEEP_ALIVE_MS
  const rawTrack = ch.track.bind(ch)
  const rawUntrack = typeof ch.untrack === 'function' ? ch.untrack.bind(ch) : null

  let lastSentAt = 0
  let lastSentKey: string | null = null
  let pending: { payload: any; opts?: any; key: string } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const clearPending = () => {
    pending = null
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const send = (payload: any, opts: any, key: string): Promise<any> => {
    lastSentAt = Date.now()
    lastSentKey = key
    let result: any
    try {
      result = rawTrack(payload, opts)
    } catch (err) {
      // Não entregue (ex.: canal ainda não entrou): a próxima tentativa idêntica não pode ser descartada
      lastSentKey = null
      return Promise.reject(err)
    }
    return Promise.resolve(result).then(
      r => {
        if (r !== 'ok') lastSentKey = null
        return r
      },
      err => {
        lastSentKey = null
        throw err
      }
    )
  }

  const flush = () => {
    timer = null
    const p = pending
    pending = null
    if (!p) return
    send(p.payload, p.opts, p.key).catch(() => {})
  }

  ch.track = (payload: any, opts?: any): Promise<any> => {
    const key = payloadKey(payload)
    const now = Date.now()

    if (key === lastSentKey && now - lastSentAt < keepAliveMs) {
      // O estado mais recente já é o que está publicado: qualquer envio pendente ficou obsoleto
      clearPending()
      return Promise.resolve('ok')
    }

    const elapsed = now - lastSentAt
    if (elapsed >= minIntervalMs) {
      clearPending()
      return send(payload, opts, key)
    }

    // Dentro do intervalo mínimo: guarda só o mais recente e envia quando o intervalo acabar
    pending = { payload, opts, key }
    if (!timer) timer = setTimeout(flush, minIntervalMs - elapsed)
    return Promise.resolve('ok')
  }

  if (rawUntrack) {
    ch.untrack = (...args: any[]) => {
      // Depois de um untrack o servidor não tem mais nosso estado: o próximo track precisa sempre sair
      clearPending()
      lastSentKey = null
      return rawUntrack(...args)
    }
  }

  return channel
}
