import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useHoverPeek } from '../useHoverPeek'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

function Probe() {
  const [pinned, setPinned] = useState(false)
  const peek = useHoverPeek(pinned, setPinned)
  return (
    <div>
      <button id="btn" {...peek.triggerProps}>botão</button>
      <div id="panel" {...peek.panelProps} />
      <span id="state">{`${peek.visible ? 'visible' : 'hidden'}|${peek.peek ? 'peek' : 'nopeek'}|${pinned ? 'pinned' : 'free'}`}</span>
    </div>
  )
}

describe('useHoverPeek', () => {
  let container: HTMLDivElement
  const state = () => container.querySelector('#state')!.textContent
  const fire = (selector: string, type: string) =>
    act(() => {
      container.querySelector(selector)!.dispatchEvent(new MouseEvent(type, { bubbles: true }))
    })
  const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    act(() => { createRoot(container).render(<Probe />) })
  })
  afterEach(() => {
    vi.useRealTimers()
    container.remove()
  })

  it('passar o mouse espia depois de um instante e tirar o mouse fecha', () => {
    fire('#btn', 'mouseover')
    expect(state()).toBe('hidden|nopeek|free')
    wait(160)
    expect(state()).toBe('visible|peek|free')
    fire('#btn', 'mouseout')
    wait(700)
    expect(state()).toBe('hidden|nopeek|free')
  })

  it('passar de raspão (sai antes do atraso) não abre', () => {
    fire('#btn', 'mouseover')
    wait(60)
    fire('#btn', 'mouseout')
    wait(400)
    expect(state()).toBe('hidden|nopeek|free')
  })

  it('a espiada continua enquanto o mouse está na janela', () => {
    fire('#btn', 'mouseover')
    wait(160)
    fire('#btn', 'mouseout')
    fire('#panel', 'mouseover')
    wait(500)
    expect(state()).toBe('visible|peek|free')
    fire('#panel', 'mouseout')
    wait(700)
    expect(state()).toBe('hidden|nopeek|free')
  })

  it('clicar fixa a janela, e ela segue aberta depois que o mouse sai', () => {
    fire('#btn', 'mouseover')
    wait(160)
    act(() => { (container.querySelector('#btn') as HTMLElement).click() })
    expect(state()).toBe('visible|nopeek|pinned')
    fire('#btn', 'mouseout')
    wait(500)
    expect(state()).toBe('visible|nopeek|pinned')
  })

  it('clicar de novo solta, e a janela não reabre sozinha com o mouse ainda no botão', () => {
    act(() => { (container.querySelector('#btn') as HTMLElement).click() })
    expect(state()).toBe('visible|nopeek|pinned')
    fire('#btn', 'mouseover')
    act(() => { (container.querySelector('#btn') as HTMLElement).click() })
    expect(state()).toBe('hidden|nopeek|free')
    fire('#btn', 'mouseover')
    wait(400)
    expect(state()).toBe('hidden|nopeek|free')
    // sai e volta: aí espia de novo
    fire('#btn', 'mouseout')
    fire('#btn', 'mouseover')
    wait(160)
    expect(state()).toBe('visible|peek|free')
  })
})
