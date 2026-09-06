const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 850, show: false })

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 2000))

  const res = await win.webContents.executeJavaScript(`
    (() => {
      setLottieDecoration('cyber_hud');
      const s140 = document.getElementById('lottieStage140');
      return s140.innerHTML;
    })()
  `)
  console.log('RAW SVG MARKUP:', res)
  app.quit()
})
