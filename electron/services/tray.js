import { app, Tray, Menu, nativeImage } from 'electron'
import path from 'node:path'

let tray = null
let hasShownTrayBalloon = false

export function getTray() {
  return tray
}

export function setHasShownTrayBalloon(val) {
  hasShownTrayBalloon = val
}

export function getHasShownTrayBalloon() {
  return hasShownTrayBalloon
}

export function createTray(rootDir, getMainWindow, setIsQuitting) {
  if (tray) return
  try {
    const trayIconPath = path.join(rootDir, 'assets', 'echo-tray.png')
    let trayIcon = nativeImage.createFromPath(trayIconPath)
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createFromPath(path.join(rootDir, 'assets', 'echo-icon.png'))
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
          const mainWindow = getMainWindow()
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
          setIsQuitting(true)
          app.quit()
        }
      }
    ])

    tray.setContextMenu(contextMenu)

    tray.on('double-click', () => {
      const mainWindow = getMainWindow()
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
    })

    tray.on('click', () => {
      const mainWindow = getMainWindow()
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
