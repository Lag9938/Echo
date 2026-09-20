import React from 'react'
import {
  BadgeCrownIcon,
  BadgeFounderIcon,
  BadgeStreamerIcon,
  BadgeVeteranIcon,
  BadgeVipIcon
} from './icons'

export type CommunityBadgeId = 'owner' | 'vip' | 'early' | 'gamer' | 'podcaster' | 'none' | string

export interface CommunityBadgeMeta {
  id: CommunityBadgeId
  label: string
  desc: string
  color: string
  bg: string
  border: string
}

export const COMMUNITY_BADGES: Record<string, CommunityBadgeMeta> = {
  owner: {
    id: 'owner',
    label: 'Líder de Espaço',
    desc: 'Fundadores de comunidade e construtores de espaços no Echo',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.45)'
  },
  vip: {
    id: 'vip',
    label: 'Echo VIP',
    desc: 'Membros apoiadores com acesso prioritário e suporte VIP',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.45)'
  },
  early: {
    id: 'early',
    label: 'Fundador 2026',
    desc: 'Pioneiros presentes no nascimento e lançamento da plataforma',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.45)'
  },
  gamer: {
    id: 'gamer',
    label: 'Membro Veterano',
    desc: 'Membros com presença contínua em canais e salas de voz',
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.15)',
    border: 'rgba(244, 63, 94, 0.45)'
  },
  veteran: {
    id: 'gamer',
    label: 'Membro Veterano',
    desc: 'Membros com presença contínua em canais e salas de voz',
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.15)',
    border: 'rgba(244, 63, 94, 0.45)'
  },
  podcaster: {
    id: 'podcaster',
    label: 'Streamer Oficial',
    desc: 'Criadores de conteúdo e transmissores parceiros no Echo',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.45)'
  },
  streamer: {
    id: 'podcaster',
    label: 'Streamer Oficial',
    desc: 'Criadores de conteúdo e transmissores parceiros no Echo',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.45)'
  }
}

export interface CommunityBadgeProps {
  badgeId?: CommunityBadgeId | null
  size?: number
  showLabel?: boolean
  className?: string
  style?: React.CSSProperties
}

export function CommunityBadge({
  badgeId,
  size = 14,
  showLabel = false,
  className = '',
  style
}: CommunityBadgeProps) {
  if (!badgeId || badgeId === 'none') return null
  const meta = COMMUNITY_BADGES[badgeId]
  if (!meta) return null

  const renderIcon = () => {
    const iconStyle = { width: `${size}px`, height: `${size}px`, flexShrink: 0 }
    switch (badgeId) {
      case 'owner':
        return <BadgeCrownIcon style={iconStyle} />
      case 'vip':
        return <BadgeVipIcon style={iconStyle} />
      case 'early':
        return <BadgeFounderIcon style={iconStyle} />
      case 'gamer':
      case 'veteran':
        return <BadgeVeteranIcon style={iconStyle} />
      case 'podcaster':
      case 'streamer':
        return <BadgeStreamerIcon style={iconStyle} />
      default:
        return null
    }
  }

  return (
    <span
      className={`echo-community-badge badge-${badgeId} ${showLabel ? 'has-label' : 'icon-only'} ${className}`}
      title={`${meta.label} • ${meta.desc}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: showLabel ? '4px' : '0',
        padding: showLabel ? '2px 7px' : '2px',
        borderRadius: showLabel ? '6px' : '5px',
        background: showLabel ? meta.bg : 'transparent',
        border: showLabel ? `1px solid ${meta.border}` : 'none',
        color: meta.color,
        fontSize: '10.5px',
        fontWeight: 700,
        verticalAlign: 'middle',
        cursor: 'default',
        lineHeight: 1,
        transition: 'transform 0.15s ease, filter 0.15s ease',
        ...style
      }}
    >
      {renderIcon()}
      {showLabel && <span>{meta.label}</span>}
    </span>
  )
}
