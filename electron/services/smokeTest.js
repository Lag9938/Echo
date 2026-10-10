import fs from 'node:fs'

// Teste de fumaça do app EMPACOTADO, usado antes de publicar uma versão (scripts/smoke-test.mjs).
//
// O servidor de build compilava e publicava direto: ninguém abria o app instalado antes de ele chegar aos
// usuários. Typecheck e testes rodam sobre o código, não sobre o que vai dentro do instalador, então um erro
// de empacotamento (arquivo faltando, preload quebrado, tela em branco) passava por tudo.
//
// Com a variável ECHO_SMOKE_TEST=<arquivo>, o app abre normalmente (numa pasta de dados temporária, sem
// buscar atualização nem se registrar para iniciar com o Windows), confere que a tela de verdade carregou,
// grava o resultado no arquivo e fecha: código 0 se abriu bem, 1 se não.

export function smokeTarget(env = process.env) {
  const file = env.ECHO_SMOKE_TEST
  return typeof file === 'string' && file.trim() ? file.trim() : null
}

// Roda dentro da página: o que existe na tela agora
export const SMOKE_PROBE = `(() => {
  const root = document.getElementById('root')
  return {
    rootChildren: root ? root.childElementCount : -1,
    textLength: (document.body && document.body.innerText ? document.body.innerText.trim().length : 0),
    hasBridge: typeof window.electronAPI === 'object' && window.electronAPI !== null && typeof window.electronAPI.getSources === 'function',
    interactive: document.querySelectorAll('button, input, a').length,
    stylesheets: document.styleSheets.length
  }
})()`

/** A tela carregou de verdade? Devolve o motivo quando não. */
export function judgeSmokeProbe(probe) {
  if (!probe || typeof probe !== 'object') return { ok: false, reason: 'a página não respondeu' }
  if (!(probe.rootChildren > 0)) return { ok: false, reason: 'tela em branco: o app não desenhou nada' }
  if (!probe.hasBridge) return { ok: false, reason: 'a ponte com o Electron (preload) não carregou' }
  if (!(probe.stylesheets > 0)) return { ok: false, reason: 'os estilos não carregaram' }
  if (!(probe.textLength >= 20) || !(probe.interactive >= 1)) return { ok: false, reason: 'a tela abriu vazia, sem texto ou sem controles' }
  return { ok: true, reason: '' }
}

const mainErrors = []
/** Erros não tratados do processo principal durante o teste (o app só os registra no log; aqui reprovam) */
export function noteSmokeMainError(error) {
  if (mainErrors.length < 10) mainErrors.push(String((error && error.stack) || error).slice(0, 600))
}

// O caso mais grave é o app nem chegar a criar a janela (erro na inicialização). Sem este prazo, armado logo
// que o processo começa, o teste ficaria esperando para sempre em vez de reprovar dizendo o motivo.
let disarmDeadline = () => {}
export function armSmokeDeadline({ file, version, exit, timeoutMs = 45000, write = (target, text) => fs.writeFileSync(target, text), setTimer = setTimeout, clearTimer = clearTimeout }) {
  const timer = setTimer(() => {
    const result = { ok: false, reason: `o app não abriu a janela em ${Math.round(timeoutMs / 1000)} s`, version, probe: null, mainErrors: [...mainErrors], consoleErrors: [] }
    try { write(file, JSON.stringify(result, null, 2)) } catch { /* sem arquivo, vale o código de saída */ }
    exit(1)
  }, timeoutMs)
  disarmDeadline = () => clearTimer(timer)
}

/**
 * Acompanha a janela até a tela ficar estável (3 leituras boas seguidas) ou algo falhar, grava o resultado
 * e encerra o app.
 */
export function startSmokeTest({
  win,
  file,
  version,
  exit,
  timeoutMs = 60000,
  pollMs = 500,
  write = (target, text) => fs.writeFileSync(target, text),
  now = () => Date.now(),
  setTimer = setTimeout,
  setRepeat = setInterval,
  clearRepeat = clearInterval
}) {
  disarmDeadline() // a janela existe: daqui em diante vale o prazo da tela
  const startedAt = now()
  const consoleErrors = []
  let finished = false
  let goodReads = 0
  let lastProbe = null
  let lastReason = 'a tela ainda não tinha carregado'
  let timer = null

  const finish = (ok, reason) => {
    if (finished) return
    finished = true
    if (timer) clearRepeat(timer)
    const result = { ok, reason, version, elapsedMs: now() - startedAt, probe: lastProbe, mainErrors: [...mainErrors], consoleErrors }
    try { write(file, JSON.stringify(result, null, 2)) } catch { /* sem arquivo, vale o código de saída */ }
    exit(ok ? 0 : 1)
  }

  const contents = win.webContents
  contents.on('render-process-gone', (_event, details) => finish(false, `o processo da tela caiu (${details && details.reason})`))
  contents.on('preload-error', (_event, preloadPath, error) => finish(false, `erro no preload: ${error && error.message}`))
  contents.on('did-fail-load', (_event, errorCode, errorDescription, _url, isMainFrame) => {
    if (isMainFrame === false || errorCode === -3) return
    finish(false, `a página não carregou (${errorCode} ${errorDescription})`)
  })
  contents.on('console-message', (event, level, message) => {
    // Electron novo entrega um objeto só; o antigo, argumentos soltos
    const entry = event && typeof event.message === 'string' ? event : { level, message }
    const isError = entry.level === 'error' || entry.level === 3
    if (isError && consoleErrors.length < 10) consoleErrors.push(String(entry.message).slice(0, 300))
  })
  win.on('unresponsive', () => finish(false, 'a janela parou de responder'))

  timer = setRepeat(() => {
    if (finished) return
    if (mainErrors.length > 0) { finish(false, 'erro não tratado no processo principal'); return }
    if (win.isDestroyed()) { finish(false, 'a janela foi fechada antes de carregar'); return }
    contents.executeJavaScript(SMOKE_PROBE, true).then((probe) => {
      if (finished) return
      lastProbe = probe
      const verdict = judgeSmokeProbe(probe)
      lastReason = verdict.reason
      goodReads = verdict.ok ? goodReads + 1 : 0
      if (goodReads >= 3) finish(true, '')
    }).catch(() => { goodReads = 0 })
  }, pollMs)

  setTimer(() => finish(false, `tempo esgotado (${Math.round(timeoutMs / 1000)} s): ${lastReason}`), timeoutMs)
}
