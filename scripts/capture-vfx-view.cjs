const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 1600, show: false })

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 2000))

  const img = await win.webContents.capturePage({ x: 0, y: 1300, width: 1280, height: 900 })
  const p = path.join(__dirname, 'vfx_scrolled_view.png')
  fs.writeFileSync(p, img.toPNG())
  console.log('Saved VFX scrolled view to', p)
  app.quit()
})
