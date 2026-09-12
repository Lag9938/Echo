import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { extractSpaceIdFromInvite, triggerInAppInvite } from '../../lib/invite'
import { useSpacesStore } from '../../stores/useSpacesStore'
import { SparklesIcon, UsersIcon, CheckIcon } from '../icons'

interface InAppSpaceInviteCardProps {
  inviteUrl: string
}

interface SpaceInviteDetails {
  id?: string
  name: string
  description?: string | null
  icon_url?: string | null
  banner_url?: string | null
  banner_theme?: string | null
  member_count?: number
}

export const InAppSpaceInviteCard: React.FC<InAppSpaceInviteCardProps> = ({ inviteUrl }) => {
  const [spaceInfo, setSpaceInfo] = useState<SpaceInviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const spaces = useSpacesStore((s) => s.spaces)
  const parsed = extractSpaceIdFromInvite(inviteUrl)
  const spaceId = parsed?.spaceId || ''
  const channelId = parsed?.channelId

  // Verifica se o usuário já é membro deste espaço
  const memberSpace = spaces.find((s) => s.id === spaceId)
  const isAlreadyMember = Boolean(memberSpace)

  useEffect(() => {
    let isMounted = true
    if (!spaceId) {
      setLoading(false)
      setError(true)
      return
    }

    // Se já estiver na lista de espaços locais do usuário, usa dados locais imediatamente
    if (memberSpace) {
      setSpaceInfo({
        id: memberSpace.id,
        name: memberSpace.name,
        description: (memberSpace as any).description || null,
        icon_url: (memberSpace as any).icon_url || null,
        member_count: undefined
      })
    }

    // Busca detalhes públicos via RPC segura do Supabase (get_space_invite_details)
    async function fetchDetails() {
      if (!supabase) return
      try {
        const { data, error: rpcError } = await supabase.rpc('get_space_invite_details', {
          p_space_id: spaceId
        })

        if (!isMounted) return

        if (!rpcError && data && Array.isArray(data) && data.length > 0) {
          const detail = data[0]
          setSpaceInfo((prev) => ({
            id: spaceId,
            name: detail.name || prev?.name || 'Espaço Echo',
            description: detail.description ?? prev?.description,
            icon_url: detail.icon_url ?? prev?.icon_url,
            banner_url: detail.banner_url ?? prev?.banner_url,
            banner_theme: detail.banner_theme ?? prev?.banner_theme,
            member_count: Number(detail.member_count) || 1
          }))
          setError(false)
        } else if (!memberSpace) {
          // Se não encontrou via RPC nem é membro local
          setError(true)
        }
      } catch (err) {
        console.warn('[InAppSpaceInviteCard] Falha ao carregar detalhes do convite:', err)
        if (!memberSpace && isMounted) {
          setError(true)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchDetails()

    return () => {
      isMounted = false
    }
  }, [spaceId, memberSpace])

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (isAlreadyMember) {
      // Já é membro: apenas navega instantaneamente para o servidor e canal
      triggerInAppInvite(inviteUrl)
      return
    }

    // Não é membro: inicia processo de entrada
    setIsJoining(true)
    triggerInAppInvite(inviteUrl)
    setTimeout(() => {
      setIsJoining(false)
    }, 2500)
  }

  if (loading && !spaceInfo) {
    return (
      <div style={{
        marginTop: '8px',
        maxWidth: '440px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'rgba(18, 22, 32, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          animation: 'pulse 1.5s infinite'
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '120px', height: '14px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', marginBottom: '6px' }} />
          <div style={{ width: '70px', height: '11px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px' }} />
        </div>
      </div>
    )
  }

  if (error || !spaceInfo) {
    return (
      <div style={{
        marginTop: '8px',
        maxWidth: '420px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'rgba(239, 68, 68, 0.06)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'rgba(239, 68, 68, 0.15)',
          display: 'grid',
          placeItems: 'center',
          color: '#ef4444',
          fontSize: '16px'
        }}>
          ⚠️
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>Convite Inválido ou Expirado</div>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Este link pode ter sido excluído ou o espaço não existe mais.</div>
        </div>
      </div>
    )
  }

  const initials = (spaceInfo.name || 'E')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <div
      className="in-app-space-invite-card"
      style={{
        marginTop: '8px',
        maxWidth: '440px',
        borderRadius: '14px',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, rgba(20, 24, 36, 0.95), rgba(13, 16, 24, 0.98))',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header Tag Discord Style */}
      <div style={{
        padding: '10px 14px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.08), rgba(0, 242, 254, 0.01))'
      }}>
        <SparklesIcon style={{ width: '13px', height: '13px', color: '#00f2fe' }} />
        <span style={{
          fontSize: '10.5px',
          fontWeight: 750,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.75)'
        }}>
          Você recebeu um convite para entrar em um espaço
        </span>
      </div>

      {/* Main Content Row */}
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        {/* Left: Server Avatar + Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          {/* Avatar Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '13px',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #00c6ff, #0072ff)',
            border: '1.5px solid rgba(255, 255, 255, 0.15)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            {spaceInfo.icon_url ? (
              <img
                src={spaceInfo.icon_url}
                alt={spaceInfo.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none'
                }}
              />
            ) : (
              <span style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>
                {initials}
              </span>
            )}
          </div>

          {/* Details Column */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{
              fontSize: '14.5px',
              fontWeight: 700,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {spaceInfo.name}
            </span>

            {/* Member count pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981'
                }} />
                <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>
                  {spaceInfo.member_count ? `${spaceInfo.member_count} ${spaceInfo.member_count === 1 ? 'membro' : 'membros'}` : 'Comunidade ativa'}
                </span>
              </div>

              {channelId && (
                <span style={{
                  fontSize: '11px',
                  color: '#00f2fe',
                  background: 'rgba(0, 242, 254, 0.12)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 600
                }}>
                  # canal
                </span>
              )}
            </div>

            {spaceInfo.description && (
              <p style={{
                margin: 0,
                marginTop: '2px',
                fontSize: '11.5px',
                color: 'rgba(255, 255, 255, 0.55)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.3'
              }}>
                {spaceInfo.description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Direct In-App Join / Switch Button */}
        <button
          type="button"
          onClick={handleActionClick}
          disabled={isJoining}
          style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderRadius: '9px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: isJoining ? 'not-allowed' : 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            ...(isAlreadyMember
              ? {
                  background: 'rgba(0, 242, 254, 0.12)',
                  border: '1px solid rgba(0, 242, 254, 0.4)',
                  color: '#00f2fe'
                }
              : {
                  background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
                  border: 'none',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(0, 114, 255, 0.4)'
                })
          }}
        >
          {isAlreadyMember ? (
            <>
              <CheckIcon style={{ width: '13px', height: '13px' }} />
              <span>Acessar</span>
            </>
          ) : isJoining ? (
            <>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              <span>Entrando...</span>
            </>
          ) : (
            <>
              <UsersIcon style={{ width: '13px', height: '13px' }} />
              <span>Entrar</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
