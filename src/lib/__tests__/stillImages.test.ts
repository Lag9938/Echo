import { afterEach, describe, expect, it } from 'vitest'
import { installStillImages, isAvatarImage, isGifSource } from '../stillImages'

const STILL = 'data:image/png;base64,AAAA'
const GIF = 'https://cdn.example.com/avatars/u1.gif?v=2'

function mount(html: string): HTMLImageElement {
  document.body.innerHTML = html
  return document.body.querySelector('img') as HTMLImageElement
}
const tick = () => new Promise((r) => setTimeout(r, 0))

describe('stillImages', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('reconhece GIF pelo endereço', () => {
    expect(isGifSource(GIF)).toBe(true)
    expect(isGifSource('https://x/a.GIF#t')).toBe(true)
    expect(isGifSource('data:image/gif;base64,R0lG')).toBe(true)
    expect(isGifSource('https://x/a.webp')).toBe(false)
    expect(isGifSource('blob:abc')).toBe(false)
    expect(isGifSource(null)).toBe(false)
  })

  it('só trata imagem de avatar, não GIF de mensagem', () => {
    const avatar = mount('<div class="echo-avatar-core"><img src="a.gif"></div>')
    expect(isAvatarImage(avatar)).toBe(true)
    const msg = mount('<div class="message-attachment"><img src="a.gif"></div>')
    expect(isAvatarImage(msg)).toBe(false)
  })

  it('congela o avatar pequeno, anima com o mouse e congela de novo ao sair', async () => {
    const img = mount(`<div class="member-avatar"><img src="${GIF}"></div>`)
    const stop = installStillImages(document, { snapshot: async () => STILL, sizeOf: () => 40 })
    img.dispatchEvent(new Event('load'))
    await tick()
    expect(img.src).toBe(STILL)
    expect(img.dataset.echoOriginal).toBe(GIF)

    img.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(img.src).toBe(GIF)

    // o GIF restaurado dispara `load`: não pode congelar outra vez com o mouse em cima
    img.dispatchEvent(new Event('load'))
    await tick()
    expect(img.src).toBe(GIF)

    img.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
    await tick()
    expect(img.src).toBe(STILL)
    stop()
    expect(img.src).toBe(GIF)
  })

  it('deixa avatar grande animando', async () => {
    const img = mount(`<div class="profile-avatar"><img src="${GIF}"></div>`)
    const stop = installStillImages(document, { snapshot: async () => STILL, sizeOf: () => 128 })
    img.dispatchEvent(new Event('load'))
    await tick()
    expect(img.src).toBe(GIF)
    stop()
  })

  it('sem quadro (sem CORS) deixa o GIF como está', async () => {
    const img = mount(`<div class="member-avatar"><img src="${GIF}"></div>`)
    const stop = installStillImages(document, { snapshot: async () => null, sizeOf: () => 40 })
    img.dispatchEvent(new Event('load'))
    await tick()
    expect(img.src).toBe(GIF)
    stop()
  })
})
