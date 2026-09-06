const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 800, show: false })
  await win.loadURL('http://localhost:5173/')
  await new Promise((r) => setTimeout(r, 2000))
  const info = await win.webContents.executeJavaScript(`
    ({
      title: document.title,
      bodyText: document.body.innerText.substring(0, 300),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean).slice(0, 20),
      inputs: Array.from(document.querySelectorAll('input')).map(i => i.placeholder || i.type || i.name)
    })
  `)
  console.log(JSON.stringify(info, null, 2))
  app.quit()
})
