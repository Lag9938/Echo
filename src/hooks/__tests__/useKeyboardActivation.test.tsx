import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { enhanceKeyboardTarget, handleKeyboardActivation, useKeyboardActivation } from '../useKeyboardActivation'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

function Probe({ onOpen, onInner }: { onOpen: () => void; onInner: () => void }) {
  useKeyboardActivation()
  return (
    <div>
      <div className="friend-card-modern" id="card" onClick={onOpen}>
        Kauê
        <button type="button" id="inner" onClick={(e) => { e.stopPropagation(); onInner() }}>Mensagem</button>
      </div>
      <div className="not-listed" id="plain" onClick={onOpen}>sem teclado</div>
    </div>
  )
}

describe('ativador de teclado', () => {
  let container: HTMLDivElement
  let root: Root
  const onOpen = vi.fn()
  const onInner = vi.fn()

  beforeEach(() => {
    onOpen.mockClear()
    onInner.mockClear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root.render(<Probe onOpen={onOpen} onInner={onInner} />))
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const key = (selector: string, k: string) =>
    act(() => {
      container.querySelector(selector)!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
    })

  it('deixa o cartão alcançável por Tab e o anuncia como botão', () => {
    const card = container.querySelector('#card')!
    expect(card.getAttribute('tabindex')).toBe('0')
    expect(card.getAttribute('role')).toBe('button')
  })

  it('não mexe no que não está na lista', () => {
    expect(container.querySelector('#plain')!.hasAttribute('tabindex')).toBe(false)
  })

  it('Enter e Espaço no cartão disparam o clique', () => {
    key('#card', 'Enter')
    key('#card', ' ')
    expect(onOpen).toHaveBeenCalledTimes(2)
  })

  it('outras teclas não fazem nada', () => {
    key('#card', 'a')
    key('#card', 'Tab')
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('Enter num botão dentro do cartão aciona o botão e não o cartão', () => {
    key('#inner', 'Enter')
    // o navegador cuida do Enter em botões; o ativador não pode ter clicado no cartão
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('cartões que aparecem depois também ganham teclado', async () => {
    await act(async () => {
      const late = document.createElement('div')
      late.className = 'dm-list-item'
      container.appendChild(late)
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    })
    const late = container.querySelector('.dm-list-item')!
    expect(late.getAttribute('tabindex')).toBe('0')
  })

  it('o Espaço não rola a página (o evento é cancelado)', () => {
    const e = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    act(() => { container.querySelector('#card')!.dispatchEvent(e) })
    expect(e.defaultPrevented).toBe(true)
  })
})

describe('enhanceKeyboardTarget', () => {
  it('respeita tabindex e role já definidos', () => {
    const el = document.createElement('div')
    el.className = 'echo-shop-card'
    el.setAttribute('tabindex', '-1')
    el.setAttribute('role', 'option')
    enhanceKeyboardTarget(el)
    expect(el.getAttribute('tabindex')).toBe('-1')
    expect(el.getAttribute('role')).toBe('option')
  })

  it('ignora controles nativos mesmo com a classe da lista', () => {
    const el = document.createElement('button')
    el.className = 'echo-shop-card'
    enhanceKeyboardTarget(el)
    expect(el.hasAttribute('role')).toBe(false)
  })
})

describe('handleKeyboardActivation', () => {
  it('ignora combinações com Ctrl/Alt/Meta', () => {
    const el = document.createElement('div')
    el.className = 'friend-card-modern'
    document.body.appendChild(el)
    const click = vi.fn()
    el.addEventListener('click', click)
    handleKeyboardActivation(Object.assign(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }), { }))
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }))
    expect(click).not.toHaveBeenCalled()
    el.remove()
  })
})
