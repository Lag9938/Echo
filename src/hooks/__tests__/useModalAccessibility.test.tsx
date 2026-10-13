import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useModalAccessibility } from '../useModalAccessibility'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

function Probe() {
  useModalAccessibility()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button id="opener" type="button" onClick={() => setOpen(true)}>Abrir</button>
      {open && (
        <div className="invite-backdrop">
          <div className="invite-modal">
            <h2>Adicionar amigo</h2>
            <input id="first" />
            <button id="middle" type="button">Meio</button>
            <button id="last" type="button" onClick={() => setOpen(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}

const frame = () => act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))) })

describe('acessibilidade dos modais', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root.render(<Probe />))
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const open = async () => {
    const opener = container.querySelector('#opener') as HTMLButtonElement
    opener.focus()
    act(() => opener.click())
    await frame()
  }
  const tab = (shift = false) =>
    act(() => {
      ;(document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true }))
    })

  it('anuncia o diálogo, com o nome vindo do título', async () => {
    await open()
    const dialog = container.querySelector('.invite-modal')!
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const id = dialog.getAttribute('aria-labelledby')!
    expect(container.querySelector(`#${id}`)?.textContent).toBe('Adicionar amigo')
  })

  it('leva o foco para dentro quando abre', async () => {
    await open()
    expect(document.activeElement?.id).toBe('first')
  })

  it('o Tab gira dentro do modal: do último volta ao primeiro, e Shift+Tab do primeiro vai ao último', async () => {
    await open()
    ;(container.querySelector('#last') as HTMLElement).focus()
    tab()
    expect(document.activeElement?.id).toBe('first')
    tab(true)
    expect(document.activeElement?.id).toBe('last')
  })

  it('devolve o foco a quem abriu quando o modal fecha', async () => {
    await open()
    act(() => (container.querySelector('#last') as HTMLButtonElement).click())
    await frame()
    expect(container.querySelector('.invite-modal')).toBeNull()
    expect(document.activeElement?.id).toBe('opener')
  })
})
