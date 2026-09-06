const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 850, show: false })

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 1500))

  const buttons = await win.webContents.executeJavaScript(`
    Array.from(document.querySelectorAll('#lottieControlsPanel .btn-select')).map(b => ({
      id: b.dataset.id,
      text: b.innerText
    }))
  `)
  console.log('Available buttons:', buttons)

  for (const btn of buttons) {
    await win.webContents.executeJavaScript(`
      setLottieDecoration('${btn.id}');
    `)
    await new Promise((r) => setTimeout(r, 600))
    const img = await win.webContents.capturePage()
    const p = path.join(__dirname, `capture-${btn.id}.png`)
    fs.writeFileSync(p, img.toPNG())
    console.log(`Captured ${btn.id} to ${p}`)
  }

  app.quit()
})
