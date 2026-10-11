import { useState } from 'react'
import { copyToClipboard } from '../../lib/clipboard'
import { useSpaceInviteLink } from '../../hooks/useSpaceInviteLink'
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
  const [invitedIds, setInvitedIds] = useState<Record<string, boolean>>({})
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)

  const { code: inviteCode, url: inviteLink, loading: inviteLoading, error: inviteError } = useSpaceInviteLink(space.id)
  const inviteReady = Boolean(inviteCode && inviteLink)
  const formattedInviteMsg = `Entre no meu espaço "${space.name}" no Echo!\n🔗 Link Direto: ${inviteLink}\n🔑 Código de convite: ${inviteCode}`

  const handleCopyLink = () => {
    if (!inviteReady) return
    copyToClipboard(inviteLink)
    setCopiedLink(true)
    showToast('Link Copiado!', `Link de convite do espaço "${space.name}" copiado com sucesso.`, 'info')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleCopyCode = () => {
    if (!inviteCode) return
    copyToClipboard(inviteCode)
    setCopiedCode(true)
    showToast('Código Copiado!', `Código de convite copiado. Cole no botão "+" do Echo.`, 'info')
    setTimeout(() => setCopiedCode(false), 2500)
  }

  const handleCopyMessage = () => {
    if (!inviteReady) return
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
        setInvitedIds(prev => ({ ...prev, [friend.user.id]: true }))
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
    <div className="invite-backdrop" onClick={onClose}>
      <div
        className="invite-modal space-add-members-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Convidar amigos para ${space.name}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="invite-header">
          {space.icon_url ? (
            <img className="invite-space-icon" src={space.icon_url} alt={space.name} />
          ) : (
            <div className="invite-space-icon" style={{ background: serverGradient }}>{serverInitials}</div>
          )}
          <div className="invite-title">
            <h3>Convidar amigos para {space.name}</h3>
            <p>Envie um convite direto ou compartilhe o link do espaço.</p>
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
              placeholder="Buscar amigos pelo nome..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="invite-search-clear" onClick={() => setSearchQuery('')} aria-label="Limpar busca">✕</button>
            )}
          </div>
        )}

        <section className="invite-section invite-friends-section">
          <span className="invite-label">Amigos no Echo · {acceptedFriends.length}</span>
          <div className="invite-friends-list">
            {acceptedFriends.length === 0 ? (
              <div className="invite-empty">
                <div className="invite-empty-icon"><UsersIcon style={{ width: '20px', height: '20px' }} /></div>
                <strong>Nenhum amigo adicionado ainda</strong>
                <span>Compartilhe o link de convite abaixo para chamar seus amigos!</span>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="invite-empty-small">Nenhum amigo encontrado para "{searchQuery}".</div>
            ) : (
              filteredFriends.map(friend => {
                const isOnline = onlineUsers.has(friend.user.id)
                const isMember = spaceMembers.some(m => (m?.user?.id || m?.id) === friend.user.id)
                const wasInvited = invitedIds[friend.user.id]
                const isAdding = addingIds[friend.user.id]

                return (
                  <div key={friend.id} className="invite-friend">
                    <div className="invite-friend-main">
                      <div className="invite-avatar">
                        {friend.user.avatar_url ? (
                          <img src={friend.user.avatar_url} alt={friend.user.display_name} />
                        ) : (
                          friend.user.display_name.slice(0, 1).toUpperCase()
                        )}
                        <span className={`invite-presence ${isOnline ? 'online' : 'offline'}`} />
                      </div>
                      <div className="invite-friend-text">
                        <span className="invite-friend-name">{friend.user.display_name}</span>
                        <span className={`invite-friend-sub ${isOnline ? 'online' : ''}`}>{isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>

                    {isMember ? (
                      <span className="invite-chip ok">
                        <CheckIcon style={{ width: '12px', height: '12px' }} />
                        No espaço
                      </span>
                    ) : wasInvited ? (
                      <span className="invite-chip info">
                        <CheckIcon style={{ width: '12px', height: '12px' }} />
                        Convidado
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="invite-primary-btn small"
                        disabled={isAdding}
                        onClick={() => handleAddFriend(friend)}
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
        </section>

        <section className="invite-section invite-link-section">
          <div className="invite-label-row">
            <span className="invite-label">Link de convite do espaço</span>
            <span className="invite-chip info tiny">Nunca expira</span>
          </div>

          <div className="invite-link-box">
            <LinkIcon className="invite-link-icon" style={{ width: '14px', height: '14px' }} />
            <input
              readOnly
              value={inviteLoading ? 'Gerando link de convite...' : (inviteLink || inviteError || 'Não foi possível gerar o link de convite.')}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              className={`invite-primary-btn${copiedLink ? ' done' : ''}`}
              onClick={handleCopyLink}
              disabled={!inviteReady}
            >
              {copiedLink ? (
                <>
                  <CheckIcon style={{ width: '13px', height: '13px' }} />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <CopyIcon style={{ width: '13px', height: '13px' }} />
                  <span>Copiar link</span>
                </>
              )}
            </button>
          </div>

          <div className="invite-secondary-row">
            <button
              type="button"
              className={`invite-secondary-btn${copiedCode ? ' done' : ''}`}
              onClick={handleCopyCode}
              disabled={!inviteCode}
            >
              {copiedCode ? (
                <>
                  <CheckIcon style={{ width: '13px', height: '13px' }} />
                  <span>Código copiado!</span>
                </>
              ) : (
                <>
                  <KeyIcon style={{ width: '13px', height: '13px' }} />
                  <span>Código: {inviteCode ?? '...'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`invite-secondary-btn${copiedMessage ? ' done' : ''}`}
              onClick={handleCopyMessage}
              disabled={!inviteReady}
            >
              {copiedMessage ? (
                <>
                  <CheckIcon style={{ width: '13px', height: '13px' }} />
                  <span>Mensagem copiada!</span>
                </>
              ) : (
                <>
                  <MessageSquareIcon style={{ width: '13px', height: '13px' }} />
                  <span>Mensagem pronta</span>
                </>
              )}
            </button>
          </div>

          <div className="invite-tip">
            <SparklesIcon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
            <span>O link abre a página do Echo no navegador e redireciona direto para o aplicativo.</span>
          </div>
        </section>
      </div>
    </div>
  )
}