import { memo } from 'react'
import { formatGameDuration } from '../../lib/formatters'
import { AvatarDecoration } from '../../components/AvatarDecoration'
import { GameLogo, gameIconOf } from '../../components/GameLogos'
import {
  VolumeIcon,
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

/** O que a pessoa está fazendo agora, já separado (antes era um texto só, que o cartão tentava cortar) */
export type FriendActivity =
  | { kind: 'game'; name: string; iconUrl: string | null; since: string }
  | { kind: 'voice' }
  | { kind: 'custom'; text: string }
  | { kind: 'status'; status: 'online' | 'idle' | 'dnd' | 'offline'; text: string }

const STATUS_TEXT: Record<string, string> = { online: 'Disponível', idle: 'Ausente', dnd: 'Não perturbe', offline: 'Offline' }

/**
 * Atividade mostrada no cartão do amigo, por prioridade: jogando > em chamada > status personalizado > estado
 * (Disponível, Ausente, Não perturbe, Offline). Offline nunca mostra jogo nem chamada.
 */
export function friendActivity(pres: any, isOnline: boolean): FriendActivity {
  if (!isOnline) return { kind: 'status', status: 'offline', text: STATUS_TEXT.offline }
  const game = pres?.current_game || pres?.game_presence
  if (game?.name) {
    return {
      kind: 'game',
      name: String(game.name),
      iconUrl: gameIconOf(game),
      since: game.startedAt ? formatGameDuration(game.startedAt).replace('há ', '').replace(/(\d+)m$/, '$1 min') : ''
    }
  }
  if (pres?.voice_channel_id) return { kind: 'voice' }
  const custom = typeof pres?.custom_status === 'string' ? pres.custom_status.trim() : ''
  if (custom) return { kind: 'custom', text: custom }
  const status = pres?.presence_status === 'idle' || pres?.presence_status === 'dnd' ? pres.presence_status : 'online'
  return { kind: 'status', status, text: STATUS_TEXT[status] }
}

/** Uma linha só, sem caixa: o nome continua sendo o destaque do cartão */
function ActivityLine({ activity }: { activity: FriendActivity }) {
  if (activity.kind === 'game') {
    return (
      <span className="friend-activity game" title={`Jogando ${activity.name}${activity.since ? ` · ${activity.since}` : ''}`}>
        <GameLogo gameName={activity.name} iconUrl={activity.iconUrl} size={14} />
        <span className="friend-activity-text">
          Jogando <strong>{activity.name}</strong>{activity.since ? ` · ${activity.since}` : ''}
        </span>
      </span>
    )
  }
  if (activity.kind === 'voice') {
    return (
      <span className="friend-activity voice">
        <VolumeIcon style={{ width: 13, height: 13, flexShrink: 0 }} />
        <span className="friend-activity-text">Em chamada</span>
      </span>
    )
  }
  if (activity.kind === 'custom') {
    return <span className="friend-activity custom" title={activity.text}><span className="friend-activity-text">{activity.text}</span></span>
  }
  return (
    <span className={`friend-activity status-${activity.status}`}>
      <i className="friend-activity-dot" aria-hidden="true" />
      <span className="friend-activity-text">{activity.text}</span>
    </span>
  )
}

interface FriendCardProps {
  friend: FriendItem
  /** 'online' | 'idle' | 'dnd' | 'invisible' | 'offline': define o selo no avatar */
  statusType: string
  /** O que a pessoa está fazendo (jogo, chamada, status personalizado ou estado) */
  activity: FriendActivity
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
  activity,
  decoration,
  unread,
  onOpenDM,
  onStartCall,
  onInspectMember,
  onBlockUser,
  removeFriendship
}: FriendCardProps) {
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
          <span className="friend-status-modern">
            <ActivityLine activity={activity} />
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

  const renderCard = (friend: FriendItem) => {
    const pres = presenceData[friend.user.id]
    const isOnline = isOnlineTab ? true : onlineUsers.has(friend.user.id)
    const statusType = isOnline ? (pres?.presence_status || 'online') : 'offline'
    const decoration = pres?.avatar_decoration || (friend.user as any).avatar_decoration || null
    return (
      <FriendCard
        key={friend.id}
        friend={friend}
        statusType={statusType}
        activity={friendActivity(pres, isOnline)}
        decoration={decoration}
        unread={unreadDMs[friend.user.id] || 0}
        onOpenDM={onOpenDM}
        onStartCall={onStartCall}
        onInspectMember={onInspectMember}
        onBlockUser={onBlockUser}
        removeFriendship={removeFriendship}
      />
    )
  }

  // Só dados de presença que o app já tem em memória: quem está online e jogando agora
  const playingNow = friendsList.filter(
    f => (isOnlineTab || onlineUsers.has(f.user.id)) && presenceData[f.user.id]?.current_game?.name
  )
  // Na aba "Todos" os offline ficam numa seção própria, abaixo de quem está online
  const onlineGroup = isOnlineTab ? friendsList : friendsList.filter(f => onlineUsers.has(f.user.id))
  const offlineGroup = isOnlineTab ? [] : friendsList.filter(f => !onlineUsers.has(f.user.id))

  return (
    <div className="friends-list-container" style={{ maxWidth: '100%' }}>
      {playingNow.length > 0 && (
        <section className="friends-now" aria-label="Jogando agora">
          <h2 className="friends-section-title">
            <span>Agora</span>
            <span className="friends-section-count">{playingNow.length}</span>
          </h2>
          <div className="friends-now-strip">
            {playingNow.map(f => {
              const game = presenceData[f.user.id].current_game.name as string
              return (
                <button
                  type="button"
                  key={f.id}
                  className="friends-now-chip"
                  onClick={() => onOpenDM(f.user.id)}
                  title={`${f.user.display_name} · Jogando ${game}`}
                >
                  <span className="friends-now-avatar">
                    {f.user.avatar_url ? (
                      <img src={f.user.avatar_url} alt="" />
                    ) : (
                      f.user.display_name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="friends-now-text">
                    <span className="friends-now-name">{f.user.display_name}</span>
                    <span className="friends-now-game">
                      <GameLogo gameName={game} iconUrl={gameIconOf(presenceData[f.user.id].current_game)} size={12} style={{ flexShrink: 0 }} />
                      <span>{game}</span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {onlineGroup.length > 0 && (
        <>
          <h2 className="friends-section-title">
            <span>{isOnlineTab ? 'Online agora' : 'Online'}</span>
            <span className="friends-section-count">{onlineGroup.length}</span>
          </h2>
          <div className="friends-list-modern">{onlineGroup.map(renderCard)}</div>
        </>
      )}

      {offlineGroup.length > 0 && (
        <>
          <h2 className="friends-section-title friends-section-offline">
            <span>Offline</span>
            <span className="friends-section-count">{offlineGroup.length}</span>
          </h2>
          <div className="friends-list-modern">{offlineGroup.map(renderCard)}</div>
        </>
      )}
    </div>
  )
})
