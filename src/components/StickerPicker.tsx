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

  // Criação a partir de arquivo de foto/imagem
  const handleCreateStickerFromFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP, GIF).')
      return
    }

    setIsProcessing(true)
    try {
      const created = await processImageToSticker(file, userId)
      setStickers(prev => [created, ...prev.filter(s => s.id !== created.id)])
      // Envia imediatamente para a conversa ativa e fecha, igualzinho no WhatsApp
      onSelectSticker(created.url, created.name)
      onClose()
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
          <span className="sticker-header-icon">🎨</span>
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
            title="Criar figurinha a partir de uma foto ou meme (igual no WhatsApp)"
          >
            <span className="plus-symbol">+</span>
            <span>Criar Figurinha</span>
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
          <span>Transformando foto em figurinha...</span>
        </div>
      )}

      {/* Drop Zone Indicator */}
      {isDragOver && (
        <div className="sticker-drag-indicator">
          <span style={{ fontSize: '32px' }}>📥</span>
          <span>Solte a imagem aqui para criar o sticker!</span>
        </div>
      )}

      {/* Corpo / Grade de Figurinhas */}
      <div className="sticker-picker-content">
        {stickers.length === 0 ? (
          <div className="sticker-empty-state">
            <div className="sticker-empty-icon">📸</div>
            <h4 className="sticker-empty-title">Crie suas Figurinhas!</h4>
            <p className="sticker-empty-desc">
              Envie qualquer foto, meme ou GIF do seu computador para transformar em figurinha, igualzinho no WhatsApp.
            </p>
            <button
              type="button"
              className="sticker-create-primary-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <span style={{ fontSize: '15px' }}>+</span>
              <span>Criar Primeira Figurinha (Enviar Foto)</span>
            </button>
          </div>
        ) : (
          <div className="sticker-grid">
            {/* Bloco de adicionar nova figurinha no início da grade (como no WhatsApp) */}
            <button
              type="button"
              className="sticker-create-tile"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              title="Adicionar nova foto como figurinha"
            >
              <div className="create-tile-icon-wrap">
                <span className="create-tile-plus">+</span>
              </div>
              <span className="create-tile-label">Criar Nova</span>
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

      {/* Rodapé com instrução */}
      <div className="sticker-picker-footer">
        <span>💡 Arraste fotos para cá ou clique em "+ Criar" para novas figurinhas.</span>
      </div>
    </div>
  )
}
