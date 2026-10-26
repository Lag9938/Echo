import { DecoratedAvatar } from '../DecoratedAvatar'
import { nameFontStyle } from '../../lib/nameFonts'

export interface ShopLookRow {
  label: string
  value: string
  onChange: () => void
}

/** O item que a pessoa está "provando" na seção aberta (ainda não equipado) */
export interface ShopLookTrial {
  label: string
  /** Pode equipar agora? (já adquirido e, para fontes VIP, com o Echo VIP) */
  canEquip: boolean
  hint?: string
  onEquip: () => void
  onUndo: () => void
}

interface ShopLookPanelProps {
  displayName: string
  avatarUrl?: string | null
  decorationId: string
  nameEffectId?: string
  nameFontId?: string
  rows: ShopLookRow[]
  trial: ShopLookTrial | null
}

/**
 * "Seu visual": o perfil como ele fica agora, sempre à vista ao lado da loja. Ao selecionar um item numa grade ele é
 * aplicado aqui antes de equipar (decoração, fonte e cor do nome), com os botões Equipar e Desfazer.
 */
export function ShopLookPanel({ displayName, avatarUrl, decorationId, nameEffectId, nameFontId, rows, trial }: ShopLookPanelProps) {
  const effectClass = nameEffectId && nameEffectId !== 'none' ? `name-effect-${nameEffectId}` : ''
  return (
    <aside className="shop-look" aria-label="Seu visual">
      <div className="shop-look-banner" />
      <div className="shop-look-body">
        <div className="shop-look-avatar">
          <DecoratedAvatar avatarUrl={avatarUrl} displayName={displayName} decorationId={decorationId} size={84} status="online" />
        </div>
        <span className={`shop-look-name echo-shop-name-preview-text ${effectClass}`} style={{ display: 'inline-block', ...nameFontStyle(nameFontId) }}>
          {displayName}
        </span>
        <div className="shop-look-handle">Seu perfil, como as outras pessoas veem</div>

        <h4 className="shop-look-title">Equipado agora</h4>
        {rows.map((row) => (
          <div className="shop-look-row" key={row.label}>
            <div>
              <b>{row.label}</b>
              <small>{row.value}</small>
            </div>
            <button type="button" onClick={row.onChange}>Trocar</button>
          </div>
        ))}

        {trial && (
          <div className="shop-look-trial">
            <span className="shop-look-trial-label">Provando: {trial.label}</span>
            {trial.hint && <span className="shop-look-trial-hint">{trial.hint}</span>}
            <div className="shop-look-trial-actions">
              <button type="button" className="shop-look-btn primary" disabled={!trial.canEquip} onClick={trial.onEquip}>
                Equipar
              </button>
              <button type="button" className="shop-look-btn" onClick={trial.onUndo}>Desfazer</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
