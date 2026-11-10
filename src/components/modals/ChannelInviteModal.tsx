import { useState } from 'react'
import { copyToClipboard } from '../../lib/clipboard'
import { useSpaceInviteLink } from '../../hooks/useSpaceInviteLink'
import { useVoiceStore } from '../../stores/useVoiceStore'
import { SearchIcon, CloseXIcon, CheckIcon, CopyIcon, KeyIcon, MessageSquareIcon, UsersIcon } from '../icons'
import type { Channel, Space, FriendshipRequest } from '../../types'

export interface ChannelInviteModalProps {
  channel: Channel
  space: Space
  onClose: () => void
  friendships: FriendshipRequest[]
  /** Quem está online agora (para o status de cada amigo); sem isso, todos aparecem como offline */
  onlineUsers?: Set<string>
  onSendDMInvite: (friendUserId: string, inviteMessage: string) => Promise<void>
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
}

/** Quem já está nesta sala de voz (a chamada em que você está e o que o espaço informa das outras) */
function useUsersInRoom(channelId: string): Set<string> {
  const activeVoiceChannelId = useVoiceStore((s) => s.activeVoiceChannelId)
  const participants = useVoiceStore((s) => s.participants)
  const roomUsers = useVoiceStore((s) => s.spaceVoiceUsers[channelId])
  const ids = new Set<string>()
  if (activeVoiceChannelId === channelId) participants.forEach(p => p?.userId && ids.add(p.userId))
  ;(roomUsers || []).forEach((p: any) => p?.userId && ids.add(p.userId))
  return ids
}

/**
 * Convidar para uma chamada (ou canal de texto), no mesmo estilo da janela de convidar para o espaço: amigos
 * primeiro (com busca e o estado de cada um: na chamada, online, offline) e o link compacto embaixo.
 */
export function ChannelInviteModal({
  channel,
  space,
  onClose,
  friendships,
  onlineUsers,
  onSendDMInvite,
  showToast
}: ChannelInviteModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [invitedFriends, setInvitedFriends] = useState<Record<string, boolean>>({})

  const isVoice = channel.type === 'voice'
  const inRoom = useUsersInRoom(channel.id)
  const { code: inviteCode, url: inviteLink, loading: inviteLoading, error: inviteError } = useSpaceInviteLink(space.id, channel.id)
  const inviteReady = Boolean(inviteCode && inviteLink)
  const formattedInviteMsg = isVoice
    ? `Bora pra chamada "${channel.name}" no espaço "${space.name}" no Echo!\n🔗 ${inviteLink}\n🔑 Código: ${inviteCode}`
    : `Vem pro canal #${channel.name} do espaço "${space.name}" no Echo!\n🔗 ${inviteLink}\n🔑 Código: ${inviteCode}`

  const flash = (set: (v: boolean) => void) => {
    set(true)
    setTimeout(() => set(false), 2500)
  }

  const handleCopyLink = () => {
    if (!inviteReady) return
    copyToClipboard(inviteLink)
    flash(setCopiedLink)
    showToast('Link copiado', `Link direto para ${isVoice ? 'a chamada' : 'o canal'} ${channel.name}.`, 'info')
  }

  const handleCopyCode = () => {
    if (!inviteCode) return
    copyToClipboard(inviteCode)
    flash(setCopiedCode)
    showToast('Código copiado', 'Cole no botão "+" do Echo.', 'info')
  }

  const handleCopyMessage = () => {
    if (!inviteReady) return
    copyToClipboard(formattedInviteMsg)
    flash(setCopiedMessage)
    showToast('Mensagem copiada', 'Texto de convite com link e código.', 'info')
  }

  const handleInviteFriend = async (friend: FriendshipRequest) => {
    if (!inviteReady) return
    try {
      setInvitedFriends(prev => ({ ...prev, [friend.user.id]: true }))
      const msg = isVoice
        ? `🔊 Entre na chamada "${channel.name}" comigo no espaço "${space.name}"!\nClique para entrar: ${inviteLink}\nOu cole o código: ${inviteCode}`
        : `💬 Participe do canal #${channel.name} no espaço "${space.name}"!\nClique para entrar: ${inviteLink}\nOu cole o código: ${inviteCode}`
      await onSendDMInvite(friend.user.id, msg)
      showToast('Convite enviado', `Convite enviado para @${friend.user.display_name}.`, 'friend')
    } catch {
      setInvitedFriends(prev => ({ ...prev, [friend.user.id]: false }))
      showToast('Erro ao enviar', 'Não foi possível enviar o convite no chat privado.', 'info')
    }
  }

  const acceptedFriends = friendships.filter(f => f.status === 'accepted')
  const query = searchQuery.trim().toLowerCase()
  const filteredFriends = acceptedFriends.filter(f => (f.user.display_name || '').toLowerCase().includes(query))
  // Quem já está na sala vai para o fim: os primeiros da lista são os que dá para chamar
  const sortedFriends = [...filteredFriends].sort((a, b) => Number(inRoom.has(a.user.id)) - Number(inRoom.has(b.user.id)))
  const inRoomCount = inRoom.size

  return (
    <div className="invite-backdrop" onClick={onClose}>
      <div
        className="invite-modal invite-cozy"
        role="dialog"
        aria-modal="true"
        aria-label={isVoice ? `Chamar amigos para ${channel.name}` : `Convidar amigos para #${channel.name}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="invite-header">
          <div className={`invite-space-icon invite-room-icon ${isVoice ? 'voice' : 'text'}`} aria-hidden="true">
            {isVoice ? '🔈' : '#'}
          </div>
          <div className="invite-title">
            <h3>{isVoice ? `Chamar para ${channel.name}` : `Convidar para #${channel.name}`}</h3>
            <p>
              {space.name}
              {isVoice && inRoomCount > 0 ? ` · ${inRoomCount} na chamada` : ''}
            </p>
          </div>
          <button type="button" className="invite-close" onClick={onClose} aria-label="Fechar">
            <CloseXIcon style={{ width: '14px', height: '14px' }} />
          </button>
        </header>

        {acceptedFriends.length > 0 && (
          <div className="invite-search">
            <SearchIcon className="invite-search-icon" style={{ width: '14px', height: '14px' }} />
            <input
              type="text"
              placeholder="Buscar amigos"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="invite-search-clear" onClick={() => setSearchQuery('')} aria-label="Limpar busca">✕</button>
            )}
          </div>
        )}

        <section className="invite-section invite-friends-section">
          <span className="invite-label">Amigos · {acceptedFriends.length}</span>
          <div className="invite-friends-list">
            {acceptedFriends.length === 0 ? (
              <div className="invite-empty">
                <div className="invite-empty-icon"><UsersIcon style={{ width: '20px', height: '20px' }} /></div>
                <strong>Nenhum amigo adicionado ainda</strong>
                <span>Mande o link abaixo para chamar alguém.</span>
              </div>
            ) : sortedFriends.length === 0 ? (
              <div className="invite-empty-small">Nenhum amigo encontrado para "{searchQuery}".</div>
            ) : (
              sortedFriends.map(friend => {
                const isOnline = Boolean(onlineUsers?.has(friend.user.id))
                const isInRoom = inRoom.has(friend.user.id)
                const wasInvited = invitedFriends[friend.user.id]
                return (
                  <div key={friend.id} className="invite-friend">
                    <div className="invite-friend-main">
                      <div className="invite-avatar">
                        {friend.user.avatar_url ? (
                          <img src={friend.user.avatar_url} alt={friend.user.display_name} />
                        ) : (
                          friend.user.display_name.slice(0, 1).toUpperCase()
                        )}
                        <span className={`invite-presence ${isOnline || isInRoom ? 'online' : 'offline'}`} />
                      </div>
                      <div className="invite-friend-text">
                        <span className="invite-friend-name">{friend.user.display_name}</span>
                        <span className={`invite-friend-sub ${isOnline || isInRoom ? 'online' : ''}`}>
                          {/* "Na chamada" já aparece à direita: aqui fica só o status */}
                          {isOnline || isInRoom ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    {isInRoom && isVoice ? (
                      <span className="invite-act in">Na chamada</span>
                    ) : wasInvited ? (
                      <span className="invite-act sent"><CheckIcon style={{ width: '12px', height: '12px' }} /> Enviado</span>
                    ) : (
                      <button
                        type="button"
                        className="invite-act"
                        disabled={!inviteReady}
                        onClick={() => handleInviteFriend(friend)}
                      >
                        {isVoice ? 'Chamar' : 'Convidar'}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="invite-share">
          <div className="invite-share-top">
            <b>{isVoice ? 'Ou mande o link da chamada' : 'Ou mande o link do canal'}</b>
            <span>abre direto no Echo</span>
          </div>
          <div className="invite-link-box">
            <input
              readOnly
              value={inviteLoading ? 'Gerando link de convite...' : (inviteLink || inviteError || 'Não foi possível gerar o link de convite.')}
              onClick={e => (e.target as HTMLInputElement).select()}
              aria-label="Link de convite"
            />
            <button
              type="button"
              className={`invite-primary-btn${copiedLink ? ' done' : ''}`}
              onClick={handleCopyLink}
              disabled={!inviteReady}
            >
              {copiedLink ? <><CheckIcon style={{ width: '13px', height: '13px' }} /><span>Copiado</span></> : <><CopyIcon style={{ width: '13px', height: '13px' }} /><span>Copiar</span></>}
            </button>
          </div>
          <div className="invite-secondary-row">
            <button type="button" className={`invite-secondary-btn${copiedCode ? ' done' : ''}`} onClick={handleCopyCode} disabled={!inviteCode}>
              {copiedCode ? <><CheckIcon style={{ width: '13px', height: '13px' }} /><span>Código copiado</span></> : <><KeyIcon style={{ width: '13px', height: '13px' }} /><span>{inviteCode ?? '...'}</span></>}
            </button>
            <button type="button" className={`invite-secondary-btn${copiedMessage ? ' done' : ''}`} onClick={handleCopyMessage} disabled={!inviteReady}>
              {copiedMessage ? <><CheckIcon style={{ width: '13px', height: '13px' }} /><span>Mensagem copiada</span></> : <><MessageSquareIcon style={{ width: '13px', height: '13px' }} /><span>Mensagem pronta</span></>}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
