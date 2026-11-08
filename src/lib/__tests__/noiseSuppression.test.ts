import { describe, it, expect, vi } from 'vitest'
import { browserNoiseSuppression, restoreBrowserNoiseSuppression } from '../audio/noiseSuppression'

function streamWithTrack(applyConstraints = vi.fn().mockResolvedValue(undefined)) {
  const stream = { getAudioTracks: () => [{ applyConstraints }] } as unknown as MediaStream
  return { stream, applyConstraints }
}

describe('supressão de ruído do navegador', () => {
  it('fica desligada quando a IA está ligada', () => {
    expect(browserNoiseSuppression(true, true)).toBe(false)
    expect(browserNoiseSuppression(true, false)).toBe(true)
    expect(browserNoiseSuppression(false, false)).toBe(false)
  })

  it('volta a ligar quando a IA foi pedida mas não carregou', async () => {
    const { stream, applyConstraints } = streamWithTrack()
    expect(await restoreBrowserNoiseSuppression(stream, true, true, false)).toBe(true)
    expect(applyConstraints).toHaveBeenCalledWith({ noiseSuppression: true })
  })

  it('não mexe quando a IA está funcionando, não foi pedida ou a pessoa desligou a supressão', async () => {
    for (const [pref, requested, active] of [[true, true, true], [true, false, false], [false, true, false]]) {
      const { stream, applyConstraints } = streamWithTrack()
      expect(await restoreBrowserNoiseSuppression(stream, pref, requested, active)).toBe(false)
      expect(applyConstraints).not.toHaveBeenCalled()
    }
    expect(await restoreBrowserNoiseSuppression(null, true, true, false)).toBe(false)
  })

  it('se o navegador recusar, não derruba a chamada', async () => {
    const { stream } = streamWithTrack(vi.fn().mockRejectedValue(new Error('OverconstrainedError')))
    expect(await restoreBrowserNoiseSuppression(stream, true, true, false)).toBe(false)
  })
})
