import { memo } from 'react'
import type { ServerEmoji } from '../../../types'
import { SmileIcon } from '../../icons'

export interface SpaceEmojisTabProps {
  newEmojiName: string
  setNewEmojiName: (name: string) => void
  handleCreateEmoji: (file: File, name: string) => void
  handleDeleteEmoji: (emojiId: string) => void
  uploadingEmoji: boolean
  showToast: (title: string, message: string, type?: any) => void
  serverEmojis: ServerEmoji[]
}

export const SpaceEmojisTab = memo(function SpaceEmojisTab({
  newEmojiName,
  setNewEmojiName,
  handleCreateEmoji,
  handleDeleteEmoji,
  uploadingEmoji,
  showToast,
  serverEmojis
}: SpaceEmojisTabProps) {
  return (
    <div className="space-settings-tab-pane">
      <div className="space-settings-pane-header">
        <h2>Emojis e Figurinhas do Espaço</h2>
        <p>Envie imagens estáticas ou <strong>GIFs animados</strong> com código :nome: para membros usarem no chat deste espaço.</p>
      </div>

      {/* Form de Criação de Emoji */}
      <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>Adicionar Novo Emoji ou GIF</h4>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            value={newEmojiName} 
            onChange={(e) => setNewEmojiName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="Nome do emoji (ex: pepe, hype, gg)"
            maxLength={32}
            style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13.5px' }}
          />
          <input 
            type="file" 
            id="server-emoji-file-input" 
            style={{ display: 'none' }} 
            accept="image/*" 
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                if (!newEmojiName.trim()) {
                  const autoName = f.name.split('.')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_')
                  handleCreateEmoji(f, autoName)
                } else {
                  handleCreateEmoji(f, newEmojiName)
                }
              }
              e.target.value = ''
            }} 
          />
          <button 
            type="button" 
            className="add-space-card-btn" 
            style={{ width: 'auto', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            disabled={uploadingEmoji}
            onClick={() => {
              if (!newEmojiName.trim()) {
                showToast("Nome do Emoji", "Digite um nome para o emoji antes de escolher o arquivo.", "info")
                return
              }
              document.getElementById('server-emoji-file-input')?.click()
            }}
          >
            <SmileIcon />
            <span>{uploadingEmoji ? 'Enviando...' : 'Carregar Imagem / GIF'}</span>
          </button>
        </div>
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Formatos suportados: .png, .gif, .jpg, .webp (Recomendado: 128x128px com fundo transparente).</span>
      </div>

      {/* Grid de Emojis do Servidor */}
      <div className="server-emojis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
        {serverEmojis.map(emoji => (
          <div key={emoji.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <img src={emoji.url} alt={emoji.name} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                :{emoji.name}:
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                {new Date(emoji.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <button 
              type="button" 
              className="settings-channel-delete-btn" 
              onClick={() => handleDeleteEmoji(emoji.id)}
              title="Excluir Emoji"
            >
              🗑️
            </button>
          </div>
        ))}
        {serverEmojis.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <SmileIcon style={{ width: '36px', height: '36px', margin: '0 auto 10px auto', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Nenhum emoji personalizado cadastrado ainda.</p>
          </div>
        )}
      </div>
    </div>
  )
})
