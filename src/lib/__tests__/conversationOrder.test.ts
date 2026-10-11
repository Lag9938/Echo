import { describe, it, expect } from 'vitest'
import { sortConversationsByName } from '../conversationOrder'

const conv = (id: string, display_name: string) => ({ id, display_name })

describe('ordem da lista de conversas diretas', () => {
  it('é alfabética, sem diferenciar maiúsculas nem acentos', () => {
    const sorted = sortConversationsByName([conv('1', 'lordking'), conv('2', 'Bag'), conv('3', 'Élden'), conv('4', 'castiel'), conv('5', 'FININ')])
    expect(sorted.map((c) => c.display_name)).toEqual(['Bag', 'castiel', 'Élden', 'FININ', 'lordking'])
  })

  it('não depende da ordem de entrada: clicar numa conversa não muda a lista', () => {
    const base = [conv('a', 'Lucão'), conv('b', 'elden'), conv('c', 'Bag')]
    // A conversa aberta entrava primeiro na lista; o resultado tem de ser o mesmo
    const withOpenedFirst = [base[2], base[0], base[1]]
    expect(sortConversationsByName(withOpenedFirst)).toEqual(sortConversationsByName(base))
  })

  it('nome salvo com espaço na frente não fura a fila', () => {
    const sorted = sortConversationsByName([conv('1', ' castiel'), conv('2', 'Bag'), conv('3', 'elden')])
    expect(sorted.map((c) => c.display_name.trim())).toEqual(['Bag', 'castiel', 'elden'])
  })

  it('nomes iguais ficam sempre na mesma ordem, e a lista original não é alterada', () => {
    const input = [conv('z', 'Ana'), conv('a', 'Ana')]
    expect(sortConversationsByName(input).map((c) => c.id)).toEqual(['a', 'z'])
    expect(input.map((c) => c.id)).toEqual(['z', 'a'])
  })
})
