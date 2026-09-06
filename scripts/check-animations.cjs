const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 800, show: false })

  win.webContents.on('console-message', (event, level, message) => {
    console.log(`[PAGE_LOG] ${message}`)
  })

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 1000))

  const debugInfo = await win.webContents.executeJavaScript(`
    (() => {
      const anim = lottieInstances[0];
      const logs = [];
      anim.addEventListener('loopComplete', (e) => {
        logs.push('LOOP_COMPLETE: ' + JSON.stringify(e));
      });
      anim.addEventListener('complete', (e) => {
        logs.push('COMPLETE: ' + JSON.stringify(e));
      });
      anim.addEventListener('error', (e) => {
        logs.push('ERROR: ' + JSON.stringify(e));
      });
      window.__debugLogs = logs;
      return 'Listener attached';
    })()
  `)
  console.log('Attached listener:', debugInfo)

  await new Promise((r) => setTimeout(r, 3000))

  const result = await win.webContents.executeJavaScript(`
    (() => {
      const anim = lottieInstances[0];
      return {
        logs: window.__debugLogs,
        frame: anim.currentFrame,
        isPaused: anim.isPaused,
        playCount: anim.playCount,
        loop: anim.loop,
        timeCompleted: anim.timeCompleted
      };
    })()
  `)
  console.log('DEBUG RESULT:', JSON.stringify(result, null, 2))
  app.quit()
})
