import { useState, useMemo, useEffect, memo } from 'react'
import {
  ForwardIcon,
  SearchIcon,
  UsersIcon,
  HashtagIcon,
  SendIcon
} from '../icons'
import {
  type ForwardableMessage,
  getMessageSnippetLabel
} from '../../lib/messageActions'

export interface ForwardDestination {
  kind: 'dm' | 'group' | 'channel'
  id: string
  name: string
  subtitle?: string
  avatarUrl?: string
}

export interface ForwardMessageModalProps {
  message: ForwardableMessage | null
  onClose: () => void
  destinations: ForwardDestination[]
  onForwardToDestination: (
    dest: ForwardDestination,
    message: ForwardableMessage,
    comment?: string
  ) => Promise<void> | void
}

export const ForwardMessageModal = memo(function ForwardMessageModal({
  message,
  onClose,
  destinations,
  onForwardToDestination
}: ForwardMessageModalProps) {
  const [query, setQuery] = useState('')
  const [comment, setComment] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'dm' | 'group' | 'channel'>('all')
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!message) return
    setQuery('')
    setComment('')
    setActiveFilter('all')
    setSentIds(new Set())
    setSendingIds(new Set())
  }, [message])

  useEffect(() => {
    if (!message) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [message, onClose])

  const filteredDestinations = useMemo(() => {
    const q = query.trim().toLowerCase()
    return destinations.filter((d) => {
      if (activeFilter !== 'all' && d.kind !== activeFilter) return false
      if (!q) return true
      return (
        d.name.toLowerCase().includes(q) ||
        (d.subtitle && d.subtitle.toLowerCase().includes(q))
      )
    })
  }, [destinations, query, activeFilter])

  if (!message) return null

  const snippet = getMessageSnippetLabel(message)
  const isImagePreview =
    Boolean(message.attachment_url) &&
    (message.attachment_type === 'image' ||
      message.attachment_type?.startsWith('image') ||
      message.attachment_type === 'sticker')

  const handleSend = async (dest: ForwardDestination) => {
    const key = `${dest.kind}:${dest.id}`
    if (sentIds.has(key) || sendingIds.has(key)) return
    setSendingIds((prev) => new Set(prev).add(key))
    try {
      await onForwardToDestination(dest, message, comment.trim() || undefined)
      setSentIds((prev) => new Set(prev).add(key))
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const dmCount = destinations.filter((d) => d.kind === 'dm').length
  const groupCount = destinations.filter((d) => d.kind === 'group').length
  const channelCount = destinations.filter((d) => d.kind === 'channel').length

  return (
    <div
      className="screen-picker-overlay confirm-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Encaminhar mensagem"
    >
      <div
        className="forward-message-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="forward-modal-header">
          <div className="forward-modal-header-left">
            <div className="forward-modal-icon-badge">
              <ForwardIcon style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h3 className="forward-modal-title">Encaminhar mensagem</h3>
              <span className="forward-modal-subtitle">
                Envie para amigos, grupos ou canais
              </span>
            </div>
          </div>
          <button
            type="button"
            className="forward-modal-close-btn"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Prévia da mensagem */}
        <div className="forward-modal-preview">
          {isImagePreview && message.attachment_url && (
            <img
              src={message.attachment_url}
              alt=""
              className="forward-modal-preview-thumb"
            />
          )}
          <div className="forward-modal-preview-body">
            <span className="forward-modal-preview-author">
              De @{message.authorName}
            </span>
            <p className="forward-modal-preview-text">{snippet}</p>
          </div>
        </div>

        {/* Comentário opcional */}
        <div className="forward-modal-comment-wrap">
          <input
            type="text"
            className="forward-modal-comment-input"
            placeholder="Adicionar um comentário opcional..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Busca e filtros */}
        <div className="forward-modal-controls">
          <div className="forward-modal-search">
            <SearchIcon style={{ width: 14, height: 14, flexShrink: 0, opacity: 0.65 }} />
            <input
              type="text"
              placeholder="Buscar amigo, grupo ou canal..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="forward-modal-search-clear"
                onClick={() => setQuery('')}
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          <div className="forward-modal-tabs">
            <button
              type="button"
              className={`forward-modal-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Todos ({destinations.length})
            </button>
            {dmCount > 0 && (
              <button
                type="button"
                className={`forward-modal-tab ${activeFilter === 'dm' ? 'active' : ''}`}
                onClick={() => setActiveFilter('dm')}
              >
                Amigos ({dmCount})
              </button>
            )}
            {groupCount > 0 && (
              <button
                type="button"
                className={`forward-modal-tab ${activeFilter === 'group' ? 'active' : ''}`}
                onClick={() => setActiveFilter('group')}
              >
                Grupos ({groupCount})
              </button>
            )}
            {channelCount > 0 && (
              <button
                type="button"
                className={`forward-modal-tab ${activeFilter === 'channel' ? 'active' : ''}`}
                onClick={() => setActiveFilter('channel')}
              >
                Canais ({channelCount})
              </button>
            )}
          </div>
        </div>

        {/* Lista de destinos */}
        <div className="forward-modal-list">
          {filteredDestinations.length === 0 ? (
            <div className="forward-modal-empty">
              Nenhum destino encontrado para "{query}".
            </div>
          ) : (
            filteredDestinations.map((dest) => {
              const key = `${dest.kind}:${dest.id}`
              const isSent = sentIds.has(key)
              const isSending = sendingIds.has(key)
              return (
                <div key={key} className="forward-modal-item">
                  <div className="forward-modal-item-left">
                    <div className={`forward-modal-avatar kind-${dest.kind}`}>
                      {dest.avatarUrl ? (
                        <img src={dest.avatarUrl} alt={dest.name} />
                      ) : dest.kind === 'group' ? (
                        <UsersIcon style={{ width: 15, height: 15 }} />
                      ) : dest.kind === 'channel' ? (
                        <HashtagIcon style={{ width: 15, height: 15 }} />
                      ) : (
                        dest.name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="forward-modal-item-meta">
                      <span className="forward-modal-item-name">{dest.name}</span>
                      {dest.subtitle && (
                        <span className="forward-modal-item-sub">{dest.subtitle}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`forward-modal-send-btn ${isSent ? 'sent' : ''}`}
                    disabled={isSent || isSending}
                    onClick={() => {
                      void handleSend(dest)
                    }}
                  >
                    {isSent ? (
                      <span>Enviado ✓</span>
                    ) : isSending ? (
                      <span>Enviando...</span>
                    ) : (
                      <>
                        <SendIcon style={{ width: 13, height: 13 }} />
                        <span>Enviar</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
})
