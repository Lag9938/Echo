import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildRelaunchScript, appendUpdateLog } from '../services/updateRelaunch.js'

describe('buildRelaunchScript', () => {
  it('aponta para o executável e para a pasta do atualizador', () => {
    const script = buildRelaunchScript('C:\\Users\\a\\AppData\\Local\\Programs\\Echo\\Echo.exe', 'echo-updater')
    expect(script).toContain("$exe = 'C:\\Users\\a\\AppData\\Local\\Programs\\Echo\\Echo.exe'")
    expect(script).toContain("'*\\echo-updater\\*'")
    expect(script).toContain('Start-Process -FilePath $exe')
  })

  it('escapa aspas simples no caminho para não quebrar o script', () => {
    const script = buildRelaunchScript("C:\\Users\\O'Neil\\Echo.exe", 'echo-updater')
    expect(script).toContain("$exe = 'C:\\Users\\O''Neil\\Echo.exe'")
  })

  it('espera o app antigo fechar antes de decidir se precisa reabrir', () => {
    const script = buildRelaunchScript('C:\\Echo\\Echo.exe', 'echo-updater')
    const waitOldApp = script.indexOf('while ((Get-Date) -lt $deadline -and (Get-Process -Name $name))')
    const relaunch = script.indexOf('Start-Process')
    expect(waitOldApp).toBeGreaterThan(-1)
    expect(waitOldApp).toBeLessThan(relaunch)
  })
})

describe('appendUpdateLog', () => {
  it('acrescenta linhas com data e não falha sem arquivo', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'echo-log-')), 'update.log')
    appendUpdateLog(file, 'primeira')
    appendUpdateLog(file, 'segunda')
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T.*primeira$/)
    expect(() => appendUpdateLog(undefined, 'x')).not.toThrow()
    expect(() => appendUpdateLog(path.join(os.tmpdir(), 'nao', 'existe', 'a.log'), 'x')).not.toThrow()
  })
})
