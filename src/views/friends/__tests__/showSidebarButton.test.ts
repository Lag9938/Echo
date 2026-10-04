/// <reference types="node" />
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Bug real: com uma conversa aberta e a barra de conversas oculta, o botão de reexibir a barra usava só a
// classe do "voltar" (visível apenas em janela estreita). Em janela normal ele sumia e a barra não voltava.
describe('botão de reexibir a barra de conversas', () => {
  const root = path.resolve(__dirname, '../../..')
  const css = fs.readFileSync(path.join(root, 'styles/friends.css'), 'utf8')

  it.each(['DMConversation.tsx', 'GroupConversation.tsx'])('em %s o botão tem a classe que aparece em qualquer largura', (file) => {
    const source = fs.readFileSync(path.join(root, 'views/friends', file), 'utf8')
    const button = source.match(/className="([^"]*)"\s*onClick=\{\(\) => setShowSidebar\(true\)\}/)
    expect(button?.[1].split(' ')).toContain('dm-show-sidebar-btn')
  })

  it('a regra que mostra o botão fica fora de qualquer @media e depois da regra que esconde o "voltar"', () => {
    const show = css.indexOf('.dm-back-to-friends-btn.dm-show-sidebar-btn {')
    expect(show).toBeGreaterThan(css.indexOf('.dm-back-to-friends-btn {\n  display: none'.replace('\n', css.includes('\r\n') ? '\r\n' : '\n')))
    expect(css.slice(show, show + 80)).toContain('display: flex')
    // Fora de @media: até ali, todas as chaves abertas já foram fechadas
    const before = css.slice(0, show)
    expect(before.split('{').length).toBe(before.split('}').length)
  })
})
