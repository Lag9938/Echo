import React, { useEffect } from 'react'
import {
  UserPlusIcon,
  CloseXIcon,
  LinkIcon,
  CopyIcon,
  UsersIcon,
  SearchIcon
} from '../icons'

export interface AddFriendModalProps {
  onClose: () => void
  profileDisplayName: string
  copyFriendLink: () => void
  friendSearchQuery: string
  setFriendSearchQuery: (val: string) => void
  sendFriendRequest: (event: React.FormEvent) => void
  friendSearchNotice: string
  suggestedMembers: Array<{
    user: {
      id: string
      display_name: string
      avatar_url?: string
    }
  }>
}

/**
 * Janela de "Adicionar amigo": no mesmo formato da janela de convidar amigos para um espaço
 * (abre sobre a tela, em vez de ocupar a aba inteira). Tem o link de amigo, o pedido por nome
 * e as sugestões de jogadores dos espaços da pessoa.
 */
export function AddFriendModal({
  onClose,
  profileDisplayName,
  copyFriendLink,
  friendSearchQuery,
  setFriendSearchQuery,
  sendFriendRequest,
  friendSearchNotice,
  suggestedMembers
}: AddFriendModalProps) {
  // Esc fecha, como nas outras janelas
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const success = friendSearchNotice.includes('sucesso')

  return (
    <div className="invite-backdrop" onClick={onClose}>
      <div
        className="invite-modal add-friend-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar amigo"
        onClick={e => e.stopPropagation()}
      >
        <header className="invite-header">
          <div className="invite-space-icon add-friend-icon">
            <UserPlusIcon style={{ width: '22px', height: '22px' }} />
          </div>
          <div className="invite-title">
            <h3>Adicionar amigo</h3>
            <p>Envie um pedido pelo nome ou compartilhe o seu link.</p>
          </div>
          <button type="button" className="invite-close" onClick={onClose} aria-label="Fechar">
            <CloseXIcon style={{ width: '14px', height: '14px' }} />
          </button>
        </header>

        <section className="invite-section">
          <span className="invite-label">Adicionar pelo nome de exibição</span>
          <form className="invite-link-box" onSubmit={sendFriendRequest}>
            <SearchIcon className="invite-link-icon" style={{ width: '14px', height: '14px' }} />
            <input
              value={friendSearchQuery}
              onChange={e => setFriendSearchQuery(e.target.value)}
              placeholder="Ex: Lag9938, CyberNinja, ProGamer..."
              required
              minLength={2}
              autoFocus
            />
            <button type="submit" className="invite-primary-btn">
              <UserPlusIcon style={{ width: '13px', height: '13px' }} />
              <span>Enviar pedido</span>
            </button>
          </form>
          {friendSearchNotice && (
            <div className={`invite-notice ${success ? 'success' : 'error'}`}>{friendSearchNotice}</div>
          )}
        </section>

        <section className="invite-section invite-link-section">
          <span className="invite-label">Seu link de amigo</span>
          <div className="invite-link-box">
            <LinkIcon className="invite-link-icon" style={{ width: '14px', height: '14px' }} />
            <input readOnly value={`echo.lobby/add/@${profileDisplayName || 'gamer'}`} onClick={e => (e.target as HTMLInputElement).select()} />
            <button type="button" className="invite-primary-btn" onClick={copyFriendLink}>
              <CopyIcon style={{ width: '13px', height: '13px' }} />
              <span>Copiar link</span>
            </button>
          </div>
          <p className="invite-hint">Mande no WhatsApp, nas redes ou no chat do jogo: quem abrir adiciona você com 1 clique.</p>
        </section>

        {suggestedMembers.length > 0 && (
          <section className="invite-section invite-friends-section">
            <span className="invite-label">
              <UsersIcon style={{ width: '13px', height: '13px' }} /> Sugestões dos seus espaços
            </span>
            <div className="invite-friends-list">
              {suggestedMembers.map(m => (
                <div key={m.user.id} className="invite-friend">
                  <div className="invite-friend-main">
                    <div className="invite-avatar">
                      {m.user.avatar_url ? (
                        <img src={m.user.avatar_url} alt={m.user.display_name} />
                      ) : (
                        m.user.display_name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="invite-friend-text">
                      <span className="invite-friend-name">{m.user.display_name}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="invite-primary-btn small"
                    onClick={() => setFriendSearchQuery(m.user.display_name)}
                    title="Preencher o nome acima"
                  >
                    + Adicionar
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
