// Protótipo: Electron recebendo os quadros do capturador próprio (texturas compartilhadas) e medindo o
// caminho inteiro: captura -> quadro no app -> codificação H.264 -> envio -> decodificação.
const { app, BrowserWindow, ipcMain, sharedTexture } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const readline = require('node:readline')

app.commandLine.appendSwitch('enable-features', 'ZeroCopyDesktopCapture,WebRtcAllowWgcUsingTexture,WindowsGraphicsCapture,MediaFoundationD3D11VideoCapture,PlatformHEVCDecoderSupport,CanvasOopRasterization,ZeroCopyVideoCapture')
for (const flag of ['enable-webrtc-hw-encoding', 'enable-gpu-rasterization', 'enable-zero-copy', 'ignore-gpu-blocklist',
  'enable-native-gpu-memory-buffers', 'force_high_performance_gpu', 'disable-renderer-backgrounding',
  'disable-background-timer-throttling', 'disable-backgrounding-occluded-windows']) app.commandLine.appendSwitch(flag)
app.setPath('userData', path.join(app.getPath('temp'), 'echo-native-capture-test'))

const out = (obj) => fs.appendFileSync(path.join(__dirname, 'results.txt'), JSON.stringify(obj) + require('node:os').EOL)

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 900, height: 600, title: 'EchoNativeCaptureTest',
    webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false }
  })
  await win.loadFile(path.join(__dirname, 'index.html'))

  const textures = new Map()
  const counters = { captured: 0, sent: 0, skippedBusy: 0, importErrors: 0, firstError: null }
  let busy = 0
  const helper = spawn(path.join(__dirname, 'capture.exe'), [String(process.pid), '60', '8', '1920', '1080', process.env.CAP_FORMAT || 'bgra'], { stdio: ['ignore', 'pipe', 'ignore'] })
  readline.createInterface({ input: helper.stdout }).on('line', (line) => {
    const p = line.trim().split(' ')
    if (p[0] === 'T') {
      const handle = Buffer.alloc(8)
      handle.writeBigUInt64LE(BigInt(p[2]))
      textures.set(p[1], { handle, width: Number(p[3]), height: Number(p[4]) })
    } else if (p[0] === 'F') {
      counters.captured++
      const tex = textures.get(p[1])
      if (!tex) return
      // No máximo 2 quadros a caminho do app: se o app não acompanhar, o quadro é descartado aqui
      if (busy >= 2) { counters.skippedBusy++; return }
      busy++
      try {
        const imported = sharedTexture.importSharedTexture({
          textureInfo: { pixelFormat: process.env.CAP_FORMAT || 'bgra', codedSize: { width: tex.width, height: tex.height }, handle: { ntHandle: tex.handle } }
        })
        sharedTexture.sendSharedTexture({ frame: win.webContents.mainFrame, importedSharedTexture: imported }, Number(p[2]))
          .then(() => { counters.sent++ })
          .catch((err) => { counters.importErrors++; counters.firstError = counters.firstError || String(err && err.message || err) })
          .finally(() => { busy--; imported.release() })
      } catch (err) {
        busy--
        counters.importErrors++
        counters.firstError = counters.firstError || String(err && err.message || err)
      }
    } else if (p[0] === 'E') {
      counters.firstError = counters.firstError || line
    }
  })

  ipcMain.handle('counters', () => ({ ...counters }))
  ipcMain.on('result', (_e, result) => { out({ ...result, main: counters }); helper.kill(); app.quit() })
  setTimeout(() => { out({ timeout: true, main: counters }); helper.kill(); app.quit() }, 60000)
})
