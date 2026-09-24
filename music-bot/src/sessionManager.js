import { config } from './config.js'
import { resolveTrackInfo, startAudioProcess } from './audioPipeline.js'
import { joinAndPublish, pumpPcmToSource } from './livekitBot.js'
import { postBotMessage } from './supabaseClient.js'

// Uma sessão = um canal de voz com o bot conectado e tocando/enfileirando
// música. sessions.size é, por definição, o número de sessões simultâneas
// — é nele que o limite de concorrência (MAX_CONCURRENT_SESSIONS) age.
const sessions = new Map() // channelId -> Session

class Session {
  constructor(channelId) {
    this.channelId = channelId
    this.queue = []
    this.current = null // { title, proc }
    this.room = null
    this.source = null
    this.disconnectFn = null
    this.playing = false
    this.paused = false
    this.volume = 1
  }
}

export function getActiveSessionCount() {
  return sessions.size
}

export async function handlePlay(channelId, query) {
  if (!query) {
    await postBotMessage(channelId, '⚠️ Uso: `!play <link ou nome da música>`')
    return
  }

  let session = sessions.get(channelId)

  if (!session) {
    if (sessions.size >= config.maxConcurrentSessions) {
      await postBotMessage(
        channelId,
        `🚫 O bot já está tocando em ${config.maxConcurrentSessions} canais ao mesmo tempo (limite do servidor). Tente novamente em instantes.`
      )
      return
    }

    session = new Session(channelId)
    sessions.set(channelId, session)

    try {
      const { room, source, disconnect } = await joinAndPublish(channelId)
      session.room = room
      session.source = source
      session.disconnectFn = disconnect
    } catch (err) {
      console.error(`[Session ${channelId}] Falha ao entrar na sala LiveKit:`, err)
      sessions.delete(channelId)
      await postBotMessage(channelId, '❌ Não consegui entrar no canal de voz. Verifique os logs do bot.')
      return
    }
  }

  session.queue.push(query)
  await postBotMessage(channelId, `➕ Adicionado à fila (posição ${session.queue.length}): ${query}`)

  if (!session.playing) {
    playNext(session)
  }
}

async function playNext(session) {
  const { channelId } = session
  const next = session.queue.shift()

  if (!next) {
    // Fila vazia: encerra a sessão pra liberar o slot de concorrência em
    // vez de ficar um bot ocioso conectado indefinidamente.
    session.playing = false
    await endSession(session, false)
    return
  }

  session.playing = true
  session.paused = false

  let info
  try {
    info = await resolveTrackInfo(next)
  } catch (err) {
    await postBotMessage(channelId, `❌ Não achei "${next}": ${err.message}`)
    playNext(session)
    return
  }

  await postBotMessage(channelId, `🎵 Tocando agora: **${info.title}**`)

  const proc = startAudioProcess(next)
  session.current = { title: info.title, proc }

  // Watchdog de segurança: corta a faixa se passar do tempo máximo
  // configurado, pra nenhum processo (travado ou uma live "infinita")
  // ficar consumindo CPU/banda indefinidamente.
  const watchdog = setTimeout(() => {
    console.warn(`[Session ${channelId}] Faixa excedeu MAX_TRACK_SECONDS, cortando.`)
    proc.stop()
  }, config.maxTrackSeconds * 1000)

  try {
    await pumpPcmToSource(proc.ffmpeg.stdout, session.source, {
      getVolume: () => session.volume,
      isPaused: () => session.paused
    })
  } catch (err) {
    console.error(`[Session ${channelId}] Erro durante playback:`, err)
  } finally {
    clearTimeout(watchdog)
    proc.stop()
    session.current = null
    // Só continua a fila se a sessão ainda existe (não foi encerrada via !stop
    // enquanto essa faixa tocava).
    if (sessions.get(channelId) === session) {
      playNext(session)
    }
  }
}

export async function handleSkip(channelId) {
  const session = sessions.get(channelId)
  if (!session || !session.current) {
    await postBotMessage(channelId, 'ℹ️ Nada tocando agora.')
    return
  }
  await postBotMessage(channelId, '⏭️ Pulando...')
  session.paused = false // destrava o loop de reprodução caso esteja pausado
  session.current.proc.stop()
  session.source?.clearQueue() // corta o áudio que já estava na fila de reprodução
}

export async function handleStop(channelId) {
  const session = sessions.get(channelId)
  if (!session) {
    await postBotMessage(channelId, 'ℹ️ O bot não está em nenhum canal aqui.')
    return
  }
  session.queue = []
  session.paused = false
  if (session.current) session.current.proc.stop()
  await endSession(session, true)
}

export async function handlePause(channelId) {
  const session = sessions.get(channelId)
  if (!session || !session.current) {
    await postBotMessage(channelId, 'ℹ️ Nada tocando agora.')
    return
  }
  session.paused = true
  session.source?.clearQueue() // silencia já, sem esperar o buffer (~1s) esvaziar
  await postBotMessage(channelId, '⏸️ Pausado.')
}

export async function handleResume(channelId) {
  const session = sessions.get(channelId)
  if (!session || !session.current) {
    await postBotMessage(channelId, 'ℹ️ Nada tocando agora.')
    return
  }
  session.paused = false
  await postBotMessage(channelId, '▶️ Retomado.')
}

export async function handleVolume(channelId, arg) {
  const session = sessions.get(channelId)
  if (!session) {
    await postBotMessage(channelId, 'ℹ️ O bot não está em nenhum canal aqui.')
    return
  }
  const pct = parseInt(arg, 10)
  if (Number.isNaN(pct) || pct < 0 || pct > 200) {
    await postBotMessage(channelId, '⚠️ Uso: `!volume <0-200>` (100 = normal)')
    return
  }
  session.volume = pct / 100
  await postBotMessage(channelId, `🔊 Volume ajustado para ${pct}%.`)
}

export async function handleQueue(channelId) {
  const session = sessions.get(channelId)
  if (!session || (!session.current && session.queue.length === 0)) {
    await postBotMessage(channelId, 'ℹ️ Fila vazia.')
    return
  }
  const lines = []
  if (session.current) lines.push(`▶️ Tocando: ${session.current.title}`)
  session.queue.forEach((q, i) => lines.push(`${i + 1}. ${q}`))
  await postBotMessage(channelId, lines.join('\n'))
}

async function endSession(session, announce) {
  sessions.delete(session.channelId)
  if (session.disconnectFn) await session.disconnectFn()
  if (announce) await postBotMessage(session.channelId, '👋 Saindo do canal de voz.')
}

/**
 * Encerra todas as sessões ativas — usado no shutdown gracioso do
 * processo (SIGTERM/SIGINT do systemd), pra não deixar bots fantasmas
 * conectados na sala depois que o serviço reinicia/atualiza.
 */
export async function endAllSessions() {
  const all = [...sessions.values()]
  await Promise.all(all.map(s => {
    if (s.current) s.current.proc.stop()
    return endSession(s, false)
  }))
}
