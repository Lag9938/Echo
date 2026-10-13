import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { FloatingCallPanel, shouldShowFloatingCall, type FloatingCallPanelProps } from '../FloatingCallPanel'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

describe('shouldShowFloatingCall', () => {
  const base = { isConnected: true, activeVoiceChannelId: 'v1', page: 'Amigos', selectedChannelId: 't1' }

  it('aparece quando há chamada e a pessoa está em outra tela', () => {
    expect(shouldShowFloatingCall(base)).toBe(true)
    expect(shouldShowFloatingCall({ ...base, page: 'Configurações' })).toBe(true)
    // nos servidores, mas olhando um canal de texto
    expect(shouldShowFloatingCall({ ...base, page: 'Servidores', selectedChannelId: 't1' })).toBe(true)
  })

  it('some quando a pessoa já está na tela da chamada', () => {
    expect(shouldShowFloatingCall({ ...base, page: 'Servidores', selectedChannelId: 'v1' })).toBe(false)
  })

  it('não aparece sem chamada conectada', () => {
    expect(shouldShowFloatingCall({ ...base, isConnected: false })).toBe(false)
    expect(shouldShowFloatingCall({ ...base, activeVoiceChannelId: null })).toBe(false)
  })

  it('um canal de voz aberto em OUTRA sala não esconde o painel (a chamada é a outra)', () => {
    expect(shouldShowFloatingCall({ ...base, page: 'Servidores', selectedChannelId: 'v2' })).toBe(true)
  })
})

describe('FloatingCallPanel', () => {
  let container: HTMLDivElement
  let root: Root
  const handlers = { onToggleMute: vi.fn(), onToggleDeafen: vi.fn(), onLeave: vi.fn(), onReturn: vi.fn() }

  const people = [
    { userId: 'me', displayName: 'teste', isSpeaking: false },
    { userId: 'u2', displayName: 'Kauê', isSpeaking: true },
    { userId: 'u3', displayName: 'Bia', isSpeaking: false, isMuted: true }
  ]

  const render = (props: Partial<FloatingCallPanelProps> = {}) => {
    act(() => {
      root.render(
        <FloatingCallPanel
          channelName="Sala principal"
          spaceName="Amigos da Madrugada"
          participants={people}
          currentUserId="me"
          isMuted={false}
          isDeafened={false}
          {...handlers}
          {...props}
        />
      )
    })
  }
  const click = (selector: string) => act(() => { (container.querySelector(selector) as HTMLElement).click() })

  beforeEach(() => {
    localStorage.clear()
    Object.values(handlers).forEach((fn) => fn.mockClear())
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('mostra a sala, o espaço e quem está falando', () => {
    render()
    expect(container.textContent).toContain('Sala principal')
    expect(container.textContent).toContain('Amigos da Madrugada')
    expect(container.textContent).toContain('Kauê está falando')
    expect(container.querySelectorAll('.fcp-avatar.is-speaking')).toHaveLength(1)
  })

  it('diz "Ninguém falando agora" quando ninguém fala, e "Você está falando" quando só a própria pessoa fala', () => {
    render({ participants: people.map((p) => ({ ...p, isSpeaking: false })) })
    expect(container.textContent).toContain('Ninguém falando agora')
    render({ participants: [{ userId: 'me', displayName: 'teste', isSpeaking: true }, people[1] && { ...people[1], isSpeaking: false }] })
    expect(container.textContent).toContain('Você está falando')
  })

  it('quem está mutado não conta como falando', () => {
    render({ participants: [{ userId: 'u3', displayName: 'Bia', isSpeaking: true, isMuted: true }] })
    expect(container.textContent).toContain('Ninguém falando agora')
  })

  it('os botões chamam mutar, ensurdecer, voltar e sair, com nome acessível', () => {
    render()
    click('button[aria-label="Mutar microfone"]')
    click('button[aria-label="Parar de ouvir a chamada"]')
    click('.fcp-return-btn')
    click('button[aria-label="Sair da chamada"]')
    expect(handlers.onToggleMute).toHaveBeenCalledTimes(1)
    expect(handlers.onToggleDeafen).toHaveBeenCalledTimes(1)
    expect(handlers.onReturn).toHaveBeenCalledTimes(1)
    expect(handlers.onLeave).toHaveBeenCalledTimes(1)
  })

  it('o estado dos botões vai para quem usa leitor de tela (aria-pressed e rótulo)', () => {
    render({ isMuted: true, isDeafened: true })
    expect(container.querySelector('button[aria-label="Desmutar microfone"]')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('button[aria-label="Voltar a ouvir a chamada"]')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('mostra no máximo 5 rostos e um "+N" para o resto, com os falantes na frente', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ userId: `u${i}`, displayName: `Pessoa ${i}`, isSpeaking: i === 7 }))
    render({ participants: many })
    expect(container.querySelectorAll('.fcp-avatar')).toHaveLength(5)
    expect(container.querySelector('.fcp-more')?.textContent).toBe('+3')
    // o falante (o último da lista) vem primeiro na fileira
    expect(container.querySelector('.fcp-avatar')?.classList.contains('is-speaking')).toBe(true)
  })

  it('recolhe em pílula, lembra a escolha e expande de volta', () => {
    render()
    click('.fcp-collapse-btn')
    expect(container.querySelector('.floating-call-panel.is-collapsed')).not.toBeNull()
    expect(localStorage.getItem('echo-call-panel-collapsed')).toBe('1')
    // a pílula ainda deixa mutar sem expandir
    click('button[aria-label="Mutar microfone"]')
    expect(handlers.onToggleMute).toHaveBeenCalledTimes(1)
    click('.fcp-collapsed-main')
    expect(container.querySelector('.floating-call-panel.is-collapsed')).toBeNull()
    expect(localStorage.getItem('echo-call-panel-collapsed')).toBe('0')
  })

  it('abre já recolhido se foi assim que a pessoa deixou', () => {
    localStorage.setItem('echo-call-panel-collapsed', '1')
    render()
    expect(container.querySelector('.floating-call-panel.is-collapsed')).not.toBeNull()
  })

  it('é uma região nomeada para leitores de tela', () => {
    render()
    const region = container.querySelector('[role="region"]')
    expect(region?.getAttribute('aria-label')).toBe('Chamada de voz em andamento')
  })
})
