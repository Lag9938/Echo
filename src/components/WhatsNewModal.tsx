import { useState } from 'react'
import type { ReleaseNote } from '../lib/changelogData'
import { CHANGELOG_DATA, APP_CURRENT_VERSION } from '../lib/changelogData'

export function WhatsNewModal({
  isOpen,
  onClose,
  isEmbedded = false
}: {
  isOpen: boolean
  onClose?: () => void
  isEmbedded?: boolean
}) {
  const [selectedVersion, setSelectedVersion] = useState<string>(APP_CURRENT_VERSION)

  if (!isOpen && !isEmbedded) return null

  const activeRelease: ReleaseNote = CHANGELOG_DATA.find(r => r.version === selectedVersion) || CHANGELOG_DATA[0]

  const handleDismiss = () => {
    localStorage.setItem('echo_last_seen_version', APP_CURRENT_VERSION)
    if (onClose) onClose()
  }

  const content = (
    <div className={`whats-new-container ${isEmbedded ? 'embedded' : ''}`}>
      {/* Header */}
      <div className="whats-new-header">
        <div className="whats-new-header-title">
          <div className="whats-new-icon-box">✨</div>
          <div>
            <h2>Novidades & Atualizações</h2>
            <p className="whats-new-subtitle">Confira tudo o que preparamos para tornar sua experiência incrível.</p>
          </div>
        </div>
        {!isEmbedded && onClose && (
          <button type="button" className="whats-new-close-btn" onClick={handleDismiss} title="Fechar">
            ✕
          </button>
        )}
      </div>

      {/* Version Selector Tabs */}
      <div className="whats-new-version-tabs">
        {CHANGELOG_DATA.map(rel => {
          const isSelected = rel.version === selectedVersion
          return (
            <button
              key={rel.version}
              type="button"
              className={`whats-new-version-tab ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedVersion(rel.version)}
            >
              <span className="version-name">v{rel.version}</span>
              {rel.isLatest && <span className="version-badge-latest">ATUAL</span>}
            </button>
          )
        })}
      </div>

      {/* Active Version Banner */}
      <div className="whats-new-banner">
        <div className="whats-new-banner-meta">
          <span className="whats-new-version-tag">Versão {activeRelease.version}</span>
          <span className="whats-new-date">{activeRelease.date}</span>
        </div>
        <h3 className="whats-new-banner-title">{activeRelease.title}</h3>
        <p className="whats-new-banner-tagline">{activeRelease.tagline}</p>
      </div>

      {/* Highlights Grid */}
      <div className="whats-new-cards-grid">
        {activeRelease.highlights.map((item, idx) => (
          <div key={idx} className="whats-new-card">
            <div className="whats-new-card-header">
              <span className="whats-new-card-icon">{item.icon}</span>
              <span className="whats-new-card-title">{item.title}</span>
              {item.badge && (
                <span className={`whats-new-card-badge badge-${item.badge.toLowerCase().replace(/[^a-z]/g, '')}`}>
                  {item.badge}
                </span>
              )}
            </div>
            <p className="whats-new-card-desc">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Footer (only for modal) */}
      {!isEmbedded && (
        <div className="whats-new-footer">
          <button type="button" className="whats-new-confirm-btn" onClick={handleDismiss}>
            🚀 Entendi! Vamos nessa
          </button>
        </div>
      )}
    </div>
  )

  if (isEmbedded) {
    return content
  }

  return (
    <div className="screen-picker-overlay whats-new-overlay" onClick={handleDismiss} style={{ zIndex: 10050 }}>
      <div className="whats-new-modal" onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  )
}
