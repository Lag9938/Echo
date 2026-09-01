import { app, BrowserWindow, session, ipcMain, desktopCapturer } from 'electron'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import net from 'node:net'

const execFileAsync = promisify(execFile)

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
    let nativeWindows = []
    try {
      const helperPath = isDevelopment
        ? path.join(__dirname, 'src', 'native', 'AudioCaptureHelper', 'bin', 'AudioCaptureHelper.exe')
        : path.join(process.resourcesPath, 'AudioCaptureHelper.exe')
      
      const { stdout } = await execFileAsync(helperPath, ['--list-windows'], { timeout: 3000 })
      if (stdout && stdout.trim().startsWith('[')) {
        nativeWindows = JSON.parse(stdout.trim())
      }
    } catch (e) {
      console.warn('Native window lister failed:', e)
    }

    // Direct PowerShell fallback for gaming windows if helper did not find games
    if (!nativeWindows.some(w => w.name && w.name.toLowerCase().includes('valorant'))) {
      try {
        const psCommand = `Get-Process | Where-Object { $_.ProcessName -like "*VALORANT*" } | ForEach-Object { "$($_.MainWindowHandle)|$($_.ProcessName)" }`
        const { stdout: psOut } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', psCommand], { timeout: 2000 })
        if (psOut) {
          psOut.split(/\r?\n/).forEach(line => {
            const parts = line.trim().split('|')
            if (parts.length >= 2 && parts[0] && parts[0] !== '0') {
              nativeWindows.unshift({
                id: `window:${parts[0]}:0`,
                name: 'VALORANT (Jogo)',
                processName: parts[1],
                type: 'window',
                isGame: true
              })
            }
          })
        }
      } catch (psErr) {
        console.warn('PowerShell window fallback error:', psErr)
      }
    }

    let sources = []
    try {
      sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 480, height: 270 },
        fetchWindowIcons: false
      })
    } catch (err) {
      console.warn('desktopCapturer.getSources error:', err)
    }

    const resultMap = new Map()

    // 1. Process screens first
    sources.filter(s => s.id.startsWith('screen:')).forEach(source => {
      const thumb = source.thumbnail
      resultMap.set(source.id, {
        id: source.id,
        name: source.name || 'Monitor Principal',
        thumbnail: thumb && !thumb.isEmpty() ? thumb.toDataURL() : null,
        appIcon: null,
        type: 'screen'
      })
    })

    // 2. Add native windows (games like Valorant, etc.)
    nativeWindows.forEach(win => {
      resultMap.set(win.id, {
        id: win.id,
        name: win.name,
        thumbnail: null,
        appIcon: null,
        type: 'window',
        isGame: win.name.includes('(Jogo)') || win.name.toLowerCase().includes('valorant')
      })
    })

    // 3. Add desktopCapturer windows and merge thumbnails
    sources.filter(s => s.id.startsWith('window:')).forEach(source => {
      const thumb = source.thumbnail
      const existing = resultMap.get(source.id)
      let name = (existing ? existing.name : source.name) || 'Janela'
      name = name.trim()
      resultMap.set(source.id, {
        id: source.id,
        name: name,
        thumbnail: thumb && !thumb.isEmpty() ? thumb.toDataURL() : (existing ? existing.thumbnail : null),
        appIcon: null,
        type: 'window',
        isGame: (existing && existing.isGame) || name.toLowerCase().includes('valorant') || name.toLowerCase().includes('jogo')
      })
    })

    const finalResults = Array.from(resultMap.values())
    // Sort: Screens first, then Games, then Windows alphabetically
    finalResults.sort((a, b) => {
      if (a.type === 'screen' && b.type !== 'screen') return -1
      if (b.type === 'screen' && a.type !== 'screen') return 1
      if (a.isGame && !b.isGame) return -1
      if (!a.isGame && b.isGame) return 1
      return a.name.localeCompare(b.name)
    })

    return finalResults
  })

  // Handler para desminimizar / restaurar janela antes de iniciar a captura
  ipcMain.handle('restore-window', async (_event, sourceId) => {
    if (!sourceId || typeof sourceId !== 'string') return
    const parts = sourceId.split(':')
    if (parts[0] === 'window' && parts[1]) {
      try {
        const helperPath = isDevelopment
          ? path.join(__dirname, 'src', 'native', 'AudioCaptureHelper', 'bin', 'AudioCaptureHelper.exe')
          : path.join(process.resourcesPath, 'AudioCaptureHelper.exe')
        await execFileAsync(helperPath, ['--restore-window', parts[1]], { timeout: 1000 })
      } catch (e) {
        console.warn('Restore window failed:', e)
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
