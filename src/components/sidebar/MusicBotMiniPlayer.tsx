import { memo, useEffect, useState, type MouseEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useMusicBotStore } from '../../stores/useMusicBotStore'
import { useUIStore } from '../../stores/useUIStore'
import { getCurrentPositionMs, type MusicBotState } from '../../lib/musicBotState'
import { MusicIcon, PauseIcon, PlayIcon, SkipForwardIcon } from '../icons'

interface MusicBotMiniPlayerProps {
  /** Canal de voz em que o bot está (os comandos vão como mensagens nesse canal, como no painel do bot) */
  channelId: string
  userId: string
}

/** "83000" vira "1:23" */
function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/**
 * O que a linha do bot mostra: em cima o destaque (a música, ou "Música" quando nada toca), embaixo uma linha
 * curta com o estado, o tempo e a fila.
 */
export function musicRowText(state: MusicBotState | null, positionMs: number): { title: string; sub: string } {
  const current = state?.current ?? null
  if (!state || state.status === 'idle' || !current) {
    return { title: 'Música', sub: state?.status === 'loading' ? 'Carregando a música…' : 'Nada tocando · clique para abrir' }
  }
  if (state.status === 'loading') return { title: current.title, sub: 'Carregando a música…' }
  const durationMs = current.durationSeconds ? current.durationSeconds * 1000 : null
  const time = durationMs ? `${clock(Math.min(positionMs, durationMs))} de ${clock(durationMs)}` : clock(positionMs)
  const queue = state.queueTotal > 0 ? ` · +${state.queueTotal} na fila` : ''
  return { title: current.title, sub: `${state.status === 'paused' ? 'Pausado' : 'Música'} · ${time}${queue}` }
}

/**
 * O bot de música na sala, como mais uma "pessoa": o ícone de nota, a música em destaque e, embaixo, o estado,
 * o tempo e a fila. Pausar e pular aparecem ao passar o mouse; clicar na linha abre o painel completo.
 */
export const MusicBotMiniPlayer = memo(function MusicBotMiniPlayer({ channelId, userId }: MusicBotMiniPlayerProps) {
  const state = useMusicBotStore((s) => s.state)
  const receivedAt = useMusicBotStore((s) => s.receivedAt)
  const setShowMusicBotModal = useUIStore((s) => s.setShowMusicBotModal)
  const [now, setNow] = useState(() => Date.now())
  const [sending, setSending] = useState(false)

  // O relógio só anda tocando (o texto mostra o tempo)
  const isPlaying = state?.status === 'playing'
  useEffect(() => {
    if (!isPlaying) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isPlaying])

  const openPanel = () => setShowMusicBotModal(true)

  const sendCommand = async (event: MouseEvent, body: string) => {
    event.stopPropagation()
    if (!supabase || sending) return
    setSending(true)
    await supabase.from('messages').insert({ channel_id: channelId, author_id: userId, body })
    setSending(false)
  }

  const current = state?.current ?? null
  const paused = state?.status === 'paused'
  const positionMs = state && current ? getCurrentPositionMs(state, receivedAt, now) : 0
  const { title, sub } = musicRowText(state, positionMs)
  const hasTrack = Boolean(current) && state?.status !== 'idle'

  return (
    <div
      className={`music-row${hasTrack ? ' has-track' : ''}`}
      role="button"
      tabIndex={0}
      onClick={openPanel}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel() } }}
      title="Abrir o painel do Bot de Música"
    >
      <span className="music-row-icon" aria-hidden="true">
        <MusicIcon style={{ width: 13, height: 13 }} />
      </span>
      <span className="music-row-text">
        <span className="music-row-title" title={title}>{title}</span>
        <span className="music-row-sub">{sub}</span>
      </span>
      {hasTrack && (
        <span className="music-row-controls">
          <button
            type="button"
            className="music-row-btn"
            disabled={sending}
            onClick={(e) => void sendCommand(e, paused ? '!resume' : '!pause')}
            title={paused ? 'Continuar' : 'Pausar'}
            aria-label={paused ? 'Continuar' : 'Pausar'}
          >
            {paused ? <PlayIcon style={{ width: 13, height: 13 }} /> : <PauseIcon style={{ width: 13, height: 13 }} />}
          </button>
          <button
            type="button"
            className="music-row-btn"
            disabled={sending}
            onClick={(e) => void sendCommand(e, '!skip')}
            title="Pular"
            aria-label="Pular"
          >
            <SkipForwardIcon style={{ width: 13, height: 13 }} />
          </button>
        </span>
      )}
    </div>
  )
})
