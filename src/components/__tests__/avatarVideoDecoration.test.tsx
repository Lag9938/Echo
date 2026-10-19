import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AvatarDecoration, AVATAR_DECORATIONS } from '../AvatarDecoration'
import { getAvatarVideoDecoration, videoWidthPercent } from '../../lib/avatarVideoDecorations'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

describe('decoração de avatar em vídeo (Sakura Cinematográfico)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    document.body.className = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve()) as any
    HTMLMediaElement.prototype.pause = vi.fn() as any
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    document.body.className = ''
  })

  it('está na lista de DECORAÇÕES de avatar (e não na de efeitos de perfil), com o mesmo id do registro', () => {
    const meta = AVATAR_DECORATIONS.find((d) => d.id === 'sakura_ring')
    expect(meta?.name).toBe('Sakura Cinematográfico')
    expect(getAvatarVideoDecoration('sakura_ring')?.src).toMatch(/\.webm/)
  })

  it('toda decoração em vídeo registrada tem metadado na Loja, e toda uma delas renderiza o <video>', () => {
    for (const id of ['sakura_ring', 'fox_spirit', 'frost_ring', 'dragon_ring']) {
      expect(AVATAR_DECORATIONS.some((d) => d.id === id), id).toBe(true)
      act(() => root.render(<AvatarDecoration decorationId={id} />))
      expect(container.querySelector('video.avatar-video-decoration'), id).not.toBeNull()
    }
  })

  it('Espírito da Raposa: miolo do anel de 61,5% da largura, centrado no vídeo', () => {
    const deco = getAvatarVideoDecoration('fox_spirit')!
    expect(deco.hole).toBeCloseTo(0.615, 3)
    expect(deco.center).toEqual({ x: 0.5, y: 0.5 })
    expect(videoWidthPercent(deco)).toBeCloseTo((1.04 / 0.615 / 1.56) * 100, 3)
  })

  it('Anel de Gelo: miolo de 77% da largura, centrado no vídeo', () => {
    const deco = getAvatarVideoDecoration('frost_ring')!
    expect(deco.hole).toBeCloseTo(0.77, 3)
    expect(deco.center).toEqual({ x: 0.5, y: 0.5 })
    expect(videoWidthPercent(deco)).toBeCloseTo((1.04 / 0.77 / 1.56) * 100, 3)
  })

  it('Dragão de Fogo: miolo de 73% da largura (o avatar fica sob o fogo), centrado no vídeo', () => {
    const deco = getAvatarVideoDecoration('dragon_ring')!
    expect(deco.hole).toBeCloseTo(0.73, 3)
    expect(deco.center).toEqual({ x: 0.5, y: 0.5 })
    expect(videoWidthPercent(deco)).toBeCloseTo((1.04 / 0.73 / 1.56) * 100, 3)
  })

  it('ids que não são de vídeo não são reconhecidos', () => {
    expect(getAvatarVideoDecoration('neko_cyber')).toBeNull()
    expect(getAvatarVideoDecoration(null)).toBeNull()
    expect(getAvatarVideoDecoration('none')).toBeNull()
  })

  it('o miolo do anel fica do tamanho do avatar: o vídeo mede miolo-escala / miolo / 1,56 da caixa da decoração', () => {
    const deco = getAvatarVideoDecoration('sakura_ring')!
    // avatar = 1/1,56 da caixa; miolo do vídeo = 54,3% da largura; folga de 4%
    expect(videoWidthPercent(deco)).toBeCloseTo((1.04 / 0.543 / 1.56) * 100, 3)
  })

  it('renderiza o <video> dentro da caixa de decoração, centrado no anel, sem pegar clique', () => {
    act(() => root.render(<AvatarDecoration decorationId="sakura_ring" />))
    const wrap = container.querySelector('.echo-avatar-decoration-wrap.deco-sakura_ring')!
    expect(wrap).not.toBeNull()
    const video = wrap.querySelector('video')!
    expect(video.className).toContain('avatar-video-decoration')
    expect(video.hasAttribute('loop')).toBe(true)
    expect(video.muted).toBe(true)
    expect(video.getAttribute('aria-hidden')).toBe('true')
    expect(parseFloat(video.style.width)).toBeCloseTo(videoWidthPercent(getAvatarVideoDecoration('sakura_ring')!), 2)
    // o centro do anel (49,9% / 50%) é puxado para o centro da caixa
    expect(video.style.transform).toContain('-49.9%')
    expect((wrap as HTMLElement).style.pointerEvents).toBe('none')
  })

  it('com "reduzir movimento" o vídeo não começa a tocar (fica num quadro parado)', () => {
    document.body.classList.add('reduce-motion')
    act(() => root.render(<AvatarDecoration decorationId="sakura_ring" />))
    const video = container.querySelector('video')!
    expect(video.hasAttribute('autoplay')).toBe(false)
  })
})