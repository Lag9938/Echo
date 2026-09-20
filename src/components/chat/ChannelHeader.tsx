import React, { memo } from 'react'
import type { Space, Channel } from '../../types'
import {
  ClockIcon,
  HashtagIcon,
  MegaphoneIcon,
  PinIcon,
  SearchIcon,
  UsersIcon
} from '../icons'

export interface ChannelHeaderProps {
  currentSpace: Space | null
  selectedChannel: Channel
  showSearchInput: boolean
  setShowSearchInput: React.Dispatch<React.SetStateAction<boolean>>
  searchQuery: string
  setSearchQuery: (q: string) => void
  showPinnedMessagesPanel: boolean
  setShowPinnedMessagesPanel: React.Dispatch<React.SetStateAction<boolean>>
  pinnedCount: number
  activeScreenSharers?: any[]
  isWatchingStreams?: boolean
  setIsWatchingStreams?: (val: boolean) => void
  showMembersList: boolean
  setShowMembersList: React.Dispatch<React.SetStateAction<boolean>>
}

export const ChannelHeader = memo(function ChannelHeader({
  currentSpace,
  selectedChannel,
  showSearchInput,
  setShowSearchInput,
  searchQuery,
  setSearchQuery,
  showPinnedMessagesPanel,
  setShowPinnedMessagesPanel,
  pinnedCount,
  activeScreenSharers = [],
  isWatchingStreams = false,
  setIsWatchingStreams = () => {},
  showMembersList,
  setShowMembersList
}: ChannelHeaderProps) {
  return (
    <header className="content-header">
      <div className="header-info">
        {currentSpace && <span className="header-space">{currentSpace.name}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1>
            <span className="header-icon">
              {selectedChannel.is_announcement ? <MegaphoneIcon style={{ color: 'var(--accent-color)' }} /> : <HashtagIcon />}
            </span> 
            {selectedChannel.name}
          </h1>
          {selectedChannel.topic && (
            <>
              <span style={{ color: 'var(--border-color)', margin: '0 4px' }}>|</span>
              <span className="channel-topic-header-text" title={selectedChannel.topic}>
                {selectedChannel.topic}
              </span>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {selectedChannel.slowmode_seconds && selectedChannel.slowmode_seconds > 0 ? (
          <span className="channel-slowmode-badge" title={`Modo lento: ${selectedChannel.slowmode_seconds}s por mensagem`}>
            <ClockIcon style={{ width: '12px', height: '12px' }} />
            <span>{selectedChannel.slowmode_seconds}s</span>
          </span>
        ) : null}

        {/* Search messages in channel */}
        <div className="channel-search-box-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {showSearchInput ? (
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2px 8px' }}>
              <SearchIcon style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar mensagens ou de:@autor..."
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
              onClick={() => setShowSearchInput(true)} 
              title="Buscar no canal"
            >
              <SearchIcon style={{ width: '15px', height: '15px' }} />
            </button>
          )}
        </div>

        {/* Pinned Messages Button */}
        <button 
          type="button" 
          className={`channel-header-action-btn ${showPinnedMessagesPanel || pinnedCount > 0 ? 'active' : ''}`}
          onClick={() => setShowPinnedMessagesPanel(!showPinnedMessagesPanel)}
          title="Mensagens Fixadas"
        >
          <PinIcon style={{ width: '15px', height: '15px' }} />
          {pinnedCount > 0 && (
            <span className="channel-header-badge">
              {pinnedCount}
            </span>
          )}
        </button>

        {activeScreenSharers.length > 0 && (
          <button 
            type="button"
            onClick={() => setIsWatchingStreams(!isWatchingStreams)}
            className="live-badge" 
            style={{ cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Transmissão de tela em andamento (clique para alternar visualização)"
          >
            ● {isWatchingStreams ? 'Fechar Vídeo' : 'Assistir Transmissão'}
          </button>
        )}

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
  )
})
