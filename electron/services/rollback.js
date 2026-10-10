import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { buildWatchdogSpawn } from './updateRelaunch.js'

// Volta automática para a versão anterior quando uma atualização não abre.
//
// Sem isto, uma versão que fechasse logo ao iniciar deixava o usuário sem o app: ela não chegava a buscar a
// correção, e a única saída era baixar um instalador à mão.
//
// Como funciona (todos os arquivos ficam na pasta de dados do app):
//   rollback.json        gravado pela versão ANTIGA quando a nova termina de baixar: de qual versão para qual,
//                        e onde está o instalador da antiga (cópia local, ou o endereço para baixar).
//   startup-state.json   quantas vezes seguidas a versão nova abriu sem chegar a carregar a tela.
//   blocked-version.json a versão que foi desfeita: o atualizador não a instala de novo.
// A decisão (startupGuard.js) roda antes de todo o resto do app e só depende do Node, para valer mesmo
// quando o restante está quebrado.

/** Aberturas seguidas sem a tela carregar antes de desfazer a atualização */
export const MAX_FAILED_STARTS = 3

const RELEASES = 'https://github.com/Lag9938/Echo/releases/download'

export function releaseInstallerUrl(version) {
  return `${RELEASES}/v${version}/Echo-Setup-${version}.exe`
}

/** 1 se a > b, -1 se a < b, 0 se iguais ("0.53.10" > "0.53.9") */
export function compareVersions(a, b) {
  const parse = (v) => String(v || '').split('-')[0].split('.').map((n) => Number.parseInt(n, 10) || 0)
  const x = parse(a), y = parse(b)
  for (let i = 0; i < 3; i++) {
    if ((x[i] || 0) > (y[i] || 0)) return 1
    if ((x[i] || 0) < (y[i] || 0)) return -1
  }
  return 0
}

export function readJson(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'))
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

export function writeJson(file, value) {
  try {
    fs.writeFileSync(file, JSON.stringify(value, null, 2))
    return true
  } catch {
    return false
  }
}

const files = (dir) => ({
  record: path.join(dir, 'rollback.json'),
  state: path.join(dir, 'startup-state.json'),
  blocked: path.join(dir, 'blocked-version.json'),
  installers: path.join(dir, 'rollback')
})

export const storedInstallerPath = (dir, version) => path.join(files(dir).installers, `Echo-Setup-${version}.exe`)

/**
 * Versão ANTIGA, quando a nova terminou de baixar: anota como voltar. Só para atualização de verdade (versão
 * maior): numa volta manual para uma versão mais velha não há o que desfazer.
 */
export function recordPendingUpdate(dir, { fromVersion, toVersion }) {
  if (compareVersions(toVersion, fromVersion) <= 0) return null
  const stored = storedInstallerPath(dir, fromVersion)
  const record = {
    fromVersion,
    toVersion,
    installerPath: fs.existsSync(stored) ? stored : null,
    downloadUrl: releaseInstallerUrl(fromVersion),
    recordedAt: new Date().toISOString()
  }
  return writeJson(files(dir).record, record) ? record : null
}

/**
 * Guarda uma cópia do instalador da versão que acabou de baixar: é com ela que, na atualização seguinte, dá
 * para voltar sem depender da internet. Mantém só a da versão em uso e a da que está chegando.
 */
export async function keepInstallerCopy(dir, { version, downloadedFile, currentVersion }) {
  const target = storedInstallerPath(dir, version)
  try {
    await fs.promises.mkdir(files(dir).installers, { recursive: true })
    if (!fs.existsSync(target)) {
      const temporary = `${target}.part`
      await fs.promises.copyFile(downloadedFile, temporary)
      await fs.promises.rename(temporary, target)
    }
    for (const name of await fs.promises.readdir(files(dir).installers)) {
      const keep = [path.basename(target), path.basename(storedInstallerPath(dir, currentVersion))]
      if (!keep.includes(name)) await fs.promises.rm(path.join(files(dir).installers, name), { force: true })
    }
    return target
  } catch {
    return null
  }
}

/**
 * Versão NOVA, ao iniciar: segue normal, conta mais uma abertura sem sucesso, ou desfaz a atualização.
 * `importFailed`: o código principal nem carregou (erro definitivo, não adianta tentar de novo).
 */
export function decideStartup({ appVersion, record, state, importFailed = false }) {
  // Só vigia a primeira versão logo depois de uma atualização registrada pela versão anterior
  if (!record || record.toVersion !== appVersion || !record.fromVersion) return { action: 'normal', state: null }
  const current = state && state.version === appVersion ? state : { version: appVersion, failedStarts: 0, healthy: false }
  if (current.healthy) return { action: 'normal', state: null }
  if (importFailed) return { action: 'rollback', state: { ...current, failedStarts: current.failedStarts + 1 }, reason: 'o código principal não carregou' }
  // A abertura atual conta como falha até a tela carregar (markHealthy zera a conta)
  const failedStarts = current.failedStarts + 1
  if (failedStarts > MAX_FAILED_STARTS) {
    return { action: 'rollback', state: { ...current, failedStarts }, reason: `${MAX_FAILED_STARTS} aberturas seguidas sem a tela carregar` }
  }
  return { action: 'watch', state: { ...current, failedStarts } }
}

export function readStartupFiles(dir) {
  const f = files(dir)
  return { record: readJson(f.record), state: readJson(f.state) }
}

export function saveStartupState(dir, state) {
  return writeJson(files(dir).state, state)
}

/** A tela carregou: esta versão está aprovada e não é mais vigiada */
export function markHealthy(dir, appVersion) {
  const { record } = readStartupFiles(dir)
  if (!record || record.toVersion !== appVersion) return false
  return writeJson(files(dir).state, { version: appVersion, failedStarts: 0, healthy: true, healthyAt: new Date().toISOString() })
}

export function blockVersion(dir, { version, rolledBackTo, reason }) {
  return writeJson(files(dir).blocked, { version, rolledBackTo, reason, at: new Date().toISOString(), notified: false })
}

/** A versão foi desfeita neste computador? (o atualizador não a baixa nem instala de novo) */
export function isVersionBlocked(dir, version) {
  const blocked = readJson(files(dir).blocked)
  return Boolean(blocked && blocked.version && blocked.version === version)
}

/** Aviso a mostrar uma única vez depois de uma volta automática; null se não há */
export function takeRollbackNotice(dir, appVersion) {
  const f = files(dir)
  const blocked = readJson(f.blocked)
  if (!blocked || blocked.notified || blocked.rolledBackTo !== appVersion) return null
  writeJson(f.blocked, { ...blocked, notified: true })
  return { badVersion: blocked.version, currentVersion: appVersion, reason: blocked.reason || '' }
}

const quote = (text) => String(text ?? '').replace(/'/g, "''")

/**
 * Script (PowerShell) que desfaz a atualização: espera o Echo fechar, mostra um aviso, pega o instalador da
 * versão anterior (cópia local ou download), instala em silêncio e reabre o app. Tudo vai para o update.log.
 */
export function buildRollbackScript({ exePath, installerPath, downloadUrl, logFile, badVersion, goodVersion }) {
  return [
    "$ErrorActionPreference = 'Stop'",
    `$exe = '${quote(exePath)}'`,
    `$installer = '${quote(installerPath || '')}'`,
    `$url = '${quote(downloadUrl)}'`,
    `$logFile = '${quote(logFile || '')}'`,
    'function Log($m) { if ($logFile) { try { [IO.File]::AppendAllText($logFile, (Get-Date).ToUniversalTime().ToString("o") + " volta: " + $m + "`n", (New-Object Text.UTF8Encoding($false))) } catch {} } }',
    `Log "iniciada: desfazendo a ${quote(badVersion)} e voltando para a ${quote(goodVersion)}"`,
    '$form = $null; $label = $null',
    'try {',
    '  Add-Type -AssemblyName System.Windows.Forms, System.Drawing',
    '  $form = New-Object System.Windows.Forms.Form',
    "  $form.Text = 'Echo'; $form.FormBorderStyle = 'None'; $form.StartPosition = 'CenterScreen'",
    '  $form.Size = New-Object System.Drawing.Size(460, 124); $form.TopMost = $true; $form.ShowInTaskbar = $false',
    '  $form.BackColor = [System.Drawing.Color]::FromArgb(14, 17, 24)',
    '  $label = New-Object System.Windows.Forms.Label',
    "  $label.ForeColor = [System.Drawing.Color]::White; $label.Dock = 'Fill'; $label.TextAlign = 'MiddleCenter'",
    "  $label.Font = New-Object System.Drawing.Font('Segoe UI', 10.5)",
    '  $form.Controls.Add($label); $form.Show()',
    '} catch { $form = $null }',
    'function Say($t) { if ($label) { $label.Text = $t; [System.Windows.Forms.Application]::DoEvents() } }',
    'function Pump($seconds) { for ($i = 0; $i -lt $seconds * 10; $i++) { if ($form) { [System.Windows.Forms.Application]::DoEvents() }; Start-Sleep -Milliseconds 100 } }',
    `Say "A versão nova do Echo não abriu direito.\`r\`nVoltando para a versão ${quote(goodVersion)}…"`,
    '$name = [IO.Path]::GetFileNameWithoutExtension($exe)',
    '$deadline = (Get-Date).AddSeconds(30)',
    'while ((Get-Date) -lt $deadline -and (Get-Process -Name $name -ErrorAction SilentlyContinue)) { Pump 1 }',
    'Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue',
    'try {',
    '  if (-not $installer -or -not (Test-Path -LiteralPath $installer)) {',
    '    Log ("sem cópia local do instalador; baixando " + $url)',
    `    Say "Baixando a versão ${quote(goodVersion)} do Echo…\`r\`nIsso pode levar alguns minutos."`,
    "    $installer = Join-Path $env:TEMP ('Echo-Rollback-' + [Guid]::NewGuid().ToString('N') + '.exe')",
    '    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12',
    "    $ProgressPreference = 'SilentlyContinue'",
    '    Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing',
    '    Log "instalador baixado"',
    '  } else { Log ("usando a cópia local do instalador: " + $installer) }',
    `  Say "Instalando a versão ${quote(goodVersion)} do Echo…"`,
    "  $process = Start-Process -FilePath $installer -ArgumentList '--updated', '/S', '--force-run' -PassThru",
    '  while (-not $process.HasExited) { Pump 1 }',
    '  Log ("instalador terminou com código " + $process.ExitCode)',
    '  if ($process.ExitCode -ne 0) { throw ("o instalador saiu com código " + $process.ExitCode) }',
    '} catch {',
    '  Log ("FALHOU: " + $_.Exception.Message)',
    `  Say "Não foi possível voltar automaticamente.\`r\`nBaixe o Echo ${quote(goodVersion)} em github.com/Lag9938/Echo/releases"`,
    '  Pump 20',
    '  if ($form) { $form.Close() }',
    '  exit 1',
    '}',
    // O instalador reabre o app (--force-run); se não reabrir, abre aqui
    '$waited = 0',
    'while ($waited -lt 15 -and -not (Get-Process -Name $name -ErrorAction SilentlyContinue)) { Pump 1; $waited++ }',
    'if (-not (Get-Process -Name $name -ErrorAction SilentlyContinue)) {',
    '  Log "o app não abriu sozinho; abrindo agora"',
    '  try { Start-Process -FilePath $exe } catch { Log ("não foi possível abrir o app: " + $_.Exception.Message) }',
    '}',
    'Log "concluída"',
    'Pump 2',
    'if ($form) { $form.Close() }'
  ].join('\n')
}

/** Grava o script e o inicia solto do app (mesmo jeito do vigia de reabertura). Devolve true se iniciou. */
export function startRollback({ dir, exePath, record, logFile, reason, spawnProcess = spawn, platform = process.platform }) {
  if (platform !== 'win32') return false
  try {
    blockVersion(dir, { version: record.toVersion, rolledBackTo: record.fromVersion, reason })
    const scriptFile = path.join(dir, 'update-rollback.ps1')
    fs.writeFileSync(scriptFile, '﻿' + buildRollbackScript({
      exePath,
      installerPath: record.installerPath,
      downloadUrl: record.downloadUrl || releaseInstallerUrl(record.fromVersion),
      logFile,
      badVersion: record.toVersion,
      goodVersion: record.fromVersion
    }), 'utf8')
    const { command, args, options } = buildWatchdogSpawn(scriptFile)
    const child = spawnProcess(command, args, options)
    child.on?.('error', () => {})
    child.unref?.()
    return true
  } catch {
    return false
  }
}
