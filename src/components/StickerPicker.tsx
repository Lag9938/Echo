import { useState, useRef, useEffect } from 'react'
import { STICKER_PACKS } from '../lib/stickerPacks'
import type { StickerPack } from '../lib/stickerPacks'

interface StickerPickerProps {
  onSelectSticker: (url: string, name: string) => void
  onClose: () => void
}

export function StickerPicker({ onSelectSticker, onClose }: StickerPickerProps) {
  const [activePack, setActivePack] = useState<string>(STICKER_PACKS[0].id)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  const currentPack: StickerPack = STICKER_PACKS.find(p => p.id === activePack) ?? STICKER_PACKS[0]

  return (
    <div className="sticker-picker-popup" ref={containerRef}>
      {/* Pack tabs */}
      <div className="sticker-pack-tabs">
        {STICKER_PACKS.map(pack => (
          <button
            key={pack.id}
            type="button"
            className={`sticker-pack-tab${activePack === pack.id ? ' active' : ''}`}
            onClick={() => setActivePack(pack.id)}
            title={pack.name}
          >
            <span className="sticker-tab-icon">{pack.icon}</span>
            <span className="sticker-tab-name">{pack.name}</span>
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="sticker-grid">
        {currentPack.stickers.map(sticker => (
          <button
            key={sticker.id}
            type="button"
            className="sticker-item"
            title={sticker.name}
            onClick={() => {
              onSelectSticker(sticker.url, sticker.name)
              onClose()
            }}
          >
            <img
              src={sticker.url}
              alt={sticker.name}
              loading="lazy"
              draggable={false}
            />
            <span className="sticker-item-name">{sticker.name}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="sticker-picker-footer">
        <span>Stickers Echo</span>
      </div>
    </div>
  )
}
