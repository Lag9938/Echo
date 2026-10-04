import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { StreamTile } from '../StreamTile'
import { useScreenShareStatsStore } from '../../../stores/useScreenShareStatsStore'

const ME = 'me'
const ANA = 'ana'

// Um MediaStream de verdade (o <video> só aceita esse tipo), com a faixa de vídeo trocada por uma de teste
const fakeStream = (trackId: string) => {
  const stream = new MediaStream()
  stream.getVideoTracks = () => [{ id: trackId, getSettings: () => ({}) }] as unknown as MediaStreamTrack[]
  stream.getAudioTracks = () => []
  return stream
}

function renderTile(participant: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const props: any = {
    participant,
    user: { id: ME },
    peerScreenVolumes: {},
    setPeerScreenVolumes: vi.fn(),
    localScreenFps: 60,
    ...extra
  }
  const view = render(<StreamTile {...props} />)
  fireEvent.click(view.container.querySelector('button[title="Estatísticas da Transmissão"]') as HTMLElement)
  return view
}

// Sem os espaços entre o rótulo e o valor, que variam com a quebra de linha do JSX
const hudText = (container: HTMLElement) => (container.querySelector('.stream-stats-hud-grid')?.textContent ?? '').replace(/:\s+/g, ':')
const pill = (container: HTMLElement) => container.querySelector('.stream-quality-pill') as HTMLElement

describe('Estatísticas reais da transmissão', () => {
  beforeEach(() => act(() => useScreenShareStatsStore.getState().reset()))

  it('antes da primeira medição mostra a meta, marcada como "medindo"', () => {
    const { container } = renderTile({ userId: ME, displayName: 'Eu', screenStream: fakeStream('local') })
    expect(hudText(container)).toContain('medindo…')
    expect(hudText(container)).toContain('60 FPS')
    expect(pill(container).textContent).toContain('60 FPS')
    expect(pill(container).title).toContain('ainda medindo')
  })

  it('quem transmite vê o que está de fato enviando: quadros, captura, resolução, bitrate, codec e limitação', () => {
    act(() => useScreenShareStatsStore.getState().setStats(
      { fps: 41.5, width: 1920, height: 1080, kbps: 5230, codec: 'H264', hardware: true, captureFps: 60, limitation: 'cpu' },
      {}
    ))
    const { container } = renderTile({ userId: ME, displayName: 'Eu', screenStream: fakeStream('local') })
    const text = hudText(container)

    expect(text).toContain('Quadros enviados:41.5 FPS (meta 60)')
    expect(text).toContain('Quadros capturados:60.0 FPS')
    expect(text).toContain('1920x1080')
    expect(text).toContain('5.2 Mbps')
    expect(text).toContain('H264 (placa de vídeo)')
    expect(text).toContain('Processador ou placa de vídeo no limite')
    // A captura entrega 60 e o envio está em 41: o indicador fica em alerta, com o FPS medido (não "60")
    expect(pill(container).textContent).toContain('42 FPS')
    expect(pill(container).style.color).not.toBe('')
  })

  it('tela parada (captura baixa) mostra poucos quadros sem alerta', () => {
    act(() => useScreenShareStatsStore.getState().setStats(
      { fps: 4, width: 1920, height: 1080, kbps: 120, codec: 'H264', hardware: true, captureFps: 4, limitation: 'none' },
      {}
    ))
    const { container } = renderTile({ userId: ME, displayName: 'Eu', screenStream: fakeStream('local') })
    expect(pill(container).textContent).toContain('4 FPS')
    expect(pill(container).style.color).toBe('')
  })

  it('quem assiste vê o que está recebendo daquela transmissão, com perdas e travadas', () => {
    act(() => useScreenShareStatsStore.getState().setStats(null, {
      'faixa-da-ana': { fps: 58.2, width: 1280, height: 720, kbps: 2400, codec: 'VP8', hardware: false, droppedPct: 7.5, freezes: 1, packetLossPct: 3, jitterMs: 12 },
      'outra-faixa': { fps: 15, width: 640, height: 360, kbps: 300, codec: 'VP8', hardware: false, droppedPct: 0, freezes: 0, packetLossPct: 0, jitterMs: 2 }
    }))
    const { container } = renderTile({ userId: ANA, displayName: 'Ana', screenFps: 60, screenStream: fakeStream('faixa-da-ana') })
    const text = hudText(container)

    expect(text).toContain('Quadros recebidos:58.2 FPS (meta 60)')
    expect(text).toContain('1280x720')
    expect(text).toContain('2.4 Mbps')
    expect(text).toContain('VP8 (processador)')
    expect(text).toContain('Quadros descartados:7.5%')
    expect(text).toContain('Pacotes perdidos:3%')
    expect(text).not.toContain('Quadros capturados')
    expect(pill(container).textContent).toContain('58 FPS')
    expect(pill(container).style.color).not.toBe('')
  })

  it('recepção limpa não alerta, mesmo com poucos quadros (a tela de quem transmite pode estar parada)', () => {
    act(() => useScreenShareStatsStore.getState().setStats(null, {
      'faixa-da-ana': { fps: 3, width: 1280, height: 720, kbps: 90, codec: 'VP8', hardware: false, droppedPct: 0, freezes: 0, packetLossPct: 0, jitterMs: 4 }
    }))
    const { container } = renderTile({ userId: ANA, displayName: 'Ana', screenFps: 60, screenStream: fakeStream('faixa-da-ana') })
    expect(pill(container).textContent).toContain('3 FPS')
    expect(pill(container).style.color).toBe('')
  })
})
