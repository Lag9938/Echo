import { memo, useEffect, useState, type MouseEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useMusicBotStore } from '../../stores/useMusicBotStore'
import { useUIStore } from '../../stores/useUIStore'
import { getCurrentPositionMs } from '../../lib/musicBotState'
import { PauseIcon, PlayIcon, SkipForwardIcon } from '../icons'

interface MusicBotMiniPlayerProps {
  /** Canal de voz em que o bot está (os comandos vão como mensagens nesse canal, como no painel do bot) */
  channelId: string
  userId: string
}

const STATUS_TEXT = {
  playing: 'Tocando',
  paused: 'Pausado',
  loading: 'Carregando a música…',
  idle: 'Nada tocando'
} as const

/**
 * O bot de música na lista da chamada: em vez de uma "pessoa" qualquer, um mini player com o que está
 * tocando, progresso e os controles básicos. Clicar no cartão abre o painel completo (fila, volume).
 */
export const MusicBotMiniPlayer = memo(function MusicBotMiniPlayer({ channelId, userId }: MusicBotMiniPlayerProps) {
  const state = useMusicBotStore((s) => s.state)
  const receivedAt = useMusicBotStore((s) => s.receivedAt)
  const setShowMusicBotModal = useUIStore((s) => s.setShowMusicBotModal)
  const [now, setNow] = useState(() => Date.now())
  const [sending, setSending] = useState(false)

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
  const durationMs = current?.durationSeconds ? current.durationSeconds * 1000 : null
  const positionMs = state && current ? getCurrentPositionMs(state, receivedAt, now) : 0
  const progress = durationMs ? Math.min(100, (positionMs / durationMs) * 100) : 0

  const queueTotal = state?.queueTotal ?? 0
  const subtitle = state
    ? `${STATUS_TEXT[state.status]}${queueTotal > 0 ? ` · +${queueTotal} na fila` : ''}`
    : 'Clique para abrir o painel'
  const title = current?.title ?? 'Echo Music Bot'

  return (
    <div
      className={`music-mini${state?.status === 'idle' || !state ? ' idle' : ''}`}
      role="button"
      tabIndex={0}
      onClick={openPanel}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel() } }}
      title="Abrir o painel do Bot de Música"
    >
      <div className="music-mini-top">
        <span className={`music-mini-disc${isPlaying ? ' spin' : ''}`} aria-hidden="true" />
        <div className="music-mini-text">
          <div className="music-mini-title" title={title}>{title}</div>
          <div className="music-mini-sub">{subtitle}</div>
        </div>
        {state && (
          <div className="music-mini-buttons">
            <button
              type="button"
              className="music-mini-btn main"
              disabled={sending || !current}
              onClick={(e) => void sendCommand(e, paused ? '!resume' : '!pause')}
              title={paused ? 'Continuar' : 'Pausar'}
              aria-label={paused ? 'Continuar' : 'Pausar'}
            >
              {paused ? <PlayIcon style={{ width: 15, height: 15 }} /> : <PauseIcon style={{ width: 15, height: 15 }} />}
            </button>
            <button
              type="button"
              className="music-mini-btn"
              disabled={sending || !current}
              onClick={(e) => void sendCommand(e, '!skip')}
              title="Pular"
              aria-label="Pular"
            >
              <SkipForwardIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>
      {durationMs && (
        <div className="music-mini-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <i style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
})
