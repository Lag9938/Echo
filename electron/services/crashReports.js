import fs from 'node:fs'
import os from 'node:os'

// Quedas de processo do Chromium (tela, placa de vídeo, rede, áudio…) para a telemetria.
//
// Por quê: pessoas relataram "erro de memória" e tela preta depois de muito tempo transmitindo, e o app não
// registrava nada quando um processo caía. Agora cada queda fica guardada num arquivo com o motivo que o
// Electron informa (ex.: "oom" = falta de memória), se havia transmissão e há quanto tempo, o modo de captura e
// a memória livre do computador. A tela lê e envia à análise de uso (PostHog) assim que pode: na hora, se quem
// caiu foi outro processo; na próxima abertura (ou recarga), se quem caiu foi a própria tela.
//
// Nada de conteúdo: só tipo do processo, motivo, código de saída e números.

const MAX_REPORTS = 20

/** Quedas que não são problema: o processo terminou normalmente */
const IGNORED_REASONS = new Set(['clean-exit'])

let streamingSince = null

/** Chamado quando a transmissão de tela começa (true) ou termina (false) */
export function setStreamingActive(active, now = Date.now()) {
  if (active) streamingSince = streamingSince ?? now
  else streamingSince = null
}

export function readCrashReports(file) {
  try {
    const list = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/**
 * Monta o registro de uma queda. `details` vem dos eventos do Electron (`render-process-gone` ou
 * `child-process-gone`). Devolve null para quedas que não interessam.
 */
export function buildCrashReport(processType, details, context) {
  const reason = details?.reason || 'unknown'
  if (IGNORED_REASONS.has(reason)) return null
  const { now = Date.now(), appStartedAt, version, captureMode, freeMemMb, totalMemMb } = context
  return {
    process: processType,
    reason,
    exitCode: typeof details?.exitCode === 'number' ? details.exitCode : null,
    // Utilitários dizem qual serviço era (ex.: "Audio Service", "Network Service")
    service: details?.serviceName || details?.name || null,
    version,
    captureMode,
    streaming: streamingSince !== null,
    streamingMinutes: streamingSince !== null ? Math.round((now - streamingSince) / 6000) / 10 : null,
    uptimeMinutes: appStartedAt ? Math.round((now - appStartedAt) / 6000) / 10 : null,
    freeMemMb,
    totalMemMb,
    at: new Date(now).toISOString()
  }
}

/** Guarda a queda (as mais antigas saem quando passa do limite). Falha de disco não derruba nada. */
export function appendCrashReport(file, report) {
  if (!report) return
  try {
    const list = readCrashReports(file)
    list.push(report)
    fs.writeFileSync(file, JSON.stringify(list.slice(-MAX_REPORTS)))
  } catch {
    // sem disco: a queda se perde, o app segue
  }
}

/** Entrega as quedas guardadas e apaga o arquivo (cada uma é enviada uma vez só) */
export function takeCrashReports(file) {
  const list = readCrashReports(file)
  try {
    fs.rmSync(file, { force: true })
  } catch {
    // se não apagar, pode ser reenviada; melhor que perder
  }
  return list
}

/**
 * Liga a observação das quedas. `getWindow` devolve a janela principal (para avisar a tela quando ela
 * continua viva e outro processo caiu).
 */
export function watchProcessCrashes({ app, file, getWindow, getCaptureMode, appStartedAt = Date.now() }) {
  const context = () => ({
    appStartedAt,
    version: app.getVersion(),
    captureMode: getCaptureMode(),
    freeMemMb: Math.round(os.freemem() / 1048576),
    totalMemMb: Math.round(os.totalmem() / 1048576)
  })
  const record = (processType, details) => {
    const report = buildCrashReport(processType, details, context())
    if (!report) return
    appendCrashReport(file, report)
    console.warn('[Echo] Processo caiu:', report)
    // A tela continua viva (caiu outro processo): ela já pode enviar
    const win = getWindow()
    if (processType !== 'renderer' && win && !win.isDestroyed()) win.webContents.send('crash-reports-available')
  }
  app.on('child-process-gone', (_event, details) => record(details?.type || 'unknown', details))
  app.on('render-process-gone', (_event, _webContents, details) => record('renderer', details))
}
