import { describe, it, expect } from 'vitest'
import { effectiveShareFps, isSixtyFpsAllowed, screenShareBitrate } from '../screenShareQuality'

describe('screenShareBitrate', () => {
  it('1080p: 8 Mbps a 60 FPS e 5 Mbps a 30 FPS', () => {
    expect(screenShareBitrate(1920, 60)).toBe(8_000_000)
    expect(screenShareBitrate(1920, 30)).toBe(5_000_000)
  })

  it('720p: 5 Mbps a 60 FPS e 3 Mbps a 30 FPS', () => {
    expect(screenShareBitrate(1280, 60)).toBe(5_000_000)
    expect(screenShareBitrate(1280, 30)).toBe(3_000_000)
  })

  it('15 FPS usa o mesmo teto de 30; resolução nativa conta como alta', () => {
    expect(screenShareBitrate(1920, 15)).toBe(5_000_000)
    expect(screenShareBitrate(undefined, 60)).toBe(8_000_000)
    expect(screenShareBitrate(2560, 30)).toBe(5_000_000)
  })
})

describe('bloqueio de 60 FPS', () => {
  const chrome = { id: 'window:1:0', type: 'window', name: 'YouTube Music - Google Chrome', isGame: false }
  const horizon = { id: 'window:2:0', type: 'window', name: 'Horizon Forbidden West', isGame: true }
  const monitor = { id: 'screen:0:0', type: 'screen', name: 'Tela 1' }

  it('jogo e tela inteira podem 60 FPS', () => {
    expect(isSixtyFpsAllowed(horizon)).toBe(true)
    expect(isSixtyFpsAllowed(monitor)).toBe(true)
    expect(isSixtyFpsAllowed({ name: 'VALORANT (Jogo)' })).toBe(true)
    expect(isSixtyFpsAllowed(null, 'screen:1:0')).toBe(true)
  })

  it('navegador e outros aplicativos NÃO podem 60 FPS', () => {
    expect(isSixtyFpsAllowed(chrome)).toBe(false)
    expect(isSixtyFpsAllowed({ id: 'window:3:0', type: 'window', name: 'Visual Studio Code' })).toBe(false)
    expect(isSixtyFpsAllowed(null)).toBe(false)
    expect(isSixtyFpsAllowed(undefined, 'window:9:0')).toBe(false)
  })

  it('pedir 60 numa janela de navegador vira 30; 15 e 30 passam como estão', () => {
    expect(effectiveShareFps(60, chrome)).toBe(30)
    expect(effectiveShareFps(30, chrome)).toBe(30)
    expect(effectiveShareFps(15, chrome)).toBe(15)
  })

  it('pedir 60 num jogo ou numa tela inteira continua 60', () => {
    expect(effectiveShareFps(60, horizon)).toBe(60)
    expect(effectiveShareFps(60, monitor)).toBe(60)
  })

  it('o bitrate maior não fura o bloqueio: navegador a "60" fica com o teto de 30 FPS', () => {
    const fps = effectiveShareFps(60, chrome)
    expect(screenShareBitrate(1920, fps)).toBe(5_000_000)
  })
})
