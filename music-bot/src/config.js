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
  commandPrefix: process.env.COMMAND_PREFIX || '!',

  // Áudio: 48kHz é o padrão que o LiveKit espera para publicação de tracks.
  sampleRate: 48000,
  channels: 2
}
