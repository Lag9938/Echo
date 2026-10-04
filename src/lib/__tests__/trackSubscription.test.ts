import { describe, it, expect } from 'vitest'
import { syncTrackSubscription } from '../trackSubscription'

// Imita a publicação remota do LiveKit: com assinatura automática ela nasce "desejada", mas a faixa só chega
// um instante depois — nesse intervalo isSubscribed é false mesmo com o servidor prestes a enviar.
function fakePublication(autoSubscribe = true) {
  let subscribed: boolean | undefined = autoSubscribe ? undefined : false
  let trackArrived = false
  const requests: boolean[] = []
  return {
    requests,
    arrive() { trackArrived = true },
    get isDesired() { return subscribed !== false },
    get isSubscribed() { return subscribed !== false && trackArrived },
    setSubscribed(value: boolean) { subscribed = value; requests.push(value) }
  }
}

describe('syncTrackSubscription', () => {
  it('cancela a transmissão que acabou de começar para quem NÃO está assistindo, antes mesmo de a faixa chegar', () => {
    // Bug real: a conta usava isSubscribed (ainda false), concluía que não havia o que cancelar e a
    // transmissão inteira era entregue a quem não assistia.
    const pub = fakePublication()
    expect(pub.isSubscribed).toBe(false)

    expect(syncTrackSubscription(pub, false)).toBe(true)

    expect(pub.requests).toEqual([false])
    pub.arrive()
    expect(pub.isSubscribed).toBe(false)
  })

  it('não repete o pedido quando o estado já é o desejado', () => {
    const pub = fakePublication()
    syncTrackSubscription(pub, false)
    expect(syncTrackSubscription(pub, false)).toBe(false)
    expect(pub.requests).toEqual([false])

    const watching = fakePublication()
    expect(syncTrackSubscription(watching, true)).toBe(false)
    expect(watching.requests).toEqual([])
  })

  it('parar de assistir cancela e voltar a assistir assina de novo', () => {
    const pub = fakePublication()
    pub.arrive()
    expect(syncTrackSubscription(pub, false)).toBe(true)
    expect(syncTrackSubscription(pub, true)).toBe(true)
    expect(pub.requests).toEqual([false, true])
  })

  it('participante sem transmissão não faz nada', () => {
    expect(syncTrackSubscription(undefined, false)).toBe(false)
    expect(syncTrackSubscription(null, true)).toBe(false)
  })
})
