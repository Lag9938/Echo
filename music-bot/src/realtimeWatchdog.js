// Mantém a inscrição do Realtime viva. Antes o bot só registrava o status da inscrição no log: se ela caía
// (CHANNEL_ERROR / TIMED_OUT / CLOSED) ou o servidor do Realtime a descartava, o processo continuava de pé
// e "surdo" — sem ouvir nenhum !play e sem erro nenhum — e o systemd não reiniciava nada, porque para ele
// o serviço estava rodando. Módulo sem dependências para poder ser testado com um canal falso.

const FAILURE_STATUSES = new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'])

/**
 * @param {object} opts
 * @param {(onStatus: (status: string, err?: unknown) => void) => any} opts.subscribe cria o canal, assina e devolve o canal
 * @param {(channel: any) => Promise<unknown> | unknown} opts.unsubscribe remove o canal
 * @param {(channel: any) => boolean} [opts.isHealthy] confere se o canal está de fato inscrito (checagem periódica)
 * @param {() => void} opts.onGiveUp chamado depois de `giveUpAfterMs` sem inscrição (o index encerra o processo)
 */
export function keepSubscribed({
  subscribe,
  unsubscribe,
  isHealthy = () => true,
  onGiveUp,
  log = console,
  backoffMs = [2000, 5000, 15000, 30000, 60000],
  giveUpAfterMs = 5 * 60 * 1000,
  healthCheckMs = 60 * 1000,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  setRepeat = setInterval,
  clearRepeat = clearInterval
}) {
  let channel = null
  let generation = 0
  let attempt = 0
  let subscribed = false
  let stopped = false
  let retryTimer = null
  let giveUpTimer = null
  let unhealthyChecks = 0

  const startGiveUpTimer = () => {
    if (giveUpTimer || stopped) return
    giveUpTimer = setTimer(() => {
      giveUpTimer = null
      if (stopped || subscribed) return
      log.error(`[Realtime] Sem inscrição há ${Math.round(giveUpAfterMs / 1000)}s: encerrando para o systemd reiniciar o bot.`)
      onGiveUp()
    }, giveUpAfterMs)
  }

  const scheduleRetry = (reason) => {
    if (stopped || retryTimer) return
    subscribed = false
    const delay = backoffMs[Math.min(attempt, backoffMs.length - 1)]
    attempt++
    log.warn(`[Realtime] Inscrição caiu (${reason}). Tentando de novo em ${Math.round(delay / 1000)}s (tentativa ${attempt}).`)
    startGiveUpTimer()
    retryTimer = setTimer(() => {
      retryTimer = null
      if (stopped) return
      const old = channel
      channel = null
      generation++ // o CLOSED que o canal antigo emite ao ser removido não pode agendar outra tentativa
      Promise.resolve()
        .then(() => (old ? unsubscribe(old) : undefined))
        .catch((err) => log.warn('[Realtime] Falha ao remover o canal antigo:', err?.message || err))
        .finally(() => { if (!stopped) connect() })
    }, delay)
  }

  const connect = () => {
    const myGeneration = ++generation
    startGiveUpTimer()
    channel = subscribe((status, err) => {
      // Status de um canal que já foi trocado (ex.: o CLOSED do canal antigo ao ser removido) não conta
      if (stopped || myGeneration !== generation) return
      log.log(`[Realtime] Status da inscrição: ${status}${err ? ` (${err?.message || err})` : ''}`)
      if (status === 'SUBSCRIBED') {
        subscribed = true
        attempt = 0
        unhealthyChecks = 0
        if (giveUpTimer) { clearTimer(giveUpTimer); giveUpTimer = null }
      } else if (FAILURE_STATUSES.has(status)) {
        scheduleRetry(status)
      }
    })
  }

  // O canal pode morrer sem avisar (ex.: o servidor do Realtime descarta a inscrição). Duas checagens
  // seguidas ruins bastam para refazer — uma só pode ser uma reconexão normal em andamento.
  const healthTimer = setRepeat(() => {
    if (stopped || retryTimer || !subscribed) return
    let healthy = false
    try { healthy = Boolean(channel) && isHealthy(channel) } catch { healthy = false }
    if (healthy) { unhealthyChecks = 0; return }
    unhealthyChecks++
    if (unhealthyChecks >= 2) {
      unhealthyChecks = 0
      scheduleRetry('checagem periódica: canal não está inscrito')
    }
  }, healthCheckMs)

  connect()

  return {
    get subscribed() { return subscribed },
    async stop() {
      stopped = true
      if (retryTimer) { clearTimer(retryTimer); retryTimer = null }
      if (giveUpTimer) { clearTimer(giveUpTimer); giveUpTimer = null }
      clearRepeat(healthTimer)
      if (channel) await unsubscribe(channel)
    }
  }
}
