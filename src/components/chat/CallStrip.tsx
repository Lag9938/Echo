import { memo } from 'react'
import type { CallSummary } from '../../lib/voiceActivity'
import { useMusicBotStore } from '../../stores/useMusicBotStore'

interface CallStripProps {
  summary: CallSummary
  /** A própria pessoa já está conectada nessa chamada */
  isInCall: boolean
  onJoin: (channelId: string) => void
}

const MAX_AVATARS = 4

/** Faixa no topo do chat de texto com a chamada em andamento: quem está nela, o que estão fazendo e um botão para entrar. */
export const CallStrip = memo(function CallStrip({ summary, isInCall, onJoin }: CallStripProps) {
  const musicTitle = useMusicBotStore((s) => (isInCall && s.state?.status === 'playing' ? s.state.current?.title ?? null : null))
  const shown = summary.people.slice(0, MAX_AVATARS)
  const extra = summary.people.length - shown.length
  const count = summary.people.length
  const detail = summary.activityText ?? (musicTitle ? `Tocando: ${musicTitle}` : null)

  return (
    <div className="call-strip" role="region" aria-label="Chamada em andamento">
      <div className="call-strip-avatars">
        {shown.map((person) => (
          <span key={person.userId} className="call-strip-avatar" title={person.displayName}>
            {person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : person.displayName.slice(0, 1).toUpperCase()}
          </span>
        ))}
        {extra > 0 && <span className="call-strip-avatar more">+{extra}</span>}
      </div>
      <div className="call-strip-text">
        <div className="call-strip-main">
          <i className="call-strip-dot" aria-hidden="true" />
          <b>{count} {count === 1 ? 'pessoa' : 'pessoas'} na call</b>
          <span className="call-strip-channel"> {summary.channelName}</span>
        </div>
        {detail && <div className="call-strip-detail" title={detail}>{detail}</div>}
      </div>
      <button type="button" className="call-strip-btn" onClick={() => onJoin(summary.channelId)}>
        {isInCall ? 'Abrir' : 'Entrar'}
      </button>
    </div>
  )
})
