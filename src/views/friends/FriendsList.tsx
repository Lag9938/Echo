import { memo } from 'react'
import { formatGameDuration } from '../../lib/formatters'
import { AvatarDecoration } from '../../components/AvatarDecoration'
import { GameLogo } from '../../components/GameLogos'
import {
  UsersIcon,
  UserPlusIcon,
  MessageSquareIcon,
  PhoneIcon,
  UserIcon,
  BanIcon
} from '../../components/icons'

export interface FriendsListProps {
  friendTab: 'online' | 'all'
  setFriendTab: (tab: 'online' | 'all' | 'pending' | 'add') => void
  friendsList: Array<{
    id: string
    user: {
      id: string
      display_name: string
      avatar_url?: string
    }
  }>
  acceptedFriendsCount: number
  onlineUsers: Set<string>
  presenceData: Record<string, any>
  unreadDMs: Record<string, number>
  onOpenDM: (userId: string) => void
  onStartCall?: (userId: string, displayName: string, avatarUrl?: string) => void
  onInspectMember?: (member: any) => void
  onBlockUser?: (userId: string, displayName: string) => void
  removeFriendship: (friendshipId: string) => void
}

export const FriendsList = memo(function FriendsList({
  friendTab,
  setFriendTab,
  friendsList,
  acceptedFriendsCount,
  onlineUsers,
  presenceData,
  unreadDMs,
  onOpenDM,
  onStartCall,
  onInspectMember,
  onBlockUser,
  removeFriendship
}: FriendsListProps) {
  if (friendTab === 'online') {
    return (
      <div className="friends-list-container" style={{ maxWidth: '100%' }}>
        {friendsList.length === 0 ? (
          <div className="friends-empty-calm">
            <div className="friends-empty-calm-icon">
              <UsersIcon style={{ width: '28px', height: '28px' }} />
            </div>
            <h3 className="friends-empty-calm-title">Nenhum amigo online no momento</h3>
            <p className="friends-empty-calm-desc">
              Quando seus amigos entrarem no Echo, eles aparecerão aqui.
            </p>
            {acceptedFriendsCount > 0 && (
              <button 
                type="button" 
                className="friends-empty-calm-btn"
                onClick={() => setFriendTab('all')}
              >
                Ver Todos os Amigos ({acceptedFriendsCount})
              </button>
            )}
          </div>
        ) : (
          <div className="friends-list-modern">
            {friendsList.map(friend => {
              const pres = presenceData[friend.user.id]
              const statusType = pres?.presence_status || 'online'
              const gameStartedAt = pres?.current_game?.startedAt || pres?.game_presence?.startedAt
              const gameDur = formatGameDuration(gameStartedAt)
              let customText = pres?.custom_status || (pres?.current_game ? `Jogando ${pres.current_game.name}` : 'Disponível')
              if ((pres?.current_game || customText.toLowerCase().includes('jogando')) && gameDur && !customText.includes('•')) {
                customText = `${customText} • ${gameDur}`
              }
              const friendDeco = pres?.avatar_decoration || (friend.user as any).avatar_decoration || null
              return (
                <div key={friend.id} className="friend-card-modern" onClick={() => onOpenDM(friend.user.id)}>
                  <div className="friend-card-left">
                    <div className="friend-avatar-modern">
                      {friend.user.avatar_url ? (
                        <img src={friend.user.avatar_url} alt={friend.user.display_name} />
                      ) : (
                        friend.user.display_name.slice(0, 1).toUpperCase()
                      )}
                      {friendDeco && friendDeco !== 'none' && (
                        <AvatarDecoration decorationId={friendDeco} />
                      )}
                      <span className={`online-indicator ${statusType}`} />
                    </div>
                    <div className="friend-meta-modern">
                      <span className="friend-name-modern">{friend.user.display_name}</span>
                      <span className="friend-status-modern" title={customText}>
                        {customText.toLowerCase().includes('jogando') ? (
                          <span className="game-presence-badge" style={{ fontSize: '11px', padding: '2px 6px' }}>
                            <GameLogo gameName={customText.replace(/^jogando\s+/i, '').split('•')[0].trim()} size={13} style={{ flexShrink: 0 }} />
                            <span>{customText}</span>
                          </span>
                        ) : (
                          customText
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="friend-card-right">
                    {unreadDMs[friend.user.id] > 0 && (
                      <span 
                        className="friend-unread-whatsapp-badge" 
                        title={`${unreadDMs[friend.user.id]} ${unreadDMs[friend.user.id] === 1 ? 'mensagem nova' : 'mensagens novas'}`}
                      >
                        {unreadDMs[friend.user.id]}
                      </span>
                    )}

                    <div className="friend-card-actions" onClick={e => e.stopPropagation()}>
                      <button 
                        type="button" 
                        className="friend-quick-btn msg" 
                        onClick={() => onOpenDM(friend.user.id)} 
                        title="Enviar Mensagem Direta"
                      >
                        <MessageSquareIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button 
                        type="button" 
                        className="friend-quick-btn call" 
                        onClick={() => onStartCall ? onStartCall(friend.user.id, friend.user.display_name, friend.user.avatar_url) : onOpenDM(friend.user.id)} 
                        title="Iniciar Chamada Direta 1v1"
                      >
                        <PhoneIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                      {onInspectMember && (
                        <button 
                          type="button" 
                          className="friend-quick-btn profile" 
                          onClick={() => onInspectMember({ user: friend.user, role: 'Amigo' })} 
                          title="Ver Perfil Completo"
                        >
                          <UserIcon style={{ width: '16px', height: '16px' }} />
                        </button>
                      )}
                      {onBlockUser && (
                        <button 
                          type="button" 
                          className="friend-quick-btn danger" 
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja bloquear @${friend.user.display_name}?`)) {
                              onBlockUser(friend.user.id, friend.user.display_name)
                            }
                          }} 
                          title="Bloquear Usuário"
                        >
                          <BanIcon style={{ width: '15px', height: '15px' }} />
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="friend-quick-btn danger" 
                        onClick={() => removeFriendship(friend.id)} 
                        title="Desfazer Amizade"
                      >
                        <span className="friend-btn-close-icon">✕</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // All friends
  return (
    <div className="friends-list-container" style={{ maxWidth: '100%' }}>
      {friendsList.length === 0 ? (
        <div className="friends-empty-calm">
          <div className="friends-empty-calm-icon">
            <UsersIcon style={{ width: '28px', height: '28px' }} />
          </div>
          <h3 className="friends-empty-calm-title">Você ainda não tem amigos adicionados</h3>
          <p className="friends-empty-calm-desc">
            Adicione amigos para conversar por mensagens diretas, fazer chamadas e jogar juntos.
          </p>
          <button 
            type="button" 
            className="friends-empty-calm-btn primary" 
            onClick={() => setFriendTab('add')}
          >
            <UserPlusIcon style={{ width: '15px', height: '15px' }} />
            <span>Adicionar Amigos</span>
          </button>
        </div>
      ) : (
        <div className="friends-list-modern">
          {friendsList.map(friend => {
            const isOnline = onlineUsers.has(friend.user.id)
            const pres = presenceData[friend.user.id]
            const statusType = isOnline ? (pres?.presence_status || 'online') : 'offline'
            const gameStartedAt = pres?.current_game?.startedAt || pres?.game_presence?.startedAt
            const gameDur = formatGameDuration(gameStartedAt)
            let customText = isOnline ? (pres?.custom_status || (pres?.current_game ? `Jogando ${pres.current_game.name}` : 'Online')) : 'Offline'
            if (isOnline && (pres?.current_game || customText.toLowerCase().includes('jogando')) && gameDur && !customText.includes('•')) {
              customText = `${customText} • ${gameDur}`
            }
            const friendDeco = pres?.avatar_decoration || (friend.user as any).avatar_decoration || null
            return (
              <div key={friend.id} className="friend-card-modern" onClick={() => onOpenDM(friend.user.id)}>
                <div className="friend-card-left">
                  <div className="friend-avatar-modern">
                    {friend.user.avatar_url ? (
                      <img src={friend.user.avatar_url} alt={friend.user.display_name} />
                    ) : (
                      friend.user.display_name.slice(0, 1).toUpperCase()
                    )}
                    {friendDeco && friendDeco !== 'none' && (
                      <AvatarDecoration decorationId={friendDeco} />
                    )}
                    <span className={`online-indicator ${statusType}`} />
                  </div>
                  <div className="friend-meta-modern">
                    <span className="friend-name-modern">{friend.user.display_name}</span>
                    <span className="friend-status-modern" title={customText}>
                      {customText.toLowerCase().includes('jogando') ? (
                        <span className="game-presence-badge" style={{ fontSize: '11px', padding: '2px 6px' }}>
                          <GameLogo gameName={customText.replace(/^jogando\s+/i, '').split('•')[0].trim()} size={13} style={{ flexShrink: 0 }} />
                          <span>{customText}</span>
                        </span>
                      ) : (
                        customText
                      )}
                    </span>
                  </div>
                </div>

                <div className="friend-card-right">
                  {unreadDMs[friend.user.id] > 0 && (
                    <span 
                      className="friend-unread-whatsapp-badge" 
                      title={`${unreadDMs[friend.user.id]} ${unreadDMs[friend.user.id] === 1 ? 'mensagem nova' : 'mensagens novas'}`}
                    >
                      {unreadDMs[friend.user.id]}
                    </span>
                  )}

                  <div className="friend-card-actions" onClick={e => e.stopPropagation()}>
                    <button 
                      type="button" 
                      className="friend-quick-btn msg" 
                      onClick={() => onOpenDM(friend.user.id)} 
                      title="Enviar Mensagem Direta"
                    >
                      <MessageSquareIcon style={{ width: '16px', height: '16px' }} />
                    </button>
                    <button 
                      type="button" 
                      className="friend-quick-btn call" 
                      onClick={() => onStartCall ? onStartCall(friend.user.id, friend.user.display_name, friend.user.avatar_url) : onOpenDM(friend.user.id)} 
                      title="Iniciar Chamada Direta 1v1"
                    >
                      <PhoneIcon style={{ width: '16px', height: '16px' }} />
                    </button>
                    {onInspectMember && (
                      <button 
                        type="button" 
                        className="friend-quick-btn profile" 
                        onClick={() => onInspectMember({ user: friend.user, role: 'Amigo' })} 
                        title="Ver Perfil Completo"
                      >
                        <UserIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                    )}
                    {onBlockUser && (
                      <button 
                        type="button" 
                        className="friend-quick-btn danger" 
                        onClick={() => {
                          if (window.confirm(`Tem certeza que deseja bloquear @${friend.user.display_name}?`)) {
                            onBlockUser(friend.user.id, friend.user.display_name)
                          }
                        }} 
                        title="Bloquear Usuário"
                      >
                        <BanIcon style={{ width: '15px', height: '15px' }} />
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="friend-quick-btn danger" 
                      onClick={() => removeFriendship(friend.id)} 
                      title="Desfazer Amizade"
                    >
                      <span className="friend-btn-close-icon">✕</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
