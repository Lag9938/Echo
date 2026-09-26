import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useMusicBotStore } from '../../stores/useMusicBotStore'
import { formatClock, getCurrentPositionMs, type MusicBotStatus } from '../../lib/musicBotState'
import {
  ArrowUpIcon,
  CloseXIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  StopSquareIcon,
  TrashIcon,
  VolumeIcon,
  VolumeXIcon
} from '../icons'

export interface MusicBotModalProps {
  isOpen: boolean
  onClose: () => void
  channelId: string | null
  userId: string
  channelName?: string
}

const MAX_QUERY_LENGTH = 300
const DEFAULT_VOLUME = 100
const STATUS_TIMEOUT_MS = 3500

type ListTab = 'queue' | 'recent'

const STATUS_LABEL: Record<MusicBotStatus, string> = {
  loading: 'Carregando',
  playing: 'Tocando',
  paused: 'Pausado',
  idle: 'Ocioso'
}

// O bot (music-bot/) escuta INSERTs em `messages` e reage a "!comando" em canais de voz. O painel envia
// esses comandos em nome do usuário e lê o estado que o bot publica nos metadados dele no LiveKit
// (fila, faixa atual, volume) — veja src/lib/musicBotState.ts.
export function MusicBotModal({ isOpen, onClose, channelId, userId, channelName }: MusicBotModalProps) {
  const [query, setQuery] = useState('')
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(DEFAULT_VOLUME)
  // Só é usado com um bot sem painel (sem estado publicado): o botão alterna pelo último comando enviado
  const [localPaused, setLocalPaused] = useState(false)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [tab, setTab] = useState<ListTab>('queue')
  const [now, setNow] = useState(() => Date.now())
  const draggingVolume = useRef(false)

  const botPresent = useMusicBotStore((s) => s.present)
  const botState = useMusicBotStore((s) => s.state)
  const receivedAt = useMusicBotStore((s) => s.receivedAt)

  const paused = botState ? botState.status === 'paused' : localPaused
  const isPlaying = botState?.status === 'playing'

  // Mensagens de sucesso somem sozinhas; erros ficam até a próxima ação
  useEffect(() => {
    if (!status || status.kind === 'error') return
    const timer = setTimeout(() => setStatus(null), STATUS_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // Relógio da barra de progresso: só corre enquanto o painel está aberto e o bot está tocando
  useEffect(() => {
    if (!isOpen || !isPlaying) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isOpen, isPlaying])

  // O volume real vem do bot (outra pessoa pode ter mudado); não mexe enquanto o usuário arrasta
  const botVolume = botState?.volume
  useEffect(() => {
    if (botVolume === undefined || draggingVolume.current) return
    setVolume(botVolume)
  }, [botVolume])

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
      setLocalPaused(false)
    }
  }

  const handleTogglePause = async () => {
    const wasPaused = paused
    const ok = wasPaused
      ? await sendCommand('!resume', 'Retomado.')
      : await sendCommand('!pause', 'Pausado.')
    if (ok) setLocalPaused(!wasPaused)
  }

  const handleSkip = async () => {
    if (await sendCommand('!skip', 'Pulando para a próxima.')) setLocalPaused(false)
  }

  const handleStop = async () => {
    if (await sendCommand('!stop', 'Bot desconectado do canal.')) setLocalPaused(false)
  }

  const commitVolume = (value: number) => {
    void sendCommand(`!volume ${value}`, `Volume em ${value}%.`)
  }

  const handleToggleMute = () => {
    if (volume > 0) {
      setVolumeBeforeMute(volume)
      setVolume(0)
      commitVolume(0)
    } else {
      const restored = volumeBeforeMute || DEFAULT_VOLUME
      setVolume(restored)
      commitVolume(restored)
    }
  }

  // Por id (q7) e não por posição: o comando continua certo mesmo que a fila ande antes de ele chegar
  const handleRemove = (id: string | null, position: number, title: string) => {
    void sendCommand(`!remove ${id ?? position}`, `Removido: ${title}`)
  }

  const handlePlayNext = (id: string | null, position: number, title: string) => {
    void sendCommand(`!next ${id ?? position}`, `Vai tocar em seguida: ${title}`)
  }

  const handlePlayNow = (id: string | null, position: number, title: string) => {
    void sendCommand(`!now ${id ?? position}`, `Tocando agora: ${title}`)
  }

  const handleClear = () => {
    void sendCommand('!clear', 'Fila limpa.')
  }

  const handleReplay = (url: string, title: string) => {
    void sendCommand(`!play ${url}`, `Adicionada de novo: ${title}`)
  }

  const PauseToggleIcon = paused ? PlayIcon : PauseIcon
  const pauseLabel = paused ? 'Continuar' : 'Pausar'
  const VolumeStateIcon = volume === 0 ? VolumeXIcon : VolumeIcon

  const queue = botState?.queue ?? []
  const queueTotal = botState?.queueTotal ?? 0
  const history = botState?.history ?? []
  const current = botState?.current ?? null
  const positionMs = botState && current ? getCurrentPositionMs(botState, receivedAt, now) : 0
  const durationMs = current?.durationSeconds ? current.durationSeconds * 1000 : null
  const progress = durationMs ? Math.min(100, (positionMs / durationMs) * 100) : 0

  // Estado do bot para o selo do cabeçalho
  let pillClass = 'off'
  let pillText = 'Bot fora da chamada'
  if (botState) {
    pillClass = botState.status
    pillText = STATUS_LABEL[botState.status]
  } else if (botPresent) {
    pillClass = 'outdated'
    pillText = 'Bot desatualizado'
  }

  let nowPlayingText = 'Peça uma música para o bot entrar na chamada'
  if (botState) {
    nowPlayingText = botState.status === 'loading' ? 'Carregando a música…' : 'Nada tocando'
  } else if (botPresent) {
    nowPlayingText = 'Atualize o bot no servidor para ver o que está tocando'
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="music-bot-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Bot de Música"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="music-bot-header">
          <div className="music-bot-badge">
            <MusicIcon style={{ width: 20, height: 20 }} />
          </div>
          <div className="music-bot-heading">
            <h3 className="music-bot-title">Bot de Música</h3>
            <span className="music-bot-subtitle">
              {channelName ? `Canal: ${channelName}` : 'Toque músicas do YouTube na chamada'}
            </span>
          </div>
          <span className={`music-bot-pill ${pillClass}`}>
            <span className="music-bot-pill-dot" />
            {pillText}
          </span>
          <button type="button" className="music-bot-close" onClick={onClose} aria-label="Fechar">
            <CloseXIcon />
          </button>
        </div>

        <div className="music-bot-now">
          {current ? (
            <>
              <div className="music-bot-now-title" title={current.title}>{current.title}</div>
              <div className="music-bot-progress-row">
                <span className="music-bot-time">{formatClock(positionMs)}</span>
                {durationMs && (
                  <>
                    <div className="music-bot-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                      <div className="music-bot-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="music-bot-time">{formatClock(durationMs)}</span>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="music-bot-now-empty">{nowPlayingText}</div>
          )}
        </div>

        <form
          className="music-bot-search"
          onSubmit={(e) => { e.preventDefault(); void handlePlay() }}
        >
          <input
            className="music-bot-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Link do YouTube ou nome da música"
            aria-label="Link ou nome da música"
            autoFocus
          />
          <button type="submit" className="music-bot-play" disabled={sending}>
            Tocar
          </button>
        </form>

        <div className="music-bot-transport">
          <button
            type="button"
            className="music-bot-icon-btn primary"
            disabled={sending}
            onClick={() => void handleTogglePause()}
            title={pauseLabel}
            aria-label={pauseLabel}
          >
            <PauseToggleIcon style={{ width: 22, height: 22 }} />
          </button>
          <button
            type="button"
            className="music-bot-icon-btn"
            disabled={sending}
            onClick={() => void handleSkip()}
            title="Pular"
            aria-label="Pular"
          >
            <SkipForwardIcon style={{ width: 18, height: 18 }} />
          </button>
          <button
            type="button"
            className="music-bot-icon-btn danger"
            disabled={sending}
            onClick={() => void handleStop()}
            title="Parar e desconectar o bot"
            aria-label="Parar e desconectar o bot"
          >
            <StopSquareIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div className="music-bot-volume">
          <button
            type="button"
            className="music-bot-mute"
            onClick={handleToggleMute}
            title={volume === 0 ? 'Restaurar volume' : 'Silenciar'}
            aria-label={volume === 0 ? 'Restaurar volume' : 'Silenciar'}
          >
            <VolumeStateIcon style={{ width: 18, height: 18 }} />
          </button>
          <input
            className="music-bot-slider"
            type="range"
            min={0}
            max={200}
            step={5}
            value={volume}
            aria-label="Volume do bot"
            onPointerDown={() => { draggingVolume.current = true }}
            onChange={(e) => setVolume(Number(e.target.value))}
            onPointerUp={() => { draggingVolume.current = false; commitVolume(volume) }}
            onKeyUp={() => commitVolume(volume)}
          />
          <span className="music-bot-volume-value">{volume}%</span>
        </div>

        <div className="music-bot-list">
          <div className="music-bot-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'queue'}
              className={`music-bot-tab${tab === 'queue' ? ' active' : ''}`}
              onClick={() => setTab('queue')}
            >
              Fila{queueTotal > 0 ? ` (${queueTotal})` : ''}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'recent'}
              className={`music-bot-tab${tab === 'recent' ? ' active' : ''}`}
              onClick={() => setTab('recent')}
            >
              Recentes
            </button>
            {tab === 'queue' && queueTotal > 0 && (
              <button type="button" className="music-bot-clear" disabled={sending} onClick={handleClear}>
                Limpar
              </button>
            )}
          </div>

          <ul className="music-bot-items">
            {tab === 'queue' && queue.map((item, index) => (
              <li key={item.id ?? `${index}-${item.title}`} className="music-bot-item">
                <span className="music-bot-item-index">{index + 1}</span>
                <span className="music-bot-item-title" title={item.title}>{item.title}</span>
                <span className="music-bot-item-actions">
                  <button
                    type="button"
                    className="music-bot-item-btn"
                    disabled={sending}
                    title="Tocar agora"
                    aria-label={`Tocar agora: ${item.title}`}
                    onClick={() => handlePlayNow(item.id, index + 1, item.title)}
                  >
                    <PlayIcon style={{ width: 14, height: 14 }} />
                  </button>
                  {index > 0 && (
                    <button
                      type="button"
                      className="music-bot-item-btn"
                      disabled={sending}
                      title="Tocar em seguida"
                      aria-label={`Tocar em seguida: ${item.title}`}
                      onClick={() => handlePlayNext(item.id, index + 1, item.title)}
                    >
                      <ArrowUpIcon style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="music-bot-item-btn danger"
                    disabled={sending}
                    title="Remover da fila"
                    aria-label={`Remover da fila: ${item.title}`}
                    onClick={() => handleRemove(item.id, index + 1, item.title)}
                  >
                    <TrashIcon style={{ width: 14, height: 14 }} />
                  </button>
                </span>
              </li>
            ))}
            {tab === 'queue' && queueTotal > queue.length && (
              <li className="music-bot-more">+ {queueTotal - queue.length} na fila</li>
            )}
            {tab === 'queue' && queue.length === 0 && (
              <li className="music-bot-empty">
                {botState || !botPresent
                  ? 'A fila está vazia. Peça outra música acima e, para cada uma da fila, você poderá tocar agora, colocar como próxima ou remover.'
                  : 'Atualize o bot no servidor para ver a fila.'}
              </li>
            )}

            {tab === 'recent' && history.map((item, index) => (
              <li key={`${index}-${item.title}`} className="music-bot-item">
                <span className="music-bot-item-title" title={item.title}>{item.title}</span>
                {item.url && (
                  <span className="music-bot-item-actions always">
                    <button
                      type="button"
                      className="music-bot-item-btn"
                      disabled={sending}
                      title="Tocar de novo"
                      aria-label={`Tocar de novo: ${item.title}`}
                      onClick={() => handleReplay(item.url as string, item.title)}
                    >
                      <PlayIcon style={{ width: 13, height: 13 }} />
                    </button>
                  </span>
                )}
              </li>
            ))}
            {tab === 'recent' && history.length === 0 && (
              <li className="music-bot-empty">As músicas que já tocaram aparecem aqui.</li>
            )}
          </ul>
        </div>

        <p className={`music-bot-status${status?.kind === 'error' ? ' error' : ''}`} role="status" aria-live="polite">
          {status?.text ?? ''}
        </p>
      </div>
    </div>
  )
}
