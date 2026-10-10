// Teste de fumaça do Echo EMPACOTADO: abre o app de verdade e confere que a tela carregou.
// É a última etapa antes de publicar uma versão (.github/workflows/build-and-sign.yml): se falhar, nada é publicado.
//
//   node scripts/smoke-test.mjs --app "dist-desktop/win-unpacked/Echo.exe"
//       abre o app já empacotado (seguro em qualquer máquina: usa uma pasta de dados temporária)
//   node scripts/smoke-test.mjs --installer "dist-desktop/Echo Setup 1.2.3.exe"
//       INSTALA em silêncio e abre o app instalado. Só roda no servidor de build (CI=true): numa máquina de
//       uso, instalar trocaria o Echo que já está lá.
//
// O app entende a variável ECHO_SMOKE_TEST (electron/services/smokeTest.js): abre, confere a própria tela,
// grava o resultado num arquivo e fecha com código 0 (abriu bem) ou 1.
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const expectedVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version

function fail(message) {
  console.error(`\n✖ TESTE DE FUMAÇA FALHOU: ${message}`)
  process.exit(1)
}

function argument(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1]
}

/** Abre o executável em modo de teste e devolve o que ele relatou */
export function runApp(exePath, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    const resultFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'echo-smoke-')), 'result.json')
    const startedAt = Date.now()
    const child = spawn(exePath, [], { env: { ...process.env, ECHO_SMOKE_TEST: resultFile }, stdio: 'ignore' })
    let settled = false
    const done = (outcome) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      let report = null
      try { report = JSON.parse(fs.readFileSync(resultFile, 'utf8')) } catch { /* o app não chegou a gravar */ }
      resolve({ ...outcome, report, elapsedMs: Date.now() - startedAt })
    }
    const timer = setTimeout(() => {
      try { child.kill() } catch { /* já saiu */ }
      // O próprio app desiste e relata em 45–60 s. Passar disso sem resposta é o processo principal nem ter
      // chegado a rodar — o caso típico é biblioteca faltando dentro do pacote.
      done({ exitCode: null, problem: `o app não respondeu em ${Math.round(timeoutMs / 1000)} s: o processo principal não chegou a rodar (biblioteca faltando no pacote?)` })
    }, timeoutMs)
    child.on('error', (error) => done({ exitCode: null, problem: `não foi possível abrir o app: ${error.message}` }))
    child.on('exit', (code) => done({ exitCode: code, problem: null }))
  })
}

/** Decide se o resultado aprova a versão; devolve o motivo quando reprova */
export function verdict(outcome, version) {
  if (outcome.problem) return outcome.problem
  if (!outcome.report) return `o app fechou (código ${outcome.exitCode}) sem gravar o resultado: não chegou a abrir a janela`
  if (!outcome.report.ok) return outcome.report.reason || 'o app relatou falha sem dizer o motivo'
  if (outcome.exitCode !== 0) return `o app relatou sucesso mas saiu com código ${outcome.exitCode}`
  if (outcome.report.version !== version) return `versão errada dentro do pacote: ${outcome.report.version} (esperada ${version})`
  return null
}

function installSilently(installerPath) {
  if (process.env.CI !== 'true') fail('--installer só roda no servidor de build (CI=true). Nesta máquina, use --app.')
  const target = path.join(os.tmpdir(), `EchoSmoke${Date.now()}`)
  console.log(`Instalando em silêncio em ${target} ...`)
  // /S = sem janelas; /D= tem de ser o último argumento e não aceita aspas
  const result = spawnSync(installerPath, ['/S', `/D=${target}`], { stdio: 'inherit', windowsVerbatimArguments: true, timeout: 300000 })
  if (result.error) fail(`o instalador não rodou: ${result.error.message}`)
  if (result.status !== 0) fail(`o instalador saiu com código ${result.status}`)
  const exe = path.join(target, 'Echo.exe')
  // O instalador devolve o controle um pouco antes de terminar de gravar tudo
  for (let attempt = 0; attempt < 60 && !fs.existsSync(exe); attempt++) spawnSync(process.execPath, ['-e', 'setTimeout(() => {}, 1000)'])
  if (!fs.existsSync(exe)) fail(`o instalador terminou mas ${exe} não existe`)
  return exe
}

/** O instalador dentro da pasta de saída do electron-builder ("Echo Setup 1.2.3.exe") */
export function findInstaller(directory, version, list = fs.readdirSync) {
  const wanted = `Echo Setup ${version}.exe`
  const names = list(directory)
  if (names.includes(wanted)) return path.join(directory, wanted)
  throw new Error(`"${wanted}" não está em ${directory} (há: ${names.filter((name) => name.endsWith('.exe')).join(', ') || 'nenhum .exe'})`)
}

async function main() {
  const installerDirectory = argument('--installer-from')
  let installer = argument('--installer')
  if (installerDirectory) {
    try { installer = findInstaller(path.resolve(installerDirectory), expectedVersion) } catch (error) { fail(error.message) }
  }
  const app = argument('--app')
  if (!installer && !app) fail('informe --app <Echo.exe>, --installer <instalador.exe> ou --installer-from <pasta>')
  const source = path.resolve(installer || app)
  if (!fs.existsSync(source)) fail(`arquivo não encontrado: ${source}`)

  const exe = installer ? installSilently(source) : source
  console.log(`Abrindo ${exe} (versão esperada ${expectedVersion}) ...`)
  const outcome = await runApp(exe)
  const problem = verdict(outcome, expectedVersion)
  if (outcome.report) {
    const { probe, mainErrors = [], consoleErrors = [] } = outcome.report
    console.log(`Tela: ${JSON.stringify(probe)}`)
    if (mainErrors.length) console.log(`Erros no processo principal:\n  ${mainErrors.join('\n  ')}`)
    if (consoleErrors.length) console.log(`Erros no console da tela (não reprovam sozinhos):\n  ${consoleErrors.join('\n  ')}`)
  }
  if (problem) fail(problem)
  console.log(`\n✔ O Echo ${outcome.report.version} abriu e carregou a tela em ${Math.round(outcome.elapsedMs / 100) / 10} s.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
