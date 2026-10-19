import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ProfileEffect } from '../ProfileEffect'
import { getProfileVideoEffect, listProfileVideoEffects, registerProfileVideoEffect } from '../../lib/profileVideoEffects'
import { PROFILE_EFFECTS } from '../ProfileEffect'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// Os testes registram um efeito de mentira para não depender do vídeo real
const FX = 'teste_cartao'

describe('registro dos efeitos de perfil em vídeo', () => {
  it('o Jardim de Sakura está registrado e na Loja (Efeitos de Perfil) com o mesmo id', () => {
    const fx = getProfileVideoEffect('sakura_garden')
    expect(fx?.src).toMatch(/\.mp4/)
    expect(PROFILE_EFFECTS.find((e) => e.id === 'sakura_garden')?.name).toBe('Jardim de Sakura')
  })

  it('todo efeito em vídeo registrado de fábrica tem metadado na Loja (senão ninguém consegue equipá-lo)', () => {
    const ids = new Set(PROFILE_EFFECTS.map((e) => e.id))
    for (const fx of listProfileVideoEffects().filter((e) => e.id !== 'teste_cartao')) expect(ids.has(fx.id), fx.id).toBe(true)
  })

  it('ids vazios, "none" e desconhecidos não são vídeo', () => {
    expect(getProfileVideoEffect(undefined)).toBeNull()
    expect(getProfileVideoEffect(null)).toBeNull()
    expect(getProfileVideoEffect('none')).toBeNull()
    expect(getProfileVideoEffect('efeito_que_nao_existe')).toBeNull()
  })

  it('os efeitos que eram em canvas agora são vídeo (inclusive o de fábrica, echo_resonance)', () => {
    expect(getProfileVideoEffect('echo_resonance')?.src).toMatch(/\.mp4/)
  })

  it('dá para registrar um efeito novo (é assim que se acrescenta o próximo)', () => {
    registerProfileVideoEffect({ id: FX, name: 'Teste', src: '/x.mp4' })
    expect(getProfileVideoEffect(FX)?.src).toBe('/x.mp4')
    expect(listProfileVideoEffects().some((e) => e.id === FX)).toBe(true)
  })
})

describe('ProfileEffect com efeito em vídeo', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    registerProfileVideoEffect({ id: FX, name: 'Teste', src: '/x.mp4' })
    document.body.className = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    // o happy-dom não toca vídeo
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve()) as any
    HTMLMediaElement.prototype.pause = vi.fn() as any
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    document.body.className = ''
  })

  const render = (id: string | null) => act(() => root.render(<ProfileEffect effectId={id} />))

  it('um id de vídeo renderiza um <video> em laço, mudo e playsInline, que toca quando está visível', () => {
    render(FX)
    const video = container.querySelector('video')!
    expect(video).not.toBeNull()
    // (no happy-dom algumas propriedades do <video> não existem, então conferimos o que o React escreve no elemento)
    // quem liga e desliga o vídeo é o componente (só toca visível), não o atributo autoplay
    expect(video.hasAttribute('autoplay')).toBe(false)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(video.hasAttribute('loop')).toBe(true)
    expect(video.hasAttribute('playsinline')).toBe(true)
    expect(video.muted).toBe(true)
    expect(video.getAttribute('src')).toBe('/x.mp4')
    expect(video.className).toContain('profile-video-effect')
    // o vídeo é decoração: fora da árvore de acessibilidade e sem foco
    expect(video.getAttribute('aria-hidden')).toBe('true')
    expect(video.tabIndex).toBe(-1)
  })

  it('o vídeo vai direto no cartão, sem o contêiner de z-index 1 (senão o z-index 30 ficaria preso)', () => {
    render(FX)
    expect(container.querySelector('.profile-effect-container')).toBeNull()
    expect(container.firstElementChild?.tagName).toBe('VIDEO')
  })

  it('id sem vídeo registrado cai no efeito em canvas e não gera vídeo', () => {
    render('efeito_que_nao_existe')
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('.profile-effect-container')).not.toBeNull()
  })

  it('sem efeito ou "none" não renderiza nada', () => {
    render(null)
    expect(container.innerHTML).toBe('')
    render('none')
    expect(container.innerHTML).toBe('')
  })

  it('com "reduzir movimento" ligado não toca o vídeo', () => {
    document.body.classList.add('reduce-motion')
    render(FX)
    expect(container.querySelector('video')).toBeNull()
  })

  it('"movimento completo" toca o vídeo mesmo se o sistema pedir menos movimento', () => {
    document.body.classList.add('motion-full')
    render(FX)
    expect(container.querySelector('video')).not.toBeNull()
  })
})