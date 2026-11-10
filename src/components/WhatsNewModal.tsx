import { useState } from 'react'
import type { ReleaseNote } from '../lib/changelogData'
import { CHANGELOG_DATA, APP_CURRENT_VERSION } from '../lib/changelogData'

/** Cor suave do ícone de cada novidade, pelo tipo (o selo em si não aparece mais: só deixava a lista pesada) */
export function highlightTint(badge?: string): string {
  const b = (badge || '').toUpperCase()
  if (b.includes('DESEMPENHO')) return 'rgba(34, 197, 94, 0.16)'
  if (b.includes('NOVO')) return 'rgba(139, 124, 246, 0.18)'
  if (b.includes('CORRE')) return 'rgba(245, 184, 61, 0.18)'
  return 'rgba(223, 109, 93, 0.16)'
}

/** "Echo v0.62.8 - Quem Fala, Sem Pesar" vira "Quem Fala, Sem Pesar" (o número já aparece no selo de cima) */
export function friendlyReleaseTitle(release: Pick<ReleaseNote, 'title' | 'version'>): string {
  const afterDash = release.title.split(/\s[-–]\s/).slice(1).join(' - ').trim()
  return afterDash || release.title.replace(/^Echo\s+v?[\d.]+\s*/i, '').trim() || release.title
}

/** "10 de Novembro de 2026" vira "10 de novembro" */
function shortDate(date: string): string {
  return date.replace(/\s+de\s+\d{4}$/, '').toLowerCase()
}

const PREVIOUS_COUNT = 6

/**
 * Novidades da versão, como um bilhete do Echo: no topo um brilho suave com o número da versão, o título e a
 * frase de resumo; embaixo, as novidades numa lista leve. "Ver versões anteriores" abre as últimas versões
 * dentro da própria janela.
 */
export function WhatsNewModal({
  isOpen,
  onClose,
  isEmbedded = false
}: {
  isOpen: boolean
  onClose?: () => void
  isEmbedded?: boolean
}) {
  const [showPrevious, setShowPrevious] = useState(false)
  if (!isOpen && !isEmbedded) return null

  const activeRelease: ReleaseNote = CHANGELOG_DATA[0]
  const previous = CHANGELOG_DATA.slice(1, 1 + PREVIOUS_COUNT)

  const handleDismiss = () => {
    localStorage.setItem('echo_last_seen_version', APP_CURRENT_VERSION)
    if (onClose) onClose()
  }

  const content = (
    <div className={`wn-letter ${isEmbedded ? 'embedded' : ''}`}>
      <div className="wn-hero">
        {!isEmbedded && onClose && (
          <button type="button" className="wn-close" onClick={handleDismiss} title="Fechar" aria-label="Fechar">
            ✕
          </button>
        )}
        <span className="wn-ver">
          NOVIDADES <b>v{activeRelease.version}</b> · {shortDate(activeRelease.date)}
        </span>
        <h2 className="wn-title">{friendlyReleaseTitle(activeRelease)}</h2>
        <p className="wn-tagline">{activeRelease.tagline}</p>
      </div>

      <div className="wn-list">
        {activeRelease.highlights.map((item, idx) => (
          <div key={idx} className="wn-item">
            <span className="wn-icon" style={{ background: highlightTint(item.badge) }} aria-hidden="true">{item.icon}</span>
            <div className="wn-item-text">
              <b>{item.title}</b>
              <span>{item.description}</span>
            </div>
          </div>
        ))}
      </div>

      {showPrevious && previous.length > 0 && (
        <div className="wn-previous">
          {previous.map(release => (
            <div key={release.version} className="wn-prev-item">
              <div className="wn-prev-top">
                <b>{friendlyReleaseTitle(release)}</b>
                <span>v{release.version} · {shortDate(release.date)}</span>
              </div>
              <p>{release.tagline}</p>
            </div>
          ))}
        </div>
      )}

      <div className="wn-foot">
        {previous.length > 0 ? (
          <button type="button" className="wn-link" onClick={() => setShowPrevious(v => !v)} aria-expanded={showPrevious}>
            {showPrevious ? 'Esconder versões anteriores' : 'Ver versões anteriores'}
          </button>
        ) : <span />}
        {!isEmbedded && (
          <button type="button" className="wn-cta" onClick={handleDismiss}>
            Bora!
          </button>
        )}
      </div>
    </div>
  )

  if (isEmbedded) {
    return content
  }

  return (
    <div className="screen-picker-overlay whats-new-overlay" onClick={handleDismiss} style={{ zIndex: 10050 }}>
      <div className="whats-new-modal wn-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Novidades da versão ${activeRelease.version}`}>
        {content}
      </div>
    </div>
  )
}
