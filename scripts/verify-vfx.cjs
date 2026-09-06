const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 950, show: false })

  const errors = []
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2 && !message.includes('Security Warning')) {
      errors.push(`[CONSOLE_${level}] ${message} (${sourceId}:${line})`)
    }
  })
  win.webContents.on('page-error', (err) => {
    errors.push(`[PAGE_ERROR] ${err}`)
  })

  console.log('Loading preview-gallery.html...')
  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 2000))

  const status = await win.webContents.executeJavaScript(`
    (() => {
      const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
        id: c.id,
        w: c.width,
        h: c.height
      }));
      return {
        title: document.title,
        canvasesCount: canvases.length,
        first5Canvases: canvases.slice(0, 5),
        activeDecoName: document.getElementById('stageDecoName')?.innerText
      };
    })()
  `)
  console.log('STATUS:', JSON.stringify(status, null, 2))
  console.log('ERRORS:', errors)

  // Capture Stage
  const stageImg = await win.webContents.capturePage({ x: 0, y: 0, width: 1280, height: 750 })
  const stagePath = path.join(__dirname, 'verified_stage_preview.png')
  fs.writeFileSync(stagePath, stageImg.toPNG())
  console.log('Saved stage preview to', stagePath)

  // Switch decoration to Fire Storm, wait and capture
  const switchRes = await win.webContents.executeJavaScript(`
    (() => {
      setDecoration('fire_storm');
      return {
        currentId,
        name: document.getElementById('stageDecoName')?.innerText,
        activeBtns: Array.from(document.querySelectorAll('.btn-select.active')).map(b => b.innerText)
      };
    })()
  `)
  console.log('SWITCH TO FIRE:', switchRes)
  await new Promise((r) => setTimeout(r, 1000))
  const fireImg = await win.webContents.capturePage({ x: 0, y: 0, width: 1280, height: 750 })
  const firePath = path.join(__dirname, 'verified_fire_preview.png')
  fs.writeFileSync(firePath, fireImg.toPNG())
  console.log('Saved fire preview to', firePath)

  // Switch decoration to Prismatic Crown, wait and capture
  await win.webContents.executeJavaScript(`
    setDecoration('prismatic_crown');
  `)
  await new Promise((r) => setTimeout(r, 1000))
  const crownImg = await win.webContents.capturePage({ x: 0, y: 0, width: 1280, height: 750 })
  const crownPath = path.join(__dirname, 'verified_crown_preview.png')
  fs.writeFileSync(crownPath, crownImg.toPNG())
  console.log('Saved crown preview to', crownPath)

  app.quit()
})
