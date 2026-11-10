import { describe, it, expect } from 'vitest'
import { countOnlineMembers } from '../ChannelsSidebar'

describe('topo da lateral: quantos estão online', () => {
  const members = ['eu', 'a', 'b', 'c', 'd'].map(id => ({ user: { id } }))

  it('conta você e quem tem presença ativa', () => {
    expect(countOnlineMembers(members, { a: { presence_status: 'online' }, b: { presence_status: 'idle' } }, 'eu')).toBe(3)
  })

  it('não conta quem está invisível ou offline (nem você, se estiver invisível)', () => {
    const presence = { eu: { presence_status: 'invisible' }, a: { presence_status: 'invisible' }, b: { presence_status: 'offline' }, c: { presence_status: 'dnd' } }
    expect(countOnlineMembers(members, presence, 'eu')).toBe(1)
  })

  it('sem dados de presença, só você', () => {
    expect(countOnlineMembers(members, undefined, 'eu')).toBe(1)
  })
})
