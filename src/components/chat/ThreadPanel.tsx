import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Message } from '../../types'
import { MessageList, type MessageListProps } from './MessageList'
import { formatMessageText } from '../../lib/messageFormatter'
import { formatReplyCount } from '../../lib/threads'
import { CloseXIcon } from '../icons'

const MAX_REPLY_LENGTH = 4000
const noop = () => {}
const EMPTY_PINS = {}

/** O que o painel repassa para a lista de respostas (o mesmo que o chat principal usa para desenhar mensagens) */
export type ThreadListProps = Pick<MessageListProps,
  'selectedChannel' | 'currentSpace' | 'user' | 'profileDisplayName' | 'profileAvatarUrl' | 'avatarDecoration' | 'nameEffect' |
  'presenceData' | 'serverRoles' | 'memberRoleMap' | 'serverEmojis' | 'spaceMembers' | 'canUserDo' | 'getUserHighestRole' |
  'setInspectedMember' | 'toggleReaction' | 'isMessageSaved' | 'toggleSaveMessage' | 'openLightbox' | 'activePlayingVoiceNote' |
  'handleToggleVoicePlay' | 'voiceNotePlaySpeed' | 'handleChangeVoiceSpeed' | 'voiceNoteAudioRef' | 'messageReactions'>

export interface ThreadPanelProps {
  root: Message
  replies: Message[]
  isLoading: boolean
  /** Aviso de falha (carregar, enviar, excluir); '' = nada */
  notice: string
  /** false = a pessoa pode ler o tópico mas não pode escrever neste canal */
  canSend: boolean
  onClose: () => void
  onSend: (body: string) => Promise<boolean>
  onRetry: (reply: Message) => void
  onDelete: (replyId: string) => void
  listProps: ThreadListProps
}

/**
 * Painel lateral de um tópico: a mensagem que deu origem, as respostas e o campo para responder.
 * As respostas ficam só aqui; o chat principal mostra apenas "N respostas" embaixo da mensagem.
 */
export function ThreadPanel({ root, replies, isLoading, notice, canSend, onClose, onSend, onRetry, onDelete, listProps }: ThreadPanelProps) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Ao abrir, o foco vai para o campo de resposta. (Cada tópico monta um painel novo, com `key` da
  // mensagem-raiz, então o rascunho já começa vazio.)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Resposta nova (minha ou dos outros) rola a lista até o fim
  const lastReplyId = replies[replies.length - 1]?.id
  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'instant' as ScrollBehavior })
  }, [lastReplyId, isLoading])

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || sending || !canSend) return
    setSending(true)
    setDraft('')
    const ok = await onSend(text)
    setSending(false)
    // Se não foi, a resposta fica na lista como "falha ao enviar" (com o botão de tentar de novo)
    if (ok) inputRef.current?.focus()
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  const member = listProps.spaceMembers?.find((m: any) => m?.user?.id === root.author_id || m?.id === root.author_id)
  const isOwnRoot = root.author_id === listProps.user.id
  const rootAuthor = isOwnRoot
    ? (listProps.profileDisplayName || root.profile?.display_name || 'Você')
    : (member?.user?.display_name || root.profile?.display_name || 'Membro')
  const rootTime = new Date(root.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const hasImage = Boolean(root.attachment_url && root.attachment_type?.startsWith('image'))
  const sentCount = replies.filter((reply) => reply.status !== 'sending' && reply.status !== 'failed').length

  return (
    <aside className="thread-panel" role="complementary" aria-label="Tópico">
      <header className="thread-panel-header">
        <div className="thread-panel-heading">
          <strong>Tópico</strong>
          <span>#{listProps.selectedChannel.name}</span>
        </div>
        <button type="button" className="thread-panel-close" onClick={onClose} title="Fechar tópico (Esc)" aria-label="Fechar tópico">
          <CloseXIcon />
        </button>
      </header>

      <div className="thread-panel-root">
        <div className="thread-panel-root-meta">
          <strong>{rootAuthor}</strong>
          <time>{rootTime}</time>
        </div>
        {hasImage ? (
          <img
            className="thread-panel-root-image"
            src={root.attachment_url}
            alt="anexo da mensagem"
            onClick={() => listProps.openLightbox(root.attachment_url!)}
          />
        ) : root.attachment_url ? (
          <p className="thread-panel-root-body">📎 {root.body}</p>
        ) : (
          <p className="thread-panel-root-body">{formatMessageText(root.body, listProps.profileDisplayName, listProps.serverEmojis ?? [])}</p>
        )}
      </div>

      <div className="thread-panel-divider">
        <span>{isLoading ? 'Carregando respostas…' : sentCount > 0 ? formatReplyCount(sentCount) : 'Nenhuma resposta ainda'}</span>
      </div>

      {!isLoading && replies.length === 0 ? (
        <div className="thread-panel-empty">
          {canSend ? 'Responda aqui para conversar sobre esta mensagem sem encher o canal.' : 'Ninguém respondeu a esta mensagem ainda.'}
        </div>
      ) : (
        <MessageList
          {...listProps}
          variant="thread"
          messagesContainerRef={containerRef}
          messagesEndRef={endRef}
          filteredMessages={replies}
          hasMoreMessages={false}
          isLoadingMore={false}
          loadMoreMessages={noop}
          searchQuery=""
          setReplyingToMessage={noop}
          pinnedMessages={EMPTY_PINS}
          togglePinMessage={noop}
          handleDeleteMessage={onDelete}
          retrySendMessage={onRetry}
        />
      )}

      {notice && <p className="thread-panel-notice" role="alert">{notice}</p>}

      {canSend ? (
        <form className="thread-panel-composer" onSubmit={submit}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onInputKeyDown}
            maxLength={MAX_REPLY_LENGTH}
            rows={1}
            placeholder="Responder no tópico…"
            aria-label="Responder no tópico"
          />
          <button type="submit" className="thread-panel-send" disabled={sending || !draft.trim()}>
            Enviar
          </button>
        </form>
      ) : (
        <p className="thread-panel-readonly">Você não tem permissão para escrever neste canal.</p>
      )}
    </aside>
  )
}
