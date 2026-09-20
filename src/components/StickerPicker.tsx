import React, { useState, useRef, useEffect } from 'react'
import {
  getCustomStickers,
  deleteCustomSticker,
  processImageToSticker,
  type CustomSticker
} from '../lib/stickerPacks'

interface StickerPickerProps {
  onSelectSticker: (url: string, name: string) => void
  onClose: () => void
  userId?: string
}

function StickerIconSvg({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="10" cy="14" r="1.5" />
      <path d="m18 17-3-3-4 4" />
    </svg>
  )
}

function PlusIconSvg({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function UploadIconSvg({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function ImageIconSvg({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  )
}

export function StickerPicker({ onSelectSticker, onClose, userId }: StickerPickerProps) {
  const [stickers, setStickers] = useState<CustomSticker[]>(() => getCustomStickers(userId))
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Atualiza a lista quando o userId mudar
  useEffect(() => {
    setStickers(getCustomStickers(userId))
  }, [userId])

  // Fecha ao clicar fora
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  // Criação a partir de arquivo de foto/imagem - apenas salva no catálogo sem disparar no chat
  const handleCreateStickerFromFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP, GIF).')
      return
    }

    setIsProcessing(true)
    try {
      const created = await processImageToSticker(file, userId)
      // Adiciona na coleção sem enviar no chat automaticamente
      setStickers(prev => [created, ...prev.filter(s => s.id !== created.id)])
    } catch (err) {
      console.error('Erro ao processar imagem para figurinha:', err)
      alert('Não foi possível processar a imagem selecionada.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleCreateStickerFromFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteSticker = (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation()
    const updated = deleteCustomSticker(stickerId, userId)
    setStickers(updated)
  }

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleCreateStickerFromFile(file)
    }
  }

  return (
    <div
      className={`sticker-picker-popup ${isDragOver ? 'drag-over' : ''}`}
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Input oculto para seleção de fotos */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Cabeçalho do Seletor */}
      <div className="sticker-picker-header">
        <div className="sticker-picker-header-title">
          <StickerIconSvg style={{ color: 'var(--accent-color, #00f2fe)' }} />
          <span className="sticker-header-text">Figurinhas</span>
          <span className="sticker-count-badge">
            {stickers.length} {stickers.length === 1 ? 'salva' : 'salvas'}
          </span>
        </div>
        <div className="sticker-picker-header-actions">
          <button
            type="button"
            className="sticker-create-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            title="Adicionar imagem como figurinha"
          >
            <PlusIconSvg style={{ width: 13, height: 13 }} />
            <span>Adicionar</span>
          </button>
          <button
            type="button"
            className="sticker-close-btn"
            onClick={onClose}
            title="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Loading Overlay durante processamento */}
      {isProcessing && (
        <div className="sticker-processing-overlay">
          <div className="sticker-loading-spinner" />
          <span>Salvando figurinha na sua coleção...</span>
        </div>
      )}

      {/* Drop Zone Indicator */}
      {isDragOver && (
        <div className="sticker-drag-indicator">
          <UploadIconSvg style={{ color: 'var(--accent-color, #00f2fe)' }} />
          <span>Solte a imagem para adicionar à sua coleção</span>
        </div>
      )}

      {/* Corpo / Grade de Figurinhas */}
      <div className="sticker-picker-content">
        {stickers.length === 0 ? (
          <div className="sticker-empty-state">
            <div className="sticker-empty-icon">
              <ImageIconSvg style={{ color: 'var(--accent-color, #00f2fe)', opacity: 0.85 }} />
            </div>
            <h4 className="sticker-empty-title">Nenhuma figurinha salva</h4>
            <p className="sticker-empty-desc">
              Importe qualquer foto, meme ou arte para sua coleção pessoal.
            </p>
            <button
              type="button"
              className="sticker-create-primary-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <PlusIconSvg style={{ width: 14, height: 14 }} />
              <span>Importar Imagem</span>
            </button>
          </div>
        ) : (
          <div className="sticker-grid">
            {/* Bloco de adicionar nova figurinha no início da grade */}
            <button
              type="button"
              className="sticker-create-tile"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              title="Adicionar nova imagem à coleção"
            >
              <div className="create-tile-icon-wrap">
                <PlusIconSvg style={{ width: 14, height: 14 }} />
              </div>
              <span className="create-tile-label">Adicionar</span>
            </button>

            {/* Lista de figurinhas personalizadas salvas */}
            {stickers.map(s => (
              <div
                key={s.id}
                className="sticker-item custom"
                title={`Enviar: ${s.name}`}
                onClick={() => {
                  onSelectSticker(s.url, s.name)
                  onClose()
                }}
              >
                <button
                  type="button"
                  className="sticker-delete-btn"
                  title="Excluir figurinha da sua biblioteca"
                  onClick={(e) => handleDeleteSticker(e, s.id)}
                >
                  ✕
                </button>
                <img
                  src={s.url}
                  alt={s.name}
                  loading="lazy"
                  draggable={false}
                />
                <span className="sticker-item-name">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé limpo com instrução elegante */}
      <div className="sticker-picker-footer">
        <span>Clique para enviar na conversa • Arraste imagens para adicionar</span>
      </div>
    </div>
  )
}
