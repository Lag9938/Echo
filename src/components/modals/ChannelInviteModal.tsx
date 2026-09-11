import { useState } from 'react'
import { copyToClipboard } from '../../lib/clipboard'
import type { Channel, Space, FriendshipRequest } from '../../types'

export interface ChannelInviteModalProps {
  channel: Channel
  space: Space
  onClose: () => void
  friendships: FriendshipRequest[]
  onSendDMInvite: (friendUserId: string, inviteMessage: string) => Promise<void>
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
}

export function ChannelInviteModal({
  channel,
  space,
  onClose,
  friendships,
  onSendDMInvite,
  showToast
}: ChannelInviteModalProps) {
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [invitedFriends, setInvitedFriends] = useState<Record<string, boolean>>({})

  const isVoice = channel.type === 'voice'
  const inviteLink = `echo://invite/${space.id}?channel=${channel.id}`
  const formattedInviteMsg = `Entre no meu espaço "${space.name}" no Echo!\n🔗 Link Direto: ${inviteLink}\n🔑 Código do Espaço: ${space.id}`

  const handleCopy = () => {
    copyToClipboard(inviteLink)
    setCopied(true)
    showToast('Link Copiado!', `Link direto para ${isVoice ? 'a chamada' : 'o canal'} ${channel.name} copiado.`, 'info')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleCopyCode = () => {
    copyToClipboard(space.id)
    setCopiedCode(true)
    showToast('Código Copiado!', `Código do espaço copiado. Cole no botão "+" do Echo.`, 'info')
    setTimeout(() => setCopiedCode(false), 2500)
  }

  const handleInviteFriend = async (friend: FriendshipRequest) => {
    try {
      setInvitedFriends(prev => ({ ...prev, [friend.user.id]: true }))
      const msg = isVoice 
        ? `🔊 Entre na chamada "${channel.name}" comigo no espaço "${space.name}"!\nClique para entrar: ${inviteLink}\nOu cole o código: ${space.id}`
        : `💬 Participe do canal #${channel.name} no espaço "${space.name}"!\nClique para entrar: ${inviteLink}\nOu cole o código: ${space.id}`
      await onSendDMInvite(friend.user.id, msg)
      showToast('Convite Enviado!', `Convite enviado para @${friend.user.display_name}.`, 'friend')
    } catch {
      showToast('Erro ao enviar', 'Não foi possível enviar o convite no chat privado.', 'info')
    }
  }

  const acceptedFriends = friendships.filter(f => f.status === 'accepted')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="channel-invite-modal" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '500px',
          background: 'var(--bg-secondary, #141721)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
          color: 'var(--text-primary, #fff)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          animation: 'modalScaleSpring 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>{isVoice ? '🔊' : '#'}</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                Convidar para {channel.name}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
              {isVoice 
                ? `Compartilhe o link direto para amigos entrarem nesta chamada no Echo.`
                : `Compartilhe o link para amigos acessarem diretamente este canal no espaço "${space.name}".`}
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
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Link Input & Copy Box */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', marginBottom: '6px', letterSpacing: '0.5px' }}>
            LINK DIRETO (ABRE NO APLICATIVO ECHO)
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
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'monospace'
              }}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: copied ? '#10b981' : 'var(--accent-color, #00f2fe)',
                color: copied ? '#fff' : '#041018',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              {copied ? '✓ Copiado!' : 'Copiar Link'}
            </button>
          </div>
        </div>

        {/* Código do Espaço Box */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', marginBottom: '6px', letterSpacing: '0.5px' }}>
            CÓDIGO DE ENTRADA DO ESPAÇO (COLE EM "+ ENTRAR EM UM ESPAÇO")
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
              value={space.id}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: 'var(--accent-color, #00f2fe)',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                fontFamily: 'monospace'
              }}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: copiedCode ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              {copiedCode ? '✓ Copiado!' : 'Copiar Código'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            copyToClipboard(formattedInviteMsg)
            showToast('Mensagem Copiada!', 'Texto de convite copiado com link e código.', 'info')
          }}
          style={{
            width: '100%',
            padding: '9px 16px',
            borderRadius: '10px',
            border: '1px dashed rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--text-secondary, #b5bac1)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          📋 Copiar Mensagem de Convite Pronta (Link + Código)
        </button>

        {/* Quick Invite Friends Section */}
        {acceptedFriends.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', marginBottom: '10px', letterSpacing: '0.5px' }}>
              ENVIAR DIRETAMENTE PARA UM AMIGO
            </label>
            <div style={{
              maxHeight: '180px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingRight: '4px'
            }}>
              {acceptedFriends.map(friend => {
                const wasInvited = invitedFriends[friend.user.id]
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
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
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
                      <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{friend.user.display_name}</span>
                    </div>

                    <button
                      type="button"
                      disabled={wasInvited}
                      onClick={() => handleInviteFriend(friend)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: wasInvited ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                        background: wasInvited ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                        color: wasInvited ? '#34d399' : 'var(--text-primary, #fff)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: wasInvited ? 'default' : 'pointer',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      {wasInvited ? '✓ Convidado' : 'Convidar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{
          fontSize: '11.5px',
          color: 'var(--text-muted, #94a3b8)',
          background: 'rgba(0, 242, 254, 0.05)',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(0, 242, 254, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>💡</span>
          <span>
            {isVoice 
              ? 'Ao abrir este link, qualquer membro do espaço será conectado automaticamente a esta chamada.' 
              : 'Ao abrir este link, o membro será levado diretamente para este canal de texto.'}
          </span>
        </div>
      </div>
    </div>
  )
}
