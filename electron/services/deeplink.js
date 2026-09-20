import { app } from 'electron'
import path from 'node:path'

let pendingInviteUrl = process.argv.find(arg => typeof arg === 'string' && (arg.startsWith('echo://') || arg.includes('/Echo/invite') || (arg.includes('/invite') && arg.includes('space=')))) || null

export function getPendingInviteUrl() {
  return pendingInviteUrl
}

export function setPendingInviteUrl(url) {
  pendingInviteUrl = url
}

export function setupDeeplink(getMainWindow, createWindow) {
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    app.quit()
    return false
  }

  app.on('second-instance', (_event, commandLine) => {
    const inviteArg = commandLine.find(arg => typeof arg === 'string' && (arg.startsWith('echo://') || arg.includes('/Echo/invite') || (arg.includes('/invite') && arg.includes('space='))))
    if (inviteArg) {
      pendingInviteUrl = inviteArg
    }
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      if (inviteArg) {
        mainWindow.webContents.send('deep-link-invite', inviteArg)
      }
    } else {
      createWindow()
    }
  })

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('echo', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('echo')
  }
  return true
}

export function setupDeeplinkIpc(safeHandle) {
  safeHandle('get-initial-invite-url', () => {
    const url = getPendingInviteUrl()
    setPendingInviteUrl(null)
    return url
  })
}
