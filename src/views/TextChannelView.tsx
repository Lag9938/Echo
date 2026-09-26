import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Space, Channel, Message, PinnedMessage, ServerEmoji, RolePermissions, ServerRole } from '../types'
import { MembersSidebar } from '../components/sidebar/MembersSidebar'
import { PinnedMessagesDrawer } from '../components/chat/PinnedMessagesDrawer'
import { ChannelHeader } from '../components/chat/ChannelHeader'
import { MessageList } from '../components/chat/MessageList'
import { MessageComposer } from '../components/chat/MessageComposer'
import { PaperclipIcon } from '../components/icons'
import { useUIStore } from '../stores/useUIStore'
import { useSpacesStore } from '../stores/useSpacesStore'

export interface TextChannelViewProps {
  currentSpace: Space | null
  selectedChannel: Channel
  messages: Message[]
  hasMoreMessages: boolean
  isLoadingMore: boolean
  isLoadingMessages?: boolean
  loadMoreMessages: (channelId: string) => Promise<void> | void
  activeScreenSharers?: any[]
  isWatchingStreams?: boolean
  setIsWatchingStreams?: (val: boolean) => void
  voiceNoteTarget?: 'channel' | 'dm' | null
  messagesContainerRef: React.RefObject<HTMLDivElement | null>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  user: User
  profileDisplayName: string
  profileAvatarUrl?: string
  avatarDecoration?: string | null
  nameEffect?: string | null
  presenceData: Record<string, any>
  onlineUsers: Set<string>
  serverRoles: ServerRole[]
  memberRoleMap: Record<string, string[]>
  serverEmojis?: ServerEmoji[]
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  getUserHighestRole: (spaceId: string, userId: string) => ServerRole | null
  isMessageSaved: (msgId: string) => boolean
  toggleSaveMessage: (msg: Message, type: 'channel' | 'dm', extra?: any) => void
  handleDeleteMessage: (msgId: string) => void
  retrySendMessage: (msg: any) => void
  replyingToMessage: Message | null
  setReplyingToMessage: (msg: Message | null) => void
  messageReactions: Record<string, Record<string, string[]>>
  toggleReaction: (msgId: string, emoji: string) => void
  activePlayingVoiceNote: string | null
  handleToggleVoicePlay: (id: string, url: string) => void
  voiceNotePlaySpeed: number
  handleChangeVoiceSpeed: () => void
  voiceNoteAudioRef: React.RefObject<HTMLAudioElement | null>
  draft: string
  setDraft: React.Dispatch<React.SetStateAction<string>>
  send: (e: React.FormEvent) => void
  isUploading: boolean
  handleChatFileUpload: (file: File, caption?: string, sizePreference?: string) => void
  isVoiceNoteRecording: boolean
  voiceNoteDuration: number
  startVoiceNoteRecording: (target: 'channel' | 'dm') => void
  stopVoiceNoteRecording: () => void
  cancelVoiceNoteRecording: () => void
  slowmodeCooldown: number
  showSearchInput: boolean
  setShowSearchInput: React.Dispatch<React.SetStateAction<boolean>>
  searchQuery: string
  setSearchQuery: (q: string) => void
  showPinnedMessagesPanel: boolean
  setShowPinnedMessagesPanel: React.Dispatch<React.SetStateAction<boolean>>
  showMembersList: boolean
  setShowMembersList: React.Dispatch<React.SetStateAction<boolean>>
  pinnedMessages: Record<string, PinnedMessage[]>
  togglePinMessage: (msg: Message, spaceId: string, channelId: string) => void
  spaceMembers?: any[]
  spaceChannels?: Record<string, Channel[]>
  activeVoiceChannelId: string | null
  participants: any[]
  spaceVoiceUsers?: Record<string, any[]>
  presenceStatus?: 'online' | 'idle' | 'dnd' | 'invisible'
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  setSpaceForAddMembers: (space: Space) => void
  setInspectedMember: (val: any) => void
  setHoveredMemberPopover: (val: any) => void
  hoverTimeoutRef: React.MutableRefObject<any>
  postChannelMessage: (channelId: string, body: string, attachmentUrl?: string, attachmentType?: string, existingTempId?: string) => Promise<any> | void
  supabase: any
  typingUsers?: string[]
  notifyTyping?: () => void
}

export const TextChannelView = memo(function TextChannelView(props: TextChannelViewProps) {
  const storeSpaceMembers = useSpacesStore((s) => s.spaceMembers)
  const storeSpaceChannels = useSpacesStore((s) => s.spaceChannels)
  const storeSpaceVoiceUsers = useSpacesStore((s) => s.spaceVoiceUsers)
  const storePresenceStatus = useUIStore((s) => s.presenceStatus)

  const spaceMembers = props.spaceMembers ?? storeSpaceMembers
  const spaceChannels = props.spaceChannels ?? storeSpaceChannels
  const spaceVoiceUsers = props.spaceVoiceUsers ?? storeSpaceVoiceUsers
  const presenceStatus = props.presenceStatus ?? storePresenceStatus

  const {
    currentSpace,
    selectedChannel,
    messages,
    hasMoreMessages,
    isLoadingMore,
    isLoadingMessages = false,
    loadMoreMessages,
    activeScreenSharers = [],
    isWatchingStreams = false,
    setIsWatchingStreams = () => {},
    voiceNoteTarget = null,
    messagesContainerRef,
    messagesEndRef,
    user,
    profileDisplayName,
    profileAvatarUrl = '',
    avatarDecoration,
    nameEffect,
    presenceData,
    onlineUsers,
    serverRoles,
    memberRoleMap,
    serverEmojis = [],
    canUserDo,
    getUserHighestRole,
    isMessageSaved,
    toggleSaveMessage,
    handleDeleteMessage,
    retrySendMessage,
    replyingToMessage,
    setReplyingToMessage,
    messageReactions,
    toggleReaction,
    activePlayingVoiceNote,
    handleToggleVoicePlay,
    voiceNotePlaySpeed,
    handleChangeVoiceSpeed,
    voiceNoteAudioRef,
    draft,
    setDraft,
    send,
    isUploading,
    handleChatFileUpload,
    isVoiceNoteRecording,
    voiceNoteDuration,
    startVoiceNoteRecording,
    stopVoiceNoteRecording,
    cancelVoiceNoteRecording,
    slowmodeCooldown,
    showSearchInput,
    setShowSearchInput,
    searchQuery,
    setSearchQuery,
    showPinnedMessagesPanel,
    setShowPinnedMessagesPanel,
    showMembersList,
    setShowMembersList,
    pinnedMessages,
    togglePinMessage,
    activeVoiceChannelId,
    participants,
    myGamePresence,
    setSpaceForAddMembers,
    setInspectedMember,
    setHoveredMemberPopover,
    hoverTimeoutRef,
    postChannelMessage,
    supabase,
    typingUsers = [],
    notifyTyping
  } = props

  const openLightbox = useUIStore((s) => s.openLightbox)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerTab, setEmojiPickerTab] = useState<'default' | 'server'>('default')
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifSearchQuery, setGifSearchQuery] = useState('')
  const [showStickerPicker, setShowStickerPicker] = useState(false)

  const handleSendSticker = async (url: string, name?: string) => {
    if (selectedChannel && supabase) {
      await postChannelMessage(selectedChannel.id, name ? `[Sticker: ${name}]` : 'Sticker', url, 'sticker')
      setShowStickerPicker(false)
    }
  }

  // Staged clipboard paste image state
  const [pendingPastedFile, setPendingPastedFile] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const [pendingImageSize, setPendingImageSize] = useState<'small' | 'medium' | 'large' | 'original'>('medium')

  // Mention Autocomplete State (@)
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const chatInputRef = useRef<HTMLInputElement | null>(null)

  const mentionCandidates = useMemo(() => {
    const list: { id: string; name: string; avatarUrl?: string; roleName?: string; roleColor?: string; isSpecial?: boolean }[] = []
    const q = mentionQuery.toLowerCase().trim()

    // Opção especial @todos
    if (!q || 'todos'.includes(q) || 'everyone'.includes(q)) {
      list.push({
        id: 'everyone-mention',
        name: 'todos',
        roleName: 'Notificar todos no canal',
        roleColor: '#f59e0b',
        isSpecial: true
      })
    }

    const seen = new Set<string>()
    ;(spaceMembers || []).forEach(m => {
      const u = m.user || m
      if (!u || !u.id || seen.has(u.id)) return
      seen.add(u.id)
      const dName = u.display_name || u.name || 'Membro'
      if (!q || dName.toLowerCase().includes(q)) {
        const role = getUserHighestRole?.(currentSpace?.id || '', u.id)
        list.push({
          id: u.id,
          name: dName,
          avatarUrl: u.avatar_url,
          roleName: role?.name,
          roleColor: role?.color
        })
      }
    })

    return list.slice(0, 8)
  }, [mentionQuery, spaceMembers, currentSpace?.id, getUserHighestRole])

  const selectMention = useCallback((candidate: { name: string }) => {
    if (!candidate || mentionStartIndex === -1) return
    const input = chatInputRef.current
    const cursorPos = input?.selectionStart ?? draft.length
    const beforeAt = draft.slice(0, mentionStartIndex)
    const afterCursor = draft.slice(cursorPos)
    const mentionText = `@${candidate.name} `
    const newDraft = beforeAt + mentionText + afterCursor
    setDraft(newDraft)
    setShowMentionPicker(false)
    setMentionStartIndex(-1)

    setTimeout(() => {
      if (input) {
        input.focus()
        const newPos = beforeAt.length + mentionText.length
        input.setSelectionRange(newPos, newPos)
      }
    }, 10)
  }, [draft, mentionStartIndex, setDraft])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setDraft(val)
    if (notifyTyping) notifyTyping()

    const cursorPos = e.target.selectionStart ?? val.length
    const textBeforeCursor = val.slice(0, cursorPos)
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\u00C0-\u017F]*)$/)

    if (match) {
      const q = match[1]
      const atIdx = textBeforeCursor.lastIndexOf('@')
      setMentionQuery(q)
      setMentionStartIndex(atIdx)
      setSelectedMentionIndex(0)
      setShowMentionPicker(true)
    } else {
      setShowMentionPicker(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionPicker && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex(prev => (prev + 1) % mentionCandidates.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex(prev => (prev - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        selectMention(mentionCandidates[selectedMentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentionPicker(false)
        return
      }
    }
  }

  // Drag & drop file upload state
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const dragCounterRef = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDraggingOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDraggingOver(false)

    const file = e.dataTransfer?.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setPendingImagePreview(prev => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(file)
        })
        setPendingPastedFile(file)
      } else {
        handleChatFileUpload(file)
      }
    }
  }, [handleChatFileUpload])

  const removePendingImage = useCallback(() => {
    setPendingPastedFile(null)
    setPendingImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
    const clipboardData = ('clipboardData' in e ? e.clipboardData : null)
    const items = clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          const rawExt = file.type.split('/')[1] || 'png'
          const ext = rawExt.replace(/[^a-zA-Z0-9]/g, '')
          const renamedFile = new File([file], `screenshot_${Date.now()}.${ext}`, { type: file.type })

          setPendingImagePreview(prev => {
            if (prev) URL.revokeObjectURL(prev)
            return URL.createObjectURL(renamedFile)
          })
          setPendingPastedFile(renamedFile)
          return
        }
      }
    }
  }, [])

  // Global window paste handler when channel is active
  useEffect(() => {
    const onWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.tagName === 'INPUT' && target.id !== 'chat-input-field') {
        return
      }
      if (target && target.tagName === 'TEXTAREA') {
        return
      }
      handlePaste(e)
    }
    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [handlePaste])

  // Esc key cancels pending image
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingPastedFile) {
        removePendingImage()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingPastedFile, removePendingImage])

  const handleComposerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pendingPastedFile) {
      const file = pendingPastedFile
      const caption = draft.trim()
      const sizePref = pendingImageSize
      removePendingImage()
      setDraft('')
      await handleChatFileUpload(file, caption, sizePref)
      return
    }
    send(e)
  }

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      // Isolamento estrito de canal: se a mensagem pertencer a outro canal, NUNCA renderize
      if (m.channel_id && selectedChannel && m.channel_id !== selectedChannel.id) {
        return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      if (q.startsWith('de:') || q.startsWith('from:')) {
        const authorQ = q.slice(3).trim().replace('@', '')
        return (m.profile?.display_name || '').toLowerCase().includes(authorQ)
      }
      return m.body.toLowerCase().includes(q) || (m.profile?.display_name || '').toLowerCase().includes(q)
    })
  }, [messages, searchQuery, selectedChannel?.id])

  // Mantém o chat no fim quando chega mensagem nova, mantendo a última acima da caixa de digitação.
  // Só cola no fim se a pessoa já estava perto dele (não puxa de volta quem subiu para ler o histórico) e
  // repete algumas vezes porque imagens e incorporações crescem depois de carregar.
  const lastMessageId = filteredMessages[filteredMessages.length - 1]?.id
  const stickToBottomRef = useRef(true)
  useEffect(() => { stickToBottomRef.current = true }, [selectedChannel?.id])
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const onScroll = () => {
      stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [messagesContainerRef, selectedChannel?.id])
  useEffect(() => {
    if (!lastMessageId) return
    const el = messagesContainerRef.current
    if (!el) return
    const toBottom = () => {
      if (stickToBottomRef.current) el.scrollTop = el.scrollHeight
    }
    toBottom()
    const timers = [50, 160, 400, 900].map(ms => setTimeout(toBottom, ms))
    return () => timers.forEach(clearTimeout)
  }, [lastMessageId, messagesContainerRef])

  return (
    <>
      <ChannelHeader
        currentSpace={currentSpace}
        selectedChannel={selectedChannel}
        showSearchInput={showSearchInput}
        setShowSearchInput={setShowSearchInput}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showPinnedMessagesPanel={showPinnedMessagesPanel}
        setShowPinnedMessagesPanel={setShowPinnedMessagesPanel}
        pinnedCount={pinnedMessages[selectedChannel.id]?.length || 0}
        activeScreenSharers={activeScreenSharers}
        isWatchingStreams={isWatchingStreams}
        setIsWatchingStreams={setIsWatchingStreams}
        showMembersList={showMembersList}
        setShowMembersList={setShowMembersList}
      />
      <div 
        className="chat-workspace-wrapper" 
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%', position: 'relative', overflow: 'hidden' }}
      >
        {isDraggingOver && (
          <div style={{
            position: 'absolute',
            inset: '10px',
            zIndex: 100,
            background: 'rgba(10, 13, 20, 0.94)',
            border: '2px dashed #00f2fe',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 35px rgba(0, 242, 254, 0.3)',
            pointerEvents: 'none'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(0, 242, 254, 0.15)',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              display: 'grid',
              placeItems: 'center',
              color: '#00f2fe'
            }}>
              <PaperclipIcon style={{ width: '26px', height: '26px' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                Solte para Enviar em #{selectedChannel.name}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Imagens, prints, vídeos ou documentos
              </p>
            </div>
          </div>
        )}
        <div className="chat-area-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
          <MessageList
            messagesContainerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
            selectedChannel={selectedChannel}
            currentSpace={currentSpace}
            filteredMessages={filteredMessages}
            hasMoreMessages={hasMoreMessages}
            isLoadingMore={isLoadingMore}
            isLoadingMessages={isLoadingMessages}
            loadMoreMessages={loadMoreMessages}
            searchQuery={searchQuery}
            user={user}
            profileDisplayName={profileDisplayName}
            profileAvatarUrl={profileAvatarUrl}
            avatarDecoration={avatarDecoration}
            nameEffect={nameEffect}
            presenceData={presenceData}
            serverRoles={serverRoles}
            memberRoleMap={memberRoleMap}
            serverEmojis={serverEmojis}
            spaceMembers={spaceMembers}
            canUserDo={canUserDo}
            getUserHighestRole={getUserHighestRole}
            setInspectedMember={setInspectedMember}
            toggleReaction={toggleReaction}
            setReplyingToMessage={setReplyingToMessage}
            isMessageSaved={isMessageSaved}
            toggleSaveMessage={toggleSaveMessage}
            pinnedMessages={pinnedMessages}
            togglePinMessage={togglePinMessage}
            handleDeleteMessage={handleDeleteMessage}
            openLightbox={openLightbox}
            activePlayingVoiceNote={activePlayingVoiceNote}
            handleToggleVoicePlay={handleToggleVoicePlay}
            voiceNotePlaySpeed={voiceNotePlaySpeed}
            handleChangeVoiceSpeed={handleChangeVoiceSpeed}
            voiceNoteAudioRef={voiceNoteAudioRef}
            retrySendMessage={retrySendMessage}
            messageReactions={messageReactions}
          />

          <MessageComposer
            selectedChannel={selectedChannel}
            currentSpace={currentSpace}
            canUserDo={canUserDo}
            user={user}
            profileDisplayName={profileDisplayName}
            spaceMembers={spaceMembers}
            presenceData={presenceData}
            replyingToMessage={replyingToMessage}
            setReplyingToMessage={setReplyingToMessage}
            isVoiceNoteRecording={isVoiceNoteRecording}
            voiceNoteTarget={voiceNoteTarget}
            voiceNoteDuration={voiceNoteDuration}
            startVoiceNoteRecording={startVoiceNoteRecording}
            stopVoiceNoteRecording={stopVoiceNoteRecording}
            cancelVoiceNoteRecording={cancelVoiceNoteRecording}
            typingUsers={typingUsers}
            pendingPastedFile={pendingPastedFile}
            setPendingPastedFile={setPendingPastedFile}
            pendingImagePreview={pendingImagePreview}
            setPendingImagePreview={setPendingImagePreview}
            pendingImageSize={pendingImageSize}
            setPendingImageSize={setPendingImageSize}
            removePendingImage={removePendingImage}
            handleComposerSubmit={handleComposerSubmit}
            handleChatFileUpload={handleChatFileUpload}
            isUploading={isUploading}
            draft={draft}
            setDraft={setDraft}
            chatInputRef={chatInputRef}
            handleInputChange={handleInputChange}
            handleInputKeyDown={handleInputKeyDown}
            handlePaste={handlePaste}
            slowmodeCooldown={slowmodeCooldown}
            showMentionPicker={showMentionPicker}
            mentionCandidates={mentionCandidates}
            selectedMentionIndex={selectedMentionIndex}
            setSelectedMentionIndex={setSelectedMentionIndex}
            selectMention={selectMention}
            showGifPicker={showGifPicker}
            setShowGifPicker={setShowGifPicker}
            gifSearchQuery={gifSearchQuery}
            setGifSearchQuery={setGifSearchQuery}
            showStickerPicker={showStickerPicker}
            setShowStickerPicker={setShowStickerPicker}
            handleSendSticker={handleSendSticker}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            emojiPickerTab={emojiPickerTab}
            setEmojiPickerTab={setEmojiPickerTab}
            serverEmojis={serverEmojis}
            supabase={supabase}
            postChannelMessage={postChannelMessage}
          />
        </div>

        {/* Pinned Messages Drawer */}
        <PinnedMessagesDrawer
          isOpen={showPinnedMessagesPanel}
          onClose={() => setShowPinnedMessagesPanel(false)}
          channelId={selectedChannel.id}
          pinnedMessages={pinnedMessages}
          currentSpace={currentSpace}
          canUserDo={canUserDo}
          userId={user.id}
          messages={messages}
          togglePinMessage={togglePinMessage}
          profileDisplayName={profileDisplayName}
          serverEmojis={serverEmojis}
        />

        <MembersSidebar
          isVisible={showMembersList}
          currentSpace={currentSpace}
          spaceMembers={spaceMembers}
          spaceChannels={spaceChannels}
          activeVoiceChannelId={activeVoiceChannelId}
          participants={participants}
          spaceVoiceUsers={spaceVoiceUsers}
          onlineUsers={onlineUsers}
          presenceData={presenceData}
          user={user}
          presenceStatus={presenceStatus}
          myGamePresence={myGamePresence}
          avatarDecoration={avatarDecoration}
          nameEffect={nameEffect}
          serverRoles={serverRoles}
          memberRoleMap={memberRoleMap}
          getUserHighestRole={getUserHighestRole}
          setSpaceForAddMembers={setSpaceForAddMembers}
          setInspectedMember={setInspectedMember}
          setHoveredMemberPopover={setHoveredMemberPopover}
          hoverTimeoutRef={hoverTimeoutRef}
        />
      </div>
    </>
  )
})
