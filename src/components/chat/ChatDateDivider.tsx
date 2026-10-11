import { memo } from 'react'
import { formatChatDateDivider } from '../../lib/messageFormatter'

export type DayEntry<T> =
  | { kind: 'day'; key: string; date: Date }
  | { kind: 'message'; message: T }

/**
 * Intercala um marcador de dia ("Hoje", "Ontem", "3 de outubro") antes da primeira mensagem de cada dia.
 * Nas conversas diretas e nos grupos só aparecia a hora, e não dava para saber de que dia era a mensagem.
 */
export function withDayDividers<T extends { created_at: string }>(messages: T[]): DayEntry<T>[] {
  const entries: DayEntry<T>[] = []
  let lastDay = ''
  for (const message of messages) {
    const date = new Date(message.created_at)
    const day = Number.isNaN(date.getTime()) ? '' : date.toDateString()
    if (day && day !== lastDay) {
      entries.push({ kind: 'day', key: `day-${day}`, date })
      lastDay = day
    }
    entries.push({ kind: 'message', message })
  }
  return entries
}

/** A mesma linha de data dos canais de texto */
export const ChatDateDivider = memo(function ChatDateDivider({ date }: { date: Date }) {
  return (
    <div className="chat-date-divider">
      <div className="chat-date-line" />
      <span className="chat-date-pill">{formatChatDateDivider(date)}</span>
      <div className="chat-date-line" />
    </div>
  )
})
