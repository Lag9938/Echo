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

export function matchGameProcess(procName, windowTitle = '') {
  if (!procName && !windowTitle) return null
  const p = (procName || '').replace(/\.exe$/i, '').toLowerCase().trim()
  const title = (windowTitle || '').toLowerCase().trim()

  if (p.includes('valorant') || title.includes('valorant')) {
    return { name: 'VALORANT', icon: '🎮', processName: procName || 'VALORANT' }
  }

  if (p === 'cs2' || p === 'csgo' || title.includes('counter-strike 2')) {
    return { name: 'Counter-Strike 2', icon: '🔫', processName: procName || 'cs2' }
  }

  if (p === 'leagueclientux' || p === 'leagueclient' || p === 'league of legends' || title.includes('league of legends')) {
    return { name: 'League of Legends', icon: '⚔️', processName: procName || 'league of legends' }
  }

  for (const g of POPULAR_GAMES) {
    for (const m of g.match) {
      const target = m.toLowerCase()
      if (
        p === target || 
        p.startsWith(target + '-') || 
        p.startsWith(target + '_') || 
        (target.length >= 5 && p.includes(target)) || 
        (target.length >= 5 && title.includes(target))
      ) {
        return { name: g.name, icon: g.icon, processName: procName || g.name }
      }
    }
  }
  return null
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
      } catch (e) {}
    }

    let helperPath = null
    const devPath1 = path.join(rootDir, 'src', 'native', 'AudioCaptureHelper', 'bin', 'AudioCaptureHelper.exe')
    const devPath2 = path.join(rootDir, 'dist-desktop', 'win-unpacked', 'resources', 'AudioCaptureHelper.exe')
    const prodPath = path.join(process.resourcesPath, 'AudioCaptureHelper.exe')

    if (fs.existsSync(devPath1)) {
      helperPath = devPath1
    } else if (fs.existsSync(devPath2)) {
      helperPath = devPath2
    } else if (fs.existsSync(prodPath)) {
      helperPath = prodPath
    }

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
      } catch (e) {}
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
