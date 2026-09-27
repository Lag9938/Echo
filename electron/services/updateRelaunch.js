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
 * 4) se o prazo acabar (instalador travado num aviso, por exemplo), abre mesmo assim: nunca desiste
 *    deixando o usuário sem o app.
 *
 * Cada decisão vai para o update.log. Se a instalação falhar, quem volta é a versão antiga, que ainda está instalada.
 */
export function buildRelaunchScript(execPath, updaterDirName, logFile = '') {
  const exe = escapeSingleQuoted(execPath)
  const updaterPattern = escapeSingleQuoted(`*\\${updaterDirName}\\*`)
  return [
    "$ErrorActionPreference = 'SilentlyContinue'",
    `$exe = '${exe}'`,
    `$log = '${escapeSingleQuoted(logFile)}'`,
    'function Log($msg) { if ($log) { Add-Content -LiteralPath $log -Value ("{0} vigia: {1}" -f (Get-Date).ToUniversalTime().ToString("o"), $msg) } }',
    '$name = [IO.Path]::GetFileNameWithoutExtension($exe)',
    '$deadline = (Get-Date).AddSeconds(300)',
    'Log "iniciado"',
    'while ((Get-Date) -lt $deadline -and (Get-Process -Name $name)) { Start-Sleep -Seconds 1 }',
    'Log "Echo antigo fechou"',
    '$idle = 0',
    'while ((Get-Date) -lt $deadline) {',
    '  if (Get-Process -Name $name) { Log "Echo reaberto pelo instalador"; exit }',
    `  if (Get-Process | Where-Object { $_.Path -and $_.Path -like '${updaterPattern}' }) { $idle = 0 } else { $idle++ }`,
    '  if ($idle -ge 5) { Start-Process -FilePath $exe; Log "instalador terminou sem reabrir: Echo iniciado pelo vigia"; exit }',
    '  Start-Sleep -Seconds 1',
    '}',
    'if (-not (Get-Process -Name $name)) { Start-Process -FilePath $exe; Log "prazo esgotado: Echo iniciado pelo vigia" }'
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

/**
 * Inicia o vigia em segundo plano. Só no Windows, onde o instalador NSIS é quem reabre o app.
 * O script vai para um arquivo .ps1 (em vez de -EncodedCommand, que antivírus costumam bloquear).
 */
export function startRelaunchWatchdog({ execPath, updaterDirName, logFile, scriptFile }) {
  if (process.platform !== 'win32') return false
  try {
    fs.writeFileSync(scriptFile, '\ufeff' + buildRelaunchScript(execPath, updaterDirName, logFile), 'utf8')
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptFile],
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
