import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { WhatsNewModal, friendlyReleaseTitle, highlightTint } from '../WhatsNewModal'
import { CHANGELOG_DATA } from '../../lib/changelogData'

describe('janela de novidades (bilhete)', () => {
  it('tira o "Echo vX -" do título, sem mexer nas maiúsculas', () => {
    expect(friendlyReleaseTitle({ version: '0.62.8', title: 'Echo v0.62.8 - Quem Fala, Sem Pesar' })).toBe('Quem Fala, Sem Pesar')
    expect(friendlyReleaseTitle({ version: '0.1', title: 'Echo v0.1 Primeira' })).toBe('Primeira')
    expect(friendlyReleaseTitle({ version: '1', title: 'Só o título' })).toBe('Só o título')
  })

  it('cor do ícone pelo tipo da novidade', () => {
    expect(highlightTint('DESEMPENHO')).toContain('34, 197, 94')
    expect(highlightTint('NOVO')).toContain('139, 124, 246')
    expect(highlightTint(undefined)).toContain('223, 109, 93')
  })

  it('mostra a versão atual e abre as anteriores dentro da janela', () => {
    const { container, getByText } = render(<WhatsNewModal isOpen onClose={() => {}} />)
    expect(container.querySelector('.wn-ver')?.textContent).toContain(`v${CHANGELOG_DATA[0].version}`)
    expect(container.querySelectorAll('.wn-item')).toHaveLength(CHANGELOG_DATA[0].highlights.length)
    expect(container.querySelector('.wn-previous')).toBeNull()
    fireEvent.click(getByText('Ver versões anteriores'))
    expect(container.querySelectorAll('.wn-prev-item').length).toBeGreaterThan(0)
    expect(getByText('Bora!')).toBeTruthy()
  })
})
