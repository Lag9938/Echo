import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { watchEmptyRoom } from '../src/emptyRoomGuard.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function fakeRoom(humans = 0) {
  const room = new EventEmitter()
  room.remoteParticipants = new Map()
  for (let i = 0; i < humans; i++) room.remoteParticipants.set(`u${i}`, {})
  room.join = (id) => { room.remoteParticipants.set(id, {}); room.emit('participantConnected') }
  room.leave = (id) => { room.remoteParticipants.delete(id); room.emit('participantDisconnected') }
  return room
}

test('sai quando a sala fica vazia depois do tempo de tolerância', async () => {
  const room = fakeRoom(1)
  let left = 0
  watchEmptyRoom(room, { graceMs: 30, onEmpty: () => { left++ } })

  room.leave('u0')
  await sleep(15)
  assert.equal(left, 0, 'ainda dentro da tolerância')
  await sleep(40)
  assert.equal(left, 1)
})

test('quem volta dentro da tolerância cancela a saída', async () => {
  const room = fakeRoom(1)
  let left = 0
  watchEmptyRoom(room, { graceMs: 40, onEmpty: () => { left++ } })

  room.leave('u0')
  await sleep(15)
  room.join('u0')
  await sleep(60)
  assert.equal(left, 0)
})

test('não sai enquanto ainda houver alguém, mesmo que outros saiam', async () => {
  const room = fakeRoom(2)
  let left = 0
  watchEmptyRoom(room, { graceMs: 20, onEmpty: () => { left++ } })

  room.leave('u0')
  await sleep(50)
  assert.equal(left, 0)
})

test('sala que já começa vazia também é encerrada', async () => {
  const room = fakeRoom(0)
  let left = 0
  watchEmptyRoom(room, { graceMs: 20, onEmpty: () => { left++ } })
  await sleep(50)
  assert.equal(left, 1)
})

test('parar de vigiar cancela a saída pendente', async () => {
  const room = fakeRoom(1)
  let left = 0
  const stop = watchEmptyRoom(room, { graceMs: 20, onEmpty: () => { left++ } })

  room.leave('u0')
  stop()
  await sleep(50)
  assert.equal(left, 0)
})
