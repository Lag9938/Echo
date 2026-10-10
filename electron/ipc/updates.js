import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { app, ipcMain } from 'electron'
import path from 'node:path'
import { appendUpdateLog, startRelaunchWatchdog } from '../services/updateRelaunch.js'
import { isVersionBlocked, keepInstallerCopy, recordPendingUpdate } from '../services/rollback.js'

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
        logFile: logFile(),
        scriptFile: path.join(app.getPath('userData'), 'update-relaunch.ps1')
      })
    }
    onInstallUpdate()
    // Instalação silenciosa (/S) com --force-run: sem janela do instalador, nenhum aviso pode ficar esperando
    // um clique escondido atrás de outras janelas, e o instalador reabre o Echo ao terminar
    autoUpdater.quitAndInstall(true, true)
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
    const dataDir = app.getPath('userData')
    // O download é pedido aqui, e não automático, para dar tempo de recusar uma versão que já foi desfeita
    // neste computador (services/rollback.js): senão ela seria baixada e instalada de novo ao fechar o app.
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowDowngrade = true

    autoUpdater.on('update-available', (info) => {
      if (isVersionBlocked(dataDir, info.version)) {
        appendUpdateLog(logFile(), `atualização ${info.version} ignorada: foi desfeita neste computador`)
        return
      }
      console.log('Atualização disponível:', info.version)
      const mainWindow = getMainWindow()
      mainWindow?.webContents.send('update-available', {
        version: info.version
      })
      autoUpdater.downloadUpdate().catch((err) => {
        appendUpdateLog(logFile(), `erro ao baixar a atualização ${info.version}: ${err?.message || err}`)
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
      // Anota como voltar para a versão atual se a nova não abrir, e guarda o instalador da nova para a
      // atualização seguinte poder voltar para ela sem depender da internet
      const current = app.getVersion()
      if (recordPendingUpdate(dataDir, { fromVersion: current, toVersion: info.version })) {
        appendUpdateLog(logFile(), `volta automática preparada: ${info.version} -> ${current} se a nova não abrir`)
      }
      if (info.downloadedFile) {
        keepInstallerCopy(dataDir, { version: info.version, downloadedFile: info.downloadedFile, currentVersion: current })
          .catch(() => {})
      }
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
