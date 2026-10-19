import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { UnifiedUserProfileFooter } from '../UnifiedUserProfileFooter'
import type { FooterCallControls } from '../UnifiedUserProfileFooter'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

function makeCall(overrides: Partial<FooterCallControls> = {}): FooterCallControls {
  return {
    channelName: 'Sala principal',
    elapsed: '0:42',
    isReconnecting: false,
    isViewingCall: false,
    isMuted: false,
    isDeafened: false,
    onToggleMute: vi.fn(),
    onToggleDeafen: vi.fn(),
    onLeave: vi.fn(),
    onReturn: vi.fn(),
    ...overrides
  }
}

function renderFooter(call?: FooterCallControls | null): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    createRoot(container).render(
      <UnifiedUserProfileFooter
        displayName="Igor"
        presenceStatus="online"
        updatePresenceStatus={() => {}}
        call={call}
      />
    )
  })
  return container
}

const click = (el: Element | null) => act(() => { (el as HTMLElement).click() })

describe('rodapé do perfil com chamada', () => {
  it('sem chamada não desenha o painel e mostra o status de presença', () => {
    const c = renderFooter(null)
    expect(c.querySelector('.profile-call-popover')).toBeNull()
    expect(c.querySelector('.sidebar-profile-footer.has-call')).toBeNull()
    expect(c.querySelector('.profile-footer-sub-status')?.textContent).toBe('Online')
  })

  it('na chamada mostra a sala no status e o painel com mutar, silenciar e sair', () => {
    const call = makeCall()
    const c = renderFooter(call)
    expect(c.querySelector('.sidebar-profile-footer.has-call')).not.toBeNull()
    expect(c.querySelector('.profile-footer-sub-status')?.textContent).toContain('Na chamada · Sala principal')

    const toggles = c.querySelectorAll('.profile-call-toggle')
    expect(toggles).toHaveLength(2)
    click(toggles[0])
    click(toggles[1])
    click(c.querySelector('.profile-call-leave'))
    expect(call.onToggleMute).toHaveBeenCalledTimes(1)
    expect(call.onToggleDeafen).toHaveBeenCalledTimes(1)
    expect(call.onLeave).toHaveBeenCalledTimes(1)
  })

  it('mostra o estado mutado e silenciado nos botões', () => {
    const c = renderFooter(makeCall({ isMuted: true, isDeafened: true }))
    const toggles = c.querySelectorAll('.profile-call-toggle')
    expect(toggles[0].classList.contains('is-off')).toBe(true)
    expect(toggles[0].textContent).toBe('Mutado')
    expect(toggles[1].classList.contains('is-off')).toBe(true)
    expect(toggles[1].textContent).toBe('Silenciado')
  })

  it('fora da sala oferece voltar à chamada; dentro dela o cabeçalho não é clicável', () => {
    const outside = makeCall({ isViewingCall: false })
    const c1 = renderFooter(outside)
    click(c1.querySelector('.profile-call-head'))
    expect(outside.onReturn).toHaveBeenCalledTimes(1)
    expect(c1.querySelector('.profile-call-title small')?.textContent).toBe('Voltar à chamada ›')

    const inside = makeCall({ isViewingCall: true })
    const c2 = renderFooter(inside)
    const head = c2.querySelector('.profile-call-head') as HTMLButtonElement
    expect(head.disabled).toBe(true)
    expect(c2.querySelector('.profile-call-title small')?.textContent).toBe('Você está nesta sala')
  })

  it('soundboard e mini player só aparecem quando a barra os recebe', () => {
    const onOpenSoundboard = vi.fn()
    const onTogglePiP = vi.fn()
    const c = renderFooter(makeCall({ onOpenSoundboard, onTogglePiP }))
    const toggles = c.querySelectorAll('.profile-call-toggle')
    expect(toggles).toHaveLength(4)
    click(toggles[2])
    click(toggles[3])
    expect(onOpenSoundboard).toHaveBeenCalledTimes(1)
    expect(onTogglePiP).toHaveBeenCalledTimes(1)
  })

  it('mostra o modo apertar-para-falar e o estado reconectando, sem a linha de ping', () => {
    const c = renderFooter(makeCall({
      rtcStats: { ping: 24, jitter: 3, packetLoss: 0 },
      connectionQuality: 'good',
      pttLabel: 'PTT: [V]',
      isReconnecting: true
    }))
    // O painel ficou enxuto: ping, jitter e perda não aparecem mais
    expect(c.querySelector('.profile-call-quality')).toBeNull()
    expect(c.textContent).not.toContain('jitter')
    expect(c.querySelector('.profile-call-ptt')?.textContent).toBe('PTT: [V]')
    expect(c.querySelector('.profile-footer-sub-status')?.textContent).toBe('Reconectando…')
    expect(c.querySelector('.profile-call-dot.reconnecting')).not.toBeNull()
  })

  it('usa apenas a faixa horizontal de status (sem o antigo modal 2x2 duplicado nem tooltip nativo)', () => {
    const updatePresenceStatus = vi.fn()
    const setShowStatusMenu = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    act(() => {
      createRoot(container).render(
        <UnifiedUserProfileFooter
          displayName="Igor"
          presenceStatus="online"
          showStatusMenu={true}
          setShowStatusMenu={setShowStatusMenu}
          updatePresenceStatus={updatePresenceStatus}
          call={null}
        />
      )
    })

    expect(container.querySelector('.status-picker-popover')).toBeNull()
    expect(container.querySelector('.profile-footer-info')?.getAttribute('title')).toBeNull()
    const radios = container.querySelectorAll('.profile-call-status-btn')
    expect(radios).toHaveLength(4)
    click(radios[2]) // dnd
    expect(updatePresenceStatus).toHaveBeenCalledWith('dnd')
    expect(setShowStatusMenu).toHaveBeenCalledWith(false)
  })
})

