import React, { useState, useEffect, useRef } from 'react'

export interface PhotoAdjustModalProps {
  isOpen: boolean
  file: File | null
  type: 'avatar' | 'banner'
  onClose: () => void
  onConfirm: (processedFile: File) => void
}

export function PhotoAdjustModal({
  isOpen,
  file,
  type,
  onClose,
  onConfirm
}: PhotoAdjustModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement>(null)

  const isAvatar = type === 'avatar'
  const workspaceWidth = 420
  const workspaceHeight = 280
  const cropRadius = 100 // 200px de diâmetro
  const bannerCropWidth = 340
  const bannerCropHeight = 120

  useEffect(() => {
    if (!file) {
      setImageSrc(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setZoom(1.1)
    setOffsetX(0)
    setOffsetY(0)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  if (!isOpen || !file || !imageSrc) return null

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - offsetX, y: e.clientY - offsetY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setOffsetX(e.clientX - dragStartRef.current.x)
    setOffsetY(e.clientY - dragStartRef.current.y)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const isGif = Boolean(file?.type === 'image/gif' || file?.name?.toLowerCase().endsWith('.gif'))

  const handleSave = () => {
    if (!imgRef.current || !file) return

    // Se for GIF animado, não passa por canvas (pois o canvas do browser achataria o GIF em 1 único frame estático JPEG)
    // Preserva o arquivo original integralmente com todas as camadas e frames de animação
    if (isGif) {
      onConfirm(file)
      return
    }

    const targetWidth = isAvatar ? 512 : 1200
    const targetHeight = isAvatar ? 512 : 400

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imgRef.current
    const cropBoxWidth = isAvatar ? cropRadius * 2 : bannerCropWidth
    const cropBoxHeight = isAvatar ? cropRadius * 2 : bannerCropHeight
    const scaleFactor = targetWidth / cropBoxWidth

    ctx.fillStyle = '#12151c'
    ctx.fillRect(0, 0, targetWidth, targetHeight)

    ctx.save()
    ctx.translate(targetWidth / 2 + offsetX * scaleFactor, targetHeight / 2 + offsetY * scaleFactor)
    ctx.scale(zoom, zoom)

    // Calcula dimensões de proporção para renderização centralizada
    const aspect = img.naturalWidth / img.naturalHeight
    let renderW = cropBoxWidth * scaleFactor
    let renderH = cropBoxHeight * scaleFactor

    if (aspect > 1) {
      renderW = renderH * aspect
    } else {
      renderH = renderW / aspect
    }

    ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH)
    ctx.restore()

    canvas.toBlob((blob) => {
      if (blob) {
        const processedFile = new File([blob], file.name, { type: 'image/jpeg' })
        onConfirm(processedFile)
      }
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="screen-picker-overlay confirm-modal-overlay" onClick={onClose}>
      <div 
        className="screen-picker-modal confirm-modal" 
        style={{ maxWidth: '500px', padding: '22px' }} 
        onClick={(e) => e.stopPropagation()}
        onMouseUp={handleMouseUp}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                <path d="M18 22V8a2 2 0 0 0-2-2H2" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16.5px', color: 'var(--text-primary)', fontWeight: 700 }}>
                {isAvatar ? 'Ajustar Foto de Perfil (Avatar)' : 'Ajustar Capa do Perfil (Banner)'}
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Arraste com o mouse para posicionar e use o slider ou scroll para dar zoom.
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="picker-close-btn" 
            style={{ margin: 0, padding: '4px 8px' }} 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {isGif && (
          <div style={{
            background: 'rgba(0, 242, 254, 0.08)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            borderRadius: '8px',
            padding: '7px 12px',
            marginBottom: '10px',
            fontSize: '12px',
            color: '#00f2fe',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontWeight: 800, background: 'rgba(0, 242, 254, 0.25)', padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>GIF ANIMADO</span>
            <span>Todas as animações e frames serão preservados integralmente ao aplicar.</span>
          </div>
        )}

        {/* Workspace de Enquadramento Iluminado e Tecnológico */}
        <div 
          style={{ 
            width: '100%', 
            height: `${workspaceHeight}px`, 
            borderRadius: '10px', 
            overflow: 'hidden', 
            position: 'relative',
            background: 'radial-gradient(circle at center, #232b3b 0%, #131722 100%)',
            backgroundImage: `
              radial-gradient(circle at center, rgba(0, 242, 254, 0.08) 0%, transparent 70%),
              linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 20px 20px, 20px 20px',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            marginTop: '8px'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onWheel={(e) => {
            e.preventDefault()
            const delta = e.deltaY > 0 ? -0.08 : 0.08
            setZoom(prev => Math.min(3, Math.max(0.5, +(prev + delta).toFixed(2))))
          }}
        >
          {/* Imagem renderizada */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Ajuste de enquadramento"
            draggable={false}
            style={{
              maxWidth: 'none',
              maxHeight: 'none',
              minWidth: isAvatar ? `${cropRadius * 2}px` : `${bannerCropWidth}px`,
              minHeight: isAvatar ? `${cropRadius * 2}px` : `${bannerCropHeight}px`,
              width: isAvatar ? `${cropRadius * 2.8}px` : `${bannerCropWidth * 1.1}px`,
              height: 'auto',
              objectFit: 'cover',
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.05s ease',
              pointerEvents: 'none'
            }}
          />

          {/* Máscara SVG sobreposta: iluminação total dentro do corte e suave escurecimento fora */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <mask id="echo-crop-mask">
                <rect width="100%" height="100%" fill="white" />
                {isAvatar ? (
                  <circle cx="50%" cy="50%" r={cropRadius} fill="black" />
                ) : (
                  <rect 
                    x={(workspaceWidth - bannerCropWidth) / 2} 
                    y={(workspaceHeight - bannerCropHeight) / 2} 
                    width={bannerCropWidth} 
                    height={bannerCropHeight} 
                    rx="8" 
                    fill="black" 
                  />
                )}
              </mask>
            </defs>

            {/* Fundo suave translúcido fora da área de corte - deixa a foto inteira legível */}
            <rect width="100%" height="100%" fill="rgba(8, 11, 18, 0.45)" mask="url(#echo-crop-mask)" />

            {/* Linha guia neon destacando o contorno do avatar com retículo suave */}
            {isAvatar ? (
              <g>
                <circle 
                  cx="50%" 
                  cy="50%" 
                  r={cropRadius} 
                  fill="none" 
                  stroke="#00f2fe" 
                  strokeWidth="2.5" 
                  style={{ filter: 'drop-shadow(0 0 8px rgba(0, 242, 254, 0.6))' }}
                />
                {/* Linhas de grade suaves guia para centralizar */}
                <circle
                  cx="50%"
                  cy="50%"
                  r={cropRadius}
                  fill="none"
                  stroke="rgba(0, 242, 254, 0.2)"
                  strokeWidth="1"
                />
              </g>
            ) : (
              <rect 
                x={(workspaceWidth - bannerCropWidth) / 2} 
                y={(workspaceHeight - bannerCropHeight) / 2} 
                width={bannerCropWidth} 
                height={bannerCropHeight} 
                rx="8" 
                fill="none" 
                stroke="#00f2fe" 
                strokeWidth="2.5" 
                style={{ filter: 'drop-shadow(0 0 8px rgba(0, 242, 254, 0.6))' }}
              />
            )}
          </svg>

          {/* Dica de manipulação flutuante */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10, 14, 23, 0.75)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.85)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00f2fe' }} />
            <span>Arraste para enquadrar</span>
          </div>
        </div>

        {/* Controles de Zoom e Centralização */}
        <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: '8px', marginTop: '14px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Zoom do Enquadramento:</span>
              <span style={{ color: '#00f2fe', fontWeight: 700 }}>{Math.round(zoom * 100)}%</span>
            </label>
            <button
              type="button"
              className="picker-close-btn"
              style={{ margin: 0, padding: '3px 8px', fontSize: '11px' }}
              onClick={() => {
                setZoom(1.1)
                setOffsetX(0)
                setOffsetY(0)
              }}
            >
              Recentralizar
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>-</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#00f2fe' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>+</span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
          <button
            type="button"
            className="ch-create-btn"
            style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            style={{ background: '#00f2fe', color: '#000', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            onClick={handleSave}
          >
            Aplicar Foto
          </button>
        </div>
      </div>
    </div>
  )
}
