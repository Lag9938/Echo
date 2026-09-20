import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { ipcMain } from 'electron'

export function setupUpdatesIpc(safeHandle, isDevelopment, onInstallUpdate, getMainWindow) {
  ipcMain.on('install-update', () => {
    onInstallUpdate()
    autoUpdater.quitAndInstall(false, true)
  })

  safeHandle('check-for-updates', async () => {
    if (!isDevelopment) {
      try {
        const result = await autoUpdater.checkForUpdates()
        return { success: true, updateInfo: result?.updateInfo }
      } catch (err) {
        return { success: false, error: err.message }
      }
    }
    return { success: false, message: 'Em modo de desenvolvimento' }
  })

  if (!isDevelopment) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowDowngrade = true

    autoUpdater.on('update-available', (info) => {
      console.log('Atualização disponível:', info.version)
      const mainWindow = getMainWindow()
      mainWindow?.webContents.send('update-available', {
        version: info.version
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      const mainWindow = getMainWindow()
      mainWindow?.webContents.send('update-progress', {
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Atualização baixada:', info.version)
      const mainWindow = getMainWindow()
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

    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 10 * 60 * 1000)
  }
}
