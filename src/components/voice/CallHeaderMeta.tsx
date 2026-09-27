import { memo, useEffect, useState } from 'react'
import { useCallStatsStore } from '../../stores/useCallStatsStore'
import { gradeConnection, type ConnectionGrade } from '../../lib/rtcStats'

/** "5:04" ou "1:02:09" a partir de segundos */
export function formatCallClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${ss}` : `${minutes}:${ss}`
}

export function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? 'pessoa' : 'pessoas'}`
}

/** Tempo desde que a própria pessoa entrou na chamada (atualiza a cada segundo) */
export const CallElapsed = memo(function CallElapsed() {
  const joinedAt = useCallStatsStore((s) => s.joinedAt)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (joinedAt === null) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [joinedAt])

  if (joinedAt === null) return null
  return <span className="call-meta-value">{formatCallClock((now - joinedAt) / 1000)}</span>
})

const GRADE_LABEL: Record<ConnectionGrade, string> = {
  good: 'Boa',
  mid: 'Instável',
  poor: 'Ruim'
}

/** Indicador de qualidade da conexão, calculado com as medições reais do WebRTC */
export const ConnectionPill = memo(function ConnectionPill() {
  const stats = useCallStatsStore((s) => s.stats)
  const unstable = useCallStatsStore((s) => s.unstable)

  const measured = gradeConnection(stats)
  // Reconectando ou aviso de rede do LiveKit: nunca mostra "Boa"
  const grade: ConnectionGrade = unstable && measured === 'good' ? 'mid' : measured

  const details = stats
    ? `Latência ${stats.ping} ms · Jitter ${stats.jitter} ms · Perda de pacotes ${stats.packetLoss}%`
    : 'Medindo a conexão...'

  return (
    <span className={`conn-pill ${grade}`} title={details}>
      <span className="conn-bars" aria-hidden="true"><i /><i /><i /><i /></span>
      {GRADE_LABEL[grade]}
      {stats && <span className="conn-ms">{stats.ping} ms</span>}
    </span>
  )
})
