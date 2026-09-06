const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 850, show: false })

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 2000))

  const info = await win.webContents.executeJavaScript(`
    (() => {
      setLottieDecoration('fire_storm');
      const s140 = document.getElementById('lottieStage140');
      const allElements = Array.from(s140.querySelectorAll('*')).map(el => {
        const attrs = {};
        for (let a of el.attributes) attrs[a.name] = a.value;
        return { tag: el.tagName, attrs };
      });
      return allElements;
    })()
  `)
  console.log('ALL ELEMENTS FIRE_STORM:', JSON.stringify(info, null, 2))
  app.quit()
})
