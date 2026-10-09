// Protótipo: o vídeo do capturador + codificador nativo passando por um servidor LiveKit de verdade
// (o livekit-server local de desenvolvimento, porta 7880, chaves "devkey"/"secret").
// Um participante publica (faixa de fachada + troca de quadro); outro, na mesma página, assiste e mede.
const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

app.commandLine.appendSwitch('enable-features', 'ZeroCopyDesktopCapture,WebRtcAllowWgcUsingTexture,WindowsGraphicsCapture,MediaFoundationD3D11VideoCapture,PlatformHEVCDecoderSupport,CanvasOopRasterization,ZeroCopyVideoCapture')
for (const flag of ['enable-webrtc-hw-encoding', 'enable-zero-copy', 'enable-native-gpu-memory-buffers', 'enable-gpu-rasterization', 'ignore-gpu-blocklist', 'force_high_performance_gpu', 'disable-renderer-backgrounding',
  'disable-background-timer-throttling', 'disable-backgrounding-occluded-windows', 'enable-webrtc-hw-decoding']) app.commandLine.appendSwitch(flag)
app.setPath('userData', path.join(app.getPath('temp'), 'echo-native-livekit-test'))

const out = (obj) => fs.appendFileSync(path.join(__dirname, 'results.txt'), JSON.stringify(obj) + require('node:os').EOL)

app.whenReady().then(async () => {
  const { AccessToken } = await import('livekit-server-sdk')
  const room = `echo-native-test-${Date.now()}`
  const token = async (identity) => {
    const t = new AccessToken('devkey', 'secret', { identity, ttl: 600 })
    t.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true })
    return t.toJwt()
  }
  const tokens = { publisher: await token('transmissor'), viewer: await token('espectador') }

  const win = new BrowserWindow({ width: 900, height: 600, title: 'EchoNativeLiveKitTest', webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } })
  ipcMain.handle('config', () => ({ url: 'ws://127.0.0.1:7890', tokens, stopExtensions: process.env.STOP_EXTENSIONS !== '0' }))

  let helper = null
  const helperLog = []
  const counters = { packets: 0, keys: 0, desync: 0, keyRequests: 0, bitrateChanges: 0 }
  ipcMain.on('start-capture', () => {
    helper = spawn(path.join(__dirname, '..', 'encoder', 'encode.exe'), [String(process.pid), '60', '1920', '1080', '1000000'], { stdio: ['pipe', 'pipe', 'pipe'] })
    helper.stderr.on('data', (d) => { helperLog.push(String(d).trim()); if (helperLog.length > 40) helperLog.shift() })
    let pending = Buffer.alloc(0)
    helper.stdout.on('data', (chunk) => {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk
      while (pending.length >= 16) {
        if (pending[0] !== 0x45 || pending[1] !== 0x56) { counters.desync++; pending = Buffer.alloc(0); return }
        const length = pending.readUInt32LE(12)
        if (pending.length < 16 + length) return
        const key = (pending[2] & 1) === 1
        counters.packets++; if (key) counters.keys++
        if (!win.isDestroyed()) win.webContents.send('au', { key, data: new Uint8Array(pending.subarray(16, 16 + length)) })
        pending = pending.subarray(16 + length)
      }
    })
  })
  ipcMain.on('need-key', () => { counters.keyRequests++; try { helper && helper.stdin.write('K\n') } catch { /* encerrando */ } })
  ipcMain.on('bitrate', (_e, bps) => { counters.bitrateChanges++; try { helper && helper.stdin.write(`B ${Math.round(bps)}\n`) } catch { /* encerrando */ } })
  const finish = (result) => { out({ ...result, main: counters, helper: helperLog.slice(-2) }); try { helper && helper.stdin.end() } catch { /* já fechou */ } if (helper) helper.kill(); app.quit() }
  ipcMain.on('result', (_e, result) => finish(result))
  if (process.env.LK_DEBUG) {
    win.webContents.on('console-message', (event) => {
      try { fs.appendFileSync(path.join(__dirname, 'console.txt'), String(event.message).slice(0, 400) + require('node:os').EOL) } catch (err) { void err }
    })
  }
  win.webContents.on('render-process-gone', (_e, details) => finish({ rendererGone: details.reason }))
  ipcMain.handle('sources', async () => (await require('electron').desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } })).map((s) => ({ id: s.id, name: s.name })))
  await win.loadFile(path.join(__dirname, process.env.PAGE || 'index.html'))
  setTimeout(() => finish({ timeout: true }), 70000)
})
