import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Channel, RolePermissions } from '../../types'
import {
  ChevronDownIcon,
  CloseXIcon,
  HeadphonesIcon,
  LogOutIcon,
  MicOffIcon,
  ShieldIcon,
  VolumeIcon,
  VolumeXIcon
} from '../icons'

export interface VolumeControlUser {
  userId: string
  displayName: string
  avatarUrl?: string
}

export interface VolumeControlModalProps {
  volumeControlUser: VolumeControlUser | null
  onClose: () => void
  userVolumes: Record<string, number>
  setUserVolumes: (v: Record<string, number>) => void
  userStereoPans: Record<string, number>
  setUserStereoPans: (p: Record<string, number>) => void
  changePeerPan: (peerId: string, panVal: number) => void
  spatialAudioEnabled: boolean
  setSpatialAudioEnabledState: (enabled: boolean) => void
  participants: { userId: string }[]
  currentUserId: string
  // Moderation props
  spaceId?: string
  isSpaceOwner?: boolean
  canUserDo?: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  availableVoiceChannels?: Channel[]
  serverMuteParticipant?: (userId: string) => Promise<boolean>
  disconnectParticipant?: (userId: string) => Promise<boolean>
  moveParticipant?: (userId: string, targetChannelId: string, targetChannelName?: string) => Promise<boolean>
}

const DEFAULT_VOLUME = 100
const VOLUME_PRESETS = [50, 100, 150]
const CONFIRM_WINDOW_MS = 3000

function volumeHint(volume: number): string {
  if (volume === 0) return 'Mudo só para você'
  if (volume < DEFAULT_VOLUME) return 'Mais baixo que o normal'
  if (volume === DEFAULT_VOLUME) return 'Volume normal'
  return 'Amplificado: acima de 100% pode distorcer'
}

function panLabel(pan: number): string {
  const percent = Math.round(Math.abs(pan) * 100)
  if (percent === 0) return 'Centro'
  return pan < 0 ? `${percent}% para a esquerda` : `${percent}% para a direita`
}

/** Faixa preenchida do controle de posição: parte do centro e vai até o valor (esquerda ou direita) */
function panTrackStyle(pan: number): CSSProperties {
  const from = 50 + Math.min(0, pan) * 50
  const to = 50 + Math.max(0, pan) * 50
  return { '--from': `${from}%`, '--to': `${to}%` } as CSSProperties
}

export function VolumeControlModal({
  volumeControlUser,
  onClose,
  userVolumes,
  setUserVolumes,
  userStereoPans,
  setUserStereoPans,
  changePeerPan,
  spatialAudioEnabled,
  setSpatialAudioEnabledState,
  participants,
  currentUserId,
  spaceId,
  isSpaceOwner,
  canUserDo,
  availableVoiceChannels,
  serverMuteParticipant,
  disconnectParticipant,
  moveParticipant
}: VolumeControlModalProps) {
  const [moderationOpen, setModerationOpen] = useState(false)
  const [mutedFeedback, setMutedFeedback] = useState(false)
  const [confirmingKick, setConfirmingKick] = useState(false)
  const [selectedMoveChannelId, setSelectedMoveChannelId] = useState('')
  // Volume de antes de silenciar: o botão de silenciar devolve a pessoa a esse volume, e não a 100%
  const volumeBeforeMute = useRef(DEFAULT_VOLUME)
  const userId = volumeControlUser?.userId

  // Ao trocar de pessoa, volta ao estado inicial
  useEffect(() => {
    setModerationOpen(false)
    setMutedFeedback(false)
    setConfirmingKick(false)
    setSelectedMoveChannelId('')
    volumeBeforeMute.current = DEFAULT_VOLUME
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [userId, onClose])

  useEffect(() => {
    if (!confirmingKick) return
    const timer = setTimeout(() => setConfirmingKick(false), CONFIRM_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [confirmingKick])

  if (!volumeControlUser) return null

  const peerId = volumeControlUser.userId
  const volume = userVolumes[peerId] !== undefined ? userVolumes[peerId] : DEFAULT_VOLUME
  const pan = userStereoPans[peerId] !== undefined ? userStereoPans[peerId] : 0
  const otherPeers = participants.filter(p => p.userId !== currentUserId)
  const initial = (volumeControlUser.displayName || '?').trim().charAt(0).toUpperCase()

  const setVolume = (value: number) => {
    const next = { ...userVolumes, [peerId]: value }
    setUserVolumes(next)
    localStorage.setItem('echo-user-volumes', JSON.stringify(next))
  }

  const toggleMute = () => {
    if (volume > 0) {
      volumeBeforeMute.current = volume
      setVolume(0)
    } else {
      setVolume(volumeBeforeMute.current || DEFAULT_VOLUME)
    }
  }

  const enableSpatialAudio = () => {
    if (spatialAudioEnabled) return
    setSpatialAudioEnabledState(true)
    localStorage.setItem('echo-spatial-audio-enabled', 'true')
  }

  const setPan = (value: number) => {
    const next = { ...userStereoPans, [peerId]: value }
    setUserStereoPans(next)
    localStorage.setItem('echo-user-stereo-pans', JSON.stringify(next))
    changePeerPan(peerId, value)
    enableSpatialAudio()
  }

  const spreadEveryone = () => {
    const count = otherPeers.length
    const next = { ...userStereoPans }
    otherPeers.forEach((p, idx) => {
      const value = count === 1 ? 0 : -0.75 + (1.5 / (count - 1)) * idx
      const rounded = Math.round(value * 100) / 100
      next[p.userId] = rounded
      changePeerPan(p.userId, rounded)
    })
    setUserStereoPans(next)
    localStorage.setItem('echo-user-stereo-pans', JSON.stringify(next))
    enableSpatialAudio()
  }

  const isOwnerOrAdmin = isSpaceOwner || (canUserDo && spaceId && currentUserId ? canUserDo(spaceId, currentUserId, 'administrator') : false)
  const can = (perm: keyof RolePermissions) =>
    isOwnerOrAdmin || (canUserDo && spaceId && currentUserId ? canUserDo(spaceId, currentUserId, perm) : false)
  const canMute = can('muteMembers')
  const canDisconnect = can('disconnectMembers')
  const canMove = can('moveMembers') && !!availableVoiceChannels && availableVoiceChannels.length > 0
  const canModerateAny = peerId !== currentUserId && (canMute || canDisconnect || canMove)

  const VolumeStateIcon = volume === 0 ? VolumeXIcon : VolumeIcon

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="member-audio-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Áudio de ${volumeControlUser.displayName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="member-audio-header">
          <div className="member-audio-avatar">
            {volumeControlUser.avatarUrl ? <img src={volumeControlUser.avatarUrl} alt="" /> : <span>{initial}</span>}
          </div>
          <div className="member-audio-heading">
            <h3 className="member-audio-title" title={volumeControlUser.displayName}>{volumeControlUser.displayName}</h3>
            <span className="member-audio-subtitle">Só você ouve estes ajustes</span>
          </div>
          <button type="button" className="member-audio-close" onClick={onClose} aria-label="Fechar">
            <CloseXIcon />
          </button>
        </div>

        <section className="member-audio-card">
          <div className="member-audio-card-head">
            <span className="member-audio-card-title">Volume</span>
            <span className={`member-audio-value${volume > DEFAULT_VOLUME ? ' boosted' : ''}${volume === 0 ? ' muted' : ''}`}>{volume}%</span>
          </div>

          <div className="member-audio-slider-row">
            <button
              type="button"
              className={`member-audio-mute${volume === 0 ? ' active' : ''}`}
              onClick={toggleMute}
              title={volume === 0 ? 'Voltar a ouvir' : 'Silenciar só para mim'}
              aria-label={volume === 0 ? 'Voltar a ouvir' : 'Silenciar só para mim'}
              aria-pressed={volume === 0}
            >
              <VolumeStateIcon style={{ width: 18, height: 18 }} />
            </button>
            <div className="member-audio-slider-wrap">
              <input
                className="member-audio-slider"
                type="range"
                min={0}
                max={200}
                step={1}
                value={volume}
                aria-label={`Volume de ${volumeControlUser.displayName}`}
                style={{ '--fill': `${volume / 2}%` } as CSSProperties}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
              <div className="member-audio-scale" aria-hidden="true">
                <span>0</span>
                <span className="mid">normal</span>
                <span>200</span>
              </div>
            </div>
          </div>

          <div className="member-audio-chips">
            {VOLUME_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`member-audio-chip${volume === preset ? ' active' : ''}`}
                onClick={() => setVolume(preset)}
              >
                {preset}%
              </button>
            ))}
            <span className="member-audio-hint">{volumeHint(volume)}</span>
          </div>
        </section>

        <section className="member-audio-card">
          <div className="member-audio-card-head">
            <span className="member-audio-card-title">
              <HeadphonesIcon style={{ width: 15, height: 15 }} />
              Posição no fone
            </span>
            <span className={`member-audio-value small${pan !== 0 ? ' active' : ''}`}>{panLabel(pan)}</span>
          </div>

          <div className="member-audio-pan-row">
            <span className="member-audio-side" aria-hidden="true">E</span>
            <input
              className="member-audio-slider pan"
              type="range"
              min={-100}
              max={100}
              step={1}
              value={Math.round(pan * 100)}
              aria-label={`Posição de ${volumeControlUser.displayName} no fone`}
              aria-valuetext={panLabel(pan)}
              style={panTrackStyle(pan)}
              onChange={(e) => setPan(Number(e.target.value) / 100)}
            />
            <span className="member-audio-side" aria-hidden="true">D</span>
          </div>
          <p className="member-audio-help">Escolha de que lado do fone você ouve esta pessoa.</p>

          <div className="member-audio-actions">
            <button type="button" className="member-audio-btn" onClick={() => setPan(0)} disabled={pan === 0}>
              Centralizar
            </button>
            {otherPeers.length > 1 && (
              <button
                type="button"
                className="member-audio-btn"
                onClick={spreadEveryone}
                title="Espalha todas as pessoas da chamada da esquerda para a direita, para você distinguir quem fala"
              >
                Espalhar todos
              </button>
            )}
          </div>
        </section>

        {canModerateAny && (
          <section className="member-audio-mod">
            <button
              type="button"
              className="member-audio-mod-toggle"
              onClick={() => setModerationOpen((open) => !open)}
              aria-expanded={moderationOpen}
            >
              <ShieldIcon style={{ width: 15, height: 15 }} />
              <span>Moderação</span>
              <span className="member-audio-mod-note">afeta todos na chamada</span>
              <ChevronDownIcon style={{ width: 16, height: 16 }} className={moderationOpen ? 'open' : ''} />
            </button>

            {moderationOpen && (
              <div className="member-audio-mod-body">
                <div className="member-audio-actions">
                  {canMute && (
                    <button
                      type="button"
                      className={`member-audio-btn danger${mutedFeedback ? ' done' : ''}`}
                      onClick={() => {
                        serverMuteParticipant?.(peerId).then(ok => {
                          if (!ok) return
                          setMutedFeedback(true)
                          setTimeout(() => setMutedFeedback(false), 2500)
                        })
                      }}
                    >
                      <MicOffIcon style={{ width: 15, height: 15 }} />
                      {mutedFeedback ? 'Silenciado' : 'Silenciar para todos'}
                    </button>
                  )}

                  {canDisconnect && (
                    <button
                      type="button"
                      className={`member-audio-btn danger${confirmingKick ? ' confirm' : ''}`}
                      onClick={() => {
                        if (!confirmingKick) {
                          setConfirmingKick(true)
                          return
                        }
                        disconnectParticipant?.(peerId)
                        onClose()
                      }}
                    >
                      <LogOutIcon />
                      {confirmingKick ? 'Clique para confirmar' : 'Tirar da chamada'}
                    </button>
                  )}
                </div>

                {canMove && availableVoiceChannels && (
                  <div className="member-audio-move">
                    <select
                      className="member-audio-select"
                      value={selectedMoveChannelId}
                      onChange={(e) => setSelectedMoveChannelId(e.target.value)}
                      aria-label="Canal de voz de destino"
                    >
                      <option value="">Mover para outro canal de voz…</option>
                      {availableVoiceChannels.map((ch) => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="member-audio-btn primary"
                      disabled={!selectedMoveChannelId}
                      onClick={() => {
                        const target = availableVoiceChannels.find((c) => c.id === selectedMoveChannelId)
                        if (target) {
                          moveParticipant?.(peerId, target.id, target.name)
                          onClose()
                        }
                      }}
                    >
                      Mover
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
