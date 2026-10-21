import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { LARGE_DECORATION_PX, isSmallDecorationBox } from '../decorationMotion'

describe('quando a decoração se mexe', () => {
  it('pequena (lista) abaixo de 100 px de caixa; grande a partir daí', () => {
    expect(isSmallDecorationBox(50)).toBe(true) // avatar de 32 px
    expect(isSmallDecorationBox(99)).toBe(true)
    expect(isSmallDecorationBox(LARGE_DECORATION_PX)).toBe(false)
    expect(isSmallDecorationBox(175)).toBe(false) // avatar de 112 px
  })

  it('o CSS usa o mesmo corte (container query logo abaixo de 100 px)', () => {
    const css = readFileSync(resolve(__dirname, '../../styles/decoration-motion.css'), 'utf8')
    expect(css).toContain(`@container (max-width: ${LARGE_DECORATION_PX - 0.02}px)`)
    expect(css).toContain('container-type: inline-size')
  })
})
