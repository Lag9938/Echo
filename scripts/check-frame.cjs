const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 850, show: false })

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 2000))

  const testInfo = await win.webContents.executeJavaScript(`
    (async () => {
      setLottieDecoration('fire_storm');
      // Wait for 1 frame
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const s140 = document.getElementById('lottieStage140');
      const paths = Array.from(s140.querySelectorAll('path'));
      return {
        count: paths.length,
        attrs: paths.map(p => ({
          d: p.getAttribute('d'),
          stroke: p.getAttribute('stroke'),
          display: p.closest('g')?.style.display
        }))
      };
    })()
  `)
  console.log('CYBER HUD FRAME 1:', JSON.stringify(testInfo, null, 2))
  app.quit()
})
