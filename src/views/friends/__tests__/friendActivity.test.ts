import { describe, it, expect } from 'vitest'
import { friendActivity } from '../FriendsList'

const ICON = 'data:image/png;base64,AAAA'

describe('atividade no cartão do amigo', () => {
  it('jogando vem primeiro, com o ícone oficial e o tempo', () => {
    const pres = { current_game: { name: 'eFootball PES', startedAt: Date.now() - 14 * 60_000, iconUrl: ICON }, custom_status: 'oi', voice_channel_id: 'v1' }
    expect(friendActivity(pres, true)).toEqual({ kind: 'game', name: 'eFootball PES', iconUrl: ICON, since: '14 min' })
  })

  it('ícone fora do padrão não passa (só PNG embutido pequeno)', () => {
    const pres = { current_game: { name: 'Roblox', iconUrl: 'https://x/y.png' } }
    expect(friendActivity(pres, true)).toMatchObject({ kind: 'game', iconUrl: null })
  })

  it('sem jogo: em chamada, depois status personalizado, depois o estado', () => {
    expect(friendActivity({ voice_channel_id: 'v1' }, true)).toEqual({ kind: 'voice' })
    expect(friendActivity({ custom_status: '  estudando  ' }, true)).toEqual({ kind: 'custom', text: 'estudando' })
    expect(friendActivity({ presence_status: 'idle' }, true)).toMatchObject({ kind: 'status', status: 'idle', text: 'Ausente' })
    expect(friendActivity({ presence_status: 'dnd' }, true)).toMatchObject({ status: 'dnd', text: 'Não perturbe' })
    expect(friendActivity({}, true)).toMatchObject({ status: 'online', text: 'Disponível' })
  })

  it('offline nunca mostra jogo nem chamada', () => {
    expect(friendActivity({ current_game: { name: 'Roblox' }, voice_channel_id: 'v1' }, false)).toEqual({ kind: 'status', status: 'offline', text: 'Offline' })
  })
})
