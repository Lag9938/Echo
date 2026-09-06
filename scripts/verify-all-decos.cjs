const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false
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

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 1500))

  const results = await win.webContents.executeJavaScript(`
    (() => {
      const decos = DECORATIONS.map(d => d.id);
      const stage = document.getElementById('stageVfxCanvas');
      const ctx = stage.getContext('2d');
      const checks = [];

      for (const id of decos) {
        setDecoration(id);
        // Force a render step
        const imgData = ctx.getImageData(0, 0, stage.width, stage.height).data;
        let nonZero = 0;
        for (let i = 3; i < imgData.length; i += 4) {
          if (imgData[i] > 10) nonZero++;
        }
        checks.push({
          id,
          name: DECORATIONS.find(d => d.id === id).name,
          canvasWidth: stage.width,
          canvasHeight: stage.height,
          nonZeroPixels: nonZero,
          hasContent: nonZero > 100
        });
      }
      return checks;
    })()
  `)

  console.log('DECORATION CHECKS:', JSON.stringify(results, null, 2))
  console.log('CONSOLE ERRORS:', errors)

  const allPassed = results.every(r => r.hasContent) && errors.length === 0
  console.log('ALL PASSED:', allPassed)

  app.quit()
})
