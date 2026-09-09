import { app, BrowserWindow, session, ipcMain, desktopCapturer, Notification, globalShortcut, Tray, Menu, nativeImage } from 'electron'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import net from 'node:net'
import crypto from 'node:crypto'
import { AccessToken } from 'livekit-server-sdk'

const execFileAsync = promisify(execFile)

const isDevelopment = !app.isPackaged
const __dirname = path.dirname(fileURLToPath(import.meta.url))

if (isDevelopment) {
  try {
    app.setPath('userData', path.join(app.getPath('appData'), 'Echo-Dev'))
  } catch (e) {
    console.warn('Unable to set dev userData path:', e)
  }
}

// LiveKit Local Server Process Management
let livekitProcess = null

function ensureLocalLivekitServer() {
  const binaryPath = path.join(__dirname, 'tools', 'livekit', 'livekit-server.exe')
  if (fs.existsSync(binaryPath)) {
    const tester = net.createConnection({ port: 7880, host: '127.0.0.1' }, () => {
      tester.destroy()
      console.log('[LiveKit] Local server is already running on port 7880.')
    })
    tester.on('error', () => {
      console.log('[LiveKit] Starting local livekit-server.exe --dev...')
      try {
        livekitProcess = spawn(binaryPath, ['--dev'], {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        })
        livekitProcess.on('error', (err) => console.warn('[LiveKit] Failed to spawn livekit-server:', err))
        livekitProcess.on('exit', (code) => console.log(`[LiveKit] Server exited with code ${code}`))
      } catch (err) {
        console.warn('[LiveKit] Error launching livekit-server:', err)
      }
    })
  }
}

// Rich Presence: Popular Games List
const POPULAR_GAMES = [
  { match: ['valorant-win64-shipping', 'valorant'], name: 'VALORANT', icon: '🎮' },
  { match: ['cs2'], name: 'Counter-Strike 2', icon: '🔫' },
  { match: ['fortniteclient-win64-shipping', 'fortnite'], name: 'Fortnite', icon: '🪂' },
  { match: ['league of legends', 'leagueclientux'], name: 'League of Legends', icon: '⚔️' },
  { match: ['gta5', 'fivem'], name: 'Grand Theft Auto V', icon: '🚗' },
  { match: ['javaw', 'minecraft.windows', 'minecraft'], name: 'Minecraft', icon: '⛏️' },
  { match: ['robloxplayerbeta', 'roblox'], name: 'Roblox', icon: '🧱' },
  { match: ['r5apex', 'apex'], name: 'Apex Legends', icon: '🏆' },
  { match: ['overwatch'], name: 'Overwatch 2', icon: '🛡️' },
  { match: ['rocketleague'], name: 'Rocket League', icon: '⚽' },
  { match: ['rainbowsix'], name: 'Rainbow Six Siege', icon: '🎯' },
  { match: ['cod', 'bootstrapper'], name: 'Call of Duty', icon: '💥' },
  { match: ['rustclient', 'rust'], name: 'Rust', icon: '🏕️' },
  { match: ['deadbydaylight-win64-shipping', 'deadbydaylight'], name: 'Dead by Daylight', icon: '🔪' },
  { match: ['genshinimpact'], name: 'Genshin Impact', icon: '✨' },
  { match: ['starrail'], name: 'Honkai: Star Rail', icon: '🌠' },
  { match: ['dota2'], name: 'Dota 2', icon: '👑' },
  { match: ['fc24', 'fc25', 'fifa'], name: 'EA SPORTS FC', icon: '⚽' },
  { match: ['palworld-win64-shipping', 'palworld'], name: 'Palworld', icon: '🐾' },
  { match: ['cyberpunk2077'], name: 'Cyberpunk 2077', icon: '🌆' }
]

let activeGame = null
let activeGameStartTime = null
let gameScanInterval = null

async function scanRunningGames() {
  try {
    let helperPath = null
    const devPath1 = path.join(__dirname, 'src', 'native', 'AudioCaptureHelper', 'bin', 'AudioCaptureHelper.exe')
    const devPath2 = path.join(__dirname, 'dist-desktop', 'win-unpacked', 'resources', 'AudioCaptureHelper.exe')
    const prodPath = path.join(process.resourcesPath, 'AudioCaptureHelper.exe')

    if (fs.existsSync(devPath1)) {
      helperPath = devPath1
    } else if (fs.existsSync(devPath2)) {
      helperPath = devPath2
    } else if (fs.existsSync(prodPath)) {
      helperPath = prodPath
    }

    let foundGame = null
    if (helperPath) {
      try {
        const { stdout } = await execFileAsync(helperPath, ['--list-windows'], { timeout: 1500 })
        if (stdout && stdout.trim().startsWith('[')) {
          const windows = JSON.parse(stdout.trim())
          for (const win of windows) {
            const pName = (win.processName || '').replace(/\.exe$/i, '').toLowerCase().trim()
            const matched = POPULAR_GAMES.find(g => g.match.some(m => {
              const target = m.toLowerCase()
              return pName === target || pName.startsWith(target + '-') || pName.startsWith(target + '_')
            }))
            if (matched) {
              foundGame = { name: matched.name, icon: matched.icon, processName: win.processName }
              break
            }
          }
        }
      } catch (e) {}
    }

    // Ultra-lightweight fallback using native tasklist.exe (0% CPU impact, no PowerShell/CLR overhead)
    if (!foundGame) {
      try {
        const { stdout: tasklistOut } = await execFileAsync('tasklist.exe', ['/fo', 'csv', '/nh'], { timeout: 2000 })
        if (tasklistOut) {
          const lines = tasklistOut.toLowerCase().split(/\r?\n/)
          for (const line of lines) {
            if (!line.trim()) continue
            const parts = line.split(',').map(s => s.replace(/"/g, '').trim())
            const procName = parts[0] || ''
            const sessionName = parts[2] || ''
            // Ignora serviços de segundo plano do sistema operacional (Session 0 / Services)
            if (sessionName === 'services' || sessionName === '0') continue
            if (!procName) continue

            const baseProc = procName.replace(/\.exe$/i, '').toLowerCase()
            const matched = POPULAR_GAMES.find(g => g.match.some(m => {
              const target = m.toLowerCase()
              return baseProc === target || baseProc.startsWith(target + '-') || baseProc.startsWith(target + '_')
            }))
            if (matched) {
              foundGame = { name: matched.name, icon: matched.icon, processName: procName }
              break
            }
          }
        }
      } catch (e) {}
    }

    if (foundGame) {
      if (!activeGame || activeGame.name !== foundGame.name) {
        activeGame = foundGame
        activeGameStartTime = Date.now()
        mainWindow?.webContents.send('game-detected', {
          name: foundGame.name,
          icon: foundGame.icon,
          startedAt: activeGameStartTime
        })
      }
    } else {
      if (activeGame) {
        activeGame = null
        activeGameStartTime = null
        mainWindow?.webContents.send('game-detected', null)
      }
    }
  } catch (err) {}
}

// Hardware Acceleration & High-Performance Screen Capture for Games (Valorant, CS2, etc.)
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer,WindowsGraphicsCapture,VaapiVideoEncoder,VaapiVideoDecoder,CanvasOopRasterization')
app.commandLine.appendSwitch('disable-features', 'HardwareAcceleratedDirectScanout')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-accelerated-video-decode')
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode')
app.commandLine.appendSwitch('force_high_performance_gpu')
// Impede que o Chromium congele / reduza o framerate da transmissão quando o Echo estiver em segundo plano durante um jogo
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

// Garante instância única (evita processos zumbis que travam atualizações e a abertura da janela)
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      if (isDevelopment) {
        mainWindow.loadURL('http://127.0.0.1:5173').catch(() => {})
      }
    }
  })
}

let mainWindow = null
let tray = null
let isQuitting = false
let hasShownTrayBalloon = false
let audioHelperProcess = null
let audioTcpClient = null

function createTray() {
  if (tray) return
  try {
    const trayIconPath = path.join(__dirname, 'assets', 'echo-tray.png')
    let trayIcon = nativeImage.createFromPath(trayIconPath)
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'echo-icon.png'))
    }
    if (!trayIcon.isEmpty()) {
      trayIcon = trayIcon.resize({ width: 16, height: 16 })
    }

    tray = new Tray(trayIcon)
    tray.setToolTip('Echo - Comunidades e conversas em tempo real')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir Echo',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Sair do Echo',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])

    tray.setContextMenu(contextMenu)

    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
    })

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })
  } catch (err) {
    console.error('[Tray] Falha ao inicializar bandeja do sistema:', err)
  }
}

function stopAudioCapture() {
  if (audioTcpClient) {
    audioTcpClient.destroy()
    audioTcpClient = null
  }
  if (audioHelperProcess) {
    try {
      audioHelperProcess.kill('SIGTERM')
    } catch (e) {}
    audioHelperProcess = null
  }
}

function createWindow() {
  createTray()

  const shouldStartHidden = process.argv.includes('--hidden') || process.argv.includes('--minimized')
  const appIconPath = path.join(__dirname, 'assets', 'echo-icon.png')
  mainWindow = new BrowserWindow({ 
    icon: appIconPath,
    width: 1280, 
    height: 760, 
    minWidth: 900, 
    minHeight: 600, 
    show: !shouldStartHidden,
    backgroundColor: '#0e1118', 
    autoHideMenuBar: true, 
    titleBarStyle: 'hidden',
    webPreferences: { 
      preload: path.join(__dirname, 'electron-preload.cjs'),
      contextIsolation: true, 
      nodeIntegration: false,
      backgroundThrottling: false
    } 
  })
  mainWindow.removeMenu()
  mainWindow.setMenu(null)

  mainWindow.on('close', (event) => {
    if (isDevelopment) {
      isQuitting = true
      app.quit()
      return
    }
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      if (tray && !hasShownTrayBalloon) {
        hasShownTrayBalloon = true
        try {
          tray.displayBalloon({
            title: 'Echo continua em segundo plano',
            content: 'O Echo agora está minimizado na bandeja do sistema. Suas chamadas e transmissões continuam ativas!'
          })
        } catch (e) {}
      }
      return false
    }
  })

  if (isDevelopment) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow.webContents.toggleDevTools()
        event.preventDefault()
      }
      if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
        mainWindow.reload()
        event.preventDefault()
      }
    })
  }

  mainWindow.once('ready-to-show', () => {
    if (shouldStartHidden) {
      mainWindow.minimize()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  // Permitir acesso ao microfone para canais de voz (WebRTC)
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['media', 'microphone', 'audioCapture', 'display-capture'].includes(permission)
    callback(allowed)
  })
  mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    return ['media', 'microphone', 'audioCapture', 'display-capture'].includes(permission)
  })

  // Window Management Handlers (Custom Frameless Controls)
  ipcMain.handle('window-minimize', () => {
    if (mainWindow) mainWindow.minimize()
  })
  ipcMain.handle('window-maximize', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.handle('window-close', () => {
    if (mainWindow) mainWindow.close()
  })
  ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false
  })

  // Handler para capturar telas e janelas do sistema operacional com WGC e alta definição
  ipcMain.handle('get-sources', async () => {
    let sources = []
    try {
      sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 480, height: 270 },
        fetchWindowIcons: true
      })
    } catch (err) {
      console.warn('desktopCapturer.getSources error:', err)
    }

    const screens = []
    const windowsMap = new Map()
    const primaryScreen = sources.find(s => s.id.startsWith('screen:'))

    for (const source of sources) {
      const thumb = source.thumbnail && !source.thumbnail.isEmpty() ? source.thumbnail.toDataURL() : null
      const icon = source.appIcon && !source.appIcon.isEmpty() ? source.appIcon.toDataURL() : null

      if (source.id.startsWith('screen:')) {
        screens.push({
          id: source.id,
          name: source.name || 'Monitor Principal',
          thumbnail: thumb,
          appIcon: icon,
          type: 'screen',
          isGame: false
        })
        continue
      }

      let rawName = (source.name || '').trim()
      if (!rawName || rawName === 'Echo' || rawName === 'Program Manager' || rawName === 'TextInputHost' || rawName === 'MSCTFIME UI' || rawName === 'Default IME') {
        continue
      }

      const lower = rawName.toLowerCase()
      // O Valorant não permite captura de janela individual pelo Vanguard; deve ser transmitido via Tela Inteira
      if (lower.includes('valorant-win64') || lower === 'valorant') {
        continue
      }

      const isGame = POPULAR_GAMES.some(g => g.match.some(m => lower.includes(m)))
      let cleanName = rawName

      // Deduplica sub-janelas internas do mesmo app
      const dedupeKey = isGame ? cleanName.toLowerCase() : `${cleanName.toLowerCase()}::${source.id}`

      const existing = windowsMap.get(dedupeKey)
      if (!existing) {
        windowsMap.set(dedupeKey, {
          id: source.id,
          name: cleanName,
          thumbnail: thumb,
          appIcon: icon,
          type: 'window',
          isGame: isGame
        })
      } else {
        if (!existing.thumbnail && thumb) {
          windowsMap.set(dedupeKey, {
            id: source.id,
            name: cleanName,
            thumbnail: thumb,
            appIcon: icon || existing.appIcon,
            type: 'window',
            isGame: isGame
          })
        }
      }
    }

    const windows = Array.from(windowsMap.values())
    windows.sort((a, b) => {
      if (a.isGame && !b.isGame) return -1
      if (!a.isGame && b.isGame) return 1
      return a.name.localeCompare(b.name)
    })

    return [...screens, ...windows]
  })

  // Handler para desminimizar / restaurar janela antes de iniciar a captura
  ipcMain.handle('restore-window', async (_event, sourceId) => {
    if (!sourceId || typeof sourceId !== 'string') return
    const parts = sourceId.split(':')
    if (parts[0] === 'window' && parts[1]) {
      try {
        const helperPath = isDevelopment
          ? path.join(__dirname, 'src', 'native', 'AudioCaptureHelper', 'bin', 'AudioCaptureHelper.exe')
          : path.join(process.resourcesPath, 'AudioCaptureHelper.exe')
        await execFileAsync(helperPath, ['--restore-window', parts[1]], { timeout: 1000 })
      } catch (e) {
        console.warn('Restore window failed:', e)
      }
    }
  })

  // Handlers para captura de áudio nativa por processo (Windows WASAPI Loopback estilo Discord)
  ipcMain.handle('start-process-audio-capture', async (_event, sourceId) => {
    stopAudioCapture()
    if (!sourceId || typeof sourceId !== 'string' || !sourceId.startsWith('window:')) {
      return { success: false, reason: 'Not a window source' }
    }

    const parts = sourceId.split(':')
    const hwnd = parts[1]
    if (!hwnd) {
      return { success: false, reason: 'Invalid HWND' }
    }

    try {
      const helperPath = isDevelopment
        ? path.join(__dirname, 'src', 'native', 'AudioCaptureHelper', 'bin', 'AudioCaptureHelper.exe')
        : path.join(process.resourcesPath, 'AudioCaptureHelper.exe')

      const port = 8092

      // Spawn AudioCaptureHelper with --hwnd <hwnd> <port>
      audioHelperProcess = spawn(helperPath, ['--hwnd', hwnd, port.toString()], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      audioHelperProcess.on('error', (err) => {
        console.warn('[AudioCaptureHelper] Process error:', err)
        stopAudioCapture()
      })

      audioHelperProcess.on('exit', (code) => {
        console.log(`[AudioCaptureHelper] Process exited with code ${code}`)
        stopAudioCapture()
      })

      // Wait a moment for the TCP server in AudioCaptureHelper to start listening
      await new Promise((resolve) => setTimeout(resolve, 350))

      if (!audioHelperProcess || audioHelperProcess.killed) {
        return { success: false, reason: 'Helper process failed to start' }
      }

      // Connect TCP client to receive PCM audio stream
      return new Promise((resolve) => {
        let isConnected = false
        const client = net.createConnection({ port, host: '127.0.0.1' }, () => {
          isConnected = true
          audioTcpClient = client
          console.log('[AudioCaptureHelper] Connected to TCP audio stream successfully!')
          resolve({ success: true })
        })

        client.on('data', (chunk) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('screenshare-audio-chunk', chunk)
          }
        })

        client.on('error', (err) => {
          console.warn('[AudioCaptureHelper] TCP socket error:', err)
          if (!isConnected) {
            stopAudioCapture()
            resolve({ success: false, reason: err.message })
          }
        })

        client.on('close', () => {
          console.log('[AudioCaptureHelper] TCP socket closed.')
          stopAudioCapture()
        })

        setTimeout(() => {
          if (!isConnected) {
            console.warn('[AudioCaptureHelper] Connection timeout.')
            stopAudioCapture()
            resolve({ success: false, reason: 'Connection timeout' })
          }
        }, 1500)
      })
    } catch (err) {
      console.warn('[AudioCaptureHelper] Failed to start process audio capture:', err)
      stopAudioCapture()
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('stop-process-audio-capture', async () => {
    stopAudioCapture()
    return { success: true }
  })

  // Rich Presence: check active game manually
  ipcMain.handle('check-active-game', () => {
    return activeGame ? { name: activeGame.name, icon: activeGame.icon, startedAt: activeGameStartTime } : null
  })

  // Push-to-Talk: Global shortcut registration
  ipcMain.handle('register-global-ptt', (_event, shortcutKey) => {
    try {
      globalShortcut.unregisterAll()
      if (!shortcutKey) return { success: true }

      const registered = globalShortcut.register(shortcutKey, () => {
        mainWindow?.webContents.send('ptt-state', true)
        setTimeout(() => {
          mainWindow?.webContents.send('ptt-state', false)
        }, 350)
      })
      return { success: registered }
    } catch (e) {
      console.warn('Global PTT shortcut error:', e)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('unregister-global-ptt', () => {
    globalShortcut.unregisterAll()
    return { success: true }
  })

  // Native Windows Notifications
  ipcMain.handle('show-notification', (_event, { title, body }) => {
    if (Notification.isSupported()) {
      const notif = new Notification({
        title: title || 'Echo',
        body: body || '',
        silent: false
      })
      notif.show()
      notif.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
        }
      })
      return { success: true }
    }
    return { success: false }
  })

  // LiveKit SFU Connection & Token Generation Handler (com tolerância a relógio descalibrado)
  ipcMain.handle('get-livekit-connection', async (_event, params = {}) => {
    try {
      let livekitUrl = cloudUrl || process.env.LIVEKIT_URL || 'wss://137-131-144-255.sslip.io'
      if (livekitUrl.includes('136-248-75-151')) {
        livekitUrl = 'wss://137-131-144-255.sslip.io'
      }
      const apiKey = cloudApiKey || process.env.LIVEKIT_API_KEY || 'APIi5XDp34K5gP3'
      const apiSecret = cloudApiSecret || process.env.LIVEKIT_API_SECRET || 'LTl6XQ3ozsSupX8Ydva6erDmcmIVnbi7BFS6H7GPQDQ'

      const now = Math.floor(Date.now() / 1000)
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        exp: now + 24 * 3600,
        iss: apiKey,
        nbf: now - 3600, // Margem de 1 hora para relógios de usuários adiantados (evita "token is not valid yet")
        sub: identity || 'anonymous',
        name: name || 'Membro',
        metadata: JSON.stringify({ avatarUrl: avatarUrl || '' }),
        video: {
          room: room || 'general',
          roomJoin: true,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        }
      }

      const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
      const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const toSign = `${encHeader}.${encPayload}`
      const signature = crypto.createHmac('sha256', apiSecret).update(toSign).digest('base64url')
      const token = `${toSign}.${signature}`

      return { success: true, url: livekitUrl, token }
    } catch (err) {
      console.error('[LiveKit] Failed to generate token:', err)
      return { success: false, error: err.message }
    }
  })

  // Windows / System Auto-Start at Login (Discord Style - Default Enabled)
  ipcMain.handle('get-autostart-settings', () => {
    try {
      const autostartConfigFile = path.join(app.getPath('userData'), 'autostart_preference.json')
      const settings = app.getLoginItemSettings()
      const isOpen = Boolean(settings.openAtLogin || settings.executableWillLaunchAtLogin)
      const effectiveOpen = fs.existsSync(autostartConfigFile) ? isOpen : true
      return {
        openAtLogin: effectiveOpen
      }
    } catch (err) {
      console.warn('Error fetching login item settings:', err)
      return { openAtLogin: true }
    }
  })

  ipcMain.handle('set-autostart-settings', (_event, { openAtLogin, openAsHidden }) => {
    try {
      const willOpen = Boolean(openAtLogin)
      const isHidden = Boolean(openAsHidden)

      if (app.isPackaged) {
        app.setLoginItemSettings({
          openAtLogin: willOpen,
          openAsHidden: isHidden,
          path: process.execPath,
          args: isHidden ? ['--hidden'] : []
        })
      } else {
        app.setLoginItemSettings({
          openAtLogin: willOpen,
          openAsHidden: isHidden,
          path: process.execPath,
          args: [path.resolve(process.argv[1]), ...(isHidden ? ['--hidden'] : [])]
        })
      }

      try {
        const autostartConfigFile = path.join(app.getPath('userData'), 'autostart_preference.json')
        fs.writeFileSync(autostartConfigFile, JSON.stringify({ configured: true, openAtLogin: willOpen, openAsHidden: isHidden, timestamp: Date.now() }))
      } catch (e) {}

      const updated = app.getLoginItemSettings()
      return {
        success: true,
        openAtLogin: Boolean(updated.openAtLogin || updated.executableWillLaunchAtLogin)
      }
    } catch (err) {
      console.error('Error setting login item settings:', err)
      return { success: false, error: err.message }
    }
  })

  // Handler para instalar atualização quando o usuário decidir
  ipcMain.on('install-update', () => {
    isQuitting = true
    autoUpdater.quitAndInstall(false, true)
  })

  // Auto-updater (apenas em produção)
  if (!isDevelopment) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info) => {
      console.log('Atualização disponível:', info.version)
      mainWindow?.webContents.send('update-available', {
        version: info.version
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      mainWindow?.webContents.send('update-progress', {
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Atualização baixada:', info.version)
      mainWindow?.webContents.send('update-ready', {
        version: info.version
      })
    })

    autoUpdater.on('error', (err) => {
      console.error('Erro no auto-updater:', err.message)
    })

    autoUpdater.checkForUpdates().catch(err => {
      console.error('Erro ao verificar atualizações:', err)
    })
  }

  // Start background game scanner for Rich Presence
  if (gameScanInterval) clearInterval(gameScanInterval)
  gameScanInterval = setInterval(scanRunningGames, 10000)
  setTimeout(scanRunningGames, 1500)

  if (isDevelopment) {
    const devUrl = 'http://127.0.0.1:5173'
    let retries = 0
    const loadDev = () => {
      mainWindow.loadURL(devUrl).catch(() => {
        if (retries++ < 15 && mainWindow && !mainWindow.isDestroyed()) {
          setTimeout(loadDev, 800)
        }
      })
    }
    loadDev()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html')).catch(() => {
      mainWindow.loadFile('dist/index.html')
    })
  }
  if (!shouldStartHidden) {
    mainWindow.show()
  }
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  ensureLocalLivekitServer()
  createWindow()

  // Ativação padrão de inicialização com o Windows na primeira execução (estilo Discord)
  try {
    const autostartConfigFile = path.join(app.getPath('userData'), 'autostart_preference.json')
    if (!fs.existsSync(autostartConfigFile)) {
      if (app.isPackaged) {
        app.setLoginItemSettings({
          openAtLogin: true,
          openAsHidden: false,
          path: process.execPath,
          args: []
        })
      }
      fs.writeFileSync(autostartConfigFile, JSON.stringify({ configured: true, openAtLogin: true, isDefault: true, timestamp: Date.now() }))
    }
  } catch (err) {
    console.warn('Não foi possível registrar autostart padrão:', err)
  }

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  if (tray) {
    try { tray.destroy() } catch (e) {}
    tray = null
  }
  if (gameScanInterval) clearInterval(gameScanInterval)
  globalShortcut.unregisterAll()
  stopAudioCapture()
  if (livekitProcess) {
    try { livekitProcess.kill() } catch (e) {}
    livekitProcess = null
  }
})

app.on('window-all-closed', () => {
  // Mantém rodando em segundo plano no Windows (na bandeja do sistema)
  if (isQuitting && process.platform !== 'darwin') {
    app.quit()
  }
})
