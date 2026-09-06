const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    show: false,
    webPreferences: {
      offscreen: true
    }
  })

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 1500))

  const clickResult = await win.webContents.executeJavaScript(`
    (() => {
      const btn = document.querySelector('.btn-select[data-id="fire_storm"]');
      if (btn) btn.click();
      return {
        btnFound: !!btn,
        activeText: document.getElementById('stageDecoName')?.innerText,
        activeBtn: document.querySelector('.btn-select.active')?.innerText
      };
    })()
  `)
  console.log('CLICK RESULT:', clickResult)

  // In Electron headless, let's wait and invalidate compositor
  await new Promise((r) => setTimeout(r, 800))
  win.webContents.invalidate()
  await new Promise((r) => setTimeout(r, 500))

  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 1280, height: 750 })
  const p = path.join(__dirname, 'test_fire_repainted.png')
  fs.writeFileSync(p, img.toPNG())
  console.log('Saved repainted fire to', p)
  app.quit()
})
