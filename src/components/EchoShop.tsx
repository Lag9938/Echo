import { useState, type CSSProperties } from 'react'
import {
  AVATAR_DECORATIONS,
  PROFILE_EFFECTS,
  NEON_AURAS,
  CARD_FINISHES,
  NAME_EFFECTS,
  getUserInventory,
  hasUserAcquired,
  acquireCosmetic,
  type DecorationMetadata,
  type ProfileEffectMetadata,
  type AuraMetadata,
  type CardFinishMetadata,
  type NameEffectMetadata,
  type UserInventory
} from '../lib/cosmeticsData'
import { ProfileEffect } from './ProfileEffect'
import { DecoratedAvatar } from './DecoratedAvatar'
import { AvatarDecoration } from './AvatarDecoration'
import {
  ColoredShopBagIcon,
  ColoredBackpackIcon,
  ColoredMaskIcon,
  ColoredSparklesIcon,
  ColoredLightningIcon,
  ColoredGemIcon,
  ColoredGamepadIcon,
  ColoredSoundwaveIcon
} from './ColoredIcons'

interface EchoShopProps {
  userId: string
  displayName: string
  avatarUrl?: string | null
  currentDecoration: string
  currentProfileEffect?: string
  currentAvatarFrame?: string
  currentCardFinish?: string
  currentNameEffect?: string
  onEquipDecoration: (decorationId: string) => Promise<void> | void
  onEquipProfileEffect?: (effectId: string) => Promise<void> | void
  onEquipAvatarFrame?: (frameId: string) => void
  onEquipCardFinish?: (finishId: string) => void
  onEquipNameEffect?: (nameEffectId: string) => void
  initialTab?: ShopTab
  onOpenInventory?: () => void
  onClose?: () => void
}

type ShopTab = 'decorations' | 'profile_effects' | 'auras' | 'finishes' | 'name_effects'

export function EchoShop({
  userId,
  displayName,
  avatarUrl,
  currentDecoration,
  currentProfileEffect = '',
  currentAvatarFrame = 'aura-cyan',
  currentCardFinish = 'none',
  currentNameEffect = 'resonance_cyan',
  onEquipDecoration,
  onEquipProfileEffect,
  onEquipAvatarFrame,
  onEquipCardFinish,
  onEquipNameEffect,
  initialTab,
  onOpenInventory,
  onClose
}: EchoShopProps) {
  const [shopSection, setShopSection] = useState<ShopTab>(initialTab || 'decorations')
  const [, setUserInventory] = useState<UserInventory>(() => getUserInventory(userId))

  // Sync section if initialTab changes
  useState(() => {
    if (initialTab && initialTab !== shopSection) {
      setShopSection(initialTab)
    }
  })

  // Preview States
  const [selectedDecoPreview, setSelectedDecoPreview] = useState<string>(currentDecoration || 'soundwave_orb')
  const [selectedEffectPreview, setSelectedEffectPreview] = useState<string>(currentProfileEffect || 'echo_resonance')
  const [selectedAuraPreview, setSelectedAuraPreview] = useState<string>(currentAvatarFrame || 'aura-cyan')
  const [selectedFinishPreview, setSelectedFinishPreview] = useState<string>(currentCardFinish || 'holographic')
  const [selectedNamePreview, setSelectedNamePreview] = useState<string>(currentNameEffect || 'resonance_cyan')

  // Categories Filter
  const [activeDecoCategory, setActiveDecoCategory] = useState<string>('Todos')
  const [activeEffectCategory, setActiveEffectCategory] = useState<string>('Todos')
  const [activeNameCategory, setActiveNameCategory] = useState<string>('Todos')

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isEquipping, setIsEquipping] = useState(false)

  const decoCategories = ['Todos', 'Aura', 'Fantasia', 'Cyber', 'Animais']
  const effectCategories = ['Todos', 'Áudio & Som', 'Fogo & Energia', 'Natureza', 'Sci-Fi', 'Místico', 'Prestígio']
  const nameCategories = ['Todos', 'Ressonância', 'Energia', 'Cyber', 'Cósmico', 'Prestígio']

  const filteredDecos = activeDecoCategory === 'Todos'
    ? AVATAR_DECORATIONS
    : AVATAR_DECORATIONS.filter(item => item.category === activeDecoCategory)

  const filteredEffects = activeEffectCategory === 'Todos'
    ? PROFILE_EFFECTS
    : PROFILE_EFFECTS.filter(item => item.category === activeEffectCategory)

  const filteredNameEffects = activeNameCategory === 'Todos'
    ? NAME_EFFECTS
    : NAME_EFFECTS.filter(item => item.category === activeNameCategory)

  const previewDecoMeta: DecorationMetadata | undefined = AVATAR_DECORATIONS.find(d => d.id === selectedDecoPreview)
  const previewEffectMeta: ProfileEffectMetadata | undefined = PROFILE_EFFECTS.find(e => e.id === selectedEffectPreview)
  const previewAuraMeta: AuraMetadata | undefined = NEON_AURAS.find(a => a.id === selectedAuraPreview)
  const previewFinishMeta: CardFinishMetadata | undefined = CARD_FINISHES.find(f => f.id === selectedFinishPreview)
  const previewNameMeta: NameEffectMetadata | undefined = NAME_EFFECTS.find(n => n.id === selectedNamePreview)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Acquisition Handlers
  const handleAcquireItem = (category: 'decorations' | 'effects' | 'auras' | 'finishes' | 'name_effects', itemId: string, itemName: string) => {
    const updated = acquireCosmetic(userId, category, itemId)
    setUserInventory({ ...updated })
    showToast(`Parabéns! "${itemName}" foi adicionado ao seu Inventário.`)
  }

  // Equip Handlers
  const handleEquipDeco = async (decoId: string) => {
    setIsEquipping(true)
    try {
      await onEquipDecoration(decoId)
      setSelectedDecoPreview(decoId)
      showToast(decoId === 'none' ? 'Decoração de avatar removida.' : 'Decoração equipada com sucesso!')
    } finally {
      setIsEquipping(false)
    }
  }

  const handleEquipEffect = async (effId: string) => {
    if (!onEquipProfileEffect) return
    setIsEquipping(true)
    try {
      await onEquipProfileEffect(effId)
      setSelectedEffectPreview(effId)
      showToast(effId === 'none' ? 'Efeito de perfil removido.' : 'Efeito de perfil ativado com sucesso!')
    } finally {
      setIsEquipping(false)
    }
  }

  const handleEquipAura = (auraId: string) => {
    if (!onEquipAvatarFrame) return
    onEquipAvatarFrame(auraId)
    setSelectedAuraPreview(auraId)
    showToast('Aura neon equipada com sucesso!')
  }

  const handleEquipFinish = (finishId: string) => {
    if (!onEquipCardFinish) return
    onEquipCardFinish(finishId)
    setSelectedFinishPreview(finishId)
    showToast('Acabamento do card aplicado!')
  }

  const handleEquipName = (nameId: string) => {
    if (!onEquipNameEffect) return
    onEquipNameEffect(nameId)
    setSelectedNamePreview(nameId)
    showToast(nameId === 'none' ? 'Efeito de nome desequipado.' : 'Efeito de nome equipado com sucesso!')
  }

  return (
    <div className="echo-shop-container">
      {/* Dynamic Toast Feedback */}
      {toastMessage && (
        <div className="echo-shop-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="echo-shop-header-row">
        <div className="echo-shop-brand">
          <div className="echo-shop-badge-icon">
            <ColoredShopBagIcon size={24} />
          </div>
          <div>
            <h1 className="echo-shop-title">Loja de Cosméticos do Echo</h1>
            <p className="echo-shop-subtitle">Personalize seu avatar, perfil e presença em tempo real.</p>
          </div>
        </div>

        <div className="echo-shop-header-actions">
          {onOpenInventory && (
            <button
              type="button"
              className="echo-shop-header-btn"
              onClick={onOpenInventory}
              title="Abrir Meu Inventário"
            >
              <ColoredBackpackIcon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              <span>Meu Inventário</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              className="echo-shop-close-btn"
              onClick={onClose}
              title="Voltar ao Chat"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Section Switcher Tabs */}
      <div className="echo-shop-main-tabs">
        <button
          type="button"
          className={`echo-shop-main-tab ${shopSection === 'decorations' ? 'active' : ''}`}
          onClick={() => setShopSection('decorations')}
        >
          <span className="tab-icon"><ColoredMaskIcon size={18} /></span>
          <span>Decorações de Avatar</span>
          <span className="echo-shop-tab-count">{AVATAR_DECORATIONS.length}</span>
        </button>

        <button
          type="button"
          className={`echo-shop-main-tab ${shopSection === 'profile_effects' ? 'active' : ''}`}
          onClick={() => setShopSection('profile_effects')}
        >
          <span className="tab-icon"><ColoredSparklesIcon size={18} /></span>
          <span>Efeitos de Perfil</span>
          <span className="echo-shop-tab-count">{PROFILE_EFFECTS.length}</span>
        </button>

        <button
          type="button"
          className={`echo-shop-main-tab ${shopSection === 'name_effects' ? 'active' : ''}`}
          onClick={() => setShopSection('name_effects')}
        >
          <span className="tab-icon"><ColoredSoundwaveIcon size={18} /></span>
          <span>Efeitos de Nome & Auras</span>
          <span className="echo-shop-tab-count">{NAME_EFFECTS.length}</span>
        </button>

        <button
          type="button"
          className={`echo-shop-main-tab ${shopSection === 'auras' ? 'active' : ''}`}
          onClick={() => setShopSection('auras')}
        >
          <span className="tab-icon"><ColoredLightningIcon size={18} /></span>
          <span>Molduras & Auras Neon</span>
          <span className="echo-shop-tab-count">{NEON_AURAS.length}</span>
        </button>

        <button
          type="button"
          className={`echo-shop-main-tab ${shopSection === 'finishes' ? 'active' : ''}`}
          onClick={() => setShopSection('finishes')}
        >
          <span className="tab-icon"><ColoredGemIcon size={18} /></span>
          <span>Acabamentos de Cartão</span>
          <span className="echo-shop-tab-count">{CARD_FINISHES.length}</span>
        </button>
      </div>

      {/* ── SECTION 1: AVATAR DECORATIONS ───────────────────────────── */}
      {shopSection === 'decorations' && (
        <>
          <div className="echo-shop-showcase-card">
            <div className="echo-shop-preview-side">
              <div className="echo-shop-preview-bubble">
                <DecoratedAvatar
                  avatarUrl={avatarUrl}
                  displayName={displayName}
                  decorationId={selectedDecoPreview}
                  size={96}
                  status="online"
                />
              </div>
              <div className="echo-shop-preview-info">
                <span className="echo-shop-preview-tag">PROVADOR DE AVATAR</span>
                <h2 className="echo-shop-preview-name">{previewDecoMeta?.name || 'Avatar Clássico'}</h2>
                <p className="echo-shop-preview-desc">
                  {previewDecoMeta?.description || 'Avatar sem moldura ou aura ativa.'}
                </p>
                <div className="echo-shop-preview-meta">
                  <span className="echo-shop-pill-category" style={{ borderColor: previewDecoMeta?.themeColor || '#64748b' }}>
                    {previewDecoMeta?.category || 'Básico'}
                  </span>
                </div>
              </div>
            </div>

            <div className="echo-shop-preview-actions">
              {currentDecoration === selectedDecoPreview ? (
                <button className="echo-shop-action-btn active" disabled>
                  ✓ Equipado no Avatar
                </button>
              ) : hasUserAcquired(userId, 'decorations', selectedDecoPreview) ? (
                <button
                  className="echo-shop-action-btn primary"
                  onClick={() => handleEquipDeco(selectedDecoPreview)}
                  disabled={isEquipping}
                >
                  {isEquipping ? 'Equipando...' : 'Equipar Esta Decoração'}
                </button>
              ) : (
                <button
                  className="echo-shop-action-btn acquire"
                  onClick={() => handleAcquireItem('decorations', selectedDecoPreview, previewDecoMeta?.name || 'Decoração')}
                >
                  <ColoredBackpackIcon size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Adquirir Cosmético (Grátis)
                </button>
              )}

              {currentDecoration && currentDecoration !== 'none' && (
                <button
                  className="echo-shop-action-btn secondary"
                  onClick={() => handleEquipDeco('none')}
                  disabled={isEquipping}
                >
                  Remover Decoração
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="echo-shop-category-bar">
            {decoCategories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`echo-shop-cat-btn ${activeDecoCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveDecoCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Catalog Grid */}
          <div className="echo-shop-grid">
            {filteredDecos.map(item => {
              const isEquipped = currentDecoration === item.id
              const isAcquired = hasUserAcquired(userId, 'decorations', item.id)
              const isSelectedInPreview = selectedDecoPreview === item.id

              return (
                <div
                  key={item.id}
                  className={`echo-shop-card ${isSelectedInPreview ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => setSelectedDecoPreview(item.id)}
                  style={{ '--item-theme': item.themeColor } as CSSProperties}
                >
                  <div className="echo-shop-card-visualizer">
                    <div className="echo-shop-card-avatar-stage">
                      <DecoratedAvatar
                        avatarUrl={avatarUrl}
                        displayName={displayName}
                        decorationId={item.id}
                        size={64}
                        status="online"
                      />
                    </div>
                    <div className="echo-shop-card-badge" style={{ backgroundColor: item.themeColor }}>
                      {item.badge}
                    </div>
                    {isAcquired && (
                      <span className="echo-shop-owned-badge">✓ No Inventário</span>
                    )}
                  </div>

                  <div className="echo-shop-card-content">
                    <div className="echo-shop-card-header">
                      <h3 className="echo-shop-card-title">{item.name}</h3>
                      <span className="echo-shop-card-cat">{item.category}</span>
                    </div>
                    <p className="echo-shop-card-desc">{item.description}</p>
                  </div>

                  <div className="echo-shop-card-footer" onClick={e => e.stopPropagation()}>
                    {isEquipped ? (
                      <button className="echo-shop-equip-btn equipped" disabled>
                        ✓ Equipado
                      </button>
                    ) : isAcquired ? (
                      <button
                        className="echo-shop-equip-btn"
                        onClick={() => handleEquipDeco(item.id)}
                        disabled={isEquipping}
                      >
                        Equipar
                      </button>
                    ) : (
                      <button
                        className="echo-shop-equip-btn acquire-btn"
                        onClick={() => handleAcquireItem('decorations', item.id, item.name)}
                      >
                        Adquirir (Grátis)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── SECTION 2: PROFILE EFFECTS ─────────────────────────────── */}
      {shopSection === 'profile_effects' && (
        <>
          <div className="echo-shop-showcase-card">
            <div className="echo-shop-preview-side effect-preview-mode">
              <div className="echo-shop-mock-profile-card">
                <ProfileEffect effectId={selectedEffectPreview} />
                <div className="mock-card-banner" />
                <div className="mock-card-body">
                  <div className="mock-card-avatar-row">
                    <div className={`mock-card-avatar-squircle ${currentAvatarFrame || 'aura-cyan'}`}>
                      <div className="mock-card-avatar-inner">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} />
                        ) : (
                          (displayName || 'U').slice(0, 1).toUpperCase()
                        )}
                      </div>
                      {currentDecoration && currentDecoration !== 'none' && (
                        <AvatarDecoration decorationId={currentDecoration} />
                      )}
                      <span className="mock-card-status-dot" />
                    </div>
                  </div>
                  <div className="mock-card-meta">
                    <span className="mock-card-name">{displayName || 'Jogador'}</span>
                    <span className="mock-card-handle">@{displayName.toLowerCase().replace(/\s+/g, '_') || 'echo_user'}</span>
                    <span className="mock-card-status">
                      <ColoredGamepadIcon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Em jogo no Echo
                    </span>
                  </div>
                </div>
              </div>

              <div className="echo-shop-preview-info">
                <span className="echo-shop-preview-tag">PROVADOR DE EFEITO DE PERFIL</span>
                <h2 className="echo-shop-preview-name">{previewEffectMeta?.name || 'Nenhum Efeito'}</h2>
                <p className="echo-shop-preview-desc">
                  {previewEffectMeta?.description || 'O card de perfil mantém o estilo minimalista padrão.'}
                </p>
                <div className="echo-shop-preview-meta">
                  <span className="echo-shop-pill-category" style={{ borderColor: previewEffectMeta?.themeColor || '#64748b' }}>
                    {previewEffectMeta?.category || 'Básico'}
                  </span>
                </div>
              </div>
            </div>

            <div className="echo-shop-preview-actions">
              {currentProfileEffect === selectedEffectPreview ? (
                <button className="echo-shop-action-btn active" disabled>
                  ✓ Ativo no Perfil
                </button>
              ) : hasUserAcquired(userId, 'effects', selectedEffectPreview) ? (
                <button
                  className="echo-shop-action-btn primary"
                  onClick={() => handleEquipEffect(selectedEffectPreview)}
                  disabled={isEquipping}
                >
                  {isEquipping ? 'Ativando...' : 'Ativar no Perfil'}
                </button>
              ) : (
                <button
                  className="echo-shop-action-btn acquire"
                  onClick={() => handleAcquireItem('effects', selectedEffectPreview, previewEffectMeta?.name || 'Efeito')}
                >
                  <ColoredBackpackIcon size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Adquirir Cosmético (Grátis)
                </button>
              )}

              {currentProfileEffect && currentProfileEffect !== 'none' && (
                <button
                  className="echo-shop-action-btn secondary"
                  onClick={() => handleEquipEffect('none')}
                  disabled={isEquipping}
                >
                  Remover Efeito de Perfil
                </button>
              )}
            </div>
          </div>

          <div className="echo-shop-category-bar">
            {effectCategories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`echo-shop-cat-btn ${activeEffectCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveEffectCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="echo-shop-grid">
            {filteredEffects.map(effect => {
              const isEquipped = currentProfileEffect === effect.id
              const isAcquired = hasUserAcquired(userId, 'effects', effect.id)
              const isSelectedInPreview = selectedEffectPreview === effect.id

              return (
                <div
                  key={effect.id}
                  className={`echo-shop-card echo-effect-card ${isSelectedInPreview ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => setSelectedEffectPreview(effect.id)}
                  style={{ '--item-theme': effect.themeColor } as CSSProperties}
                >
                  <div className="echo-shop-card-visualizer effect-visualizer">
                    <ProfileEffect effectId={effect.id} />
                    <div className="echo-shop-card-badge" style={{ backgroundColor: effect.themeColor }}>
                      {effect.badge}
                    </div>
                    {isAcquired && (
                      <span className="echo-shop-owned-badge">✓ No Inventário</span>
                    )}
                  </div>

                  <div className="echo-shop-card-content">
                    <div className="echo-shop-card-header">
                      <h3 className="echo-shop-card-title">{effect.name}</h3>
                      <span className="echo-shop-card-cat">{effect.category}</span>
                    </div>
                    <p className="echo-shop-card-desc">{effect.description}</p>
                  </div>

                  <div className="echo-shop-card-footer" onClick={e => e.stopPropagation()}>
                    {isEquipped ? (
                      <button className="echo-shop-equip-btn equipped" disabled>
                        ✓ Ativo
                      </button>
                    ) : isAcquired ? (
                      <button
                        className="echo-shop-equip-btn"
                        onClick={() => handleEquipEffect(effect.id)}
                        disabled={isEquipping}
                      >
                        Ativar no Perfil
                      </button>
                    ) : (
                      <button
                        className="echo-shop-equip-btn acquire-btn"
                        onClick={() => handleAcquireItem('effects', effect.id, effect.name)}
                      >
                        Adquirir (Grátis)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── SECTION 3: NEON AURAS & FRAMES (MIGRATED FROM SETTINGS) ─── */}
      {shopSection === 'auras' && (
        <>
          <div className="echo-shop-showcase-card">
            <div className="echo-shop-preview-side">
              <div className="echo-shop-preview-bubble">
                <div
                  className={`echo-hero-avatar-squircle ${selectedAuraPreview}`}
                  style={{ width: '96px', height: '96px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <DecoratedAvatar
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    decorationId={currentDecoration}
                    size={80}
                    status="online"
                  />
                </div>
              </div>
              <div className="echo-shop-preview-info">
                <span className="echo-shop-preview-tag">PROVADOR DE AURA NEON</span>
                <h2 className="echo-shop-preview-name">{previewAuraMeta?.name || 'Aura Padrão'}</h2>
                <p className="echo-shop-preview-desc">
                  {previewAuraMeta?.description || 'Moldura circular com brilho incandescente contínuo.'}
                </p>
                <div className="echo-shop-preview-meta">
                  <span className="echo-shop-pill-category" style={{ borderColor: previewAuraMeta?.color || '#00f2fe' }}>
                    {previewAuraMeta?.category || 'Aura'}
                  </span>
                </div>
              </div>
            </div>

            <div className="echo-shop-preview-actions">
              {currentAvatarFrame === selectedAuraPreview ? (
                <button className="echo-shop-action-btn active" disabled>
                  ✓ Ativa no Avatar
                </button>
              ) : hasUserAcquired(userId, 'auras', selectedAuraPreview) ? (
                <button
                  className="echo-shop-action-btn primary"
                  onClick={() => handleEquipAura(selectedAuraPreview)}
                >
                  Equipar Esta Aura
                </button>
              ) : (
                <button
                  className="echo-shop-action-btn acquire"
                  onClick={() => handleAcquireItem('auras', selectedAuraPreview, previewAuraMeta?.name || 'Aura')}
                >
                  <ColoredBackpackIcon size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Adquirir Cosmético (Grátis)
                </button>
              )}
            </div>
          </div>

          <div className="echo-shop-grid">
            {NEON_AURAS.map(aura => {
              const isEquipped = currentAvatarFrame === aura.id
              const isAcquired = hasUserAcquired(userId, 'auras', aura.id)
              const isSelectedInPreview = selectedAuraPreview === aura.id

              return (
                <div
                  key={aura.id}
                  className={`echo-shop-card ${isSelectedInPreview ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => setSelectedAuraPreview(aura.id)}
                  style={{ '--item-theme': aura.color } as CSSProperties}
                >
                  <div className="echo-shop-card-visualizer">
                    <div className="echo-shop-card-avatar-stage">
                      <div
                        className={`echo-hero-avatar-squircle ${aura.id}`}
                        style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <DecoratedAvatar
                          avatarUrl={avatarUrl}
                          displayName={displayName}
                          size={54}
                          status="online"
                        />
                      </div>
                    </div>
                    <div className="echo-shop-card-badge" style={{ backgroundColor: aura.color, color: aura.id === 'aura-stealth' ? '#111' : '#fff' }}>
                      {aura.badge}
                    </div>
                    {isAcquired && (
                      <span className="echo-shop-owned-badge">✓ No Inventário</span>
                    )}
                  </div>

                  <div className="echo-shop-card-content">
                    <div className="echo-shop-card-header">
                      <h3 className="echo-shop-card-title">{aura.name}</h3>
                      <span className="echo-shop-card-cat">{aura.category}</span>
                    </div>
                    <p className="echo-shop-card-desc">{aura.description}</p>
                  </div>

                  <div className="echo-shop-card-footer" onClick={e => e.stopPropagation()}>
                    {isEquipped ? (
                      <button className="echo-shop-equip-btn equipped" disabled>
                        ✓ Ativa
                      </button>
                    ) : isAcquired ? (
                      <button
                        className="echo-shop-equip-btn"
                        onClick={() => handleEquipAura(aura.id)}
                      >
                        Equipar
                      </button>
                    ) : (
                      <button
                        className="echo-shop-equip-btn acquire-btn"
                        onClick={() => handleAcquireItem('auras', aura.id, aura.name)}
                      >
                        Adquirir (Grátis)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── SECTION 4: CARD FINISHES (FOIL & SHIMMER) ───────────────── */}
      {shopSection === 'finishes' && (
        <>
          <div className="echo-shop-showcase-card">
            <div className="echo-shop-preview-side">
              <div className="echo-shop-finish-stage-wrap">
                <div className={`echo-preview-finish-box preview-${selectedFinishPreview}`}>
                  <DecoratedAvatar
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    decorationId={currentDecoration}
                    size={48}
                    status="online"
                  />
                  <div className="finish-meta-demo">
                    <strong className="finish-meta-name">{displayName}</strong>
                    <span className="finish-meta-tag">{previewFinishMeta?.name}</span>
                  </div>
                </div>
              </div>
              <div className="echo-shop-preview-info">
                <span className="echo-shop-preview-tag">PROVADOR DE ACABAMENTO</span>
                <h2 className="echo-shop-preview-name">{previewFinishMeta?.name || 'Acabamento Padrão'}</h2>
                <p className="echo-shop-preview-desc">
                  {previewFinishMeta?.description || 'Textura visual e acabamento reflexivo no card do perfil.'}
                </p>
                <div className="echo-shop-preview-meta">
                  <span className="echo-shop-pill-category" style={{ borderColor: '#6366f1' }}>
                    {previewFinishMeta?.badge || 'Acabamento'}
                  </span>
                </div>
              </div>
            </div>

            <div className="echo-shop-preview-actions">
              {currentCardFinish === selectedFinishPreview ? (
                <button className="echo-shop-action-btn active" disabled>
                  ✓ Ativo no Perfil
                </button>
              ) : hasUserAcquired(userId, 'finishes', selectedFinishPreview) ? (
                <button
                  className="echo-shop-action-btn primary"
                  onClick={() => handleEquipFinish(selectedFinishPreview)}
                >
                  Equipar Este Acabamento
                </button>
              ) : (
                <button
                  className="echo-shop-action-btn acquire"
                  onClick={() => handleAcquireItem('finishes', selectedFinishPreview, previewFinishMeta?.name || 'Acabamento')}
                >
                  <ColoredBackpackIcon size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Adquirir Cosmético (Grátis)
                </button>
              )}
            </div>
          </div>

          <div className="echo-shop-grid">
            {CARD_FINISHES.map(finish => {
              const isEquipped = currentCardFinish === finish.id
              const isAcquired = hasUserAcquired(userId, 'finishes', finish.id)
              const isSelectedInPreview = selectedFinishPreview === finish.id

              return (
                <div
                  key={finish.id}
                  className={`echo-shop-card echo-finish-card ${isSelectedInPreview ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => setSelectedFinishPreview(finish.id)}
                >
                  <div className={`echo-shop-card-visualizer finish-card-visualizer preview-${finish.id}`}>
                    <div className="finish-card-art">
                      <div className="finish-art-avatar">
                        <DecoratedAvatar
                          avatarUrl={avatarUrl}
                          displayName={displayName}
                          size={38}
                          status="online"
                        />
                      </div>
                      <div className="finish-art-lines">
                        <span className="art-line name" />
                        <span className="art-line desc" />
                      </div>
                    </div>
                    <div className="echo-shop-card-badge" style={{ backgroundColor: '#475569' }}>
                      {finish.badge}
                    </div>
                    {isAcquired && (
                      <span className="echo-shop-owned-badge">✓ No Inventário</span>
                    )}
                  </div>

                  <div className="echo-shop-card-content">
                    <div className="echo-shop-card-header">
                      <h3 className="echo-shop-card-title">{finish.name}</h3>
                    </div>
                    <p className="echo-shop-card-desc">{finish.description}</p>
                  </div>

                  <div className="echo-shop-card-footer" onClick={e => e.stopPropagation()}>
                    {isEquipped ? (
                      <button className="echo-shop-equip-btn equipped" disabled>
                        ✓ Ativo
                      </button>
                    ) : isAcquired ? (
                      <button
                        className="echo-shop-equip-btn"
                        onClick={() => handleEquipFinish(finish.id)}
                      >
                        Equipar
                      </button>
                    ) : (
                      <button
                        className="echo-shop-equip-btn acquire-btn"
                        onClick={() => handleAcquireItem('finishes', finish.id, finish.name)}
                      >
                        Adquirir (Grátis)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── SECTION 5: NAME EFFECTS & SOUND AURAS ──────────────────────── */}
      {shopSection === 'name_effects' && (
        <>
          <div className="echo-shop-showcase-card">
            <div className="echo-shop-showcase-body">
              <div className="echo-shop-preview-side" style={{ minWidth: '320px' }}>
                <div
                  className="echo-shop-name-stage member-card has-name-effect"
                  style={{
                    '--member-aura-border': `${previewNameMeta?.themeColor || '#00f2fe'}55`,
                    '--member-aura-bg': `${previewNameMeta?.themeColor || '#00f2fe'}15`,
                    '--member-aura-shadow': `${previewNameMeta?.themeColor || '#00f2fe'}33`
                  } as CSSProperties}
                >
                  <DecoratedAvatar
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    decorationId={currentDecoration}
                    size={46}
                    status="online"
                  />
                  <div className="member-info">
                    <div className="member-name-row">
                      <span className={`echo-shop-name-preview-text name-effect-${previewNameMeta?.id || 'none'}`}>
                        {displayName}
                      </span>
                      <span className="name-soundwave-indicator">
                        <span className="name-soundwave-bar" style={{ background: previewNameMeta?.themeColor || '#00f2fe' }} />
                        <span className="name-soundwave-bar" style={{ background: previewNameMeta?.themeColor || '#00f2fe' }} />
                        <span className="name-soundwave-bar" style={{ background: previewNameMeta?.themeColor || '#00f2fe' }} />
                      </span>
                      <span
                        className="name-effect-badge-tag"
                        style={{
                          backgroundColor: `${previewNameMeta?.themeColor || '#00f2fe'}20`,
                          color: previewNameMeta?.themeColor || '#00f2fe',
                          border: `1px solid ${previewNameMeta?.themeColor || '#00f2fe'}50`
                        }}
                      >
                        {previewNameMeta?.badge || 'ORIGIN'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Membro do Servidor • Online</span>
                  </div>
                </div>
              </div>

              <div className="echo-shop-preview-info">
                <span className="echo-shop-preview-tag">PROVADOR DE NOME & AURA</span>
                <h2 className="echo-shop-preview-name">{previewNameMeta?.name || 'Pulso Ressonante'}</h2>
                <p className="echo-shop-preview-desc">
                  {previewNameMeta?.description || 'Destaque visual exclusivo para seu nome na lista de membros e no chat em tempo real.'}
                </p>
                <div className="echo-shop-preview-meta">
                  <span className="echo-shop-pill-category" style={{ borderColor: previewNameMeta?.themeColor || '#00f2fe' }}>
                    {previewNameMeta?.category || 'Ressonância'}
                  </span>
                  <span className="echo-shop-pill-fps" style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ColoredSoundwaveIcon size={14} style={{ verticalAlign: 'middle' }} /> Onda Harmônica
                  </span>
                </div>
              </div>
            </div>

            <div className="echo-shop-preview-actions">
              {currentNameEffect === selectedNamePreview ? (
                <button className="echo-shop-action-btn active" disabled>
                  ✓ Equipado no Nome
                </button>
              ) : hasUserAcquired(userId, 'name_effects', selectedNamePreview) ? (
                <button
                  className="echo-shop-action-btn primary"
                  onClick={() => handleEquipName(selectedNamePreview)}
                >
                  Equipar no Meu Nome
                </button>
              ) : (
                <button
                  className="echo-shop-action-btn acquire"
                  onClick={() => handleAcquireItem('name_effects', selectedNamePreview, previewNameMeta?.name || 'Efeito de Nome')}
                >
                  <ColoredBackpackIcon size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Adquirir Cosmético (Grátis)
                </button>
              )}

              {currentNameEffect && currentNameEffect !== 'none' && (
                <button
                  className="echo-shop-action-btn secondary"
                  onClick={() => handleEquipName('none')}
                >
                  Remover Efeito
                </button>
              )}
            </div>
          </div>

          <div className="echo-shop-category-bar">
            {nameCategories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`echo-shop-cat-btn ${activeNameCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveNameCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="echo-shop-grid">
            {filteredNameEffects.map(item => {
              const isEquipped = currentNameEffect === item.id
              const isAcquired = hasUserAcquired(userId, 'name_effects', item.id)
              const isSelectedInPreview = selectedNamePreview === item.id

              return (
                <div
                  key={item.id}
                  className={`echo-shop-card ${isSelectedInPreview ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => setSelectedNamePreview(item.id)}
                  style={{ '--item-theme': item.themeColor } as CSSProperties}
                >
                  <div className="echo-shop-card-visualizer" style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '95px' }}>
                    <span className={`echo-shop-name-preview-text name-effect-${item.id}`} style={{ fontSize: '15px' }}>
                      {displayName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                      <span className="name-soundwave-indicator">
                        <span className="name-soundwave-bar" style={{ background: item.themeColor }} />
                        <span className="name-soundwave-bar" style={{ background: item.themeColor }} />
                        <span className="name-soundwave-bar" style={{ background: item.themeColor }} />
                      </span>
                      <span className="name-effect-badge-tag" style={{ backgroundColor: `${item.themeColor}20`, color: item.themeColor, border: `1px solid ${item.themeColor}50`, fontSize: '8.5px' }}>
                        {item.badge}
                      </span>
                    </div>
                    {isAcquired && (
                      <span className="echo-shop-owned-badge">✓ No Inventário</span>
                    )}
                  </div>

                  <div className="echo-shop-card-content">
                    <div className="echo-shop-card-header">
                      <h3 className="echo-shop-card-title">{item.name}</h3>
                      <span className="echo-shop-card-cat">{item.category}</span>
                    </div>
                    <p className="echo-shop-card-desc">{item.description}</p>
                  </div>

                  <div className="echo-shop-card-footer" onClick={e => e.stopPropagation()}>
                    {isEquipped ? (
                      <button className="echo-shop-equip-btn equipped" disabled>
                        ✓ Ativo
                      </button>
                    ) : isAcquired ? (
                      <button
                        className="echo-shop-equip-btn"
                        onClick={() => handleEquipName(item.id)}
                      >
                        Equipar
                      </button>
                    ) : (
                      <button
                        className="echo-shop-equip-btn acquire-btn"
                        onClick={() => handleAcquireItem('name_effects', item.id, item.name)}
                      >
                        Adquirir (Grátis)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
