import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MembersSidebar } from '../MembersSidebar'

const mod = { id: 'r-mod', name: 'Moderador', color: '#3b82f6', position: 1, permissions: {} as any, hoist: true }
const membro = { id: 'r-membro', name: 'Membro', color: '#99aab5', position: 2, permissions: {} as any }
const roles = [mod, membro]

const member = (id: string, name: string) => ({ user: { id, display_name: name, avatar_url: null } })
const offlineNames = Array.from({ length: 12 }, (_, i) => `off${i}`)
const members = [
  member('me', 'Lag'),
  member('finin', 'FININ'),
  member('lucao', 'Lucão'),
  member('castiel', 'castiel'),
  ...offlineNames.map(n => member(n, n))
]
const roleMap: Record<string, string[]> = { finin: ['r-mod'], lucao: ['r-mod'], castiel: ['r-mod'], off3: ['r-membro'] }

function renderList() {
  return render(
    <MembersSidebar
      isVisible
      currentSpace={{ id: 's1', name: 'Trupe', creator_id: 'dono-fora' } as any}
      spaceMembers={members}
      spaceChannels={{ s1: [{ id: 'vc1', name: 'bate-papo', type: 'voice' } as any] }}
      activeVoiceChannelId={null}
      participants={[]}
      spaceVoiceUsers={{ vc1: [{ userId: 'lucao' }] }}
      onlineUsers={new Set(['me', 'finin', 'lucao'])}
      presenceData={{ finin: { game_presence: { name: 'Roblox', startedAt: Date.now() - 14 * 60_000 } } }}
      user={{ id: 'me' } as any}
      presenceStatus="online"
      serverRoles={roles as any}
      memberRoleMap={roleMap}
      getUserHighestRole={(_s, uid) => (roleMap[uid]?.[0] === 'r-mod' ? mod : roleMap[uid]?.[0] === 'r-membro' ? membro : null) as any}
      setSpaceForAddMembers={() => {}}
      setInspectedMember={() => {}}
      setHoveredMemberPopover={() => {}}
      hoverTimeoutRef={{ current: null }}
    />
  )
}

const cardOf = (c: HTMLElement, name: string) =>
  [...c.querySelectorAll('.member-card')].find(el => el.querySelector('.member-name')?.textContent === name) as HTMLElement

describe('lista de membros (visual calmo)', () => {
  it('dentro do grupo do cargo não repete o cargo; fora dele vira o escudinho', () => {
    const { container } = renderList()
    expect(container.textContent).toContain('Moderador — 2')
    expect(cardOf(container, 'FININ').querySelector('.member-role-mark')).toBeNull()
    expect(container.querySelector('.member-badge')).toBeNull()
    // castiel é moderador mas está offline: aparece com o escudinho
    fireEvent.click(container.querySelector('.members-show-more')!)
    const castiel = cardOf(container, 'castiel')
    expect(castiel.className).toContain('is-offline')
    expect(castiel.querySelector('.member-role-mark')?.getAttribute('aria-label')).toBe('Cargo: Moderador')
  })

  it('atividade em texto ("Jogando Roblox · 14 min") e chamada com o nome da sala', () => {
    const { container } = renderList()
    expect(cardOf(container, 'FININ').querySelector('.member-activity')?.textContent).toContain('Jogando Roblox · 14 min')
    expect(cardOf(container, 'Lucão').textContent).toContain('Em chamada · bate-papo')
  })

  it('offline recolhido: 6 nomes e "Mostrar mais", que abre e fecha', () => {
    const { container } = renderList()
    const offlineCards = () => container.querySelectorAll('.member-card.is-offline').length
    expect(offlineCards()).toBe(6)
    const more = container.querySelector('.members-show-more') as HTMLButtonElement
    expect(more.textContent).toBe('Mostrar mais 7 offline')
    fireEvent.click(more)
    expect(offlineCards()).toBe(13)
    fireEvent.click(container.querySelector('.members-show-more')!)
    expect(offlineCards()).toBe(6)
  })
})
