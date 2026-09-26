import 'dotenv/config'

function required(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`[Config] Variável de ambiente obrigatória ausente: ${name}. Veja .env.example.`)
    process.exit(1)
  }
  return value
}

export const config = {
  livekitUrl: required('LIVEKIT_URL'),
  livekitApiKey: required('LIVEKIT_API_KEY'),
  livekitApiSecret: required('LIVEKIT_API_SECRET'),

  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  botAuthorId: required('BOT_AUTHOR_ID'),

  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '4', 10),
  maxTrackSeconds: parseInt(process.env.MAX_TRACK_SECONDS || '900', 10),
  // Se ninguém além do bot ficar na chamada por esse tempo (segundos), o bot sai sozinho. 0 desliga.
  emptyRoomSeconds: parseInt(process.env.EMPTY_ROOM_SECONDS || '60', 10),
  commandPrefix: process.env.COMMAND_PREFIX || '!',

  // yt-dlp: o YouTube costuma bloquear IPs de datacenter ("Sign in to confirm you're not a bot").
  // Um arquivo de cookies (formato Netscape) e/ou argumentos extras resolvem — veja o README.
  ytdlpCookiesFile: (process.env.YTDLP_COOKIES_FILE || '').trim(),
  ytdlpExtraArgs: (process.env.YTDLP_EXTRA_ARGS || '').split(/\s+/).filter(Boolean),

  // Áudio: 48kHz é o padrão que o LiveKit espera para publicação de tracks.
  sampleRate: 48000,
  channels: 2
}
