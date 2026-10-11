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
      <div className="space-emoji-uploader">
        <h4 className="space-emoji-uploader-title">Adicionar Novo Emoji ou GIF</h4>
        <div className="space-emoji-uploader-row">
          <input 
            type="text" 
            value={newEmojiName} 
            onChange={(e) => setNewEmojiName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="Nome do emoji (ex: pepe, hype, gg)"
            maxLength={32}
            className="space-emoji-name-input"
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
            className="add-space-card-btn space-emoji-upload-btn" 
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
        <span className="space-emoji-format-hint">Formatos suportados: .png, .gif, .jpg, .webp (Recomendado: 128x128px com fundo transparente).</span>
      </div>

      {/* Grid de Emojis do Servidor */}
      <div className="server-emojis-grid">
        {serverEmojis.map(emoji => (
          <div key={emoji.id} className="space-emoji-card">
            <img src={emoji.url} alt={emoji.name} className="space-emoji-img" />
            <div className="space-emoji-info">
              <span className="space-emoji-name">
                :{emoji.name}:
              </span>
              <span className="space-emoji-date">
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
          <div className="space-emoji-empty-state">
            <SmileIcon className="space-emoji-empty-icon" />
            <p>Nenhum emoji personalizado cadastrado ainda.</p>
          </div>
        )}
      </div>
    </div>
  )
})
