import React, { memo } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Space, Channel, Message, PinnedMessage, ServerEmoji, RolePermissions, ServerRole } from '../../types'
import { AvatarDecoration } from '../AvatarDecoration'
import { ModernVoiceNotePlayer } from './ModernVoiceNotePlayer'
import { ChatLinkEmbed } from './ChatLinkEmbed'
import { formatChatDateDivider, formatMessageText } from '../../lib/messageFormatter'
import { NAME_EFFECTS } from '../../lib/cosmeticsData'
import { CommunityBadge } from '../CommunityBadge'
import {
  HashtagIcon,
  MegaphoneIcon,
  PaperclipIcon,
  PinIcon,
  StarIcon,
  TrashIcon
} from '../icons'
import { openExternalUrl } from '../../lib/openExternal'

function renderRichEmbed(body: string) {
  return <ChatLinkEmbed content={body} />
}

export interface MessageListProps {
  messagesContainerRef: React.RefObject<HTMLDivElement | null>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  selectedChannel: Channel
  currentSpace: Space | null
  filteredMessages: Message[]
  hasMoreMessages: boolean
  isLoadingMore: boolean
  loadMoreMessages: (channelId: string) => Promise<void> | void
  searchQuery: string
  channelVirtualizer: any
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
  toggleReaction: (msgId: string, emoji: string) => void
  setReplyingToMessage: (msg: Message | null) => void
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
  retrySendMessage: (msg: any) => void
  messageReactions: Record<string, Record<string, string[]>>
}

export const MessageList = memo(function MessageList({
  messagesContainerRef,
  messagesEndRef,
  selectedChannel,
  currentSpace,
  filteredMessages,
  hasMoreMessages,
  isLoadingMore,
  loadMoreMessages,
  searchQuery,
  channelVirtualizer,
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
  toggleReaction,
  setReplyingToMessage,
  isMessageSaved,
  toggleSaveMessage,
  pinnedMessages,
  togglePinMessage,
  handleDeleteMessage,
  openLightbox,
  activePlayingVoiceNote,
  handleToggleVoicePlay,
  voiceNotePlaySpeed,
  handleChangeVoiceSpeed,
  voiceNoteAudioRef,
  retrySendMessage,
  messageReactions
}: MessageListProps) {
  return (
    <div 
      className="messages-area"
      ref={messagesContainerRef}
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

      {/* Channel Welcome Hero (visível apenas ao alcançar o início histórico do canal) */}
      {!searchQuery.trim() && !hasMoreMessages && (
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

      {filteredMessages.length === 0 && searchQuery && (
        <div className="no-messages">
          <span className="no-msg-icon">🔍</span>
          <p>{`Nenhuma mensagem encontrada para "${searchQuery}"`}</p>
        </div>
      )}

      <div
        style={{
          height: `${channelVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {channelVirtualizer.getVirtualItems().map((virtualRow: any) => {
          const index = virtualRow.index
          const message = filteredMessages[index]
          const prevMessage = index > 0 ? filteredMessages[index - 1] : null
          const msgDate = new Date(message.created_at)
          const prevDate = prevMessage ? new Date(prevMessage.created_at) : null
          const isDifferentDay = !prevDate || msgDate.toDateString() !== prevDate.toDateString()

          // Parse reply quote if present
          let displayedBody = message.body
          let replyQuoteText: string | null = null
          if (displayedBody.startsWith('> @')) {
            const firstLineEnd = displayedBody.indexOf('\n')
            if (firstLineEnd !== -1) {
              replyQuoteText = displayedBody.slice(2, firstLineEnd)
              displayedBody = displayedBody.slice(firstLineEnd + 1)
            }
          }

          // Consecutive Message Grouping (Same author within 5 min, same calendar day, not a reply, and not voice note)
          const isSameAuthor = prevMessage && prevMessage.author_id === message.author_id
          const isWithinWindow = prevMessage && (msgDate.getTime() - prevDate!.getTime() < 5 * 60 * 1000)
          const isAudioNote = message.attachment_type === 'audio' || prevMessage?.attachment_type === 'audio'
          const isConsecutive = !isDifferentDay && isSameAuthor && isWithinWindow && !replyQuoteText && !isAudioNote

          const isMentioned = message.author_id !== user.id && message.body.toLowerCase().includes(`@${profileDisplayName.toLowerCase()}`)
          const msgRole = currentSpace ? getUserHighestRole(currentSpace.id, message.author_id) : null
          const isPinned = (pinnedMessages[selectedChannel.id] || []).some(p => p.message_id === message.id)
          const canManagePins = currentSpace && (canUserDo(currentSpace.id, user.id, 'manageMessages') || currentSpace.creator_id === user.id)
          const reactions = messageReactions[message.id] || {}

          const authorClanTag = localStorage.getItem(`echo-clan-tag-${message.author_id}`) || (message.author_id === user.id ? localStorage.getItem(`echo-clan-tag-${user.id}`) : null)
          const authorClanTagColor = localStorage.getItem(`echo-clan-tag-color-${message.author_id}`) || (message.author_id === user.id ? localStorage.getItem(`echo-clan-tag-color-${user.id}`) : '#00f2fe') || '#00f2fe'
          const isSelf = message.author_id === user.id
          const authorBadge = isSelf
            ? (localStorage.getItem(`echo-show-badge-${user.id}`) !== 'false' ? (localStorage.getItem(`echo-badge-${user.id}`) || 'owner') : 'none')
            : (presenceData[message.author_id]?.badge || localStorage.getItem(`echo-badge-${message.author_id}`) || null)
          const resolvedAuthorName = isSelf
            ? (profileDisplayName || (user.user_metadata as any)?.display_name || message.profile?.display_name || 'Você')
            : (presenceData[message.author_id]?.display_name || spaceMembers.find(m => (m?.user?.id === message.author_id || m?.id === message.author_id))?.user?.display_name || message.profile?.display_name || 'Membro')

          const resolvedAuthorAvatar = isSelf
            ? (profileAvatarUrl || message.profile?.avatar_url)
            : (presenceData[message.author_id]?.avatar_url || spaceMembers.find(m => (m?.user?.id === message.author_id || m?.id === message.author_id))?.user?.avatar_url || message.profile?.avatar_url)

          return (
            <div
              key={message.id || virtualRow.key}
              data-index={virtualRow.index}
              ref={channelVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
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
                className={`msg-card ${isConsecutive ? 'msg-consecutive' : ''} ${message.attachment_type === 'audio' ? 'has-voice-note' : ''} ${message.author_id === user.id ? 'msg-own' : ''} ${isMentioned ? 'mention-highlight' : ''} ${message.status === 'sending' ? 'msg-sending' : ''} ${message.status === 'failed' ? 'msg-failed' : ''}`} 
                style={{ position: 'relative' }}
              >
                    {/* Message Hover Action Bar */}
                    <div className="message-hover-actions">
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
                      <button 
                        type="button" 
                        className="hover-action-btn"
                        onClick={() => setReplyingToMessage(message)}
                        title="Responder a esta mensagem"
                      >
                        ↩️
                      </button>
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
                        <StarIcon style={{ width: '13px', height: '13px', color: isMessageSaved(message.id) ? '#ffc107' : 'inherit', fill: isMessageSaved(message.id) ? '#ffc107' : 'none' }} />
                      </button>
                      {canManagePins && (
                        <button 
                          type="button" 
                          className="hover-action-btn"
                          onClick={() => togglePinMessage(message, currentSpace.id, selectedChannel.id)}
                          title={isPinned ? "Desafixar Mensagem" : "Fixar Mensagem no Canal"}
                        >
                          <PinIcon style={{ width: '13px', height: '13px', color: isPinned ? 'var(--accent-color)' : 'inherit' }} />
                        </button>
                      )}
                      {(message.author_id === user.id || canManagePins) && (
                        <button 
                          type="button" 
                          className="hover-action-btn delete-btn"
                          onClick={() => handleDeleteMessage(message.id)}
                          title="Excluir mensagem"
                        >
                          <TrashIcon style={{ width: '13px', height: '13px' }} />
                        </button>
                      )}
                    </div>

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
                            <img src={resolvedAuthorAvatar} alt={resolvedAuthorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                      {!isConsecutive && (
                        <>
                          {replyQuoteText && (
                            <div className="reply-preview-in-message">
                              <span>↩️</span>
                              <em>{replyQuoteText}</em>
                            </div>
                          )}

                          <div className="msg-meta">
                            {(() => {
                              const authorNameEffect = message.author_id === user.id ? (nameEffect || 'resonance_cyan') : (presenceData[message.author_id]?.name_effect || localStorage.getItem(`echo-name-effect-${message.author_id}`) || 'none')
                              const authorNameMeta = NAME_EFFECTS.find(n => n.id === authorNameEffect)
                              return (
                                <>
                                  <strong 
                                    className={authorNameEffect && authorNameEffect !== 'none' ? `name-effect-${authorNameEffect}` : ''}
                                    style={{ color: (authorNameEffect && authorNameEffect !== 'none') ? undefined : (msgRole?.color || 'var(--text-primary)'), cursor: 'pointer' }}
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
                                  {authorNameEffect && authorNameEffect !== 'none' && (
                                    <span className="name-soundwave-indicator" title={authorNameMeta?.name || 'Aura Sonora'}>
                                      <span className="name-soundwave-bar" style={{ background: authorNameMeta?.themeColor || '#00f2fe' }} />
                                      <span className="name-soundwave-bar" style={{ background: authorNameMeta?.themeColor || '#00f2fe' }} />
                                      <span className="name-soundwave-bar" style={{ background: authorNameMeta?.themeColor || '#00f2fe' }} />
                                    </span>
                                  )}
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

                            {msgRole && (
                              <span 
                                style={{ 
                                  fontSize: '10px', 
                                  fontWeight: 700, 
                                  padding: '1px 6px', 
                                  borderRadius: '4px', 
                                  color: msgRole.color, 
                                  background: `${msgRole.color}18`, 
                                  border: `1px solid ${msgRole.color}44` 
                                }}
                              >
                                {msgRole.name}
                              </span>
                            )}

                            {isSelf && (
                              <span className="msg-self-badge">
                                você
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
                          <img
                            src={message.attachment_url}
                            alt="anexo"
                            className="msg-attachment-img"
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
                            onClick={() => openLightbox(message.attachment_url!)}
                          />
                          {displayedBody && displayedBody !== 'Imagem' && !displayedBody.startsWith('http') && (
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
                        <a
                          href={message.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="msg-attachment-file"
                          onClick={(e) => {
                            e.preventDefault()
                            openExternalUrl(message.attachment_url)
                          }}
                        >
                          <PaperclipIcon style={{ width: '13px', height: '13px', display: 'inline-block', verticalAlign: 'middle', marginRight: '5px' }} />
                          <span>{displayedBody}</span>
                        </a>
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
            })}
          </div>
          <div style={{ height: '24px', flexShrink: 0 }} />
          <div ref={messagesEndRef} />
    </div>
  )
})
