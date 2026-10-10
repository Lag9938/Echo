import { describe, it, expect, vi } from 'vitest'
import { backgroundUrls, createImageFreezer, isFreezeCandidate } from '../backgroundImages'

function image(src: string) {
  const img = document.createElement('img')
  img.src = src
  document.body.appendChild(img)
  return img
}

const GIF = 'https://exemplo.test/avatars/a.gif'

describe('imagens animadas em segundo plano', () => {
  it('só tenta congelar formatos que podem ser animados, vindos da rede', () => {
    expect(isFreezeCandidate(GIF)).toBe(true)
    expect(isFreezeCandidate('https://exemplo.test/a.webp?v=2')).toBe(true)
    expect(isFreezeCandidate('https://exemplo.test/a.png')).toBe(false)
    expect(isFreezeCandidate('blob:http://localhost/123')).toBe(false)
    expect(isFreezeCandidate('data:image/gif;base64,AAAA')).toBe(false)
    expect(isFreezeCandidate('')).toBe(false)
    expect(isFreezeCandidate(null)).toBe(false)
  })

  it('congela com um quadro parado e devolve exatamente como estava', async () => {
    const makeStill = vi.fn(async () => 'blob:parado')
    const freezer = createImageFreezer(makeStill, () => true)
    const img = image(GIF)

    await freezer.freeze([img])
    expect(img.style.content).toContain('blob:parado')
    // O endereço da imagem não muda: o React continua dono do src
    expect(img.src).toBe(GIF)

    freezer.restore()
    expect(img.style.content).toBe('')
    expect(freezer.frozenCount()).toBe(0)
  })

  it('a mesma imagem em vários lugares é lida uma vez só', async () => {
    const makeStill = vi.fn(async () => 'blob:parado')
    const freezer = createImageFreezer(makeStill, () => true)
    const images = [image(GIF), image(GIF), image(GIF)]

    await freezer.freeze(images)
    await freezer.freeze(images)
    expect(makeStill).toHaveBeenCalledTimes(1)
    expect(freezer.frozenCount()).toBe(3)
  })

  it('imagem que não é animada (ou que falhou ao ler) fica como está', async () => {
    const freezer = createImageFreezer(async (url) => {
      if (url.includes('erro')) throw new Error('sem rede')
      return null
    }, () => true)
    const still = image('https://exemplo.test/parada.webp')
    const broken = image('https://exemplo.test/erro.gif')

    await freezer.freeze([still, broken])
    expect(still.style.content).toBe('')
    expect(broken.style.content).toBe('')
  })

  it('o app voltou para a frente enquanto a imagem era lida: não congela', async () => {
    let background = true
    const freezer = createImageFreezer(async () => {
      background = false
      return 'blob:parado'
    }, () => background)
    const img = image(GIF)

    await freezer.freeze([img])
    expect(img.style.content).toBe('')
  })

  it('lê os endereços de um fundo de CSS', () => {
    expect(backgroundUrls('url("https://a.test/x.gif"), linear-gradient(red, blue)')).toEqual(['https://a.test/x.gif'])
    expect(backgroundUrls("url('a.gif'), url(b.webp)")).toEqual(['a.gif', 'b.webp'])
    expect(backgroundUrls('none')).toEqual([])
    expect(backgroundUrls(null)).toEqual([])
  })

  it('fundo animado (cartão da chamada, banner): congela e devolve como estava', async () => {
    const freezer = createImageFreezer(async () => 'blob:parado', () => true)
    const fromCss = document.createElement('span')
    const inline = document.createElement('div')
    inline.style.backgroundImage = `url("${GIF}")`
    const plain = document.createElement('div')
    document.body.append(fromCss, inline, plain)
    const computed = new Map<HTMLElement, string>([[fromCss, `url("${GIF}")`], [inline, `url("${GIF}")`], [plain, 'none']])

    await freezer.freezeBackgrounds([fromCss, inline, plain], (el) => computed.get(el) || 'none')
    expect(fromCss.style.backgroundImage).toContain('blob:parado')
    expect(fromCss.style.getPropertyPriority('background-image')).toBe('important')
    expect(inline.style.backgroundImage).toContain('blob:parado')
    expect(plain.style.backgroundImage).toBe('')

    freezer.restore()
    expect(fromCss.style.backgroundImage).toBe('')
    expect(inline.style.backgroundImage).toContain('a.gif')
    expect(inline.style.getPropertyPriority('background-image')).toBe('')
  })

  it('trocaram o fundo enquanto estava congelado: ao voltar vale o novo', async () => {
    const freezer = createImageFreezer(async () => 'blob:parado', () => true)
    const el = document.createElement('div')
    document.body.append(el)
    await freezer.freezeBackgrounds([el], () => `url("${GIF}")`)

    el.style.backgroundImage = 'url("https://exemplo.test/novo.png")'
    freezer.restore()
    expect(el.style.backgroundImage).toContain('novo.png')
  })

  it('trocaram a imagem enquanto estava congelada: o quadro velho sai', async () => {
    const freezer = createImageFreezer(async (url) => (url.endsWith('.gif') ? `blob:${url}` : null), () => true)
    const img = image(GIF)
    await freezer.freeze([img])
    expect(img.style.content).toContain('a.gif')

    img.src = 'https://exemplo.test/avatars/novo.png'
    await freezer.freeze([img])
    expect(img.style.content).toBe('')

    img.src = 'https://exemplo.test/avatars/b.gif'
    await freezer.freeze([img])
    expect(img.style.content).toContain('b.gif')
  })
})
