import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { StreamBarPeople, splitStreamBarPeople, type StreamBarPerson } from '../StreamBarPeople'

const person = (i: number, extra: Partial<StreamBarPerson> = {}): StreamBarPerson => ({
  id: `u${i}`,
  name: `Pessoa ${i}`,
  isSpeaking: false,
  face: <span>{i}</span>,
  ...extra
})

describe('rostos na barra da transmissão', () => {
  it('até 5 pessoas mostra todas (um "+1" ocuparia o mesmo espaço)', () => {
    expect(splitStreamBarPeople([1, 2, 3, 4, 5])).toEqual({ shown: [1, 2, 3, 4, 5], hidden: [] })
  })

  it('com 6 ou mais mostra 4 e o resto vai para o "+N", na mesma ordem', () => {
    const { shown, hidden } = splitStreamBarPeople([1, 2, 3, 4, 5, 6, 7])
    expect(shown).toEqual([1, 2, 3, 4])
    expect(hidden).toEqual([5, 6, 7])
  })

  it('o "+N" acende quando alguém escondido fala e abre a lista completa', () => {
    const onClick = vi.fn()
    const people = Array.from({ length: 9 }, (_, i) => person(i, i === 7 ? { isSpeaking: true, onClick } : {}))
    const { container, getByText } = render(<StreamBarPeople people={people} />)

    expect(container.querySelectorAll('.stream-bar-people > .stream-bar-face')).toHaveLength(4)
    const more = getByText('+5')
    expect(more.className).toContain('speaking')

    fireEvent.click(more)
    const rows = container.querySelectorAll('.stream-bar-people-row')
    expect(rows).toHaveLength(9)
    fireEvent.click(rows[7])
    expect(onClick).toHaveBeenCalledTimes(1)
    // Escolher alguém fecha a lista
    expect(container.querySelector('.stream-bar-people-list')).toBeNull()
  })

  it('sem ninguém escondido falando, o "+N" fica sem anel', () => {
    const { getByText } = render(<StreamBarPeople people={Array.from({ length: 7 }, (_, i) => person(i, i === 0 ? { isSpeaking: true } : {}))} />)
    expect(getByText('+3').className).not.toContain('speaking')
  })
})
