import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { GameLogo, gameIconOf } from '../GameLogos'

const ICON = 'data:image/png;base64,AAAA'

describe('logo do jogo com o ícone oficial', () => {
  it('usa o ícone do .exe quando ele vem', () => {
    const { container } = render(<GameLogo gameName="eFootball PES" iconUrl={ICON} size={14} />)
    expect(container.querySelector('img.game-logo-official')?.getAttribute('src')).toBe(ICON)
  })

  it('sem ícone (ou ícone inválido), fica o desenho pelo nome', () => {
    const { container } = render(<GameLogo gameName="eFootball PES" iconUrl="https://site/x.png" />)
    expect(container.querySelector('img.game-logo-official')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('o Valorant fica sempre com o desenho próprio', () => {
    const { container } = render(<GameLogo gameName="VALORANT" iconUrl={ICON} />)
    expect(container.querySelector('img.game-logo-official')).toBeNull()
    expect(container.querySelector('.game-logo-valorant')).not.toBeNull()
  })

  it('pega o ícone de um jogo da presença', () => {
    expect(gameIconOf({ name: 'X', iconUrl: ICON })).toBe(ICON)
    expect(gameIconOf({ name: 'X' })).toBeNull()
    expect(gameIconOf(null)).toBeNull()
  })
})
