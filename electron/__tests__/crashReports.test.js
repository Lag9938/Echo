import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { appendCrashReport, buildCrashReport, readCrashReports, setStreamingActive, takeCrashReports, watchProcessCrashes } from '../services/crashReports.js'

const context = { now: Date.parse('2026-10-19T20:00:00Z'), appStartedAt: Date.parse('2026-10-19T18:00:00Z'), version: '0.62.0', captureMode: 'fast', freeMemMb: 900, totalMemMb: 16000 }

describe('registro de quedas de processo', () => {
  let dir, file
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'echo-crash-'))
    file = path.join(dir, 'crash-reports.json')
    setStreamingActive(false)
  })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('registra motivo, tempo aberto e se havia transmissão (e há quanto tempo)', () => {
    setStreamingActive(true, Date.parse('2026-10-19T19:15:00Z'))
    const report = buildCrashReport('GPU', { reason: 'oom', exitCode: -536870904 }, context)
    expect(report).toMatchObject({ process: 'GPU', reason: 'oom', exitCode: -536870904, streaming: true, streamingMinutes: 45, uptimeMinutes: 120, captureMode: 'fast', freeMemMb: 900, version: '0.62.0' })
  })

  it('sem transmissão, o registro diz isso', () => {
    const report = buildCrashReport('renderer', { reason: 'crashed' }, context)
    expect(report.streaming).toBe(false)
    expect(report.streamingMinutes).toBeNull()
  })

  it('saída normal de um processo não é queda', () => {
    expect(buildCrashReport('Utility', { reason: 'clean-exit', exitCode: 0 }, context)).toBeNull()
  })

  it('guarda até 20 (as mais antigas saem) e entrega uma vez só', () => {
    for (let i = 0; i < 25; i++) appendCrashReport(file, { process: 'GPU', reason: `r${i}` })
    expect(readCrashReports(file)).toHaveLength(20)
    expect(readCrashReports(file)[0].reason).toBe('r5')
    expect(takeCrashReports(file)).toHaveLength(20)
    expect(takeCrashReports(file)).toEqual([])
  })

  it('arquivo estragado não derruba: começa de novo', () => {
    fs.writeFileSync(file, '{ quebrado')
    expect(readCrashReports(file)).toEqual([])
    appendCrashReport(file, { process: 'GPU', reason: 'oom' })
    expect(readCrashReports(file)).toHaveLength(1)
  })

  it('ouve as quedas do Electron e avisa a tela quando ela continua viva', () => {
    const app = new EventEmitter()
    app.getVersion = () => '0.62.0'
    const sent = []
    const win = { isDestroyed: () => false, webContents: { send: (channel) => sent.push(channel) } }
    watchProcessCrashes({ app, file, getWindow: () => win, getCaptureMode: () => 'compat' })

    app.emit('child-process-gone', {}, { type: 'GPU', reason: 'oom', exitCode: 1 })
    expect(sent).toEqual(['crash-reports-available'])
    // A própria tela caiu: não adianta avisá-la, a queda vai na próxima abertura
    app.emit('render-process-gone', {}, {}, { reason: 'oom', exitCode: 2 })
    expect(sent).toHaveLength(1)
    app.emit('child-process-gone', {}, { type: 'Utility', reason: 'clean-exit', exitCode: 0 })

    const reports = takeCrashReports(file)
    expect(reports.map((r) => [r.process, r.reason, r.captureMode])).toEqual([['GPU', 'oom', 'compat'], ['renderer', 'oom', 'compat']])
  })
})
