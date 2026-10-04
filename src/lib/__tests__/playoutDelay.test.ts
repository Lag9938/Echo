import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screenPlayoutDelays, setTrackPlayoutDelay } from '../playoutDelay'
import { clampStreamSmoothing, useStreamSettingsStore, STREAM_SMOOTHING_DEFAULT_MS } from '../../stores/useStreamSettingsStore'

describe('setTrackPlayoutDelay', () => {
  it('pede a reserva pelas três formas: a do LiveKit (segundos) e as duas do WebRTC', () => {
    const track = { setPlayoutDelay: vi.fn(), receiver: { playoutDelayHint: 0, jitterBufferTarget: 0 as number | null } }
    setTrackPlayoutDelay(track, 150)
    expect(track.setPlayoutDelay).toHaveBeenCalledWith(0.15)
    expect(track.receiver.playoutDelayHint).toBe(0.15)
    expect(track.receiver.jitterBufferTarget).toBe(150)
  })

  it('só mexe no que o navegador oferece', () => {
    const onlyNew = { receiver: { jitterBufferTarget: null as number | null } }
    setTrackPlayoutDelay(onlyNew, 400)
    expect(onlyNew.receiver).toEqual({ jitterBufferTarget: 400 })

    const noReceiver = { setPlayoutDelay: vi.fn() }
    setTrackPlayoutDelay(noReceiver, 400)
    expect(noReceiver.setPlayoutDelay).toHaveBeenCalledWith(0.4)
  })

  it('valor negativo ou inválido vira zero; faixa ausente e navegador que recusa não derrubam nada', () => {
    const track = { receiver: { jitterBufferTarget: 99 as number | null } }
    setTrackPlayoutDelay(track, -50)
    expect(track.receiver.jitterBufferTarget).toBe(0)
    setTrackPlayoutDelay(track, NaN)
    expect(track.receiver.jitterBufferTarget).toBe(0)

    expect(() => setTrackPlayoutDelay(null, 100)).not.toThrow()
    const throwing = {
      setPlayoutDelay: () => { throw new Error('não suportado') },
      receiver: Object.defineProperty({}, 'jitterBufferTarget', { set: () => { throw new Error('recusado') }, get: () => 0 })
    }
    expect(() => setTrackPlayoutDelay(throwing as any, 100)).not.toThrow()
  })
})

describe('screenPlayoutDelays', () => {
  it('o áudio leva a mesma reserva do vídeo mais a sincronia labial manual (som nunca antes da imagem)', () => {
    expect(screenPlayoutDelays(150, 0)).toEqual({ videoMs: 150, audioMs: 150 })
    expect(screenPlayoutDelays(150, 75)).toEqual({ videoMs: 150, audioMs: 225 })
    expect(screenPlayoutDelays(0, 50)).toEqual({ videoMs: 0, audioMs: 50 })
  })
})

describe('fluidez da transmissão (preferência de quem assiste)', () => {
  beforeEach(() => localStorage.clear())

  it('limita entre 0 e 1000 ms e cai no padrão com valor inválido', () => {
    expect(clampStreamSmoothing(-10)).toBe(0)
    expect(clampStreamSmoothing(5000)).toBe(1000)
    expect(clampStreamSmoothing('400')).toBe(400)
    expect(clampStreamSmoothing('abc')).toBe(STREAM_SMOOTHING_DEFAULT_MS)
  })

  it('trocar a fluidez salva a escolha e avisa quem está ouvindo', () => {
    const listener = vi.fn()
    const unsubscribe = useStreamSettingsStore.subscribe(listener)
    useStreamSettingsStore.getState().setSmoothingMs(400)
    unsubscribe()

    expect(useStreamSettingsStore.getState().smoothingMs).toBe(400)
    expect(localStorage.getItem('echo-stream-smoothing-ms')).toBe('400')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
