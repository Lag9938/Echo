import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createUpdateState, planReadyFallback, runReadyFallback } from '../services/updateFallback.js'

describe('atualização pronta: quem cuida de instalar', () => {
  it('tela confirmou o aviso: o caminho normal está funcionando, nada a fazer', () => {
    expect(planReadyFallback({ rendererHealthy: true, acknowledged: true, prompted: false })).toBe('none')
  })

  it('tela nem carregou: instala sem perguntar (o app já não está funcionando)', () => {
    expect(planReadyFallback({ rendererHealthy: false, acknowledged: false, prompted: false })).toBe('install-now')
    // Uma confirmação antiga não vale se a tela caiu depois
    expect(planReadyFallback({ rendererHealthy: false, acknowledged: true, prompted: false })).toBe('install-now')
  })

  it('tela carregou mas não confirmou o aviso: pergunta por uma janela do sistema', () => {
    expect(planReadyFallback({ rendererHealthy: true, acknowledged: false, prompted: false })).toBe('ask')
  })

  it('só age uma vez por versão', () => {
    expect(planReadyFallback({ rendererHealthy: false, acknowledged: false, prompted: true })).toBe('none')
  })
})

describe('runReadyFallback', () => {
  function setup({ healthy, acknowledged = '', answer = { response: 0 }, dialogNeverAnswers = false } = {}) {
    const state = { ...createUpdateState(), status: 'ready', version: '2.0.0', acknowledged }
    const install = vi.fn()
    const logs = []
    const showDialog = vi.fn(() => (dialogNeverAnswers ? new Promise(() => {}) : Promise.resolve(answer)))
    const run = () => runReadyFallback({
      state, version: '2.0.0', isHealthy: () => healthy, showDialog, install,
      log: (m) => logs.push(m), wait: () => Promise.resolve()
    })
    return { state, install, logs, showDialog, run }
  }

  it('tela quebrada: avisa por uma janela do sistema e instala', async () => {
    const t = setup({ healthy: false })
    expect(await t.run()).toBe('installed')
    expect(t.install).toHaveBeenCalledWith('a tela não carregou')
    expect(t.showDialog.mock.calls[0][0].buttons).toEqual(['OK'])
    expect(t.logs[0]).toContain('instalando a 2.0.0 sem depender dela')
  })

  it('tela quebrada e ninguém responde ao aviso: instala mesmo assim', async () => {
    const t = setup({ healthy: false, dialogNeverAnswers: true })
    expect(await t.run()).toBe('installed')
    expect(t.install).toHaveBeenCalledTimes(1)
  })

  it('tela boa sem confirmação: pergunta, e instala só se a pessoa aceitar', async () => {
    const yes = setup({ healthy: true, answer: { response: 0 } })
    expect(await yes.run()).toBe('installed')
    expect(yes.install).toHaveBeenCalledWith('janela do sistema')
    expect(yes.showDialog.mock.calls[0][0].buttons).toEqual(['Reiniciar agora', 'Depois'])

    const later = setup({ healthy: true, answer: { response: 1 } })
    expect(await later.run()).toBe('declined')
    expect(later.install).not.toHaveBeenCalled()
  })

  it('tela boa que confirmou o aviso: não abre janela nenhuma', async () => {
    const t = setup({ healthy: true, acknowledged: '2.0.0' })
    expect(await t.run()).toBe('none')
    expect(t.showDialog).not.toHaveBeenCalled()
    expect(t.install).not.toHaveBeenCalled()
  })

  it('confirmação de OUTRA versão não conta', async () => {
    const t = setup({ healthy: true, acknowledged: '1.9.0', answer: { response: 1 } })
    expect(await t.run()).toBe('declined')
    expect(t.showDialog).toHaveBeenCalledTimes(1)
  })

  it('não repete: a segunda conferência da mesma versão não faz nada', async () => {
    const t = setup({ healthy: true, answer: { response: 1 } })
    await t.run()
    expect(await t.run()).toBe('none')
    expect(t.showDialog).toHaveBeenCalledTimes(1)
  })

  it('se a versão pronta mudou no meio do caminho, a conferência antiga é descartada', async () => {
    const t = setup({ healthy: false })
    t.state.version = '2.0.1'
    expect(await t.run()).toBe('none')
    expect(t.install).not.toHaveBeenCalled()
  })
})

describe('o atualizador não depende da janela', () => {
  const main = fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf8')
  const updates = fs.readFileSync(path.resolve(__dirname, '../ipc/updates.js'), 'utf8')
  const tray = fs.readFileSync(path.resolve(__dirname, '../services/tray.js'), 'utf8')

  it('é ligado antes de a janela ser criada, e uma falha na janela não o impede', () => {
    const ready = main.slice(main.indexOf('app.whenReady().then(() => {'))
    const setup = ready.indexOf('setupUpdatesIpc(safeHandle')
    const create = ready.indexOf('createWindow()')
    expect(setup).toBeGreaterThan(-1)
    expect(create).toBeGreaterThan(setup)
    // A criação da janela está protegida: se lançar erro, o app segue (com o atualizador já ligado)
    expect(ready.slice(setup, create + 200)).toMatch(/try \{\s*createWindow\(\)\s*\} catch/)
  })

  it('não é mais ligado dentro da criação da janela (que pode rodar de novo, ou falhar antes)', () => {
    const createWindow = main.slice(main.indexOf('export function createWindow()'), main.indexOf('function watchStartupHealth'))
    expect(createWindow).not.toContain('setupUpdatesIpc(')
    expect(updates).toContain('if (initialized) return')
  })

  it('a bandeja tem "Buscar atualizações", que roda sem a tela', () => {
    expect(tray).toContain("label: 'Buscar atualizações'")
    expect(main).toContain('checkForUpdatesFromTray()')
  })

  it('a conferência é agendada quando a atualização fica pronta', () => {
    const downloaded = updates.slice(updates.indexOf("autoUpdater.on('update-downloaded'"))
    expect(downloaded).toContain('runReadyFallback({')
    expect(downloaded).toContain('isHealthy: isRendererHealthy')
  })
})
