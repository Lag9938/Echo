import { describe, it, expect } from 'vitest'
import { accentVariants, adjustForContrast, contrastRatio, parseHex } from '../accentContrast'

const ratio = (a: string, b: string) => contrastRatio(parseHex(a)!, parseHex(b)!)

describe('contrastRatio', () => {
  it('bate com os valores de referência do WCAG', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(ratio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
})

describe('adjustForContrast', () => {
  it('não mexe em quem já passa', () => {
    expect(adjustForContrast('#2a1f2d', '#ffffff', 4.5, 'darken')).toBe('#2a1f2d')
  })

  it('escurece o coral até o texto branco passar de 4,5:1, mantendo o matiz avermelhado', () => {
    const out = adjustForContrast('#df6d5d', '#ffffff', 4.5, 'darken')
    expect(ratio('#ffffff', out)).toBeGreaterThanOrEqual(4.5)
    const [r, g, b] = parseHex(out)!
    expect(r).toBeGreaterThan(g)
    expect(r).toBeGreaterThan(b)
  })

  it('clareia no tema escuro até o texto colorido ler sobre o fundo', () => {
    const out = adjustForContrast('#5a3a8a', '#1a191e', 4.6, 'lighten')
    expect(ratio(out, '#1a191e')).toBeGreaterThanOrEqual(4.6)
  })

  it('devolve a cor original se ela não for um hexadecimal válido', () => {
    expect(adjustForContrast('azul', '#ffffff', 4.5, 'darken')).toBe('azul')
  })
})

describe('accentVariants', () => {
  it.each(['#df6d5d', '#00f2fe', '#fbbf24', '#a855f7', '#10b981', '#ffffff'])('com %s: botão e texto passam de 4,5:1 nos dois temas', (color) => {
    const light = accentVariants(color, 'light')
    expect(ratio('#ffffff', light.fillTop)).toBeGreaterThanOrEqual(4.5)
    expect(ratio('#ffffff', light.fill)).toBeGreaterThanOrEqual(4.9)
    expect(ratio(light.text, '#e4dadd')).toBeGreaterThanOrEqual(4.6)

    const dark = accentVariants(color, 'dark')
    expect(ratio(dark.text, '#1a191e')).toBeGreaterThanOrEqual(4.6)
  })
})
