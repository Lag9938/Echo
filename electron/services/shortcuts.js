import { globalShortcut } from 'electron'

const registeredShortcuts = new Map()

export function setupShortcutsIpc(safeHandle, getMainWindow) {
  safeHandle('register-global-ptt', (_event, shortcutKey) => {
    try {
      if (registeredShortcuts.has('ptt')) {
        globalShortcut.unregister(registeredShortcuts.get('ptt'))
        registeredShortcuts.delete('ptt')
      }
      if (!shortcutKey) return { success: true }

      const registered = globalShortcut.register(shortcutKey, () => {
        const mainWindow = getMainWindow()
        mainWindow?.webContents.send('ptt-state', true)
        setTimeout(() => {
          mainWindow?.webContents.send('ptt-state', false)
        }, 350)
      })
      if (registered) registeredShortcuts.set('ptt', shortcutKey)
      return { success: registered }
    } catch (e) {
      console.warn('Global PTT shortcut error:', e)
      return { success: false, error: e.message }
    }
  })

  safeHandle('unregister-global-ptt', () => {
    if (registeredShortcuts.has('ptt')) {
      globalShortcut.unregister(registeredShortcuts.get('ptt'))
      registeredShortcuts.delete('ptt')
    }
    return { success: true }
  })

  safeHandle('register-global-voice-shortcut', (_event, { action, shortcutKey }) => {
    try {
      if (registeredShortcuts.has(action)) {
        globalShortcut.unregister(registeredShortcuts.get(action))
        registeredShortcuts.delete(action)
      }
      if (!shortcutKey || shortcutKey === 'none') return { success: true }

      const registered = globalShortcut.register(shortcutKey, () => {
        const mainWindow = getMainWindow()
        mainWindow?.webContents.send('global-voice-toggle', action)
      })
      if (registered) registeredShortcuts.set(action, shortcutKey)
      return { success: registered }
    } catch (e) {
      console.warn(`Global shortcut error for ${action}:`, e)
      return { success: false, error: e.message }
    }
  })

  safeHandle('unregister-global-voice-shortcut', (_event, action) => {
    if (registeredShortcuts.has(action)) {
      globalShortcut.unregister(registeredShortcuts.get(action))
      registeredShortcuts.delete(action)
    }
    return { success: true }
  })
}
