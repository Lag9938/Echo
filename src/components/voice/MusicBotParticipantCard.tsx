import { useState, useEffect } from 'react'
import type { VoiceParticipant } from '../../lib/useVoiceChannel'
import { useMusicBotStore } from '../../stores/useMusicBotStore'
import { resolveMusicBotAvatarUrl } from '../../lib/musicBotAvatars'
import { formatClock, getCurrentPositionMs } from '../../lib/musicBotState'
import { supabase } from '../../lib/supabase'
import {
  MusicIcon,
  PaletteIcon,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  VolumeIcon
} from '../icons'

interface MusicBotParticipantCardProps {
  participant: VoiceParticipant
  channelId: string | null
  userId: string
  onOpenModal: () => void
  onOpenAvatarPicker: () => void
}

export function MusicBotParticipantCard({
  participant,
  channelId,
  userId,
  onOpenModal,
  onOpenAvatarPicker
}: MusicBotParticipantCardProps) {
  const botState = useMusicBotStore((s) => s.state)
  const receivedAt = useMusicBotStore((s) => s.receivedAt)
  const myVolume = useMusicBotStore((s) => s.myVolume)
  const setMyVolume = useMusicBotStore((s) => s.setMyVolume)
  const myAvatar = useMusicBotStore((s) => s.myAvatar)

  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const isPlaying = botState ? botState.status === 'playing' : participant.isSpeaking
  const isPaused = botState?.status === 'paused'
  const currentTrack = botState?.current

  // Atualiza relógio da faixa quando estiver tocando
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isPlaying])

  const sendQuickCommand = async (cmd: string) => {
    if (!channelId || !supabase) return
    try {
      await supabase.from('messages').insert({
        channel_id: channelId,
        author_id: userId,
        body: cmd
      })
    } catch (err) {
      console.error('Erro ao enviar comando rápido ao bot:', err)
    }
  }

  const handleTogglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPaused) {
      void sendQuickCommand('!resume')
    } else {
      void sendQuickCommand('!pause')
    }
  }

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation()
    void sendQuickCommand('!skip')
  }

  const avatarUrl = resolveMusicBotAvatarUrl(myAvatar)
  const isLetterE = myAvatar === 'letter-e'

  const positionMs = botState ? getCurrentPositionMs(botState, receivedAt, now) : 0
  const clockText = currentTrack?.durationSeconds
    ? `${formatClock(positionMs)} / ${formatClock(currentTrack.durationSeconds * 1000)}`
    : null

  return (
    <div
      className={`participant-card music-bot-card ${isPlaying ? 'is-playing' : ''} ${isPaused ? 'is-paused' : ''}`}
      onClick={onOpenModal}
      style={{
        cursor: 'pointer',
        position: 'relative',
        userSelect: 'none'
      }}
      title="Clique para abrir o painel de música"
    >
      {/* Topo do Card: Badge de Estado & Ações Rápidas no Hover */}
      <div className="music-bot-card-top">
        {/* Badge Tocando / Ao Vivo */}
        <div className={`music-bot-live-badge ${isPlaying ? 'playing' : ''}`}>
          {isPlaying && (
            <div className="music-bot-eq-wrap">
              <span className="music-bot-eq-bar" />
              <span className="music-bot-eq-bar" />
              <span className="music-bot-eq-bar" />
              <span className="music-bot-eq-bar" />
            </div>
          )}
          <span>{isPlaying ? 'TOCANDO' : isPaused ? 'PAUSADO' : 'CONECTADO'}</span>
        </div>

        {/* Controles Rápidos Sutis no Topo Direito (Hover) */}
        <div
          className="music-bot-hover-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botão de Trocar Ícone */}
          <button
            type="button"
            className="music-bot-quick-btn"
            onClick={(e) => {
              e.stopPropagation()
              onOpenAvatarPicker()
            }}
            title="Escolher ícone do bot"
          >
            <PaletteIcon style={{ width: '13px', height: '13px' }} />
          </button>

          {/* Slider de Volume Pessoal */}
          <div
            className="music-bot-vol-container"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              type="button"
              className="music-bot-quick-btn"
              title={`Volume Pessoal: ${myVolume}%`}
            >
              <VolumeIcon style={{ width: '14px', height: '14px' }} />
            </button>

            {showVolumeSlider && (
              <div
                className="music-bot-vol-popup"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="music-bot-vol-label">{myVolume}%</span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={myVolume}
                  onChange={(e) => setMyVolume(Number(e.target.value))}
                  className="music-bot-vol-slider"
                />
              </div>
            )}
          </div>

          {/* Play / Pause Rápido */}
          <button
            type="button"
            className="music-bot-quick-btn"
            onClick={handleTogglePlayPause}
            title={isPaused ? 'Continuar música' : 'Pausar música'}
          >
            {isPaused ? (
              <PlayIcon style={{ width: '13px', height: '13px' }} />
            ) : (
              <PauseIcon style={{ width: '13px', height: '13px' }} />
            )}
          </button>

          {/* Skip Rápido */}
          <button
            type="button"
            className="music-bot-quick-btn"
            onClick={handleSkip}
            title="Pular faixa (!skip)"
          >
            <SkipForwardIcon style={{ width: '13px', height: '13px' }} />
          </button>
        </div>
      </div>

      {/* Centro: Avatar Circular */}
      <div className="music-bot-center-avatar-wrap">
        <div className="music-bot-avatar-inner-rel">
          {/* Ondas Sonoras / Ripple Ring (Pulsa ao tocar som) */}
          {isPlaying && <div className="music-bot-ripple" />}

          {/* Círculo do Avatar com Gradiente */}
          <div
            className="music-bot-avatar-circle"
            onClick={(e) => {
              e.stopPropagation()
              onOpenAvatarPicker()
            }}
            title="Clique para trocar o ícone do bot"
          >
            {isLetterE ? (
              <div className="music-bot-letter-e">E</div>
            ) : (
              <img
                src={avatarUrl}
                alt="Echo Music Bot"
                className="music-bot-avatar-img"
              />
            )}

            {/* Hover overlay no avatar para trocar */}
            <div className="music-bot-avatar-hover-hint">
              <span>Mudar</span>
            </div>
          </div>
        </div>

        {/* Detalhes da Faixa Musical Atual */}
        <div className="music-bot-track-info">
          <span className="music-bot-track-title">
            {currentTrack?.title || (isPaused ? 'Música Pausada' : 'Aguardando fila (!play)')}
          </span>
          {clockText && (
            <span className="music-bot-track-clock">{clockText}</span>
          )}
        </div>
      </div>

      {/* Rodapé: Pílula "Echo Music Bot" e Tag BOT */}
      <div className="music-bot-card-bottom">
        <div className="music-bot-pill-badge">
          <MusicIcon style={{ width: '13px', height: '13px' }} />
          <span>Echo Music Bot</span>
        </div>

        <span className="music-bot-tag">BOT</span>
      </div>
    </div>
  )
}
