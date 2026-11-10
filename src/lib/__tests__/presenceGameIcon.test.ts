import { describe, it, expect } from 'vitest'
import { buildPresencePayload, safePresenceGame, MAX_GAME_ICON_LENGTH } from '../presencePayload'

const storage = { getItem: () => null }
const ICON = 'data:image/png;base64,' + 'A'.repeat(2000)

describe('ícone do jogo na presença', () => {
  it('ícone PNG pequeno vai junto do jogo', () => {
    const payload = buildPresencePayload({ userId: 'u', displayName: 'U', presenceStatus: 'online', game: { name: 'eFootball PES', icon: '⚽', startedAt: 1, iconUrl: ICON }, storage })
    expect((payload.current_game as any).iconUrl).toBe(ICON)
    expect((payload.game_presence as any).iconUrl).toBe(ICON)
  })

  it('ícone grande demais ou de outro tipo é retirado (o resto do jogo fica)', () => {
    const big = 'data:image/png;base64,' + 'A'.repeat(MAX_GAME_ICON_LENGTH)
    expect(safePresenceGame({ name: 'X', iconUrl: big })).toEqual({ name: 'X' })
    expect(safePresenceGame({ name: 'X', iconUrl: 'https://site/icone.png' })).toEqual({ name: 'X' })
    expect(safePresenceGame({ name: 'X', iconUrl: null })).toEqual({ name: 'X' })
    expect(safePresenceGame({ name: 'X' })).toEqual({ name: 'X' })
    expect(safePresenceGame(null)).toBeNull()
  })

  it('no modo invisível nada do jogo é publicado', () => {
    const payload = buildPresencePayload({ userId: 'u', displayName: 'U', presenceStatus: 'invisible', game: { name: 'X', iconUrl: ICON }, storage })
    expect(payload.current_game).toBeNull()
  })
})
