// Para as imagens animadas (GIF/WebP de avatar, ícone de espaço, figurinha) enquanto o Echo está em segundo
// plano (minimizado ou sem foco), mostrando um quadro parado no lugar.
//
// Medido numa chamada com o app atrás de outra janela: dois GIFs de avatar na tela mantinham o processo
// gráfico do Echo em ~20% de um núcleo, porque cada quadro do GIF obriga a redesenhar a tela (e os painéis
// de vidro por cima dela). Com o quadro parado cai para ~3%. É o par das animações de CSS, que já paravam
// (backgroundAnimations.ts).
//
// O navegador não tem "pausar GIF". O que funciona: a propriedade CSS `content` troca a imagem exibida por
// um <img> sem mexer no `src` nem na árvore do React; a imagem original deixa de ser desenhada e, com isso,
// de animar. Ao voltar, basta tirar o `content`.

import { isAppInBackground } from './backgroundAnimations'

const RESCAN_INTERVAL_MS = 2000
const MAX_CACHED_STILLS = 200

/** Só endereços da rede com extensão de formato que pode ser animado (PNG fica de fora: quase nunca é) */
export function isFreezeCandidate(url: string | null | undefined): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false
  return /\.(gif|webp|apng)(\?|#|$)/i.test(url)
}

/** Devolve o endereço de um quadro parado da imagem, ou null se ela não é animada (ou não deu para ler) */
export type StillMaker = (url: string) => Promise<string | null>

/** Lê a imagem e, se for animada, gera um PNG do primeiro quadro (endereço blob:) */
export async function makeStillFrame(url: string): Promise<string | null> {
  const Decoder = (globalThis as any).ImageDecoder
  if (typeof Decoder !== 'function') return null
  const response = await fetch(url, { cache: 'force-cache' })
  if (!response.ok) return null
  const blob = await response.blob()
  const decoder = new Decoder({ data: await blob.arrayBuffer(), type: blob.type })
  try {
    await decoder.tracks.ready
    if (!decoder.tracks.selectedTrack?.animated) return null
    const { image } = await decoder.decode({ frameIndex: 0 })
    const canvas = document.createElement('canvas')
    canvas.width = image.displayWidth
    canvas.height = image.displayHeight
    canvas.getContext('2d')?.drawImage(image, 0, 0)
    image.close()
    const still = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    return still ? URL.createObjectURL(still) : null
  } finally {
    decoder.close()
  }
}

interface FrozenImage {
  url: string
  previousContent: string
}

export interface ImageFreezer {
  /** Congela as imagens animadas do documento (as já congeladas e as paradas são puladas) */
  freeze: (images: Iterable<HTMLImageElement>) => Promise<void>
  /** Devolve todas as imagens ao normal */
  restore: () => void
  frozenCount: () => number
}

/**
 * Guarda o que foi congelado para devolver exatamente como estava. `isActive` é conferido depois de cada
 * espera: se o app voltou para a frente enquanto a imagem era lida, ela não é congelada.
 */
export function createImageFreezer(makeStill: StillMaker, isActive: () => boolean): ImageFreezer {
  const stills = new Map<string, Promise<string | null>>()
  const frozen = new Map<HTMLImageElement, FrozenImage>()

  const stillFor = (url: string) => {
    let pending = stills.get(url)
    if (!pending) {
      if (stills.size >= MAX_CACHED_STILLS) return Promise.resolve(null)
      pending = makeStill(url).catch(() => null)
      stills.set(url, pending)
    }
    return pending
  }

  const unfreeze = (img: HTMLImageElement) => {
    const entry = frozen.get(img)
    if (!entry) return
    frozen.delete(img)
    try { img.style.content = entry.previousContent } catch { /* a imagem saiu da tela */ }
  }

  return {
    async freeze(images) {
      for (const img of images) {
        const url = img.currentSrc || img.src
        const current = frozen.get(img)
        // A imagem mudou enquanto estava congelada (trocaram o avatar): o quadro parado ficou velho
        if (current && current.url !== url) unfreeze(img)
        if (frozen.has(img) || !isFreezeCandidate(url)) continue
        const still = await stillFor(url)
        if (!isActive()) return
        if (!still || !img.isConnected || (img.currentSrc || img.src) !== url || frozen.has(img)) continue
        frozen.set(img, { url, previousContent: img.style.content })
        img.style.content = `url("${still}")`
      }
      // Quem saiu da tela não precisa mais ser lembrado
      for (const img of [...frozen.keys()]) if (!img.isConnected) frozen.delete(img)
    },
    restore() {
      for (const img of [...frozen.keys()]) unfreeze(img)
    },
    frozenCount: () => frozen.size
  }
}

/**
 * Liga a economia: congela ao ir para segundo plano, devolve ao voltar. Enquanto está em segundo plano,
 * confere de tempos em tempos as imagens que apareceram depois. Devolve a função que desliga tudo.
 */
export function startBackgroundImageFreezer(doc: Document = document, win: Window = window): () => void {
  if (typeof (globalThis as any).ImageDecoder !== 'function') return () => {}
  const freezer = createImageFreezer(makeStillFrame, () => isAppInBackground(doc))
  let timer: ReturnType<typeof setInterval> | null = null

  const freezeNow = () => { void freezer.freeze(Array.from(doc.images)).catch(() => {}) }

  const update = () => {
    if (isAppInBackground(doc)) {
      freezeNow()
      if (!timer) timer = setInterval(freezeNow, RESCAN_INTERVAL_MS)
    } else {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      freezer.restore()
    }
  }

  doc.addEventListener('visibilitychange', update)
  win.addEventListener('blur', update)
  win.addEventListener('focus', update)
  update()

  return () => {
    doc.removeEventListener('visibilitychange', update)
    win.removeEventListener('blur', update)
    win.removeEventListener('focus', update)
    if (timer) clearInterval(timer)
    freezer.restore()
  }
}
