import { describe, it, expect } from 'vitest'
import { withDayDividers } from '../ChatDateDivider'

const at = (iso: string, id: string) => ({ id, created_at: iso })

describe('data nas conversas diretas e nos grupos', () => {
  it('põe um marcador antes da primeira mensagem de cada dia, e só um por dia', () => {
    const entries = withDayDividers([
      at('2026-10-09T14:23:00', 'a'),
      at('2026-10-09T14:58:00', 'b'),
      at('2026-10-10T12:16:00', 'c'),
      at('2026-10-10T12:44:00', 'd')
    ])
    expect(entries.map((e) => (e.kind === 'day' ? 'DIA' : e.message.id))).toEqual(['DIA', 'a', 'b', 'DIA', 'c', 'd'])
    const days = entries.filter((e) => e.kind === 'day')
    expect(new Set(days.map((e) => e.kind === 'day' && e.key)).size).toBe(2)
  })

  it('conversa vazia não ganha marcador; mensagem com data inválida não quebra', () => {
    expect(withDayDividers([])).toEqual([])
    const entries = withDayDividers([at('data ruim', 'x'), at('2026-10-10T12:00:00', 'y')])
    expect(entries.map((e) => (e.kind === 'day' ? 'DIA' : e.message.id))).toEqual(['x', 'DIA', 'y'])
  })
})
