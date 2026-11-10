import { describe, it, expect } from 'vitest'
import { cinemaScrimFor, streamAspectRatio } from '../StreamTile'

describe('contraste automático da faixa de cinema', () => {
  it('cena escura pede degradê leve; imagem clara pede degradê forte', () => {
    expect(cinemaScrimFor(0)).toBe(0.45)
    expect(cinemaScrimFor(1)).toBe(0.9)
    expect(cinemaScrimFor(0.5)).toBeGreaterThan(cinemaScrimFor(0.1))
  })

  it('anda em passos de 0,05 e aguenta medições fora da faixa', () => {
    expect((cinemaScrimFor(0.37) * 20) % 1).toBeCloseTo(0, 6)
    expect(cinemaScrimFor(-3)).toBe(0.45)
    expect(cinemaScrimFor(7)).toBe(0.9)
    expect(cinemaScrimFor(Number.NaN)).toBe(0.45)
  })
})

describe('formato da moldura da transmissão', () => {
  it('usa a proporção medida do vídeo', () => {
    expect(Number(streamAspectRatio('960x540'))).toBeCloseTo(16 / 9, 3)
    expect(Number(streamAspectRatio('2560x1080'))).toBeCloseTo(2.3704, 3)
  })

  it('enquanto não mediu (ou mediu algo estranho), fica em 16:9 ou num limite razoável', () => {
    expect(streamAspectRatio('')).toBe('1.7778')
    expect(streamAspectRatio(undefined)).toBe('1.7778')
    expect(streamAspectRatio('0x0')).toBe('1.7778')
    expect(Number(streamAspectRatio('4000x100'))).toBe(3)
    expect(Number(streamAspectRatio('100x900'))).toBe(1)
  })
})
