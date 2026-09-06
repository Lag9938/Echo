const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 800, height: 600, show: false })
  await win.loadURL('http://localhost:5173/preview-gallery.html')
  await new Promise((r) => setTimeout(r, 1000))

  const testResult = await win.webContents.executeJavaScript(`
    (() => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      // Let's test a pure path shape 'sh' (shape path with v, i, o bezier points)
      // M 150 50 C ... (circle)
      const c = 0.552284749831;
      const r = 100;
      const cx = 150, cy = 150;
      
      const testAnimData = {
        v: '5.5.7',
        fr: 60,
        ip: 0,
        op: 60,
        w: 300,
        h: 300,
        nm: 'TestCircle',
        ddd: 0,
        assets: [],
        layers: [
          {
            ddd: 0,
            ind: 1,
            ty: 4,
            nm: 'CircleLayer',
            sr: 1,
            ks: {
              o: { a: 0, k: 100 },
              r: {
                a: 1,
                k: [
                  {
                    t: 0,
                    s: [0],
                    e: [360],
                    i: { x: [0.833], y: [0.833] },
                    o: { x: [0.167], y: [0.167] }
                  },
                  { t: 60, s: [360] }
                ]
              },
              p: { a: 0, k: [150, 150, 0] },
              a: { a: 0, k: [150, 150, 0] },
              s: { a: 0, k: [100, 100, 100] }
            },
            ao: 0,
            shapes: [
              {
                ty: 'gr',
                nm: 'Group 1',
                it: [
                  {
                    ty: 'sh',
                    nm: 'CirclePath',
                    ks: {
                      a: 0,
                      k: {
                        i: [[r * c, 0], [0, r * c], [-r * c, 0], [0, -r * c]],
                        o: [[-r * c, 0], [0, -r * c], [r * c, 0], [0, r * c]],
                        v: [[cx, cy - r], [cx - r, cy], [cx, cy + r], [cx + r, cy]],
                        c: true
                      }
                    }
                  },
                  {
                    ty: 'st',
                    nm: 'Stroke',
                    c: { a: 0, k: [1, 0.5, 0] },
                    w: { a: 0, k: 6 },
                    o: { a: 0, k: 100 }
                  },
                  {
                    ty: 'tr',
                    nm: 'Transform',
                    p: { a: 0, k: [0, 0] },
                    a: { a: 0, k: [0, 0] },
                    s: { a: 0, k: [100, 100] },
                    r: { a: 0, k: 0 },
                    o: { a: 0, k: 100 }
                  }
                ]
              }
            ],
            ip: 0,
            op: 60,
            st: 0,
            bm: 0
          }
        ]
      };

      const anim = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: testAnimData
      });

      const getTrans = () => container.querySelector('g[transform]')?.getAttribute('transform');
      const tr1 = getTrans();
      await new Promise(r => setTimeout(r, 200));
      const tr2 = getTrans();
      await new Promise(r => setTimeout(r, 200));
      const tr3 = getTrans();

      return {
        tr1,
        tr2,
        tr3,
        animating: tr1 !== tr2 && tr2 !== tr3
      };
    })()
  `)

  console.log('MINIMAL LOTTIE RESULT:', testResult)
  app.quit()
})
