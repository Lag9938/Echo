import { describe, it, expect } from 'vitest'
import { OFFLINE_PREVIEW_COUNT, shortGameDuration, visibleOfflineMembers } from '../MembersSidebar'

describe('lista de membros: offline recolhido', () => {
  const list = (n: number) => Array.from({ length: n }, (_, i) => i)

  it(`mostra os primeiros ${OFFLINE_PREVIEW_COUNT} e esconde o resto atrás do "Mostrar mais"`, () => {
    expect(visibleOfflineMembers(list(22), false, false)).toHaveLength(OFFLINE_PREVIEW_COUNT)
  })

  it('lista curta (até 2 a mais que a prévia) aparece inteira, sem botão para 1 ou 2 nomes', () => {
    expect(visibleOfflineMembers(list(OFFLINE_PREVIEW_COUNT + 2), false, false)).toHaveLength(OFFLINE_PREVIEW_COUNT + 2)
  })

  it('aberta ou com busca, mostra todos', () => {
    expect(visibleOfflineMembers(list(22), true, false)).toHaveLength(22)
    expect(visibleOfflineMembers(list(22), false, true)).toHaveLength(22)
  })
})

describe('lista de membros: duração do jogo', () => {
  it('escreve minutos por extenso e mantém as horas', () => {
    const now = Date.now()
    expect(shortGameDuration(now - 14 * 60_000)).toBe('14 min')
    expect(shortGameDuration(now - (2 * 60 + 5) * 60_000)).toBe('2h 5 min')
    expect(shortGameDuration(now - 3 * 60 * 60_000)).toBe('3h')
    expect(shortGameDuration(null)).toBe('')
  })
})
