import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { app, ipcMain } from 'electron'
import path from 'node:path'
import { appendUpdateLog, startRelaunchWatchdog } from '../services/updateRelaunch.js'

export function setupUpdatesIpc(safeHandle, isDevelopment, onInstallUpdate, getMainWindow) {
  const logFile = () => path.join(app.getPath('userData'), 'update.log')

  ipcMain.on('install-update', () => {
    appendUpdateLog(logFile(), `instalando atualização (versão atual ${app.getVersion()})`)
    // O instalador deveria reabrir o Echo sozinho. Este vigia garante isso: se depois da instalação o
    // app não estiver aberto, ele é iniciado (e se a instalação falhar, volta a versão que já estava instalada).
    if (!isDevelopment) {
      startRelaunchWatchdog({
        execPath: process.execPath,
        updaterDirName: `${app.getName().toLowerCase()}-updater`,
        logFile: logFile()
      })
    }
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
      appendUpdateLog(logFile(), `atualização ${info.version} baixada`)
      const mainWindow = getMainWindow()
      mainWindow?.webContents.send('update-ready', {
        version: info.version
      })
    })

    autoUpdater.on('error', (err) => {
      console.error('Erro no auto-updater:', err.message)
      appendUpdateLog(logFile(), `erro no atualizador: ${err.message}`)
    })

    autoUpdater.checkForUpdates().catch(err => {
      console.error('Erro ao verificar atualizações:', err)
    })

    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 10 * 60 * 1000)
  }
}
