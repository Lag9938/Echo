import React from 'react'
import { ProfileEffect } from '../ProfileEffect'
import { AvatarDecoration } from '../AvatarDecoration'
import { GameLogo } from '../GameLogos'
import { VolumeIcon } from '../icons'
import { formatGameDuration } from '../../lib/formatters'

export interface HoveredMemberPopoverData {
  user: {
    id: string
    display_name: string
    avatar_url?: string | null
    [key: string]: any
  }
  rect: {
    top: number
    left: number
  }
  roleName?: string
  roleColor?: string
  roles?: any[]
  isVoiceUser?: boolean
  userPresenceStatus?: string
  clanTag?: string | null
  clanTagColor?: string | null
  activeGame?: string | null
  activeGameStartedAt?: number | null
  customStatus?: string | null
  [key: string]: any
}

export interface HoveredMemberPopoverProps {
  hoveredMemberPopover: HoveredMemberPopoverData | any | null
  setHoveredMemberPopover: (val: any) => void
  setInspectedMember: (val: any) => void
  hoverTimeoutRef: React.MutableRefObject<any>
  currentUserId: string
  currentUserProfileEffect?: string | null
  currentUserAvatarDecoration?: string | null
  presenceData: Record<string, any>
}

export function HoveredMemberPopover({
  hoveredMemberPopover,
  setHoveredMemberPopover,
  setInspectedMember,
  hoverTimeoutRef,
  currentUserId,
  currentUserProfileEffect,
  currentUserAvatarDecoration,
  presenceData
}: HoveredMemberPopoverProps) {
  if (!hoveredMemberPopover) return null

  const targetUserId = hoveredMemberPopover.user.id
  const isCurrentUser = targetUserId === currentUserId

  const hoveredEffect = isCurrentUser
    ? currentUserProfileEffect
    : (presenceData[targetUserId]?.profile_effect || (hoveredMemberPopover.user as any).profile_effect || null)

  const deco = isCurrentUser
    ? currentUserAvatarDecoration
    : (presenceData[targetUserId]?.avatar_decoration || (hoveredMemberPopover.user as any).avatar_decoration || null)

  return (
    <div 
      className="member-hover-popover"
      style={{
        position: 'fixed',
        top: `${Math.min(Math.max(12, hoveredMemberPopover.rect.top - 16), window.innerHeight - 280)}px`,
        left: `${Math.max(10, hoveredMemberPopover.rect.left - 275)}px`,
        zIndex: 1100
      }}
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      }}
      onMouseLeave={() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredMemberPopover(null)
        }, 120)
      }}
      onClick={() => {
        setInspectedMember({
          user: hoveredMemberPopover.user,
          roleName: hoveredMemberPopover.roleName,
          roleColor: hoveredMemberPopover.roleColor,
          roles: hoveredMemberPopover.roles
        })
        setHoveredMemberPopover(null)
      }}
    >
      <ProfileEffect effectId={hoveredEffect} />
      <div 
        className="hover-popover-banner" 
        style={{ 
          background: `linear-gradient(135deg, ${hoveredMemberPopover.roleColor || 'var(--accent-color, #00f2fe)'}aa, #1e1b4b)` 
        }} 
      />
      <div className="hover-popover-body">
        <div className="hover-popover-avatar-wrap">
          <div className="hover-popover-avatar">
            {hoveredMemberPopover.user.avatar_url ? (
              <img src={hoveredMemberPopover.user.avatar_url} alt={hoveredMemberPopover.user.display_name} />
            ) : (
              hoveredMemberPopover.user.display_name.slice(0, 1).toUpperCase()
            )}
            {deco && deco !== 'none' ? <AvatarDecoration decorationId={deco} /> : null}
          </div>
          <span className={`member-status-dot ${hoveredMemberPopover.isVoiceUser ? 'voice-active' : hoveredMemberPopover.userPresenceStatus}`} />
        </div>

        <div className="hover-popover-name-row">
          <span className="hover-popover-display-name" style={{ color: hoveredMemberPopover.roleColor || 'var(--text-primary)' }}>
            {hoveredMemberPopover.user.display_name}
          </span>
          {hoveredMemberPopover.clanTag && (
            <span 
              className="member-clan-tag" 
              style={{ 
                color: hoveredMemberPopover.clanTagColor || '#00f2fe', 
                borderColor: `${hoveredMemberPopover.clanTagColor || '#00f2fe'}55`, 
                background: `${hoveredMemberPopover.clanTagColor || '#00f2fe'}15` 
              }}
            >
              [{hoveredMemberPopover.clanTag}]
            </span>
          )}
        </div>

        <span className="hover-popover-handle">
          @{hoveredMemberPopover.user.display_name.toLowerCase().replace(/\s+/g, '')}
        </span>

        {hoveredMemberPopover.activeGame && (
          <div className="hover-popover-activity game">
            <GameLogo gameName={hoveredMemberPopover.activeGame} size={16} style={{ flexShrink: 0 }} />
            <span>
              Jogando <strong>{hoveredMemberPopover.activeGame}</strong>
              {hoveredMemberPopover.activeGameStartedAt ? ` • ${formatGameDuration(hoveredMemberPopover.activeGameStartedAt)}` : ''}
            </span>
          </div>
        )}

        {hoveredMemberPopover.isVoiceUser && !hoveredMemberPopover.activeGame && (
          <div className="hover-popover-activity voice" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <VolumeIcon style={{ width: '14px', height: '14px', color: '#22c55e', flexShrink: 0 }} />
            <span>Conectado na chamada de voz</span>
          </div>
        )}

        {hoveredMemberPopover.customStatus && (
          <div className="hover-popover-quote">
            <span>{hoveredMemberPopover.customStatus}</span>
          </div>
        )}

        {hoveredMemberPopover.roles && hoveredMemberPopover.roles.length > 0 && (
          <div className="hover-popover-roles">
            <span className="hover-popover-roles-title">CARGOS</span>
            <div className="hover-popover-roles-pills">
              {hoveredMemberPopover.roles.slice(0, 3).map((r: any) => (
                <span key={r.id} className="hover-popover-role-pill" style={{ color: r.color, borderColor: `${r.color}55`, background: `${r.color}15` }}>
                  <span className="role-dot" style={{ background: r.color }} />
                  {r.name}
                </span>
              ))}
              {hoveredMemberPopover.roles.length > 3 && (
                <span className="hover-popover-role-pill more">+{hoveredMemberPopover.roles.length - 3}</span>
              )}
            </div>
          </div>
        )}

        <div className="hover-popover-footer-hint">
          <span>Clique para ver perfil completo</span>
        </div>
      </div>
    </div>
  )
}
