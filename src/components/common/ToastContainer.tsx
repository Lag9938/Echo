import React, { useState, useRef, useEffect, memo } from 'react'
import type { Toast } from '../../types'
import {
  HashtagIcon,
  ReplyIcon,
  SendIcon,
  UserIcon,
  UsersIcon,
  HeadphonesIcon
} from '../icons'

export interface ToastContainerProps {
  toasts: Toast[]
  onRemoveToast: (id: string) => void
  onToastClick?: (toast: Toast) => void
  onQuickReply?: (toast: Toast, text: string) => Promise<boolean> | boolean | void
}

interface ToastItemProps {
  toast: Toast
  onRemove: () => void
  onClick?: () => void
  onQuickReply?: (toast: Toast, text: string) => Promise<boolean> | boolean | void
}

// Ícones SVG minimalistas dedicados para o sistema de notificações (sem emojis padrão)
function MessageChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  )
}

function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function CloseXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const ToastItem = memo(function ToastItem({ toast, onRemove, onClick, onQuickReply }: ToastItemProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyStatus, setReplyStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [avatarError, setAvatarError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const duration = toast.duration || (toast.type === 'mention' ? 6500 : 5000)
  const isClickable = Boolean(toast.onClick || onClick || toast.data)
  const canReply = Boolean(onQuickReply && (toast.data?.senderId || toast.data?.channelId || toast.data?.groupId))

  // Foco no input ao abrir a resposta rápida
  useEffect(() => {
    if (isReplying && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isReplying])

  const handleCardClick = (e: React.MouseEvent) => {
    // Não navega se o clique foi em um botão de ação ou dentro do formulário
    if ((e.target as HTMLElement).closest('button, input, form')) {
      return
    }
    if (toast.onClick) {
      toast.onClick()
    } else if (onClick) {
      onClick()
    }
    onRemove()
  }

  const handleSendQuickReply = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const trimmed = replyText.trim()
    if (!trimmed || replyStatus === 'sending' || !onQuickReply) return

    setReplyStatus('sending')
    try {
      const ok = await onQuickReply(toast, trimmed)
      if (ok !== false) {
        setReplyStatus('sent')
        setTimeout(() => {
          onRemove()
        }, 900)
      } else {
        setReplyStatus('idle')
      }
    } catch {
      setReplyStatus('idle')
    }
  }

  // Define o badge de categoria
  let badgeLabel = toast.badgeLabel
  let badgeClass = 'toast-badge-info'
  if (!badgeLabel) {
    if (toast.type === 'mention') {
      badgeLabel = 'MENÇÃO'
      badgeClass = 'toast-badge-mention'
    } else if (toast.data?.type === 'dm' || toast.type === 'message') {
      badgeLabel = toast.data?.type === 'group' ? 'GRUPO' : 'MENSAGEM PRIVADA'
      badgeClass = 'toast-badge-message'
    } else if (toast.type === 'friend') {
      badgeLabel = 'AMIZADE'
      badgeClass = 'toast-badge-friend'
    } else if (toast.type === 'voice') {
      badgeLabel = 'CHAMADA DE VOZ'
      badgeClass = 'toast-badge-voice'
    } else {
      badgeLabel = 'AVISO'
    }
  }

  // Iniciais para o fallback do avatar
  const initials = (toast.title || 'E')
    .replace(/^@/, '')
    .trim()
    .slice(0, 2)
    .toUpperCase()

  const hasAvatar = Boolean(toast.avatarUrl && !avatarError)

  return (
    <div
      className={`toast-item toast-${toast.type || 'info'} ${isClickable ? 'is-clickable' : ''}`}
      onClick={handleCardClick}
      role="alert"
      aria-live="polite"
    >
      {/* Linha superior: Categoria / Tempo / Fechar */}
      <div className="toast-header-row">
        <span className={`toast-badge ${badgeClass}`}>
          <span className="toast-badge-dot" />
          {badgeLabel}
        </span>
        <div className="toast-meta-right">
          <span className="toast-timestamp">agora</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Fechar notificação"
            aria-label="Fechar notificação"
          >
            <CloseXIcon />
          </button>
        </div>
      </div>

      {/* Linha central: Avatar ou Ícone SVG + Conteúdo */}
      <div className="toast-body-row">
        <div className="toast-avatar-slot">
          {hasAvatar ? (
            <>
              <img
                src={toast.avatarUrl}
                alt={toast.title}
                className="toast-avatar-img"
                onError={() => setAvatarError(true)}
              />
              <span className="toast-status-dot" title="Online" />
            </>
          ) : toast.avatarUrl && avatarError ? (
            <div className="toast-avatar-fallback">{initials}</div>
          ) : (
            <div className="toast-icon-badge">
              {toast.type === 'mention' ? (
                <HashtagIcon style={{ width: '18px', height: '18px' }} />
              ) : toast.data?.type === 'group' ? (
                <UsersIcon style={{ width: '18px', height: '18px' }} />
              ) : toast.type === 'friend' ? (
                <UserIcon style={{ width: '18px', height: '18px' }} />
              ) : toast.type === 'voice' ? (
                <HeadphonesIcon style={{ width: '18px', height: '18px' }} />
              ) : (
                <MessageChatIcon />
              )}
            </div>
          )}
        </div>

        <div className="toast-text-box">
          <strong className="toast-title">{toast.title}</strong>
          <span className="toast-message-text">{toast.message}</span>
        </div>
      </div>

      {/* Formulário de Resposta Rápida (Inline) */}
      {isReplying ? (
        <form className="toast-quick-reply-form" onSubmit={handleSendQuickReply}>
          {replyStatus === 'sent' ? (
            <div className="toast-quick-reply-feedback">
              <CheckmarkIcon />
              <span>Resposta enviada!</span>
            </div>
          ) : (
            <>
              <input
                ref={inputRef}
                type="text"
                className="toast-quick-reply-input"
                placeholder={`Responder para ${toast.title}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={replyStatus === 'sending'}
              />
              <button
                type="submit"
                className="toast-quick-reply-submit"
                disabled={!replyText.trim() || replyStatus === 'sending'}
                title="Enviar resposta rápida"
              >
                <SendIcon style={{ width: '13px', height: '13px' }} />
              </button>
            </>
          )}
        </form>
      ) : (
        /* Ações Rápidas em Linha */
        (canReply || isClickable) && (
          <div className="toast-actions-row">
            {canReply && (
              <button
                type="button"
                className="toast-action-btn toast-action-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsReplying(true)
                }}
              >
                <ReplyIcon style={{ width: '13px', height: '13px' }} />
                <span>Responder</span>
              </button>
            )}
            {isClickable && (
              <button
                type="button"
                className="toast-action-btn toast-action-secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  if (toast.onClick) toast.onClick()
                  else if (onClick) onClick()
                  onRemove()
                }}
              >
                <span>{toast.type === 'mention' ? 'Ir para o canal' : 'Ver conversa'}</span>
                <ArrowRightIcon />
              </button>
            )}
          </div>
        )
      )}

      {/* Barra de Progresso do Tempo Restante */}
      <div className="toast-progress-track">
        <div
          className="toast-progress-fill"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  )
})

export function ToastContainer({ toasts, onRemoveToast, onToastClick, onQuickReply }: ToastContainerProps) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="assertive" role="region" aria-label="Notificações">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => onRemoveToast(toast.id)}
          onClick={onToastClick ? () => onToastClick(toast) : undefined}
          onQuickReply={onQuickReply}
        />
      ))}
    </div>
  )
}
