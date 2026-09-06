const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false
  })

  win.webContents.on(
    'console-message',
    (event, level, message, line, sourceId) => {
      console.log(`[CONSOLE_${level}] ${message} (${sourceId}:${line})`)
    }
  )

  win.webContents.on('page-error', (err) => {
    console.error(`[PAGE_ERROR]`, err)
  })

  try {
    console.log('--- LOADING preview-gallery.html ---')
    await win.loadURL('http://localhost:5173/preview-gallery.html')
    await new Promise((r) => setTimeout(r, 3000))

    console.log('--- LOADING app index (http://localhost:5173) ---')
    await win.loadURL('http://localhost:5173/')
    await new Promise((r) => setTimeout(r, 3000))
  } catch (err) {
    console.error('DIAGNOSE_ERR:', err)
  } finally {
    app.quit()
  }
})
