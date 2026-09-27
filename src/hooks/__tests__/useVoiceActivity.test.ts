import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceActivity } from '../useVoiceActivity'

const channels: any[] = [
  { id: 'c1', name: 'Callzinha', type: 'voice', space_id: 's1' },
  { id: 't1', name: 'geral', type: 'text', space_id: 's1' }
]

describe('useVoiceActivity (realista)', () => {
  it('não quebra com participantes, bot, presença e mudanças ao longo do tempo', () => {
    let spaceVoiceUsers: any = { c1: [{ userId: 'a', displayName: 'ana', isSpeaking: false }] }
    let participants: any[] = [
      { userId: 'me', displayName: 'Eu', isSpeaking: false },
      { userId: 'music-bot-c1', displayName: 'Echo Music Bot', isSpeaking: false },
      { userId: 'a', displayName: 'ana', isSpeaking: true }
    ]
    const presenceData: any = { a: { current_game: { name: 'VALORANT' } }, me: { game_presence: 'Roblox' } }
    const { result, rerender } = renderHook(() =>
      useVoiceActivity({ spaceId: 's1', channels, spaceVoiceUsers, activeVoiceChannelId: 'c1', participants, selfId: 'me', presenceData })
    )
    expect(result.current.summary?.channelId).toBe('c1')
    expect(result.current.summary?.people.map((p) => p.userId).sort()).toEqual(['a', 'me'])

    act(() => {
      spaceVoiceUsers = { c1: [{ userId: 'a', displayName: 'ana' }, { userId: 'b', displayName: 'bia' }] }
      participants = [...participants, { userId: 'b', displayName: 'bia' }]
    })
    rerender()
    expect(result.current.events.some((e) => e.text.includes('bia entrou'))).toBe(true)
  })

  it('aceita dados incompletos sem lançar erro', () => {
    const { result } = renderHook(() =>
      useVoiceActivity({
        spaceId: undefined,
        channels: [],
        spaceVoiceUsers: {} as any,
        activeVoiceChannelId: null,
        participants: [],
        selfId: undefined,
        presenceData: {}
      })
    )
    expect(result.current.summary).toBeNull()
  })
})
