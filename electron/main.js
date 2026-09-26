import { app, BrowserWindow, Menu, shell, globalShortcut } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

import { safeHandle } from './utils/safeHandle.js'
import { setupDeeplink, setupDeeplinkIpc, setPendingInviteUrl } from './services/deeplink.js'
import { createTray, getTray, getHasShownTrayBalloon, setHasShownTrayBalloon } from './services/tray.js'
import { setupOverlayIpc } from './services/overlay.js'
import { setupShortcutsIpc } from './services/shortcuts.js'
import { scanRunningGames, setupGameDetectionIpc, getActiveGame, getActiveGameStartTime, setGameScanInterval, getGameScanInterval } from './ipc/gameDetection.js'
import { setupLivekitIpc, ensureLocalLivekitServer, getLivekitProcess } from './ipc/livekit.js'
import { setupUpdatesIpc } from './ipc/updates.js'
import { setupAudioIpc, stopAudioCapture } from './ipc/audio.js'
import { setupWindowIpc } from './ipc/window.js'

process.on('uncaughtException', (err) => console.error('[Echo Main] Uncaught Exception:', err))
process.on('unhandledRejection', (reason) => console.warn('[Echo Main] Unhandled Rejection:', reason))

const isDevelopment = !app.isPackaged
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

if (process.platform === 'win32') {
  app.setAppUserModelId('com.echo.desktop')
}

if (isDevelopment) {
  try {
    app.setPath('userData', path.join(app.getPath('appData'), 'Echo-Dev'))
  } catch (e) {
    console.warn('Unable to set dev userData path:', e)
  }
}

// Flags de aceleração por hardware e captura otimizada
app.commandLine.appendSwitch('enable-features', 'WindowsGraphicsCapture,MediaFoundationD3D11VideoCapture,PlatformHEVCDecoderSupport,CanvasOopRasterization,ZeroCopyVideoCapture')
app.commandLine.appendSwitch('enable-webrtc-hw-encoding')
app.commandLine.appendSwitch('enable-webrtc-hw-decoding')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-accelerated-video-decode')
app.commandLine.appendSwitch('enable-accelerated-video-encode')
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode')
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers')
app.commandLine.appendSwitch('force_high_performance_gpu')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

let mainWindow = null
let isQuitting = false

export function getMainWindow() { return mainWindow }
export function setIsQuitting(val) { isQuitting = val }

export function createWindow() {
  createTray(rootDir, getMainWindow, setIsQuitting)

  const shouldStartHidden = process.argv.includes('--hidden') || process.argv.includes('--minimized')
  const appIconPath = path.join(rootDir, 'assets', 'echo-icon.png')

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
      preload: path.join(rootDir, 'electron-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })
  mainWindow.removeMenu()
  mainWindow.setMenu(null)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('/Echo/invite') || url.startsWith('echo://invite') || (url.includes('/invite') && (url.includes('code=') || url.includes('space=')))) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deep-link-invite', url)
      }
      return { action: 'deny' }
    }
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url).catch((err) => console.warn('[Shell] Falha ao abrir URL externa no navegador:', err))
    }
    return { action: 'deny' }
  })

  mainWindow.on('focus', () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.flashFrame(false)
      }
    } catch (e) {}
  })

  mainWindow.on('minimize', () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.session.clearCache().catch(() => {})
      }
    } catch (e) {}
  })

  mainWindow.on('close', (event) => {
    if (isDevelopment) {
      isQuitting = true
      app.quit()
      return
    }
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.session.clearCache().catch(() => {})
        }
      } catch (e) {}
      const tray = getTray()
      if (tray && !getHasShownTrayBalloon()) {
        setHasShownTrayBalloon(true)
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

  mainWindow.webContents.on('did-finish-load', () => {
    const activeGame = getActiveGame()
    if (activeGame) {
      mainWindow.webContents.send('game-detected', {
        name: activeGame.name,
        icon: activeGame.icon,
        startedAt: getActiveGameStartTime()
      })
    }
    setTimeout(() => scanRunningGames(getMainWindow, rootDir), 600)
  })

  mainWindow.on('enter-html-full-screen', () => {
    if (mainWindow && !mainWindow.isFullScreen()) mainWindow.setFullScreen(true)
  })
  mainWindow.on('leave-html-full-screen', () => {
    if (mainWindow && mainWindow.isFullScreen()) mainWindow.setFullScreen(false)
  })

  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(['media', 'microphone', 'audioCapture', 'display-capture'].includes(permission))
  })
  mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    return ['media', 'microphone', 'audioCapture', 'display-capture'].includes(permission)
  })

  // Registro de todos os módulos de IPC
  setupWindowIpc(safeHandle, getMainWindow, setIsQuitting, rootDir, isDevelopment)
  setupAudioIpc(safeHandle, getMainWindow, rootDir, isDevelopment)
  setupOverlayIpc(safeHandle, rootDir, isDevelopment)
  setupShortcutsIpc(safeHandle, getMainWindow)
  setupGameDetectionIpc(safeHandle, getMainWindow, rootDir)
  setupLivekitIpc(safeHandle)
  setupDeeplinkIpc(safeHandle)

  const onInstallUpdate = () => {
    isQuitting = true
    const interval = getGameScanInterval()
    if (interval) clearInterval(interval)
    const tray = getTray()
    if (tray) {
      try { tray.destroy() } catch (e) {}
    }
    stopAudioCapture()
    const livekitProc = getLivekitProcess()
    if (livekitProc) {
      try { livekitProc.kill() } catch (e) {}
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.destroy() } catch (e) {}
    }
  }
  setupUpdatesIpc(safeHandle, isDevelopment, onInstallUpdate, getMainWindow)

  let interval = getGameScanInterval()
  if (interval) clearInterval(interval)
  setGameScanInterval(setInterval(() => scanRunningGames(getMainWindow, rootDir), 5000))
  setTimeout(() => scanRunningGames(getMainWindow, rootDir), 1500)

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
    mainWindow.loadFile(path.join(rootDir, 'dist', 'index.html')).catch(() => {
      mainWindow.loadFile('dist/index.html')
    })
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Falha ao carregar conteúdo da janela:', errorCode, errorDescription, validatedURL)
    if (mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        mainWindow.loadFile(path.join(rootDir, 'dist', 'index.html')).catch(() => {})
      }, 1000)
    }
  })

  if (!shouldStartHidden) {
    mainWindow.show()
  }
}

if (setupDeeplink(getMainWindow, createWindow)) {
  app.whenReady().then(() => {
    // Servidor LiveKit self-hosted usa um domínio sslip.io com certificado que
    // o Chromium não valida por padrão, então aceitamos o erro de certificado
    // apenas para esse host exato. A versão anterior usava url.includes(...),
    // que casava qualquer URL contendo a substring 'sslip.io' — como sslip.io
    // é um serviço de DNS público (qualquer-ip.sslip.io resolve para esse IP),
    // isso aceitava certificados inválidos de QUALQUER host malicioso que
    // usasse um subdomínio sslip.io, não só o nosso servidor.
    const TRUSTED_SELF_SIGNED_HOSTS = new Set(['137-131-144-255.sslip.io', 'localhost', '127.0.0.1'])
    app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
      let hostname = ''
      try {
        hostname = new URL(url).hostname
      } catch {
        callback(false)
        return
      }
      if (TRUSTED_SELF_SIGNED_HOSTS.has(hostname)) {
        event.preventDefault()
        callback(true)
      } else {
        callback(false)
      }
    })

    app.on('web-contents-created', (_event, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
          setImmediate(() => {
            shell.openExternal(url).catch((err) => console.warn('[Shell] Falha ao abrir URL externa:', err))
          })
        }
        return { action: 'deny' }
      })

      contents.on('will-navigate', (event, url) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
          try {
            const parsed = new URL(url)
            if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) {
              event.preventDefault()
              shell.openExternal(url).catch((err) => console.warn('[Shell] Falha ao abrir URL externa:', err))
            }
          } catch {
            event.preventDefault()
            shell.openExternal(url).catch(() => {})
          }
        }
      })
    })

    Menu.setApplicationMenu(null)
    ensureLocalLivekitServer(rootDir)
    createWindow()

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

    app.on('open-url', (event, url) => {
      event.preventDefault()
      setPendingInviteUrl(url)
      const mainWindow = getMainWindow()
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('deep-link-invite', url)
        }
      }
    })
  })

  app.on('before-quit', () => {
    isQuitting = true
  })

  app.on('will-quit', () => {
    const tray = getTray()
    if (tray) {
      try { tray.destroy() } catch (e) {}
    }
    const interval = getGameScanInterval()
    if (interval) clearInterval(interval)
    globalShortcut.unregisterAll()
    stopAudioCapture()
    const livekitProcess = getLivekitProcess()
    if (livekitProcess) {
      try { livekitProcess.kill() } catch (e) {}
    }
  })

  app.on('window-all-closed', () => {
    if (isQuitting && process.platform !== 'darwin') {
      app.quit()
    }
  })
}
