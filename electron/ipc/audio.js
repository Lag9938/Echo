import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'

let audioHelperProcess = null
let audioTcpClient = null

export function getAudioHelperProcess() {
  return audioHelperProcess
}

export function stopAudioCapture() {
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

export function setupAudioIpc(safeHandle, getMainWindow, rootDir, isDevelopment) {
  safeHandle('start-process-audio-capture', async (_event, sourceId) => {
    stopAudioCapture()
    if (!sourceId || typeof sourceId !== 'string') {
      return { success: false, reason: 'Invalid sourceId' }
    }

    const port = 8092
    let helperArgs = []

    if (sourceId.startsWith('window:')) {
      const parts = sourceId.split(':')
      const hwnd = parts[1]
      if (!hwnd) {
        return { success: false, reason: 'Invalid HWND' }
      }
      helperArgs = ['--hwnd', hwnd, port.toString()]
    } else if (sourceId.startsWith('screen:') || sourceId === 'screen') {
      helperArgs = ['--exclude-pid', process.pid.toString(), port.toString()]
    } else {
      return { success: false, reason: 'Unsupported source type' }
    }

    try {
      const helperPath = isDevelopment
        ? path.join(rootDir, 'src', 'native', 'AudioCaptureHelper', 'bin', 'AudioCaptureHelper.exe')
        : path.join(process.resourcesPath, 'AudioCaptureHelper.exe')

      audioHelperProcess = spawn(helperPath, helperArgs, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      audioHelperProcess.on('error', (err) => {
        console.warn('[AudioCaptureHelper] Process error:', err)
        stopAudioCapture()
      })

      audioHelperProcess.on('exit', (code) => {
        console.log(`[AudioCaptureHelper] Process exited with code ${code}`)
        stopAudioCapture()
      })

      await new Promise((resolve) => setTimeout(resolve, 350))

      if (!audioHelperProcess || audioHelperProcess.killed) {
        return { success: false, reason: 'Helper process failed to start' }
      }

      return new Promise((resolve) => {
        let isConnected = false
        const client = net.createConnection({ port, host: '127.0.0.1' }, () => {
          isConnected = true
          client.setNoDelay(true)
          audioTcpClient = client
          console.log('[AudioCaptureHelper] Connected to TCP audio stream successfully!')
          resolve({ success: true })
        })

        client.on('data', (chunk) => {
          const mainWindow = getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('screenshare-audio-chunk', chunk)
          }
        })

        client.on('error', (err) => {
          console.warn('[AudioCaptureHelper] TCP socket error:', err)
          if (!isConnected) {
            stopAudioCapture()
            resolve({ success: false, reason: err.message })
          }
        })

        client.on('close', () => {
          console.log('[AudioCaptureHelper] TCP socket closed.')
          stopAudioCapture()
        })

        setTimeout(() => {
          if (!isConnected) {
            console.warn('[AudioCaptureHelper] Connection timeout.')
            stopAudioCapture()
            resolve({ success: false, reason: 'Connection timeout' })
          }
        }, 1500)
      })
    } catch (err) {
      console.warn('[AudioCaptureHelper] Failed to start process audio capture:', err)
      stopAudioCapture()
      return { success: false, error: err.message }
    }
  })

  safeHandle('stop-process-audio-capture', async () => {
    stopAudioCapture()
    return { success: true }
  })
}
