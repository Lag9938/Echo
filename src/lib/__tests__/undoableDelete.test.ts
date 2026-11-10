import { describe, expect, it } from 'vitest'
import { insertByCreatedAt } from '../undoableDelete'

const m = (id: string, iso: string) => ({ id, created_at: iso })

describe('insertByCreatedAt', () => {
  const list = [m('a', '2026-01-01T10:00:00Z'), m('c', '2026-01-01T12:00:00Z')]

  it('põe a mensagem de volta no meio, pela data', () => {
    expect(insertByCreatedAt(list, m('b', '2026-01-01T11:00:00Z')).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
  it('a mais nova vai para o fim e a mais antiga para o começo', () => {
    expect(insertByCreatedAt(list, m('d', '2026-01-02T00:00:00Z')).map((x) => x.id)).toEqual(['a', 'c', 'd'])
    expect(insertByCreatedAt(list, m('z', '2025-12-31T00:00:00Z')).map((x) => x.id)).toEqual(['z', 'a', 'c'])
  })
  it('não duplica se já estiver na lista', () => {
    expect(insertByCreatedAt(list, m('a', '2026-01-01T10:00:00Z'))).toBe(list)
  })
})
