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

type FriendItem = FriendsListProps['friendsList'][number]

interface FriendCardProps {
  friend: FriendItem
  /** 'online' | 'idle' | 'dnd' | 'invisible' | 'offline': define o selo no avatar */
  statusType: string
  /** Texto de apoio: atividade, status personalizado ou "Online" / "Offline" */
  customText: string
  decoration: string | null
  unread: number
  onOpenDM: FriendsListProps['onOpenDM']
  onStartCall?: FriendsListProps['onStartCall']
  onInspectMember?: FriendsListProps['onInspectMember']
  onBlockUser?: FriendsListProps['onBlockUser']
  removeFriendship: FriendsListProps['removeFriendship']
}

/**
 * Cartão de um amigo. Mensagem e chamada ficam sempre à vista (são o que se faz 90% das vezes);
 * ver perfil, bloquear e desfazer amizade aparecem numa barrinha ao passar o mouse (ou focar com o teclado).
 */
const FriendCard = memo(function FriendCard({
  friend,
  statusType,
  customText,
  decoration,
  unread,
  onOpenDM,
  onStartCall,
  onInspectMember,
  onBlockUser,
  removeFriendship
}: FriendCardProps) {
  const isPlaying = customText.toLowerCase().includes('jogando')
  return (
    <div className={`friend-card-modern status-${statusType}`} onClick={() => onOpenDM(friend.user.id)}>
      <div className="friend-card-left">
        <div className="friend-avatar-modern">
          {friend.user.avatar_url ? (
            <img src={friend.user.avatar_url} alt={friend.user.display_name} />
          ) : (
            friend.user.display_name.slice(0, 1).toUpperCase()
          )}
          {decoration && decoration !== 'none' && <AvatarDecoration decorationId={decoration} />}
          <span className={`online-indicator ${statusType}`} />
        </div>
        <div className="friend-meta-modern">
          <span className="friend-name-modern">{friend.user.display_name}</span>
          <span className="friend-status-modern" title={customText}>
            {isPlaying ? (
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

      <div className="friend-card-right" onClick={e => e.stopPropagation()}>
        <div className="friend-card-actions">
          {unread > 0 && (
            <span
              className="friend-unread-whatsapp-badge"
              title={`${unread} ${unread === 1 ? 'mensagem nova' : 'mensagens novas'}`}
            >
              {unread}
            </span>
          )}
          <button
            type="button"
            className="friend-quick-btn msg"
            onClick={() => onOpenDM(friend.user.id)}
            title="Enviar mensagem"
          >
            <MessageSquareIcon style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            type="button"
            className="friend-quick-btn call"
            onClick={() => (onStartCall ? onStartCall(friend.user.id, friend.user.display_name, friend.user.avatar_url) : onOpenDM(friend.user.id))}
            title="Iniciar chamada"
          >
            <PhoneIcon style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div className="friend-card-more">
          {onInspectMember && (
            <button
              type="button"
              className="friend-quick-btn profile"
              onClick={() => onInspectMember({ user: friend.user, role: 'Amigo' })}
              title="Ver perfil"
            >
              <UserIcon style={{ width: '14px', height: '14px' }} />
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
              title="Bloquear"
            >
              <BanIcon style={{ width: '14px', height: '14px' }} />
            </button>
          )}
          <button
            type="button"
            className="friend-quick-btn danger"
            onClick={() => removeFriendship(friend.id)}
            title="Desfazer amizade"
          >
            <span className="friend-btn-close-icon">✕</span>
          </button>
        </div>
      </div>
    </div>
  )
})

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
  const isOnlineTab = friendTab === 'online'

  if (friendsList.length === 0) {
    return (
      <div className="friends-list-container" style={{ maxWidth: '100%' }}>
        <div className="friends-empty-calm">
          <div className="friends-empty-calm-icon">
            <UsersIcon style={{ width: '28px', height: '28px' }} />
          </div>
          <h3 className="friends-empty-calm-title">
            {isOnlineTab ? 'Nenhum amigo online no momento' : 'Você ainda não tem amigos adicionados'}
          </h3>
          <p className="friends-empty-calm-desc">
            {isOnlineTab
              ? 'Quando seus amigos entrarem no Echo, eles aparecerão aqui.'
              : 'Adicione amigos para conversar por mensagens diretas, fazer chamadas e jogar juntos.'}
          </p>
          {isOnlineTab ? (
            acceptedFriendsCount > 0 && (
              <button
                type="button"
                className="friends-empty-calm-btn"
                onClick={() => setFriendTab('all')}
              >
                Ver Todos os Amigos ({acceptedFriendsCount})
              </button>
            )
          ) : (
            <button
              type="button"
              className="friends-empty-calm-btn primary"
              onClick={() => setFriendTab('add')}
            >
              <UserPlusIcon style={{ width: '15px', height: '15px' }} />
              <span>Adicionar Amigos</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="friends-list-container" style={{ maxWidth: '100%' }}>
      <h2 className="friends-section-title">
        <span>{isOnlineTab ? 'Online agora' : 'Todos os amigos'}</span>
        <span className="friends-section-count">{friendsList.length}</span>
      </h2>
      <div className="friends-list-modern">
        {friendsList.map(friend => {
          const pres = presenceData[friend.user.id]
          const isOnline = isOnlineTab ? true : onlineUsers.has(friend.user.id)
          const statusType = isOnline ? (pres?.presence_status || 'online') : 'offline'
          const gameStartedAt = pres?.current_game?.startedAt || pres?.game_presence?.startedAt
          const gameDur = formatGameDuration(gameStartedAt)
          let customText = isOnline
            ? (pres?.custom_status || (pres?.current_game ? `Jogando ${pres.current_game.name}` : (isOnlineTab ? 'Disponível' : 'Online')))
            : 'Offline'
          if (isOnline && (pres?.current_game || customText.toLowerCase().includes('jogando')) && gameDur && !customText.includes('•')) {
            customText = `${customText} • ${gameDur}`
          }
          const decoration = pres?.avatar_decoration || (friend.user as any).avatar_decoration || null
          return (
            <FriendCard
              key={friend.id}
              friend={friend}
              statusType={statusType}
              customText={customText}
              decoration={decoration}
              unread={unreadDMs[friend.user.id] || 0}
              onOpenDM={onOpenDM}
              onStartCall={onStartCall}
              onInspectMember={onInspectMember}
              onBlockUser={onBlockUser}
              removeFriendship={removeFriendship}
            />
          )
        })}
      </div>
    </div>
  )
})
