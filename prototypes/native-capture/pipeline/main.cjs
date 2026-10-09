// Protótipo completo: capturador + codificador nativo (encoder/encode.exe) -> app -> troca de quadro na conexão
// WebRTC (inject/worker.js) -> receptor. Mede o caminho inteiro em conexão local.
const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

for (const flag of ['enable-gpu-rasterization', 'ignore-gpu-blocklist', 'force_high_performance_gpu', 'disable-renderer-backgrounding',
  'disable-background-timer-throttling', 'disable-backgrounding-occluded-windows']) app.commandLine.appendSwitch(flag)
app.setPath('userData', path.join(app.getPath('temp'), 'echo-native-pipeline-test'))

const out = (obj) => fs.appendFileSync(path.join(__dirname, 'results.txt'), JSON.stringify(obj) + require('node:os').EOL)

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 900, height: 600, title: 'EchoNativePipelineTest', webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } })
  await win.loadFile(path.join(__dirname, 'index.html'))

  const helper = spawn(path.join(__dirname, '..', 'encoder', 'encode.exe'), [String(process.pid), '60', '1920', '1080', '1000000'], { stdio: ['pipe', 'pipe', 'pipe'] })
  const helperLog = []
  helper.stderr.on('data', (d) => { helperLog.push(String(d).trim()); if (helperLog.length > 40) helperLog.shift() })

  // Pacotes: 'E' 'V' flags 0 | int64 microssegundos | uint32 tamanho | H.264
  let pending = Buffer.alloc(0)
  const counters = { packets: 0, keys: 0, bytes: 0, desync: 0 }
  helper.stdout.on('data', (chunk) => {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk
    while (pending.length >= 16) {
      if (pending[0] !== 0x45 || pending[1] !== 0x56) { counters.desync++; pending = Buffer.alloc(0); return }
      const length = pending.readUInt32LE(12)
      if (pending.length < 16 + length) return
      const key = (pending[2] & 1) === 1
      const micros = Number(pending.readBigInt64LE(4))
      const data = pending.subarray(16, 16 + length)
      counters.packets++; counters.bytes += length; if (key) counters.keys++
      if (!win.isDestroyed()) win.webContents.send('au', { key, micros, data: new Uint8Array(data) })
      pending = pending.subarray(16 + length)
    }
  })

  ipcMain.on('need-key', () => { try { helper.stdin.write('K\n') } catch { /* encerrando */ } })
  ipcMain.on('bitrate', (_e, bps) => { try { helper.stdin.write(`B ${Math.round(bps)}\n`) } catch { /* encerrando */ } })
  ipcMain.handle('counters', () => ({ ...counters }))
  const finish = (result) => { out({ ...result, main: counters, helper: helperLog.slice(-4) }); try { helper.stdin.end() } catch { /* já fechou */ } helper.kill(); app.quit() }
  ipcMain.on('result', (_e, result) => finish(result))
  setTimeout(() => finish({ timeout: true }), 60000)
})
