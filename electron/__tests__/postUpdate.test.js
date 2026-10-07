import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { bringWindowToFront, detectVersionChange } from '../services/postUpdate.js'

describe('primeira abertura depois de atualizar', () => {
  const file = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'echo-version-')), 'last-version.txt')

  it('versão mudou: devolve a anterior e guarda a nova', () => {
    const f = file()
    fs.writeFileSync(f, '0.53.3')
    expect(detectVersionChange(f, '0.53.4')).toBe('0.53.3')
    expect(fs.readFileSync(f, 'utf8')).toBe('0.53.4')
  })

  it('mesma versão (abertura normal): não é atualização', () => {
    const f = file()
    fs.writeFileSync(f, '0.53.4\n')
    expect(detectVersionChange(f, '0.53.4')).toBeNull()
    expect(detectVersionChange(f, '0.53.4')).toBeNull()
  })

  it('sem registro anterior conta como mudança (vale já na atualização que traz este código) e passa a guardar', () => {
    const f = file()
    expect(detectVersionChange(f, '0.53.4')).toBe('desconhecida')
    expect(detectVersionChange(f, '0.53.4')).toBeNull()
  })

  it('pasta que não dá para gravar não derruba o app', () => {
    expect(() => detectVersionChange(path.join(os.tmpdir(), 'nao', 'existe', 'v.txt'), '1.0.0')).not.toThrow()
  })
})

describe('bringWindowToFront', () => {
  const fakeWindow = (over = {}) => ({
    isDestroyed: () => false,
    isMinimized: () => false,
    restore: vi.fn(), show: vi.fn(), focus: vi.fn(), moveTop: vi.fn(), setAlwaysOnTop: vi.fn(),
    ...over
  })

  it('mostra, passa na frente das outras e NÃO fica presa no topo', () => {
    const win = fakeWindow()
    expect(bringWindowToFront(win)).toBe(true)
    expect(win.show).toHaveBeenCalled()
    expect(win.focus).toHaveBeenCalled()
    expect(win.setAlwaysOnTop.mock.calls).toEqual([[true], [false]])
  })

  it('restaura se estiver minimizada', () => {
    const win = fakeWindow({ isMinimized: () => true })
    bringWindowToFront(win)
    expect(win.restore).toHaveBeenCalled()
  })

  it('janela já destruída ou ausente não lança erro', () => {
    expect(bringWindowToFront(null)).toBe(false)
    expect(bringWindowToFront(fakeWindow({ isDestroyed: () => true }))).toBe(false)
    expect(bringWindowToFront(fakeWindow({ show: () => { throw new Error('x') } }))).toBe(false)
  })
})
