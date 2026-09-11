import { useState } from 'react'
import { StarIcon } from '../icons'
import type { SavedMessageItem } from '../../types'

export interface SavedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedMessages: SavedMessageItem[];
  onUnstar: (msgId: string) => void;
  onJumpToMessage: (item: SavedMessageItem) => void;
}

export function SavedMessagesModal({
  isOpen,
  onClose,
  savedMessages,
  onUnstar,
  onJumpToMessage
}: SavedMessagesModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'links' | 'media' | 'text'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (!isOpen) return null

  const filteredMessages = savedMessages.filter(item => {
    if (activeTab === 'links') {
      const hasLink = /(https?:\/\/[^\s]+)/i.test(item.body)
      if (!hasLink) return false
    } else if (activeTab === 'media') {
      if (!item.attachmentUrl && item.attachmentType !== 'audio') return false
    } else if (activeTab === 'text') {
      if (item.attachmentUrl || /(https?:\/\/[^\s]+)/i.test(item.body)) return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchText = item.body.toLowerCase().includes(q)
      const matchAuthor = item.authorName.toLowerCase().includes(q)
      const matchSource = item.sourceName.toLowerCase().includes(q)
      return matchText || matchAuthor || matchSource
    }

    return true
  })

  const linksCount = savedMessages.filter(m => /(https?:\/\/[^\s]+)/i.test(m.body)).length
  const mediaCount = savedMessages.filter(m => m.attachmentUrl || m.attachmentType === 'audio').length
  const textCount = savedMessages.filter(m => !m.attachmentUrl && !/(https?:\/\/[^\s]+)/i.test(m.body)).length

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="saved-messages-backdrop" onClick={onClose}>
      <div className="saved-messages-modal" onClick={e => e.stopPropagation()}>
        <div className="saved-messages-header">
          <div className="saved-header-left">
            <div className="saved-star-badge">
              <StarIcon style={{ width: 18, height: 18, color: '#ffc107', fill: '#ffc107' }} />
            </div>
            <div>
              <h3>Mensagens Salvas</h3>
              <p>Seus links, notas e mídias favoritas guardadas com privacidade</p>
            </div>
          </div>
          <button type="button" className="saved-close-btn" onClick={onClose} title="Fechar">✕</button>
        </div>

        <div className="saved-filter-bar">
          <div className="saved-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Pesquisar por texto, autor ou canal..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button type="button" className="saved-clear-search" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <div className="saved-filter-tabs">
            <button
              type="button"
              className={`saved-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Todas <span className="tab-count">{savedMessages.length}</span>
            </button>
            <button
              type="button"
              className={`saved-tab-btn ${activeTab === 'links' ? 'active' : ''}`}
              onClick={() => setActiveTab('links')}
            >
              🔗 Links <span className="tab-count">{linksCount}</span>
            </button>
            <button
              type="button"
              className={`saved-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              🖼️ Mídias & Áudios <span className="tab-count">{mediaCount}</span>
            </button>
            <button
              type="button"
              className={`saved-tab-btn ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              📝 Textos <span className="tab-count">{textCount}</span>
            </button>
          </div>
        </div>

        <div className="saved-messages-list">
          {filteredMessages.length === 0 ? (
            <div className="saved-empty-state">
              <div className="saved-empty-star">⭐</div>
              <h4>Nenhuma mensagem favoritada</h4>
              <p>
                {searchQuery
                  ? 'Nenhum resultado encontrado para a pesquisa.'
                  : 'Passe o mouse sobre qualquer mensagem em um canal ou conversa privada e clique na estrela (⭐) para guardar aqui.'}
              </p>
            </div>
          ) : (
            filteredMessages.map(item => (
              <div key={item.id} className="saved-msg-card">
                <div className="saved-card-header">
                  <div className="saved-card-author-info">
                    <div className="saved-author-avatar">
                      {item.authorAvatar ? (
                        <img src={item.authorAvatar} alt={item.authorName} />
                      ) : (
                        item.authorName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <span className="saved-author-name">{item.authorName}</span>
                      <button
                        type="button"
                        className="saved-source-tag"
                        onClick={() => onJumpToMessage(item)}
                        title="Ir para o canal ou conversa"
                      >
                        📍 {item.sourceName}
                      </button>
                    </div>
                  </div>
                  <div className="saved-card-header-actions">
                    <span className="saved-date">
                      {new Date(item.savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      className="saved-unstar-btn"
                      onClick={() => onUnstar(item.id)}
                      title="Remover dos favoritos"
                    >
                      <StarIcon style={{ width: 15, height: 15, color: '#ffc107', fill: '#ffc107' }} />
                    </button>
                  </div>
                </div>

                <div className="saved-card-body">
                  {item.body && (
                    <div className="saved-card-text">
                      {item.body.split(/(https?:\/\/[^\s]+)/g).map((part, idx) => {
                        if (part.match(/^https?:\/\//i)) {
                          return (
                            <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="saved-link">
                              {part}
                            </a>
                          )
                        }
                        return <span key={idx}>{part}</span>
                      })}
                    </div>
                  )}

                  {item.attachmentUrl && item.attachmentType === 'image' && (
                    <div className="saved-card-media">
                      <img
                        src={item.attachmentUrl}
                        alt="Anexo salvo"
                        onClick={() => window.open(item.attachmentUrl, '_blank')}
                        title="Abrir imagem"
                      />
                    </div>
                  )}

                  {item.attachmentUrl && item.attachmentType === 'audio' && (
                    <div className="saved-card-audio">
                      <audio controls src={item.attachmentUrl} style={{ width: '100%', height: '36px' }} />
                    </div>
                  )}

                  {item.attachmentUrl && item.attachmentType !== 'image' && item.attachmentType !== 'audio' && (
                    <div className="saved-card-file">
                      <a href={item.attachmentUrl} target="_blank" rel="noopener noreferrer">
                        📎 Baixar arquivo anexo
                      </a>
                    </div>
                  )}
                </div>

                <div className="saved-card-footer">
                  <button
                    type="button"
                    className="saved-action-link"
                    onClick={() => onJumpToMessage(item)}
                  >
                    Ir para conversa →
                  </button>
                  {item.body && (
                    <button
                      type="button"
                      className="saved-copy-btn"
                      onClick={() => handleCopyText(item.id, item.body)}
                    >
                      {copiedId === item.id ? '✓ Copiado!' : 'Copiar texto'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
