import test from 'node:test'
import assert from 'node:assert/strict'

// config.js encerra o processo se faltar variável obrigatória — define valores de mentira antes do import
process.env.LIVEKIT_URL = 'wss://example.invalid'
process.env.LIVEKIT_API_KEY = 'k'
process.env.LIVEKIT_API_SECRET = 's'
process.env.SUPABASE_URL = 'https://example.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'
process.env.BOT_AUTHOR_ID = '00000000-0000-4000-8000-000000000000'

const { newQueueItem, queueLabel, findQueueIndex, removeAt, moveToFront } = await import('../src/queueOps.js')
const { buildSnapshot, getPositionMs, publishState, cancelPublish, STATE_VERSION } = await import('../src/state.js')
const { parseCommand } = await import('../src/commands.js')

function sessionWith(titles) {
  const session = { seq: 0, queue: [] }
  for (const t of titles) session.queue.push(newQueueItem(session, { url: `https://x/${t}`, title: t }))
  return session
}

test('itens da fila recebem ids estáveis e crescentes', () => {
  const s = sessionWith(['a', 'b', 'c'])
  assert.deepEqual(s.queue.map(i => i.id), ['q1', 'q2', 'q3'])
  removeAt(s.queue, 0)
  s.queue.push(newQueueItem(s, { url: 'u', title: 'd' }))
  assert.equal(s.queue.at(-1).id, 'q4') // ids nunca são reaproveitados
})

test('findQueueIndex acha por posição (base 1) e por id, e rejeita o inválido', () => {
  const s = sessionWith(['a', 'b', 'c'])
  assert.equal(findQueueIndex(s.queue, '1'), 0)
  assert.equal(findQueueIndex(s.queue, '3'), 2)
  assert.equal(findQueueIndex(s.queue, 'q2'), 1)
  assert.equal(findQueueIndex(s.queue, '#Q3'), 2)
  for (const bad of ['0', '4', '-1', 'q9', 'abc', '', null, undefined, '1; drop', '2.5']) {
    assert.equal(findQueueIndex(s.queue, bad), -1, `deveria rejeitar ${JSON.stringify(bad)}`)
  }
})

test('por id, o comando continua certo mesmo depois da fila andar', () => {
  const s = sessionWith(['a', 'b', 'c'])
  const ref = 'q3' // o painel guardou o id da 3ª música
  s.queue.shift() // uma música começou a tocar: "c" agora é a 2ª
  const idx = findQueueIndex(s.queue, ref)
  assert.equal(queueLabel(s.queue[idx]), 'c')
})

test('removeAt e moveToFront', () => {
  const s = sessionWith(['a', 'b', 'c', 'd'])
  assert.equal(removeAt(s.queue, 1).title, 'b')
  assert.deepEqual(s.queue.map(i => i.title), ['a', 'c', 'd'])
  assert.equal(moveToFront(s.queue, 2).title, 'd')
  assert.deepEqual(s.queue.map(i => i.title), ['d', 'a', 'c'])
})

test('queueLabel usa título, depois URL, e aceita itens antigos em string', () => {
  assert.equal(queueLabel({ title: 'T', url: 'U' }), 'T')
  assert.equal(queueLabel({ title: null, url: 'U' }), 'U')
  assert.equal(queueLabel('busca de texto'), 'busca de texto')
})

test('parseCommand reconhece os comandos novos e seus apelidos', () => {
  assert.deepEqual(parseCommand('!remove 2'), { name: 'remove', arg: '2' })
  assert.deepEqual(parseCommand('!rm q4'), { name: 'remove', arg: 'q4' })
  assert.deepEqual(parseCommand('!remover 1'), { name: 'remove', arg: '1' })
  assert.deepEqual(parseCommand('!next q3'), { name: 'next', arg: 'q3' })
  assert.deepEqual(parseCommand('!proxima 2'), { name: 'next', arg: '2' })
  assert.deepEqual(parseCommand('!now q3'), { name: 'now', arg: 'q3' })
  assert.deepEqual(parseCommand('!agora 2'), { name: 'now', arg: '2' })
  assert.deepEqual(parseCommand('!clear'), { name: 'clear', arg: '' })
  assert.deepEqual(parseCommand('!limpar'), { name: 'clear', arg: '' })
  assert.equal(parseCommand('!naoexiste'), null)
})

test('snapshot: tocando, com fila e histórico', () => {
  const s = sessionWith(['a', 'b'])
  s.volume = 0.65
  s.history = [{ title: 'antiga', url: 'https://x/antiga' }]
  s.current = { title: 'Agora', durationSeconds: 200, source: null }
  s.trackStartedAt = 1_000
  s.pausedTotalMs = 0
  const snap = buildSnapshot(s, 31_000)
  assert.equal(snap.v, STATE_VERSION)
  assert.equal(snap.status, 'playing')
  assert.equal(snap.volume, 65)
  assert.deepEqual(snap.current, { title: 'Agora', durationSeconds: 200, positionMs: 30_000, source: null })
  assert.deepEqual(snap.queue, [{ id: 'q1', title: 'a' }, { id: 'q2', title: 'b' }])
  assert.equal(snap.queueTotal, 2)
  assert.deepEqual(snap.history, [{ title: 'antiga', url: 'https://x/antiga' }])
})

test('snapshot: a posição congela na pausa e desconta o tempo pausado', () => {
  const s = sessionWith([])
  s.current = { title: 'T', durationSeconds: 100 }
  s.trackStartedAt = 0
  s.paused = true
  s.pausedAt = 20_000
  assert.equal(getPositionMs(s, 50_000), 20_000) // pausada: não avança
  assert.equal(buildSnapshot(s, 50_000).status, 'paused')

  s.paused = false
  s.pausedAt = null
  s.pausedTotalMs = 30_000 // ficou 30s pausada
  assert.equal(getPositionMs(s, 60_000), 30_000) // 60s de relógio - 30s pausada
})

test('snapshot: estados loading e idle, e posição nunca negativa', () => {
  const s = sessionWith([])
  s.loading = true
  assert.equal(buildSnapshot(s).status, 'loading')
  s.loading = false
  assert.equal(buildSnapshot(s).status, 'idle')
  assert.equal(buildSnapshot(s).current, null)

  s.current = { title: 'T' }
  s.trackStartedAt = 10_000
  assert.equal(getPositionMs(s, 5_000), 0)
})

test('snapshot: limita fila e títulos para caber nos metadados', () => {
  const s = sessionWith(Array.from({ length: 50 }, (_, i) => `faixa ${i}`))
  s.queue[0].title = 'x'.repeat(500)
  s.history = Array.from({ length: 20 }, (_, i) => ({ title: `h${i}`, url: i === 0 ? 'https://x/' + 'y'.repeat(400) : `https://x/${i}` }))
  const snap = buildSnapshot(s)
  assert.equal(snap.queue.length, 30)
  assert.equal(snap.queueTotal, 50)
  assert.ok(snap.queue[0].title.length <= 90)
  assert.equal(snap.history.length, 8)
  assert.equal(snap.history[0].url, null) // URL longa demais é descartada
  assert.ok(JSON.stringify(snap).length < 16_000)
})

test('publishState junta mudanças seguidas numa só publicação com o estado mais recente', async () => {
  const sent = []
  const s = sessionWith(['a'])
  s.room = { localParticipant: { updateMetadata: async (json) => { sent.push(JSON.parse(json)) } } }

  publishState(s)
  s.queue.push(newQueueItem(s, { url: 'u', title: 'b' }))
  publishState(s)
  s.queue.push(newQueueItem(s, { url: 'u', title: 'c' }))
  publishState(s)

  await new Promise(resolve => setTimeout(resolve, 60))
  assert.equal(sent.length, 1)
  assert.deepEqual(sent[0].queue.map(i => i.title), ['a', 'b', 'c'])
})

test('publishState não faz nada sem sala e cancelPublish desfaz o agendamento', async () => {
  const noRoom = sessionWith(['a'])
  publishState(noRoom) // não pode lançar erro
  assert.equal(noRoom.publishTimer ?? null, null)

  const sent = []
  const s = sessionWith(['a'])
  s.room = { localParticipant: { updateMetadata: async (json) => { sent.push(json) } } }
  publishState(s)
  cancelPublish(s)
  await new Promise(resolve => setTimeout(resolve, 60))
  assert.equal(sent.length, 0)
})

test('publishState sobrevive a falha do LiveKit', async () => {
  const s = sessionWith(['a'])
  s.room = { localParticipant: { updateMetadata: async () => { throw new Error('sem permissão') } } }
  publishState(s)
  await new Promise(resolve => setTimeout(resolve, 60)) // não pode gerar rejeição não tratada
  assert.equal(s.publishTimer, null)
})