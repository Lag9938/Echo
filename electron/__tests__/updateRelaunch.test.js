import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildRelaunchScript, appendUpdateLog, buildWatchdogSpawn, startRelaunchWatchdog } from '../services/updateRelaunch.js'

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

  it('anota no update.log o que decidiu (e escapa o caminho do log)', () => {
    const script = buildRelaunchScript('C:\\Echo\\Echo.exe', 'echo-updater', "C:\\Users\\O'Neil\\update.log")
    expect(script).toContain("$logFile = 'C:\\Users\\O''Neil\\update.log'")
    expect(script).toContain('app iniciado pelo vigia')
    expect(script).toContain('tempo esgotado')
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
    const lines = script.trim().split('\n')
    expect(lines.at(-2)).toContain('if (-not (Get-Process -Name $name))')
    expect(lines.at(-2)).toContain('Start-Process -FilePath $exe')
    expect(lines.at(-1)).toBe('Finish')
  })

  it('mostra um aviso na tela durante a instalação, e a falha do aviso não impede a reabertura', () => {
    const script = buildRelaunchScript('C:\\Echo\\Echo.exe', 'echo-updater')
    expect(script).toContain('Atualizando o Echo')
    expect(script).toContain('Ele reabre sozinho em instantes.')
    // O aviso é criado dentro de try/catch e antes de qualquer espera
    const tryAt = script.indexOf('try {')
    expect(tryAt).toBeGreaterThan(-1)
    expect(script.indexOf('$form.Show()')).toBeGreaterThan(tryAt)
    expect(script.indexOf('} catch { $form = $null')).toBeGreaterThan(script.indexOf('$form.Show()'))
    expect(script.indexOf('} catch { $form = $null')).toBeLessThan(script.indexOf('while ((Get-Date) -lt $deadline'))
  })

})

// Bug real: o vigia era iniciado de um jeito em que o PowerShell saía na hora sem executar o script, e nenhum
// teste percebia porque todos só conferiam o TEXTO do script. Este roda o vigia de verdade.
describe.runIf(process.platform === 'win32')('startRelaunchWatchdog (execução real no Windows)', () => {
  it('o vigia roda de fato e anota no log, mesmo com espaço, acento e & no caminho do usuário', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'echo vigia é & cia '))
    const logFile = path.join(dir, 'update.log')

    const started = startRelaunchWatchdog({
      execPath: path.join(dir, 'EchoQueNaoExiste.exe'),
      updaterDirName: 'echo-updater-de-teste',
      logFile,
      scriptFile: path.join(dir, 'update-relaunch.ps1')
    })
    expect(started).toBe(true)

    const read = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '')
    // "app iniciado pelo vigia" só aparece depois de o script esperar o app fechar, ver que o instalador
    // acabou e mandar abrir o executável: é o caminho inteiro de quando o instalador não reabre o Echo
    await vi.waitFor(() => expect(read()).toContain('vigia: app iniciado pelo vigia'), { timeout: 25000, interval: 500 })
    expect(read()).toContain('vigia: iniciado')
    expect(read()).toContain('vigia: o app antigo fechou')
    // A janelinha "Atualizando o Echo…" foi criada de verdade neste Windows
    expect(read()).toContain('vigia: aviso de atualização na tela')
    expect(read()).not.toContain('não pôde ser mostrado')
  }, 30000)
})

describe('buildWatchdogSpawn', () => {
  it('dá ao PowerShell um console próprio (cmd /c start) e não usa "detached", que o fazia sair sem rodar', () => {
    const { command, args, options } = buildWatchdogSpawn('C:\\Users\\a\\update-relaunch.ps1')
    expect(command).toBe('cmd.exe')
    expect(args.slice(0, 6)).toEqual(['/d', '/c', 'start', '""', '/min', 'powershell.exe'])
    expect(args.at(-2)).toBe('-File')
    expect(args.at(-1)).toBe('C:\\Users\\a\\update-relaunch.ps1')
    expect(options.detached).toBeUndefined()
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
