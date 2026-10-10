import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { judgeSmokeProbe, smokeTarget, startSmokeTest } from '../services/smokeTest.js'
import { verdict } from '../../scripts/smoke-test.mjs'

const goodProbe = { rootChildren: 1, textLength: 240, hasBridge: true, interactive: 6, stylesheets: 3 }

describe('teste de fumaça: a tela carregou de verdade?', () => {
  it('tela normal passa', () => {
    expect(judgeSmokeProbe(goodProbe)).toEqual({ ok: true, reason: '' })
  })

  it('cada jeito de o app abrir quebrado é reprovado, com o motivo', () => {
    expect(judgeSmokeProbe(null).ok).toBe(false)
    expect(judgeSmokeProbe({ ...goodProbe, rootChildren: 0 }).reason).toContain('tela em branco')
    expect(judgeSmokeProbe({ ...goodProbe, hasBridge: false }).reason).toContain('preload')
    expect(judgeSmokeProbe({ ...goodProbe, stylesheets: 0 }).reason).toContain('estilos')
    expect(judgeSmokeProbe({ ...goodProbe, textLength: 0 }).reason).toContain('vazia')
    expect(judgeSmokeProbe({ ...goodProbe, interactive: 0 }).reason).toContain('vazia')
  })

  it('só entra em modo de teste com a variável preenchida', () => {
    expect(smokeTarget({})).toBeNull()
    expect(smokeTarget({ ECHO_SMOKE_TEST: '  ' })).toBeNull()
    expect(smokeTarget({ ECHO_SMOKE_TEST: 'C:\\tmp\\r.json' })).toBe('C:\\tmp\\r.json')
  })
})

describe('startSmokeTest', () => {
  function setup(probes) {
    const win = new EventEmitter()
    win.isDestroyed = () => false
    win.webContents = new EventEmitter()
    const queue = [...probes]
    win.webContents.executeJavaScript = vi.fn(() => {
      const next = queue.length > 1 ? queue.shift() : queue[0]
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
    })
    const written = []
    const exit = vi.fn()
    let tick = null
    let timeout = null
    startSmokeTest({
      win, file: 'r.json', version: '9.9.9', exit,
      write: (_file, text) => written.push(JSON.parse(text)),
      setRepeat: (fn) => { tick = fn; return 1 }, clearRepeat: () => { tick = null },
      setTimer: (fn) => { timeout = fn }
    })
    const poll = async () => { if (tick) tick(); await Promise.resolve(); await Promise.resolve() }
    return { win, written, exit, poll, expire: () => timeout() }
  }

  it('aprova depois de três leituras boas seguidas (a tela está estável, não só piscou)', async () => {
    const t = setup([goodProbe])
    await t.poll(); await t.poll()
    expect(t.exit).not.toHaveBeenCalled()
    await t.poll()
    expect(t.exit).toHaveBeenCalledWith(0)
    expect(t.written[0]).toMatchObject({ ok: true, version: '9.9.9', probe: goodProbe })
  })

  it('uma leitura ruim no meio zera a contagem', async () => {
    const t = setup([goodProbe, goodProbe, { ...goodProbe, rootChildren: 0 }, goodProbe])
    await t.poll(); await t.poll(); await t.poll(); await t.poll(); await t.poll()
    expect(t.exit).not.toHaveBeenCalled()
    await t.poll()
    expect(t.exit).toHaveBeenCalledWith(0)
  })

  it('tela que nunca carrega reprova por tempo, dizendo o que faltava', async () => {
    const t = setup([{ ...goodProbe, rootChildren: 0 }])
    await t.poll(); await t.poll()
    t.expire()
    expect(t.exit).toHaveBeenCalledWith(1)
    expect(t.written[0].ok).toBe(false)
    expect(t.written[0].reason).toContain('tela em branco')
  })

  it('processo da tela caindo, página que não carrega e janela travada reprovam na hora', () => {
    const crash = setup([goodProbe]); crash.win.webContents.emit('render-process-gone', {}, { reason: 'crashed' })
    expect(crash.exit).toHaveBeenCalledWith(1); expect(crash.written[0].reason).toContain('crashed')

    const load = setup([goodProbe]); load.win.webContents.emit('did-fail-load', {}, -6, 'ERR_FILE_NOT_FOUND', 'file:///x', true)
    expect(load.exit).toHaveBeenCalledWith(1); expect(load.written[0].reason).toContain('ERR_FILE_NOT_FOUND')

    const hang = setup([goodProbe]); hang.win.emit('unresponsive')
    expect(hang.exit).toHaveBeenCalledWith(1)
  })

  it('recarregar (ERR_ABORTED) e falha de um quadro interno não reprovam', async () => {
    const t = setup([goodProbe])
    t.win.webContents.emit('did-fail-load', {}, -3, 'ERR_ABORTED', 'file:///x', true)
    t.win.webContents.emit('did-fail-load', {}, -6, 'ERR_FILE_NOT_FOUND', 'file:///x', false)
    expect(t.exit).not.toHaveBeenCalled()
    await t.poll(); await t.poll(); await t.poll()
    expect(t.exit).toHaveBeenCalledWith(0)
  })

  it('só decide uma vez', async () => {
    const t = setup([goodProbe])
    await t.poll(); await t.poll(); await t.poll()
    t.win.webContents.emit('render-process-gone', {}, { reason: 'crashed' })
    t.expire()
    expect(t.exit).toHaveBeenCalledTimes(1)
    expect(t.written).toHaveLength(1)
  })
})

describe('veredito do script que roda antes de publicar', () => {
  const ok = { exitCode: 0, problem: null, report: { ok: true, version: '1.2.3', reason: '' } }

  it('aprova só quando o app abriu, saiu com 0 e é a versão certa', () => {
    expect(verdict(ok, '1.2.3')).toBeNull()
  })

  it('reprova app que não abriu, que fechou sem relatar, que relatou falha ou que tem a versão errada', () => {
    expect(verdict({ exitCode: null, problem: 'o app não respondeu em 120 s', report: null }, '1.2.3')).toContain('não respondeu')
    expect(verdict({ exitCode: 1, problem: null, report: null }, '1.2.3')).toContain('sem gravar o resultado')
    expect(verdict({ exitCode: 1, problem: null, report: { ok: false, reason: 'tela em branco: o app não desenhou nada' } }, '1.2.3')).toContain('tela em branco')
    expect(verdict({ ...ok, exitCode: 3 }, '1.2.3')).toContain('código 3')
    expect(verdict(ok, '1.2.4')).toContain('versão errada')
  })
})
