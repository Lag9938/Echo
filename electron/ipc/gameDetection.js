import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const execFileAsync = promisify(execFile)

export const POPULAR_GAMES = [
  { match: ['valorant-win64-shipping', 'valorant', 'valorant-win64'], name: 'VALORANT', icon: '🎮' },
  { match: ['cs2', 'csgo'], name: 'Counter-Strike 2', icon: '🔫' },
  { match: ['fortniteclient-win64-shipping', 'fortnite'], name: 'Fortnite', icon: '🪂' },
  { match: ['league of legends', 'leagueclientux', 'leagueclient'], name: 'League of Legends', icon: '⚔️' },
  { match: ['gta5', 'fivem'], name: 'Grand Theft Auto V', icon: '🚗' },
  { match: ['pes2021', 'pes2020', 'pes2019', 'pes', 'efootball', 'efootball2024', 'efootball2025', 'we2021'], name: 'eFootball PES', icon: '⚽' },
  { match: ['javaw', 'minecraft.windows', 'minecraft'], name: 'Minecraft', icon: '⛏️' },
  { match: ['robloxplayerbeta', 'roblox'], name: 'Roblox', icon: '🧱' },
  { match: ['r5apex', 'apex'], name: 'Apex Legends', icon: '🏆' },
  { match: ['overwatch'], name: 'Overwatch 2', icon: '🛡️' },
  { match: ['rocketleague'], name: 'Rocket League', icon: '⚽' },
  { match: ['rainbowsix'], name: 'Rainbow Six Siege', icon: '🎯' },
  { match: ['cod', 'modernwarfare', 'warzone'], name: 'Call of Duty', icon: '💥' },
  { match: ['rustclient', 'rust'], name: 'Rust', icon: '🏕️' },
  { match: ['deadbydaylight-win64-shipping', 'deadbydaylight'], name: 'Dead by Daylight', icon: '🔪' },
  { match: ['genshinimpact'], name: 'Genshin Impact', icon: '✨' },
  { match: ['starrail'], name: 'Honkai: Star Rail', icon: '🌠' },
  { match: ['dota2'], name: 'Dota 2', icon: '👑' },
  { match: ['fc24', 'fc25', 'fifa23', 'fifa'], name: 'EA SPORTS FC', icon: '⚽' },
  { match: ['palworld-win64-shipping', 'palworld'], name: 'Palworld', icon: '🐾' },
  { match: ['cyberpunk2077'], name: 'Cyberpunk 2077', icon: '🌆' },
  { match: ['helldivers2'], name: 'HELLDIVERS™ 2', icon: '🚀' },
  { match: ['terraria'], name: 'Terraria', icon: '🌳' },
  { match: ['brawlhalla'], name: 'Brawlhalla', icon: '🥊' },
  { match: ['among us', 'amongus'], name: 'Among Us', icon: '🚀' },
  { match: ['sea of thieves', 'sotgame'], name: 'Sea of Thieves', icon: '🏴‍☠️' }
]

// Detecta pelo NOME DO PROCESSO de verdade (o que está de fato rodando), nunca pelo título da janela.
// Antes, "League of Legends" aparecia como atividade mesmo sem o jogo aberto: bastava QUALQUER janela do
// sistema (uma aba do navegador, um vídeo, esta própria conversa) ter esse texto no título para contar como
// "jogando". Título de janela é texto arbitrário que qualquer app pode exibir — não prova que o jogo está
// rodando. `windowTitle` continua recebido só para não quebrar quem chama esta função, mas é ignorado.
export function matchGameProcess(procName, _windowTitle = '') {
  if (!procName) return null
  const p = procName.replace(/\.exe$/i, '').toLowerCase().trim()
  if (!p) return null

  if (p.includes('valorant')) {
    return { name: 'VALORANT', icon: '🎮', processName: procName }
  }

  if (p === 'cs2' || p === 'csgo') {
    return { name: 'Counter-Strike 2', icon: '🔫', processName: procName }
  }

  if (p === 'leagueclientux' || p === 'leagueclient' || p === 'league of legends') {
    return { name: 'League of Legends', icon: '⚔️', processName: procName }
  }

  for (const g of POPULAR_GAMES) {
    for (const m of g.match) {
      const target = m.toLowerCase()
      if (
        p === target ||
        p.startsWith(target + '-') ||
        p.startsWith(target + '_') ||
        (target.length >= 5 && p.includes(target))
      ) {
        return { name: g.name, icon: g.icon, processName: procName }
      }
    }
  }
  return null
}

// Pastas onde as lojas instalam jogos (Steam, Epic, GOG, Riot, Xbox, Ubisoft, EA, Rockstar) e as pastas
// "Games"/"Jogos" que as pessoas criam. A lista POPULAR_GAMES nunca vai ter todos os jogos (o Horizon
// Forbidden West, por exemplo, não estava nela e ficava sem 60 FPS na transmissão); o lugar onde o
// executável está instalado reconhece qualquer jogo dessas lojas sem precisar cadastrar um por um.
const GAME_LIBRARY_MARKERS = [
  '\\steamapps\\common\\',
  '\\epic games\\',
  '\\gog galaxy\\games\\',
  '\\gog games\\',
  '\\riot games\\',
  '\\xboxgames\\',
  '\\ubisoft game launcher\\games\\',
  '\\ea games\\',
  '\\origin games\\',
  '\\rockstar games\\',
  '\\games\\',
  '\\jogos\\'
]

// Programas que moram nessas pastas (ou ao lado delas) mas não são o jogo: lojas, launchers e utilitários
const NON_GAME_PROCESSES = new Set([
  'steam', 'steamwebhelper', 'steamservice', 'gameoverlayui',
  'epicgameslauncher', 'epicwebhelper',
  'riotclientservices', 'riotclientux', 'riotclientuxrender', 'riotclientcrashhandler',
  'galaxyclient', 'galaxyclient helper',
  'upc', 'ubisoftconnect', 'uplaywebcore',
  'eadesktop', 'ealauncher', 'origin',
  'launcher', 'launcherpatcher', 'socialclubhelper',
  'wallpaper32', 'wallpaper64', 'ui32',
  'unitycrashhandler32', 'unitycrashhandler64', 'crashreportclient'
])

/**
 * A janela é de um jogo? Vale a lista de jogos conhecidos (pelo nome do processo) ou o executável estar
 * numa pasta de jogos. `exePath` pode faltar (processo protegido por anti-cheat): aí só a lista decide.
 */
export function isGameExecutable(processName, exePath) {
  const name = (processName || '').replace(/\.exe$/i, '').toLowerCase().trim()
  if (name && NON_GAME_PROCESSES.has(name)) return false
  if (matchGameProcess(processName)) return true
  if (!exePath || typeof exePath !== 'string') return false
  const normalized = exePath.replace(/\//g, '\\').toLowerCase()
  return GAME_LIBRARY_MARKERS.some(marker => normalized.includes(marker))
}

/** Saída "pid|caminho" (uma por linha) → Map<pid, caminho>; linhas sem caminho são ignoradas */
export function parseProcessPaths(stdout) {
  const paths = new Map()
  for (const line of String(stdout || '').split(/\r?\n/)) {
    const separator = line.indexOf('|')
    if (separator <= 0) continue
    const pid = Number(line.slice(0, separator))
    const exePath = line.slice(separator + 1).trim()
    if (Number.isInteger(pid) && pid > 0 && exePath) paths.set(pid, exePath)
  }
  return paths
}

export function resolveHelperPath(rootDir) {
  const candidates = [
    path.join(rootDir, 'src', 'native', 'AudioCaptureHelper', 'bin', 'AudioCaptureHelper.exe'),
    path.join(rootDir, 'dist-desktop', 'win-unpacked', 'resources', 'AudioCaptureHelper.exe')
  ]
  if (process.resourcesPath) candidates.push(path.join(process.resourcesPath, 'AudioCaptureHelper.exe'))
  return candidates.find(candidate => fs.existsSync(candidate)) || null
}

async function getProcessPaths(pids) {
  if (pids.length === 0) return new Map()
  const powershell = process.env.SystemRoot
    ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    : 'powershell.exe'
  // pids são inteiros conferidos por quem chama; nada vindo de fora entra no comando
  const command = `Get-Process -Id ${pids.join(',')} -ErrorAction SilentlyContinue | ForEach-Object { '{0}|{1}' -f $_.Id, $_.Path }`
  const { stdout } = await execFileAsync(
    fs.existsSync(powershell) ? powershell : 'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', command],
    { timeout: 4000, windowsHide: true, maxBuffer: 1024 * 1024 }
  )
  return parseProcessPaths(stdout)
}

/**
 * De qual programa é cada janela capturável: Map<"window:<hwnd>:0", { processName, exePath }>, com as
 * mesmas chaves do desktopCapturer. Qualquer falha devolve o que deu para descobrir (ou nada): a lista de
 * janelas da transmissão nunca pode deixar de abrir por causa disso.
 */
export async function getWindowProcesses(rootDir) {
  const result = new Map()
  if (process.platform !== 'win32') return result
  try {
    const helperPath = resolveHelperPath(rootDir)
    if (!helperPath) return result
    const { stdout } = await execFileAsync(helperPath, ['--list-windows'], { timeout: 4000, windowsHide: true, maxBuffer: 5 * 1024 * 1024 })
    const windows = JSON.parse(stdout.trim())
    if (!Array.isArray(windows)) return result

    const valid = windows.filter(w => w && typeof w.id === 'string' && Number.isInteger(w.pid) && w.pid > 0)
    for (const w of valid) result.set(w.id, { processName: w.processName || '', exePath: null })

    const paths = await getProcessPaths([...new Set(valid.map(w => w.pid))])
    for (const w of valid) result.set(w.id, { processName: w.processName || '', exePath: paths.get(w.pid) || null })
  } catch (error) { console.warn('[Jogos] Falha ao descobrir o programa de cada janela:', error) }
  return result
}

let activeGame = null
let activeGameStartTime = null
let gameScanInterval = null
let isScanningGames = false

export function getActiveGame() {
  return activeGame
}

export function getActiveGameStartTime() {
  return activeGameStartTime
}

export function getGameScanInterval() {
  return gameScanInterval
}

export function setGameScanInterval(interval) {
  gameScanInterval = interval
}

export async function scanRunningGames(getMainWindow, rootDir) {
  if (isScanningGames) return
  isScanningGames = true
  try {
    let foundGame = null

    if (process.platform === 'win32') {
      try {
        const tasklistCmd = process.env.SystemRoot 
          ? path.join(process.env.SystemRoot, 'System32', 'tasklist.exe')
          : 'tasklist.exe'
        const exeToRun = fs.existsSync(tasklistCmd) ? tasklistCmd : 'tasklist.exe'
        const { stdout } = await execFileAsync(exeToRun, ['/fo', 'csv', '/nh'], { timeout: 4000, windowsHide: true, maxBuffer: 5 * 1024 * 1024 })
        if (stdout) {
          const lines = stdout.split(/\r?\n/)
          for (const line of lines) {
            if (!line.trim()) continue
            const match = line.match(/^"([^"]+)"/)
            if (match && match[1]) {
              const matched = matchGameProcess(match[1])
              if (matched) {
                foundGame = matched
                break
              }
            }
          }
        }
      } catch (error) { console.warn('[Jogos] Falha ao listar os processos (tasklist):', error) }
    }

    const helperPath = resolveHelperPath(rootDir)

    if (helperPath) {
      try {
        const { stdout } = await execFileAsync(helperPath, ['--get-active-game'], { timeout: 4000 })
        if (stdout && stdout.trim().startsWith('{')) {
          const data = JSON.parse(stdout.trim())
          const fgMatched = matchGameProcess(data.foreground?.processName, data.foreground?.title)
          if (fgMatched) {
            foundGame = fgMatched
          } else if (!foundGame && Array.isArray(data.windows)) {
            for (const win of data.windows) {
              const matched = matchGameProcess(win.processName, win.title)
              if (matched) {
                foundGame = matched
                break
              }
            }
          }
        }
      } catch (error) { console.warn('[Jogos] Falha ao consultar a janela em primeiro plano:', error) }
    }

    const mainWindow = getMainWindow()
    if (foundGame) {
      const isNewGame = !activeGame || activeGame.name !== foundGame.name
      if (isNewGame) {
        activeGame = foundGame
        activeGameStartTime = Date.now()
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game-detected', {
          name: activeGame.name,
          icon: activeGame.icon,
          startedAt: activeGameStartTime || Date.now()
        })
      }
    } else {
      if (activeGame) {
        activeGame = null
        activeGameStartTime = null
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('game-detected', null)
        }
      }
    }
  } catch (err) {
  } finally {
    isScanningGames = false
  }
}

export function setupGameDetectionIpc(safeHandle, getMainWindow, rootDir) {
  safeHandle('check-active-game', async () => {
    await scanRunningGames(getMainWindow, rootDir)
    return activeGame ? { name: activeGame.name, icon: activeGame.icon, startedAt: activeGameStartTime } : null
  })
}
