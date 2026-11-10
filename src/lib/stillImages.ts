// Avatares em GIF ficam parados num quadro e só se mexem com o mouse em cima.
//
// Um GIF animado é redecodificado e repintado o tempo todo, e numa lista de membros ou numa conversa eram dezenas ao
// mesmo tempo (medido: ~21 dos 130 pontos de CPU do app aberto). Como as decorações pequenas (lib/decorationMotion.ts),
// o avatar pequeno fica no primeiro quadro e anima só com o mouse em cima.
//
// Funciona por fora dos componentes (são 26 arquivos que desenham avatar): um ouvinte de `load` no documento acha a
// imagem de avatar em GIF, troca o `src` por um quadro já desenhado e guarda o original em `data-echo-original`.
// O React não percebe: ele só mexe no `src` quando a imagem muda de verdade, e aí o ouvinte trata de novo.
//
// Fora de propósito: GIF dentro de mensagem, emoji e figurinha (não têm "avatar" na classe) e avatar grande (perfil,
// loja, configurações: 100 px ou mais), porque ali a animação é o assunto.

const STILL_FLAG = 'echoStill'
const ORIGINAL = 'echoOriginal'
const PLAYING = 'echoPlaying'

/** Avatares a partir desta largura (px) continuam animando */
export const STILL_MAX_PX = 100

/** O endereço é de um GIF (arquivo .gif ou data URL de GIF)? */
export function isGifSource(src: string | null | undefined): boolean {
  if (!src) return false
  if (src.startsWith('data:')) return /^data:image\/gif[;,]/i.test(src)
  if (src.startsWith('blob:')) return false
  return /\.gif$/i.test(src.split('#')[0].split('?')[0])
}

/** A imagem é um avatar? (a classe da própria imagem ou de um ancestral diz "avatar") */
export function isAvatarImage(img: Element): boolean {
  if (/avatar/i.test(img.getAttribute('class') ?? '')) return true
  const host = typeof img.closest === 'function' ? img.closest('[class*="avatar" i]') : null
  return Boolean(host)
}

type Snapshotter = (src: string) => Promise<string | null>

const stillCache = new Map<string, string | null>()
const STILL_CACHE_LIMIT = 300

/** Desenha o primeiro quadro do GIF num canvas pequeno. Null se o servidor não permitir (CORS) ou algo falhar. */
export function snapshotGif(src: string): Promise<string | null> {
  if (stillCache.has(src)) return Promise.resolve(stillCache.get(src) ?? null)
  return new Promise((resolve) => {
    const done = (value: string | null) => {
      if (stillCache.size >= STILL_CACHE_LIMIT) stillCache.delete(stillCache.keys().next().value as string)
      stillCache.set(src, value)
      resolve(value)
    }
    try {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.decoding = 'async'
      image.onload = () => {
        try {
          const scale = Math.min(1, 160 / Math.max(image.naturalWidth, image.naturalHeight, 1))
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
          const ctx = canvas.getContext('2d')
          if (!ctx) return done(null)
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
          done(canvas.toDataURL('image/png'))
        } catch {
          done(null) // canvas "sujo" (sem CORS): deixa o GIF como está
        }
      }
      image.onerror = () => done(null)
      image.src = src
    } catch {
      done(null)
    }
  })
}

interface StillOptions {
  snapshot?: Snapshotter
  /** Largura mostrada da imagem; padrão: a do elemento */
  sizeOf?: (img: HTMLImageElement) => number
}

/** Liga o congelamento. Devolve a função que desliga e devolve os GIFs ao normal. */
export function installStillImages(doc: Document = document, options: StillOptions = {}): () => void {
  const snapshot = options.snapshot ?? snapshotGif
  const sizeOf = options.sizeOf ?? ((img: HTMLImageElement) => img.clientWidth || img.width || 0)
  const frozen = new Set<HTMLImageElement>()

  const freeze = async (img: HTMLImageElement) => {
    const src = img.currentSrc || img.src
    if (!isGifSource(src) || img.dataset[PLAYING] || img.dataset[STILL_FLAG]) return
    if (!isAvatarImage(img)) return
    const width = sizeOf(img)
    if (width <= 0 || width >= STILL_MAX_PX) return
    const still = await snapshot(src)
    // Enquanto o quadro era desenhado, a imagem pode ter mudado ou o mouse entrado nela
    if (!still || (img.currentSrc || img.src) !== src || img.dataset[PLAYING] || !img.isConnected) return
    img.dataset[ORIGINAL] = src
    img.dataset[STILL_FLAG] = '1'
    img.src = still
    frozen.add(img)
  }

  const onLoad = (event: Event) => {
    const img = event.target
    if (!(img instanceof HTMLImageElement)) return
    // O React trocou o avatar por outro: o que guardamos não vale mais
    if (img.dataset[STILL_FLAG] && !img.src.startsWith('data:image/png')) {
      delete img.dataset[STILL_FLAG]
      delete img.dataset[ORIGINAL]
      frozen.delete(img)
    }
    void freeze(img)
  }

  const hostOf = (el: Element) => el.closest('[class*="avatar" i]')
  const stillImagesIn = (host: Element): HTMLImageElement[] => {
    const list = Array.from(host.querySelectorAll<HTMLImageElement>('img[data-echo-still="1"]'))
    if (host instanceof HTMLImageElement && host.dataset[STILL_FLAG]) list.push(host)
    return list
  }

  const play = (img: HTMLImageElement) => {
    const original = img.dataset[ORIGINAL]
    if (!original) return
    img.dataset[PLAYING] = '1'
    delete img.dataset[STILL_FLAG]
    img.src = original
  }
  const rest = (img: HTMLImageElement) => {
    if (!img.dataset[PLAYING]) return
    delete img.dataset[PLAYING]
    void freeze(img)
  }

  const onOver = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const host = hostOf(target)
    if (!host) return
    for (const img of stillImagesIn(host)) play(img)
  }
  const onOut = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const host = hostOf(target)
    if (!host) return
    const next = (event as MouseEvent).relatedTarget
    if (next instanceof Node && host.contains(next)) return
    for (const img of Array.from(host.querySelectorAll<HTMLImageElement>('img'))) rest(img)
    if (host instanceof HTMLImageElement) rest(host)
  }

  doc.addEventListener('load', onLoad, true)
  doc.addEventListener('mouseover', onOver, true)
  doc.addEventListener('mouseout', onOut, true)
  // Imagens que já estavam carregadas antes de ligarmos
  doc.querySelectorAll('img').forEach((img) => {
    if (img.complete) void freeze(img)
  })

  return () => {
    doc.removeEventListener('load', onLoad, true)
    doc.removeEventListener('mouseover', onOver, true)
    doc.removeEventListener('mouseout', onOut, true)
    for (const img of frozen) {
      const original = img.dataset[ORIGINAL]
      delete img.dataset[STILL_FLAG]
      delete img.dataset[PLAYING]
      if (original && img.isConnected) img.src = original
      delete img.dataset[ORIGINAL]
    }
    frozen.clear()
  }
}
