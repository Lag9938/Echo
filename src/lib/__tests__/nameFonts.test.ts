import { describe, it, expect, beforeEach } from 'vitest'
import { NAME_FONTS, NAME_FONT_CATEGORIES, getNameFont, nameFontStyle, resolveNameFontId, rememberNameFont, readStoredNameFont, storeNameFont } from '../nameFonts'

describe('fontes de nome', () => {
  beforeEach(() => localStorage.clear())

  it('os ids são únicos e cada categoria usada existe na loja', () => {
    const ids = NAME_FONTS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const f of NAME_FONTS) expect(NAME_FONT_CATEGORIES).toContain(f.category)
  })

  it('nenhuma fonte é exclusiva do Echo VIP: todas podem ser adquiridas de graça', () => {
    expect(NAME_FONTS.filter((f) => f.vip)).toEqual([])
  })

  it('id vazio, "none" ou de uma fonte que saiu do catálogo = fonte padrão (sem estilo)', () => {
    expect(nameFontStyle('')).toBeUndefined()
    expect(nameFontStyle('none')).toBeUndefined()
    expect(nameFontStyle('fonte_que_nao_existe')).toBeUndefined()
    expect(getNameFont('none')).toBeNull()
  })

  it('o estilo traz família, peso, tamanho relativo e folga lateral; o itálico só onde a fonte é itálica', () => {
    const s = nameFontStyle('sussurro')!
    expect(s.fontFamily).toContain("'Cormorant Garamond'")
    expect(s.fontStyle).toBe('italic')
    expect(s.fontSize).toBe('1.12em')
    expect(s.paddingInline).toBe('0.12em')
    expect(nameFontStyle('brisa')!.fontStyle).toBe('normal')
  })

  it('a fonte ornamentada reduz a altura da linha para não sobrepor o texto vizinho', () => {
    expect(nameFontStyle('monograma')!.lineHeight).toBe(0.95)
    expect(nameFontStyle('brisa')!.lineHeight).toBe(1.1)
  })

  it('a minha fonte vem da tela; a dos outros, da presença e, offline, do último valor visto', () => {
    expect(resolveNameFontId('eu', 'eu', 'brisa', {})).toBe('brisa')
    expect(resolveNameFontId('ana', 'eu', 'brisa', { ana: { name_font: 'rabisco' } })).toBe('rabisco')
    rememberNameFont('bia', 'caligrafia')
    expect(resolveNameFontId('bia', 'eu', 'brisa', {})).toBe('caligrafia')
    expect(resolveNameFontId('carlos', 'eu', 'brisa', undefined)).toBe('')
  })

  it('guarda e lê a fonte por pessoa', () => {
    storeNameFont('eu', 'neon_grid')
    expect(readStoredNameFont('eu')).toBe('neon_grid')
    expect(readStoredNameFont('outro')).toBe('')
  })
})
