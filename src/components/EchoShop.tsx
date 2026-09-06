import { useState, type CSSProperties } from 'react'
import { AVATAR_DECORATIONS, type DecorationMetadata } from './AvatarDecoration'
import { PROFILE_EFFECTS, type ProfileEffectMetadata, ProfileEffect } from './ProfileEffect'
import { DecoratedAvatar } from './DecoratedAvatar'

interface EchoShopProps {
  displayName: string
  avatarUrl?: string | null
  currentDecoration: string
  currentProfileEffect?: string
  onEquipDecoration: (decorationId: string) => Promise<void> | void
  onEquipProfileEffect?: (effectId: string) => Promise<void> | void
  onClose?: () => void
}

export function EchoShop({
  displayName,
  avatarUrl,
  currentDecoration,
  currentProfileEffect = '',
  onEquipDecoration,
  onEquipProfileEffect,
  onClose
}: EchoShopProps) {
  const [shopSection, setShopSection] = useState<'decorations' | 'profile_effects'>('decorations')
  const [selectedDecoPreview, setSelectedDecoPreview] = useState<string>(currentDecoration || 'soundwave_orb')
  const [selectedEffectPreview, setSelectedEffectPreview] = useState<string>(currentProfileEffect || 'echo_resonance')
  const [activeDecoCategory, setActiveDecoCategory] = useState<string>('Todos')
  const [activeEffectCategory, setActiveEffectCategory] = useState<string>('Todos')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isEquipping, setIsEquipping] = useState(false)

  const decoCategories = ['Todos', 'Aura', 'Fantasia', 'Cyber', 'Animais']
  const effectCategories = ['Todos', 'Áudio & Som', 'Fogo & Energia', 'Natureza', 'Sci-Fi', 'Místico', 'Prestígio']

  const filteredDecos = activeDecoCategory === 'Todos'
    ? AVATAR_DECORATIONS
    : AVATAR_DECORATIONS.filter(item => item.category === activeDecoCategory)

  const filteredEffects = activeEffectCategory === 'Todos'
    ? PROFILE_EFFECTS
    : PROFILE_EFFECTS.filter(item => item.category === activeEffectCategory)

  const previewDecoMeta: DecorationMetadata | undefined = AVATAR_DECORATIONS.find(d => d.id === selectedDecoPreview)
  const previewEffectMeta: ProfileEffectMetadata | undefined = PROFILE_EFFECTS.find(e => e.id === selectedEffectPreview)

  const handleEquipDeco = async (id: string) => {
    setIsEquipping(true)
    try {
      await onEquipDecoration(id)
      const meta = AVATAR_DECORATIONS.find(d => d.id === id)
      setToastMessage(id === 'none' ? 'Decoração removida do seu avatar.' : `✨ Decoração "${meta?.name || id}" equipada no avatar!`)
      setTimeout(() => setToastMessage(null), 3500)
    } finally {
      setIsEquipping(false)
    }
  }

  const handleEquipEffect = async (id: string) => {
    if (!onEquipProfileEffect) return
    setIsEquipping(true)
    try {
      await onEquipProfileEffect(id)
      const meta = PROFILE_EFFECTS.find(e => e.id === id)
      setToastMessage(id === 'none' ? 'Efeito de perfil removido.' : `🔥 Efeito de Perfil "${meta?.name || id}" ativado na sua conta!`)
      setTimeout(() => setToastMessage(null), 3500)
    } finally {
      setIsEquipping(false)
    }
  }

  return (
    <div className="echo-shop-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="echo-shop-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="echo-shop-header-row">
        <div className="echo-shop-brand">
          <div className="echo-shop-badge-icon">🛍️</div>
          <div>
            <h1 className="echo-shop-title">Loja de Cosméticos do Echo</h1>
            <p className="echo-shop-subtitle">
              Personalize sua presença com Decorações de Avatar e Efeitos de Perfil cinematográficos que cobrem todo o card.
            </p>
          </div>
        </div>
        {onClose && (
          <button className="echo-shop-close-btn" onClick={onClose} title="Voltar">
            ✕ Fechar
          </button>
        )}
      </div>

      {/* Section Switcher Tabs */}
      <div className="echo-shop-main-tabs">
        <button
          type="button"
          className={`echo-shop-main-tab ${shopSection === 'decorations' ? 'active' : ''}`}
          onClick={() => setShopSection('decorations')}
        >
          <span className="tab-icon">🎭</span>
          <span>Decorações de Avatar</span>
          <span className="echo-shop-tab-count">{AVATAR_DECORATIONS.length}</span>
        </button>

        <button
          type="button"
          className={`echo-shop-main-tab ${shopSection === 'profile_effects' ? 'active' : ''}`}
          onClick={() => setShopSection('profile_effects')}
        >
          <span className="tab-icon">✨</span>
          <span>Efeitos de Perfil (Área Completa)</span>
          <span className="echo-shop-tab-count">{PROFILE_EFFECTS.length}</span>
        </button>
      </div>

      {/* ── SECTION 1: AVATAR DECORATIONS ───────────────────────────── */}
      {shopSection === 'decorations' && (
        <>
          {/* Main Showcase & Wardrobe Preview Row */}
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
                  <span className="echo-shop-pill-status">
                    {currentDecoration === selectedDecoPreview ? '● Atualmente Equipado' : '○ Pronto para Equipar'}
                  </span>
                </div>
              </div>
            </div>

            <div className="echo-shop-preview-actions">
              {currentDecoration === selectedDecoPreview ? (
                <button className="echo-shop-action-btn active" disabled>
                  ✓ Equipado no Avatar
                </button>
              ) : (
                <button
                  className="echo-shop-action-btn primary"
                  onClick={() => handleEquipDeco(selectedDecoPreview)}
                  disabled={isEquipping}
                >
                  {isEquipping ? 'Equipando...' : 'Equipar Esta Decoração'}
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
              const isSelectedInPreview = selectedDecoPreview === item.id

              return (
                <div
                  key={item.id}
                  className={`echo-shop-card ${isSelectedInPreview ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => setSelectedDecoPreview(item.id)}
                  style={{
                    '--item-theme': item.themeColor
                  } as CSSProperties}
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
                  </div>

                  <div className="echo-shop-card-content">
                    <div className="echo-shop-card-header">
                      <h3 className="echo-shop-card-title">{item.name}</h3>
                      <span className="echo-shop-card-cat">{item.category}</span>
                    </div>
                    <p className="echo-shop-card-desc">{item.description}</p>
                  </div>

                  <div className="echo-shop-card-footer" onClick={e => e.stopPropagation()}>
                    <button
                      className={`echo-shop-equip-btn ${isEquipped ? 'equipped' : ''}`}
                      onClick={() => handleEquipDeco(item.id)}
                      disabled={isEquipped || isEquipping}
                    >
                      {isEquipped ? '✓ Equipado' : 'Equipar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── SECTION 2: PROFILE EFFECTS (FULL AREA) ─────────────────── */}
      {shopSection === 'profile_effects' && (
        <>
          {/* Main Showcase & Wardrobe Preview Row (Mock Card) */}
          <div className="echo-shop-showcase-card profile-effect-showcase">
            <div className="echo-shop-preview-side">
              {/* Full Mock Card Stage with Profile Effect */}
              <div className="echo-shop-mock-profile-card">
                <ProfileEffect effectId={selectedEffectPreview} />
                <div className="mock-card-banner" />
                <div className="mock-card-body">
                  <div className="mock-card-avatar-row">
                    <div className="mock-card-avatar" style={{ position: 'relative' }}>
                      <DecoratedAvatar
                        avatarUrl={avatarUrl}
                        displayName={displayName}
                        decorationId={currentDecoration}
                        size={60}
                        status="online"
                      />
                    </div>
                  </div>
                  <div className="mock-card-meta">
                    <span className="mock-card-name">{displayName}</span>
                    <span className="mock-card-handle">@{displayName.toLowerCase().replace(/\s+/g, '')}</span>
                    <span className="mock-card-status">🎮 Em jogo no Echo</span>
                  </div>
                </div>
              </div>

              <div className="echo-shop-preview-info">
                <span className="echo-shop-preview-tag">PROVADOR DE EFEITO DE PERFIL</span>
                <h2 className="echo-shop-preview-name">{previewEffectMeta?.name || 'Sem Efeito'}</h2>
                <p className="echo-shop-preview-desc">
                  {previewEffectMeta?.description || 'Efeito cinematográfico cobrindo o card de perfil.'}
                </p>
                <div className="echo-shop-preview-meta">
                  <span className="echo-shop-pill-category" style={{ borderColor: previewEffectMeta?.themeColor || '#64748b' }}>
                    {previewEffectMeta?.category || 'Geral'}
                  </span>
                  <span className="echo-shop-pill-status">
                    {currentProfileEffect === selectedEffectPreview ? '● Atualmente Ativo' : '○ Pronto para Ativar'}
                  </span>
                </div>
              </div>
            </div>

            <div className="echo-shop-preview-actions">
              {currentProfileEffect === selectedEffectPreview ? (
                <button className="echo-shop-action-btn active" disabled>
                  ✓ Ativo no Perfil
                </button>
              ) : (
                <button
                  className="echo-shop-action-btn primary"
                  onClick={() => handleEquipEffect(selectedEffectPreview)}
                  disabled={isEquipping || !onEquipProfileEffect}
                >
                  {isEquipping ? 'Ativando...' : 'Ativar no Meu Perfil'}
                </button>
              )}

              {currentProfileEffect && currentProfileEffect !== 'none' && (
                <button
                  className="echo-shop-action-btn secondary"
                  onClick={() => handleEquipEffect('none')}
                  disabled={isEquipping || !onEquipProfileEffect}
                >
                  Remover Efeito de Perfil
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
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

          {/* Profile Effects Catalog Grid */}
          <div className="echo-shop-grid">
            {filteredEffects.map(item => {
              const isEquipped = currentProfileEffect === item.id
              const isSelectedInPreview = selectedEffectPreview === item.id

              return (
                <div
                  key={item.id}
                  className={`echo-shop-card echo-shop-effect-card ${isSelectedInPreview ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => setSelectedEffectPreview(item.id)}
                  style={{
                    '--item-theme': item.themeColor
                  } as CSSProperties}
                >
                  {/* Card Top: Mock Mini Profile Card with ProfileEffect active */}
                  <div className="echo-shop-card-visualizer effect-visualizer">
                    <ProfileEffect effectId={item.id} />
                    <div className="mini-card-banner" />
                    <div className="mini-card-avatar-row">
                      <DecoratedAvatar
                        avatarUrl={avatarUrl}
                        displayName={displayName}
                        decorationId={currentDecoration}
                        size={38}
                        status="online"
                      />
                      <span className="mini-card-name">{displayName}</span>
                    </div>
                    <div className="echo-shop-card-badge" style={{ backgroundColor: item.themeColor }}>
                      {item.badge}
                    </div>
                  </div>

                  <div className="echo-shop-card-content">
                    <div className="echo-shop-card-header">
                      <h3 className="echo-shop-card-title">{item.name}</h3>
                      <span className="echo-shop-card-cat">{item.category}</span>
                    </div>
                    <p className="echo-shop-card-desc">{item.description}</p>
                  </div>

                  <div className="echo-shop-card-footer" onClick={e => e.stopPropagation()}>
                    <button
                      className={`echo-shop-equip-btn ${isEquipped ? 'equipped' : ''}`}
                      onClick={() => handleEquipEffect(item.id)}
                      disabled={isEquipped || isEquipping}
                    >
                      {isEquipped ? '✓ Ativo' : 'Ativar no Perfil'}
                    </button>
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
