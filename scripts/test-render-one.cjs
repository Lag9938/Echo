const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 850, show: false })

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 2000))

  await win.webContents.executeJavaScript(`
    setLottieDecoration('cyber_hud');
  `)
  await new Promise((r) => setTimeout(r, 1500))

  const img = await win.webContents.capturePage()
  const p = path.join(__dirname, 'cyber_hud_render.png')
  fs.writeFileSync(p, img.toPNG())
  console.log('Saved to', p)
  app.quit()
})
