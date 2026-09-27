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

  it('se o prazo acabar sem o Echo aberto, abre mesmo assim em vez de desistir', () => {
    const script = buildRelaunchScript('C:\\Echo\\Echo.exe', 'echo-updater')
    const lastLine = script.trim().split('\n').at(-1)
    expect(lastLine).toContain('if (-not (Get-Process -Name $name))')
    expect(lastLine).toContain('Start-Process -FilePath $exe')
  })

  it('registra as decisões no update.log', () => {
    const script = buildRelaunchScript('C:\\Echo\\Echo.exe', 'echo-updater', "C:\\Users\\O'Neil\\update.log")
    expect(script).toContain("$log = 'C:\\Users\\O''Neil\\update.log'")
    expect(script).toContain('Log "Echo reaberto pelo instalador"')
    expect(script).toContain('Log "instalador terminou sem reabrir')
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
