const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 850, show: false })

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 2000))

  // In preview-gallery.html, let's scroll down to the Pure VFX section and capture it
  await win.webContents.executeJavaScript(`
    window.scrollTo(0, 1400);
  `)
  await new Promise((r) => setTimeout(r, 1000))

  const img = await win.webContents.capturePage()
  const p = path.join(__dirname, 'pure_vfx_section.png')
  fs.writeFileSync(p, img.toPNG())
  console.log('Saved VFX section to', p)
  app.quit()
})
