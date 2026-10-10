/// <reference types="node" />
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('layout da barra lateral de canais', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../ChannelsSidebar.tsx'), 'utf8')
  const css = fs.readFileSync(path.resolve(__dirname, '../../../styles/sidebar.css'), 'utf8')

  it('mostra os canais de voz antes dos canais de texto', () => {
    const voice = source.indexOf('className="channel-group channel-group-voice"')
    const text = source.indexOf('className="channel-group channel-group-text"')
    expect(voice).toBeGreaterThan(-1)
    expect(text).toBeGreaterThan(voice)
  })

  it('não mexe no cabeçalho do espaço (capa, ícone e nome)', () => {
    expect(source).toContain('server-header-card')
    expect(source).toContain('server-avatar-squircle')
    expect(source).toContain('server-title')
    expect(css).not.toMatch(/channel-group-text[^{]*server-header-card/)
  })

  it('os canais de texto viram cartões em duas colunas e a sala ativa fica verde', () => {
    expect(css).toMatch(/\.channel-group-text \.category-channels-list \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
    expect(css).toMatch(/\.voice-channel-node\.is-active-call\.has-users \{[^}]*rgba\(34, 197, 94/)
  })

  it('mantém o botão de novidades e o de configurações no rodapé', () => {
    const footer = fs.readFileSync(path.resolve(__dirname, '../UnifiedUserProfileFooter.tsx'), 'utf8')
    expect(footer).toContain('title="Novidades & Versões"')
    expect(footer).toContain('title="Configurações"')
  })
})
