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
const BACKGROUND_SCAN_EVERY = 5

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

interface FrozenBackground {
  /** O que estava escrito no próprio elemento antes (quase sempre nada: o fundo vem do CSS) */
  previousValue: string
  previousPriority: string
  /** O que este módulo escreveu; se o elemento não tem mais isso, alguém trocou o fundo e não é mais nosso */
  appliedValue: string
}

/** Endereços dentro de um `background-image` calculado: url("a"), url("b") → ['a', 'b'] */
export function backgroundUrls(value: string | null | undefined): string[] {
  if (!value || !value.includes('url(')) return []
  return [...value.matchAll(/url\((["']?)(.*?)\1\)/g)].map((match) => match[2])
}

export interface ImageFreezer {
  /** Congela as imagens animadas do documento (as já congeladas e as paradas são puladas) */
  freeze: (images: Iterable<HTMLImageElement>) => Promise<void>
  /**
   * Congela os fundos animados (imagem usada como `background-image`, como o fundo desfocado do cartão de
   * quem está na chamada e o banner do espaço). `backgroundOf` devolve o fundo calculado do elemento.
   */
  freezeBackgrounds: (elements: Iterable<HTMLElement>, backgroundOf: (el: HTMLElement) => string) => Promise<void>
  /** Devolve todas as imagens ao normal */
  restore: () => void
  frozenCount: () => number
}

/**
 * Guarda o que foi congelado para devolver exatamente como estava. `isActive` é conferido depois de cada
 * espera: se o app voltou para a frente enquanto a imagem era lida, ela não é congelada.
 */
export function createImageFreezer(makeStill: StillMaker, isActive: () => boolean, markAttribute?: string): ImageFreezer {
  const stills = new Map<string, Promise<string | null>>()
  const frozen = new Map<HTMLImageElement, FrozenImage>()
  const frozenBackgrounds = new Map<HTMLElement, FrozenBackground>()

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
    try {
      img.style.content = entry.previousContent
      if (markAttribute) img.removeAttribute(markAttribute)
    } catch { /* a imagem saiu da tela */ }
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
        // Marca para o CSS soltar a animação com o mouse em cima (styles/decoration-motion.css)
        if (markAttribute) img.setAttribute(markAttribute, '')
      }
      // Quem saiu da tela não precisa mais ser lembrado
      for (const img of [...frozen.keys()]) if (!img.isConnected) frozen.delete(img)
    },
    async freezeBackgrounds(elements, backgroundOf) {
      for (const el of elements) {
        if (frozenBackgrounds.has(el)) continue
        const original = backgroundOf(el)
        const urls = backgroundUrls(original).filter(isFreezeCandidate)
        if (urls.length === 0) continue
        let value = original
        let changed = false
        for (const url of urls) {
          const still = await stillFor(url)
          if (!isActive()) return
          if (!still) continue
          value = value.split(url).join(still)
          changed = true
        }
        if (!changed || !el.isConnected || frozenBackgrounds.has(el)) continue
        frozenBackgrounds.set(el, {
          previousValue: el.style.getPropertyValue('background-image'),
          previousPriority: el.style.getPropertyPriority('background-image'),
          appliedValue: value
        })
        // "important" para valer também sobre o fundo que vem de uma regra de CSS
        el.style.setProperty('background-image', value, 'important')
      }
      for (const el of [...frozenBackgrounds.keys()]) if (!el.isConnected) frozenBackgrounds.delete(el)
    },
    restore() {
      for (const img of [...frozen.keys()]) unfreeze(img)
      for (const [el, entry] of frozenBackgrounds) {
        try {
          // Só desfaz o que ainda é nosso: se trocaram o fundo enquanto estava congelado, vale o novo
          const ours = backgroundUrls(entry.appliedValue).filter((url) => url.startsWith('blob:'))
          const now = el.style.getPropertyValue('background-image')
          if (!ours.some((url) => now.includes(url))) continue
          if (entry.previousValue) el.style.setProperty('background-image', entry.previousValue, entry.previousPriority)
          else el.style.removeProperty('background-image')
        } catch { /* o elemento saiu da tela */ }
      }
      frozenBackgrounds.clear()
    },
    frozenCount: () => frozen.size + frozenBackgrounds.size
  }
}

/**
 * Liga a economia: congela ao ir para segundo plano, devolve ao voltar. Enquanto está em segundo plano,
 * confere de tempos em tempos as imagens que apareceram depois. Devolve a função que desliga tudo.
 */
/** Imagem animada exibida até este tamanho (avatar, ícone, emoji) fica parada em uso e anima só com o mouse em cima */
export const HOVER_ONLY_IMAGE_PX = 128
/** Atributo das imagens paradas "até passar o mouse" (o CSS solta a animação no :hover) */
export const HOVER_FROZEN_ATTR = 'data-echo-gif-frozen'

/** Das imagens do documento, as pequenas que devem ficar paradas com o app em uso */
export function hoverOnlyImages(images: Iterable<HTMLImageElement>): HTMLImageElement[] {
  const out: HTMLImageElement[] = []
  for (const img of images) {
    const width = img.clientWidth
    if (width > 0 && width <= HOVER_ONLY_IMAGE_PX) out.push(img)
  }
  return out
}

export function startBackgroundImageFreezer(doc: Document = document, win: Window = window): () => void {
  if (typeof (globalThis as any).ImageDecoder !== 'function') return () => {}
  const freezer = createImageFreezer(makeStillFrame, () => isAppInBackground(doc))
  // Em uso: GIF de avatar/ícone/emoji parado no primeiro quadro, animando só com o mouse em cima (como no Discord).
  // Medido na Loja: o próprio avatar em GIF aparecia em 16 cartões, os 16 animando juntos o tempo todo.
  const hoverFreezer = createImageFreezer(makeStillFrame, () => !isAppInBackground(doc), HOVER_FROZEN_ATTR)
  const freezeSmallNow = () => { void hoverFreezer.freeze(hoverOnlyImages(Array.from(doc.images))).catch(() => {}) }
  let foregroundTimer: ReturnType<typeof setInterval> | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  // Os fundos exigem olhar o estilo calculado de cada elemento, o que custa mais: só a cada 5 conferências
  let scans = 0
  const freezeNow = () => {
    void freezer.freeze(Array.from(doc.images)).catch(() => {})
    if (scans++ % BACKGROUND_SCAN_EVERY !== 0) return
    const view = doc.defaultView
    if (!view) return
    const elements = Array.from(doc.body.querySelectorAll<HTMLElement>('*'))
    void freezer.freezeBackgrounds(elements, (el) => view.getComputedStyle(el).backgroundImage).catch(() => {})
  }

  const update = () => {
    if (isAppInBackground(doc)) {
      if (foregroundTimer) {
        clearInterval(foregroundTimer)
        foregroundTimer = null
      }
      scans = 0
      freezeNow()
      if (!timer) timer = setInterval(freezeNow, RESCAN_INTERVAL_MS)
    } else {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      freezer.restore()
      freezeSmallNow()
      if (!foregroundTimer) foregroundTimer = setInterval(freezeSmallNow, RESCAN_INTERVAL_MS)
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
    if (foregroundTimer) clearInterval(foregroundTimer)
    freezer.restore()
    hoverFreezer.restore()
  }
}
