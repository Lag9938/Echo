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
      <div className="friends-list-container" style={{ maxWidth: '100%' }}>
        {pendingRequests.length === 0 ? (
          <div className="friends-hero-empty-card">
            <div className="echo-orbital-beacon">
              <div className="echo-orbital-ring">
                <div className="echo-orbital-satellite" />
              </div>
              <div className="echo-orbital-core">
                <ClockIcon style={{ width: '22px', height: '22px' }} />
              </div>
            </div>
            <h2 className="friends-hero-title">Nenhuma solicitação pendente</h2>
            <p className="friends-hero-desc">
              Você não possui convites pendentes de envio ou recebimento no momento. Quando alguém te convidar, você verá o alerta aqui.
            </p>
            <div className="friends-hero-actions">
              <button 
                type="button" 
                className="friends-hero-btn-primary" 
                onClick={() => setFriendTab('add')}
              >
                <UserPlusIcon style={{ width: '15px', height: '15px' }} />
                <span>Convidar Novos Amigos</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="friends-list-modern">
            {pendingRequests.map(req => {
              const isReceived = req.initiatorId !== user.id
              return (
                <div key={req.id} className="friend-card-modern">
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
                      <span className="friend-status-modern" style={{ color: isReceived ? '#10b981' : 'var(--text-muted)' }}>
                        {isReceived ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <InboxIcon style={{ width: '12px', height: '12px' }} />
                            <span>Quer ser seu amigo</span>
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <SendIcon style={{ width: '12px', height: '12px' }} />
                            <span>Solicitação enviada</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="friend-card-actions">
                    {isReceived ? (
                      <>
                        <button className="friend-quick-btn" onClick={() => acceptFriendRequest(req.id)} title="Aceitar Solicitação" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                          ✓
                        </button>
                        <button className="friend-quick-btn danger" onClick={() => removeFriendship(req.id)} title="Recusar Solicitação">
                          ✕
                        </button>
                      </>
                    ) : (
                      <button className="friend-action-btn cancel-btn" onClick={() => removeFriendship(req.id)} title="Cancelar solicitação">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Add friend tab
  return (
    <div className="add-friend-container" style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Share My Link Banner */}
      <div className="add-friend-hero-card">
        <div className="add-friend-hero-title">
          <LinkIcon style={{ width: '16px', height: '16px', color: 'var(--accent-color)' }} />
          <span>Compartilhe seu Link de Amigo</span>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
          Envie seu link direto no WhatsApp, redes sociais ou chat do jogo para seus amigos adicionarem você com 1 clique.
        </p>
        <div className="add-friend-link-row">
          <span className="add-friend-link-text">echo.lobby/add/@{profileDisplayName || 'gamer'}</span>
          <button type="button" className="add-friend-copy-btn" onClick={copyFriendLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <CopyIcon style={{ width: '12px', height: '12px' }} />
            <span>Copiar Link</span>
          </button>
        </div>
      </div>

      {/* Direct Username Form */}
      <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>Adicionar por Nome de Exibição</h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Digite o nome exato do jogador para enviar um pedido de amizade.
        </p>
        <form onSubmit={sendFriendRequest} className="add-friend-form">
          <input 
            value={friendSearchQuery} 
            onChange={e => setFriendSearchQuery(e.target.value)} 
            placeholder="Ex: Lag9938, CyberNinja, ProGamer..." 
            required 
            minLength={2}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, outline: 'none' }}
          />
          <button 
            type="submit" 
            style={{ padding: '12px 24px', borderRadius: '10px', background: 'var(--accent-color)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            Enviar Pedido
          </button>
        </form>
        {friendSearchNotice && (
          <div className={`friend-search-notice ${friendSearchNotice.includes('sucesso') ? 'success' : 'error'}`} style={{ marginTop: '12px' }}>
            {friendSearchNotice}
          </div>
        )}
      </div>

      {/* Friend Suggestions */}
      {suggestedMembers.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UsersIcon style={{ width: '15px', height: '15px', color: 'var(--accent-color)' }} />
            <span>Sugestões de Jogadores dos seus Espaços</span>
          </h4>
          <div className="friend-suggestions-grid">
            {suggestedMembers.map(m => (
              <div key={m.user.id} className="friend-suggestion-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div className="friend-avatar-modern" style={{ width: 34, height: 34, fontSize: 12 }}>
                    {m.user.avatar_url ? (
                      <img src={m.user.avatar_url} alt={m.user.display_name} />
                    ) : (
                      m.user.display_name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.user.display_name}
                  </span>
                </div>
                <button 
                  type="button" 
                  className="activity-action-btn" 
                  onClick={() => {
                    setFriendSearchQuery(m.user.display_name)
                  }}
                  style={{ padding: '5px 10px', fontSize: '11px', width: 'auto' }}
                  title="Adicionar"
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
