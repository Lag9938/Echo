process.env.LIVEKIT_URL ??= 'wss://example.test'
process.env.LIVEKIT_API_KEY ??= 'key'
process.env.LIVEKIT_API_SECRET ??= 'secret'
process.env.SUPABASE_URL ??= 'https://example.test'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service'
process.env.BOT_AUTHOR_ID ??= 'bot'

import test from 'node:test'
import assert from 'node:assert/strict'

const { parseControlMessage, CONTROL_TOPIC } = await import('../src/liveControl.js')
const { buildSnapshot } = await import('../src/state.js')

const encode = (obj) => new TextEncoder().encode(JSON.stringify(obj))

test('aceita volume dentro dos limites e arredonda', () => {
  assert.deepEqual(parseControlMessage(encode({ cmd: 'volume', value: 35 }), CONTROL_TOPIC), { cmd: 'volume', percent: 35 })
  assert.deepEqual(parseControlMessage(encode({ cmd: 'volume', value: 0 }), CONTROL_TOPIC), { cmd: 'volume', percent: 0 })
  assert.deepEqual(parseControlMessage(encode({ cmd: 'volume', value: 200 }), CONTROL_TOPIC), { cmd: 'volume', percent: 200 })
  assert.deepEqual(parseControlMessage(encode({ cmd: 'volume', value: 12.6 }), CONTROL_TOPIC), { cmd: 'volume', percent: 13 })
})

test('recusa volume fora dos limites ou que não é número', () => {
  assert.equal(parseControlMessage(encode({ cmd: 'volume', value: 201 }), CONTROL_TOPIC), null)
  assert.equal(parseControlMessage(encode({ cmd: 'volume', value: -1 }), CONTROL_TOPIC), null)
  assert.equal(parseControlMessage(encode({ cmd: 'volume', value: 'alto' }), CONTROL_TOPIC), null)
  assert.equal(parseControlMessage(encode({ cmd: 'volume' }), CONTROL_TOPIC), null)
})

test('ignora mensagens de outro assunto, comandos desconhecidos e lixo', () => {
  assert.equal(parseControlMessage(encode({ cmd: 'volume', value: 50 }), 'outro-topico'), null)
  assert.equal(parseControlMessage(encode({ cmd: 'apagar-tudo' }), CONTROL_TOPIC), null)
  assert.equal(parseControlMessage(new TextEncoder().encode('isso não é json'), CONTROL_TOPIC), null)
  assert.equal(parseControlMessage(encode('texto solto'), CONTROL_TOPIC), null)
  assert.equal(parseControlMessage(undefined, CONTROL_TOPIC), null)
})

test('o estado publicado avisa que o bot entende volume em tempo real', () => {
  const snapshot = buildSnapshot({ queue: [], history: [], volume: 0.5, current: null })
  assert.equal(snapshot.liveVolume, true)
  assert.equal(snapshot.volume, 50)
})
