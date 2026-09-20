import { BrowserWindow, shell } from 'electron'
import path from 'node:path'

let overlayWindow = null

export function getOverlayWindow() {
  return overlayWindow
}

export function toggleOverlayWindow(rootDir, isDevelopment) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (overlayWindow.isVisible()) {
      overlayWindow.hide()
      return false
    } else {
      overlayWindow.show()
      return true
    }
  }

  const appIconPath = path.join(rootDir, 'assets', 'echo-icon.png')
  overlayWindow = new BrowserWindow({
    icon: appIconPath,
    x: 24,
    y: 24,
    width: 230,
    height: 320,
    minWidth: 180,
    minHeight: 120,
    maxWidth: 480,
    maxHeight: 750,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: true,
    webPreferences: {
      preload: path.join(rootDir, 'electron-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  overlayWindow.setMenu(null)
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  overlayWindow.setVisibleOnAllWorkspaces?.(true)

  overlayWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url).catch((err) => console.warn('[Shell] Falha ao abrir URL externa no overlay:', err))
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  if (isDevelopment) {
    overlayWindow.loadURL('http://localhost:5173/?mode=overlay').catch(() => {})
  } else {
    overlayWindow.loadFile(path.join(rootDir, 'dist', 'index.html'), { query: { mode: 'overlay' } }).catch(() => {
      overlayWindow.loadFile('dist/index.html', { query: { mode: 'overlay' } }).catch(() => {})
    })
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  return true
}

export function setupOverlayIpc(safeHandle, rootDir, isDevelopment) {
  safeHandle('toggle-overlay', () => {
    return toggleOverlayWindow(rootDir, isDevelopment)
  })

  safeHandle('open-overlay', () => {
    if (!overlayWindow || overlayWindow.isDestroyed() || !overlayWindow.isVisible()) {
      return toggleOverlayWindow(rootDir, isDevelopment)
    }
    return true
  })

  safeHandle('close-overlay', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close()
      overlayWindow = null
    }
    return true
  })

  safeHandle('is-overlay-open', () => {
    return Boolean(overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible())
  })
}
