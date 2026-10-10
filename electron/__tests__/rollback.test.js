import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import {
  MAX_FAILED_STARTS, blockVersion, buildRollbackScript, compareVersions, decideStartup, isVersionBlocked,
  keepInstallerCopy, markHealthy, readJson, readStartupFiles, recordPendingUpdate, releaseInstallerUrl,
  saveStartupState, startRollback, storedInstallerPath, takeRollbackNotice
} from '../services/rollback.js'
import { buildWatchdogSpawn } from '../services/updateRelaunch.js'

vi.mock('electron', () => ({ app: { isPackaged: true, getPath: () => os.tmpdir(), getVersion: () => '0.0.0', exit: vi.fn() } }))
const { guardedStart } = await import('../startupGuard.js')

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'echo-rollback-'))
const record = { fromVersion: '1.0.0', toVersion: '1.1.0', installerPath: null, downloadUrl: releaseInstallerUrl('1.0.0') }

describe('versões', () => {
  it('compara por número, não por texto', () => {
    expect(compareVersions('0.53.10', '0.53.9')).toBe(1)
    expect(compareVersions('0.53.5', '0.54.0')).toBe(-1)
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
  })

  it('o endereço do instalador de uma versão é o da release', () => {
    expect(releaseInstallerUrl('0.53.5')).toBe('https://github.com/Lag9938/Echo/releases/download/v0.53.5/Echo-Setup-0.53.5.exe')
  })
})

describe('versão antiga: preparar a volta quando a nova termina de baixar', () => {
  it('anota de qual versão para qual; sem cópia local, fica o endereço para baixar', () => {
    const dir = tmp()
    const saved = recordPendingUpdate(dir, { fromVersion: '1.0.0', toVersion: '1.1.0' })
    expect(saved).toMatchObject({ fromVersion: '1.0.0', toVersion: '1.1.0', installerPath: null, downloadUrl: releaseInstallerUrl('1.0.0') })
    expect(readStartupFiles(dir).record).toMatchObject({ fromVersion: '1.0.0', toVersion: '1.1.0' })
  })

  it('com a cópia do instalador da versão atual guardada, aponta para ela', () => {
    const dir = tmp()
    fs.mkdirSync(path.dirname(storedInstallerPath(dir, '1.0.0')), { recursive: true })
    fs.writeFileSync(storedInstallerPath(dir, '1.0.0'), 'instalador')
    expect(recordPendingUpdate(dir, { fromVersion: '1.0.0', toVersion: '1.1.0' }).installerPath).toBe(storedInstallerPath(dir, '1.0.0'))
  })

  it('volta manual para uma versão mais velha não prepara nada (não há o que desfazer)', () => {
    const dir = tmp()
    expect(recordPendingUpdate(dir, { fromVersion: '1.1.0', toVersion: '1.0.0' })).toBeNull()
    expect(recordPendingUpdate(dir, { fromVersion: '1.1.0', toVersion: '1.1.0' })).toBeNull()
    expect(readStartupFiles(dir).record).toBeNull()
  })

  it('guarda a cópia do instalador que chegou e descarta as de versões que não importam mais', async () => {
    const dir = tmp()
    const downloaded = path.join(dir, 'baixado.exe'); fs.writeFileSync(downloaded, 'novo')
    fs.mkdirSync(path.join(dir, 'rollback'), { recursive: true })
    fs.writeFileSync(storedInstallerPath(dir, '0.9.0'), 'velho demais')
    fs.writeFileSync(storedInstallerPath(dir, '1.0.0'), 'atual')
    const kept = await keepInstallerCopy(dir, { version: '1.1.0', downloadedFile: downloaded, currentVersion: '1.0.0' })
    expect(fs.readFileSync(kept, 'utf8')).toBe('novo')
    expect(fs.readdirSync(path.join(dir, 'rollback')).sort()).toEqual(['Echo-Setup-1.0.0.exe', 'Echo-Setup-1.1.0.exe'])
  })
})

describe('versão nova: decidir ao iniciar', () => {
  it('sem atualização registrada, ou com registro de outra versão, é uma abertura normal', () => {
    expect(decideStartup({ appVersion: '1.1.0', record: null, state: null }).action).toBe('normal')
    expect(decideStartup({ appVersion: '1.2.0', record, state: null }).action).toBe('normal')
  })

  it('logo depois de atualizar, cada abertura conta como falha até a tela carregar', () => {
    const first = decideStartup({ appVersion: '1.1.0', record, state: null })
    expect(first).toMatchObject({ action: 'watch', state: { version: '1.1.0', failedStarts: 1, healthy: false } })
    const second = decideStartup({ appVersion: '1.1.0', record, state: first.state })
    expect(second.state.failedStarts).toBe(2)
  })

  it(`desfaz na abertura seguinte a ${MAX_FAILED_STARTS} que não carregaram a tela, não antes`, () => {
    let state = null
    for (let i = 1; i <= MAX_FAILED_STARTS; i++) {
      const decision = decideStartup({ appVersion: '1.1.0', record, state })
      expect(decision.action).toBe('watch')
      state = decision.state
    }
    expect(decideStartup({ appVersion: '1.1.0', record, state }).action).toBe('rollback')
  })

  it('versão aprovada (a tela carregou) nunca mais é desfeita', () => {
    const state = { version: '1.1.0', failedStarts: 0, healthy: true }
    expect(decideStartup({ appVersion: '1.1.0', record, state }).action).toBe('normal')
    expect(decideStartup({ appVersion: '1.1.0', record, state, importFailed: true }).action).toBe('normal')
  })

  it('código principal que nem carrega desfaz na hora, sem esperar outras aberturas', () => {
    expect(decideStartup({ appVersion: '1.1.0', record, state: null, importFailed: true }).action).toBe('rollback')
  })

  it('contagem de uma versão anterior não vale para a nova', () => {
    const old = { version: '1.0.5', failedStarts: 9, healthy: false }
    expect(decideStartup({ appVersion: '1.1.0', record, state: old })).toMatchObject({ action: 'watch', state: { failedStarts: 1 } })
  })

  it('a tela carregou: zera a conta e aprova a versão', () => {
    const dir = tmp()
    recordPendingUpdate(dir, { fromVersion: '1.0.0', toVersion: '1.1.0' })
    saveStartupState(dir, { version: '1.1.0', failedStarts: 2, healthy: false })
    expect(markHealthy(dir, '1.1.0')).toBe(true)
    expect(readStartupFiles(dir).state).toMatchObject({ version: '1.1.0', failedStarts: 0, healthy: true })
    // Abertura normal (sem atualização pendente) não grava nada
    expect(markHealthy(tmp(), '1.1.0')).toBe(false)
  })
})

describe('guarda de inicialização', () => {
  function setup({ withRecord = true, state = null } = {}) {
    const dir = tmp()
    if (withRecord) recordPendingUpdate(dir, { fromVersion: '1.0.0', toVersion: '1.1.0' })
    if (state) saveStartupState(dir, state)
    const exit = vi.fn()
    const rollback = vi.fn(() => true)
    const delays = []
    const schedule = (fn, ms) => { delays.push(ms); fn() }
    const options = { isPackaged: true, smoke: false, dir, appVersion: '1.1.0', exePath: 'C:\\Echo\\Echo.exe', exit, rollback, schedule }
    return { dir, exit, rollback, options, delays }
  }

  it('abertura normal: carrega o app e não mexe em nada', async () => {
    const t = setup({ withRecord: false })
    const loadMain = vi.fn(async () => {})
    expect(await guardedStart(loadMain, t.options)).toBe(true)
    expect(loadMain).toHaveBeenCalledTimes(1)
    expect(t.rollback).not.toHaveBeenCalled()
    expect(readStartupFiles(t.dir).state).toBeNull()
  })

  it('primeira abertura depois de atualizar: conta a tentativa e carrega o app', async () => {
    const t = setup()
    expect(await guardedStart(async () => {}, t.options)).toBe(true)
    expect(readStartupFiles(t.dir).state).toMatchObject({ version: '1.1.0', failedStarts: 1, healthy: false })
    expect(t.rollback).not.toHaveBeenCalled()
  })

  it('o código principal não carrega: desfaz na hora e encerra, sem deixar o app pendurado', async () => {
    const t = setup()
    const result = await guardedStart(async () => { throw new Error("Cannot find package 'electron-updater'") }, t.options)
    expect(result).toBe(false)
    expect(t.rollback).toHaveBeenCalledTimes(1)
    expect(t.rollback.mock.calls[0][0]).toMatchObject({ dir: t.dir, exePath: 'C:\\Echo\\Echo.exe', record: { fromVersion: '1.0.0', toVersion: '1.1.0' } })
    expect(t.exit).toHaveBeenCalledWith(0)
    // Bug real (visto no ensaio com o app empacotado): encerrando no mesmo instante, o script de volta era
    // gravado mas nunca rodava. O app espera um pouco antes de sair.
    expect(t.delays).toEqual([2000])
    expect(fs.readFileSync(path.join(t.dir, 'update.log'), 'utf8')).toContain("Cannot find package 'electron-updater'")
  })

  it('várias aberturas sem a tela carregar: desfaz ANTES de carregar o app de novo', async () => {
    const t = setup({ state: { version: '1.1.0', failedStarts: MAX_FAILED_STARTS, healthy: false } })
    const loadMain = vi.fn(async () => {})
    expect(await guardedStart(loadMain, t.options)).toBe(false)
    expect(loadMain).not.toHaveBeenCalled()
    expect(t.rollback).toHaveBeenCalledTimes(1)
    expect(t.exit).toHaveBeenCalledWith(0)
  })

  it('sem como voltar (abertura normal), um erro ao carregar continua aparecendo como erro', async () => {
    const t = setup({ withRecord: false })
    await expect(guardedStart(async () => { throw new Error('quebrou') }, t.options)).rejects.toThrow('quebrou')
    expect(t.rollback).not.toHaveBeenCalled()
  })

  it('em desenvolvimento e no teste de fumaça o guarda não interfere', async () => {
    const loadMain = vi.fn(async () => {})
    expect(await guardedStart(loadMain, { isPackaged: false, smoke: false, appVersion: '1.1.0' })).toBe(true)
    expect(await guardedStart(loadMain, { isPackaged: true, smoke: true, appVersion: '1.1.0' })).toBe(true)
    expect(loadMain).toHaveBeenCalledTimes(2)
  })
})

describe('versão desfeita fica bloqueada e o usuário é avisado uma vez', () => {
  it('a versão ruim não é instalada de novo; outras versões passam', () => {
    const dir = tmp()
    blockVersion(dir, { version: '1.1.0', rolledBackTo: '1.0.0', reason: 'teste' })
    expect(isVersionBlocked(dir, '1.1.0')).toBe(true)
    expect(isVersionBlocked(dir, '1.1.1')).toBe(false)
    expect(isVersionBlocked(tmp(), '1.1.0')).toBe(false)
  })

  it('o aviso sai uma única vez, e só na versão para a qual o app voltou', () => {
    const dir = tmp()
    blockVersion(dir, { version: '1.1.0', rolledBackTo: '1.0.0', reason: 'o código principal não carregou' })
    expect(takeRollbackNotice(dir, '1.1.0')).toBeNull()
    expect(takeRollbackNotice(dir, '1.0.0')).toEqual({ badVersion: '1.1.0', currentVersion: '1.0.0', reason: 'o código principal não carregou' })
    expect(takeRollbackNotice(dir, '1.0.0')).toBeNull()
    expect(isVersionBlocked(dir, '1.1.0')).toBe(true)
  })
})

describe('script que desfaz a atualização', () => {
  it('bloqueia a versão ruim ANTES de iniciar a reinstalação e inicia o script solto do app', () => {
    const dir = tmp()
    const child = { on: vi.fn(), unref: vi.fn() }
    const spawnProcess = vi.fn(() => child)
    const started = startRollback({ dir, exePath: 'C:\\Echo\\Echo.exe', record, logFile: path.join(dir, 'update.log'), reason: 'teste', spawnProcess, platform: 'win32' })
    expect(started).toBe(true)
    expect(isVersionBlocked(dir, '1.1.0')).toBe(true)
    const script = fs.readFileSync(path.join(dir, 'update-rollback.ps1'), 'utf8')
    expect(script).toContain(releaseInstallerUrl('1.0.0'))
    expect(script).toContain("'--updated', '/S', '--force-run'")
    const expected = buildWatchdogSpawn(path.join(dir, 'update-rollback.ps1'))
    expect(spawnProcess).toHaveBeenCalledWith(expected.command, expected.args, expected.options)
    expect(child.unref).toHaveBeenCalled()
  })

  it('caminhos com aspas simples não quebram o script', () => {
    const script = buildRollbackScript({ exePath: "C:\\Users\\O'Neil\\Echo.exe", installerPath: "C:\\Users\\O'Neil\\i.exe", downloadUrl: 'https://x/y.exe', logFile: '', badVersion: '1.1.0', goodVersion: '1.0.0' })
    expect(script).toContain("$exe = 'C:\\Users\\O''Neil\\Echo.exe'")
    expect(script).toContain("$installer = 'C:\\Users\\O''Neil\\i.exe'")
  })

  it('fora do Windows não faz nada', () => {
    expect(startRollback({ dir: tmp(), exePath: '/x', record, logFile: '', reason: '', platform: 'linux' })).toBe(false)
  })
})

// Execução de verdade no Windows, com um "instalador" de mentira que só registra como foi chamado: prova que
// o script roda, usa a cópia local, chama o instalador em silêncio pedindo para reabrir e tenta abrir o app.
describe.runIf(process.platform === 'win32')('script de volta (execução real no Windows)', () => {
  it('usa a cópia local do instalador, instala em silêncio e registra cada passo', async () => {
    // Espaço e acento no caminho, como numa pasta de usuário de verdade. (Sem "&": o instalador de mentira é
    // um .cmd, e o cmd.exe não aceita esse caractere no próprio caminho; o instalador real é um .exe.)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'echo volta é cia '))
    const calledWith = path.join(dir, 'instalador-chamado.txt')
    const fakeInstaller = path.join(dir, 'instalador de mentira.cmd')
    // %~dp0 = a pasta do próprio .cmd (escrever o caminho com acento dentro do arquivo o cmd.exe lê errado)
    fs.writeFileSync(fakeInstaller, '@echo off\r\necho %* > "%~dp0instalador-chamado.txt"\r\nexit /b 0\r\n')
    const logFile = path.join(dir, 'update.log')
    const scriptFile = path.join(dir, 'update-rollback.ps1')
    fs.writeFileSync(scriptFile, '\ufeff' + buildRollbackScript({
      exePath: path.join(dir, 'EchoQueNaoExiste.exe'), installerPath: fakeInstaller, downloadUrl: 'https://invalido.exemplo/x.exe',
      logFile, badVersion: '1.1.0', goodVersion: '1.0.0'
    }), 'utf8')

    const { command, args, options } = buildWatchdogSpawn(scriptFile)
    spawn(command, args, options).unref()

    const read = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '')
    await vi.waitFor(() => expect(read()).toContain('volta: concluída'), { timeout: 50000, interval: 500 })
    expect(read()).toContain('volta: iniciada: desfazendo a 1.1.0 e voltando para a 1.0.0')
    expect(read()).toContain('usando a cópia local do instalador')
    expect(read()).toContain('instalador terminou com código 0')
    expect(read()).not.toContain('FALHOU')
    expect(fs.readFileSync(calledWith, 'utf8')).toContain('--updated /S --force-run')
  }, 60000)

  it('instalador que falha: registra a falha e NÃO finge que voltou', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'echo volta falha '))
    const fakeInstaller = path.join(dir, 'instalador.cmd')
    fs.writeFileSync(fakeInstaller, '@echo off\r\nexit /b 3\r\n')
    const logFile = path.join(dir, 'update.log')
    const scriptFile = path.join(dir, 'update-rollback.ps1')
    fs.writeFileSync(scriptFile, '﻿' + buildRollbackScript({
      exePath: path.join(dir, 'EchoQueNaoExiste.exe'), installerPath: fakeInstaller, downloadUrl: 'https://invalido.exemplo/x.exe',
      logFile, badVersion: '1.1.0', goodVersion: '1.0.0'
    }), 'utf8')
    const { command, args, options } = buildWatchdogSpawn(scriptFile)
    spawn(command, args, options).unref()

    const read = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '')
    await vi.waitFor(() => expect(read()).toContain('volta: FALHOU'), { timeout: 30000, interval: 500 })
    expect(read()).toContain('o instalador saiu com código 3')
    expect(read()).not.toContain('volta: concluída')
  }, 40000)
})

describe('o atualizador respeita a versão bloqueada', () => {
  const updates = fs.readFileSync(path.resolve(__dirname, '../ipc/updates.js'), 'utf8')

  it('o download não é automático: passa pela checagem de versão desfeita', () => {
    expect(updates).toContain('autoUpdater.autoDownload = false')
    const available = updates.slice(updates.indexOf("autoUpdater.on('update-available'"))
    expect(available.indexOf('isVersionBlocked(dataDir, info.version)')).toBeGreaterThan(-1)
    expect(available.indexOf('isVersionBlocked(dataDir, info.version)')).toBeLessThan(available.indexOf('autoUpdater.downloadUpdate()'))
  })

  it('ao terminar de baixar, a volta fica preparada', () => {
    const downloaded = updates.slice(updates.indexOf("autoUpdater.on('update-downloaded'"))
    expect(downloaded).toContain('recordPendingUpdate(dataDir, { fromVersion: current, toVersion: info.version })')
    expect(downloaded).toContain('keepInstallerCopy(dataDir')
  })

  it('o app é carregado pelo guarda de inicialização', () => {
    const entry = fs.readFileSync(path.resolve(__dirname, '../../electron-main.js'), 'utf8')
    expect(entry).toContain("await guardedStart(() => import('./electron/main.js'))")
    expect(readJson(path.resolve(__dirname, '../../package.json')).main).toBe('electron-main.js')
  })
})
