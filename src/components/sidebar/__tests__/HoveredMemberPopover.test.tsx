import { describe, it, expect, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { HoveredMemberPopover } from '../HoveredMemberPopover'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

describe('HoveredMemberPopover - renderização de decorações de avatar', () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  afterEach(() => {
    if (root) act(() => root!.unmount())
    container?.remove()
    root = null
    container = null
  })

  const renderPopover = (props: any) => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root!.render(<HoveredMemberPopover {...props} />))
    return container
  }

  const defaultProps = {
    hoveredMemberPopover: {
      user: {
        id: 'user-123',
        display_name: 'Lag',
        avatar_url: 'https://example.com/avatar.png'
      },
      rect: { top: 100, left: 200 },
      pronouns: 'ele/dele',
      userPresenceStatus: 'online'
    },
    setHoveredMemberPopover: () => {},
    setInspectedMember: () => {},
    hoverTimeoutRef: { current: null },
    currentUserId: 'user-123',
    currentUserProfileEffect: null,
    currentUserAvatarDecoration: 'pumpkin_night',
    presenceData: {}
  }

  it('renderiza AvatarDecoration como filho direto de .hover-popover-avatar-wrap e fora de .hover-popover-avatar (sem sofrer overflow: hidden)', () => {
    const el = renderPopover(defaultProps)
    const avatarWrap = el.querySelector('.hover-popover-avatar-wrap')
    expect(avatarWrap).not.toBeNull()

    const avatarInner = avatarWrap!.querySelector('.hover-popover-avatar')
    expect(avatarInner).not.toBeNull()

    // A decoração NÃO deve estar dentro de .hover-popover-avatar (para não ser cortada por overflow: hidden)
    expect(avatarInner!.querySelector('.echo-avatar-decoration-wrap')).toBeNull()

    // A decoração DEVE estar como filha direta de .hover-popover-avatar-wrap
    const decoWrap = avatarWrap!.querySelector('.echo-avatar-decoration-wrap')
    expect(decoWrap).not.toBeNull()
    expect(decoWrap!.parentElement).toBe(avatarWrap)
  })

  it('resolve a decoração a partir de hoveredMemberPopover.avatarDecoration quando é outro membro', () => {
    const props = {
      ...defaultProps,
      currentUserId: 'other-user',
      currentUserAvatarDecoration: null,
      hoveredMemberPopover: {
        ...defaultProps.hoveredMemberPopover,
        avatarDecoration: 'bunny_moon'
      }
    }
    const el = renderPopover(props)
    const avatarWrap = el.querySelector('.hover-popover-avatar-wrap')
    const decoWrap = avatarWrap!.querySelector('.echo-avatar-decoration-wrap')
    expect(decoWrap).not.toBeNull()
  })

  it('não renderiza AvatarDecoration quando a decoração é nula ou "none"', () => {
    const props = {
      ...defaultProps,
      currentUserAvatarDecoration: 'none'
    }
    const el = renderPopover(props)
    const decoWrap = el.querySelector('.echo-avatar-decoration-wrap')
    expect(decoWrap).toBeNull()
  })
})
