import { config } from './config.js'
import { joinAndPublish, pumpPcmToSource } from './livekitBot.js'
import {
  resolveTrackInfo,
  startAudioProcess,
  describePlayError,
  isPlaylistUrl,
  extractPlaylist,
  fetchYouTubeOEmbed,
  fetchDurationSeconds
} from './audioPipeline.js'
import { postBotMessage } from './supabaseClient.js'
import { publishState, cancelPublish } from './state.js'
import { watchEmptyRoom } from './emptyRoomGuard.js'
import { parseControlMessage } from './liveControl.js'

const isBotIdentity = (identity) => typeof identity === 'string' && identity.startsWith('music-bot-')

/**
 * Volume em tempo real vindo do painel (mensagem de dados do LiveKit, sem passar pelo banco): aplica na
 * hora e só republica o estado. Comandos de chat (!volume) continuam funcionando como antes.
 */
function attachLiveControl(session, room) {
  room.on('dataReceived', (payload, participant, _kind, topic) => {
    if (!participant || isBotIdentity(participant.identity)) return
    const control = parseControlMessage(payload, topic)
    if (control?.cmd !== 'volume') return
    session.volume = control.percent / 100
    publishState(session)
  })
}
import { newQueueItem, queueLabel, findQueueIndex, removeAt, moveToFront } from './queueOps.js'

const MAX_HISTORY = 8

/**
 * Representa uma sessão ativa num canal de voz.
 * Só existe enquanto o bot estiver conectado e tocando (ou pausado).
 */
class Session {
  constructor(channelId) {
    this.channelId = channelId
    this.queue = [] // array de { url, title } ou strings
    this.resolved = new Map() // cache url -> info
    this.volume = 1.0 // 0.0 a 2.0
    this.playing = false
    this.paused = false
    this.current = null // { title, proc, url, durationSeconds, source }
    this.room = null
    this.source = null
    this.disconnectFn = null
    this.ready = null // Promise do handshake inicial
    this.prewarmed = null // { item, url, info, proc, readyPromise, stop }
    this.initialAudio = null // { info, proc } pré-iniciado no handshake

    // Estado publicado para o painel do app (veja state.js)
    this.seq = 0 // contador de ids da fila (q1, q2, ...)
    this.history = [] // últimas faixas tocadas: { title, url }
    this.loading = false // resolvendo a próxima faixa
    this.trackStartedAt = null // quando a faixa atual começou (ms)
    this.pausedAt = null // quando pausou (ms), se estiver pausada
    this.pausedTotalMs = 0 // soma do tempo pausado na faixa atual
    this.publishTimer = null
    this.lastPublishAt = 0
  }
}

function markPaused(session) {
  if (session.paused) return
  session.paused = true
  session.pausedAt = Date.now()
}

function markResumed(session) {
  if (session.paused && session.pausedAt) {
    session.pausedTotalMs += Date.now() - session.pausedAt
  }
  session.paused = false
  session.pausedAt = null
}

function rememberInHistory(session, title, url) {
  if (!title) return
  const withoutDuplicate = session.history.filter(h => h.url !== url || !url)
  withoutDuplicate.unshift({ title, url: url || null })
  session.history = withoutDuplicate.slice(0, MAX_HISTORY)
}

function stopPrewarmed(session) {
  if (session?.prewarmed) {
    session.prewarmed.stop()
    session.prewarmed = null
  }
  if (session?.initialAudio?.proc) {
    try { session.initialAudio.proc.stop() } catch {}
    session.initialAudio = null
  }
}

// Mapa de channel_id (UUID da sala no LiveKit) -> Session
const sessions = new Map()

export function getActiveSessionCount() {
  return sessions.size
}

/**
 * Ponto de entrada do comando !play.
 * Se a query for uma playlist, delega para handlePlaylistPlay.
 */
export async function handlePlay(channelId, query) {
  if (isPlaylistUrl(query)) {
    return handlePlaylistPlay(channelId, query)
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

    const created = new Session(channelId)
    session = created
    sessions.set(channelId, created)

    // Otimização de latência: resolve metadados e entra no LiveKit EM PARALELO.
    // O handshake do LiveKit (~1s) roda simultaneamente com a resolução da URL.
    // Além disso, iniciamos o processo de áudio (yt-dlp + ffmpeg) assim que os metadados estiverem resolvidos,
    // rodando o startup do yt-dlp em paralelo com o handshake WebRTC do LiveKit!
    let initialProc = null
    created.ready = (async () => {
      const resolvePromise = resolveTrackInfo(query).catch(err => {
        err.stage = 'resolve'
        throw err
      })

      const joinPromise = joinAndPublish(channelId).catch(err => {
        err.stage = 'join'
        throw err
      })

      const audioSpawnPromise = resolvePromise.then(info => {
        created.resolved.set(query, info)
        const targetUrl = info?.webpageUrl || query
        initialProc = startAudioProcess(targetUrl)
        return { info, proc: initialProc }
      })

      try {
        const [audioRes, joinRes] = await Promise.all([audioSpawnPromise, joinPromise])
        created.room = joinRes.room
        created.source = joinRes.source
        created.disconnectFn = joinRes.disconnect
        created.initialAudio = audioRes

        attachLiveControl(created, joinRes.room)
        if (config.emptyRoomSeconds > 0) {
          created.stopEmptyGuard = watchEmptyRoom(joinRes.room, {
            graceMs: config.emptyRoomSeconds * 1000,
            onEmpty: () => leaveEmptyRoom(created)
          })
        }
        publishState(created) // o painel do app já vê o bot na chamada
      } catch (err) {
        if (initialProc) {
          try { initialProc.stop() } catch {}
        }
        err.stage = err.stage || 'join'
        throw err
      }
    })()

    try {
      await created.ready
    } catch (err) {
      console.error(`[Session ${channelId}] Falha ao iniciar (${err.stage}):`, err)
      sessions.delete(channelId)
      await postBotMessage(channelId, describePlayError(err, query))
      return
    }
  } else {
    // Sessão ainda iniciando por outro comando: espera. Se ela falhar, quem a criou já avisou o canal.
    try { await session.ready } catch { return }
  }

  let queueTitle = null
  const cached = session.resolved.get(query)
  if (cached?.title) {
    queueTitle = cached.title
  } else if (/https?:\/\//i.test(query)) {
    if (/youtube\.com|youtu\.be/i.test(query)) {
      const meta = await fetchYouTubeOEmbed(query)
      if (meta?.title) queueTitle = meta.title
    }
  } else {
    queueTitle = query
  }

  const item = newQueueItem(session, { url: query, title: queueTitle })
  session.queue.push(item)

  if (session.initialAudio) {
    session.prewarmed = {
      item,
      url: query,
      info: session.initialAudio.info,
      proc: session.initialAudio.proc,
      stopped: false,
      readyPromise: Promise.resolve(session.initialAudio),
      stop() {
        if (this.stopped) return
        this.stopped = true
        if (this.proc) {
          try { this.proc.stop() } catch {}
          this.proc = null
        }
      }
    }
    session.initialAudio = null
  }

  publishState(session)

  if (session.playing) {
    const displayLabel = queueTitle || query
    await postBotMessage(channelId, `➕ Adicionado à fila (posição ${session.queue.length}): **${displayLabel}**`)
    prewarmNextProcess(session)
  } else {
    playNext(session)
  }
}

async function handlePlaylistPlay(channelId, query) {
  let playlist
  try {
    playlist = await extractPlaylist(query, 50)
  } catch (err) {
    console.error(`[Session ${channelId}] Falha ao extrair playlist:`, err)
    await postBotMessage(channelId, `❌ Erro ao carregar playlist: ${err.message}`)
    return
  }

  if (!playlist.tracks || playlist.tracks.length === 0) {
    await postBotMessage(channelId, '⚠️ A playlist está vazia ou não possui faixas públicas acessíveis.')
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

    const created = new Session(channelId)
    session = created
    sessions.set(channelId, created)

    const firstTrack = playlist.tracks[0]
    let initialProc = null

    created.ready = (async () => {
      try {
        const joinPromise = joinAndPublish(channelId).catch(err => {
          err.stage = 'join'
          throw err
        })
        const audioPromise = (async () => {
          const info = {
            title: firstTrack.title,
            webpageUrl: firstTrack.url,
            durationSeconds: null,
            source: 'youtube'
          }
          created.resolved.set(firstTrack.url, info)
          initialProc = startAudioProcess(firstTrack.url)
          return { info, proc: initialProc }
        })()

        const [audioRes, joinRes] = await Promise.all([audioPromise, joinPromise])
        created.room = joinRes.room
        created.source = joinRes.source
        created.disconnectFn = joinRes.disconnect
        created.initialAudio = audioRes

        attachLiveControl(created, joinRes.room)
        if (config.emptyRoomSeconds > 0) {
          created.stopEmptyGuard = watchEmptyRoom(joinRes.room, {
            graceMs: config.emptyRoomSeconds * 1000,
            onEmpty: () => leaveEmptyRoom(created)
          })
        }
        publishState(created)
      } catch (err) {
        if (initialProc) {
          try { initialProc.stop() } catch {}
        }
        err.stage = err.stage || 'join'
        throw err
      }
    })()

    try {
      await created.ready
    } catch (err) {
      console.error(`[Session ${channelId}] Falha ao entrar no LiveKit:`, err)
      sessions.delete(channelId)
      await postBotMessage(channelId, describePlayError(err, query))
      return
    }
  } else {
    try { await session.ready } catch { return }
  }

  for (const track of playlist.tracks) {
    session.queue.push(newQueueItem(session, { url: track.url, title: track.title }))
  }

  if (session.initialAudio) {
    const firstItem = session.queue[0]
    session.prewarmed = {
      item: firstItem,
      url: playlist.tracks[0].url,
      info: session.initialAudio.info,
      proc: session.initialAudio.proc,
      stopped: false,
      readyPromise: Promise.resolve(session.initialAudio),
      stop() {
        if (this.stopped) return
        this.stopped = true
        if (this.proc) {
          try { this.proc.stop() } catch {}
          this.proc = null
        }
      }
    }
    session.initialAudio = null
  }

  publishState(session)

  await postBotMessage(
    channelId,
    `📜 Playlist carregada: **${playlist.title}** (${playlist.tracks.length} músicas adicionadas à fila).`
  )

  if (!session.playing) {
    playNext(session)
  } else {
    prewarmNextProcess(session)
  }
}

/**
 * Pré-carrega metadados e o processo de áudio da próxima música em segundo plano.
 * O yt-dlp e ffmpeg já deixam os primeiros frames decodificados no buffer do pipe,
 * garantindo transição com 0ms de delay (gapless playback) entre músicas e no !skip.
 */
function prewarmNextProcess(session) {
  if (!session || !session.queue || session.queue.length === 0) {
    stopPrewarmed(session)
    return
  }

  const nextItem = session.queue[0]
  const nextUrl = typeof nextItem === 'object' ? nextItem.url : nextItem
  const nextTitle = typeof nextItem === 'object' ? nextItem.title : null
  if (!nextUrl) return

  // Se já está pré-aquecendo esse exato item, mantém
  if (session.prewarmed && session.prewarmed.item === nextItem) {
    return
  }

  // Se o item do topo da fila mudou, interrompe o processo anterior
  stopPrewarmed(session)

  const prewarm = {
    item: nextItem,
    url: nextUrl,
    info: null,
    proc: null,
    stopped: false,
    readyPromise: null,
    stop() {
      if (this.stopped) return
      this.stopped = true
      if (this.proc) {
        try { this.proc.stop() } catch {}
        this.proc = null
      }
    }
  }

  session.prewarmed = prewarm

  const tPrewarmStart = Date.now()
  console.log(`[Prewarm] ⏳ Pré-aquecendo próxima faixa em segundo plano: "${nextTitle || nextUrl}"`)

  prewarm.readyPromise = (async () => {
    let info = session.resolved.get(nextUrl)
    if (!info) {
      info = await resolveTrackInfo(nextUrl, nextTitle)
      session.resolved.set(nextUrl, info)
    }

    if (prewarm.stopped) return null

    if (typeof nextItem === 'object' && !nextItem.title && info?.title) {
      nextItem.title = info.title
      publishState(session)
    }

    const targetUrl = info?.webpageUrl || nextUrl
    if (prewarm.stopped) return null

    const proc = startAudioProcess(targetUrl)
    if (prewarm.stopped) {
      proc.stop()
      return null
    }

    prewarm.proc = proc
    prewarm.info = info
    console.log(`[Prewarm] ✅ Faixa pronta no buffer do pipe (${Date.now() - tPrewarmStart}ms): "${info.title || targetUrl}"`)
    return prewarm
  })().catch(err => {
    console.warn(`[Prewarm] ⚠️ Falha ao pré-aquecer "${nextUrl}":`, err.message)
    prewarm.stop()
  })
}

async function playNext(session) {
  const { channelId } = session
  const nextItem = session.queue.shift()

  if (!nextItem) {
    // Fila vazia: encerra a sessão pra liberar o slot de concorrência em
    // vez de ficar um bot ocioso conectado indefinidamente.
    stopPrewarmed(session)
    session.playing = false
    await endSession(session, false)
    return
  }

  session.playing = true
  session.paused = false
  session.pausedAt = null
  session.pausedTotalMs = 0
  session.loading = true
  publishState(session)

  const nextUrl = typeof nextItem === 'object' ? nextItem.url : nextItem
  const nextTitle = typeof nextItem === 'object' ? nextItem.title : null

  let info = null
  let proc = null

  // Otimização: se o próximo item já foi pré-aquecido em segundo plano,
  // aproveita o processo já aberto com os primeiros frames no buffer do pipe!
  if (session.prewarmed && session.prewarmed.item === nextItem) {
    const prewarm = session.prewarmed
    session.prewarmed = null
    try {
      await prewarm.readyPromise
      if (prewarm.proc && !prewarm.stopped && prewarm.proc.ffmpeg?.exitCode === null && !prewarm.proc.ffmpeg?.killed) {
        info = prewarm.info
        proc = prewarm.proc
        console.log(`[Playback] ⚡ Transição instantânea (prewarm adotado com 0ms de espera): "${info.title}"`)
      }
    } catch {
      // Falha no prewarm: continua no fluxo padrão abaixo
    }
  } else {
    stopPrewarmed(session)
  }

  if (!info) {
    info = session.resolved.get(nextUrl)
    session.resolved.delete(nextUrl)
  }

  if (!info) {
    try {
      info = await resolveTrackInfo(nextUrl, nextTitle)
    } catch (err) {
      console.error(`[Session ${channelId}] Falha ao resolver "${nextUrl}":`, err.message)
      session.loading = false
      await postBotMessage(channelId, describePlayError(err, nextTitle || nextUrl))
      playNext(session)
      return
    }
  }

  const targetUrl = info?.webpageUrl || nextUrl
  if (!proc) {
    proc = startAudioProcess(targetUrl)
  }

  session.current = {
    title: info.title,
    proc,
    url: targetUrl,
    durationSeconds: info.durationSeconds || null,
    source: info.source || null
  }
  // IMPORTANTE: trackStartedAt fica null e loading=true até o PRIMEIRO quadro de áudio
  // realmente chegar e ser publicado no LiveKit. Isso evita que o timer do app dispare
  // enquanto o áudio ainda está sendo baixado/decodificado.
  session.trackStartedAt = null
  session.loading = true
  publishState(session)

  // Delay de 10s para buscar a duração em background, sem concorrer com a largada do áudio
  if (!session.current.durationSeconds) {
    const trackRef = session.current
    setTimeout(() => {
      if (session.current === trackRef && !trackRef.durationSeconds) {
        fetchDurationSeconds(targetUrl).then(seconds => {
          if (seconds && session.current === trackRef) {
            trackRef.durationSeconds = seconds
            publishState(session)
          }
        }).catch(() => {})
      }
    }, 10000)
  }

  const badge = info.source === 'soundcloud' ? ' (via SoundCloud ☁️)' : ''
  await postBotMessage(channelId, `🎵 Tocando agora: **${info.title}**${badge}`)

  // Pré-aquece a faixa seguinte em segundo plano após 5s para não concorrer na largada
  setTimeout(() => {
    if (sessions.get(channelId) === session && session.current?.proc === proc) {
      prewarmNextProcess(session)
    }
  }, 5000)

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
      isPaused: () => session.paused,
      onFirstFrame: () => {
        session.trackStartedAt = Date.now()
        session.loading = false
        publishState(session)
        console.log(`[Playback] 🔊 Áudio começou a tocar na chamada: "${info.title}"`)
      }
    })
  } catch (err) {
    console.error(`[Session ${channelId}] Erro durante playback:`, err)
  } finally {
    clearTimeout(watchdog)
    proc.stop()
    rememberInHistory(session, session.current?.title, session.current?.url)
    session.current = null
    session.trackStartedAt = null
    publishState(session)
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
  markResumed(session) // destrava o loop de reprodução caso esteja pausado
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
  stopPrewarmed(session)
  if (session.current) session.current.proc.stop()
  await endSession(session, true)
}

export async function handlePause(channelId) {
  const session = sessions.get(channelId)
  if (!session || !session.current) {
    await postBotMessage(channelId, 'ℹ️ Nada tocando agora.')
    return
  }
  markPaused(session)
  publishState(session)
  session.source?.clearQueue() // silencia já, sem esperar o buffer (~1s) esvaziar
  await postBotMessage(channelId, '⏸️ Pausado.')
}

export async function handleResume(channelId) {
  const session = sessions.get(channelId)
  if (!session || !session.current) {
    await postBotMessage(channelId, 'ℹ️ Nada tocando agora.')
    return
  }
  markResumed(session)
  publishState(session)
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
  publishState(session)
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
  session.queue.forEach((q, i) => {
    lines.push(`${i + 1}. ${queueLabel(q)}`)
  })
  await postBotMessage(channelId, lines.join('\n'))
}

/** !remove <posição ou id> — tira uma música da fila (não interrompe a que está tocando). */
export async function handleRemove(channelId, arg) {
  const session = sessions.get(channelId)
  if (!session || session.queue.length === 0) {
    await postBotMessage(channelId, 'ℹ️ A fila está vazia.')
    return
  }
  const index = findQueueIndex(session.queue, arg)
  if (index === -1) {
    await postBotMessage(channelId, `⚠️ Uso: \`!remove <posição>\` (1 a ${session.queue.length}). Veja a fila com \`!queue\`.`)
    return
  }
  const removed = removeAt(session.queue, index)
  if (session.prewarmed && session.prewarmed.item === removed) {
    stopPrewarmed(session)
    prewarmNextProcess(session)
  }
  publishState(session)
  await postBotMessage(channelId, `🗑️ Removido da fila: **${queueLabel(removed)}**`)
}

/** !next <posição ou id> — move uma música da fila para tocar logo depois da atual. */
export async function handleNext(channelId, arg) {
  const session = sessions.get(channelId)
  if (!session || session.queue.length === 0) {
    await postBotMessage(channelId, 'ℹ️ A fila está vazia.')
    return
  }
  const index = findQueueIndex(session.queue, arg)
  if (index === -1) {
    await postBotMessage(channelId, `⚠️ Uso: \`!next <posição>\` (1 a ${session.queue.length}). Veja a fila com \`!queue\`.`)
    return
  }
  if (index === 0) {
    await postBotMessage(channelId, 'ℹ️ Essa música já é a próxima.')
    return
  }
  const moved = moveToFront(session.queue, index)
  if (session.prewarmed && session.prewarmed.item !== session.queue[0]) {
    stopPrewarmed(session)
    prewarmNextProcess(session)
  }
  publishState(session)
  await postBotMessage(channelId, `⏫ Vai tocar em seguida: **${queueLabel(moved)}**`)
}

/** !now <posição ou id> — toca uma música da fila agora, cortando a que está tocando. */
export async function handleNow(channelId, arg) {
  const session = sessions.get(channelId)
  if (!session || session.queue.length === 0) {
    await postBotMessage(channelId, 'ℹ️ A fila está vazia.')
    return
  }
  const index = findQueueIndex(session.queue, arg)
  if (index === -1) {
    await postBotMessage(channelId, `⚠️ Uso: \`!now <posição>\` (1 a ${session.queue.length}). Veja a fila com \`!queue\`.`)
    return
  }
  const item = index === 0 ? session.queue[0] : moveToFront(session.queue, index)
  if (session.prewarmed && session.prewarmed.item !== item) {
    stopPrewarmed(session)
  }
  publishState(session)
  await postBotMessage(channelId, `▶️ Tocando agora: **${queueLabel(item)}**`)
  if (session.current) {
    // Cortar a atual faz o loop de reprodução puxar o primeiro da fila, que agora é a escolhida
    markResumed(session)
    session.current.proc.stop()
    session.source?.clearQueue()
  }
}

/** !clear — esvazia a fila, mantendo a música que está tocando. */
export async function handleClear(channelId) {
  const session = sessions.get(channelId)
  if (!session || session.queue.length === 0) {
    await postBotMessage(channelId, 'ℹ️ A fila já está vazia.')
    return
  }
  const count = session.queue.length
  session.queue = []
  stopPrewarmed(session)
  publishState(session)
  await postBotMessage(channelId, `🧹 Fila limpa (${count} ${count === 1 ? 'música removida' : 'músicas removidas'}).`)
}

/** Todo mundo saiu da chamada: para de tocar e desconecta, em vez de gastar recursos para ninguém. */
async function leaveEmptyRoom(session) {
  if (sessions.get(session.channelId) !== session) return
  console.log(`[Session ${session.channelId}] Sala vazia há ${config.emptyRoomSeconds}s, saindo.`)
  stopPrewarmed(session)
  if (session.current) session.current.proc.stop()
  await endSession(session, false)
  await postBotMessage(session.channelId, '👋 Ninguém ficou na chamada, saí do canal. É só pedir outra música para eu voltar.')
}

async function endSession(session, announce) {
  session.stopEmptyGuard?.()
  cancelPublish(session)
  stopPrewarmed(session)
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
    stopPrewarmed(s)
    if (s.current) s.current.proc.stop()
    return endSession(s, false)
  }))
}
