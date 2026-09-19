import React from 'react'
import { ProfileEffect } from '../ProfileEffect'
import { AvatarDecoration } from '../AvatarDecoration'
import { GameLogo } from '../GameLogos'
import { VolumeIcon, CrownIcon, MessageSquareIcon, UserIcon, BanIcon } from '../icons'
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
  isCreator?: boolean
  bio?: string | null
  pronouns?: string | null
  isVoiceUser?: boolean
  userPresenceStatus?: 'online' | 'idle' | 'dnd' | 'offline' | string
  clanTag?: string | null
  clanTagColor?: string | null
  activeGame?: string | null
  activeGameStartedAt?: number | null
  customStatus?: string | null
  bannerCustom?: string | null
  bannerPreset?: string | null
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
  onOpenDM?: (userId: string) => void
  onBlockUser?: (targetId: string, targetName: string) => Promise<void> | void
  onUnblockUser?: (targetId: string, targetName: string) => Promise<void> | void
  blockedUserIds?: Set<string>
}

export function HoveredMemberPopover({
  hoveredMemberPopover,
  setHoveredMemberPopover,
  setInspectedMember,
  hoverTimeoutRef,
  currentUserId,
  currentUserProfileEffect,
  currentUserAvatarDecoration,
  presenceData,
  onOpenDM,
  onBlockUser,
  onUnblockUser,
  blockedUserIds
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

  const bannerCustom = isCurrentUser
    ? ((hoveredMemberPopover.user as any)?.banner_url || hoveredMemberPopover.bannerCustom || localStorage.getItem(`echo-banner-custom-${currentUserId}`) || localStorage.getItem('echo-banner-custom') || null)
    : (hoveredMemberPopover.bannerCustom || (hoveredMemberPopover.user as any)?.banner_url || (presenceData[targetUserId] as any)?.banner_url || presenceData[targetUserId]?.banner_custom || localStorage.getItem(`echo-banner-custom-${targetUserId}`) || null)

  const bannerPreset = isCurrentUser
    ? ((hoveredMemberPopover.user as any)?.banner_preset || hoveredMemberPopover.bannerPreset || localStorage.getItem(`echo-banner-preset-${currentUserId}`) || localStorage.getItem('echo-banner-preset') || 'synthwave')
    : (hoveredMemberPopover.bannerPreset || (hoveredMemberPopover.user as any)?.banner_preset || (presenceData[targetUserId] as any)?.banner_preset || presenceData[targetUserId]?.banner_preset || localStorage.getItem(`echo-banner-preset-${targetUserId}`) || 'synthwave')

  const isCreator = Boolean(hoveredMemberPopover.isCreator)
  const bio = hoveredMemberPopover.bio || (hoveredMemberPopover.user as any)?.bio || null
  const pronouns = hoveredMemberPopover.pronouns || (hoveredMemberPopover.user as any)?.pronouns || null

  const status = hoveredMemberPopover.userPresenceStatus || 'offline'
  const statusLabels: Record<string, string> = {
    online: 'Online',
    idle: 'Ausente',
    dnd: 'Ocupado',
    offline: 'Offline'
  }
  const statusLabel = statusLabels[status] || 'Offline'

  const handleInspectFullProfile = () => {
    setInspectedMember({
      user: hoveredMemberPopover.user,
      roleName: hoveredMemberPopover.roleName,
      roleColor: hoveredMemberPopover.roleColor,
      roles: hoveredMemberPopover.roles,
      bannerCustom,
      bannerPreset
    })
    setHoveredMemberPopover(null)
  }

  return (
    <div 
      className="member-hover-popover"
      style={{
        position: 'fixed',
        top: `${Math.min(Math.max(12, hoveredMemberPopover.rect.top - 16), window.innerHeight - 340)}px`,
        left: `${Math.max(10, hoveredMemberPopover.rect.left - 295)}px`,
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
      onClick={handleInspectFullProfile}
    >
      <ProfileEffect effectId={hoveredEffect} />
      <div 
        className={`hover-popover-banner ${bannerCustom ? 'has-custom-banner' : `texture-${bannerPreset || 'synthwave'}`}`} 
        style={
          bannerCustom
            ? {
                backgroundImage: `url(${bannerCustom})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }
            : {
                background: `linear-gradient(135deg, ${hoveredMemberPopover.roleColor || 'var(--accent-color, #00f2fe)'}aa, #1e1b4b)`
              }
        } 
      />
      <div className="hover-popover-body">
        {/* Top Avatar Bar with Badges on the right */}
        <div className="hover-popover-avatar-bar">
          <div className="hover-popover-avatar-wrap">
            <div className="hover-popover-avatar">
              {hoveredMemberPopover.user.avatar_url ? (
                <img src={hoveredMemberPopover.user.avatar_url} alt={hoveredMemberPopover.user.display_name} />
              ) : (
                hoveredMemberPopover.user.display_name.slice(0, 1).toUpperCase()
              )}
              {deco && deco !== 'none' ? <AvatarDecoration decorationId={deco} /> : null}
            </div>
            <span className={`member-status-dot ${hoveredMemberPopover.isVoiceUser ? 'voice-active' : status}`} />
          </div>

          <div className="hover-popover-badges">
            {isCreator ? (
              <span className="hover-popover-badge creator" title="Dono do Servidor">
                <CrownIcon style={{ width: '12px', height: '12px' }} /> Dono
              </span>
            ) : hoveredMemberPopover.roleName ? (
              <span 
                className="hover-popover-badge role"
                style={{ 
                  color: hoveredMemberPopover.roleColor || '#00f2fe',
                  borderColor: `${hoveredMemberPopover.roleColor || '#00f2fe'}55`,
                  background: `${hoveredMemberPopover.roleColor || '#00f2fe'}18`
                }}
              >
                <span className="role-dot" style={{ background: hoveredMemberPopover.roleColor || '#00f2fe' }} />
                {hoveredMemberPopover.roleName}
              </span>
            ) : null}

            <span className={`hover-popover-status-pill ${status}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Name Row with Clan Tag & Pronouns */}
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
          {pronouns && (
            <span className="hover-popover-pronouns">
              ({pronouns})
            </span>
          )}
        </div>

        <span className="hover-popover-handle">
          @{hoveredMemberPopover.user.display_name.toLowerCase().replace(/\s+/g, '')}
        </span>

        {/* Activity: Game or Voice */}
        {hoveredMemberPopover.activeGame && (
          <div className="hover-popover-activity game">
            <GameLogo gameName={hoveredMemberPopover.activeGame} size={16} style={{ flexShrink: 0 }} />
            <span>
              Jogando <strong>{hoveredMemberPopover.activeGame}</strong>
              {hoveredMemberPopover.activeGameStartedAt ? ` • ${formatGameDuration(hoveredMemberPopover.activeGameStartedAt)}` : ''}
            </span>
          </div>
        )}

        {hoveredMemberPopover.isOnline && hoveredMemberPopover.isVoiceUser && !hoveredMemberPopover.activeGame && (
          <div className="hover-popover-activity voice" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <VolumeIcon style={{ width: '14px', height: '14px', color: '#22c55e', flexShrink: 0 }} />
            <span>Conectado na chamada de voz</span>
          </div>
        )}

        {/* Custom Status */}
        {hoveredMemberPopover.customStatus && (
          <div className="hover-popover-quote">
            <span>"{hoveredMemberPopover.customStatus}"</span>
          </div>
        )}

        {/* About Me / Bio */}
        {bio && (
          <div className="hover-popover-bio-section">
            <span className="hover-popover-section-label">SOBRE MIM</span>
            <p className="hover-popover-bio-text">{bio}</p>
          </div>
        )}

        {/* Roles */}
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

        {/* Quick Action Buttons */}
        <div className="hover-popover-actions">
          {!isCurrentUser && onOpenDM && (
            <button 
              type="button" 
              className="hover-popover-btn primary"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDM(targetUserId)
                setHoveredMemberPopover(null)
              }}
              title={`Enviar mensagem direta para ${hoveredMemberPopover.user.display_name}`}
            >
              <MessageSquareIcon style={{ width: '13px', height: '13px' }} />
              <span>Mensagem</span>
            </button>
          )}
          <button 
            type="button" 
            className="hover-popover-btn secondary"
            onClick={(e) => {
              e.stopPropagation()
              handleInspectFullProfile()
            }}
            title="Abrir perfil detalhado"
          >
            <UserIcon style={{ width: '13px', height: '13px' }} />
            <span>Ver Perfil</span>
          </button>
          {!isCurrentUser && onBlockUser && onUnblockUser && (
            blockedUserIds?.has(targetUserId) ? (
              <button
                type="button"
                className="hover-popover-btn secondary"
                style={{ borderColor: 'rgba(234,179,8,0.4)', color: '#facc15' }}
                onClick={(e) => {
                  e.stopPropagation()
                  onUnblockUser(targetUserId, hoveredMemberPopover.user.display_name)
                  setHoveredMemberPopover(null)
                }}
                title="Desbloquear este usuário"
              >
                <BanIcon style={{ width: '13px', height: '13px' }} />
                <span>Desbloquear</span>
              </button>
            ) : (
              <button
                type="button"
                className="hover-popover-btn secondary"
                style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }}
                onClick={(e) => {
                  e.stopPropagation()
                  onBlockUser(targetUserId, hoveredMemberPopover.user.display_name)
                  setHoveredMemberPopover(null)
                }}
                title="Bloquear este usuário"
              >
                <BanIcon style={{ width: '13px', height: '13px' }} />
                <span>Bloquear</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
