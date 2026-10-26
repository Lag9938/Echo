import { useState, useMemo, useEffect, memo } from 'react'
import type { NotificationHistoryItem } from '../../hooks/useEchoToasts'
import {
  BellIcon,
  BellOffIcon,
  HashtagIcon,
  UserIcon,
  UsersIcon,
  HeadphonesIcon,
  TrashIcon
} from '../icons'

export interface ActivityInboxModalProps {
  isOpen: boolean
  onClose: () => void
  notifications: NotificationHistoryItem[]
  onJumpToNotification: (item: NotificationHistoryItem) => void
  onMarkAllAsRead: () => void
  onClearHistory: () => void
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return 'agora'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `há ${diffMin} min`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `há ${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    return `há ${diffDays}d`
  } catch {
    return 'recente'
  }
}

export const ActivityInboxModal = memo(function ActivityInboxModal({
  isOpen,
  onClose,
  notifications,
  onJumpToNotification,
  onMarkAllAsRead,
  onClearHistory
}: ActivityInboxModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'mentions' | 'dms' | 'friends'>('all')

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === 'mentions') {
        return item.type === 'mention' || item.data?.type === 'channel'
      }
      if (activeTab === 'dms') {
        return item.type === 'message' || item.data?.type === 'dm' || item.data?.type === 'group'
      }
      if (activeTab === 'friends') {
        return item.type === 'friend' || item.data?.type === 'friend'
      }
      return true
    })
  }, [notifications, activeTab])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const unreadCount = notifications.filter((n) => !n.read).length
  const mentionsCount = notifications.filter((n) => n.type === 'mention' || n.data?.type === 'channel').length
  const dmsCount = notifications.filter((n) => n.type === 'message' || n.data?.type === 'dm' || itemIsGroup(n)).length
  const friendsCount = notifications.filter((n) => n.type === 'friend').length

  function itemIsGroup(n: NotificationHistoryItem): boolean {
    return n.data?.type === 'group'
  }

  return (
    <div
      className="screen-picker-overlay confirm-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Central de Notificações"
    >
      <div
        className="activity-inbox-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '540px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '85vh',
          background: 'var(--glass-card, var(--calm-raised, #1c1a24))',
          border: '1px solid var(--glass-card-edge, var(--calm-line, rgba(255, 255, 255, 0.12)))',
          borderRadius: '18px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalScaleSpring 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both'
        }}
      >
        {/* Header da Central */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--calm-line, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--calm-panel, rgba(0, 0, 0, 0.2))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, var(--accent-fill, var(--accent-color, #8b5cf6)) 18%, transparent)',
                color: 'var(--accent-fill, var(--accent-color, #a78bfa))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BellIcon style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Central de Notificações
                </h3>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'var(--accent-fill, var(--accent-color, #8b5cf6))',
                      color: '#ffffff'
                    }}
                  >
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Histórico recente de atividades e mensagens
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 0,
                  color: 'var(--accent-fill, var(--accent-color, #a78bfa))',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                Marcar lidas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 0,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px 8px',
                borderRadius: '6px',
                lineHeight: 1
              }}
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Abas de Filtro */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            borderBottom: '1px solid var(--calm-line, rgba(255, 255, 255, 0.08))',
            background: 'var(--calm-raised, rgba(255, 255, 255, 0.02))'
          }}
        >
          <button
            type="button"
            className={`tab-filter-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 0,
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'all' ? 'var(--accent-fill, var(--accent-color, #8b5cf6))' : 'transparent',
              color: activeTab === 'all' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            Todas ({notifications.length})
          </button>

          <button
            type="button"
            className={`tab-filter-btn ${activeTab === 'mentions' ? 'active' : ''}`}
            onClick={() => setActiveTab('mentions')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 0,
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'mentions' ? 'var(--accent-fill, var(--accent-color, #8b5cf6))' : 'transparent',
              color: activeTab === 'mentions' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            Menções (@) ({mentionsCount})
          </button>

          <button
            type="button"
            className={`tab-filter-btn ${activeTab === 'dms' ? 'active' : ''}`}
            onClick={() => setActiveTab('dms')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 0,
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'dms' ? 'var(--accent-fill, var(--accent-color, #8b5cf6))' : 'transparent',
              color: activeTab === 'dms' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            Mensagens ({dmsCount})
          </button>

          <button
            type="button"
            className={`tab-filter-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 0,
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'friends' ? 'var(--accent-fill, var(--accent-color, #8b5cf6))' : 'transparent',
              color: activeTab === 'friends' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            Amizades ({friendsCount})
          </button>
        </div>

        {/* Lista de Notificações */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          {filteredNotifications.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'var(--calm-hover, rgba(255, 255, 255, 0.05))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  color: 'var(--text-muted)'
                }}
              >
                <BellOffIcon style={{ width: '24px', height: '24px' }} />
              </div>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Tudo em dia!
              </strong>
              <span style={{ fontSize: '12px', maxWidth: '240px' }}>
                Nenhuma notificação nesta categoria no momento.
              </span>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isMention = item.type === 'mention' || item.data?.type === 'channel'
              const isFriend = item.type === 'friend'
              const isVoice = item.type === 'voice'

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onJumpToNotification(item)
                    onClose()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: item.read
                      ? 'transparent'
                      : 'color-mix(in srgb, var(--accent-fill, #8b5cf6) 8%, var(--calm-raised, rgba(255, 255, 255, 0.03)))',
                    border: '1px solid',
                    borderColor: item.read
                      ? 'transparent'
                      : 'color-mix(in srgb, var(--accent-fill, #8b5cf6) 25%, var(--calm-line, rgba(255, 255, 255, 0.08)))',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="inbox-item-row"
                >
                  {/* Ícone ou Avatar */}
                  <div style={{ flexShrink: 0, width: '38px', height: '38px', position: 'relative' }}>
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt={item.title}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: isMention
                            ? 'color-mix(in srgb, var(--accent-fill, #8b5cf6) 20%, transparent)'
                            : isFriend
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isVoice
                            ? 'rgba(6, 182, 212, 0.15)'
                            : 'var(--calm-hover, rgba(255, 255, 255, 0.08))',
                          color: isMention
                            ? 'var(--accent-fill, var(--accent-color, #a78bfa))'
                            : isFriend
                            ? '#34d399'
                            : isVoice
                            ? '#22d3ee'
                            : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {isMention ? (
                          <HashtagIcon style={{ width: '18px', height: '18px' }} />
                        ) : isFriend ? (
                          <UserIcon style={{ width: '18px', height: '18px' }} />
                        ) : isVoice ? (
                          <HeadphonesIcon style={{ width: '18px', height: '18px' }} />
                        ) : (
                          <UsersIcon style={{ width: '18px', height: '18px' }} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Detalhes */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {item.message}
                    </p>
                  </div>

                  {/* Dot de não-lido */}
                  {!item.read && (
                    <div
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: 'var(--accent-fill, var(--accent-color, #8b5cf6))',
                        alignSelf: 'center',
                        flexShrink: 0
                      }}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé com Ação de Limpeza */}
        {notifications.length > 0 && (
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--calm-line, rgba(255, 255, 255, 0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--calm-panel, rgba(0, 0, 0, 0.15))'
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              {notifications.length} notificaç{notifications.length > 1 ? 'ões salvas' : 'ão salva'}
            </span>
            <button
              type="button"
              onClick={onClearHistory}
              style={{
                background: 'none',
                border: 0,
                color: 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '6px'
              }}
            >
              <TrashIcon style={{ width: '13px', height: '13px' }} />
              <span>Limpar histórico</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
})
