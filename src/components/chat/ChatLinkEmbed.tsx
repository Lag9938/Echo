import React, { useState } from 'react'
import { openExternalUrl } from '../../lib/openExternal'
import { isEchoInviteUrl } from '../../lib/invite'
import { useUIStore } from '../../stores/useUIStore'
import { MusicIcon, PlayIcon, ExternalLinkIcon, LinkIcon } from '../icons'
import { InAppSpaceInviteCard } from './InAppSpaceInviteCard'

interface ChatLinkEmbedProps {
  url?: string
  content?: string
}

export const ChatLinkEmbed: React.FC<ChatLinkEmbedProps> = ({ url, content }) => {
  const [isPlayingYoutube, setIsPlayingYoutube] = useState(false)
  const openLightbox = useUIStore((s) => s.openLightbox)

  let targetUrl = url
  if (!targetUrl && content) {
    const match = content.match(/(?:https?:\/\/|echo:\/\/)[^\s<>"{}|\\^`]+/i)
    if (match) {
      targetUrl = match[0]
    }
  }

  if (!targetUrl) return null

  // 0. Echo Space Invites: Discord-Style In-App Interactive Card
  if (isEchoInviteUrl(targetUrl)) {
    return <InAppSpaceInviteCard inviteUrl={targetUrl} />
  }


  // 1. YouTube & YouTube Music Detection
  const isYoutubeMusic = /music\.youtube\.com/i.test(targetUrl)
  const ytMatch = targetUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1]
    const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

    // Special handling for YouTube Music (iframes are blocked by YouTube for music)
    if (isYoutubeMusic) {
      return (
        <div 
          className="chat-link-embed youtube-embed youtube-music-embed" 
          onClick={() => openExternalUrl(targetUrl)}
          style={{
            marginTop: '6px',
            width: '100%',
            maxWidth: '440px',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'rgba(15, 17, 26, 0.95)',
            border: '1px solid rgba(255, 0, 51, 0.35)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'linear-gradient(90deg, rgba(255, 0, 51, 0.16), rgba(255, 0, 51, 0.04))',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MusicIcon style={{ width: '15px', height: '15px', color: '#ff4d6d' }} />
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#ff4d6d', letterSpacing: '0.2px' }}>YouTube Music</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openExternalUrl(targetUrl)
              }}
              style={{
                background: 'rgba(255, 0, 51, 0.22)',
                border: '1px solid rgba(255, 0, 51, 0.45)',
                color: '#fff',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                transition: 'background 0.16s ease, transform 0.16s ease'
              }}
            >
              <span>Ouvir no YouTube Music</span>
              <ExternalLinkIcon style={{ width: '12px', height: '12px' }} />
            </button>
          </div>

          {/* Banner Thumbnail */}
          <div style={{ position: 'relative', width: '100%', height: '210px', overflow: 'hidden' }}>
            <img 
              src={thumbUrl} 
              alt="Capa da Música" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
              decoding="async"
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: 'rgba(0, 0, 0, 0.42)',
              transition: 'background 0.2s ease'
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff0033, #ff4d6d)',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 6px 24px rgba(255, 0, 51, 0.65)'
              }}>
                <PlayIcon style={{ width: '20px', height: '20px', color: '#fff', marginLeft: '3px' }} />
              </div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.8)',
                color: '#fff',
                padding: '5px 14px',
                borderRadius: '16px',
                fontSize: '11.5px',
                fontWeight: 600,
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>Ouvir no YouTube Music</span>
                <ExternalLinkIcon style={{ width: '12px', height: '12px', color: '#ff4d6d' }} />
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Standard YouTube Videos
    return (
      <div className="chat-link-embed youtube-embed" style={{
        marginTop: '6px',
        width: '100%',
        maxWidth: '440px',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.09)'
      }}>
        {/* Header with quick open in browser */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PlayIcon style={{ width: '12px', height: '12px', color: '#ef4444' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>YouTube</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openExternalUrl(targetUrl)
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#00f2fe',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '6px'
            }}
          >
            <span>Abrir no Navegador</span>
            <ExternalLinkIcon style={{ width: '11px', height: '11px' }} />
          </button>
        </div>

        {isPlayingYoutube ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            title="YouTube video player"
            style={{ width: '100%', height: '248px', border: 'none', display: 'block' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div 
            onClick={() => openExternalUrl(targetUrl)}
            style={{ position: 'relative', cursor: 'pointer', width: '100%', height: '240px', overflow: 'hidden' }}
          >
            <img 
              src={thumbUrl} 
              alt="YouTube Thumbnail" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
              decoding="async"
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(0, 0, 0, 0.35)',
              transition: 'background 0.2s ease'
            }}>
              <div 
                onClick={(e) => {
                  e.stopPropagation()
                  setIsPlayingYoutube(true)
                }}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.5)',
                  cursor: 'pointer'
                }}
              >
                <PlayIcon style={{ width: '20px', height: '20px', color: '#fff', marginLeft: '3px' }} />
              </div>
            </div>
            <div 
              onClick={(e) => {
                e.stopPropagation()
                openExternalUrl(targetUrl)
              }}
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '10px',
                background: 'rgba(0, 0, 0, 0.78)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <span>YouTube</span>
              <ExternalLinkIcon style={{ width: '10px', height: '10px', opacity: 0.85 }} />
            </div>
          </div>
        )}
      </div>
    )
  }

  // 2. Direct Image URLs
  const isDirectImage = /\.(jpeg|jpg|gif|png|webp|avif)(\?.*)?$/i.test(targetUrl)
  if (isDirectImage) {
    return (
      <div style={{ marginTop: '6px', maxWidth: '420px', borderRadius: '10px', overflow: 'hidden' }}>
        <img 
          src={targetUrl} 
          alt="Anexo de link" 
          onClick={() => openLightbox(targetUrl)}
          style={{ 
            maxWidth: '100%', 
            maxHeight: '320px', 
            minHeight: '48px',
            objectFit: 'contain', 
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px', 
            display: 'block',
            cursor: 'pointer',
            transition: 'transform 0.18s ease'
          }}
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  // 3. General Web Link Preview Card
  let hostname = ''
  try {
    hostname = new URL(targetUrl).hostname.replace(/^www\./, '')
  } catch {
    return null
  }

  return (
    <div 
      onClick={() => openExternalUrl(targetUrl)}
      className="chat-link-embed generic-embed"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '6px',
        padding: '8px 12px',
        maxWidth: '380px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        cursor: 'pointer',
        color: 'inherit',
        transition: 'all 0.18s ease'
      }}
    >
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        background: 'rgba(0, 242, 254, 0.1)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color: '#00f2fe'
      }}>
        <LinkIcon style={{ width: '14px', height: '14px' }} />
      </div>
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {hostname}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {targetUrl}
        </span>
      </div>
      <ExternalLinkIcon style={{ width: '12px', height: '12px', color: 'var(--text-muted)', flexShrink: 0 }} />
    </div>
  )
}


