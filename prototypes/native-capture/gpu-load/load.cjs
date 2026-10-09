// "Jogo" de mentira: um processo SEPARADO que ocupa a placa de vídeo o tempo todo, sem limite de quadros,
// para medir a captura de tela do Echo nas mesmas condições de um jogo pesado rodando.
const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
app.commandLine.appendSwitch('disable-gpu-vsync')
app.commandLine.appendSwitch('disable-frame-rate-limit')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('force_high_performance_gpu')
app.setPath('userData', path.join(app.getPath('temp'), 'echo-capture-load'))
const seconds = Number(process.env.LOAD_SECONDS || 60)
const iterations = Number(process.env.LOAD_ITER || 400)

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 900, x: 0, y: 0, title: 'EchoLoadTest', webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } })
  win.webContents.on('console-message', (_e, _l, message) => {
    if (String(message).startsWith('LOADFPS ')) fs.appendFileSync(path.join(__dirname, 'load.txt'), message + require('node:os').EOL)
  })
  await win.loadURL('data:text/html,' + encodeURIComponent(`<body style="margin:0;background:#000"><canvas id="c" width="1600" height="900" style="width:100vw;height:100vh"></canvas><script>
const gl = document.getElementById('c').getContext('webgl2', { powerPreference: 'high-performance', antialias: false })
const vs = '#version 300 es\\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'
const fs = '#version 300 es\\nprecision highp float;uniform float t;out vec4 o;void main(){vec2 u=gl_FragCoord.xy/900.;float a=0.;for(int i=0;i<${iterations};i++){u=vec2(sin(u.y*3.1+t+float(i)*.01),cos(u.x*2.7-t));a+=length(u)*.002;}o=vec4(fract(a),fract(a*3.),fract(a*7.+t),1.);}'
function sh(type, src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s}
const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr)
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW)
const l=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0)
const ut=gl.getUniformLocation(pr,'t');let n=0,last=performance.now();const px=new Uint8Array(4)
function f(now){gl.uniform1f(ut,now/1000);gl.drawArrays(gl.TRIANGLES,0,3);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);n++;if(now-last>=2000){console.log('LOADFPS '+Math.round(n*1000/(now-last)));n=0;last=now}requestAnimationFrame(f)}
requestAnimationFrame(f)
</script></body>`))
  setTimeout(() => app.quit(), seconds * 1000)
})
