import { app, BrowserWindow, session, ipcMain, desktopCapturer } from 'electron'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn } from 'node:child_process'
import net from 'node:net'

const isDevelopment = !app.isPackaged
const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let audioHelperProcess = null
let audioTcpClient = null

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
  mainWindow = new BrowserWindow({ 
    width: 1280, 
    height: 760, 
    minWidth: 900, 
    minHeight: 600, 
    backgroundColor: '#f5f7f6', 
    autoHideMenuBar: true, 
    webPreferences: { 
      preload: path.join(__dirname, 'electron-preload.cjs'),
      contextIsolation: true, 
      nodeIntegration: false 
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

  // Handler para capturar telas e janelas do sistema operacional
  ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 150, height: 150 }
    })
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }))
  })

  // Handlers para gerenciar a captura de áudio exclusiva do jogo
  ipcMain.handle('start-process-audio-capture', async (event, sourceId) => {
    stopAudioCapture()

    const parts = sourceId.split(':')
    if (parts[0] !== 'window') {
      return { success: false, reason: 'Not a window source' }
    }

    const hwnd = parts[1]
    const port = 8090

    let helperPath
    if (isDevelopment) {
      helperPath = path.join(__dirname, 'src', 'native', 'AudioCaptureHelper', 'bin', 'AudioCaptureHelper.exe')
    } else {
      helperPath = path.join(process.resourcesPath, 'AudioCaptureHelper.exe')
    }

    console.log(`Spawning AudioCaptureHelper for HWND: ${hwnd} on port: ${port}`)

    try {
      audioHelperProcess = spawn(helperPath, ['--hwnd', hwnd, port.toString()])

      audioHelperProcess.stdout.on('data', (data) => {
        console.log(`[AudioHelper STDOUT]: ${data.toString().trim()}`)
      })

      audioHelperProcess.stderr.on('data', (data) => {
        console.error(`[AudioHelper STDERR]: ${data.toString().trim()}`)
      })

      audioHelperProcess.on('close', (code) => {
        console.log(`AudioCaptureHelper exited with code: ${code}`)
        stopAudioCapture()
      })

      // Aguarda o servidor TCP iniciar no helper C#
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Conecta ao socket TCP local
      audioTcpClient = net.createConnection({ port, host: '127.0.0.1' }, () => {
        console.log('Connected to AudioCaptureHelper TCP Server!')
      })

      audioTcpClient.on('data', (chunk) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Envia o chunk de áudio bruto (PCM) para o renderer
          mainWindow.webContents.send('screenshare-audio-chunk', chunk)
        }
      })

      audioTcpClient.on('error', (err) => {
        console.error('TCP client connection error:', err.message)
      })

      return { success: true }
    } catch (err) {
      console.error('Failed to start AudioCaptureHelper:', err)
      return { success: false, reason: err.message }
    }
  })

  ipcMain.handle('stop-process-audio-capture', async () => {
    stopAudioCapture()
    return { success: true }
  })

  // Handler para instalar atualização quando o usuário decidir
  ipcMain.on('install-update', () => {
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

  if (isDevelopment) mainWindow.loadURL('http://localhost:5173')
  else mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() }) })
app.on('will-quit', () => {
  stopAudioCapture()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
