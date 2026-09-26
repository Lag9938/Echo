// Nomes dos eventos do LiveKit (RoomEvent.ParticipantConnected / ParticipantDisconnected). Em texto puro
// para este módulo não depender do pacote nativo e poder ser testado com uma sala falsa.
const EVENT_CONNECTED = 'participantConnected'
const EVENT_DISCONNECTED = 'participantDisconnected'

/**
 * Vigia a sala: quando ninguém além do bot fica nela por `graceMs`, chama `onEmpty`.
 * A tolerância evita que uma queda rápida de conexão de alguém tire o bot da chamada.
 * Devolve uma função que para de vigiar (chame ao encerrar a sessão).
 */
export function watchEmptyRoom(room, { graceMs, onEmpty }) {
  let timer = null
  let stopped = false

  const humansInRoom = () => room.remoteParticipants?.size ?? 0

  const clear = () => {
    if (timer) { clearTimeout(timer); timer = null }
  }

  const evaluate = () => {
    if (stopped) return
    if (humansInRoom() > 0) {
      clear()
      return
    }
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      if (!stopped && humansInRoom() === 0) onEmpty()
    }, graceMs)
  }

  room.on(EVENT_CONNECTED, evaluate)
  room.on(EVENT_DISCONNECTED, evaluate)
  evaluate()

  return function stop() {
    stopped = true
    clear()
    room.off?.(EVENT_CONNECTED, evaluate)
    room.off?.(EVENT_DISCONNECTED, evaluate)
  }
}
