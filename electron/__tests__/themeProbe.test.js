import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readStoredTheme, storeTheme, probeTheme } from '../services/themeProbe.js'

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'echo-theme-'))

describe('tema para as janelinhas do atualizador', () => {
  it('sem arquivo, o tema é escuro', () => {
    expect(readStoredTheme(tmp())).toBe('dark')
  })

  it('guarda e lê o tema claro', () => {
    const dir = tmp()
    storeTheme(dir, 'light')
    expect(readStoredTheme(dir)).toBe('light')
    storeTheme(dir, 'dark')
    expect(readStoredTheme(dir)).toBe('dark')
  })

  it('pergunta à tela e guarda a resposta', async () => {
    const dir = tmp()
    const win = { isDestroyed: () => false, webContents: { executeJavaScript: async () => true } }
    expect(await probeTheme(win, dir)).toBe('light')
    expect(readStoredTheme(dir)).toBe('light')
  })

  it('sem tela, ou se ela não responde a tempo, vale o último tema guardado', async () => {
    const dir = tmp()
    storeTheme(dir, 'light')
    expect(await probeTheme(null, dir)).toBe('light')
    const slow = { isDestroyed: () => false, webContents: { executeJavaScript: () => new Promise(() => {}) } }
    expect(await probeTheme(slow, dir, 20)).toBe('light')
    const broken = { isDestroyed: () => false, webContents: { executeJavaScript: async () => { throw new Error('x') } } }
    expect(await probeTheme(broken, dir)).toBe('light')
  })
})
