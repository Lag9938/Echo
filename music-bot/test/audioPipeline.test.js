import test from 'node:test'
import assert from 'node:assert/strict'

// config.js encerra o processo se faltar variável obrigatória — define valores de mentira antes do import
process.env.LIVEKIT_URL = 'wss://example.invalid'
process.env.LIVEKIT_API_KEY = 'k'
process.env.LIVEKIT_API_SECRET = 's'
process.env.SUPABASE_URL = 'https://example.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'
process.env.BOT_AUTHOR_ID = '00000000-0000-4000-8000-000000000000'

const { describePlayError, ytdlpBaseArgs } = await import('../src/audioPipeline.js')
const { config } = await import('../src/config.js')

const BOT_CHECK = new Error(
  'WARNING: [youtube] No title found in player responses; falling back to title from initial data.\n' +
  'ERROR: [youtube] abc: Sign in to confirm you’re not a bot. Use --cookies-from-browser or --cookies'
)

test('bloqueio anti-robô do YouTube vira mensagem clara para o administrador', () => {
  const msg = describePlayError(BOT_CHECK, 'https://youtu.be/abc')
  assert.match(msg, /YouTube bloqueou/)
  assert.match(msg, /cookies/)
  assert.doesNotMatch(msg, /WARNING/)
})

test('falha ao entrar na sala tem mensagem própria', () => {
  const err = new Error('boom')
  err.stage = 'join'
  assert.match(describePlayError(err, 'x'), /entrar no canal de voz/)
})

test('yt-dlp ausente é explicado', () => {
  assert.match(describePlayError(new Error('yt-dlp não encontrado (verifique...)'), 'x'), /não está instalado/)
})

test('outros erros mostram só a primeira linha ERROR: e a consulta', () => {
  const err = new Error('WARNING: algo\nERROR: [youtube] id: Video unavailable\nlinha extra')
  const msg = describePlayError(err, 'minha música')
  assert.match(msg, /minha música/)
  assert.match(msg, /Video unavailable/)
  assert.doesNotMatch(msg, /linha extra/)
  assert.doesNotMatch(msg, /WARNING/)
})

test('ytdlpBaseArgs inclui cookies e argumentos extras configurados', () => {
  config.ytdlpCookiesFile = ''
  config.ytdlpExtraArgs = []
  assert.deepEqual(ytdlpBaseArgs(), ['--no-playlist', '--playlist-items', '1'])

  config.ytdlpCookiesFile = '/opt/echo/cookies.txt'
  config.ytdlpExtraArgs = ['--extractor-args', 'youtube:player_client=tv']
  assert.deepEqual(ytdlpBaseArgs(), ['--no-playlist', '--playlist-items', '1', '--cookies', '/opt/echo/cookies.txt', '--extractor-args', 'youtube:player_client=tv'])
})
