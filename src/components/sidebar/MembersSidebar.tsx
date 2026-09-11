import React from 'react'
import type { User } from '@supabase/supabase-js'
import type { Space, Channel, ServerRole } from '../../types'
import { UserPlusIcon, CrownIcon } from '../icons'
import { GameLogo } from '../GameLogos'
import { AvatarDecoration } from '../AvatarDecoration'
import { formatGameDuration } from '../../lib/formatters'
import { NAME_EFFECTS } from '../../lib/cosmeticsData'

export interface MembersSidebarProps {
  isVisible: boolean
  currentSpace: Space | null
  spaceMembers: any[]
  spaceChannels: Record<string, Channel[]>
  activeVoiceChannelId: string | null
  participants: any[]
  spaceVoiceUsers: Record<string, any[]>
  onlineUsers: Set<string>
  presenceData: Record<string, any>
  user: User
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  avatarDecoration?: string | null
  nameEffect?: string | null
  serverRoles: ServerRole[]
  memberRoleMap: Record<string, string[]>
  getUserHighestRole: (spaceId: string, userId: string) => ServerRole | null
  setSpaceForAddMembers: (space: Space) => void
  setInspectedMember: (val: any) => void
  setHoveredMemberPopover: (val: any) => void
  hoverTimeoutRef: React.MutableRefObject<any>
}

const MembersSidebarInner = React.memo(function MembersSidebarInner({
  currentSpace,
  spaceMembers,
  spaceChannels,
  activeVoiceChannelId,
  participants,
  spaceVoiceUsers,
  onlineUsers,
  presenceData,
  user,
  presenceStatus,
  myGamePresence,
  avatarDecoration,
  nameEffect,
  serverRoles,
  memberRoleMap,
  getUserHighestRole,
  setSpaceForAddMembers,
  setInspectedMember,
  setHoveredMemberPopover,
  hoverTimeoutRef
}: Omit<MembersSidebarProps, 'isVisible'> & { currentSpace: NonNullable<MembersSidebarProps['currentSpace']> }) {

  const spaceChList = spaceChannels[currentSpace.id] || []
  const isCurrentCallInThisSpace = Boolean(
    activeVoiceChannelId && spaceChList.some(c => c.id === activeVoiceChannelId)
  )

  const { onlineList, offlineList, currentSpaceVoiceUsers } = React.useMemo(() => {
    const allMembersMap = new Map<string, any>()
    spaceMembers.forEach(m => {
      if (m && m.user?.id) allMembersMap.set(m.user.id, m)
    })

    if (isCurrentCallInThisSpace) {
      participants.forEach(p => {
        if (p && p.userId && !allMembersMap.has(p.userId)) {
          allMembersMap.set(p.userId, {
            role: 'member',
            user: { id: p.userId, display_name: p.displayName || 'Membro', avatar_url: p.avatarUrl }
          })
        }
      })
    }

    const voiceUsers = Object.entries(spaceVoiceUsers)
      .filter(([chId]) => spaceChList.some(c => c.id === chId))
      .flatMap(([, uList]) => uList)

    voiceUsers.forEach(p => {
      if (p && p.userId && !allMembersMap.has(p.userId)) {
        allMembersMap.set(p.userId, {
          role: 'member',
          user: { id: p.userId, display_name: p.displayName || 'Membro', avatar_url: p.avatarUrl }
        })
      }
    })

    const combinedMembers = Array.from(allMembersMap.values())
    const online = combinedMembers.filter(m => onlineUsers.has(m.user.id) || (isCurrentCallInThisSpace && participants.some(p => p.userId === m.user.id)) || voiceUsers.some(p => p.userId === m.user.id))
    const offline = combinedMembers.filter(m => !onlineUsers.has(m.user.id) && (!isCurrentCallInThisSpace || !participants.some(p => p.userId === m.user.id)) && !voiceUsers.some(p => p.userId === m.user.id))

    return {
      onlineList: online,
      offlineList: offline,
      currentSpaceVoiceUsers: voiceUsers
    }
  }, [spaceMembers, isCurrentCallInThisSpace, participants, spaceVoiceUsers, spaceChList, onlineUsers])

  const renderCard = (member: any) => {
    const isCreator = currentSpace.creator_id === member.user.id
    const isVoiceUser = (isCurrentCallInThisSpace && participants.some(p => p.userId === member.user.id)) || currentSpaceVoiceUsers.some(p => p.userId === member.user.id)
    const isOnline = onlineUsers.has(member.user.id) || isVoiceUser
    const userPresenceStatus = isOnline ? (presenceData[member.user.id]?.presence_status || 'online') : 'offline'
    const memberRole = getUserHighestRole(currentSpace.id, member.user.id)
    const memberDeco = member.user.id === user.id ? (avatarDecoration || null) : (presenceData[member.user.id]?.avatar_decoration || member.user?.avatar_decoration || null)
    const memberNameEffect = member.user.id === user.id ? (nameEffect || 'resonance_cyan') : (presenceData[member.user.id]?.name_effect || localStorage.getItem(`echo-name-effect-${member.user.id}`) || 'none')
    const memberNameMeta = NAME_EFFECTS.find(n => n.id === memberNameEffect)

    const memberClanTag = localStorage.getItem(`echo-clan-tag-${member.user.id}`) || (member.user.id === user.id ? localStorage.getItem(`echo-clan-tag-${user.id}`) : null)
    const memberClanTagColor = localStorage.getItem(`echo-clan-tag-color-${member.user.id}`) || (member.user.id === user.id ? localStorage.getItem(`echo-clan-tag-color-${user.id}`) : '#00f2fe') || '#00f2fe'

    const activeGameObj = member.user.id === user.id 
      ? (presenceStatus !== 'invisible' ? myGamePresence : null)
      : (presenceData[member.user.id]?.game_presence || presenceData[member.user.id]?.current_game || null)
    const activeGame = activeGameObj?.name || null
    const activeGameStartedAt = activeGameObj?.startedAt || null

    const rawCustomStatus = presenceData[member.user.id]?.custom_status
    const isSameAsName = rawCustomStatus && (rawCustomStatus.trim().toLowerCase() === member.user.display_name.trim().toLowerCase())
    const validCustomStatus = (rawCustomStatus && !isSameAsName) ? rawCustomStatus : null

    return (
      <div 
        className={`member-card ${memberNameEffect && memberNameEffect !== 'none' ? 'has-name-effect' : ''}`}
        style={memberNameMeta ? {
          '--member-aura-border': `${memberNameMeta.themeColor}55`,
          '--member-aura-bg': `${memberNameMeta.themeColor}12`,
          '--member-aura-shadow': `${memberNameMeta.themeColor}22`
        } as React.CSSProperties : undefined}
        key={member.user.id}
        onClick={() => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
          setHoveredMemberPopover(null)
          const memRoles = memberRoleMap[member.user.id] || []
          const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
          setInspectedMember({
            user: member.user,
            roleName: memberRole?.name,
            roleColor: memberRole?.color,
            roles: matchingRoles
          })
        }}
        onMouseEnter={(e) => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
          const rect = e.currentTarget.getBoundingClientRect()
          const memRoles = memberRoleMap[member.user.id] || []
          const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
          hoverTimeoutRef.current = setTimeout(() => {
            setHoveredMemberPopover({
              user: member.user,
              roleName: memberRole?.name,
              roleColor: memberRole?.color,
              roles: matchingRoles,
              clanTag: memberClanTag,
              clanTagColor: memberClanTagColor,
              activeGame,
              activeGameStartedAt,
              isVoiceUser,
              userPresenceStatus,
              isOnline,
              customStatus: validCustomStatus,
              rect: {
                top: rect.top,
                left: rect.left,
                height: rect.height,
                bottom: rect.bottom
              }
            })
          }, 200)
        }}
        onMouseLeave={() => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
          hoverTimeoutRef.current = setTimeout(() => {
            setHoveredMemberPopover(null)
          }, 150)
        }}
        title="Ver perfil"
      >
        <div className="member-avatar-container" style={{ position: 'relative' }}>
          <div className="member-avatar">
            {member.user.avatar_url ? (
              <img src={member.user.avatar_url} alt={member.user.display_name} />
            ) : (
              member.user.display_name.slice(0, 1).toUpperCase()
            )}
          </div>
          {memberDeco && memberDeco !== 'none' && (
            <AvatarDecoration decorationId={memberDeco} />
          )}
          <span className={`member-status-dot ${isVoiceUser ? 'voice-active' : userPresenceStatus}`} />
        </div>
        <div className="member-info">
          <div className="member-name-row">
            <span 
              className={`member-name ${memberNameEffect && memberNameEffect !== 'none' ? `name-effect-${memberNameEffect}` : ''}`} 
              style={{ color: (memberNameEffect && memberNameEffect !== 'none') ? undefined : (memberRole?.color || 'var(--text-primary)') }}
            >
              {member.user.display_name}
            </span>

            {memberNameEffect && memberNameEffect !== 'none' && (
              <span className="name-soundwave-indicator" title={memberNameMeta?.name || 'Aura Sonora'}>
                <span className="name-soundwave-bar" style={{ background: memberNameMeta?.themeColor || '#00f2fe' }} />
                <span className="name-soundwave-bar" style={{ background: memberNameMeta?.themeColor || '#00f2fe' }} />
                <span className="name-soundwave-bar" style={{ background: memberNameMeta?.themeColor || '#00f2fe' }} />
              </span>
            )}

            {memberClanTag && (
              <span 
                className="member-clan-tag" 
                style={{ 
                  color: memberClanTagColor, 
                  borderColor: `${memberClanTagColor}55`, 
                  background: `${memberClanTagColor}15` 
                }}
              >
                [{memberClanTag}]
              </span>
            )}

            {isCreator ? (
              <span className="member-badge creator"><CrownIcon style={{ width: '10px', height: '10px' }} /> Dono</span>
            ) : memberRole ? (
              <span 
                className="member-badge role" 
                style={{ 
                  color: memberRole.color, 
                  borderColor: `${memberRole.color}44`, 
                  background: `${memberRole.color}15` 
                }}
              >
                {memberRole.name}
              </span>
            ) : null}
          </div>

          {activeGame ? (
            <span className="member-status-text activity-game" title={`Jogando ${activeGame}${activeGameStartedAt ? ` • ${formatGameDuration(activeGameStartedAt)}` : ''}`}>
              <GameLogo gameName={activeGame} size={13} className="member-mini-game-logo" />
              <span className="member-game-title">Jogando {activeGame}</span>
              {activeGameStartedAt && (
                <span className="member-game-time">• {formatGameDuration(activeGameStartedAt)}</span>
              )}
            </span>
          ) : isVoiceUser ? (
            <span className="member-status-text activity-voice">
              🔊 Em chamada
            </span>
          ) : validCustomStatus ? (
            <span className="member-status-text custom" title={validCustomStatus}>
              {validCustomStatus}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  // Role Hierarchy Categorization
  const { creatorOnlineMembers, roleBuckets, unassignedOnlineMembers } = React.useMemo(() => {
    const creatorOnline: any[] = []
    const buckets: { role: ServerRole; members: any[] }[] = []
    const unassigned: any[] = []

    const spaceRoles = (serverRoles || []).slice().sort((a, b) => b.position - a.position)
    spaceRoles.forEach(r => {
      buckets.push({ role: r, members: [] })
    })

    onlineList.forEach(m => {
      if (m.user.id === currentSpace.creator_id) {
        creatorOnline.push(m)
        return
      }
      const highestRole = getUserHighestRole(currentSpace.id, m.user.id)
      const targetBucket = highestRole ? buckets.find(b => b.role.id === highestRole.id) : null
      if (targetBucket) {
        targetBucket.members.push(m)
      } else {
        unassigned.push(m)
      }
    })

    return {
      creatorOnlineMembers: creatorOnline,
      roleBuckets: buckets,
      unassignedOnlineMembers: unassigned
    }
  }, [onlineList, serverRoles, currentSpace.creator_id, currentSpace.id, getUserHighestRole])

  return (
    <aside className="members-sidebar">
      <div className="members-sidebar-inner">
        <div style={{ padding: '4px 6px 12px 6px' }}>
          <button
            type="button"
            onClick={() => setSpaceForAddMembers(currentSpace)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              color: 'var(--accent-color, #00f2fe)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <UserPlusIcon style={{ width: '14px', height: '14px' }} />
            <span>Convidar Amigos</span>
          </button>
        </div>

        {/* 1. Creator / Owner Group */}
        {creatorOnlineMembers.length > 0 && (
          <div className="members-group-section">
            <div className="members-group-label" style={{ color: '#f59e0b' }}>
              <span className="members-group-dot" style={{ background: '#f59e0b' }} />
              <span>👑 DONO — {creatorOnlineMembers.length}</span>
            </div>
            <div className="members-list">
              {creatorOnlineMembers.map(renderCard)}
            </div>
          </div>
        )}

        {/* 2. Custom Server Roles */}
        {roleBuckets.filter(b => b.members.length > 0).map(b => (
          <div key={b.role.id} className="members-group-section">
            <div className="members-group-label" style={{ color: b.role.color }}>
              <span className="members-group-dot" style={{ background: b.role.color }} />
              <span>{b.role.name.toUpperCase()} — {b.members.length}</span>
            </div>
            <div className="members-list">
              {b.members.map(renderCard)}
            </div>
          </div>
        ))}

        {/* 3. Online Members without special role */}
        {unassignedOnlineMembers.length > 0 && (
          <div className="members-group-section">
            <div className="members-group-label" style={{ color: '#22c55e' }}>
              <span className="members-group-dot" style={{ background: '#22c55e' }} />
              <span>DISPONÍVEL — {unassignedOnlineMembers.length}</span>
            </div>
            <div className="members-list">
              {unassignedOnlineMembers.map(renderCard)}
            </div>
          </div>
        )}

        {/* 4. Offline Members */}
        {offlineList.length > 0 && (
          <div className="members-group-section offline">
            <div className="members-group-label">
              <span className="members-group-dot" style={{ background: '#64748b' }} />
              <span>OFFLINE — {offlineList.length}</span>
            </div>
            <div className="members-list">
              {offlineList.map(renderCard)}
            </div>
          </div>
        )}

        {spaceMembers.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
            Nenhum membro encontrado.
          </div>
        )}
      </div>
    </aside>
  )
})

export const MembersSidebar = React.memo(function MembersSidebar(props: MembersSidebarProps) {
  if (!props.isVisible || !props.currentSpace) return null
  return <MembersSidebarInner {...props} currentSpace={props.currentSpace} />
})
