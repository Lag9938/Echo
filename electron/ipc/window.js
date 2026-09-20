import { app, shell, desktopCapturer, Notification } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { POPULAR_GAMES } from './gameDetection.js'

const execFileAsync = promisify(execFile)

export function setupWindowIpc(safeHandle, getMainWindow, setIsQuitting, rootDir, isDevelopment) {
  safeHandle('window-minimize', () => {
    const mainWindow = getMainWindow()
    if (mainWindow) mainWindow.minimize()
  })
  safeHandle('window-maximize', () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  safeHandle('window-close', () => {
    const mainWindow = getMainWindow()
    if (mainWindow) mainWindow.close()
  })
  safeHandle('app-quit', () => {
    setIsQuitting(true)
    app.quit()
  })
  safeHandle('window-is-maximized', () => {
    const mainWindow = getMainWindow()
    return mainWindow ? mainWindow.isMaximized() : false
  })
  safeHandle('window-set-fullscreen', (_event, flag) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return false
    mainWindow.setFullScreen(Boolean(flag))
    return mainWindow.isFullScreen()
  })
  safeHandle('window-is-fullscreen', () => {
    const mainWindow = getMainWindow()
    return mainWindow ? mainWindow.isFullScreen() : false
  })

  safeHandle('shell:openExternal', async (_event, url) => {
    if (typeof url === 'string') {
      const trimmed = url.trim()
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:')) {
        try {
          await shell.openExternal(trimmed)
          return true
        } catch (err) {
          console.warn('[Shell] Falha ao abrir link externo no navegador:', err)
          return false
        }
      }
    }
    return false
  })

  safeHandle('get-sources', async () => {
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
      if (lower.includes('valorant-win64') || lower === 'valorant') {
        continue
      }

      const isGame = POPULAR_GAMES.some(g => g.match.some(m => lower.includes(m)))
      let cleanName = rawName

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

  safeHandle('restore-window', async (_event, sourceId) => {
    if (!sourceId || typeof sourceId !== 'string') return
    const parts = sourceId.split(':')
    if (parts[0] === 'window' && parts[1]) {
      try {
        const helperPath = isDevelopment
          ? path.join(rootDir, 'src', 'native', 'AudioCaptureHelper', 'bin', 'AudioCaptureHelper.exe')
          : path.join(process.resourcesPath, 'AudioCaptureHelper.exe')
        await execFileAsync(helperPath, ['--restore-window', parts[1]], { timeout: 1000 })
      } catch (e) {
        console.warn('Restore window failed:', e)
      }
    }
  })

  safeHandle('show-notification', (_event, { title, body, data } = {}) => {
    try {
      if (Notification.isSupported()) {
        const appIconPath = path.join(rootDir, 'assets', 'echo-icon.png')
        const notif = new Notification({
          title: title || 'Echo',
          body: body || '',
          icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
          silent: false
        })
        notif.on('click', () => {
          const mainWindow = getMainWindow()
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
            try { mainWindow.flashFrame(false) } catch (e) {}
            if (data) {
              mainWindow.webContents.send('notification-clicked', data)
            }
          }
        })
        notif.show()

        const mainWindow = getMainWindow()
        if (mainWindow && !mainWindow.isFocused()) {
          try { mainWindow.flashFrame(true) } catch (e) {}
        }

        return { success: true }
      }
      return { success: false, error: 'Notifications not supported' }
    } catch (err) {
      console.warn('[Echo Notification] Error showing native notification:', err)
      return { success: false, error: String(err) }
    }
  })

  safeHandle('flash-frame', (_event, flag = true) => {
    try {
      const mainWindow = getMainWindow()
      if (mainWindow && (!mainWindow.isDestroyed || !mainWindow.isDestroyed())) {
        if (typeof mainWindow.flashFrame === 'function') {
          mainWindow.flashFrame(Boolean(flag))
        }
        return { success: true }
      }
    } catch (e) {
      console.warn('[Window IPC] Error setting flashFrame:', e)
    }
    return { success: false }
  })

  safeHandle('set-badge-count', (_event, count = 0) => {
    try {
      const num = Math.max(0, Number(count) || 0)
      if (typeof app.setBadgeCount === 'function') {
        app.setBadgeCount(num)
      }
      return { success: true, count: num }
    } catch (e) {
      console.warn('[Window IPC] Error setting badge count:', e)
      return { success: false }
    }
  })

  safeHandle('asaas-get-checkout-url', () => {
    return {
      success: true,
      url: 'https://www.asaas.com/c/1gt86ha34vf8us16',
      cardUrl: 'https://www.asaas.com/c/1gt86ha34vf8us16',
      pixUrl: 'https://www.asaas.com/c/btwdghfsbzw95dhd',
      price: 9.90,
      planName: 'Echo Pro'
    }
  })

  safeHandle('asaas-create-pix-charge', async (_event, _params = {}) => {
    // A criação de cobranças Pix é processada exclusivamente no backend via Edge Function do Supabase (asaas-payment).
    return {
      success: false,
      error: 'Cobranças Pix são processadas de forma segura diretamente via Supabase Edge Functions.'
    }
  })

  safeHandle('asaas-check-payment-status', async (_event, _paymentId) => {
    // A conferência de pagamento é processada exclusivamente no backend via Edge Function do Supabase (asaas-payment).
    return {
      success: false,
      error: 'A verificação de pagamento é processada de forma segura diretamente via Supabase Edge Functions.'
    }
  })

  safeHandle('get-autostart-settings', () => {
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

  safeHandle('set-autostart-settings', (_event, { openAtLogin, openAsHidden }) => {
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
}
