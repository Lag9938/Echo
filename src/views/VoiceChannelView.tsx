import React, { useState, useCallback, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { VoiceParticipant } from '../lib/useVoiceChannel'
import type { Space, Channel, Message, PinnedMessage, ServerEmoji, RolePermissions, ServerRole } from '../types'
import { MembersSidebar } from '../components/sidebar/MembersSidebar'
import { PinnedMessagesDrawer } from '../components/chat/PinnedMessagesDrawer'
import { StreamTile } from '../components/streaming/StreamTile'
import { AvatarDecoration } from '../components/AvatarDecoration'
import { ModernVoiceNotePlayer } from '../components/chat/ModernVoiceNotePlayer'
import { formatMessageText } from '../lib/messageFormatter'
import {
  BrainIcon,
  EyeOffIcon,
  FocusIcon,
  GridIcon,
  HeadphonesIcon,
  HeadphonesOffIcon,
  MessageSquareIcon,
  MicIcon,
  MicOffIcon,
  PaperclipIcon,
  PhoneOffIcon,
  PinIcon,
  PipIcon,
  PlayIcon,
  RecordCallIcon,
  ScreenIcon,
  SearchIcon,
  SendIcon,
  SoundboardIcon,
  StarIcon,
  StopSquareIcon,
  TrashIcon,
  UsersIcon,
  VolumeIcon
} from '../components/icons'
import { openExternalUrl } from '../lib/openExternal'
import { useUIStore } from '../stores/useUIStore'

export interface VoiceChannelViewProps {
  currentSpace: Space | null
  selectedChannel: Channel
  spaceChannels: Record<string, Channel[]>
  spaceVoiceUsers: Record<string, any[]>
  user: User
  profileDisplayName: string
  profileAvatarUrl: string
  avatarDecoration?: string | null
  presenceData: Record<string, any>
  onlineUsers: Set<string>
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  nameEffect?: string | null
  serverRoles: ServerRole[]
  memberRoleMap: Record<string, string[]>
  getUserHighestRole: (spaceId: string, userId: string) => ServerRole | null
  setSpaceForAddMembers: (space: Space) => void
  setInspectedMember: (val: any) => void
  setHoveredMemberPopover: (val: any) => void
  hoverTimeoutRef: React.MutableRefObject<any>
  spaceMembers: any[]
  activeVoiceChannelId: string | null
  isConnected: boolean
  participants: VoiceParticipant[]
  handleJoinVoice: (channelId: string, spaceId?: string) => void
  handleLeaveVoice: () => void
  isMuted: boolean
  handleToggleMute: () => void
  isDeafened: boolean
  handleToggleDeafen: () => void
  isAiDenoiseEnabled: boolean
  toggleAiDenoise: () => void
  isPttMode: boolean
  isPttActive: boolean
  pttKey: string
  setShowSoundboardModal: (val: boolean) => void
  isRecordingCall: boolean
  startCallRecording: () => void
  stopCallRecording: () => void
  recordingDuration: number
  setVolumeControlUser: (user: any) => void
  activeScreenSharers: VoiceParticipant[]
  activeScreenSharer: VoiceParticipant | null
  _selectedScreenSharerUserId?: string | null
  setSelectedScreenSharerUserId: (id: string | null) => void
  screenShareViewMode: 'focus' | 'grid'
  setScreenShareViewMode: (mode: 'focus' | 'grid') => void
  isWatchingStreams: boolean
  setIsWatchingStreams: (val: boolean) => void
  isPiPActive: boolean
  setIsPiPActive: (val: boolean) => void
  localScreenStream: MediaStream | null
  handleStopScreenShare: () => void
  openScreenPicker: () => void
  forceOpenScreenPicker: () => void
  screenQuality: string
  handleQualityChange: (q: any) => void | Promise<void>
  screenFps: number
  handleFpsChange: (fps: any) => void | Promise<void>
  _isCurrentStreamGameOrScreen?: boolean
  activeSharingSource: any
  _is60DisabledInCall?: boolean
  peerScreenVolumes: Record<string, number>
  setPeerScreenVolumes: React.Dispatch<React.SetStateAction<Record<string, number>>>
  _localScreenFps?: number
  screenAudioSyncDelayMs: number
  changeScreenAudioSyncDelay: (val: number) => void
  screenShareContainerRef: React.RefObject<HTMLDivElement | null>
  isScreenFullScreen: boolean
  toggleScreenFullScreen: (force?: boolean) => void
  messages: Message[]
  send: (e: React.FormEvent) => void
  draft: string
  setDraft: (val: string) => void
  handleChatFileUpload: (file: File, caption?: string) => void
  isUploading: boolean
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  isMessageSaved: (msgId: string) => boolean
  toggleSaveMessage: (msg: Message, type: 'channel' | 'dm', extra?: any) => void
  handleDeleteMessage: (msgId: string) => void
  activePlayingVoiceNote: string | null
  handleToggleVoicePlay: (id: string, url: string) => void
  voiceNotePlaySpeed: number
  handleChangeVoiceSpeed: () => void
  voiceNoteAudioRef: React.RefObject<HTMLAudioElement | null>
  serverEmojis?: ServerEmoji[]
  pinnedMessages: Record<string, PinnedMessage[]>
  togglePinMessage: (msg: Message, spaceId: string, channelId: string) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  showVoiceChat: boolean
  setShowVoiceChat: React.Dispatch<React.SetStateAction<boolean>>
  showMembersList: boolean
  setShowMembersList: React.Dispatch<React.SetStateAction<boolean>>
  showPinnedMessagesPanel: boolean
  setShowPinnedMessagesPanel: React.Dispatch<React.SetStateAction<boolean>>
  showSearchInput: boolean
  setShowSearchInput: React.Dispatch<React.SetStateAction<boolean>>
  searchQuery: string
  setSearchQuery: (val: string) => void
  showScreenMenu: boolean
  setShowScreenMenu: React.Dispatch<React.SetStateAction<boolean>>
}

export function VoiceChannelView({
  currentSpace,
  selectedChannel,
  spaceChannels,
  spaceVoiceUsers,
  user,
  profileDisplayName,
  profileAvatarUrl,
  avatarDecoration,
  presenceData,
  onlineUsers,
  presenceStatus,
  myGamePresence,
  nameEffect,
  serverRoles,
  memberRoleMap,
  getUserHighestRole,
  setSpaceForAddMembers,
  setInspectedMember,
  setHoveredMemberPopover,
  hoverTimeoutRef,
  spaceMembers,
  activeVoiceChannelId,
  isConnected,
  participants,
  handleJoinVoice,
  handleLeaveVoice,
  isMuted,
  handleToggleMute,
  isDeafened,
  handleToggleDeafen,
  isAiDenoiseEnabled,
  toggleAiDenoise,
  isPttMode,
  isPttActive,
  pttKey,
  setShowSoundboardModal,
  isRecordingCall,
  startCallRecording,
  stopCallRecording,
  recordingDuration,
  setVolumeControlUser,
  activeScreenSharers,
  activeScreenSharer,
  setSelectedScreenSharerUserId,
  screenShareViewMode,
  setScreenShareViewMode,
  isWatchingStreams,
  setIsWatchingStreams,
  isPiPActive,
  setIsPiPActive,
  localScreenStream,
  handleStopScreenShare,
  openScreenPicker,
  forceOpenScreenPicker,
  screenQuality,
  handleQualityChange,
  screenFps,
  handleFpsChange,
  activeSharingSource,
  peerScreenVolumes,
  setPeerScreenVolumes,
  screenAudioSyncDelayMs,
  changeScreenAudioSyncDelay,
  screenShareContainerRef,
  isScreenFullScreen,
  toggleScreenFullScreen,
  messages,
  send,
  draft,
  setDraft,
  handleChatFileUpload,
  isUploading,
  canUserDo,
  isMessageSaved,
  toggleSaveMessage,
  handleDeleteMessage,
  activePlayingVoiceNote,
  handleToggleVoicePlay,
  voiceNotePlaySpeed,
  handleChangeVoiceSpeed,
  voiceNoteAudioRef,
  serverEmojis,
  pinnedMessages,
  togglePinMessage,
  messagesEndRef,
  showVoiceChat,
  setShowVoiceChat,
  showMembersList,
  setShowMembersList,
  showPinnedMessagesPanel,
  setShowPinnedMessagesPanel,
  showSearchInput,
  setShowSearchInput,
  searchQuery,
  setSearchQuery,
  showScreenMenu,
  setShowScreenMenu
}: VoiceChannelViewProps) {
  const openLightbox = useUIStore((s) => s.openLightbox)
  const [pendingVoicePastedFile, setPendingVoicePastedFile] = useState<File | null>(null)
  const [pendingVoiceImagePreview, setPendingVoiceImagePreview] = useState<string | null>(null)

  const removePendingVoiceImage = useCallback(() => {
    setPendingVoicePastedFile(null)
    setPendingVoiceImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const handleVoicePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
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

          setPendingVoiceImagePreview(prev => {
            if (prev) URL.revokeObjectURL(prev)
            return URL.createObjectURL(renamedFile)
          })
          setPendingVoicePastedFile(renamedFile)
          return
        }
      }
    }
  }, [])

  // Window paste listener when voice chat drawer is visible
  useEffect(() => {
    if (!showVoiceChat) return
    const onWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.tagName === 'INPUT' && target.id !== 'voice-chat-input') {
        return
      }
      if (target && target.tagName === 'TEXTAREA') {
        return
      }
      handleVoicePaste(e)
    }
    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [showVoiceChat, handleVoicePaste])

  // Esc key cancels pending voice chat image
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingVoicePastedFile) {
        removePendingVoiceImage()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingVoicePastedFile, removePendingVoiceImage])

  const handleVoiceComposerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pendingVoicePastedFile) {
      const file = pendingVoicePastedFile
      const caption = draft.trim()
      removePendingVoiceImage()
      setDraft('')
      await handleChatFileUpload(file, caption)
      return
    }
    send(e)
  }

  return (
                <div className="voice-room">
                  <header className="content-header">
                    <div className="header-info">
                      {currentSpace && <span className="header-space">{currentSpace.name}</span>}
                      <h1><span className="header-icon"><VolumeIcon /></span> {selectedChannel.name}</h1>
                    </div>
                    <div className="channel-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {activeVoiceChannelId === selectedChannel.id && isConnected && (
                        <span className="live-badge voice-live">● Conectado</span>
                      )}

                      {/* Search messages in channel */}
                      <div className="channel-search-box-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        {showSearchInput ? (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2px 8px' }}>
                            <SearchIcon style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                            <input 
                              type="text" 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Buscar mensagens..."
                              autoFocus
                              style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '12px', padding: '4px 6px', outline: 'none', width: '160px' }}
                            />
                            {searchQuery && (
                              <button type="button" onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}>✕</button>
                            )}
                            <button type="button" onClick={() => { setShowSearchInput(false); setSearchQuery('') }} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', marginLeft: '4px' }}>✕</button>
                          </div>
                        ) : (
                          <button 
                            type="button" 
                            className="channel-header-action-btn" 
                            onClick={() => {
                              setShowSearchInput(true)
                              setShowVoiceChat(true)
                            }} 
                            title="Buscar mensagens no chat da call"
                          >
                            <SearchIcon style={{ width: '15px', height: '15px' }} />
                          </button>
                        )}
                      </div>

                      {/* Pinned Messages Button */}
                      <button 
                        type="button" 
                        className={`channel-header-action-btn ${showPinnedMessagesPanel || (pinnedMessages[selectedChannel.id]?.length || 0) > 0 ? 'active' : ''}`}
                        onClick={() => setShowPinnedMessagesPanel(!showPinnedMessagesPanel)}
                        title="Mensagens Fixadas"
                      >
                        <PinIcon style={{ width: '15px', height: '15px' }} />
                        {(pinnedMessages[selectedChannel.id]?.length || 0) > 0 && (
                          <span className="channel-header-badge">
                            {pinnedMessages[selectedChannel.id]?.length}
                          </span>
                        )}
                      </button>

                      {/* Voice Text Chat Toggle Button */}
                      <button 
                        type="button"
                        className={`channel-header-action-btn ${showVoiceChat ? 'active' : ''}`} 
                        onClick={() => setShowVoiceChat(!showVoiceChat)}
                        title={showVoiceChat ? "Ocultar Chat de Texto" : "Mostrar Chat de Texto"}
                      >
                        <MessageSquareIcon style={{ width: '15px', height: '15px' }} />
                      </button>

                      {/* Members List Button */}
                      <button 
                        type="button"
                        className={`channel-header-action-btn ${showMembersList ? 'active' : ''}`} 
                        onClick={() => setShowMembersList(!showMembersList)}
                        title={showMembersList ? "Ocultar Lista de Membros" : "Mostrar Lista de Membros"}
                      >
                        <UsersIcon style={{ width: '15px', height: '15px' }} />
                      </button>
                    </div>
                  </header>

                  <div className="voice-workspace-wrapper" style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%' }}>
                    <div className="voice-content" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', minWidth: 0 }}>
                      <div className="voice-split-layout" style={!showVoiceChat ? { gridTemplateColumns: '1fr' } : undefined}>
                          {/* Media pane (Left) */}
                          <div className="voice-media-pane">
                            {(() => {
                              const callMembersMap = new Map<string, VoiceParticipant>()
                              if (activeVoiceChannelId === selectedChannel.id && isConnected) {
                                participants.forEach(p => { if (p?.userId) callMembersMap.set(p.userId, p) })
                              }
                              const spUsers = spaceVoiceUsers[selectedChannel.id] || []
                              spUsers.forEach(p => {
                                if (p?.userId && !callMembersMap.has(p.userId)) {
                                  callMembersMap.set(p.userId, p)
                                }
                              })
                              if (activeVoiceChannelId === selectedChannel.id && user?.id && !callMembersMap.has(user.id)) {
                                callMembersMap.set(user.id, {
                                  userId: user.id,
                                  displayName: profileDisplayName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Você',
                                  avatarUrl: profileAvatarUrl || user.user_metadata?.avatar_url,
                                  isSpeaking: false,
                                  isMuted,
                                  isDeafened,
                                  screenStream: localScreenStream || undefined
                                })
                              }
                              const callMembersList = Array.from(callMembersMap.values())

                              return (
                                <>
                                  {activeScreenSharers.length > 0 && isWatchingStreams ? (
                                    <div className="voice-streams-container">
                                <div className="streams-switcher-bar">
                                  <div className="streams-switcher-tabs">
                                    {activeScreenSharers.map(sharer => {
                                      const isSelected = activeScreenSharer?.userId === sharer.userId
                                      return (
                                        <button
                                          key={sharer.userId}
                                          type="button"
                                          className={`stream-tab-btn ${isSelected && screenShareViewMode === 'focus' ? 'active' : ''}`}
                                          onClick={() => {
                                            setSelectedScreenSharerUserId(sharer.userId)
                                            setScreenShareViewMode('focus')
                                          }}
                                          title={`Alternar para transmissão de ${sharer.displayName}`}
                                        >
                                          <div className="stream-tab-avatar">
                                            {sharer.avatarUrl ? (
                                              <img src={sharer.avatarUrl} alt={sharer.displayName} />
                                            ) : (
                                              <span>{sharer.displayName.slice(0, 1).toUpperCase()}</span>
                                            )}
                                          </div>
                                          <span className="stream-tab-name">{sharer.displayName}</span>
                                          <span className="stream-tab-live-badge">
                                            <span className="stream-tab-live-dot" />
                                            AO VIVO
                                          </span>
                                        </button>
                                      )
                                    })}
                                  </div>

                                  <div className="streams-view-mode-toggles">
                                    {activeScreenSharers.length > 1 && (
                                      <div className="stream-segmented-group">
                                        <button
                                          type="button"
                                          className={`stream-view-toggle-btn ${screenShareViewMode === 'focus' ? 'active' : ''}`}
                                          onClick={() => setScreenShareViewMode('focus')}
                                          title="Modo Foco (Uma tela em destaque)"
                                        >
                                          <FocusIcon />
                                          <span>Foco</span>
                                        </button>
                                        <button
                                          type="button"
                                          className={`stream-view-toggle-btn ${screenShareViewMode === 'grid' ? 'active' : ''}`}
                                          onClick={() => setScreenShareViewMode('grid')}
                                          title="Modo Grade (Ver todas as telas divididas)"
                                        >
                                          <GridIcon />
                                          <span>Grade ({activeScreenSharers.length})</span>
                                        </button>
                                      </div>
                                    )}

                                    {/* Mini Player (Picture-in-Picture) Toggle Button */}
                                    <button
                                      type="button"
                                      className={`stream-control-btn ${isPiPActive ? 'pip-active' : ''}`}
                                      onClick={() => setIsPiPActive(!isPiPActive)}
                                      title={isPiPActive ? "Fechar Mini Player Flutuante" : "Ativar Mini Player Flutuante (Always-on-Top)"}
                                    >
                                      <PipIcon />
                                      <span>{isPiPActive ? 'Mini Player ON' : 'Mini Player'}</span>
                                    </button>

                                    {/* Hide / Close Stream View Button */}
                                    <button
                                      type="button"
                                      className="stream-control-btn"
                                      onClick={() => setIsWatchingStreams(false)}
                                      title="Ocultar vídeo (Ver apenas os avatares de voz)"
                                    >
                                      <EyeOffIcon />
                                      <span>Ocultar Vídeo</span>
                                    </button>

                                    {/* Quick Stop Stream for the streamer */}
                                    {localScreenStream && (
                                      <button
                                        type="button"
                                        className="stream-control-btn stop-btn"
                                        onClick={handleStopScreenShare}
                                        title="Parar de transmitir minha tela"
                                      >
                                        <StopSquareIcon />
                                        <span>Parar Transmissão</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {screenShareViewMode === 'grid' && activeScreenSharers.length > 1 ? (
                                  <div className="streams-multi-grid" style={{ gridTemplateColumns: `repeat(${Math.min(activeScreenSharers.length, 2)}, 1fr)` }}>
                                    {activeScreenSharers.map(sharer => (
                                      <StreamTile
                                        key={sharer.userId}
                                        participant={sharer}
                                        user={user}
                                        peerScreenVolumes={peerScreenVolumes}
                                        setPeerScreenVolumes={setPeerScreenVolumes}
                                        isGrid={true}
                                        isPiPActive={isPiPActive}
                                        onToggleFloatingPiP={() => setIsPiPActive(!isPiPActive)}
                                        onSelectFocus={() => {
                                          setSelectedScreenSharerUserId(sharer.userId)
                                          setScreenShareViewMode('focus')
                                        }}
                                        onCloseStream={() => setIsWatchingStreams(false)}
                                        localScreenFps={screenFps}
                                        screenAudioSyncDelayMs={screenAudioSyncDelayMs}
                                        onChangeScreenAudioSyncDelay={changeScreenAudioSyncDelay}
                                      />
                                    ))}
                                  </div>
                                ) : activeScreenSharer ? (
                                  <div className="stream-single-focus-wrap" ref={screenShareContainerRef}>
                                    <StreamTile
                                      participant={activeScreenSharer}
                                      user={user}
                                      peerScreenVolumes={peerScreenVolumes}
                                      setPeerScreenVolumes={setPeerScreenVolumes}
                                      isFullScreen={isScreenFullScreen}
                                      onToggleFullScreen={() => toggleScreenFullScreen()}
                                      isPiPActive={isPiPActive}
                                      onToggleFloatingPiP={() => setIsPiPActive(!isPiPActive)}
                                      onCloseStream={() => {
                                        if (isScreenFullScreen) toggleScreenFullScreen(false)
                                        setIsWatchingStreams(false)
                                      }}
                                      localScreenFps={screenFps}
                                      screenAudioSyncDelayMs={screenAudioSyncDelayMs}
                                      onChangeScreenAudioSyncDelay={changeScreenAudioSyncDelay}
                                    />
                                  </div>
                                ) : null}

                                {/* Strip horizontal de participantes durante transmissão ao vivo */}
                                {callMembersList.length > 0 && (
                                  <div className="stream-participants-strip">
                                    {callMembersList.map(p => {
                                      const isSharer = !!(p.screenStream && p.screenStream.getVideoTracks().length > 0)
                                      return (
                                        <div
                                          key={p.userId}
                                          className={`stream-strip-card ${p.isSpeaking ? 'speaking' : ''} ${isSharer ? 'is-sharer' : ''}`}
                                          onClick={() => {
                                            if (isSharer) {
                                              setSelectedScreenSharerUserId(p.userId)
                                              setIsWatchingStreams(true)
                                              setScreenShareViewMode('focus')
                                            } else if (p.userId !== user.id) {
                                              setVolumeControlUser(p)
                                            }
                                          }}
                                          title={isSharer ? `Clique para alternar para a transmissão de ${p.displayName}` : (p.userId !== user.id ? `Ajustar volume de áudio` : p.displayName)}
                                        >
                                          <div className="stream-strip-avatar">
                                            {p.avatarUrl ? (
                                              <img src={p.avatarUrl} alt={p.displayName} />
                                            ) : (
                                              <span>{(p.displayName || 'M').slice(0, 1).toUpperCase()}</span>
                                            )}
                                            {p.isMuted && (
                                              <span className="stream-strip-badge" title="Mutado">
                                                <MicOffIcon style={{ width: '8px', height: '8px' }} />
                                              </span>
                                            )}
                                          </div>
                                          <span className="stream-strip-name">{p.displayName}{p.userId === user.id ? ' (Você)' : ''}</span>
                                          {isSharer && (
                                            <span className="stream-strip-live-dot" title="Transmitindo tela" />
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="participants-grid">
                                {activeScreenSharers.length > 0 && !isWatchingStreams && (
                                  <div 
                                    className="streams-hidden-banner" 
                                    onClick={() => setIsWatchingStreams(true)}
                                    style={{
                                      gridColumn: '1 / -1',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '12px 18px',
                                      background: 'rgba(88, 101, 242, 0.12)',
                                      border: '1.5px solid rgba(88, 101, 242, 0.3)',
                                      borderRadius: '12px',
                                      cursor: 'pointer',
                                      color: 'var(--text-primary)',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      marginBottom: '12px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <ScreenIcon style={{ width: "18px", height: "18px", color: "var(--accent-color)" }} />
                                      <span>Há <strong>{activeScreenSharers.length} {activeScreenSharers.length === 1 ? 'transmissão ao vivo' : 'transmissões ao vivo'}</strong> acontecendo neste canal.</span>
                                    </div>
                                    <button 
                                      type="button" 
                                      className="streams-resume-watch-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setIsWatchingStreams(true)
                                      }}
                                      style={{
                                        background: 'var(--accent-color)',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><PlayIcon style={{ width: "12px", height: "12px" }} /> Assistir Transmissão</span>
                                    </button>
                                  </div>
                                )}

                                {(() => {
                                  const displayList = callMembersList

                                  if (displayList.length === 0) {
                                    return (
                                      <div className="voice-empty-state" style={{
                                        gridColumn: '1 / -1',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '60px 20px',
                                        color: 'var(--text-muted)',
                                        gap: '12px'
                                      }}>
                                        <div style={{
                                          width: '68px',
                                          height: '68px',
                                          borderRadius: '50%',
                                          background: 'rgba(255, 255, 255, 0.05)',
                                          border: '1.5px solid rgba(255, 255, 255, 0.1)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'var(--text-secondary, #b5bac1)',
                                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                                          marginBottom: '4px'
                                        }}>
                                          <MicIcon style={{ width: '34px', height: '34px' }} />
                                        </div>
                                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Ninguém está nesta chamada agora</div>
                                        <p style={{ fontSize: '13px', margin: 0, textAlign: 'center', maxWidth: '360px' }}>Conecte-se para conversar ou transmitir a tela para seus amigos.</p>
                                        {activeVoiceChannelId !== selectedChannel.id && (
                                          <button 
                                            type="button" 
                                            className="voice-join-submit-btn" 
                                            style={{
                                              marginTop: '8px',
                                              padding: '10px 24px',
                                              borderRadius: '20px',
                                              background: '#23a55a',
                                              color: '#fff',
                                              border: 'none',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              fontSize: '13px'
                                            }}
                                            onClick={() => handleJoinVoice(selectedChannel.id, selectedChannel.space_id)}
                                          >
                                            <VolumeIcon style={{ width: '16px', height: '16px' }} />
                                            <span>Entrar na chamada</span>
                                          </button>
                                        )}
                                      </div>
                                    )
                                  }

                                  return displayList.map(p => {
                                  const isSharer = !!(p.screenStream && p.screenStream.getVideoTracks().length > 0)
                                  return (
                                    <div 
                                      key={p.userId} 
                                      className={`participant-card ${p.isSpeaking ? 'speaking' : ''} ${isSharer ? 'has-live-screen' : ''}`}
                                      onClick={() => {
                                        if (isSharer) {
                                          setSelectedScreenSharerUserId(p.userId)
                                          setIsWatchingStreams(true)
                                          setScreenShareViewMode('focus')
                                        } else if (p.userId !== user.id) {
                                          setVolumeControlUser(p)
                                        }
                                      }}
                                      style={{ cursor: 'pointer', position: 'relative' }}
                                      title={isSharer ? `Clique para assistir a tela de ${p.displayName}` : (p.userId !== user.id ? "Ajustar volume de áudio" : "")}
                                    >
                                      {isSharer && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '10px',
                                          right: '10px',
                                          background: '#eb3b5a',
                                          color: '#fff',
                                          fontSize: '10px',
                                          fontWeight: 800,
                                          padding: '3px 8px',
                                          borderRadius: '20px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          boxShadow: '0 2px 8px rgba(235, 59, 90, 0.4)'
                                        }}>
                                          <span className="stream-tab-live-dot" /> AO VIVO
                                        </div>
                                      )}
                                      <div className="participant-avatar-large" style={{ position: 'relative' }}>
                                        {p.avatarUrl ? (
                                          <img src={p.avatarUrl} alt={p.displayName} className="round-avatar-img-large" />
                                        ) : (
                                          <span className="avatar-initial-large">
                                            {p.displayName.slice(0, 1).toUpperCase()}
                                          </span>
                                        )}
                                        {(() => {
                                          const deco = presenceData[p.userId]?.avatar_decoration || (p.userId === user.id ? avatarDecoration : null)
                                          return deco && deco !== 'none' ? <AvatarDecoration decorationId={deco} /> : null
                                        })()}
                                        {(p.isDeafened || p.isMuted) && (
                                          <div className="participant-avatar-badge" style={{
                                            position: 'absolute',
                                            bottom: '-4px',
                                            right: '-4px',
                                            background: '#e0554c',
                                            borderRadius: p.isDeafened && p.isMuted ? '12px' : '50%',
                                            width: p.isDeafened && p.isMuted ? 'auto' : '24px',
                                            padding: p.isDeafened && p.isMuted ? '2px 6px' : '0',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '3px',
                                            color: '#fff',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                            border: '2px solid var(--bg-primary)'
                                          }}>
                                            {p.isMuted && <MicOffIcon style={{ width: '13px', height: '13px' }} />}
                                            {p.isDeafened && <HeadphonesOffIcon style={{ width: '13px', height: '13px' }} />}
                                          </div>
                                        )}
                                      </div>
                                      <div className="participant-card-bottom-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                                        <span className="participant-name">
                                          {p.displayName}
                                          {p.userId === user.id && " (Você)"}
                                        </span>
                                        {isSharer && (
                                          <button
                                            type="button"
                                            className="watch-stream-badge-btn"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setSelectedScreenSharerUserId(p.userId)
                                              setIsWatchingStreams(true)
                                              setScreenShareViewMode('focus')
                                            }}
                                            style={{
                                              background: 'rgba(235, 59, 90, 0.18)',
                                              border: '1px solid #eb3b5a',
                                              color: '#eb3b5a',
                                              borderRadius: '12px',
                                              padding: '4px 10px',
                                              fontSize: '11px',
                                              fontWeight: 800,
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              marginTop: '4px'
                                            }}
                                          >
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><PlayIcon style={{ width: "11px", height: "11px" }} /> Assistir Tela</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })
                              })()}
                              </div>
                            )}
                          </>
                        )
                      })()}

                            {/* Push-to-Talk Indicator */}
                            {isPttMode && (
                              <div style={{ textAlign: 'center', padding: '6px 12px', background: isPttActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', margin: '0 16px 12px', border: isPttActive ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: 800, color: isPttActive ? '#10b981' : 'var(--text-secondary)' }}>
                                {isPttActive ? '🟢 Microfone Aberto (Transmitindo Voz)' : `🔊 PTT Ativo: Segure [${pttKey.replace('Key', '')}] para falar`}
                              </div>
                            )}

                            {/* Controls bottom bar */}
                            {activeVoiceChannelId === selectedChannel.id && isConnected ? (
                              <div className="voice-controls-bar">
                              <button 
                                className={`control-btn mic-btn ${isMuted ? 'muted' : ''}`} 
                                onClick={handleToggleMute}
                                title={isMuted ? "Desmutar microfone" : "Mutar microfone"}
                              >
                                {isMuted ? <MicOffIcon /> : <MicIcon />}
                              </button>

                              <button 
                                className={`control-btn deafen-btn ${isDeafened ? 'muted' : ''}`} 
                                onClick={handleToggleDeafen}
                                title={isDeafened ? "Desensurdecer" : "Ensurdecer (Silenciar chamada)"}
                              >
                                {isDeafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
                              </button>

                              {/* Quick AI Noise Suppression Toggle */}
                              <button 
                                type="button"
                                className={`control-btn ai-btn ${isAiDenoiseEnabled ? 'active' : ''}`} 
                                onClick={() => toggleAiDenoise()}
                                title={isAiDenoiseEnabled ? "Supressão de Ruído por IA: ATIVADA (Clique para desligar)" : "Supressão de Ruído por IA: DESATIVADA (Clique para ligar)"}
                                style={{
                                  background: isAiDenoiseEnabled ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(99, 102, 241, 0.25))' : undefined,
                                  borderColor: isAiDenoiseEnabled ? '#a855f7' : undefined,
                                  color: isAiDenoiseEnabled ? '#c084fc' : undefined,
                                  position: 'relative'
                                }}
                              >
                                <BrainIcon style={{ width: "16px", height: "16px" }} />
                                {isAiDenoiseEnabled && (
                                  <span style={{
                                    position: 'absolute',
                                    bottom: '5px',
                                    right: '6px',
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981',
                                    boxShadow: '0 0 4px #10b981'
                                  }} />
                                )}
                              </button>
                              
                              <div className="screen-control-wrapper" style={{ position: 'relative' }}>
                                <button 
                                  className={`control-btn screen-btn ${localScreenStream ? 'sharing' : ''}`} 
                                  onClick={() => {
                                    if (localScreenStream) {
                                      setShowScreenMenu(!showScreenMenu)
                                    } else {
                                      openScreenPicker()
                                    }
                                  }}
                                  title={localScreenStream ? "Opções de Transmissão" : "Transmitir Tela"}
                                >
                                  <ScreenIcon />
                                </button>
                                {showScreenMenu && localScreenStream && (
                                  <div className="screen-share-dropdown">
                                    <div className="dropdown-section">
                                      <button className="dropdown-action-btn danger" onClick={async () => { setShowScreenMenu(false); await handleStopScreenShare() }}>
                                        Parar Transmissão
                                      </button>
                                      <button className="dropdown-action-btn" onClick={forceOpenScreenPicker}>
                                        Mudar de Janela
                                      </button>
                                    </div>
                                    <div className="dropdown-divider" />
                                    <div className="dropdown-section">
                                      <span className="section-title">Resolução</span>
                                      {([720, 1080, 'native'] as const).map(q => {
                                        const label = q === 720 ? '720p' : q === 1080 ? '1080p' : 'native'
                                        const keyVal = q === 720 ? '720p' : q === 1080 ? '1080p' : 'native'
                                        return (
                                          <button 
                                            key={keyVal} 
                                            className={`dropdown-option ${screenQuality === keyVal ? 'selected' : ''}`}
                                            onClick={() => handleQualityChange(keyVal)}
                                          >
                                            {q === 'native' ? 'Nativa / Fonte' : label}
                                          </button>
                                        )
                                      })}
                                    </div>
                                    <div className="dropdown-divider" />
                                    <div className="dropdown-section">
                                      <span className="section-title">FPS</span>
                                      {([15, 30, 60] as const).map(fps => {
                                        const isCurrentStreamGameOrScreen = !activeSharingSource || 
                                          activeSharingSource.type === 'screen' || 
                                          activeSharingSource.id?.startsWith('screen:') || 
                                          activeSharingSource.isGame === true || 
                                          (activeSharingSource.name || '').toLowerCase().includes('(jogo)')
                                        const is60DisabledInCall = fps === 60 && !isCurrentStreamGameOrScreen
                                        return (
                                          <button 
                                            key={fps} 
                                            disabled={is60DisabledInCall}
                                            title={is60DisabledInCall ? '60 FPS disponível apenas em Jogos e Telas Inteiras' : undefined}
                                            className={`dropdown-option ${screenFps === fps ? 'selected' : ''} ${is60DisabledInCall ? 'disabled' : ''}`}
                                            style={is60DisabledInCall ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                                            onClick={() => {
                                              if (!is60DisabledInCall) {
                                                handleFpsChange(fps)
                                              }
                                            }}
                                          >
                                            {fps} FPS {is60DisabledInCall ? '(Jogos/Telas)' : ''}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>

                                {/* Soundboard Button */}
                                <button 
                                  className="control-btn" 
                                  onClick={() => setShowSoundboardModal(true)}
                                  title="Mesa de Efeitos Sonoros (Soundboard)"
                                >
                                  <SoundboardIcon />
                                </button>

                                {/* Call Recording Button */}
                                <button 
                                  className={`control-btn ${isRecordingCall ? 'recording' : ''}`} 
                                  onClick={isRecordingCall ? stopCallRecording : startCallRecording}
                                  title={isRecordingCall ? `Gravando chamada (${recordingDuration}s) - Clique para parar e baixar` : "Gravar Áudio da Chamada"}
                                  style={{ color: isRecordingCall ? '#ff4655' : 'inherit' }}
                                >
                                  <RecordCallIcon isRecording={isRecordingCall} />
                                </button>

                                <button 
                                  className="control-btn leave-btn" 
                                  onClick={handleLeaveVoice}
                                  title="Sair da chamada"
                                >
                                  <PhoneOffIcon />
                                </button>
                              </div>
                            ) : null}
                          </div>

                          {/* Chat pane (Right) */}
                          <div className="voice-chat-pane" style={!showVoiceChat ? { display: 'none' } : undefined}>
                            <div className="voice-chat-messages">
                              {messages.length === 0 && (
                                <div className="no-messages">
                                  <div style={{ opacity: 0.6, marginBottom: "6px" }}><MessageSquareIcon style={{ width: "28px", height: "28px" }} /></div>
                                  <p>Início do chat por texto da chamada.</p>
                                </div>
                              )}
                              {messages.map((message) => {
                                const isMentioned = message.author_id !== user.id && message.body.toLowerCase().includes(`@${profileDisplayName.toLowerCase()}`)
                                const canManageMsg = currentSpace && (canUserDo(currentSpace.id, user.id, 'manageMessages') || currentSpace.creator_id === user.id)
                                return (
                                  <article className={`msg-card ${message.author_id === user.id ? 'msg-own' : ''} ${message.attachment_type === 'audio' ? 'has-voice-note' : ''} ${isMentioned ? 'mention-highlight' : ''}`} key={message.id} style={{ position: 'relative' }}>
                                    <div className="message-hover-actions">
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
                                      {(message.author_id === user.id || canManageMsg) && (
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
                                    <div className={`msg-avatar ${message.author_id === user.id ? 'avatar-self' : 'avatar-other'}`} style={{ position: 'relative', overflow: 'visible' }}>
                                      <div style={{ width: '100%', height: '100%', borderRadius: 'inherit', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {message.profile?.avatar_url ? (
                                          <img src={message.profile.avatar_url} alt={message.profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          (message.profile?.display_name ?? 'E').slice(0, 1).toUpperCase()
                                        )}
                                      </div>
                                      {(() => {
                                        const deco = presenceData[message.author_id]?.avatar_decoration || (message.author_id === user.id ? avatarDecoration : null)
                                        return deco && deco !== 'none' ? <AvatarDecoration decorationId={deco} /> : null
                                      })()}
                                    </div>
                                    <div className="msg-body">
                                      <div className="msg-meta">
                                        <strong>{message.profile?.display_name ?? 'Membro'}</strong>
                                        <time>{new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                                      </div>
                                      {message.attachment_url && message.attachment_type === 'image' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          <img
                                            src={message.attachment_url}
                                            alt="anexo"
                                            className="msg-attachment-img"
                                            onClick={() => openLightbox(message.attachment_url!)}
                                            title="Clique para ampliar"
                                          />
                                          {message.body && message.body !== 'Imagem' && !message.body.startsWith('http') && (
                                            <p>{formatMessageText(message.body, profileDisplayName)}</p>
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
                                      ) : message.attachment_url && message.attachment_type !== 'image' ? (
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
                                          📎 {message.body}
                                        </a>
                                      ) : (
                                        <p>{formatMessageText(message.body, profileDisplayName)}</p>
                                      )}
                                    </div>
                                  </article>
                                )
                              })}
                              <div ref={messagesEndRef} />
                            </div>
                            {pendingVoicePastedFile && pendingVoiceImagePreview && (
                              <div className="composer-image-staging voice-chat-image-staging">
                                <div className="staging-thumb-wrap">
                                  <img src={pendingVoiceImagePreview} alt="Screenshot colado" />
                                </div>
                                <div className="staging-info">
                                  <div className="staging-title-row">
                                    <span className="staging-badge">Print / Clipboard</span>
                                    <span className="staging-name">{pendingVoicePastedFile.name}</span>
                                  </div>
                                  <span className="staging-subtext">
                                    {(pendingVoicePastedFile.size / 1024).toFixed(1)} KB • Enter para enviar
                                  </span>
                                </div>
                                <button 
                                  type="button" 
                                  className="staging-remove-btn" 
                                  onClick={removePendingVoiceImage}
                                  title="Descartar print (Esc)"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                            <form className="voice-chat-composer" onSubmit={handleVoiceComposerSubmit}>
                              <input type="file" id="voice-chat-file-input" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleChatFileUpload(f); e.target.value = '' }} />
                              <button type="button" className="dm-attach-btn" onClick={() => document.getElementById('voice-chat-file-input')?.click()} disabled={isUploading} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 8px 0 0' }}>
                                {isUploading ? <span style={{ fontSize: '12px' }}>...</span> : <PaperclipIcon style={{ width: '15px', height: '15px' }} />}
                              </button>
                              <input 
                                id="voice-chat-input"
                                value={draft} 
                                onChange={(e) => setDraft(e.target.value)} 
                                onPaste={handleVoicePaste}
                                placeholder="Conversar por texto com a call…" 
                              />
                              <button type="submit" className="send-btn" disabled={(!draft.trim() && !pendingVoicePastedFile) || isUploading}>
                                <SendIcon style={{ width: "14px", height: "14px" }} />
                              </button>
                            </form>
                          </div>
                        </div>
                    </div>
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
                </div>
  )
}
