import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { decideStartup, readStartupFiles, saveStartupState, startRollback } from './services/rollback.js'

// Primeira coisa que roda no app instalado, antes de carregar o resto (electron-main.js).
// Depende só do Electron e do Node, de propósito: se a versão nova estiver quebrada a ponto de o código
// principal nem carregar, é aqui que isso é percebido e a versão anterior é reinstalada.

function log(dir, message) {
  try {
    fs.appendFileSync(path.join(dir, 'update.log'), `${new Date().toISOString()} guarda: ${message}\n`)
  } catch {
    // log é só diagnóstico
  }
}

/**
 * Carrega o app. Devolve false se a atualização foi desfeita (o app está encerrando).
 * `loadMain` importa o código principal; uma falha nele é tratada como "esta versão não funciona".
 */
export async function guardedStart(loadMain, {
  isPackaged = app.isPackaged,
  smoke = Boolean(process.env.ECHO_SMOKE_TEST),
  dir = isPackaged && !smoke ? app.getPath('userData') : null,
  appVersion = app.getVersion(),
  exePath = process.execPath,
  exit = (code) => app.exit(code),
  rollback = startRollback
} = {}) {
  // Em desenvolvimento e no teste de fumaça não há atualização a desfazer
  if (!dir) { await loadMain(); return true }

  const undo = (record, state, reason) => {
    saveStartupState(dir, state)
    log(dir, `versão ${appVersion} reprovada (${reason}); voltando para a ${record.fromVersion}`)
    const started = rollback({ dir, exePath, record, logFile: path.join(dir, 'update.log'), reason })
    if (!started) { log(dir, 'não foi possível iniciar a volta automática'); return false }
    exit(0)
    return true
  }

  let files = { record: null, state: null }
  try { files = readStartupFiles(dir) } catch { /* sem arquivos: abertura normal */ }
  const decision = decideStartup({ appVersion, record: files.record, state: files.state })
  if (decision.action === 'rollback' && undo(files.record, decision.state, decision.reason)) return false
  if (decision.action === 'watch') {
    saveStartupState(dir, decision.state)
    log(dir, `primeira(s) abertura(s) da ${appVersion} depois de atualizar: tentativa ${decision.state.failedStarts}`)
  }

  try {
    await loadMain()
    return true
  } catch (error) {
    log(dir, `o código principal não carregou: ${String((error && error.stack) || error).slice(0, 500)}`)
    const failed = decideStartup({ appVersion, record: files.record, state: files.state, importFailed: true })
    if (failed.action === 'rollback' && undo(files.record, failed.state, failed.reason)) return false
    throw error
  }
}
