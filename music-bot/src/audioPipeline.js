import { spawn } from 'node:child_process'
import { config } from './config.js'

function isUrl(text) {
  try { new URL(text); return true } catch { return false }
}

/**
 * Resolve apenas os metadados (título) de uma busca ou URL, sem baixar
 * o áudio. Usado só para a mensagem "Tocando agora: ...".
 */
export async function resolveTrackInfo(query) {
  const target = isUrl(query) ? query : `ytsearch1:${query}`
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', ['--no-playlist', '--skip-download', '-j', target])
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
          title: info.title || query,
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
  const target = isUrl(query) ? query : `ytsearch1:${query}`

  const ytdlp = spawn('yt-dlp', [
    '-f', 'bestaudio/best',
    '--no-playlist',
    '--quiet',
    '--no-warnings',
    '-o', '-',
    target
  ], { stdio: ['ignore', 'pipe', 'pipe'] })

  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vn',
    '-ac', String(config.channels),
    '-ar', String(config.sampleRate),
    '-f', 's16le',
    'pipe:1'
  ], { stdio: ['pipe', 'pipe', 'pipe'] })

  ytdlp.stdout.pipe(ffmpeg.stdin)
  ytdlp.stderr.on('data', d => console.warn('[yt-dlp]', d.toString().trim()))
  ffmpeg.stderr.on('data', d => console.warn('[ffmpeg]', d.toString().trim()))

  let stopped = false
  function stop() {
    if (stopped) return
    stopped = true
    try { ytdlp.kill('SIGKILL') } catch {}
    try { ffmpeg.kill('SIGKILL') } catch {}
  }

  ytdlp.on('error', () => stop())
  ffmpeg.on('error', () => stop())

  return { ytdlp, ffmpeg, stop }
}
