const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: {
      offscreen: true
    }
  })

  const errors = []
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2 && !message.includes('Security Warning')) {
      errors.push(`[CONSOLE_${level}] ${message} (${sourceId}:${line})`)
    }
  })
  win.webContents.on('page-error', (err) => {
    errors.push(`[PAGE_ERROR] ${err}`)
  })

  console.log('Loading React app at http://localhost:5173/ ...')
  await win.loadURL('http://localhost:5173/')
  await new Promise((r) => setTimeout(r, 2500))

  const info = await win.webContents.executeJavaScript(`
    (() => {
      const canvases = document.querySelectorAll('canvas');
      return {
        title: document.title,
        canvasesCount: canvases.length,
        url: window.location.href,
        bodyLen: document.body.innerHTML.length
      };
    })()
  `)
  console.log('INFO:', info)
  console.log('ERRORS:', errors)

  const img = await win.webContents.capturePage()
  fs.writeFileSync(path.join(__dirname, 'react_app_preview.png'), img.toPNG())
  console.log('Saved react_app_preview.png')

  app.quit()
})
