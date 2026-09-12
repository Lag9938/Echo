import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useUIStore } from '../../stores/useUIStore'
import { SearchIcon, MicIcon } from '../icons'
import type { Space, Channel, FriendshipRequest, Page } from '../../types'

interface CommandPaletteItem {
  id: string
  title: string
  subtitle?: string
  badge?: string
  icon: React.ReactNode
  category: 'Canais' | 'Amigos' | 'Espaços' | 'Ações'
  action: () => void
}

interface CommandPaletteModalProps {
  spaces: Space[]
  channels: Channel[]
  friendships: FriendshipRequest[]
  isMuted: boolean
  isDeafened: boolean
  toggleMute: () => void
  toggleDeafen: () => void
  onSelectSpace: (spaceId: string) => void
  onSelectChannel: (channel: Channel) => void
  onSelectFriend: (friendId: string) => void
  setPage: (page: Page) => void
  setShowSpaceStudio?: (show: boolean) => void
  setShowSoundboard?: (show: boolean) => void
}

export function CommandPaletteModal({
  spaces,
  channels,
  friendships,
  isMuted,
  isDeafened,
  toggleMute,
  toggleDeafen,
  onSelectSpace,
  onSelectChannel,
  onSelectFriend,
  setPage,
  setShowSpaceStudio,
  setShowSoundboard
}: CommandPaletteModalProps) {
  const { showCommandPalette, setShowCommandPalette } = useUIStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowCommandPalette(!showCommandPalette)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCommandPalette, setShowCommandPalette])

  // Focus input when opened and reset state
  useEffect(() => {
    if (showCommandPalette) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showCommandPalette])

  const allItems = useMemo<CommandPaletteItem[]>(() => {
    const items: CommandPaletteItem[] = []

    // 1. Actions
    items.push({
      id: 'action-mute',
      title: isMuted ? 'Desmutar Microfone' : 'Mutar Microfone',
      subtitle: 'Alternar microfone globalmente',
      badge: 'F8',
      category: 'Ações',
      icon: <MicIcon style={{ color: isMuted ? '#ef4444' : '#10b981' }} />,
      action: () => toggleMute()
    })

    items.push({
      id: 'action-deafen',
      title: isDeafened ? 'Desensurdecer Áudio' : 'Ensurdecer Áudio',
      subtitle: 'Silenciar áudio do aplicativo',
      badge: 'F9',
      category: 'Ações',
      icon: (
        <span style={{ fontSize: '15px' }}>{isDeafened ? '🔇' : '🎧'}</span>
      ),
      action: () => toggleDeafen()
    })

    items.push({
      id: 'action-settings',
      title: 'Abrir Configurações',
      subtitle: 'Preferências de áudio, vídeo, tema e perfil',
      category: 'Ações',
      icon: <span style={{ fontSize: '15px' }}>⚙️</span>,
      action: () => setPage('Configurações')
    })

    items.push({
      id: 'action-friends',
      title: 'Abrir Painel de Amigos',
      subtitle: 'Ver solicitações e lista de amizades',
      category: 'Ações',
      icon: <span style={{ fontSize: '15px' }}>👥</span>,
      action: () => setPage('Amigos')
    })

    if (setShowSoundboard) {
      items.push({
        id: 'action-soundboard',
        title: 'Abrir Soundboard',
        subtitle: 'Tocar efeitos de áudio na chamada',
        category: 'Ações',
        icon: <span style={{ fontSize: '15px' }}>🎵</span>,
        action: () => setShowSoundboard(true)
      })
    }

    if (setShowSpaceStudio) {
      items.push({
        id: 'action-studio',
        title: 'Abrir Estúdio do Espaço',
        subtitle: 'Personalizar canais, banners e cargos',
        category: 'Ações',
        icon: <span style={{ fontSize: '15px' }}>🎨</span>,
        action: () => setShowSpaceStudio(true)
      })
    }

    // 2. Channels
    channels.forEach(ch => {
      items.push({
        id: `channel-${ch.id}`,
        title: `${ch.type === 'voice' ? '🔊' : '#'} ${ch.name}`,
        subtitle: `Canal de ${ch.type === 'voice' ? 'Voz' : 'Texto'}${ch.category ? ` • ${ch.category}` : ''}`,
        category: 'Canais',
        icon: (
          <span style={{ fontSize: '15px', color: ch.type === 'voice' ? '#38bdf8' : '#a78bfa' }}>
            {ch.type === 'voice' ? '🎙️' : '#'}
          </span>
        ),
        action: () => onSelectChannel(ch)
      })
    })

    // 3. Friends
    friendships.forEach(fr => {
      const name = fr.user.display_name || 'Amigo'
      items.push({
        id: `friend-${fr.user.id}`,
        title: `@${name}`,
        subtitle: 'Conversa direta (DM)',
        category: 'Amigos',
        icon: fr.user.avatar_url ? (
          <img
            src={fr.user.avatar_url}
            alt={name}
            style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '15px' }}>👤</span>
        ),
        action: () => onSelectFriend(fr.user.id)
      })
    })

    // 4. Spaces
    spaces.forEach(sp => {
      items.push({
        id: `space-${sp.id}`,
        title: sp.name,
        subtitle: sp.description || 'Espaço Echo',
        category: 'Espaços',
        icon: sp.icon_url ? (
          <img
            src={sp.icon_url}
            alt={sp.name}
            style={{ width: 20, height: 20, borderRadius: '6px', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '15px' }}>🪐</span>
        ),
        action: () => onSelectSpace(sp.id)
      })
    })

    return items
  }, [
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    setPage,
    setShowSoundboard,
    setShowSpaceStudio,
    channels,
    onSelectChannel,
    friendships,
    onSelectFriend,
    spaces,
    onSelectSpace
  ])

  // Filter items
  const filteredItems = useMemo(() => {
    let q = query.trim().toLowerCase()
    let categoryFilter: string | null = null

    if (q.startsWith('#')) {
      categoryFilter = 'Canais'
      q = q.slice(1).trim()
    } else if (q.startsWith('@')) {
      categoryFilter = 'Amigos'
      q = q.slice(1).trim()
    } else if (q.startsWith('>')) {
      categoryFilter = 'Ações'
      q = q.slice(1).trim()
    }

    return allItems.filter(item => {
      if (categoryFilter && item.category !== categoryFilter) return false
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      )
    })
  }, [allItems, query])

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Ensure active item is visible in viewport
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]') as HTMLElement
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (filteredItems.length ? (prev + 1) % filteredItems.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredItems[selectedIndex]
      if (item) {
        setShowCommandPalette(false)
        item.action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowCommandPalette(false)
    }
  }

  if (!showCommandPalette) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(5, 7, 13, 0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={() => setShowCommandPalette(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'linear-gradient(180deg, rgba(22, 26, 38, 0.95) 0%, rgba(15, 18, 28, 0.98) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <SearchIcon style={{ color: '#94a3b8', width: 20, height: 20, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite um comando, #canal, @amigo ou busque..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '15px',
              fontWeight: 500
            }}
          />
          <kbd
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontFamily: 'monospace'
            }}
          >
            ESC
          </kbd>
        </div>

        {/* List items */}
        <div
          ref={listRef}
          style={{
            maxHeight: '380px',
            overflowY: 'auto',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '14px'
              }}
            >
              Nenhum resultado encontrado para &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  data-active={isSelected ? 'true' : 'false'}
                  onClick={() => {
                    setShowCommandPalette(false)
                    item.action()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    backgroundColor: isSelected
                      ? 'rgba(56, 189, 248, 0.12)'
                      : 'transparent',
                    border: isSelected
                      ? '1px solid rgba(56, 189, 248, 0.3)'
                      : '1px solid transparent',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: isSelected ? '#ffffff' : '#e2e8f0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#94a3b8',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {item.badge && (
                      <kbd
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          fontFamily: 'monospace'
                        }}
                      >
                        {item.badge}
                      </kbd>
                    )}
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#64748b'
          }}
        >
          <div style={{ display: 'flex', gap: '14px' }}>
            <span><kbd style={{ fontFamily: 'monospace', color: '#94a3b8' }}>↑↓</kbd> navegar</span>
            <span><kbd style={{ fontFamily: 'monospace', color: '#94a3b8' }}>↵</kbd> selecionar</span>
            <span><kbd style={{ fontFamily: 'monospace', color: '#94a3b8' }}>esc</kbd> fechar</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span><kbd style={{ fontFamily: 'monospace', color: '#38bdf8' }}>#</kbd> canais</span>
            <span><kbd style={{ fontFamily: 'monospace', color: '#a78bfa' }}>@</kbd> amigos</span>
            <span><kbd style={{ fontFamily: 'monospace', color: '#34d399' }}>&gt;</kbd> ações</span>
          </div>
        </div>
      </div>
    </div>
  )
}
