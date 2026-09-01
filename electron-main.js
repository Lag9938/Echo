import { app, BrowserWindow, session, ipcMain, desktopCapturer } from 'electron'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn } from 'node:child_process'
import net from 'node:net'

const isDevelopment = !app.isPackaged
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Hardware Acceleration & High-Performance Screen Capture for Games (Valorant, CS2, etc.)
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer,WindowsGraphicsCapture,VaapiVideoEncoder,VaapiVideoDecoder,CanvasOopRasterization')
app.commandLine.appendSwitch('disable-features', 'HardwareAcceleratedDirectScanout')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-accelerated-video-decode')
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode')
app.commandLine.appendSwitch('force_high_performance_gpu')

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

  // Handler para capturar telas e janelas do sistema operacional com WGC e alta definição
  ipcMain.handle('get-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 640, height: 360 },
        fetchWindowIcons: true
      })
      return sources.map(source => {
        const isScreen = source.id.startsWith('screen:')
        const thumb = source.thumbnail
        let appIcon = null
        try {
          if (source.appIcon && typeof source.appIcon.toDataURL === 'function') {
            appIcon = source.appIcon.toDataURL()
          }
        } catch (e) {}

        let name = source.name ? source.name.trim() : ''
        if (!name) {
          name = isScreen ? 'Monitor Principal' : 'Janela de Jogo / Aplicativo'
        }

        return {
          id: source.id,
          name: name,
          thumbnail: thumb && !thumb.isEmpty() ? thumb.toDataURL() : null,
          appIcon: appIcon,
          type: isScreen ? 'screen' : 'window'
        }
      })
    } catch (err) {
      console.warn('Erro ao obter fontes com ícones, tentando fallback:', err)
      try {
        const fallbackSources = await desktopCapturer.getSources({
          types: ['window', 'screen'],
          thumbnailSize: { width: 640, height: 360 },
          fetchWindowIcons: false
        })
        return fallbackSources.map(source => {
          const isScreen = source.id.startsWith('screen:')
          const thumb = source.thumbnail
          let name = source.name ? source.name.trim() : ''
          if (!name) {
            name = isScreen ? 'Monitor Principal' : 'Janela de Jogo / Aplicativo'
          }
          return {
            id: source.id,
            name: name,
            thumbnail: thumb && !thumb.isEmpty() ? thumb.toDataURL() : null,
            appIcon: null,
            type: isScreen ? 'screen' : 'window'
          }
        })
      } catch (fallbackErr) {
        console.error('Falha geral em get-sources:', fallbackErr)
        return []
      }
    }
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
