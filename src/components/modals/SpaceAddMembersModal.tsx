import { useState } from 'react'
import { copyToClipboard } from '../../lib/clipboard'
import { getPublicInviteUrl } from '../../lib/invite'
import { getServerGradient, getServerInitials } from '../../lib/formatters'
import {
  UserPlusIcon,
  SearchIcon,
  CloseXIcon,
  CheckIcon,
  CopyIcon,
  LinkIcon,
  KeyIcon,
  MessageSquareIcon,
  UsersIcon,
  SparklesIcon
} from '../icons'
import type { Space, FriendshipRequest } from '../../types'

export interface SpaceAddMembersModalProps {
  space: Space
  onClose: () => void
  friendships: FriendshipRequest[]
  spaceMembers: any[]
  onlineUsers: Set<string>
  onAddMember: (friend: FriendshipRequest) => Promise<boolean>
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
}

export function SpaceAddMembersModal({
  space,
  onClose,
  friendships,
  spaceMembers,
  onlineUsers,
  onAddMember,
  showToast
}: SpaceAddMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [addingIds, setAddingIds] = useState<Record<string, boolean>>({})
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({})
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)

  const inviteLink = getPublicInviteUrl(space.id)
  const formattedInviteMsg = `Entre no meu espaço "${space.name}" no Echo!\n🔗 Link Direto: ${inviteLink}\n🔑 Código do Espaço: ${space.id}`

  const handleCopyLink = () => {
    copyToClipboard(inviteLink)
    setCopiedLink(true)
    showToast('Link Copiado!', `Link de convite do espaço "${space.name}" copiado com sucesso.`, 'info')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleCopyCode = () => {
    copyToClipboard(space.id)
    setCopiedCode(true)
    showToast('Código Copiado!', `Código do espaço copiado. Cole no botão "+" do Echo.`, 'info')
    setTimeout(() => setCopiedCode(false), 2500)
  }

  const handleCopyMessage = () => {
    copyToClipboard(formattedInviteMsg)
    setCopiedMessage(true)
    showToast('Mensagem Copiada!', 'Texto completo de convite copiado.', 'info')
    setTimeout(() => setCopiedMessage(false), 2500)
  }

  const handleAddFriend = async (friend: FriendshipRequest) => {
    try {
      setAddingIds(prev => ({ ...prev, [friend.user.id]: true }))
      const success = await onAddMember(friend)
      if (success) {
        setAddedIds(prev => ({ ...prev, [friend.user.id]: true }))
      }
    } finally {
      setAddingIds(prev => ({ ...prev, [friend.user.id]: false }))
    }
  }

  const acceptedFriends = friendships.filter(f => f.status === 'accepted')
  const filteredFriends = acceptedFriends.filter(f =>
    (f.user.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const serverGradient = getServerGradient(space.name || space.id)
  const serverInitials = getServerInitials(space.name || 'Servidor')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="space-add-members-modal" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '92%',
          maxWidth: '500px',
          background: 'linear-gradient(180deg, #131722 0%, #0d1017 100%)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 24px 70px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          color: 'var(--text-primary, #fff)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          animation: 'modalScaleSpring 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxHeight: '88vh',
          overflow: 'hidden'
        }}
      >
        {/* Header com Avatar do Servidor e Título Moderno */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            {space.icon_url ? (
              <img 
                src={space.icon_url} 
                alt={space.name} 
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '13px',
                  objectFit: 'cover',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                  flexShrink: 0
                }} 
              />
            ) : (
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '13px',
                background: serverGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '0.5px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                flexShrink: 0
              }}>
                {serverInitials}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h3 style={{
                margin: 0,
                fontSize: '16.5px',
                fontWeight: 700,
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Convidar amigos para {space.name}
              </h3>
              <p style={{
                margin: '3px 0 0 0',
                fontSize: '12.5px',
                color: '#94a3b8',
                lineHeight: 1.3
              }}>
                Envie um convite direto ou compartilhe o link do servidor.
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            aria-label="Fechar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            <CloseXIcon style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        {/* Campo de Busca de Amigos */}
        {acceptedFriends.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.28)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '11px',
            padding: '8px 12px',
            gap: '10px',
            transition: 'border-color 0.15s ease'
          }}>
            <SearchIcon style={{ width: '14px', height: '14px', color: '#64748b' }} />
            <input 
              type="text"
              placeholder="Buscar amigos pelo nome..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Lista de Amigos */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.6px'
            }}>
              AMIGOS NO ECHO ({acceptedFriends.length})
            </span>
          </div>
          
          <div style={{
            maxHeight: '210px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingRight: '4px'
          }}>
            {acceptedFriends.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b'
                }}>
                  <UsersIcon style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '2px' }}>
                    Nenhum amigo adicionado ainda
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Compartilhe o link de convite abaixo para chamar seus amigos!
                  </div>
                </div>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '18px', color: '#64748b', fontSize: '12.5px' }}>
                Nenhum amigo encontrado para "{searchQuery}".
              </div>
            ) : (
              filteredFriends.map(friend => {
                const isOnline = onlineUsers.has(friend.user.id)
                const isAlreadyIn = addedIds[friend.user.id] || spaceMembers.some(m => (m?.user?.id || m?.id) === friend.user.id)
                const isAdding = addingIds[friend.user.id]

                return (
                  <div
                    key={friend.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.025)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {friend.user.avatar_url ? (
                            <img src={friend.user.avatar_url} alt={friend.user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            friend.user.display_name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <span style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          backgroundColor: isOnline ? '#10b981' : '#64748b',
                          boxShadow: isOnline ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                          border: '2px solid #131722'
                        }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: '#f8fafc',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {friend.user.display_name}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: isOnline ? '#34d399' : '#64748b',
                          fontWeight: isOnline ? 500 : 400
                        }}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {isAlreadyIn ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 11px',
                        borderRadius: '7px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.28)',
                        color: '#34d399',
                        fontSize: '11.5px',
                        fontWeight: 600
                      }}>
                        <CheckIcon style={{ width: '12px', height: '12px' }} />
                        No Servidor
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={() => handleAddFriend(friend)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)',
                          color: '#030712',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: isAdding ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 2px 8px rgba(0, 242, 254, 0.25)',
                          opacity: isAdding ? 0.65 : 1
                        }}
                        onMouseEnter={e => {
                          if (!isAdding) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 242, 254, 0.4)'
                        }}
                        onMouseLeave={e => {
                          if (!isAdding) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 242, 254, 0.25)'
                        }}
                      >
                        <UserPlusIcon style={{ width: '13px', height: '13px' }} />
                        <span>{isAdding ? 'Enviando...' : 'Convidar'}</span>
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Link Direto e Ações Rápidas (Zero Emojis Nativos) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px'
            }}>
              <label style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#64748b',
                letterSpacing: '0.6px'
              }}>
                LINK DE CONVITE DO ESPAÇO
              </label>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '2px 7px',
                borderRadius: '5px'
              }}>
                Nunca expira
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '4px 6px 4px 12px',
              gap: '10px'
            }}>
              <LinkIcon style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
              <input 
                readOnly 
                value={inviteLink}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  padding: '7px 16px',
                  borderRadius: '7px',
                  border: 'none',
                  background: copiedLink ? '#10b981' : 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)',
                  color: copiedLink ? '#fff' : '#030712',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: copiedLink ? '0 2px 10px rgba(16, 185, 129, 0.4)' : '0 2px 10px rgba(0, 242, 254, 0.25)'
                }}
              >
                {copiedLink ? (
                  <>
                    <CheckIcon style={{ width: '13px', height: '13px' }} />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon style={{ width: '13px', height: '13px' }} />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Botões secundários: Copiar Código e Mensagem Completa */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '9px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: copiedCode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: copiedCode ? '#34d399' : '#cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                if (!copiedCode) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
              }}
              onMouseLeave={e => {
                if (!copiedCode) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
              }}
            >
              {copiedCode ? (
                <>
                  <CheckIcon style={{ width: '13px', height: '13px', color: '#10b981' }} />
                  <span>Código Copiado!</span>
                </>
              ) : (
                <>
                  <KeyIcon style={{ width: '13px', height: '13px', color: '#38bdf8' }} />
                  <span>Código: {space.id.slice(0, 8)}...</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyMessage}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '9px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: copiedMessage ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: copiedMessage ? '#34d399' : '#cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                if (!copiedMessage) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
              }}
              onMouseLeave={e => {
                if (!copiedMessage) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
              }}
            >
              {copiedMessage ? (
                <>
                  <CheckIcon style={{ width: '13px', height: '13px', color: '#10b981' }} />
                  <span>Mensagem Copiada!</span>
                </>
              ) : (
                <>
                  <MessageSquareIcon style={{ width: '13px', height: '13px', color: '#38bdf8' }} />
                  <span>Mensagem Pronta</span>
                </>
              )}
            </button>
          </div>

          {/* Dica de usabilidade elegante com SparklesIcon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(56, 189, 248, 0.05)',
            border: '1px solid rgba(56, 189, 248, 0.12)',
            borderRadius: '9px',
            color: '#94a3b8',
            fontSize: '11.5px',
            lineHeight: 1.4
          }}>
            <SparklesIcon style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
            <span>
              O link abre a página do Echo no navegador e redireciona direto para o aplicativo.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
