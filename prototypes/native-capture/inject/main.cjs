// Prova de conceito da "troca de quadro": ver inject/index.html
const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

app.commandLine.appendSwitch('enable-features', 'ZeroCopyDesktopCapture,WebRtcAllowWgcUsingTexture,WindowsGraphicsCapture,MediaFoundationD3D11VideoCapture,PlatformHEVCDecoderSupport,CanvasOopRasterization,ZeroCopyVideoCapture')
for (const flag of ['enable-webrtc-hw-encoding', 'enable-gpu-rasterization', 'enable-zero-copy', 'ignore-gpu-blocklist',
  'enable-native-gpu-memory-buffers', 'force_high_performance_gpu', 'disable-renderer-backgrounding',
  'disable-background-timer-throttling', 'disable-backgrounding-occluded-windows']) app.commandLine.appendSwitch(flag)
app.setPath('userData', path.join(app.getPath('temp'), 'echo-inject-test'))

const out = (obj) => fs.appendFileSync(path.join(__dirname, 'results.txt'), JSON.stringify(obj) + require('node:os').EOL)

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 900, height: 600, title: 'EchoInjectTest', webPreferences: { nodeIntegration: true, nodeIntegrationInWorker: false, contextIsolation: false, backgroundThrottling: false } })
  ipcMain.handle('sources', async () => (await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } })).map((s) => ({ id: s.id, name: s.name })))
  ipcMain.on('result', (_e, result) => { out(result); app.quit() })
  win.webContents.on('render-process-gone', (_e, details) => { out({ rendererGone: details.reason }); app.quit() })
  await win.loadFile(path.join(__dirname, 'index.html'))
  setTimeout(() => { out({ timeout: true }); app.quit() }, 50000)
})
