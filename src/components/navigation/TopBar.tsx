import React, { useState, useRef } from 'react'
import type { Space, Channel, Page, SavedMessageItem } from '../../types'
import { Brand } from './Brand'
import { WindowControls } from './WindowControls'
import {
  getServerGradient,
  getServerInitials
} from '../../lib/formatters'
import {
  HashtagIcon,
  PlusIcon,
  VolumeIcon
} from '../icons'

export interface TopBarProps {
  isTopbarVisible: boolean
  showTopbar: () => void
  hideTopbar: (delay?: number) => void
  page: Page
  setPage: (page: Page) => void
  pendingFriendCount: number
  unreadDMs: Record<string, number>
  spaces: Space[]
  expandedSpace: string | null
  setExpandedSpace: (id: string | null) => void
  spaceChannels: Record<string, Channel[]>
  loadChannelsForSpace: (spaceId: string) => void
  selectedChannel: Channel | null
  setSelectedChannel: (ch: Channel | null) => void
  unreadChannels: Set<string>
  spaceVoiceUsers: Record<string, any[]>
  activeVoiceChannelId: string | null
  participants: any[]
  setAddSpaceModalTab: (tab: 'options' | 'create' | 'join') => void
  setShowAddSpaceModal: (val: boolean) => void
  savedMessages: SavedMessageItem[]
  setShowSavedMessagesModal: (val: boolean) => void
  topbarPinned: boolean
  setTopbarPinned: React.Dispatch<React.SetStateAction<boolean>>
  currentUserId: string
}

export function TopBar({
  isTopbarVisible,
  showTopbar,
  hideTopbar,
  page,
  setPage,
  pendingFriendCount,
  unreadDMs,
  spaces,
  expandedSpace,
  setExpandedSpace,
  spaceChannels,
  loadChannelsForSpace,
  selectedChannel,
  setSelectedChannel,
  unreadChannels,
  spaceVoiceUsers,
  activeVoiceChannelId,
  participants,
  setAddSpaceModalTab,
  setShowAddSpaceModal,
  savedMessages,
  setShowSavedMessagesModal,
  topbarPinned,
  setTopbarPinned,
  currentUserId
}: TopBarProps) {
  const serversTrackRef = useRef<HTMLDivElement>(null)

  const handleServersWheel = (e: React.WheelEvent) => {
    if (serversTrackRef.current) {
      serversTrackRef.current.scrollLeft += e.deltaY || e.deltaX
    }
  }

  const [hoveredSpaceCard, setHoveredSpaceCard] = useState<{ space: any; rect: DOMRect } | null>(null)
  const [addBtnRect, setAddBtnRect] = useState<DOMRect | null>(null)
  const spaceCardHideTimeoutRef = useRef<any>(null)

  const showSpaceCard = (space: any, targetEl: HTMLElement) => {
    if (spaceCardHideTimeoutRef.current) {
      clearTimeout(spaceCardHideTimeoutRef.current)
      spaceCardHideTimeoutRef.current = null
    }
    const rect = targetEl.getBoundingClientRect()
    setHoveredSpaceCard({ space, rect })
  }

  const hideSpaceCard = (delay = 200) => {
    if (spaceCardHideTimeoutRef.current) clearTimeout(spaceCardHideTimeoutRef.current)
    spaceCardHideTimeoutRef.current = setTimeout(() => {
      setHoveredSpaceCard(null)
    }, delay)
  }

  return (
    <header 
      className={`topbar ${isTopbarVisible ? 'visible' : 'auto-hidden'}`}
      onMouseEnter={showTopbar}
      onMouseLeave={() => hideTopbar(800)}
    >
      {/* ZONA ESQUERDA: Brand + Amigos / DMs */}
      <div className="topbar-left-zone">
        <Brand />
        
        {/* Amigos / DMs: Icon-Only com Balões de Conversa Fluidos (Opção B) */}
        <button 
          type="button" 
          className={`topbar-icon-btn topbar-amigos-btn ${page === 'Amigos' ? 'active' : ''}`}
          onClick={() => setPage('Amigos')}
          data-tooltip="Amigos"
          aria-label="Amigos e Mensagens Diretas"
        >
          <svg 
            className="topbar-icon-svg icon-amigos-bubbles" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path className="bubble-back" d="M14 9a2 2 0 0 1-2 2H6l-3 3V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2z" />
            <path className="bubble-front" d="M18 9h2a2 2 0 0 1 2 2v8l-3-3h-5a2 2 0 0 1-2-2v-1" />
          </svg>
          {(pendingFriendCount + Object.values(unreadDMs).reduce((a, b) => a + b, 0)) > 0 && (
            <span className="topbar-icon-badge badge-red">
              {pendingFriendCount + Object.values(unreadDMs).reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>
      </div>

      {/* ZONA CENTRAL: Trilha Horizontal de Servidores Ancorada no Centro Absoluto */}
      <div className="topbar-center-dock topbar-center-zone">
        <div 
          className="topbar-servers-track"
          ref={serversTrackRef}
          onWheel={handleServersWheel}
        >
          {spaces.map(space => {
            const isSelected = (page === 'Servidores') && ((expandedSpace === space.id) || (!expandedSpace && spaces[0]?.id === space.id))
            const spaceChs = spaceChannels[space.id] || []
            const unreadInSpace = spaceChs.filter(c => unreadChannels.has(c.id)).length
            const hasActiveVoice = spaceChs.some(c => c.type === 'voice' && ((spaceVoiceUsers[c.id] && spaceVoiceUsers[c.id].length > 0) || (activeVoiceChannelId === c.id && participants.length > 0)))

            return (
              <div 
                key={space.id} 
                className="topbar-server-item-wrap"
                onMouseEnter={(e) => showSpaceCard(space, e.currentTarget)}
                onMouseLeave={() => hideSpaceCard(200)}
              >
                <button
                  type="button"
                  className={`topbar-server-btn ${isSelected ? 'selected' : ''}`}
                  onClick={async () => {
                    setPage('Servidores')
                    setExpandedSpace(space.id)
                    const chs = spaceChannels[space.id] || []
                    const firstCh = chs.find(c => c.type === 'text') || chs[0]
                    if (firstCh) {
                      setSelectedChannel(firstCh)
                    } else if (selectedChannel && selectedChannel.space_id !== space.id) {
                      // Se os canais ainda não estão no estado local, não deixe o canal anterior ativo
                      setSelectedChannel(null)
                    }
                    await loadChannelsForSpace(space.id)
                    setHoveredSpaceCard(null)
                  }}
                  style={{ background: space.icon_url ? 'transparent' : getServerGradient(space.name) }}
                  title={space.name}
                >
                  {space.icon_url ? (
                    <img src={space.icon_url} alt={space.name} className="topbar-server-img" />
                  ) : (
                    <span className="topbar-server-initials">{getServerInitials(space.name)}</span>
                  )}

                  {/* Badge de Nao Lidas */}
                  {unreadInSpace > 0 && (
                    <span className="topbar-server-badge">{unreadInSpace}</span>
                  )}

                  {/* Onda Sonora se houver alguem em voz */}
                  {hasActiveVoice && (
                    <div className="topbar-voice-wave-badge" title="Canal de voz ativo">
                      <span className="echo-wave-bar" style={{ height: '6px' }} />
                      <span className="echo-wave-bar" style={{ height: '10px' }} />
                      <span className="echo-wave-bar" style={{ height: '5px' }} />
                    </div>
                  )}
                </button>

                {/* Indicador inferior elegante */}
                <div className={`topbar-server-indicator ${isSelected ? 'active' : ''} ${unreadInSpace > 0 ? 'unread' : ''}`} />
              </div>
            )
          })}

          {/* Botao de Criar / Explorar Espaco */}
          <button
            type="button"
            className="topbar-server-add-btn"
            onClick={() => {
              setAddSpaceModalTab('options')
              setShowAddSpaceModal(true)
              setHoveredSpaceCard(null)
              setAddBtnRect(null)
            }}
            onMouseEnter={(e) => {
              showTopbar()
              setAddBtnRect(e.currentTarget.getBoundingClientRect())
            }}
            onMouseLeave={() => setAddBtnRect(null)}
            aria-label="Criar ou Entrar em um Espaço"
          >
            <PlusIcon style={{ width: '15px', height: '15px' }} />
          </button>
        </div>
      </div>

      {/* Server Mini Card Flutuante (Renderizado fora com portal fixo para nunca ser cortado pelo overflow) */}
      {hoveredSpaceCard && (() => {
        const space = hoveredSpaceCard.space
        const rect = hoveredSpaceCard.rect
        const spaceChs = spaceChannels[space.id] || []
        const hasActiveVoice = spaceChs.some(c => c.type === 'voice' && ((spaceVoiceUsers[c.id] && spaceVoiceUsers[c.id].length > 0) || (activeVoiceChannelId === c.id && participants.length > 0)))
        const isSelected = (page === 'Servidores') && ((expandedSpace === space.id) || (!expandedSpace && spaces[0]?.id === space.id))

        // Calcula centro do item mantendo card dentro da janela
        const centerX = rect.left + (rect.width / 2)
        const clampedX = Math.max(135, Math.min(window.innerWidth - 135, centerX))

        return (
          <div 
            className="topbar-server-card floating"
            style={{
              top: `${rect.bottom + 8}px`,
              left: `${clampedX}px`,
              transform: 'translateX(-50%)',
              zIndex: 99999,
              cursor: 'pointer'
            }}
            onClick={async () => {
              setPage('Servidores')
              setExpandedSpace(space.id)
              const chs = spaceChannels[space.id] || []
              const firstCh = chs.find(c => c.type === 'text') || chs[0]
              if (firstCh) {
                setSelectedChannel(firstCh)
              } else if (selectedChannel && selectedChannel.space_id !== space.id) {
                setSelectedChannel(null)
              }
              await loadChannelsForSpace(space.id)
              setHoveredSpaceCard(null)
            }}
            onMouseEnter={() => {
              showTopbar()
              if (spaceCardHideTimeoutRef.current) {
                clearTimeout(spaceCardHideTimeoutRef.current)
                spaceCardHideTimeoutRef.current = null
              }
            }}
            onMouseLeave={() => {
              hideSpaceCard(100)
              hideTopbar(800)
            }}
          >
            <div 
              className="topbar-server-card-banner"
              style={{
                background: space.banner_url ? `url(${space.banner_url}) center/cover` : getServerGradient(space.name)
              }}
            />
            <div className="topbar-server-card-content">
              <div className="topbar-server-card-top">
                <div 
                  className="topbar-server-card-avatar"
                  style={{
                    background: space.icon_url ? '#10131a' : getServerGradient(space.name)
                  }}
                >
                  {space.icon_url ? (
                    <img src={space.icon_url} alt={space.name} />
                  ) : (
                    getServerInitials(space.name)
                  )}
                </div>
                <div className="topbar-server-card-titles">
                  <div className="topbar-server-card-name-row">
                    <h4 className="topbar-server-card-name" title={space.name}>{space.name}</h4>
                    {space.creator_id === currentUserId && (
                      <span className="topbar-server-card-crown" title="Você é o Criador do Espaço">👑</span>
                    )}
                  </div>
                  <span className="topbar-server-card-category">Espaço Echo</span>
                </div>
              </div>

              {space.description && (
                <p className="topbar-server-card-desc">{space.description}</p>
              )}

              <div className="topbar-server-card-stats">
                <span className="topbar-server-card-chip" title={`${spaceChs.filter(c => c.type === 'text').length} canais de texto`}>
                  <HashtagIcon style={{ width: '12px', height: '12px' }} />
                  <span>{spaceChs.filter(c => c.type === 'text').length} texto</span>
                </span>
                <span className="topbar-server-card-chip" title={`${spaceChs.filter(c => c.type === 'voice').length} canais de voz`}>
                  <VolumeIcon style={{ width: '12px', height: '12px' }} />
                  <span>{spaceChs.filter(c => c.type === 'voice').length} voz</span>
                </span>
                {hasActiveVoice && (
                  <span className="topbar-server-card-chip voice-active" title="Membros conversando em chamada de voz">
                    <span className="topbar-card-live-dot" />
                    <span>Voz Ativa</span>
                  </span>
                )}
              </div>

              <div className="topbar-server-card-footer">
                <span className="topbar-server-card-hint">
                  {isSelected ? '● Espaço selecionado' : 'Clique para acessar'}
                </span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Tooltip Flutuante para Adicionar Espaço (Portal fixo para não ser cortado pelo overflow-x do dock) */}
      {addBtnRect && (
        <div 
          className="topbar-floating-tooltip"
          style={{
            position: 'fixed',
            top: `${addBtnRect.bottom + 8}px`,
            left: `${addBtnRect.left + (addBtnRect.width / 2)}px`,
            transform: 'translateX(-50%)',
            zIndex: 99999,
            pointerEvents: 'none'
          }}
        >
          Criar ou Entrar em um Espaço
        </div>
      )}

      {/* ZONA DIREITA: Ações Icon-Only Elegantes, Divisor e Controles de Janela */}
      <div className="topbar-right-zone">
        <div className="topbar-actions-group">
          <button
            type="button"
            className={`topbar-icon-btn ${page === 'Descobrir' ? 'active' : ''}`}
            onClick={() => setPage('Descobrir')}
            title="Descobrir Comunidades"
            data-tooltip="Descobrir"
            aria-label="Descobrir"
          >
            <svg className="topbar-icon-svg icon-compass" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon className="compass-needle" points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.35" strokeWidth="1.5" />
            </svg>
          </button>

          <button
            type="button"
            className={`topbar-icon-btn ${page === 'Loja' ? 'active' : ''}`}
            onClick={() => setPage('Loja')}
            title="Loja do Echo (Cosméticos & Efeitos)"
            data-tooltip="Loja"
            aria-label="Loja"
          >
            <svg className="topbar-icon-svg icon-store" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path className="store-handle" d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </button>

          <button
            type="button"
            className={`topbar-icon-btn topbar-saved-btn ${savedMessages.length > 0 ? 'has-saved' : ''}`}
            onClick={() => setShowSavedMessagesModal(true)}
            title="Mensagens Salvas com Estrela"
            data-tooltip="Salvos"
            aria-label="Mensagens Salvas"
          >
            <svg className="topbar-icon-svg icon-star" width="18" height="18" viewBox="0 0 24 24" fill={savedMessages.length > 0 ? '#ffc107' : 'none'} stroke={savedMessages.length > 0 ? '#ffc107' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {savedMessages.length > 0 && (
              <span className="topbar-icon-badge">{savedMessages.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`topbar-icon-btn ${page === 'Configurações' ? 'active' : ''}`}
            onClick={() => setPage('Configurações')}
            title="Configurações do Usuário"
            data-tooltip="Ajustes"
            aria-label="Configurações"
          >
            <svg className="topbar-icon-svg icon-gear" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {/* Botão de Fixar / Desafixar Barra Superior */}
          <button
            type="button"
            className={`topbar-icon-btn topbar-pin-btn ${topbarPinned ? 'pinned' : ''}`}
            onClick={() => {
              setTopbarPinned(prev => {
                const next = !prev
                localStorage.setItem('echo-topbar-pinned', String(next))
                return next
              })
            }}
            title={topbarPinned ? "Barra superior fixada (clique para ocultar automaticamente)" : "Fixar barra superior aberta"}
            data-tooltip={topbarPinned ? "Desafixar" : "Fixar Topbar"}
            aria-label="Fixar Topbar"
          >
            <svg className="topbar-icon-svg icon-pin" width="16" height="16" viewBox="0 0 24 24" fill={topbarPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
            </svg>
          </button>
        </div>

        {/* Divisor Vertical */}
        <div className="topbar-v-divider" />

        {/* Controles de Janela Dinâmicos (Minimizar, Maximizar, Fechar) */}
        <WindowControls />
      </div>
    </header>
  )
}
