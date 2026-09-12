import React from 'react'
import type { User } from '@supabase/supabase-js'
import type { Space, Channel, ServerRole } from '../../types'
import { UserPlusIcon, CrownIcon, VolumeIcon, SearchIcon, ChevronDownIcon } from '../icons'
import { GameLogo } from '../GameLogos'
import { AvatarDecoration } from '../AvatarDecoration'
import { formatGameDuration } from '../../lib/formatters'
import { NAME_EFFECTS } from '../../lib/cosmeticsData'

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',   // Cyan / Blue
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',   // Violet / Pink
  'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',   // Emerald / Teal
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',   // Amber / Red
  'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',   // Blue / Purple
  'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',   // Pink / Rose
  'linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)',   // Teal / Blue
  'linear-gradient(135deg, #f97316 0%, #eab308 100%)',   // Orange / Yellow
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',   // Indigo / Violet
]

function getMemberAvatarBackground(userId: string, name: string): string {
  const str = userId || name || 'echo'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

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

  const [searchQuery, setSearchQuery] = React.useState('')
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement | null>(null)
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({})

  const handleToggleSearch = React.useCallback(() => {
    setIsSearchOpen(prev => {
      const next = !prev
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 60)
      } else {
        setSearchQuery('')
      }
      return next
    })
  }, [])

  const toggleSection = React.useCallback((key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const spaceChList = spaceChannels[currentSpace.id] || []
  const isCurrentCallInThisSpace = Boolean(
    activeVoiceChannelId && spaceChList.some(c => c.id === activeVoiceChannelId)
  )

  const { onlineList, offlineList, currentSpaceVoiceUsers } = React.useMemo(() => {
    const allMembersMap = new Map<string, any>()
    spaceMembers.forEach(m => {
      if (m && m.user?.id) {
        allMembersMap.set(m.user.id, m)
      }
    })

    if (isCurrentCallInThisSpace) {
      participants.forEach(p => {
        if (p && p.userId && allMembersMap.has(p.userId)) {
          const existing = allMembersMap.get(p.userId)
          if (p.displayName && (!existing.user.display_name || existing.user.display_name === 'Membro')) {
            existing.user.display_name = p.displayName
          }
        }
      })
    }

    const voiceUsers = Object.entries(spaceVoiceUsers)
      .filter(([chId]) => spaceChList.some(c => c.id === chId))
      .flatMap(([, uList]) => uList)

    const isMemberOnline = (m: any) => {
      const isMe = m.user.id === user.id
      if (isMe) {
        if (presenceStatus === 'invisible') return false
      } else {
        const pres = presenceData[m.user.id]
        if (pres?.presence_status === 'invisible') return false
      }
      return (
        onlineUsers.has(m.user.id) ||
        (isCurrentCallInThisSpace && participants.some(p => p.userId === m.user.id)) ||
        voiceUsers.some(p => p.userId === m.user.id)
      )
    }

    const combinedMembers = Array.from(allMembersMap.values())
    const online = combinedMembers.filter(m => isMemberOnline(m))
    const offline = combinedMembers.filter(m => !isMemberOnline(m))

    return {
      onlineList: online,
      offlineList: offline,
      currentSpaceVoiceUsers: voiceUsers
    }
  }, [spaceMembers, isCurrentCallInThisSpace, participants, spaceVoiceUsers, spaceChList, onlineUsers, presenceStatus, presenceData, user.id])

  const renderCard = (member: any) => {
    const isMe = member.user.id === user.id
    const isCreator = currentSpace.creator_id === member.user.id
    const isVoiceUserRaw = (isCurrentCallInThisSpace && participants.some(p => p.userId === member.user.id)) || currentSpaceVoiceUsers.some(p => p.userId === member.user.id)
    
    // Status efetivo considerando Invisível
    let effectiveStatus: 'online' | 'idle' | 'dnd' | 'offline' | 'invisible' = 'offline'
    if (isMe) {
      effectiveStatus = presenceStatus
    } else {
      effectiveStatus = presenceData[member.user.id]?.presence_status || (onlineUsers.has(member.user.id) ? 'online' : 'offline')
    }

    const isOnline = effectiveStatus !== 'invisible' && effectiveStatus !== 'offline' && (onlineUsers.has(member.user.id) || isVoiceUserRaw || isMe)
    const userPresenceStatus = isOnline ? effectiveStatus : 'offline'
    // Membros offline ou invisíveis NUNCA devem exibir o badge de voz "Em chamada" na barra de membros
    const isVoiceUser = isOnline && isVoiceUserRaw
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
          <div
            className="member-avatar"
            style={{
              background: member.user.avatar_url ? undefined : getMemberAvatarBackground(member.user.id, member.user.display_name)
            }}
          >
            {member.user.avatar_url ? (
              <img src={member.user.avatar_url} alt={member.user.display_name} />
            ) : (
              member.user.display_name.slice(0, 1).toUpperCase()
            )}
          </div>
          {memberDeco && memberDeco !== 'none' && (
            <AvatarDecoration decorationId={memberDeco} />
          )}
          <span className={`member-status-dot ${userPresenceStatus} ${isVoiceUser ? 'voice-active' : ''}`} />
        </div>
        <div className="member-info">
          <div className="member-name-row">
            <span 
              className={`member-name ${memberNameEffect && memberNameEffect !== 'none' ? `name-effect-${memberNameEffect}` : ''}`} 
              style={{ color: (memberNameEffect && memberNameEffect !== 'none') ? undefined : (memberRole?.color || (isCreator ? '#f59e0b' : 'var(--text-primary)')) }}
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
          ) : validCustomStatus ? (
            <span className="member-status-text custom" title={validCustomStatus}>
              {validCustomStatus}
            </span>
          ) : isVoiceUser ? (
            <span className="member-voice-pill">
              <VolumeIcon style={{ width: '11px', height: '11px', flexShrink: 0 }} />
              <span>Em chamada</span>
              {userPresenceStatus === 'idle' && <span className="member-status-sub-idle">• Ausente</span>}
              {userPresenceStatus === 'dnd' && <span className="member-status-sub-dnd">• Não perturbe</span>}
            </span>
          ) : userPresenceStatus === 'idle' ? (
            <span className="member-status-text status-idle">
              Ausente
            </span>
          ) : userPresenceStatus === 'dnd' ? (
            <span className="member-status-text status-dnd">
              Não perturbe
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

    const spaceRoles = (serverRoles || []).slice().sort((a, b) => a.position - b.position)
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

  // Search Filtering
  const cleanQuery = searchQuery.trim().toLowerCase()
  const matchesSearch = React.useCallback((m: any) => {
    if (!cleanQuery) return true
    const name = (m?.user?.display_name || '').toLowerCase()
    const highestRole = getUserHighestRole(currentSpace.id, m?.user?.id)
    const roleName = (highestRole?.name || '').toLowerCase()
    return name.includes(cleanQuery) || roleName.includes(cleanQuery)
  }, [cleanQuery, currentSpace.id, getUserHighestRole])

  const filteredCreator = React.useMemo(() => creatorOnlineMembers.filter(matchesSearch), [creatorOnlineMembers, matchesSearch])
  const filteredBuckets = React.useMemo(() => roleBuckets.map(b => ({
    ...b,
    members: b.members.filter(matchesSearch)
  })).filter(b => b.members.length > 0), [roleBuckets, matchesSearch])
  const filteredUnassigned = React.useMemo(() => unassignedOnlineMembers.filter(matchesSearch), [unassignedOnlineMembers, matchesSearch])
  const filteredOffline = React.useMemo(() => offlineList.filter(matchesSearch), [offlineList, matchesSearch])

  const totalFiltered = filteredCreator.length + filteredBuckets.reduce((acc, b) => acc + b.members.length, 0) + filteredUnassigned.length + filteredOffline.length

  return (
    <aside className="members-sidebar">
      {/* Sleek Top Header with Count, Search & Invite */}
      <div className="members-sidebar-top">
        <div className="members-sidebar-top-header">
          <div className="members-top-title-row">
            <span className="members-top-title">Membros</span>
            <span className="members-total-count-pill">{spaceMembers.length}</span>
          </div>
          <div className="members-top-actions">
            <button
              type="button"
              className={`members-search-toggle-btn ${isSearchOpen || searchQuery ? 'active' : ''}`}
              onClick={handleToggleSearch}
              title={isSearchOpen ? 'Fechar busca' : 'Filtrar membros'}
            >
              <SearchIcon className="members-search-icon" style={{ width: '13px', height: '13px' }} />
            </button>

            <button
              type="button"
              className="members-quick-invite-btn"
              onClick={() => setSpaceForAddMembers(currentSpace)}
              title="Convidar amigos para o espaço"
            >
              <UserPlusIcon style={{ width: '13px', height: '13px' }} />
              <span>Convidar</span>
            </button>
          </div>
        </div>

        <div className={`members-expandable-search ${(isSearchOpen || searchQuery) ? 'open' : ''}`}>
          <div className="members-search-box">
            <SearchIcon style={{ width: '12px', height: '12px' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="members-search-input"
              placeholder="Filtrar membros..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setSearchQuery('')
                  setIsSearchOpen(false)
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="members-search-clear"
                onClick={() => {
                  setSearchQuery('')
                  searchInputRef.current?.focus()
                }}
                title="Limpar filtro"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="members-sidebar-inner">
        {/* Empty search result message */}
        {cleanQuery && totalFiltered === 0 && (
          <div className="members-empty-search">
            <SearchIcon style={{ width: '22px', height: '22px', opacity: 0.4 }} />
            <span>Nenhum membro encontrado para "{searchQuery}"</span>
          </div>
        )}

        {/* 1. Creator / Owner Group */}
        {filteredCreator.length > 0 && (
          <div className="members-group-section">
            <div
              className="members-group-header"
              style={{ color: '#f59e0b' }}
              onClick={() => toggleSection('creator')}
            >
              <div className="members-group-header-left">
                <ChevronDownIcon className={`members-group-chevron ${collapsedSections['creator'] && !cleanQuery ? 'collapsed' : ''}`} />
                <span className="members-group-icon">
                  <CrownIcon style={{ width: '12px', height: '12px' }} />
                </span>
                <span className="members-group-title">DONO</span>
              </div>
              <span
                className="members-group-count-pill"
                style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.25)', background: 'rgba(245, 158, 11, 0.1)' }}
              >
                {filteredCreator.length}
              </span>
            </div>
            {(!collapsedSections['creator'] || cleanQuery) && (
              <div className="members-list">
                {filteredCreator.map(renderCard)}
              </div>
            )}
          </div>
        )}

        {/* 2. Custom Server Roles */}
        {filteredBuckets.map(b => {
          const isCollapsed = collapsedSections[`role-${b.role.id}`] && !cleanQuery
          return (
            <div key={b.role.id} className="members-group-section">
              <div
                className="members-group-header"
                style={{ color: b.role.color }}
                onClick={() => toggleSection(`role-${b.role.id}`)}
              >
                <div className="members-group-header-left">
                  <ChevronDownIcon className={`members-group-chevron ${isCollapsed ? 'collapsed' : ''}`} />
                  <span className="members-group-title">{b.role.name.toUpperCase()}</span>
                </div>
                <span
                  className="members-group-count-pill"
                  style={{ color: b.role.color, borderColor: `${b.role.color}35`, background: `${b.role.color}15` }}
                >
                  {b.members.length}
                </span>
              </div>
              {!isCollapsed && (
                <div className="members-list">
                  {b.members.map(renderCard)}
                </div>
              )}
            </div>
          )
        })}

        {/* 3. Online Members without special role */}
        {filteredUnassigned.length > 0 && (
          <div className="members-group-section">
            <div
              className="members-group-header"
              style={{ color: '#22c55e' }}
              onClick={() => toggleSection('online')}
            >
              <div className="members-group-header-left">
                <ChevronDownIcon className={`members-group-chevron ${collapsedSections['online'] && !cleanQuery ? 'collapsed' : ''}`} />
                <span className="members-group-title">DISPONÍVEL</span>
              </div>
              <span
                className="members-group-count-pill"
                style={{ color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.25)', background: 'rgba(34, 197, 94, 0.1)' }}
              >
                {filteredUnassigned.length}
              </span>
            </div>
            {(!collapsedSections['online'] || cleanQuery) && (
              <div className="members-list">
                {filteredUnassigned.map(renderCard)}
              </div>
            )}
          </div>
        )}

        {/* 4. Offline Members */}
        {filteredOffline.length > 0 && (
          <div className="members-group-section offline">
            <div
              className="members-group-header"
              style={{ color: '#94a3b8' }}
              onClick={() => toggleSection('offline')}
            >
              <div className="members-group-header-left">
                <ChevronDownIcon className={`members-group-chevron ${collapsedSections['offline'] && !cleanQuery ? 'collapsed' : ''}`} />
                <span className="members-group-title">OFFLINE</span>
              </div>
              <span
                className="members-group-count-pill"
                style={{ color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.2)', background: 'rgba(255, 255, 255, 0.05)' }}
              >
                {filteredOffline.length}
              </span>
            </div>
            {(!collapsedSections['offline'] || cleanQuery) && (
              <div className="members-list">
                {filteredOffline.map(renderCard)}
              </div>
            )}
          </div>
        )}

        {spaceMembers.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '16px 8px', textAlign: 'center' }}>
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
