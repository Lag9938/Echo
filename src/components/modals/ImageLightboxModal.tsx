import React, { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '../../stores/useUIStore'
import { openExternalUrl } from '../../lib/openExternal'
import {
  ImageIcon,
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  CloseXIcon,
  ZoomInIcon
} from '../icons'

export const ImageLightboxModal: React.FC = () => {
  const imageUrl = useUIStore((s) => s.lightboxImageUrl)
  const closeLightbox = useUIStore((s) => s.closeLightbox)
  const addToast = useUIStore((s) => s.addToast)

  const [isZoomed, setIsZoomed] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)

  // Reset zoom state whenever a new image opens
  useEffect(() => {
    if (imageUrl) {
      setIsZoomed(false)
      setHasCopied(false)
    }
  }, [imageUrl])

  // ESC key listener to close lightbox
  useEffect(() => {
    if (!imageUrl) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageUrl, closeLightbox])

  const handleCopyLink = useCallback(async () => {
    if (!imageUrl) return
    try {
      await navigator.clipboard.writeText(imageUrl)
      setHasCopied(true)
      addToast({
        id: `toast-${Date.now()}`,
        type: 'info',
        title: 'Link copiado!',
        message: 'O link direto da imagem foi copiado para a área de transferência.'
      })
      setTimeout(() => setHasCopied(false), 2200)
    } catch (err) {
      console.warn('Falha ao copiar link:', err)
    }
  }, [imageUrl, addToast])

  const handleDownload = useCallback(async () => {
    if (!imageUrl) return
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      // Extract filename from URL or default
      const filename = imageUrl.split('/').pop()?.split('?')[0] || `echo-image-${Date.now()}.png`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)

      addToast({
        id: `toast-${Date.now()}`,
        type: 'info',
        title: 'Download iniciado',
        message: 'A imagem foi salva no seu dispositivo.'
      })
    } catch {
      // Fallback: abrir direto no navegador se CORS bloquear fetch do blob
      openExternalUrl(imageUrl)
    }
  }, [imageUrl, addToast])

  if (!imageUrl) return null

  return (
    <div
      className="echo-image-lightbox-backdrop"
      onClick={closeLightbox}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(7, 9, 14, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'lightboxFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both'
      }}
    >
      {/* Floating Top Control Bar */}
      <div
        className="echo-image-lightbox-toolbar"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '18px',
          left: '24px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10002,
          pointerEvents: 'auto'
        }}
      >
        {/* Left Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.08)',
          padding: '6px 14px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#f1f5f9',
          fontSize: '13px',
          fontWeight: 600,
          backdropFilter: 'blur(8px)'
        }}>
          <ImageIcon style={{ width: '15px', height: '15px', color: '#00f2fe' }} />
          <span>Visualizador de Imagem</span>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: hasCopied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: hasCopied ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.12)',
              color: hasCopied ? '#4ade80' : '#e2e8f0',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
          >
            {hasCopied ? (
              <CheckIcon style={{ width: '14px', height: '14px', color: '#4ade80' }} />
            ) : (
              <CopyIcon style={{ width: '14px', height: '14px' }} />
            )}
            <span>{hasCopied ? 'Copiado!' : 'Copiar Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
          >
            <DownloadIcon style={{ width: '14px', height: '14px' }} />
            <span>Baixar</span>
          </button>

          <button
            type="button"
            onClick={() => openExternalUrl(imageUrl)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.18), rgba(79, 172, 254, 0.24))',
              border: '1px solid rgba(0, 242, 254, 0.45)',
              color: '#00f2fe',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
          >
            <span>Abrir no Navegador</span>
            <ExternalLinkIcon style={{ width: '13px', height: '13px' }} />
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={closeLightbox}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
          >
            <CloseXIcon style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      {/* Main Image Viewport Area */}
      <div
        className="echo-image-lightbox-body"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeLightbox()
          }
        }}
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: isZoomed ? 'auto' : 'hidden',
          padding: '64px 24px 48px 24px',
          boxSizing: 'border-box',
          cursor: isZoomed ? 'zoom-out' : 'default'
        }}
      >
        <img
          src={imageUrl}
          alt="Imagem em tamanho real"
          onClick={(e) => {
            e.stopPropagation()
            setIsZoomed((prev) => !prev)
          }}
          style={{
            maxWidth: isZoomed ? 'none' : '92vw',
            maxHeight: isZoomed ? 'none' : '82vh',
            width: isZoomed ? 'auto' : undefined,
            height: isZoomed ? 'auto' : undefined,
            objectFit: 'contain',
            borderRadius: '10px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            cursor: isZoomed ? 'zoom-out' : 'zoom-in',
            transition: isZoomed ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            userSelect: 'none'
          }}
        />
      </div>

      {/* Bottom Hint Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '6px 16px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#94a3b8',
          fontSize: '11.5px',
          letterSpacing: '0.2px',
          pointerEvents: 'none'
        }}
      >
        <ZoomInIcon style={{ width: '13px', height: '13px', color: '#00f2fe' }} />
        <span>Clique na imagem para alternar zoom 100%</span>
        <span>•</span>
        <span>Pressione <kbd style={{ background: 'rgba(255,255,255,0.12)', padding: '1px 5px', borderRadius: '4px', color: '#e2e8f0', fontSize: '10.5px' }}>ESC</kbd> para fechar</span>
      </div>
    </div>
  )
}

