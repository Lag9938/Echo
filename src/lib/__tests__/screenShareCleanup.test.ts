import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { releaseAllScreenShare, screenSharePublications, stopCaptureStream } from '../screenShareCleanup'

function track(name: string) {
  return { name, stop: vi.fn(), mediaStreamTrack: { stop: vi.fn() } }
}

function publisher(publications: Array<{ source: string; track: ReturnType<typeof track> | null }>) {
  const map = new Map(publications.map((pub, index) => [`sid-${index}`, pub]))
  return { trackPublications: map, unpublishTrack: vi.fn(async () => undefined) }
}

describe('parar a transmissão de tela', () => {
  it('trocou de janela no meio: a transmissão antiga também sai do ar', () => {
    // O defeito: só a última faixa era lembrada; a anterior continuava publicada e visível
    const oldScreen = track('janela antiga')
    const newScreen = track('janela nova')
    const screenAudio = track('áudio da tela')
    const mic = track('microfone')
    const camera = track('câmera')
    const room = publisher([
      { source: 'screen_share', track: oldScreen },
      { source: 'screen_share', track: newScreen },
      { source: 'screen_share_audio', track: screenAudio },
      { source: 'microphone', track: mic },
      { source: 'camera', track: camera }
    ])

    // O app só "lembra" da nova
    expect(releaseAllScreenShare(room, [newScreen])).toBe(3)

    for (const stopped of [oldScreen, newScreen, screenAudio]) {
      expect(room.unpublishTrack).toHaveBeenCalledWith(stopped, true)
      expect(stopped.stop).toHaveBeenCalled()
      expect(stopped.mediaStreamTrack.stop).toHaveBeenCalled()
    }
    // Microfone e câmera continuam
    expect(mic.stop).not.toHaveBeenCalled()
    expect(camera.stop).not.toHaveBeenCalled()
    expect(room.unpublishTrack).toHaveBeenCalledTimes(3)
  })

  it('parou enquanto ainda publicava: a faixa lembrada é encerrada mesmo sem constar na sala', () => {
    const pending = track('ainda negociando')
    const room = publisher([{ source: 'microphone', track: track('microfone') }])
    expect(releaseAllScreenShare(room, [pending])).toBe(1)
    expect(pending.stop).toHaveBeenCalled()
  })

  it('nunca falha pela metade: erro ao despublicar não impede parar a captura', () => {
    const screen = track('tela')
    const room = { trackPublications: new Map([['a', { source: 'screen_share', track: screen }]]), unpublishTrack: vi.fn(() => { throw new Error('sala fechada') }) }
    expect(() => releaseAllScreenShare(room)).not.toThrow()
    expect(screen.stop).toHaveBeenCalled()
    // Sem sala (já saiu da chamada): ainda para o que foi informado
    const orphan = track('órfã')
    expect(releaseAllScreenShare(null, [orphan])).toBe(1)
    expect(orphan.stop).toHaveBeenCalled()
    expect(screenSharePublications(null)).toEqual([])
  })

  it('para a captura da tela mesmo que nada tenha sido publicado', () => {
    const video = { stop: vi.fn() }
    const audio = { stop: vi.fn(() => { throw new Error('já parada') }) }
    expect(() => stopCaptureStream({ getTracks: () => [audio, video] })).not.toThrow()
    expect(video.stop).toHaveBeenCalled()
    expect(() => stopCaptureStream(null)).not.toThrow()
  })

  it('o app usa a limpeza completa ao parar e antes de começar outra transmissão', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'useVoiceChannel.ts'), 'utf8')
    const stop = source.slice(source.indexOf('const stopScreenShare = useCallback'), source.indexOf('const stopCamera = useCallback'))
    expect(stop).toContain('releaseAllScreenShare(')
    expect(stop).toContain('stopCaptureStream(')
    const start = source.slice(source.indexOf('const startScreenShare = useCallback'), source.indexOf('const changeScreenShareSettings = useCallback'))
    // Antes de capturar a nova tela, a anterior é encerrada
    expect(start.indexOf('releaseAllScreenShare(')).toBeGreaterThan(-1)
    expect(start.indexOf('releaseAllScreenShare(')).toBeLessThan(start.indexOf('chromeMediaSource'))
  })
})
