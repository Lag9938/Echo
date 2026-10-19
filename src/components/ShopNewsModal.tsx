import { useEffect, useState, type CSSProperties } from 'react'
import { AVATAR_DECORATIONS } from './AvatarDecoration'
import { DecoratedAvatar } from './DecoratedAvatar'
import { useMotionReduced } from '../hooks/useMotionReduced'
import type { ShopDrop } from '../lib/shopDrops'

interface ShopNewsModalProps {
  drop: ShopDrop
  avatarUrl?: string | null
  displayName: string
  /** Fechou sem ir à loja ("Agora não", ✕, Esc ou clique fora) */
  onDismiss: () => void
  onOpenShop: () => void
}

/** Troca do item em destaque, enquanto a pessoa não escolhe um */
const ROTATE_MS = 4000

/**
 * "Novo na Loja": mostra a coleção nova já no avatar da própria pessoa (é o que faz querer pegar), um item por
 * vez. Só uma decoração animada na tela de cada vez, e a lista de itens é feita de pílulas com cor, não de
 * prévias: a janela aparece logo na abertura do app, quando ele ainda está carregando o resto.
 */
export function ShopNewsModal({ drop, avatarUrl, displayName, onDismiss, onOpenShop }: ShopNewsModalProps) {
  const reduced = useMotionReduced()
  const items = drop.items
    .map((item) => AVATAR_DECORATIONS.find((d) => d.id === item.id))
    .filter((d): d is (typeof AVATAR_DECORATIONS)[number] => Boolean(d))
  const [index, setIndex] = useState(0)
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    if (reduced || pinned || items.length < 2) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [reduced, pinned, items.length])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  const active = items[index] ?? items[0]
  if (!active) return null

  return (
    <div className="shop-news-overlay" onClick={onDismiss}>
      <div
        className="shop-news-modal"
        style={{ '--drop-color': active.themeColor } as CSSProperties}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="shop-news-close" onClick={onDismiss} aria-label="Fechar">
          ✕
        </button>

        <div className="shop-news-hero">
          <span className="shop-news-kicker">Novo na Loja</span>
          <DecoratedAvatar
            key={active.id}
            avatarUrl={avatarUrl}
            displayName={displayName}
            decorationId={active.id}
            size={112}
            className="shop-news-avatar"
          />
          <div className="shop-news-item" aria-live="polite">
            <span className="shop-news-item-name">{active.name}</span>
            <span className="shop-news-item-badge">{active.badge}</span>
          </div>
        </div>

        <div className="shop-news-body">
          <h2 className="shop-news-title">{drop.title}</h2>
          <p className="shop-news-tagline">{drop.tagline}</p>

          <div className="shop-news-picks" role="group" aria-label="Itens da coleção">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`shop-news-pick ${i === index ? 'is-active' : ''}`}
                style={{ '--pick-color': item.themeColor } as CSSProperties}
                aria-pressed={i === index}
                onClick={() => {
                  setIndex(i)
                  setPinned(true)
                }}
              >
                <span className="shop-news-pick-dot" aria-hidden="true" />
                {item.name}
              </button>
            ))}
          </div>

          <div className="shop-news-actions">
            <button type="button" className="shop-news-later" onClick={onDismiss}>
              Agora não
            </button>
            <button type="button" className="shop-news-cta" onClick={onOpenShop}>
              Ver na loja
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
