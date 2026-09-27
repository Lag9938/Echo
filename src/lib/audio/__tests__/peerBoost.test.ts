import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PeerBoost } from '../peerBoost'

// Web Audio falso: registra os nós criados e as ligações
function makeFakeAudioContext() {
  const created: any = { gains: [], sources: [], limiters: [], setSinkId: vi.fn().mockResolvedValue(undefined) }
  class FakeAudioContext {
    state = 'running'
    destination = { name: 'destination' }
    setSinkId = created.setSinkId
    resume = vi.fn().mockResolvedValue(undefined)
    createMediaStreamSource = vi.fn((stream: any) => {
      const node = { stream, connect: vi.fn(), disconnect: vi.fn() }
      created.sources.push(node)
      return node
    })
    createGain = vi.fn(() => {
      const node = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }
      created.gains.push(node)
      return node
    })
    createDynamicsCompressor = vi.fn(() => {
      const node = {
        threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 },
        connect: vi.fn(), disconnect: vi.fn()
      }
      created.limiters.push(node)
      return node
    })
  }
  vi.stubGlobal('AudioContext', FakeAudioContext)
  return created
}

function makeAudio(withStream = true) {
  class FakeMediaStream {
    getAudioTracks() { return [{ kind: 'audio' }] }
  }
  vi.stubGlobal('MediaStream', FakeMediaStream)
  return { volume: 1, muted: false, srcObject: withStream ? new FakeMediaStream() : null } as any
}

describe('PeerBoost', () => {
  let created: ReturnType<typeof makeFakeAudioContext>
  let boost: PeerBoost

  beforeEach(() => {
    created = makeFakeAudioContext()
    boost = new PeerBoost()
  })

  it('até 100% usa só o <audio>, sem Web Audio', () => {
    const audio = makeAudio()
    boost.apply('a-voice', audio, 0.7, false)
    expect(audio.volume).toBe(0.7)
    expect(audio.muted).toBe(false)
    expect(created.gains).toHaveLength(0)
    expect(boost.isBoosting('a-voice')).toBe(false)
  })

  it('acima de 100% liga o ganho, deixa o elemento mudo e aplica o volume pedido', () => {
    const audio = makeAudio()
    boost.apply('a-voice', audio, 2, false)
    expect(created.gains).toHaveLength(1)
    expect(created.gains[0].gain.value).toBe(2)
    expect(audio.muted).toBe(true)
    expect(audio.volume).toBe(1)
    expect(boost.isBoosting('a-voice')).toBe(true)
    // fonte -> ganho -> limitador -> saída
    expect(created.sources[0].connect).toHaveBeenCalledWith(created.gains[0])
    expect(created.gains[0].connect).toHaveBeenCalledWith(created.limiters[0])
  })

  it('mudar o volume acima de 100% reaproveita o mesmo ganho', () => {
    const audio = makeAudio()
    boost.apply('a-voice', audio, 1.5, false)
    boost.apply('a-voice', audio, 1.8, false)
    expect(created.gains).toHaveLength(1)
    expect(created.gains[0].gain.value).toBe(1.8)
  })

  it('voltar a 100% ou menos desfaz o ganho e devolve o som ao elemento', () => {
    const audio = makeAudio()
    boost.apply('a-voice', audio, 2, false)
    boost.apply('a-voice', audio, 1, false)
    expect(boost.isBoosting('a-voice')).toBe(false)
    expect(created.gains[0].disconnect).toHaveBeenCalled()
    expect(audio.muted).toBe(false)
    expect(audio.volume).toBe(1)
  })

  it('ensurdecido ou volume 0 silencia e não mantém o ganho', () => {
    const audio = makeAudio()
    boost.apply('a-voice', audio, 2, false)
    boost.apply('a-voice', audio, 2, true)
    expect(audio.muted).toBe(true)
    expect(boost.isBoosting('a-voice')).toBe(false)

    boost.apply('a-voice', audio, 0, false)
    expect(audio.muted).toBe(true)
    // ao desensurdecer o reforço volta
    boost.apply('a-voice', audio, 2, false)
    expect(boost.isBoosting('a-voice')).toBe(true)
  })

  it('sem MediaStream no elemento cai para o máximo do <audio>', () => {
    const audio = makeAudio(false)
    boost.apply('a-voice', audio, 2, false)
    expect(created.gains).toHaveLength(0)
    expect(audio.volume).toBe(1)
    expect(audio.muted).toBe(false)
  })

  it('nova MediaStream (voz reassinada) recria o caminho do ganho', () => {
    const audio = makeAudio()
    boost.apply('a-voice', audio, 2, false)
    audio.srcObject = new (globalThis as any).MediaStream()
    boost.apply('a-voice', audio, 2, false)
    expect(created.gains).toHaveLength(2)
    expect(created.gains[0].disconnect).toHaveBeenCalled()
  })

  it('valores fora de 0–2 são limitados', () => {
    const audio = makeAudio()
    boost.apply('a-voice', audio, 5, false)
    expect(created.gains[0].gain.value).toBe(2)
    boost.apply('a-voice', audio, -1, false)
    expect(audio.muted).toBe(true)
  })

  it('releaseAll desliga todos e o dispositivo de saída vai para o contexto', () => {
    const a = makeAudio(); const b = makeAudio()
    boost.apply('a-voice', a, 2, false)
    boost.apply('b-voice', b, 1.5, false)
    boost.setSinkId('device-123')
    expect(created.setSinkId).toHaveBeenCalledWith('device-123')
    boost.releaseAll()
    expect(boost.isBoosting('a-voice')).toBe(false)
    expect(boost.isBoosting('b-voice')).toBe(false)
  })
})
