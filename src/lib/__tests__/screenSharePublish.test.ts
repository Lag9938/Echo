/// <reference types="node" />
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ScreenSharePresets, Track } from 'livekit-client'
import { screenSharePublishEncoding } from '../screenShareQuality'

// Bug real: toda transmissão de tela saía travada em 15 FPS e 2,5 Mbps. O Echo passava o limite só em
// `videoEncoding`, que o LiveKit ignora para faixas de tela; ele usa `screenShareEncoding`, com padrão de
// 15 FPS. Quem assistia recebia 15 quadros por segundo com qualquer FPS escolhido.
describe('limites ao publicar a tela no LiveKit', () => {
  it('o limite vai nas duas opções, inclusive na que o LiveKit lê para tela', () => {
    expect(screenSharePublishEncoding(8_000_000, 60)).toEqual({
      videoEncoding: { maxBitrate: 8_000_000, maxFramerate: 60 },
      screenShareEncoding: { maxBitrate: 8_000_000, maxFramerate: 60 }
    })
  })

  it('a biblioteca do LiveKit instalada continua lendo screenShareEncoding para tela, com padrão de 15 FPS', () => {
    // Se uma atualização do LiveKit mudar isto, este teste avisa para rever a publicação da tela
    const library = fs.readFileSync(path.resolve(__dirname, '../../../node_modules/livekit-client/dist/livekit-client.esm.mjs'), 'utf8')
    expect(library).toMatch(/if \(isScreenShare\) \{\s*videoEncoding = [^;]*\.screenShareEncoding;/)
    expect(library).toContain('screenShareEncoding: ScreenSharePresets.h1080fps15.encoding')
    expect(ScreenSharePresets.h1080fps15.encoding).toMatchObject({ maxFramerate: 15, maxBitrate: 2_500_000 })
  })

  it('a publicação da tela no app usa esses limites', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../useVoiceChannel.ts'), 'utf8')
    const publish = source.slice(source.indexOf('source: Track.Source.ScreenShare,'))
    expect(publish.slice(0, 900)).toContain('...screenSharePublishEncoding(calculatedBitrate, targetFps)')
    expect(Track.Source.ScreenShare).toBe('screen_share')
  })
})
