import { useState, useEffect } from 'react'
import {
  MUSIC_BOT_AVATAR_PRESETS,
  resolveMusicBotAvatarUrl,
  type MusicBotAvatarOption
} from '../../lib/musicBotAvatars'
import { useMusicBotStore } from '../../stores/useMusicBotStore'
import { CloseXIcon } from '../icons'

interface MusicBotAvatarPickerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MusicBotAvatarPickerModal({ isOpen, onClose }: MusicBotAvatarPickerModalProps) {
  const currentAvatar = useMusicBotStore((s) => s.myAvatar)
  const setMyAvatar = useMusicBotStore((s) => s.setMyAvatar)

  const [selectedId, setSelectedId] = useState<string>(currentAvatar)
  const [customUrl, setCustomUrl] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelectedId(currentAvatar)
      if (
        currentAvatar.startsWith('http://') ||
        currentAvatar.startsWith('https://') ||
        currentAvatar.startsWith('data:')
      ) {
        setCustomUrl(currentAvatar)
      } else {
        setCustomUrl('')
      }
    }
  }, [isOpen, currentAvatar])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSelectPreset = (preset: MusicBotAvatarOption) => {
    setSelectedId(preset.id)
    setMyAvatar(preset.id)
  }

  const handleApplyCustomUrl = () => {
    const trimmed = customUrl.trim()
    if (!trimmed) return
    setSelectedId(trimmed)
    setMyAvatar(trimmed)
  }

  const currentPreviewUrl = resolveMusicBotAvatarUrl(selectedId)

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="music-bot-avatar-modal"
        style={{
          width: 'min(460px, 94vw)',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(6, 182, 212, 0.15)',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          animation: 'modalScaleSpring 0.24s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                padding: '2px',
                background: 'linear-gradient(135deg, #06b6d4, #f97316)',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              {selectedId === 'letter-e' ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: '#0d1322',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    color: '#fff',
                    fontSize: '18px'
                  }}
                >
                  E
                </div>
              ) : (
                <img
                  src={currentPreviewUrl}
                  alt="Prévia do Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Ícone do Bot de Música
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Preferência local salva no seu dispositivo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="control-btn"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Fechar"
          >
            <CloseXIcon style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Galeria de Presets */}
        <div>
          <span
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '10px'
            }}
          >
            Escolha uma das artes oficiais:
          </span>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px'
            }}
          >
            {MUSIC_BOT_AVATAR_PRESETS.map((preset) => {
              const isSelected = selectedId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 8px',
                    borderRadius: '14px',
                    backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-tertiary)',
                    border: isSelected
                      ? '2px solid #00f2fe'
                      : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? '0 0 16px rgba(0, 242, 254, 0.3)' : 'none',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: isSelected ? '2px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
                      flexShrink: 0
                    }}
                  >
                    {preset.id === 'letter-e' ? (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #06b6d4, #f97316)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 900,
                          fontSize: '22px'
                        }}
                      >
                        E
                      </div>
                    ) : (
                      <img
                        src={preset.url}
                        alt={preset.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isSelected ? '#00f2fe' : 'var(--text-primary)',
                      textAlign: 'center',
                      lineHeight: 1.2
                    }}
                  >
                    {preset.name}
                  </span>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 600,
                      color: 'var(--text-muted)'
                    }}
                  >
                    {preset.badge}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* URL Customizada */}
        <div
          style={{
            paddingTop: '12px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Ou cole o link de uma imagem (URL):
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PNG, JPG, GIF</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://exemplo.com/avatar.png"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={handleApplyCustomUrl}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(6, 182, 212, 0.2)',
                border: '1px solid #06b6d4',
                color: '#00f2fe',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Aplicar
            </button>
          </div>
        </div>

        {/* Rodapé / Concluir */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '12px',
              background: '#00f2fe',
              color: '#071320',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 242, 254, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  )
}
