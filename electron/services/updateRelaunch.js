import { spawn } from 'node:child_process'
import fs from 'node:fs'

const escapeSingleQuoted = (text) => String(text).replace(/'/g, "''")

/**
 * Script do vigia que reabre o Echo depois de uma atualização, caso o instalador não o reabra.
 * Roda num PowerShell separado, porque o app já terá fechado quando ele precisar agir.
 *
 * 1) espera o Echo antigo terminar de fechar;
 * 2) espera o instalador (que roda de dentro da pasta "<app>-updater") acabar;
 * 3) se o Echo apareceu, o instalador já o reabriu e não há nada a fazer; se não apareceu, abre.
 *
 * Se a instalação falhar, quem volta é a versão antiga, que ainda está instalada.
 */
export function buildRelaunchScript(execPath, updaterDirName, logFile) {
  const exe = escapeSingleQuoted(execPath)
  const updaterPattern = escapeSingleQuoted(`*\\${updaterDirName}\\*`)
  const log = escapeSingleQuoted(logFile || '')
  return [
    "$ErrorActionPreference = 'SilentlyContinue'",
    `$exe = '${exe}'`,
    `$logFile = '${log}'`,
    // O vigia também anota o que decidiu no update.log: se a reabertura falhar, o log mostra em que etapa
    'function Log($m) { if ($logFile) { try { [IO.File]::AppendAllText($logFile, (Get-Date).ToUniversalTime().ToString("o") + " vigia: " + $m + "`n", (New-Object Text.UTF8Encoding($false))) } catch {} } }',
    '$name = [IO.Path]::GetFileNameWithoutExtension($exe)',
    '$deadline = (Get-Date).AddSeconds(180)',
    'while ((Get-Date) -lt $deadline -and (Get-Process -Name $name)) { Start-Sleep -Seconds 1 }',
    'Log "o app antigo fechou"',
    '$idle = 0; $sawInstaller = $false',
    'while ((Get-Date) -lt $deadline) {',
    '  if (Get-Process -Name $name) { Log "o app abriu sozinho (o instalador reabriu); nada a fazer"; exit }',
    `  if (Get-Process | Where-Object { $_.Path -and $_.Path -like '${updaterPattern}' }) { $idle = 0; $sawInstaller = $true } else { $idle++ }`,
    '  if ($idle -ge 5) { Log ("instalador terminou (visto: " + $sawInstaller + ") e o app não abriu; abrindo agora"); Start-Process -FilePath $exe; Log "app iniciado pelo vigia"; exit }',
    '  Start-Sleep -Seconds 1',
    '}',
    'Log "tempo esgotado sem o app abrir"'
  ].join('\n')
}

/** Anota uma linha no arquivo de log de atualização (para investigar depois se algo der errado). */
export function appendUpdateLog(logFile, message) {
  if (!logFile) return
  try {
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`)
  } catch {
    // log é só diagnóstico: nunca pode atrapalhar a atualização
  }
}

/** Inicia o vigia em segundo plano. Só no Windows, onde o instalador NSIS é quem reabre o app. */
export function startRelaunchWatchdog({ execPath, updaterDirName, logFile }) {
  if (process.platform !== 'win32') return false
  try {
    const script = buildRelaunchScript(execPath, updaterDirName, logFile)
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
      { detached: true, stdio: 'ignore', windowsHide: true }
    )
    child.on('error', (err) => appendUpdateLog(logFile, `vigia de reabertura falhou ao iniciar: ${err.message}`))
    child.unref()
    appendUpdateLog(logFile, 'vigia de reabertura iniciado')
    return true
  } catch (err) {
    appendUpdateLog(logFile, `vigia de reabertura não pôde ser criado: ${err.message}`)
    return false
  }
}
