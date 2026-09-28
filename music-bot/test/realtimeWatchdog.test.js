import test from 'node:test'
import assert from 'node:assert/strict'
import { keepSubscribed } from '../src/realtimeWatchdog.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const quietLog = { log() {}, warn() {}, error() {} }

/** Canal falso: guarda o callback de status para o teste disparar SUBSCRIBED / CHANNEL_ERROR / CLOSED */
function fakeRealtime() {
  const channels = []
  return {
    channels,
    subscribe(onStatus) {
      const channel = { id: channels.length, onStatus, removed: false, joined: false }
      channels.push(channel)
      return channel
    },
    unsubscribe(channel) {
      channel.removed = true
      channel.onStatus('CLOSED') // o supabase-js avisa CLOSED ao remover
    },
    last() { return channels[channels.length - 1] }
  }
}

const fast = { backoffMs: [10, 20], giveUpAfterMs: 1000, healthCheckMs: 10000, log: quietLog }

test('refaz a inscrição quando o canal cai com CHANNEL_ERROR', async () => {
  const rt = fakeRealtime()
  const watch = keepSubscribed({ ...fast, subscribe: rt.subscribe, unsubscribe: rt.unsubscribe, onGiveUp: () => assert.fail('não devia desistir') })
  rt.last().onStatus('SUBSCRIBED')
  assert.equal(watch.subscribed, true)

  rt.channels[0].onStatus('CHANNEL_ERROR', new Error('boom'))
  assert.equal(watch.subscribed, false)
  await sleep(40)

  assert.equal(rt.channels.length, 2, 'criou um canal novo')
  assert.equal(rt.channels[0].removed, true, 'removeu o antigo')
  rt.last().onStatus('SUBSCRIBED')
  assert.equal(watch.subscribed, true)
  await watch.stop()
})

test('o CLOSED do canal antigo removido não agenda outra tentativa', async () => {
  const rt = fakeRealtime()
  const watch = keepSubscribed({ ...fast, subscribe: rt.subscribe, unsubscribe: rt.unsubscribe, onGiveUp: () => {} })
  rt.last().onStatus('TIMED_OUT')
  await sleep(40)
  rt.last().onStatus('SUBSCRIBED')
  await sleep(60)
  assert.equal(rt.channels.length, 2, 'só uma reinscrição')
  await watch.stop()
})

test('ignora status atrasados de um canal que já foi trocado', async () => {
  const rt = fakeRealtime()
  const watch = keepSubscribed({ ...fast, subscribe: rt.subscribe, unsubscribe: rt.unsubscribe, onGiveUp: () => {} })
  rt.last().onStatus('CLOSED')
  await sleep(40)
  rt.last().onStatus('SUBSCRIBED')
  rt.channels[0].onStatus('CHANNEL_ERROR') // atrasado, do canal velho
  await sleep(60)
  assert.equal(watch.subscribed, true)
  assert.equal(rt.channels.length, 2)
  await watch.stop()
})

test('desiste (para o systemd reiniciar) se nunca consegue se inscrever', async () => {
  const rt = fakeRealtime()
  let gaveUp = 0
  const watch = keepSubscribed({ ...fast, giveUpAfterMs: 50, subscribe: rt.subscribe, unsubscribe: rt.unsubscribe, onGiveUp: () => { gaveUp++ } })
  await sleep(90)
  assert.equal(gaveUp, 1)
  await watch.stop()
})

test('não desiste se a inscrição volta antes do prazo', async () => {
  const rt = fakeRealtime()
  let gaveUp = 0
  const watch = keepSubscribed({ ...fast, giveUpAfterMs: 80, subscribe: rt.subscribe, unsubscribe: rt.unsubscribe, onGiveUp: () => { gaveUp++ } })
  rt.last().onStatus('SUBSCRIBED')
  rt.last().onStatus('CHANNEL_ERROR')
  await sleep(30)
  rt.last().onStatus('SUBSCRIBED')
  await sleep(100)
  assert.equal(gaveUp, 0)
  await watch.stop()
})

test('a checagem periódica refaz a inscrição de um canal que morreu calado', async () => {
  const rt = fakeRealtime()
  let healthy = true
  const watch = keepSubscribed({
    ...fast,
    healthCheckMs: 10,
    subscribe: rt.subscribe,
    unsubscribe: rt.unsubscribe,
    isHealthy: () => healthy,
    onGiveUp: () => {}
  })
  rt.last().onStatus('SUBSCRIBED')
  await sleep(40)
  assert.equal(rt.channels.length, 1, 'saudável: não mexe')

  healthy = false // o servidor descartou a inscrição sem avisar
  await sleep(80)
  assert.ok(rt.channels.length >= 2, 'reinscreveu')
  await watch.stop()
})

test('stop remove o canal e não reinscreve mais', async () => {
  const rt = fakeRealtime()
  const watch = keepSubscribed({ ...fast, subscribe: rt.subscribe, unsubscribe: rt.unsubscribe, onGiveUp: () => assert.fail('parado não desiste') })
  rt.last().onStatus('SUBSCRIBED')
  await watch.stop()
  assert.equal(rt.channels[0].removed, true)
  await sleep(40)
  assert.equal(rt.channels.length, 1)
})
