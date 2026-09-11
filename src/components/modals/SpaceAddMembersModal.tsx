import { useState } from 'react'
import { copyToClipboard } from '../../lib/clipboard'
import { UserPlusIcon, SearchIcon } from '../icons'
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

  const inviteLink = `echo://invite/${space.id}`
  const formattedInviteMsg = `Entre no meu espaço "${space.name}" no Echo!\n🔗 Link Direto: ${inviteLink}\n🔑 Código do Espaço: ${space.id}`

  const handleCopyLink = () => {
    copyToClipboard(inviteLink)
    setCopiedLink(true)
    showToast('Link Copiado!', `Link de convite do espaço "${space.name}" copiado.`, 'info')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleCopyCode = () => {
    copyToClipboard(space.id)
    setCopiedCode(true)
    showToast('Código Copiado!', `Código do espaço copiado. Cole no botão "+" do Echo.`, 'info')
    setTimeout(() => setCopiedCode(false), 2500)
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="space-add-members-modal" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '520px',
          background: 'var(--bg-secondary, #141721)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.75)',
          color: 'var(--text-primary, #fff)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          animation: 'modalScaleSpring 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(0, 242, 254, 0.12)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-color, #00f2fe)'
              }}>
                <UserPlusIcon style={{ width: '18px', height: '18px' }} />
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  Adicionar Membros ao Espaço
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--accent-color, #00f2fe)', fontWeight: 600 }}>
                  {space.name}
                </span>
              </div>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
              Adicione seus amigos diretamente ao servidor com 1 clique ou compartilhe o link de convite.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Search Friend Input */}
        {acceptedFriends.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-tertiary, #0b0d14)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '8px 12px',
            gap: '10px'
          }}>
            <SearchIcon style={{ width: '14px', height: '14px', color: 'var(--text-muted, #94a3b8)' }} />
            <input 
              type="text"
              placeholder="Buscar amigos pelo nome..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: 'var(--text-primary, #fff)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Friends List */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', marginBottom: '8px', letterSpacing: '0.5px' }}>
            SEUS AMIGOS NO ECHO ({acceptedFriends.length})
          </label>
          
          <div style={{
            maxHeight: '220px',
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
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '13px'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>👥</div>
                Você ainda não tem amigos adicionados no Echo.<br />
                Compartilhe o link de convite abaixo para que eles entrem!
              </div>
            ) : filteredFriends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted, #94a3b8)', fontSize: '12.5px' }}>
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
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'var(--accent-light, #00f2fe22)',
                          color: 'var(--accent-color, #00f2fe)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          overflow: 'hidden'
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
                          border: '2px solid var(--bg-secondary, #141721)'
                        }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {friend.user.display_name}
                        </span>
                        <span style={{ fontSize: '11px', color: isOnline ? '#34d399' : 'var(--text-muted, #94a3b8)' }}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {isAlreadyIn ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399',
                        fontSize: '11.5px',
                        fontWeight: 600
                      }}>
                        ✓ Já no Espaço
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
                          background: 'var(--accent-color, #00f2fe)',
                          color: '#041018',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: isAdding ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                          opacity: isAdding ? 0.6 : 1
                        }}
                      >
                        <UserPlusIcon style={{ width: '13px', height: '13px' }} />
                        <span>{isAdding ? 'Adicionando...' : 'Adicionar'}</span>
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Link Direto e Código do Espaço */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', marginBottom: '5px', letterSpacing: '0.5px' }}>
              OU COMPARTILHE O LINK DIRETO
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-tertiary, #0b0d14)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '4px 6px 4px 12px',
              gap: '8px'
            }}>
              <input 
                readOnly 
                value={inviteLink}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary, #fff)',
                  fontSize: '12.5px',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: copiedLink ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {copiedLink ? '✓ Copiado!' : 'Copiar Link'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: copiedCode ? '#10b981' : 'rgba(255, 255, 255, 0.04)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              🔑 {copiedCode ? 'Código Copiado!' : `Copiar Código (${space.id.slice(0, 8)}...)`}
            </button>
            <button
              type="button"
              onClick={() => {
                copyToClipboard(formattedInviteMsg)
                showToast('Mensagem Copiada!', 'Texto formatado de convite copiado.', 'info')
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.02)',
                color: 'var(--text-secondary, #b5bac1)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              📋 Mensagem Pronta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
