// Reduz as imagens de perfil e de espaço que estão em uso e foram enviadas no tamanho original (antes do envio
// reduzido do app, lib/imageUpload.ts). Roda dentro do Electron (o Chromium decodifica e redimensiona; nada a
// instalar) e usa a chave de administrador do Supabase, que só existe na hora, numa variável de ambiente.
//
//   Simulação (padrão, não muda nada):
//     $env:SUPABASE_SERVICE_ROLE_KEY = '...'; npx electron scripts/shrink-profile-images.cjs
//   Aplicar:
//     $env:SUPABASE_SERVICE_ROLE_KEY = '...'; npx electron scripts/shrink-profile-images.cjs --apply
//
// Não apaga nada: a imagem reduzida sobe como um arquivo NOVO ao lado da original, e só o endereço na tabela muda.
// Cada troca vai para scripts/shrink-profile-images.log.json (tabela, id, coluna, endereço antigo e novo) para
// desfazer, se precisar. GIFs animados não são reduzidos (perderiam a animação): aparecem só no relatório.
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const APPLY = process.argv.includes('--apply')
const ROOT = path.resolve(__dirname, '..')
const LOG_FILE = path.join(__dirname, 'shrink-profile-images.log.json')

// Mesmos limites do envio no app (src/lib/imageUpload.ts)
const LIMITS = {
  'profiles.avatar_url': { width: 512, height: 512 },
  'profiles.banner_url': { width: 1500, height: 600 },
  'spaces.icon_url': { width: 512, height: 512 },
  'spaces.banner_url': { width: 1500, height: 600 }
}
/** Abaixo disto a imagem já é leve o bastante e fica como está */
const MIN_BYTES_TO_SHRINK = 300 * 1024

function readEnv(name) {
  for (const file of ['.env.local', '.env']) {
    try {
      const line = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/).find((l) => l.startsWith(name + '='))
      if (line) return line.slice(name.length + 1).trim()
    } catch { /* sem o arquivo */ }
  }
  return ''
}

app.whenReady().then(async () => {
  const url = readEnv('VITE_SUPABASE_URL')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) {
    console.error('Falta VITE_SUPABASE_URL (.env.local) ou a variável SUPABASE_SERVICE_ROLE_KEY.')
    app.exit(1)
    return
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  const storagePrefix = `${url}/storage/v1/object/public/attachments/`

  // Página escondida que faz o trabalho de imagem (decodificar, reduzir, gerar WebP)
  const worker = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  await worker.loadURL('about:blank')
  const shrinkInPage = (src, maxW, maxH) => worker.webContents.executeJavaScript(`(async () => {
    const res = await fetch(${JSON.stringify(src)}); const blob = await res.blob()
    const bmp = await createImageBitmap(blob)
    const scale = Math.min(1, ${maxW} / bmp.width, ${maxH} / bmp.height)
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = new OffscreenCanvas(w, h); const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, 0, 0, w, h)
    const out = await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 })
    const bytes = new Uint8Array(await out.arrayBuffer())
    return { from: bmp.width + 'x' + bmp.height, to: w + 'x' + h, type: out.type, data: Array.from(bytes) }
  })()`)

  const rows = []
  for (const [table, cols] of [['profiles', ['avatar_url', 'banner_url']], ['spaces', ['icon_url', 'banner_url']]]) {
    const res = await fetch(`${url}/rest/v1/${table}?select=id,${cols.join(',')}`, { headers })
    if (!res.ok) throw new Error(`leitura de ${table}: ${res.status}`)
    for (const row of await res.json()) for (const col of cols) {
      const value = row[col]
      if (typeof value === 'string' && value.startsWith(storagePrefix)) rows.push({ table, id: row.id, col, src: value })
    }
  }

  const log = []
  let saved = 0
  for (const item of rows) {
    const head = await fetch(item.src, { method: 'HEAD' })
    const size = Number(head.headers.get('content-length') || 0)
    const type = head.headers.get('content-type') || ''
    const label = `${item.table}.${item.col} ${item.id.slice(0, 8)} ${(size / 1048576).toFixed(2)} MB ${type}`
    if (!head.ok) { console.log(`  ignorada (arquivo não existe): ${label}`); continue }
    if (size < MIN_BYTES_TO_SHRINK) continue
    if (type === 'image/gif') { console.log(`  GIF (não reduzido, avisar a pessoa): ${label}`); continue }
    const limit = LIMITS[`${item.table}.${item.col}`]
    let result
    try {
      result = await shrinkInPage(item.src, limit.width, limit.height)
    } catch (err) {
      console.log(`  falhou ao ler: ${label} (${err.message})`)
      continue
    }
    const newBytes = result.data.length
    console.log(`  ${APPLY ? 'reduzindo' : 'reduziria'}: ${label} ${result.from} -> ${result.to}, ${(newBytes / 1024).toFixed(0)} KB`)
    saved += size - newBytes
    if (!APPLY) continue

    const objectPath = item.src.slice(storagePrefix.length).replace(/\.[^./]+$/, '') + `-reduzida-${Date.now()}.webp`
    const up = await fetch(`${url}/storage/v1/object/attachments/${objectPath}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': result.type, 'x-upsert': 'false' },
      body: Buffer.from(result.data)
    })
    if (!up.ok) { console.log(`    falhou ao enviar: ${up.status} ${await up.text()}`); continue }
    const newUrl = storagePrefix + objectPath
    const patch = await fetch(`${url}/rest/v1/${item.table}?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ [item.col]: newUrl })
    })
    if (!patch.ok) { console.log(`    falhou ao gravar o endereço: ${patch.status}`); continue }
    log.push({ table: item.table, id: item.id, column: item.col, oldUrl: item.src, newUrl, at: new Date().toISOString() })
  }

  if (APPLY && log.length) fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2))
  console.log(`\n${rows.length} imagens em uso conferidas. ${APPLY ? 'Economia' : 'Economia possível'}: ${(saved / 1048576).toFixed(1)} MB por download.`)
  if (!APPLY) console.log('Nada foi alterado (simulação). Para aplicar, rode de novo com --apply.')
  else console.log(`${log.length} imagens trocadas; registro para desfazer em ${LOG_FILE}`)
  app.exit(0)
}).catch((err) => { console.error(err); app.exit(1) })
