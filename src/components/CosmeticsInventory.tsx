import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import {
  AVATAR_DECORATIONS,
  PROFILE_EFFECTS,
  NEON_AURAS,
  CARD_FINISHES,
  NAME_EFFECTS,
  getUserInventory,
  hasUserAcquired,
  type UserInventory
} from '../lib/cosmeticsData'
import { DecoratedAvatar } from './DecoratedAvatar'
import { ProfileEffect } from './ProfileEffect'
import { AvatarDecoration } from './AvatarDecoration'
import {
  ColoredBackpackIcon,
  ColoredShopBagIcon,
  ColoredMaskIcon,
  ColoredSparklesIcon,
  ColoredLightningIcon,
  ColoredGemIcon,
  ColoredSoundwaveIcon
} from './ColoredIcons'

export interface CosmeticsInventoryProps {
  userId: string
  displayName: string
  avatarUrl?: string | null
  currentDecoration: string
  currentProfileEffect: string
  currentAvatarFrame: string
  currentCardFinish: string
  currentNameEffect?: string
  clanTag?: string
  clanTagColor?: string
  bio?: string
  bannerPreset?: string
  bannerCustom?: string
  onEquipDecoration: (id: string) => Promise<void> | void
  onEquipProfileEffect: (id: string) => Promise<void> | void
  onEquipAvatarFrame: (id: string) => void
  onEquipCardFinish: (id: string) => void
  onEquipNameEffect?: (id: string) => void
  onOpenShop: (initialTab?: 'decorations' | 'profile_effects' | 'auras' | 'finishes' | 'name_effects') => void
}

type InventoryTab = 'decorations' | 'effects' | 'auras' | 'finishes' | 'name_effects'

export function CosmeticsInventory({
  userId,
  displayName,
  avatarUrl,
  currentDecoration,
  currentProfileEffect,
  currentAvatarFrame,
  currentCardFinish,
  currentNameEffect = 'none',
  clanTag,
  clanTagColor = '#00f2fe',
  bio = '🎮 Jogador ativo no Echo • Pronto para squad e clutch.',
  bannerPreset = 'synthwave',
  bannerCustom,
  onEquipDecoration,
  onEquipProfileEffect,
  onEquipAvatarFrame,
  onEquipCardFinish,
  onEquipNameEffect,
  onOpenShop
}: CosmeticsInventoryProps) {
  const [activeTab, setActiveTab] = useState<InventoryTab>('decorations')
  const [inventory, setInventory] = useState<UserInventory>(() => getUserInventory(userId))
  const [filterOnlyAcquired, setFilterOnlyAcquired] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Live Stage Preview States
  const [previewDeco, setPreviewDeco] = useState<string>(currentDecoration || 'none')
  const [previewEffect, setPreviewEffect] = useState<string>(currentProfileEffect || 'none')
  const [previewAura, setPreviewAura] = useState<string>(currentAvatarFrame || 'aura-cyan')
  const [previewFinish, setPreviewFinish] = useState<string>(currentCardFinish || 'none')
  const [previewNameEffect, setPreviewNameEffect] = useState<string>(currentNameEffect || 'none')

  // Keep preview in sync with incoming props when equipped externally
  useEffect(() => {
    setPreviewDeco(currentDecoration || 'none')
  }, [currentDecoration])

  useEffect(() => {
    setPreviewEffect(currentProfileEffect || 'none')
  }, [currentProfileEffect])

  useEffect(() => {
    setPreviewAura(currentAvatarFrame || 'aura-cyan')
  }, [currentAvatarFrame])

  useEffect(() => {
    setPreviewFinish(currentCardFinish || 'none')
  }, [currentCardFinish])

  useEffect(() => {
    setPreviewNameEffect(currentNameEffect || 'none')
  }, [currentNameEffect])

  // Sync inventory
  useEffect(() => {
    setInventory(getUserInventory(userId))
  }, [userId, activeTab])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 2800)
  }

  // Calculate owned counts
  const ownedCounts = useMemo(() => {
    return {
      decorations: AVATAR_DECORATIONS.filter(d => inventory.decorations.includes(d.id)).length,
      effects: PROFILE_EFFECTS.filter(e => inventory.effects.includes(e.id)).length,
      auras: NEON_AURAS.filter(a => inventory.auras.includes(a.id)).length,
      finishes: CARD_FINISHES.filter(f => inventory.finishes.includes(f.id)).length,
      name_effects: NAME_EFFECTS.filter(n => (inventory.name_effects || []).includes(n.id)).length
    }
  }, [inventory])

  // Handle equipping from inventory
  const handleEquipItem = async (category: InventoryTab, itemId: string) => {
    try {
      if (category === 'decorations') {
        setPreviewDeco(itemId)
        await onEquipDecoration(itemId)
        showToast(itemId === 'none' ? 'Decoração desequipada.' : 'Decoração de Avatar equipada!')
      } else if (category === 'effects') {
        setPreviewEffect(itemId)
        await onEquipProfileEffect(itemId)
        showToast(itemId === 'none' ? 'Efeito de perfil desequipado.' : 'Efeito de Perfil equipado!')
      } else if (category === 'auras') {
        setPreviewAura(itemId)
        onEquipAvatarFrame(itemId)
        showToast('Moldura & Aura Neon equipada!')
      } else if (category === 'finishes') {
        setPreviewFinish(itemId)
        onEquipCardFinish(itemId)
        showToast('Acabamento do Cartão atualizado!')
      } else if (category === 'name_effects') {
        setPreviewNameEffect(itemId)
        onEquipNameEffect?.(itemId)
        showToast(itemId === 'none' ? 'Efeito de nome desequipado.' : 'Efeito de Nome equipado!')
      }
    } catch (e) {
      console.error('Error equipping cosmetic:', e)
    }
  }

  // Handle unequipping
  const handleUnequipItem = async (category: InventoryTab) => {
    if (category === 'decorations') {
      await handleEquipItem('decorations', 'none')
    } else if (category === 'effects') {
      await handleEquipItem('effects', 'none')
    } else if (category === 'auras') {
      await handleEquipItem('auras', 'aura-cyan')
    } else if (category === 'finishes') {
      await handleEquipItem('finishes', 'none')
    } else if (category === 'name_effects') {
      await handleEquipItem('name_effects', 'none')
    }
  }

  const handleOpenStore = () => {
    onOpenShop(activeTab === 'effects' ? 'profile_effects' : activeTab)
  }

  return (
    <div className="echo-inventory-wrapper">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="echo-inventory-toast">
          <ColoredSparklesIcon size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modern Header Bar */}
      <div className="echo-inventory-header-card">
        <div className="echo-inventory-header-left">
          <div className="echo-inventory-icon-bubble">
            <ColoredBackpackIcon size={28} />
          </div>
          <div>
            <div className="echo-inventory-badge-row">
              <span className="echo-inventory-badge-tag">INVENTÁRIO DO JOGADOR</span>
              <span className="echo-inventory-free-pill">COSMÉTICOS DESBLOQUEADOS</span>
            </div>
            <h1 className="echo-inventory-title">Inventário & Cosméticos</h1>
            <p className="echo-inventory-desc">
              Personalize seu avatar, auras e reflexos. Clique em qualquer item para testar no provador ao vivo à esquerda.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="echo-inventory-shop-btn"
          onClick={handleOpenStore}
          title="Abrir Loja de Cosméticos"
        >
          <ColoredShopBagIcon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          <span>Explorar Loja Echo</span>
        </button>
      </div>

      {/* Tabs Navigation & Filters */}
      <div className="echo-inventory-nav-bar">
        <div className="echo-inventory-tabs">
          <button
            type="button"
            className={`echo-inv-tab ${activeTab === 'decorations' ? 'active' : ''}`}
            onClick={() => setActiveTab('decorations')}
          >
            <span className="echo-inv-tab-icon"><ColoredMaskIcon size={16} /></span>
            <span>Decorações de Avatar</span>
            <span className="echo-inv-tab-count">
              {ownedCounts.decorations}/{AVATAR_DECORATIONS.length}
            </span>
          </button>

          <button
            type="button"
            className={`echo-inv-tab ${activeTab === 'effects' ? 'active' : ''}`}
            onClick={() => setActiveTab('effects')}
          >
            <span className="echo-inv-tab-icon"><ColoredSparklesIcon size={16} /></span>
            <span>Efeitos de Perfil</span>
            <span className="echo-inv-tab-count">
              {ownedCounts.effects}/{PROFILE_EFFECTS.length}
            </span>
          </button>

          <button
            type="button"
            className={`echo-inv-tab ${activeTab === 'name_effects' ? 'active' : ''}`}
            onClick={() => setActiveTab('name_effects')}
          >
            <span className="echo-inv-tab-icon"><ColoredSoundwaveIcon size={16} /></span>
            <span>Efeitos de Nome & Auras</span>
            <span className="echo-inv-tab-count">
              {ownedCounts.name_effects}/{NAME_EFFECTS.length}
            </span>
          </button>

          <button
            type="button"
            className={`echo-inv-tab ${activeTab === 'auras' ? 'active' : ''}`}
            onClick={() => setActiveTab('auras')}
          >
            <span className="echo-inv-tab-icon"><ColoredLightningIcon size={16} /></span>
            <span>Molduras & Auras Neon</span>
            <span className="echo-inv-tab-count">
              {ownedCounts.auras}/{NEON_AURAS.length}
            </span>
          </button>

          <button
            type="button"
            className={`echo-inv-tab ${activeTab === 'finishes' ? 'active' : ''}`}
            onClick={() => setActiveTab('finishes')}
          >
            <span className="echo-inv-tab-icon"><ColoredGemIcon size={16} /></span>
            <span>Acabamentos de Cartão</span>
            <span className="echo-inv-tab-count">
              {ownedCounts.finishes}/{CARD_FINISHES.length}
            </span>
          </button>
        </div>

        <div className="echo-inventory-filter-toggle">
          <label className="echo-inv-checkbox-label">
            <input
              type="checkbox"
              checked={filterOnlyAcquired}
              onChange={(e) => setFilterOnlyAcquired(e.target.checked)}
            />
            <span>Apenas Itens Adquiridos</span>
          </label>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="echo-inventory-body">
        {/* Left Side: Live Stage & Interactive Controls */}
        <div className="echo-inventory-stage-col">
          <div className="echo-inventory-stage-card">
            <div className="echo-stage-header">
              <div className="echo-stage-live-badge">
                <span className="stage-live-dot" />
                <span>PROVADOR AO VIVO</span>
              </div>
              <span className="echo-stage-scope-tag">Perfil Echo</span>
            </div>

            {/* Profile Card Mockup */}
            <div className={`echo-stage-preview-card preview-${previewFinish}`}>
              {/* Profile Effect Background */}
              {previewEffect && previewEffect !== 'none' && (
                <div className="echo-stage-effect-layer">
                  <ProfileEffect effectId={previewEffect} />
                </div>
              )}

              {/* Banner */}
              <div
                className={`echo-stage-banner ${!bannerCustom ? `texture-${bannerPreset}` : ''}`}
                style={{
                  backgroundImage: bannerCustom ? `url(${bannerCustom})` : undefined
                }}
              >
                <span className="echo-stage-banner-overlay" />
              </div>

              {/* Avatar & Identity details */}
              <div className="echo-stage-card-body">
                <div className="echo-stage-avatar-row">
                  {/* Avatar squircle with neon aura & animated decoration */}
                  <div className={`echo-stage-avatar-squircle ${previewAura}`}>
                    <div className="echo-stage-avatar-inner">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} />
                      ) : (
                        (displayName || 'U').slice(0, 1).toUpperCase()
                      )}
                    </div>
                    {previewDeco && previewDeco !== 'none' && (
                      <AvatarDecoration decorationId={previewDeco} />
                    )}
                    <span className="echo-stage-status-dot status-online" />
                  </div>
                  <span className="echo-stage-card-pill">
                    {CARD_FINISHES.find(f => f.id === previewFinish)?.badge || 'PADRÃO'}
                  </span>
                </div>

                <div className="echo-stage-user-info">
                  <div className="echo-stage-name-line">
                    {clanTag && (
                      <span
                        className="echo-clan-tag"
                        style={{
                          borderColor: clanTagColor,
                          color: clanTagColor,
                          boxShadow: `0 0 10px ${clanTagColor}40`
                        }}
                      >
                        [{clanTag.toUpperCase()}]
                      </span>
                    )}
                    <span className={`echo-stage-name name-effect-${previewNameEffect}`}>{displayName || 'Jogador'}</span>
                  </div>
                  <div className="echo-stage-handle">
                    @{displayName.toLowerCase().replace(/\s+/g, '_') || 'echo_user'}
                  </div>
                  <div className="echo-stage-bio">
                    {bio}
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Controls */}
            <div className="echo-stage-controls">
              <div className="echo-stage-meta-row">
                <span className="echo-stage-label">Visualizando:</span>
                <span className="echo-stage-item-name">
                  {activeTab === 'decorations' && (AVATAR_DECORATIONS.find(d => d.id === previewDeco)?.name || 'Sem Decoração')}
                  {activeTab === 'effects' && (PROFILE_EFFECTS.find(e => e.id === previewEffect)?.name || 'Sem Efeito')}
                  {activeTab === 'name_effects' && (NAME_EFFECTS.find(n => n.id === previewNameEffect)?.name || 'Sem Efeito de Nome')}
                  {activeTab === 'auras' && (NEON_AURAS.find(a => a.id === previewAura)?.name || 'Ciano Elétrico')}
                  {activeTab === 'finishes' && (CARD_FINISHES.find(f => f.id === previewFinish)?.name || 'Minimalista Fosco')}
                </span>
              </div>

              <div className="echo-stage-btns-row">
                <button
                  type="button"
                  className="echo-stage-btn-equip"
                  onClick={() => {
                    if (activeTab === 'decorations') handleEquipItem('decorations', previewDeco)
                    if (activeTab === 'effects') handleEquipItem('effects', previewEffect)
                    if (activeTab === 'name_effects') handleEquipItem('name_effects', previewNameEffect)
                    if (activeTab === 'auras') handleEquipItem('auras', previewAura)
                    if (activeTab === 'finishes') handleEquipItem('finishes', previewFinish)
                  }}
                >
                  <span>✓ Equipar Prévia</span>
                </button>

                <button
                  type="button"
                  className="echo-stage-btn-reset"
                  onClick={() => {
                    setPreviewDeco(currentDecoration || 'none')
                    setPreviewEffect(currentProfileEffect || 'none')
                    setPreviewNameEffect(currentNameEffect || 'none')
                    setPreviewAura(currentAvatarFrame || 'aura-cyan')
                    setPreviewFinish(currentCardFinish || 'none')
                  }}
                  title="Restaurar visual atual do perfil"
                >
                  <span>Restaurar</span>
                </button>

                <button
                  type="button"
                  className="echo-stage-btn-unequip"
                  onClick={() => handleUnequipItem(activeTab)}
                  title="Remover cosmético desta categoria"
                >
                  <span>Remover</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Grid of Cosmetics */}
        <div className="echo-inventory-items-col">
          {/* TAB 1: DECORAÇÕES DE AVATAR */}
          {activeTab === 'decorations' && (
            <div className="echo-inv-grid">
              {/* Default Tile */}
              <div
                className={`echo-inv-card default-tile ${currentDecoration === '' || currentDecoration === 'none' ? 'is-active' : ''}`}
                onClick={() => setPreviewDeco('none')}
              >
                <div className="echo-inv-card-preview-box default-box">
                  <DecoratedAvatar
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    size={52}
                    status="online"
                  />
                </div>
                <div className="echo-inv-card-body">
                  <div className="echo-inv-card-title-row">
                    <h4>Padrão (Sem Moldura)</h4>
                    <span className="echo-inv-badge-free">BÁSICO</span>
                  </div>
                  <p>Avatar natural sem molduras ou elementos animados sobrepostos.</p>
                </div>
                <div className="echo-inv-card-actions" onClick={e => e.stopPropagation()}>
                  {currentDecoration === '' || currentDecoration === 'none' ? (
                    <span className="echo-inv-equipped-pill">✓ Equipado</span>
                  ) : (
                    <button
                      type="button"
                      className="echo-inv-equip-btn"
                      onClick={() => handleEquipItem('decorations', 'none')}
                    >
                      Equipar
                    </button>
                  )}
                </div>
              </div>

              {AVATAR_DECORATIONS.map(deco => {
                const isAcquired = hasUserAcquired(userId, 'decorations', deco.id)
                if (filterOnlyAcquired && !isAcquired) return null
                const isEquipped = currentDecoration === deco.id
                const isPreviewing = previewDeco === deco.id

                return (
                  <div
                    key={deco.id}
                    className={`echo-inv-card ${isPreviewing ? 'previewing' : ''} ${isEquipped ? 'is-active' : ''} ${!isAcquired ? 'locked' : ''}`}
                    onClick={() => setPreviewDeco(deco.id)}
                  >
                    <div className="echo-inv-card-preview-box deco-box">
                      <div className="deco-podium" />
                      <DecoratedAvatar
                        avatarUrl={avatarUrl}
                        displayName={displayName}
                        decorationId={deco.id}
                        size={56}
                        status="online"
                      />
                      {isAcquired ? (
                        <span className="echo-inv-owned-tag">✓ No Inventário</span>
                      ) : (
                        <span className="echo-inv-store-tag">Na Loja</span>
                      )}
                    </div>

                    <div className="echo-inv-card-body">
                      <div className="echo-inv-card-title-row">
                        <h4>{deco.name}</h4>
                        <span className="echo-inv-badge-deco">{deco.badge}</span>
                      </div>
                      <p>{deco.description}</p>
                    </div>

                    <div className="echo-inv-card-actions" onClick={e => e.stopPropagation()}>
                      {isEquipped ? (
                        <div className="echo-inv-active-row">
                          <span className="echo-inv-equipped-pill">✓ Equipado</span>
                          <button
                            type="button"
                            className="echo-inv-unequip-btn"
                            onClick={() => handleEquipItem('decorations', 'none')}
                            title="Desequipar"
                          >
                            ✕
                          </button>
                        </div>
                      ) : isAcquired ? (
                        <button
                          type="button"
                          className="echo-inv-equip-btn"
                          onClick={() => handleEquipItem('decorations', deco.id)}
                        >
                          Equipar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="echo-inv-shop-link-btn"
                          onClick={handleOpenStore}
                        >
                          <span>Obter na Loja</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB 2: EFEITOS DE PERFIL */}
          {activeTab === 'effects' && (
            <div className="echo-inv-grid">
              {/* Default Tile */}
              <div
                className={`echo-inv-card default-tile ${!currentProfileEffect || currentProfileEffect === 'none' ? 'is-active' : ''}`}
                onClick={() => setPreviewEffect('none')}
              >
                <div className="echo-inv-card-preview-box default-box">
                  <div className="empty-effect-icon">🚫</div>
                </div>
                <div className="echo-inv-card-body">
                  <div className="echo-inv-card-title-row">
                    <h4>Sem Efeito de Fundo</h4>
                    <span className="echo-inv-badge-free">BÁSICO</span>
                  </div>
                  <p>Perfil limpo sem partículas ou animações em segundo plano.</p>
                </div>
                <div className="echo-inv-card-actions" onClick={e => e.stopPropagation()}>
                  {!currentProfileEffect || currentProfileEffect === 'none' ? (
                    <span className="echo-inv-equipped-pill">✓ Equipado</span>
                  ) : (
                    <button
                      type="button"
                      className="echo-inv-equip-btn"
                      onClick={() => handleEquipItem('effects', 'none')}
                    >
                      Equipar
                    </button>
                  )}
                </div>
              </div>

              {PROFILE_EFFECTS.map(effect => {
                const isAcquired = hasUserAcquired(userId, 'effects', effect.id)
                if (filterOnlyAcquired && !isAcquired) return null
                const isEquipped = currentProfileEffect === effect.id
                const isPreviewing = previewEffect === effect.id

                return (
                  <div
                    key={effect.id}
                    className={`echo-inv-card effect-card ${isPreviewing ? 'previewing' : ''} ${isEquipped ? 'is-active' : ''} ${!isAcquired ? 'locked' : ''}`}
                    onClick={() => setPreviewEffect(effect.id)}
                    style={{ '--item-theme': effect.themeColor } as CSSProperties}
                  >
                    <div className="echo-inv-card-preview-box effect-box">
                      <ProfileEffect effectId={effect.id} />
                      {isAcquired ? (
                        <span className="echo-inv-owned-tag">✓ No Inventário</span>
                      ) : (
                        <span className="echo-inv-store-tag">Na Loja</span>
                      )}
                    </div>

                    <div className="echo-inv-card-body">
                      <div className="echo-inv-card-title-row">
                        <h4>{effect.name}</h4>
                        <span className="echo-inv-badge-effect" style={{ backgroundColor: effect.themeColor }}>
                          {effect.badge}
                        </span>
                      </div>
                      <p>{effect.description}</p>
                    </div>

                    <div className="echo-inv-card-actions" onClick={e => e.stopPropagation()}>
                      {isEquipped ? (
                        <div className="echo-inv-active-row">
                          <span className="echo-inv-equipped-pill">✓ Equipado</span>
                          <button
                            type="button"
                            className="echo-inv-unequip-btn"
                            onClick={() => handleEquipItem('effects', 'none')}
                            title="Desequipar"
                          >
                            ✕
                          </button>
                        </div>
                      ) : isAcquired ? (
                        <button
                          type="button"
                          className="echo-inv-equip-btn"
                          onClick={() => handleEquipItem('effects', effect.id)}
                        >
                          Equipar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="echo-inv-shop-link-btn"
                          onClick={handleOpenStore}
                        >
                          <span>Obter na Loja</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB 3: MOLDURAS & AURAS NEON */}
          {activeTab === 'auras' && (
            <div className="echo-inv-grid">
              {NEON_AURAS.map(aura => {
                const isAcquired = hasUserAcquired(userId, 'auras', aura.id)
                if (filterOnlyAcquired && !isAcquired) return null
                const isEquipped = currentAvatarFrame === aura.id
                const isPreviewing = previewAura === aura.id

                return (
                  <div
                    key={aura.id}
                    className={`echo-inv-card aura-card ${isPreviewing ? 'previewing' : ''} ${isEquipped ? 'is-active' : ''} ${!isAcquired ? 'locked' : ''}`}
                    onClick={() => setPreviewAura(aura.id)}
                  >
                    <div className="echo-inv-card-preview-box aura-box">
                      <div
                        className={`echo-hero-avatar-squircle ${aura.id}`}
                        style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '17px',
                          background: '#13151f',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <DecoratedAvatar avatarUrl={avatarUrl} displayName={displayName} size={48} status="online" />
                      </div>
                      {isAcquired ? (
                        <span className="echo-inv-owned-tag">✓ No Inventário</span>
                      ) : (
                        <span className="echo-inv-store-tag">Na Loja</span>
                      )}
                    </div>

                    <div className="echo-inv-card-body">
                      <div className="echo-inv-card-title-row">
                        <h4>{aura.name}</h4>
                        <span className="echo-inv-badge-aura" style={{ color: aura.color, borderColor: `${aura.color}40`, backgroundColor: `${aura.color}15` }}>
                          {aura.badge}
                        </span>
                      </div>
                      <p>{aura.description}</p>
                    </div>

                    <div className="echo-inv-card-actions" onClick={e => e.stopPropagation()}>
                      {isEquipped ? (
                        <span className="echo-inv-equipped-pill">✓ Equipado</span>
                      ) : isAcquired ? (
                        <button
                          type="button"
                          className="echo-inv-equip-btn"
                          onClick={() => handleEquipItem('auras', aura.id)}
                        >
                          Equipar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="echo-inv-shop-link-btn"
                          onClick={handleOpenStore}
                        >
                          <span>Obter na Loja</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB 4: ACABAMENTOS DE CARTÃO */}
          {activeTab === 'finishes' && (
            <div className="echo-inv-grid">
              {CARD_FINISHES.map(finish => {
                const isAcquired = hasUserAcquired(userId, 'finishes', finish.id)
                if (filterOnlyAcquired && !isAcquired) return null
                const isEquipped = currentCardFinish === finish.id
                const isPreviewing = previewFinish === finish.id

                return (
                  <div
                    key={finish.id}
                    className={`echo-inv-card finish-card ${isPreviewing ? 'previewing' : ''} ${isEquipped ? 'is-active' : ''} ${!isAcquired ? 'locked' : ''}`}
                    onClick={() => setPreviewFinish(finish.id)}
                  >
                    <div className={`echo-inv-card-preview-box finish-card-visualizer preview-${finish.id}`}>
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
                      {isAcquired ? (
                        <span className="echo-inv-owned-tag">✓ No Inventário</span>
                      ) : (
                        <span className="echo-inv-store-tag">Na Loja</span>
                      )}
                    </div>

                    <div className="echo-inv-card-body">
                      <div className="echo-inv-card-title-row">
                        <h4>{finish.name}</h4>
                        <span className="echo-inv-badge-finish">{finish.badge}</span>
                      </div>
                      <p>{finish.description}</p>
                    </div>

                    <div className="echo-inv-card-actions" onClick={e => e.stopPropagation()}>
                      {isEquipped ? (
                        <span className="echo-inv-equipped-pill">✓ Equipado</span>
                      ) : isAcquired ? (
                        <button
                          type="button"
                          className="echo-inv-equip-btn"
                          onClick={() => handleEquipItem('finishes', finish.id)}
                        >
                          Equipar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="echo-inv-shop-link-btn"
                          onClick={handleOpenStore}
                        >
                          <span>Obter na Loja</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB 5: NAME EFFECTS & SOUND AURAS */}
          {activeTab === 'name_effects' && (
            <div className="echo-inv-grid">
              {NAME_EFFECTS.map(effect => {
                const isAcquired = (inventory.name_effects || []).includes(effect.id)
                if (filterOnlyAcquired && !isAcquired) return null
                const isEquipped = currentNameEffect === effect.id
                const isPreviewing = previewNameEffect === effect.id

                return (
                  <div
                    key={effect.id}
                    className={`echo-inv-card ${isEquipped ? 'equipped' : ''} ${isPreviewing ? 'previewing' : ''}`}
                    onClick={() => setPreviewNameEffect(effect.id)}
                  >
                    <div className="echo-inv-card-stage" style={{ minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                      <span className={`name-effect-${effect.id}`} style={{ fontSize: '15px', fontWeight: 700 }}>
                        {displayName || 'Jogador'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                        <span className="name-soundwave-indicator">
                          <span className="name-soundwave-bar" style={{ background: effect.themeColor }} />
                          <span className="name-soundwave-bar" style={{ background: effect.themeColor }} />
                          <span className="name-soundwave-bar" style={{ background: effect.themeColor }} />
                        </span>
                        <span className="name-effect-badge-tag" style={{ backgroundColor: `${effect.themeColor}20`, color: effect.themeColor, border: `1px solid ${effect.themeColor}50`, fontSize: '8.5px' }}>
                          {effect.badge}
                        </span>
                      </div>
                      {isEquipped && (
                        <span className="echo-inv-equipped-pill">● Ativo</span>
                      )}
                      {!isAcquired && (
                        <span className="echo-inv-store-tag">Na Loja</span>
                      )}
                    </div>

                    <div className="echo-inv-card-body">
                      <div className="echo-inv-card-title-row">
                        <h4>{effect.name}</h4>
                        <span className="echo-inv-badge-finish" style={{ borderColor: `${effect.themeColor}55`, color: effect.themeColor }}>
                          {effect.category}
                        </span>
                      </div>
                      <p>{effect.description}</p>
                    </div>

                    <div className="echo-inv-card-actions" onClick={e => e.stopPropagation()}>
                      {isEquipped ? (
                        <span className="echo-inv-equipped-pill">✓ Equipado</span>
                      ) : isAcquired ? (
                        <button
                          type="button"
                          className="echo-inv-equip-btn"
                          onClick={() => handleEquipItem('name_effects', effect.id)}
                        >
                          Equipar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="echo-inv-shop-link-btn"
                          onClick={handleOpenStore}
                        >
                          <span>Obter na Loja</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
