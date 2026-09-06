const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 850, show: false })

  win.webContents.on('console-message', (event, level, message) => {
    console.log(`[BROWSER_LOG] ${message}`)
  })

  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 2000))

  const results = await win.webContents.executeJavaScript(`
    (async () => {
      const report = [];
      for (const item of LOTTIE_ITEMS) {
        const testDiv = document.createElement('div');
        testDiv.style.width = '200px';
        testDiv.style.height = '200px';
        document.body.appendChild(testDiv);
        let error = null;
        let anim = null;
        try {
          const res = await fetch(item.path);
          if (!res.ok) throw new Error('Fetch failed: ' + res.status + ' ' + res.statusText);
          const data = await res.json();
          anim = lottie.loadAnimation({
            container: testDiv,
            renderer: 'svg',
            loop: false,
            autoplay: true,
            animationData: data
          });
          await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          error = e.message || String(e);
        }
        const svg = testDiv.querySelector('svg');
        const elementsCount = testDiv.querySelectorAll('path, rect, circle, ellipse, g').length;
        report.push({
          id: item.id,
          name: item.name,
          error: error,
          hasSvg: !!svg,
          elementsCount: elementsCount,
          svgWidth: svg?.getAttribute('width'),
          svgHeight: svg?.getAttribute('height')
        });
        if (anim) anim.destroy();
        testDiv.remove();
      }
      return report;
    })()
  `)
  console.log('JSON VALIDATION REPORT:', JSON.stringify(results, null, 2))
  app.quit()
})
