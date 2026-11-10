import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface StreamBarPerson {
  id: string
  name: string
  isSpeaking: boolean
  /** O rosto (avatar com selos) */
  face: ReactNode
  onClick?: () => void
  /** Dica ao passar o mouse */
  title?: string
}

/** Quantos rostos cabem na barra da transmissão antes do "+N" */
export const STREAM_BAR_MAX_FACES = 4

/** Quem aparece na barra e quantos ficam no "+N". A ordem é estável (não pula quando alguém começa a falar). */
export function splitStreamBarPeople<T>(people: T[], max = STREAM_BAR_MAX_FACES): { shown: T[]; hidden: T[] } {
  // Com 1 sobrando, mostrar o rosto ocupa o mesmo espaço que o "+1"
  if (people.length <= max + 1) return { shown: people, hidden: [] }
  return { shown: people.slice(0, max), hidden: people.slice(max) }
}

/**
 * Rostos de quem está na sala, na barra da transmissão. Com muita gente, mostra os primeiros e um botão "+N",
 * que ganha o anel verde quando alguém escondido está falando e abre a lista completa (com nomes) ao clicar.
 */
export function StreamBarPeople({ people }: { people: StreamBarPerson[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { shown, hidden } = splitStreamBarPeople(people)
  const hiddenSpeaking = hidden.some(p => p.isSpeaking)

  // Fecha a lista ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (people.length === 0) return null

  return (
    <div className="stream-bar-people" ref={rootRef} role="group" aria-label="Pessoas na chamada">
      {shown.map(p => (
        <button
          key={p.id}
          type="button"
          className={`stream-bar-face ${p.isSpeaking ? 'speaking' : ''}`}
          title={p.title ?? p.name}
          aria-label={p.name}
          onClick={p.onClick}
        >
          {p.face}
        </button>
      ))}
      {hidden.length > 0 && (
        <button
          type="button"
          className={`stream-bar-more ${hiddenSpeaking ? 'speaking' : ''} ${open ? 'open' : ''}`}
          aria-expanded={open}
          aria-label={`Mais ${hidden.length} pessoas na chamada`}
          title={hidden.map(p => p.name).join(', ')}
          onClick={() => setOpen(o => !o)}
        >
          +{hidden.length}
        </button>
      )}
      {open && (
        <div className="stream-bar-people-list" role="list">
          <span className="stream-bar-people-list-title">Na chamada · {people.length}</span>
          {people.map(p => (
            <button
              key={p.id}
              type="button"
              role="listitem"
              className={`stream-bar-people-row ${p.isSpeaking ? 'speaking' : ''}`}
              title={p.title ?? p.name}
              onClick={() => {
                p.onClick?.()
                setOpen(false)
              }}
            >
              <span className="stream-bar-face">{p.face}</span>
              <span className="stream-bar-people-name">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
