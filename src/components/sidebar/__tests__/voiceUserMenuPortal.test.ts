/// <reference types="node" />
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Bug real: o menu que abre ao clicar num usuário da chamada (volume, mover, silenciar…) era desenhado dentro
// da barra lateral. No layout de vidro a barra tem backdrop-filter e overflow hidden, então ela cortava o menu
// na própria borda e só aparecia uma fatia dele. O menu precisa ser desenhado em document.body.
describe('menu do usuário da chamada na barra lateral', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../ChannelsSidebar.tsx'), 'utf8')

  it('é desenhado em document.body, fora da barra que corta o que passa da borda', () => {
    const start = source.indexOf('{voiceUserMenu && createPortal(')
    expect(start).toBeGreaterThan(-1)
    const popover = source.indexOf('className="voice-user-menu-popover"', start)
    const target = source.indexOf(', document.body)}', start)
    expect(popover).toBeGreaterThan(start)
    expect(target).toBeGreaterThan(popover)
    // Nenhum outro lugar desenha o menu direto na barra
    expect(source.split('className="voice-user-menu-popover"').length).toBe(2)
  })
})
