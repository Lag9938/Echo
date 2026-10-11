import React, { memo } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  ClockIcon,
  UserPlusIcon,
  InboxIcon,
  SendIcon,
  LinkIcon,
  CopyIcon,
  UsersIcon
} from '../../components/icons'

export interface FriendRequestsProps {
  friendTab: 'pending' | 'add'
  setFriendTab: (tab: 'online' | 'all' | 'pending' | 'add') => void
  pendingRequests: Array<{
    id: string
    initiatorId: string
    user: {
      id: string
      display_name: string
      avatar_url?: string
    }
  }>
  acceptFriendRequest: (id: string) => void
  removeFriendship: (id: string) => void
  user: User
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
 * Abas de solicitações pendentes e de adicionar amigo.
 * Segue a mesma linguagem visual do Hub de Amigos: cartões de vidro,
 * botões de ação táteis e sem estilos inline para respeitar o tema Aurora.
 */
export const FriendRequests = memo(function FriendRequests({
  friendTab,
  setFriendTab,
  pendingRequests,
  acceptFriendRequest,
  removeFriendship,
  user,
  profileDisplayName,
  copyFriendLink,
  friendSearchQuery,
  setFriendSearchQuery,
  sendFriendRequest,
  friendSearchNotice,
  suggestedMembers
}: FriendRequestsProps) {
  if (friendTab === 'pending') {
    return (
      <div className="friends-list-container">
        {pendingRequests.length === 0 ? (
          /* Estado vazio calmo e acolhedor (substitui o beacon cósmico antigo por um visual limpo de vidro) */
          <div className="friends-empty-calm">
            <div className="friends-empty-calm-icon">
              <ClockIcon style={{ width: '28px', height: '28px' }} />
            </div>
            <h3 className="friends-empty-calm-title">Nenhuma solicitação pendente</h3>
            <p className="friends-empty-calm-desc">
              Você não possui convites pendentes de envio ou recebimento no momento. Quando alguém te convidar, você verá o alerta aqui.
            </p>
            <button
              type="button"
              className="friends-empty-calm-btn primary"
              onClick={() => setFriendTab('add')}
            >
              <UserPlusIcon style={{ width: '15px', height: '15px' }} />
              <span>Convidar Novos Amigos</span>
            </button>
          </div>
        ) : (
          <>
            {/* Título de seção idêntico ao das abas Online e Todos */}
            <h2 className="friends-section-title">
              <span>Solicitações pendentes</span>
              <span className="friends-section-count">{pendingRequests.length}</span>
            </h2>
            <div className="friends-list-modern">
              {pendingRequests.map(req => {
                const isReceived = req.initiatorId !== user.id
                return (
                  <div key={req.id} className="friend-card-modern friend-card-pending">
                    <div className="friend-card-left">
                      <div className="friend-avatar-modern">
                        {req.user.avatar_url ? (
                          <img src={req.user.avatar_url} alt={req.user.display_name} />
                        ) : (
                          req.user.display_name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="friend-meta-modern">
                        <span className="friend-name-modern">{req.user.display_name}</span>
                        <span className="friend-status-modern">
                          {isReceived ? (
                            <span className="friend-request-badge received">
                              <InboxIcon style={{ width: '13px', height: '13px' }} />
                              <span>Quer ser seu amigo</span>
                            </span>
                          ) : (
                            <span className="friend-request-badge sent">
                              <SendIcon style={{ width: '13px', height: '13px' }} />
                              <span>Solicitação enviada</span>
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="friend-card-right">
                      <div className="friend-card-actions">
                        {isReceived ? (
                          <>
                            <button
                              type="button"
                              className="friend-quick-btn accept"
                              onClick={() => acceptFriendRequest(req.id)}
                              title="Aceitar Solicitação"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="friend-quick-btn danger"
                              onClick={() => removeFriendship(req.id)}
                              title="Recusar Solicitação"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="friend-quick-pill cancel"
                            onClick={() => removeFriendship(req.id)}
                            title="Cancelar solicitação"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // Aba Adicionar amigo (quando renderizada diretamente na página de amigos)
  return (
    <div className="add-friend-container">
      {/* Cartão de compartilhamento do link de amigo */}
      <div className="add-friend-hero-card">
        <div className="add-friend-hero-header">
          <div className="add-friend-hero-icon">
            <LinkIcon style={{ width: '18px', height: '18px' }} />
          </div>
          <div className="add-friend-hero-text">
            <h3 className="add-friend-hero-title">Compartilhe seu Link de Amigo</h3>
            <p className="add-friend-hero-desc">
              Envie seu link direto no WhatsApp, redes sociais ou chat do jogo para seus amigos adicionarem você com 1 clique.
            </p>
          </div>
        </div>
        <div className="add-friend-link-row">
          <span className="add-friend-link-text">echo.lobby/add/@{profileDisplayName || 'gamer'}</span>
          <button type="button" className="add-friend-copy-btn" onClick={copyFriendLink}>
            <CopyIcon style={{ width: '13px', height: '13px' }} />
            <span>Copiar Link</span>
          </button>
        </div>
      </div>

      {/* Formulário de adicionar amigo pelo nome de usuário */}
      <div className="add-friend-card">
        <h3 className="add-friend-card-title">Adicionar por Nome de Exibição</h3>
        <p className="add-friend-card-desc">
          Digite o nome exato do jogador para enviar um pedido de amizade.
        </p>
        <form onSubmit={sendFriendRequest} className="add-friend-form">
          <input
            value={friendSearchQuery}
            onChange={e => setFriendSearchQuery(e.target.value)}
            placeholder="Ex: Lag9938, CyberNinja, ProGamer..."
            required
            minLength={2}
            className="add-friend-input"
          />
          <button type="submit" className="add-friend-submit-btn">
            Enviar Pedido
          </button>
        </form>
        {friendSearchNotice && (
          <div className={`friend-search-notice ${friendSearchNotice.includes('sucesso') ? 'success' : 'error'}`}>
            {friendSearchNotice}
          </div>
        )}
      </div>

      {/* Sugestões de amigos dos espaços em comum */}
      {suggestedMembers.length > 0 && (
        <div className="add-friend-suggestions-section">
          <h4 className="add-friend-suggestions-title">
            <UsersIcon style={{ width: '15px', height: '15px' }} />
            <span>Sugestões de Jogadores dos seus Espaços</span>
          </h4>
          <div className="friend-suggestions-grid">
            {suggestedMembers.map(m => (
              <div key={m.user.id} className="friend-suggestion-card">
                <div className="friend-suggestion-user">
                  <div className="friend-avatar-modern suggestion-avatar">
                    {m.user.avatar_url ? (
                      <img src={m.user.avatar_url} alt={m.user.display_name} />
                    ) : (
                      m.user.display_name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <span className="friend-suggestion-name">
                    {m.user.display_name}
                  </span>
                </div>
                <button
                  type="button"
                  className="friend-suggestion-btn"
                  onClick={() => {
                    setFriendSearchQuery(m.user.display_name)
                  }}
                  title="Convidar jogador"
                >
                  + Convidar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
