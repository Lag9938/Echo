import { spawn } from 'node:child_process'
import { config } from './config.js'

function isUrl(text) {
  try { new URL(text); return true } catch { return false }
}

export function isPlaylistUrl(text) {
  if (!isUrl(text)) return false
  try {
    const u = new URL(text)
    if (u.pathname.includes('/playlist') && u.searchParams.has('list')) return true
    if (u.searchParams.has('list') && !u.pathname.includes('/watch')) return true
    return false
  } catch {
    return false
  }
}

/** Obtém título e autor de um vídeo do YouTube via oEmbed oficial (rápido, sem bloqueio de datacenter). */
export async function fetchYouTubeOEmbed(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const data = await res.json()
    return {
      title: data.title || null,
      author: data.author_name || null
    }
  } catch {
    return null
  }
}

/** Extrai a lista de faixas de uma playlist sem baixar áudio, de forma instantânea. */
export async function extractPlaylist(query, maxTracks = 50) {
  return new Promise((resolve, reject) => {
    const args = [
      '--flat-playlist',
      '--dump-single-json',
      '--playlist-end', String(maxTracks)
    ]
    if (config.ytdlpCookiesFile) args.push('--cookies', config.ytdlpCookiesFile)
    args.push(...config.ytdlpExtraArgs, query)

    const proc = spawn('yt-dlp', args)
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', d => { stdout += d })
    proc.stderr.on('data', d => { stderr += d })
    proc.on('close', code => {
      const errText = stderr.trim()
      if (/playlist does not exist/i.test(errText)) {
        reject(new Error('A playlist não existe ou está como "Privada" 🔒 no YouTube. Abra a playlist no YouTube, mude a visibilidade para "Não listada" (Unlisted) ou "Pública" e tente novamente.'))
        return
      }
      if (code !== 0 || !stdout.trim()) {
        const firstError = errText.split('\n').map(l => l.trim()).find(l => l.startsWith('ERROR:'))
        reject(new Error((firstError || errText.split('\n')[0] || '').replace(/^ERROR:\s*/, '').slice(0, 160) || 'Falha ao carregar a playlist.'))
        return
      }
      try {
        const data = JSON.parse(stdout)
        const entries = (data.entries || []).map(e => ({
          title: e.title || 'Música',
          url: e.url || (e.id ? `https://www.youtube.com/watch?v=${e.id}` : null)
        })).filter(e => e.url)

        resolve({
          title: data.title || 'Playlist',
          tracks: entries
        })
      } catch {
        reject(new Error('Não foi possível interpretar a resposta da playlist.'))
      }
    })
    proc.on('error', err => reject(err))
  })
}

export function cleanTarget(query) {
  if (isUrl(query)) {
    try {
      const u = new URL(query)
      if (u.pathname.includes('/watch') && u.searchParams.has('list')) {
        u.searchParams.delete('list')
        u.searchParams.delete('index')
        u.searchParams.delete('start_radio')
        return u.toString()
      }
    } catch {}
    return query
  }
  return `ytsearch1:${query}`
}

/** Argumentos comuns a todas as chamadas do yt-dlp (cookies e extras configurados no .env). */
export function ytdlpBaseArgs() {
  const args = [
    '--no-playlist',
    '--playlist-items', '1'
  ]
  if (config.ytdlpCookiesFile) args.push('--cookies', config.ytdlpCookiesFile)
  args.push(...config.ytdlpExtraArgs)
  return args
}

/**
 * Converte o erro cru do yt-dlp numa mensagem curta e útil para o chat.
 * O texto completo continua nos logs do serviço (journalctl -u echo-music-bot).
 */
export function describePlayError(err, query) {
  const raw = String(err?.message || err || '')
  if (err?.stage === 'join') {
    return '❌ Não consegui entrar no canal de voz. Verifique os logs do bot.'
  }
  if (/sign in to confirm|not a bot/i.test(raw)) {
    return '🔒 O YouTube bloqueou o servidor do bot (verificação anti-robô). Um administrador precisa configurar os cookies do yt-dlp (veja o README do music-bot). Enquanto isso, links do SoundCloud podem funcionar.'
  }
  if (/yt-dlp não encontrado/i.test(raw)) {
    return '❌ O yt-dlp não está instalado no servidor do bot.'
  }
  const firstError = raw.split('\n').map(l => l.trim()).find(l => l.startsWith('ERROR:'))
  const detail = (firstError || raw.split('\n')[0] || '').replace(/^ERROR:\s*/, '').slice(0, 160)
  return `❌ Não consegui carregar "${query}"${detail ? `: ${detail}` : '.'}`
}

async function executeResolve(target, fallbackLabel) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', [...ytdlpBaseArgs(), '--skip-download', '-j', target])
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', d => { stdout += d })
    proc.stderr.on('data', d => { stderr += d })
    proc.on('close', code => {
      if (code !== 0 || !stdout.trim()) {
        reject(new Error(stderr.trim().slice(0, 300) || 'yt-dlp não retornou resultados.'))
        return
      }
      try {
        const firstLine = stdout.trim().split('\n')[0]
        const info = JSON.parse(firstLine)
        resolve({
          title: info.title || fallbackLabel || target,
          webpageUrl: info.webpage_url || target,
          durationSeconds: info.duration || null
        })
      } catch {
        reject(new Error('Não foi possível interpretar a resposta do yt-dlp.'))
      }
    })
    proc.on('error', err => reject(new Error(`yt-dlp não encontrado (verifique se está instalado no PATH): ${err.message}`)))
  })
}

/**
 * Descobre a duração de uma faixa em segundo plano (o atalho do oEmbed não traz duração).
 * Melhor esforço: em qualquer falha ou demora resolve null e o painel mostra só o tempo decorrido.
 */
export function fetchDurationSeconds(url, timeoutMs = 25000) {
  return new Promise(resolve => {
    let stdout = ''
    let settled = false
    const done = value => { if (!settled) { settled = true; resolve(value) } }
    const proc = spawn('yt-dlp', [...ytdlpBaseArgs(), '--skip-download', '--print', 'duration', url])
    const timer = setTimeout(() => { proc.kill(); done(null) }, timeoutMs)
    proc.stdout.on('data', d => { stdout += d })
    proc.on('error', () => { clearTimeout(timer); done(null) })
    proc.on('close', () => {
      clearTimeout(timer)
      const seconds = Number.parseFloat(stdout.trim().split('\n')[0])
      done(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null)
    })
  })
}

/**
 * Resolve os metadados (título e URL de reprodução) de uma busca ou URL.
 * Se o YouTube bloquear o datacenter por verificação anti-bot ou cookies expirados,
 * tenta automaticamente o fallback transparente via SoundCloud.
 */
export async function resolveTrackInfo(query, fallbackTitle = null) {
  const target = cleanTarget(query)

  // Otimização de latência: se já for link do YouTube/YouTube Music, o oEmbed responde em ~0.2s
  // em vez de gastar 4.5 segundos rodando o processo do yt-dlp apenas para ler o título.
  if (isUrl(query) && /youtube\.com|youtu\.be/i.test(query)) {
    try {
      const meta = await fetchYouTubeOEmbed(query)
      if (meta?.title) {
        return {
          title: meta.title,
          webpageUrl: target,
          durationSeconds: null,
          source: 'youtube'
        }
      }
    } catch {
      // Se o oEmbed falhar por qualquer motivo, segue para o resolve normal
    }
  }

  try {
    return await executeResolve(target, fallbackTitle || query)
  } catch (err) {
    const isBotOrCookieError = /sign in to confirm|not a bot|cookies are no longer valid|rotated in the browser/i.test(err.message)
    if (isBotOrCookieError) {
      // Um título só é válido como termo de busca se não for uma URL crua
      let searchTerm = (fallbackTitle && !isUrl(fallbackTitle)) ? fallbackTitle : null

      // Se não temos título em texto e a query é uma URL do YouTube/YouTube Music:
      if (!searchTerm && isUrl(query) && /youtube\.com|youtu\.be/i.test(query)) {
        console.log(`[audioPipeline] Obtendo título via oEmbed para: ${query}`)
        const meta = await fetchYouTubeOEmbed(query)
        if (meta?.title) {
          searchTerm = meta.author ? `${meta.title} ${meta.author}` : meta.title
        }
      }

      // Se era termo de busca direto (ex: "coldplay yellow"):
      if (!searchTerm && !isUrl(query)) {
        searchTerm = query
      }

      if (searchTerm) {
        console.warn(`[audioPipeline] YouTube bloqueou ("${query}"). Tentando fallback no SoundCloud para: "${searchTerm}"`)
        try {
          const scResult = await executeResolve(`scsearch1:${searchTerm}`, searchTerm)
          scResult.source = 'soundcloud'
          return scResult
        } catch (scErr) {
          console.warn(`[audioPipeline] Fallback no SoundCloud também falhou:`, scErr.message)
        }
      }
    }
    throw err
  }
}

/**
 * Inicia o pipeline de áudio: yt-dlp baixa/extrai o melhor stream de áudio
 * e joga direto (via pipe, sem passar por disco) no stdin do ffmpeg, que
 * decodifica e reamostra pra PCM S16LE cru — o formato que o
 * @livekit/rtc-node espera para publicar frames.
 *
 * Retorna { ytdlp, ffmpeg, stop } — chame stop() pra encerrar os dois
 * processos de forma limpa (usado em !skip/!stop e no watchdog de duração
 * máxima).
 */
export function startAudioProcess(query) {
  const target = cleanTarget(query)

  const ytdlp = spawn('yt-dlp', [
    ...ytdlpBaseArgs(),
    '-f', 'bestaudio/best',
    '--no-check-formats',
    '--quiet',
    '--no-warnings',
    '-o', '-',
    target
  ], { stdio: ['ignore', 'pipe', 'pipe'] })

  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error',
    '-probesize', '32k',
    '-analyzeduration', '0',
    '-fflags', '+nobuffer+flush_packets',
    '-flags', 'low_delay',
    '-i', 'pipe:0',
    '-vn',
    '-ac', String(config.channels),
    '-ar', String(config.sampleRate),
    '-f', 's16le',
    'pipe:1'
  ], { stdio: ['pipe', 'pipe', 'pipe'] })

  ytdlp.stdout.on('error', err => {
    if (err.code !== 'EPIPE') console.warn('[yt-dlp stdout error]', err.message)
  })
  ffmpeg.stdin.on('error', err => {
    if (err.code !== 'EPIPE') console.warn('[ffmpeg stdin error]', err.message)
  })

  ytdlp.stdout.pipe(ffmpeg.stdin)
  ytdlp.stderr.on('data', d => console.warn('[yt-dlp]', d.toString().trim()))
  ffmpeg.stderr.on('data', d => console.warn('[ffmpeg]', d.toString().trim()))

  let stopped = false
  function stop() {
    if (stopped) return
    stopped = true
    try { ytdlp.stdout.unpipe(ffmpeg.stdin) } catch {}
    try { ytdlp.kill('SIGKILL') } catch {}
    try { ffmpeg.kill('SIGKILL') } catch {}
  }

  ytdlp.on('error', () => stop())
  ffmpeg.on('error', () => stop())

  return { ytdlp, ffmpeg, stop }
}
