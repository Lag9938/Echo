const { app, BrowserWindow } = require('electron')
const path = require('path')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 850, show: false })

  win.webContents.on('console-message', (event, level, message) => {
    console.log(`[FILE_PROTOCOL_CONSOLE_${level}] ${message}`)
  })

  const filePath = 'file:///' + path.join(__dirname, '../public/preview-gallery.html').replace(/\\/g, '/')
  console.log('Loading filePath:', filePath)
  try {
    await win.loadURL(filePath)
    await new Promise((r) => setTimeout(r, 2000))

    const report = await win.webContents.executeJavaScript(`
      (() => {
        const s140 = document.getElementById('lottieStage140');
        return {
          hasSvg: !!s140?.querySelector('svg'),
          cacheSize: lottieJsonCache.size,
          instancesCount: lottieInstances.length
        };
      })()
    `)
    console.log('FILE PROTOCOL REPORT:', report)
  } catch (err) {
    console.error('File protocol load err:', err)
  }
  app.quit()
})
