const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Open preview-gallery.html first
  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 2000))

  // Capture screenshot of preview-gallery.html
  const previewImg = await win.webContents.capturePage()
  const previewPath = path.join(__dirname, 'preview-gallery-capture.png')
  fs.writeFileSync(previewPath, previewImg.toPNG())
  console.log('Saved preview capture to', previewPath)

  // Now let's test a standalone page that renders our React components or tests them directly
  app.quit()
})
