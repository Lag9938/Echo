import React, { memo, useMemo, useRef, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { roleInk } from '../../lib/accentContrast'
import type { User } from '@supabase/supabase-js'
import type { Space, Channel, Message, PinnedMessage, ServerEmoji, RolePermissions, ServerRole } from '../../types'
import { AvatarDecoration } from '../AvatarDecoration'
import { ModernVoiceNotePlayer } from './ModernVoiceNotePlayer'
import { ChatLinkEmbed } from './ChatLinkEmbed'
import { formatChatDateDivider, formatMessageText } from '../../lib/messageFormatter'
import { nameFontStyle, resolveNameFontId } from '../../lib/nameFonts'
import { useNameFontStore } from '../../stores/useNameFontStore'
import { CommunityBadge } from '../CommunityBadge'
import {
  CopyIcon,
  ForwardIcon,
  HashtagIcon,
  MegaphoneIcon,
  MusicIcon,
  MoreHorizontalIcon,
  PinIcon,
  ReplyIcon,
  SmileIcon,
  StarIcon,
  TrashIcon,
  VolumeIcon
} from '../icons'
import { unwrapMessageBody, type ForwardableMessage } from '../../lib/messageActions'
import { FileAttachmentCard } from './FileAttachmentCard'
import { isCaptionJustFileName, readFileInfo } from '../../lib/attachments'
import { isAutoImageCaption } from '../../lib/attachmentCaption'
import type { VoiceFeedEvent } from '../../lib/voiceActivity'
import { formatReplyCount, type ThreadSummaries } from '../../lib/threads'

const EMPTY_EVENTS: VoiceFeedEvent[] = []

/** Evento de voz no meio da conversa ("elden entrou na call", "O bot tocou …"): uma pílula discreta */
function renderVoiceEvent(event: VoiceFeedEvent) {
  const time = new Date(event.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="voice-event" key={event.id}>
      <span>
        {event.kind === 'music' ? <MusicIcon style={{ width: 13, height: 13 }} /> : <VolumeIcon style={{ width: 13, height: 13 }} />}
        {event.text}
        <time>{time}</time>
      </span>
    </div>
  )
}

function renderRichEmbed(body: string) {
  return <ChatLinkEmbed content={body} />
}

/** "@Nome: "trecho"" (como a resposta é gravada no corpo da mensagem) → nome e trecho */
export function parseReplyQuote(text: string): { author: string; snippet: string } {
  const match = text.match(/^@(.*?): "([\s\S]*)"$/)
  return match ? { author: match[1], snippet: match[2] } : { author: '', snippet: text.replace(/^@/, '') }
}

/** O que mostrar da mensagem respondida: o texto, ou um rótulo quando ela era só uma foto, figurinha ou áudio */
export function replySnippetLabel(original: Message | undefined, quoted: string): string {
  if (original) {
    if (original.attachment_type === 'audio') return '🎤 Mensagem de voz'
    if (original.attachment_type === 'sticker') return '✨ Figurinha'
    if (original.attachment_url && (original.attachment_type === 'image' || !original.attachment_type)) {
      if (isAutoImageCaption(original.body)) return '📷 Foto'
    }
    if (original.attachment_url && isAutoImageCaption(original.body)) return '📎 Anexo'
    if (original.body.trim()) return original.body.trim().replace(/\s+/g, ' ')
  }
  // Sem a original (mensagem antiga, fora do que está carregado): o trecho gravado; nome de arquivo vira "Anexo"
  if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(quoted.trim())) return '📷 Foto'
  if (/\.[a-z0-9]{2,5}$/i.test(quoted.trim()) && !/\s/.test(quoted.trim())) return '📎 Anexo'
  return quoted
}

let activeVirtualizerJump: ((messageId: string) => boolean) | null = null

/** Rola até a mensagem e a destaca por um instante (com suporte a itens fora do DOM virtualizado) */
export function jumpToMessage(messageId: string): boolean {
  const el = document.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`)
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.classList.remove('msg-jump-highlight')
    void el.offsetWidth // reinicia a animação se já estava destacada
    el.classList.add('msg-jump-highlight')
    window.setTimeout(() => el.classList.remove('msg-jump-highlight'), 1800)
    return true
  }
  if (activeVirtualizerJump) {
    return activeVirtualizerJump(messageId)
  }
  return false
}

/**
 * A "resposta a..." no alto da mensagem: avatar e nome de quem foi respondido, um trecho do que ele disse e uma
 * linha curva ligando ao avatar de quem respondeu. Clicar (ou Enter) leva até a mensagem original.
 */
function ReplyReference({ quote, original, canJump }: { quote: string; original?: Message; canJump: boolean }) {
  const parsed = parseReplyQuote(quote)
  const name = original?.profile?.display_name || parsed.author || 'Membro'
  const avatar = original?.profile?.avatar_url
  const label = replySnippetLabel(original, parsed.snippet)
  const jump = () => {
    if (original) jumpToMessage(original.id)
  }
  const interactive = canJump && !!original
  return (
    <div
      className={`reply-reference ${interactive ? 'is-interactive' : ''}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={interactive ? 'Ir para a mensagem original' : 'A mensagem original não está carregada'}
      onClick={interactive ? jump : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump() } } : undefined}
    >
      <span className="reply-reference-curve" aria-hidden="true" />
      <span className="reply-reference-avatar" aria-hidden="true">
        {avatar ? <img src={avatar} alt="" loading="lazy" decoding="async" /> : name.slice(0, 1).toUpperCase()}
      </span>
      <span className="reply-reference-name">@{name}</span>
      <span className="reply-reference-text">{label}</span>
      {interactive && <span className="reply-reference-go" aria-hidden="true">↗</span>}
    </div>
  )
}

export interface MessageFeedItem {
  type: 'message'
  key: string
  message: Message
  index: number
  msgDate: Date
  isDifferentDay: boolean
  isConsecutive: boolean
  displayedBody: string
  replyQuoteText: string | null
  isForwarded: boolean
  isMentioned: boolean
  msgRole: ServerRole | null
  isPinned: boolean
  canManagePins: boolean
  reactions: Record<string, string[]>
  authorClanTag: string | null
  authorClanTagColor: string
  isSelf: boolean
  authorBadge: string | null
  resolvedAuthorName: string
  resolvedAuthorAvatar?: string
}

interface VoiceEventFeedItem {
  type: 'voice_event'
  key: string
  event: VoiceFeedEvent
}

type FeedItem = MessageFeedItem | VoiceEventFeedItem

export interface MessageListProps {
  messagesContainerRef?: React.RefObject<HTMLDivElement | null>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  selectedChannel: Channel
  currentSpace: Space | null
  filteredMessages: Message[]
  hasMoreMessages?: boolean
  isLoadingMore?: boolean
  isLoadingMessages?: boolean
  loadMoreMessages?: (channelId: string) => Promise<void> | void
  searchQuery?: string
  user: User
  profileDisplayName: string
  profileAvatarUrl?: string
  avatarDecoration?: string | null
  nameEffect?: string | null
  presenceData: Record<string, any>
  serverRoles: ServerRole[]
  memberRoleMap: Record<string, string[]>
  serverEmojis?: ServerEmoji[]
  spaceMembers?: any[]
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  getUserHighestRole: (spaceId: string, userId: string) => ServerRole | null
  setInspectedMember: (val: any) => void
  toggleReaction?: (msgId: string, emoji: string) => void
  setReplyingToMessage?: (msg: Message | null) => void
  isMessageSaved: (msgId: string) => boolean
  toggleSaveMessage: (msg: Message, type: 'channel' | 'dm', extra?: any) => void
  pinnedMessages: Record<string, PinnedMessage[]>
  togglePinMessage: (msg: Message, spaceId: string, channelId: string) => void
  handleDeleteMessage: (msgId: string) => void
  openLightbox: (url: string) => void
  activePlayingVoiceNote: string | null
  handleToggleVoicePlay: (id: string, url: string) => void
  voiceNotePlaySpeed: number
  handleChangeVoiceSpeed: () => void
  voiceNoteAudioRef: React.RefObject<HTMLAudioElement | null>
  retrySendMessage?: (msg: any) => void
  messageReactions?: Record<string, Record<string, string[]>>
  /** Eventos da chamada (entrou, saiu, o bot tocou) para intercalar com as mensagens pelo horário */
  voiceEvents?: VoiceFeedEvent[]
  /** Resumo dos tópicos do canal, por mensagem-raiz: mostra "3 respostas" embaixo da mensagem */
  threadSummaries?: ThreadSummaries
  /** Abre o tópico de uma mensagem. Sem isso, a lista não mostra nada de tópico */
  onOpenThread?: (message: Message) => void
  /** Tópicos com resposta nova ainda não vista (mensagem-raiz → canal) */
  unreadThreadRoots?: Record<string, string>
  /** 'thread' = lista de respostas dentro do painel do tópico; 'voice' = gaveta lateral do chat da sala de voz */
  variant?: 'channel' | 'thread' | 'voice'
  /** Abre o modal para encaminhar a mensagem para outro canal, amigo ou grupo */
  onForwardMessage?: (msg: ForwardableMessage) => void
  showToast?: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
}


export interface MessageRowProps {
  item: MessageFeedItem
  user: User
  avatarDecoration?: string | null
  nameEffect?: string | null
  presenceData: Record<string, any>
  serverRoles: ServerRole[]
  memberRoleMap: Record<string, string[]>
  currentSpace: Space | null
  selectedChannel: Channel
  isThreadList: boolean
  setReplyingToMessage: (msg: Message) => void
  toggleReaction: (msgId: string, emoji: string) => void
  onOpenThread?: (msg: Message) => void
  onForwardMessage?: (msg: ForwardableMessage) => void
  showToast?: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  isMessageSaved: (msgId: string) => boolean
  toggleSaveMessage: (msg: Message, type: 'channel' | 'dm', extra?: any) => void
  togglePinMessage: (msg: Message, spaceId: string, channelId: string) => void
  handleDeleteMessage: (msgId: string) => void
  filteredMessages: Message[]
  myNameFont: string
  setInspectedMember: (val: any) => void
  openLightbox: (url: string) => void
  profileDisplayName: string
  serverEmojis?: ServerEmoji[]
  activePlayingVoiceNote: string | null
  handleToggleVoicePlay: (id: string, url: string) => void
  voiceNotePlaySpeed: number
  handleChangeVoiceSpeed: () => void
  voiceNoteAudioRef: React.RefObject<HTMLAudioElement | null>
  retrySendMessage: (msg: any) => void
  threadSummaries?: ThreadSummaries
  unreadThreadRoots?: Record<string, string>
}

export function areMessageRowPropsEqual(prev: MessageRowProps, next: MessageRowProps): boolean {
  if (prev.item.key !== next.item.key) return false

  const prevMsg = prev.item.message
  const nextMsg = next.item.message
  if (prevMsg !== nextMsg) {
    if (prevMsg.id !== nextMsg.id) return false
    if (prevMsg.body !== nextMsg.body) return false
    if (prevMsg.updated_at !== nextMsg.updated_at) return false
    if (prevMsg.status !== nextMsg.status) return false
    if (prevMsg.attachment_url !== nextMsg.attachment_url) return false
    if (prevMsg.attachment_type !== nextMsg.attachment_type) return false
    if (prevMsg.reply_to_message_id !== nextMsg.reply_to_message_id) return false
  }

  if (prev.item.isConsecutive !== next.item.isConsecutive) return false
  if (prev.item.isDifferentDay !== next.item.isDifferentDay) return false
  if (prev.item.isMentioned !== next.item.isMentioned) return false
  if (prev.item.isPinned !== next.item.isPinned) return false
  if (prev.item.canManagePins !== next.item.canManagePins) return false
  if (prev.item.authorClanTag !== next.item.authorClanTag) return false
  if (prev.item.authorClanTagColor !== next.item.authorClanTagColor) return false
  if (prev.item.authorBadge !== next.item.authorBadge) return false
  if (prev.item.resolvedAuthorName !== next.item.resolvedAuthorName) return false
  if (prev.item.resolvedAuthorAvatar !== next.item.resolvedAuthorAvatar) return false
  if (prev.item.msgRole?.id !== next.item.msgRole?.id || prev.item.msgRole?.color !== next.item.msgRole?.color) return false

  // Reactions comparison
  const prevReactions = prev.item.reactions
  const nextReactions = next.item.reactions
  if (prevReactions !== nextReactions) {
    const prevKeys = Object.keys(prevReactions || {})
    const nextKeys = Object.keys(nextReactions || {})
    if (prevKeys.length !== nextKeys.length) return false
    for (const k of prevKeys) {
      const pUsers = prevReactions[k] || []
      const nUsers = nextReactions[k] || []
      if (pUsers.length !== nUsers.length) return false
      if (pUsers.includes(prev.user.id) !== nUsers.includes(next.user.id)) return false
    }
  }

  // Voice note playing state
  const msgId = prevMsg.id
  const prevIsPlaying = prev.activePlayingVoiceNote === msgId
  const nextIsPlaying = next.activePlayingVoiceNote === msgId
  if (prevIsPlaying !== nextIsPlaying) return false
  if (nextIsPlaying && prev.voiceNotePlaySpeed !== next.voiceNotePlaySpeed) return false

  // Saved bookmark status
  if (prev.isMessageSaved(msgId) !== next.isMessageSaved(msgId)) return false

  // Threads
  if (prev.threadSummaries?.[msgId] !== next.threadSummaries?.[msgId]) return false
  if (prev.unreadThreadRoots?.[msgId] !== next.unreadThreadRoots?.[msgId]) return false

  // Personalization & author metadata
  if (prev.myNameFont !== next.myNameFont) return false
  if (prev.profileDisplayName !== next.profileDisplayName) return false
  if (prev.nameEffect !== next.nameEffect) return false
  if (prev.avatarDecoration !== next.avatarDecoration) return false

  const authorId = prevMsg.author_id
  if (prev.presenceData[authorId] !== next.presenceData[authorId]) {
    const pPrev = prev.presenceData[authorId]
    const pNext = next.presenceData[authorId]
    if (pPrev?.avatar_decoration !== pNext?.avatar_decoration) return false
    if (pPrev?.name_effect !== pNext?.name_effect) return false
  }

  return true
}


export const MessageRow = memo(function MessageRow(props: MessageRowProps) {
  const {
    item,
    user,
    avatarDecoration,
    nameEffect,
    presenceData,
    serverRoles,
    memberRoleMap,
    currentSpace,
    selectedChannel,
    isThreadList,
    setReplyingToMessage,
    toggleReaction,
    onOpenThread,
    onForwardMessage,
    showToast,
    isMessageSaved,
    toggleSaveMessage,
    togglePinMessage,
    handleDeleteMessage,
    filteredMessages,
    myNameFont,
    setInspectedMember,
    openLightbox,
    profileDisplayName,
    serverEmojis = [],
    activePlayingVoiceNote,
    handleToggleVoicePlay,
    voiceNotePlaySpeed,
    handleChangeVoiceSpeed,
    voiceNoteAudioRef,
    retrySendMessage,
    threadSummaries,
    unreadThreadRoots
  } = props


    const {
      message,
      index,
      msgDate,
      isDifferentDay,
      isConsecutive,
      displayedBody,
      replyQuoteText,
      isForwarded,
      isMentioned,
      msgRole,
      isPinned,
      canManagePins,
      reactions,
      authorClanTag,
      authorClanTagColor,
      isSelf,
      authorBadge,
      resolvedAuthorName,
      resolvedAuthorAvatar
    } = item

    return (
      <div
        data-index={index}
        className="msg-row"
      >
        {isDifferentDay && (
          <div className="chat-date-divider">
            <div className="chat-date-line" />
            <span className="chat-date-pill">
              {formatChatDateDivider(msgDate)}
            </span>
            <div className="chat-date-line" />
          </div>
        )}

        <article
          data-message-id={message.id}
          className={`msg-card ${isConsecutive ? 'msg-consecutive' : ''} ${message.attachment_type === 'audio' ? 'has-voice-note' : ''} ${message.author_id === user.id ? 'msg-own' : ''} ${isMentioned ? 'mention-highlight' : ''} ${message.status === 'sending' ? 'msg-sending' : ''} ${message.status === 'failed' ? 'msg-failed' : ''}`}
          style={{ position: 'relative' }}
        >
          {isConsecutive ? (
            <div className="msg-consecutive-gutter">
              <time className="consecutive-time" title={msgDate.toLocaleTimeString('pt-BR')}>
                {msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
          ) : (
            <div 
              className={`msg-avatar ${message.author_id === user.id ? 'avatar-self' : 'avatar-other'}`} 
              style={{ position: 'relative', overflow: 'visible', cursor: 'pointer' }}
              onClick={() => {
                if (currentSpace) {
                  const memRoles = memberRoleMap[message.author_id] || []
                  const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                  setInspectedMember({
                    user: {
                      id: message.author_id,
                      display_name: resolvedAuthorName,
                      avatar_url: resolvedAuthorAvatar
                    },
                    roleName: msgRole?.name,
                    roleColor: msgRole?.color,
                    roles: matchingRoles
                  })
                }
              }}
              title="Ver perfil do membro"
            >
              <div style={{ width: '100%', height: '100%', borderRadius: 'inherit', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {resolvedAuthorAvatar ? (
                  <img src={resolvedAuthorAvatar} alt={resolvedAuthorName} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (resolvedAuthorName ?? 'E').slice(0, 1).toUpperCase()
                )}
              </div>
              {(() => {
                const deco = message.author_id === user.id ? (avatarDecoration || null) : (presenceData[message.author_id]?.avatar_decoration || (message.profile as any)?.avatar_decoration || null)
                return deco && deco !== 'none' ? <AvatarDecoration decorationId={deco} /> : null
              })()}
            </div>
          )}

          <div className="msg-body">
            {/* Barra de ações ao passar o mouse */}
            <div className="message-hover-actions">
              {!isThreadList && (
                <button
                  type="button"
                  className="hover-action-btn reply-btn"
                  onClick={() => setReplyingToMessage(message)}
                  title="Responder a esta mensagem"
                >
                  <ReplyIcon style={{ width: '14px', height: '14px' }} />
                  <span>Responder</span>
                </button>
              )}

              <div className="msg-react-wrap">
                <button type="button" className="hover-action-btn react-trigger" title="Reagir" aria-haspopup="true">
                  <SmileIcon style={{ width: '16px', height: '16px' }} />
                </button>
                <div className="msg-react-pop">
                  {['👍', '❤️', '😂', '🔥', '🎮', '💀'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className="hover-action-btn"
                      onClick={() => toggleReaction(message.id, emoji)}
                      title={`Reagir com ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {(!isThreadList || isSelf || canManagePins) && (
                <div className="msg-more-wrap">
                  <button type="button" className="hover-action-btn more-trigger" title="Mais opções" aria-haspopup="menu">
                    <MoreHorizontalIcon style={{ width: '16px', height: '16px' }} />
                  </button>
                  <div className="msg-more-pop" role="menu">
                    {!isThreadList && onOpenThread && message.status !== 'sending' && message.status !== 'failed' && (
                      <button
                        type="button"
                        className="hover-action-btn thread-btn"
                        onClick={() => onOpenThread(message)}
                        title="Responder em tópico"
                      >
                        <span className="msg-more-icon">🧵</span>
                        <span>Responder em tópico</span>
                      </button>
                    )}
                    {onForwardMessage && message.status !== 'sending' && message.status !== 'failed' && (
                      <button
                        type="button"
                        className="hover-action-btn"
                        onClick={() => onForwardMessage({
                          id: message.id,
                          body: message.body,
                          authorName: resolvedAuthorName,
                          attachment_url: message.attachment_url,
                          attachment_type: message.attachment_type,
                          sourceLabel: `#${selectedChannel.name} • ${currentSpace?.name || 'Servidor'}`
                        })}
                        title="Encaminhar mensagem"
                      >
                        <ForwardIcon style={{ width: '14px', height: '14px' }} />
                        <span>Encaminhar</span>
                      </button>
                    )}
                    {displayedBody.trim() && (
                      <button
                        type="button"
                        className="hover-action-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(displayedBody)
                          showToast?.('Texto copiado', 'Mensagem copiada para a área de transferência.', 'info')
                        }}
                        title="Copiar texto da mensagem"
                      >
                        <CopyIcon style={{ width: '14px', height: '14px' }} />
                        <span>Copiar texto</span>
                      </button>
                    )}
                    {!isThreadList && (
                      <button
                        type="button"
                        className={`hover-action-btn star-btn ${isMessageSaved(message.id) ? 'active' : ''}`}
                        onClick={() => toggleSaveMessage(message, 'channel', {
                          sourceName: `#${selectedChannel.name} • ${currentSpace?.name || 'Servidor'}`,
                          spaceId: currentSpace?.id,
                          channelId: selectedChannel.id
                        })}
                        title={isMessageSaved(message.id) ? "Remover dos favoritos" : "Salvar mensagem com estrela (⭐)"}
                      >
                        <StarIcon style={{ width: '14px', height: '14px', color: isMessageSaved(message.id) ? '#ffc107' : 'inherit', fill: isMessageSaved(message.id) ? '#ffc107' : 'none' }} />
                        <span>{isMessageSaved(message.id) ? 'Remover dos salvos' : 'Salvar'}</span>
                      </button>
                    )}
                    {!isThreadList && canManagePins && (
                      <button
                        type="button"
                        className="hover-action-btn"
                        onClick={() => currentSpace && togglePinMessage(message, currentSpace.id, selectedChannel.id)}
                        title={isPinned ? "Desafixar Mensagem" : "Fixar Mensagem no Canal"}
                      >
                        <PinIcon style={{ width: '14px', height: '14px', color: isPinned ? 'var(--accent-color)' : 'inherit' }} />
                        <span>{isPinned ? 'Desafixar' : 'Fixar'}</span>
                      </button>
                    )}
                    {(message.author_id === user.id || canManagePins) && (
                      <button
                        type="button"
                        className="hover-action-btn delete-btn"
                        onClick={() => handleDeleteMessage(message.id)}
                        title="Excluir mensagem"
                      >
                        <TrashIcon style={{ width: '14px', height: '14px' }} />
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            {!isConsecutive && (
              <>
                {replyQuoteText && (
                  <ReplyReference
                    quote={replyQuoteText}
                    original={message.reply_to_message_id ? filteredMessages.find((m) => m.id === message.reply_to_message_id) : undefined}
                    canJump
                  />
                )}
                {isForwarded && (
                  <div className="dm-forwarded-badge">
                    <ForwardIcon style={{ width: '12px', height: '12px' }} />
                    <span>Mensagem encaminhada</span>
                  </div>
                )}

                <div className="msg-meta">
                  {(() => {
                    const authorNameEffect = message.author_id === user.id ? (nameEffect || 'resonance_cyan') : (presenceData[message.author_id]?.name_effect || localStorage.getItem(`echo-name-effect-${message.author_id}`) || 'none')
                    const authorFont = nameFontStyle(resolveNameFontId(message.author_id, user.id, myNameFont, presenceData))
                    return (
                      <>
                        <strong 
                          className={authorNameEffect && authorNameEffect !== 'none' ? `name-effect-${authorNameEffect}` : ''}
                          style={{ color: (authorNameEffect && authorNameEffect !== 'none') ? undefined : roleInk(msgRole?.color), cursor: 'pointer', ...authorFont }}
                          onClick={() => {
                            if (currentSpace) {
                              const memRoles = memberRoleMap[message.author_id] || []
                              const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                              setInspectedMember({
                                user: {
                                  id: message.author_id,
                                  display_name: resolvedAuthorName,
                                  avatar_url: resolvedAuthorAvatar
                                },
                                roleName: msgRole?.name,
                                roleColor: msgRole?.color,
                                roles: matchingRoles
                              })
                            }
                          }}
                        >
                          {resolvedAuthorName}
                        </strong>
                      </>
                    )
                  })()}

                  {authorClanTag && (
                    <span 
                      className="echo-clan-tag" 
                      style={{ 
                        color: authorClanTagColor, 
                        borderColor: `${authorClanTagColor}66`, 
                        background: `${authorClanTagColor}15`, 
                        fontSize: '9.5px', 
                        padding: '1px 5px', 
                        borderRadius: '4px' 
                      }}
                    >
                      [{authorClanTag}]
                    </span>
                  )}

                  {authorBadge && authorBadge !== 'none' && (
                    <CommunityBadge badgeId={authorBadge} size={13} />
                  )}

                  {/* Nas suas próprias mensagens o cargo e o você não aparecem */}
                  {msgRole && !isSelf && (
                    <span
                      style={{ 
                        fontSize: '10px', 
                        fontWeight: 700, 
                        padding: '1px 6px', 
                        borderRadius: '4px', 
                        color: roleInk(msgRole.color),
                        background: `${msgRole.color}18`, 
                        border: `1px solid ${msgRole.color}44` 
                      }}
                    >
                      {msgRole.name}
                    </span>
                  )}

                  <time className="msg-time" title={msgDate.toLocaleString('pt-BR')}>
                    {msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                  
                  {isPinned && (
                    <span title="Mensagem Fixada" style={{ fontSize: '11px', color: 'var(--accent-color)', marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      📌 <span style={{ fontSize: '10px', fontWeight: 700 }}>Fixada</span>
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Message content */}
            {message.attachment_url && (message.attachment_type === 'image' || message.attachment_type?.startsWith('image')) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="msg-attachment-wrap">
                  <img
                    src={message.attachment_url}
                    alt="anexo"
                    className="msg-attachment-img"
                    loading="lazy"
                    decoding="async"
                    style={{
                      maxWidth: message.attachment_type === 'image:small' ? '240px' :
                                message.attachment_type === 'image:large' ? '680px' :
                                message.attachment_type === 'image:original' ? 'min(100%, 880px)' :
                                'min(100%, 460px)',
                      maxHeight: message.attachment_type === 'image:small' ? '240px' :
                                 message.attachment_type === 'image:large' ? '540px' :
                                 message.attachment_type === 'image:original' ? '700px' :
                                 '400px'
                    }}
                    onLoad={(e) => e.currentTarget.parentElement?.classList.add('loaded')}
                    onClick={() => openLightbox(message.attachment_url!)}
                  />
                </div>
                {!isAutoImageCaption(displayedBody) && (
                  <p>{formatMessageText(displayedBody, profileDisplayName, serverEmojis)}</p>
                )}
              </div>
            ) : message.attachment_url && message.attachment_type === 'sticker' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <img
                  src={message.attachment_url}
                  alt="sticker"
                  style={{
                    width: '128px',
                    height: '128px',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: '8px'
                  }}
                  loading="lazy"
                />
                {displayedBody && displayedBody !== 'Sticker' && !displayedBody.startsWith('[Sticker') && !displayedBody.startsWith('http') && (
                  <p>{formatMessageText(displayedBody, profileDisplayName, serverEmojis)}</p>
                )}
              </div>
            ) : message.attachment_url && message.attachment_type === 'audio' ? (
              <ModernVoiceNotePlayer
                audioUrl={message.attachment_url}
                messageId={message.id}
                activePlayingId={activePlayingVoiceNote}
                onTogglePlay={() => handleToggleVoicePlay(message.id, message.attachment_url!)}
                speed={voiceNotePlaySpeed}
                onChangeSpeed={handleChangeVoiceSpeed}
                activeAudioRef={voiceNoteAudioRef}
              />
            ) : message.attachment_url && !message.attachment_type?.startsWith('image') && message.attachment_type !== 'audio' && message.attachment_type !== 'sticker' ? (
              <>
                {!isCaptionJustFileName(displayedBody, readFileInfo(message.attachment_url, displayedBody)) && (
                  <p className="file-card-caption">{formatMessageText(displayedBody, profileDisplayName, serverEmojis)}</p>
                )}
                <FileAttachmentCard url={message.attachment_url} fallbackName={displayedBody} />
              </>
            ) : (
              <>
                <p>{formatMessageText(displayedBody, profileDisplayName, serverEmojis)}</p>
                {renderRichEmbed(displayedBody)}
              </>
            )}

            {/* Emoji Reactions Pills */}
            {Object.keys(reactions).length > 0 && (
              <div className="message-reactions-row">
                {Object.entries(reactions).map(([em, userIds]) => {
                  const hasReacted = userIds.includes(user.id)
                  return (
                    <button
                      key={em}
                      type="button"
                      className={`reaction-pill ${hasReacted ? 'reacted' : ''}`}
                      onClick={() => toggleReaction(message.id, em)}
                      title={hasReacted ? "Remover sua reação" : "Adicionar reação"}
                    >
                      <span>{em}</span>
                      <span>{userIds.length}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Tópico desta mensagem: quantas respostas e quando foi a última */}
            {!isThreadList && onOpenThread && threadSummaries?.[message.id] && (
              <button
                type="button"
                className={`thread-chip ${unreadThreadRoots?.[message.id] ? 'has-unread' : ''}`}
                onClick={() => onOpenThread(message)}
                title="Abrir o tópico"
              >
                <span className="thread-chip-icon" aria-hidden="true">🧵</span>
                <strong>{formatReplyCount(threadSummaries[message.id].replyCount)}</strong>
                {threadSummaries[message.id].lastReplyAt && (
                  <span className="thread-chip-time">
                    última às {new Date(threadSummaries[message.id].lastReplyAt as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {unreadThreadRoots?.[message.id] && <span className="thread-chip-unread">nova resposta</span>}
              </button>
            )}

            {/* Status do envio em tempo real */}
            {message.status === 'sending' && (
              <div className="msg-status-indicator sending">
                <span className="msg-sending-dot" />
                <span>Enviando...</span>
              </div>
            )}
            {message.status === 'failed' && (
              <div className="msg-status-indicator failed">
                <span className="msg-failed-badge">⚠️ Falha ao enviar</span>
                <button 
                  type="button" 
                  className="msg-retry-btn" 
                  onClick={() => retrySendMessage(message)}
                  title="Tentar enviar esta mensagem novamente"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        </article>
      </div>
    )
}, areMessageRowPropsEqual)

export const MessageList = memo(function MessageList({
  messagesContainerRef,
  messagesEndRef,
  selectedChannel,
  currentSpace,
  filteredMessages,
  hasMoreMessages = false,
  isLoadingMore = false,
  isLoadingMessages = false,
  loadMoreMessages = () => {},
  searchQuery = '',
  user,
  profileDisplayName,
  profileAvatarUrl = '',
  avatarDecoration,
  nameEffect,
  presenceData,
  serverRoles,
  memberRoleMap,
  serverEmojis = [],
  spaceMembers = [],
  canUserDo,
  getUserHighestRole,
  setInspectedMember,
  toggleReaction = () => {},
  setReplyingToMessage = () => {},
  isMessageSaved,
  toggleSaveMessage,
  pinnedMessages,
  togglePinMessage,
  handleDeleteMessage,
  openLightbox = () => {},
  activePlayingVoiceNote,
  handleToggleVoicePlay,
  voiceNotePlaySpeed,
  handleChangeVoiceSpeed,
  voiceNoteAudioRef,
  retrySendMessage = () => {},
  messageReactions = {},
  voiceEvents = EMPTY_EVENTS,
  threadSummaries,
  onOpenThread,
  unreadThreadRoots,
  variant = 'channel',
  onForwardMessage,
  showToast
}: MessageListProps) {
  const isThreadList = variant === 'thread'
  const isVoiceChat = variant === 'voice'
  const myNameFont = useNameFontStore((s) => s.fontId)
  // Cada evento entra antes da primeira mensagem mais nova que ele; os mais recentes que tudo vão no fim.
  // Durante uma busca, ficam de fora (só resultados).
  const { eventsBefore, trailingEvents } = useMemo(() => {
    const before = new Map<number, VoiceFeedEvent[]>()
    const trailing: VoiceFeedEvent[] = []
    if (voiceEvents.length === 0 || searchQuery.trim()) return { eventsBefore: before, trailingEvents: trailing }
    const times = filteredMessages.map((m) => new Date(m.created_at).getTime())
    voiceEvents.forEach((event) => {
      const index = times.findIndex((t) => t > event.at)
      if (index === -1) trailing.push(event)
      else before.set(index, [...(before.get(index) || []), event])
    })
    return { eventsBefore: before, trailingEvents: trailing }
  }, [voiceEvents, filteredMessages, searchQuery])

  // Lista unificada e plana para a virtualização dinâmica
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = []
    filteredMessages.forEach((message, index) => {
      const beforeList = eventsBefore.get(index)
      if (beforeList && beforeList.length > 0) {
        for (const ev of beforeList) {
          items.push({
            type: 'voice_event',
            key: `ve-${ev.id}`,
            event: ev
          })
        }
      }

      const prevMessage = index > 0 ? filteredMessages[index - 1] : null
      const msgDate = new Date(message.created_at)
      const prevDate = prevMessage ? new Date(prevMessage.created_at) : null
      const isDifferentDay = !prevDate || msgDate.toDateString() !== prevDate.toDateString()

      const unwrapped = unwrapMessageBody(message.body)
      const displayedBody = unwrapped.cleanBody
      const replyQuoteText = unwrapped.replyQuoteText
      const isForwarded = unwrapped.isForwarded

      const isSameAuthor = prevMessage && prevMessage.author_id === message.author_id
      const isWithinWindow = prevMessage && (msgDate.getTime() - prevDate!.getTime() < 5 * 60 * 1000)
      const isAudioNote = message.attachment_type === 'audio' || prevMessage?.attachment_type === 'audio'
      const isConsecutive = Boolean(!isDifferentDay && isSameAuthor && isWithinWindow && !replyQuoteText && !isForwarded && !isAudioNote)

      const isMentioned = message.author_id !== user.id && message.body.toLowerCase().includes(`@${profileDisplayName.toLowerCase()}`)
      const msgRole = currentSpace ? getUserHighestRole(currentSpace.id, message.author_id) : null
      const isPinned = (pinnedMessages[selectedChannel.id] || []).some(p => p.message_id === message.id)
      const canManagePins = Boolean(currentSpace && (canUserDo(currentSpace.id, user.id, 'manageMessages') || currentSpace.creator_id === user.id))
      const reactions = messageReactions[message.id] || {}

      const authorClanTag = localStorage.getItem(`echo-clan-tag-${message.author_id}`) || (message.author_id === user.id ? localStorage.getItem(`echo-clan-tag-${user.id}`) : null)
      const authorClanTagColor = localStorage.getItem(`echo-clan-tag-color-${message.author_id}`) || (message.author_id === user.id ? localStorage.getItem(`echo-clan-tag-color-${user.id}`) : '#00f2fe') || '#00f2fe'
      const isSelf = message.author_id === user.id
      const authorBadge = isSelf
        ? (localStorage.getItem(`echo-show-badge-${user.id}`) !== 'false' ? (localStorage.getItem(`echo-badge-${user.id}`) || 'owner') : 'none')
        : (presenceData[message.author_id]?.badge || localStorage.getItem(`echo-badge-${message.author_id}`) || null)

      const authorMember = isSelf ? undefined : spaceMembers.find(m => (m?.user?.id === message.author_id || m?.id === message.author_id))
      const resolvedAuthorName = isSelf
        ? (profileDisplayName || (user.user_metadata as any)?.display_name || message.profile?.display_name || 'Você')
        : (authorMember?.user?.display_name || message.profile?.display_name || presenceData[message.author_id]?.display_name || 'Membro')

      const resolvedAuthorAvatar = isSelf
        ? (profileAvatarUrl || message.profile?.avatar_url)
        : (authorMember?.user?.avatar_url || message.profile?.avatar_url || presenceData[message.author_id]?.avatar_url)

      items.push({
        type: 'message',
        key: message.id || `msg-${message.created_at}-${index}`,
        message,
        index,
        msgDate,
        isDifferentDay,
        isConsecutive,
        displayedBody,
        replyQuoteText,
        isForwarded,
        isMentioned,
        msgRole,
        isPinned,
        canManagePins,
        reactions,
        authorClanTag,
        authorClanTagColor,
        isSelf,
        authorBadge,
        resolvedAuthorName,
        resolvedAuthorAvatar
      })
    })

    for (const ev of trailingEvents) {
      items.push({
        type: 'voice_event',
        key: `ve-trailing-${ev.id}`,
        event: ev
      })
    }

    return items
  }, [
    filteredMessages,
    eventsBefore,
    trailingEvents,
    user.id,
    user.user_metadata,
    profileDisplayName,
    profileAvatarUrl,
    currentSpace,
    getUserHighestRole,
    pinnedMessages,
    selectedChannel.id,
    canUserDo,
    messageReactions,
    presenceData,
    spaceMembers
  ])

  const localContainerRef = useRef<HTMLDivElement | null>(null)
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    localContainerRef.current = el
    if (messagesContainerRef) {
      (messagesContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    }
  }, [messagesContainerRef])

  const virtualizer = useVirtualizer({
    count: feedItems.length,
    getScrollElement: () => localContainerRef.current,
    estimateSize: useCallback((index: number) => {
      const item = feedItems[index]
      if (!item) return 56
      if (item.type === 'voice_event') return 34
      if (item.isDifferentDay) return 96
      if (item.message.attachment_url) return 240
      if (item.isConsecutive) return 36
      return 64
    }, [feedItems]),
    overscan: 10,
    initialRect: { width: 800, height: 1200 },
    getItemKey: useCallback((index: number) => feedItems[index]?.key || index, [feedItems])
  })

  useEffect(() => {
    activeVirtualizerJump = (messageId: string) => {
      const targetIndex = feedItems.findIndex(
        (it) => it.type === 'message' && it.message.id === messageId
      )
      if (targetIndex === -1) return false
      virtualizer.scrollToIndex(targetIndex, { align: 'center', behavior: 'smooth' })
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`)
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          el.classList.remove('msg-jump-highlight')
          void el.offsetWidth
          el.classList.add('msg-jump-highlight')
          setTimeout(() => el.classList.remove('msg-jump-highlight'), 1800)
        }
      }, 100)
      return true
    }
    return () => {
      activeVirtualizerJump = null
    }
  }, [feedItems, virtualizer])

  const renderMessageRow = (item: MessageFeedItem) => {
    return (
      <MessageRow
        item={item}
        user={user}
        avatarDecoration={avatarDecoration}
        nameEffect={nameEffect}
        presenceData={presenceData}
        serverRoles={serverRoles}
        memberRoleMap={memberRoleMap}
        currentSpace={currentSpace}
        selectedChannel={selectedChannel}
        isThreadList={isThreadList}
        setReplyingToMessage={setReplyingToMessage}
        toggleReaction={toggleReaction}
        onOpenThread={onOpenThread}
        onForwardMessage={onForwardMessage}
        showToast={showToast}
        isMessageSaved={isMessageSaved}
        toggleSaveMessage={toggleSaveMessage}
        togglePinMessage={togglePinMessage}
        handleDeleteMessage={handleDeleteMessage}
        filteredMessages={filteredMessages}
        myNameFont={myNameFont}
        setInspectedMember={setInspectedMember}
        openLightbox={openLightbox}
        profileDisplayName={profileDisplayName}
        serverEmojis={serverEmojis}
        activePlayingVoiceNote={activePlayingVoiceNote}
        handleToggleVoicePlay={handleToggleVoicePlay}
        voiceNotePlaySpeed={voiceNotePlaySpeed}
        handleChangeVoiceSpeed={handleChangeVoiceSpeed}
        voiceNoteAudioRef={voiceNoteAudioRef}
        retrySendMessage={retrySendMessage}
        threadSummaries={threadSummaries}
        unreadThreadRoots={unreadThreadRoots}
      />
    )
  }

  return (
    <div
      className={`messages-area${isVoiceChat ? ' voice-chat-messages' : ''}`}
      ref={setContainerRef}
      onScroll={(e) => {
        const target = e.currentTarget
        if (target.scrollTop <= 40 && hasMoreMessages && !isLoadingMore && selectedChannel) {
          loadMoreMessages(selectedChannel.id)
        }
      }}
    >
      {/* Indicador de carregamento de mensagens anteriores */}
      {isLoadingMore && (
        <div className="loading-more-messages">
          <span className="loading-spinner-circle" />
          <span>Carregando mensagens anteriores...</span>
        </div>
      )}

      {/* Estado inicial na gaveta da chamada de voz */}
      {isVoiceChat && filteredMessages.length === 0 && !searchQuery.trim() && (
        <div className="no-messages">
          <div style={{ opacity: 0.6, marginBottom: '6px' }}><VolumeIcon style={{ width: '28px', height: '28px' }} /></div>
          <p>Início do chat por texto da chamada.</p>
        </div>
      )}

      {/* Channel Welcome Hero (visível apenas ao alcançar o início histórico do canal) */}
      {!isThreadList && !isVoiceChat && !searchQuery.trim() && !hasMoreMessages && (
        <div className="channel-welcome-hero">
          <div className="channel-welcome-icon-box">
            {selectedChannel.is_announcement ? <MegaphoneIcon /> : <HashtagIcon />}
          </div>
          <h2 className="channel-welcome-title">Bem-vindo ao canal #{selectedChannel.name}!</h2>
          <p className="channel-welcome-desc">
            {selectedChannel.topic || `Este é o início do canal #${selectedChannel.name} da comunidade ${currentSpace?.name || 'Echo'}. Envie uma mensagem para iniciar o papo!`}
          </p>
          <div className="channel-welcome-meta">
            <span>🔒 Canal seguro</span>
            <span>•</span>
            <span>💬 Início do canal</span>
          </div>
        </div>
      )}

      {/* Esqueleto enquanto o canal ainda não tem nada para mostrar: evita a tela vazia parecida com "canal sem mensagens" */}
      {isLoadingMessages && filteredMessages.length === 0 && !searchQuery.trim() && (
        <div className="messages-skeleton" aria-busy="true" aria-label="Carregando mensagens">
          {[62, 38, 74, 50, 30].map((width, i) => (
            <div className="messages-skeleton-row" key={i}>
              <span className="messages-skeleton-avatar" />
              <span className="messages-skeleton-lines">
                <span className="messages-skeleton-line short" />
                <span className="messages-skeleton-line" style={{ width: `${width}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}

      {filteredMessages.length === 0 && searchQuery && (
        <div className="no-messages">
          <span className="no-msg-icon">🔍</span>
          <p>{`Nenhuma mensagem encontrada para "${searchQuery}"`}</p>
        </div>
      )}

      {/* Feed virtualizado com medição dinâmica de altura e descarte de nós fora do viewport */}
      {virtualizer.getVirtualItems().length > 0 ? (
        <div
          className="messages-flow messages-virtual-flow"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = feedItems[virtualRow.index]
            if (!item) return null

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                {item.type === 'voice_event' ? renderVoiceEvent(item.event) : renderMessageRow(item)}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="messages-flow">
          {feedItems.map((item) => (
            <React.Fragment key={item.key}>
              {item.type === 'voice_event' ? renderVoiceEvent(item.event) : renderMessageRow(item)}
            </React.Fragment>
          ))}
        </div>
      )}
      <div style={{ height: '24px', flexShrink: 0 }} />
      <div ref={messagesEndRef} />
    </div>
  )
})
