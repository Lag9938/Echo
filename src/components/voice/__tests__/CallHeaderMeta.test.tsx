import { describe, it, expect, beforeEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { ConnectionPill, formatCallClock, peopleLabel } from '../CallHeaderMeta'
import { useCallStatsStore } from '../../../stores/useCallStatsStore'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

function renderPill(): HTMLElement {
  const container = document.createElement('div')
  act(() => { createRoot(container).render(<ConnectionPill />) })
  return container
}

describe('formatCallClock', () => {
  it('formata minutos e horas', () => {
    expect(formatCallClock(0)).toBe('0:00')
    expect(formatCallClock(64)).toBe('1:04')
    expect(formatCallClock(5064)).toBe('1:24:24')
    expect(formatCallClock(-5)).toBe('0:00')
  })
})

describe('peopleLabel', () => {
  it('usa singular e plural', () => {
    expect(peopleLabel(1)).toBe('1 pessoa')
    expect(peopleLabel(5)).toBe('5 pessoas')
  })
})

describe('ConnectionPill', () => {
  beforeEach(() => useCallStatsStore.getState().reset())

  it('mostra "Boa" com a latência medida', () => {
    useCallStatsStore.getState().setStats({ ping: 38, jitter: 4, packetLoss: 0 })
    const pill = renderPill().querySelector('.conn-pill')!
    expect(pill.className).toContain('good')
    expect(pill.textContent).toContain('Boa')
    expect(pill.textContent).toContain('38 ms')
  })

  it('mostra "Instável" quando o LiveKit avisa de rede ruim, mesmo com medição boa', () => {
    useCallStatsStore.getState().setStats({ ping: 30, jitter: 3, packetLoss: 0 })
    useCallStatsStore.getState().setUnstable(true)
    expect(renderPill().textContent).toContain('Instável')
  })

  it('mostra "Ruim" com perda alta de pacotes', () => {
    useCallStatsStore.getState().setStats({ ping: 60, jitter: 10, packetLoss: 12 })
    const pill = renderPill().querySelector('.conn-pill')!
    expect(pill.className).toContain('poor')
    expect(pill.textContent).toContain('Ruim')
  })
})
