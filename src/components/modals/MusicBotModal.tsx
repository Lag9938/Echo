import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MusicIcon } from '../icons'

export interface MusicBotModalProps {
  isOpen: boolean
  onClose: () => void
  channelId: string | null
  userId: string
  channelName?: string
}

const MAX_QUERY_LENGTH = 300

const controlBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 8px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600
}

// O bot (music-bot/) escuta INSERTs em `messages` e reage a "!comando" em canais
// de voz. O painel só posta essas mensagens em nome do usuário — não há API própria.
export function MusicBotModal({ isOpen, onClose, channelId, userId, channelName }: MusicBotModalProps) {
  const [query, setQuery] = useState('')
  const [volume, setVolume] = useState(100)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  if (!isOpen) return null

  const sendCommand = async (body: string, okText: string): Promise<boolean> => {
    if (!channelId) {
      setStatus({ kind: 'error', text: 'Entre em um canal de voz para usar o bot de música.' })
      return false
    }
    if (!supabase) {
      setStatus({ kind: 'error', text: 'Sem conexão com o servidor. Tente novamente em instantes.' })
      return false
    }
    setSending(true)
    setStatus(null)
    const { error } = await supabase.from('messages').insert({
      channel_id: channelId,
      author_id: userId,
      body
    })
    setSending(false)
    if (error) {
      setStatus({ kind: 'error', text: `Não foi possível enviar o comando: ${error.message}` })
      return false
    }
    setStatus({ kind: 'ok', text: okText })
    return true
  }

  const handlePlay = async () => {
    const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH)
    if (!trimmed) {
      setStatus({ kind: 'error', text: 'Cole um link ou digite o nome da música.' })
      return
    }
    if (await sendCommand(`!play ${trimmed}`, 'Pedido enviado. O bot entra na chamada em alguns segundos.')) {
      setQuery('')
    }
  }

  const commitVolume = () => {
    void sendCommand(`!volume ${volume}`, `Volume ajustado para ${volume}%.`)
  }

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div className="modal-content" style={{ maxWidth: '520px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MusicIcon style={{ width: 26, height: 26 }} />
            <div>
              <h3 style={{ margin: 0 }}>Bot de Música</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {channelName ? `Tocando em ${channelName}` : 'Toque músicas do YouTube na chamada de voz'}
              </span>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>✕</button>
        </div>

        <form
          style={{ display: 'flex', gap: '8px', marginTop: '16px' }}
          onSubmit={(e) => { e.preventDefault(); void handlePlay() }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Link do YouTube / YouTube Music ou nome da música"
            autoFocus
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.25)',
              color: 'inherit',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={sending}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: '#1eb4ff',
              color: '#04121c',
              fontWeight: 700,
              cursor: sending ? 'default' : 'pointer',
              opacity: sending ? 0.6 : 1
            }}
          >
            Tocar
          </button>
        </form>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button type="button" disabled={sending} style={controlBtnStyle} onClick={() => void sendCommand('!pause', 'Pausado.')}>⏸ Pausar</button>
          <button type="button" disabled={sending} style={controlBtnStyle} onClick={() => void sendCommand('!resume', 'Retomado.')}>▶ Continuar</button>
          <button type="button" disabled={sending} style={controlBtnStyle} onClick={() => void sendCommand('!skip', 'Pulando para a próxima.')}>⏭ Pular</button>
          <button type="button" disabled={sending} style={{ ...controlBtnStyle, color: '#ff4655' }} onClick={() => void sendCommand('!stop', 'Bot desconectado do canal.')}>⏹ Parar</button>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '58px' }}>Volume {volume}%</span>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            onMouseUp={commitVolume}
            onTouchEnd={commitVolume}
            onKeyUp={commitVolume}
            style={{ flex: 1 }}
          />
        </div>

        {status && (
          <p style={{ margin: '14px 0 0', fontSize: '12px', color: status.kind === 'error' ? '#ff4655' : 'var(--text-secondary)' }}>
            {status.text}
          </p>
        )}
        <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
          Os comandos aparecem no chat de texto da chamada, junto com as respostas do bot.
        </p>
      </div>
    </div>
  )
}
