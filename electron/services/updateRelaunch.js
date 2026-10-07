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
    '$deadline = (Get-Date).AddSeconds(300)',
    'Log "iniciado"',
    // Aviso na tela enquanto o instalador (silencioso) trabalha: sem ele eram 20 a 70 segundos sem nada
    // aparecendo, e parecia que o Echo tinha fechado de vez. Se a janela não puder ser criada, o vigia segue igual.
    '$form = $null',
    'try {',
    '  Add-Type -AssemblyName System.Windows.Forms, System.Drawing',
    '  $form = New-Object System.Windows.Forms.Form',
    "  $form.Text = 'Atualizando o Echo'; $form.FormBorderStyle = 'None'; $form.StartPosition = 'CenterScreen'",
    '  $form.Size = New-Object System.Drawing.Size(380, 104); $form.TopMost = $true; $form.ShowInTaskbar = $false',
    '  $form.BackColor = [System.Drawing.Color]::FromArgb(14, 17, 24)',
    '  $label = New-Object System.Windows.Forms.Label',
    '  $label.Text = "Atualizando o Echo…`r`nEle reabre sozinho em instantes."',
    "  $label.ForeColor = [System.Drawing.Color]::White; $label.Dock = 'Fill'; $label.TextAlign = 'MiddleCenter'",
    "  $label.Font = New-Object System.Drawing.Font('Segoe UI', 11)",
    '  $form.Controls.Add($label); $form.Show(); [System.Windows.Forms.Application]::DoEvents()',
    '  Log "aviso de atualização na tela"',
    '} catch { $form = $null; Log ("aviso de atualização não pôde ser mostrado: " + $_.Exception.Message) }',
    // Espera 1 s mantendo o aviso vivo (uma janela que não processa eventos aparece como "não respondendo")
    'function Wait1 { for ($i = 0; $i -lt 10; $i++) { if ($form) { [System.Windows.Forms.Application]::DoEvents() }; Start-Sleep -Milliseconds 100 } }',
    // O processo do app aparece um pouco antes da janela dele: o aviso fica mais 2 s para não haver um vão
    'function Finish { Wait1; Wait1; if ($form) { $form.Close() }; exit }',
    'while ((Get-Date) -lt $deadline -and (Get-Process -Name $name)) { Wait1 }',
    'Log "o app antigo fechou"',
    '$idle = 0; $sawInstaller = $false',
    'while ((Get-Date) -lt $deadline) {',
    '  if (Get-Process -Name $name) { Log "o app abriu sozinho (o instalador reabriu); nada a fazer"; Finish }',
    `  if (Get-Process | Where-Object { $_.Path -and $_.Path -like '${updaterPattern}' }) { $idle = 0; $sawInstaller = $true } else { $idle++ }`,
    '  if ($idle -ge 5) { Log ("instalador terminou (visto: " + $sawInstaller + ") e o app não abriu; abrindo agora"); Start-Process -FilePath $exe; Log "app iniciado pelo vigia"; Finish }',
    '  Wait1',
    '}',
    // Prazo esgotado (instalador travado num aviso, por exemplo): abre mesmo assim em vez de deixar o usuário sem o app
    'if (-not (Get-Process -Name $name)) { Log "tempo esgotado sem o app abrir; abrindo agora"; Start-Process -FilePath $exe; Log "app iniciado pelo vigia" }',
    'Finish'
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
 * Como o vigia é iniciado. O PowerShell precisa de um console PRÓPRIO: iniciado direto pelo app com
 * `detached: true` ele nasce sem console, sai na hora com código 0 e NÃO executa o script — foi assim que o
 * vigia passou versões inteiras sem nunca rodar (o update.log só tinha a linha do app, nenhuma do vigia).
 * `cmd /c start` cria esse console (minimizado) e solta o processo: ele continua vivo depois que o app fecha.
 */
export function buildWatchdogSpawn(scriptFile) {
  return {
    command: 'cmd.exe',
    args: ['/d', '/c', 'start', '""', '/min', 'powershell.exe',
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptFile],
    options: { stdio: 'ignore', windowsHide: true }
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
    const { command, args, options } = buildWatchdogSpawn(scriptFile)
    const child = spawn(command, args, options)
    child.on('error', (err) => appendUpdateLog(logFile, `vigia de reabertura falhou ao iniciar: ${err.message}`))
    child.unref()
    appendUpdateLog(logFile, 'vigia de reabertura iniciado')
    return true
  } catch (err) {
    appendUpdateLog(logFile, `vigia de reabertura não pôde ser criado: ${err.message}`)
    return false
  }
}
