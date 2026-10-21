import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import {
  AVATAR_DECORATIONS,
  PROFILE_EFFECTS,
  CARD_FINISHES,
  NAME_EFFECTS,
  getUserInventory,
  hasUserAcquired,
  type UserInventory
} from '../lib/cosmeticsData'
import { NAME_FONTS, getNameFont, nameFontStyle } from '../lib/nameFonts'
import { useNameFontStore } from '../stores/useNameFontStore'
import { DecoratedAvatar } from './DecoratedAvatar'
import { ProfileEffect } from './ProfileEffect'
import { AvatarDecoration } from './AvatarDecoration'
import { StatusGlyph } from './StatusGlyph'

export interface CosmeticsInventoryProps {
  userId: string
  displayName: string
  avatarUrl?: string | null
  currentDecoration: string
  currentProfileEffect: string
  currentCardFinish: string
  currentNameEffect?: string
  clanTag?: string
  clanTagColor?: string
  bio?: string
  bannerPreset?: string
  bannerCustom?: string
  onEquipDecoration: (id: string) => Promise<void> | void
  onEquipProfileEffect: (id: string) => Promise<void> | void
  onEquipCardFinish: (id: string) => void
  onEquipNameEffect?: (id: string) => void
  onEquipNameFont?: (id: string) => void
  onOpenShop: (initialTab?: 'decorations' | 'profile_effects' | 'finishes' | 'name_effects' | 'name_fonts') => void
}

type InventoryTab = 'decorations' | 'effects' | 'finishes' | 'name_effects' | 'name_fonts'

export function CosmeticsInventory({
  userId,
  displayName,
  avatarUrl,
  currentDecoration,
  currentProfileEffect,
  currentCardFinish,
  currentNameEffect = 'none',
  clanTag,
  clanTagColor = '#00f2fe',
  bio = '🎮 Jogador ativo no Echo • Pronto para squad e clutch.',
  bannerPreset = 'synthwave',
  bannerCustom,
  onEquipDecoration,
  onEquipProfileEffect,
  onEquipCardFinish,
  onEquipNameEffect,
  onEquipNameFont,
  onOpenShop
}: CosmeticsInventoryProps) {
  // A fonte do meu nome vem da store (a mesma que desenha o nome nas mensagens e na lista de membros)
  const currentNameFont = useNameFontStore((s) => s.fontId)
  const [activeTab, setActiveTab] = useState<InventoryTab>('decorations')
  const [inventory, setInventory] = useState<UserInventory>(() => getUserInventory(userId))
  const [filterOnlyAcquired, setFilterOnlyAcquired] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Live Stage Preview States
  const [previewDeco, setPreviewDeco] = useState<string>(currentDecoration || 'none')
  const [previewEffect, setPreviewEffect] = useState<string>(currentProfileEffect || 'none')
  const [previewFinish, setPreviewFinish] = useState<string>(currentCardFinish || 'none')
  const [previewNameEffect, setPreviewNameEffect] = useState<string>(currentNameEffect || 'none')
  const [previewNameFont, setPreviewNameFont] = useState<string>(currentNameFont || 'none')

  // Keep preview in sync with incoming props when equipped externally
  useEffect(() => {
    setPreviewDeco(currentDecoration || 'none')
  }, [currentDecoration])

  useEffect(() => {
    setPreviewEffect(currentProfileEffect || 'none')
  }, [currentProfileEffect])

  useEffect(() => {
    setPreviewFinish(currentCardFinish || 'none')
  }, [currentCardFinish])

  useEffect(() => {
    setPreviewNameEffect(currentNameEffect || 'none')
  }, [currentNameEffect])

  useEffect(() => {
    setPreviewNameFont(currentNameFont || 'none')
  }, [currentNameFont])

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
      finishes: CARD_FINISHES.filter(f => inventory.finishes.includes(f.id)).length,
      name_effects: NAME_EFFECTS.filter(n => (inventory.name_effects || []).includes(n.id)).length,
      name_fonts: NAME_FONTS.filter(f => (inventory.name_fonts || []).includes(f.id)).length
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
      } else if (category === 'finishes') {
        setPreviewFinish(itemId)
        onEquipCardFinish(itemId)
        showToast('Acabamento do Cartão atualizado!')
      } else if (category === 'name_effects') {
        setPreviewNameEffect(itemId)
        onEquipNameEffect?.(itemId)
        showToast(itemId === 'none' ? 'Efeito de nome desequipado.' : 'Efeito de Nome equipado!')
      } else if (category === 'name_fonts') {
        setPreviewNameFont(itemId)
        onEquipNameFont?.(itemId)
        showToast(itemId === 'none' ? 'Fonte do nome removida.' : 'Fonte do nome equipada!')
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
    } else if (category === 'finishes') {
      await handleEquipItem('finishes', 'none')
    } else if (category === 'name_effects') {
      await handleEquipItem('name_effects', 'none')
    } else if (category === 'name_fonts') {
      await handleEquipItem('name_fonts', 'none')
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#38bdf8' }}>
            <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Linear / Apple Glass Header & Segmented Nav */}
      <div className="echo-inventory-header-card">
        <div className="echo-inventory-header-top">
          <div className="echo-inventory-header-text">
            <h1 className="echo-inventory-title">Inventário & Cosméticos</h1>
            <p className="echo-inventory-desc">
              Gerencie o visual do seu perfil pessoal e decorações desbloqueadas.
            </p>
          </div>

          <button
            type="button"
            className="echo-inventory-shop-btn"
            onClick={handleOpenStore}
            title="Abrir Loja de Cosméticos"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span>Loja Echo</span>
          </button>
        </div>

        {/* Recessed Frosted Segmented Track */}
        <div className="echo-inventory-nav-bar">
          <div className="echo-inventory-tabs">
            <button
              type="button"
              className={`echo-inv-tab ${activeTab === 'decorations' ? 'active' : ''}`}
              onClick={() => setActiveTab('decorations')}
            >
              <svg className="echo-inv-tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M9 10h.01" />
                <path d="M15 10h.01" />
                <path d="M8 15s1.5 2 4 2 4-2 4-2" />
              </svg>
              <span>Avatar</span>
              <span className="echo-inv-tab-count">
                {ownedCounts.decorations}/{AVATAR_DECORATIONS.length}
              </span>
            </button>

            <button
              type="button"
              className={`echo-inv-tab ${activeTab === 'effects' ? 'active' : ''}`}
              onClick={() => setActiveTab('effects')}
            >
              <svg className="echo-inv-tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z" />
              </svg>
              <span>Efeitos</span>
              <span className="echo-inv-tab-count">
                {ownedCounts.effects}/{PROFILE_EFFECTS.length}
              </span>
            </button>

            <button
              type="button"
              className={`echo-inv-tab ${activeTab === 'name_effects' ? 'active' : ''}`}
              onClick={() => setActiveTab('name_effects')}
            >
              <svg className="echo-inv-tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 10v4M6 7v10M10 4v16M14 7v10M18 10v4" />
              </svg>
              <span>Nome</span>
              <span className="echo-inv-tab-count">
                {ownedCounts.name_effects}/{NAME_EFFECTS.length}
              </span>
            </button>

            <button
              type="button"
              className={`echo-inv-tab ${activeTab === 'name_fonts' ? 'active' : ''}`}
              onClick={() => setActiveTab('name_fonts')}
            >
              <svg className="echo-inv-tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" x2="15" y1="20" y2="20" />
                <line x1="12" x2="12" y1="4" y2="20" />
              </svg>
              <span>Fonte</span>
              <span className="echo-inv-tab-count">
                {ownedCounts.name_fonts}/{NAME_FONTS.length}
              </span>
            </button>


            <button
              type="button"
              className={`echo-inv-tab ${activeTab === 'finishes' ? 'active' : ''}`}
              onClick={() => setActiveTab('finishes')}
            >
              <svg className="echo-inv-tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="14" x="3" y="5" rx="2" />
              </svg>
              <span>Cartão</span>
              <span className="echo-inv-tab-count">
                {ownedCounts.finishes}/{CARD_FINISHES.length}
              </span>
            </button>
          </div>

          <div className="echo-inventory-filter-toggle">
            <button
              type="button"
              className="echo-inv-checkbox-btn"
              onClick={() => setFilterOnlyAcquired(prev => !prev)}
              title="Filtrar itens adquiridos"
            >
              <span className={`echo-custom-checkbox ${filterOnlyAcquired ? 'checked' : ''}`}>
                {filterOnlyAcquired && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span className={`echo-inv-checkbox-text ${filterOnlyAcquired ? 'checked' : ''}`}>
                Apenas Adquiridos
              </span>
            </button>
          </div>
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
                  {/* Avatar squircle with animated decoration */}
                  <div className={`echo-stage-avatar-squircle`}>
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
                    <span className="echo-stage-status-dot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#11131a' }}>
                      <StatusGlyph status="online" size={12} withGlow />
                    </span>
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
                  {activeTab === 'name_fonts' && (getNameFont(previewNameFont)?.name || 'Fonte padrão')}
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
                    if (activeTab === 'name_fonts') handleEquipItem('name_fonts', previewNameFont)
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
                    setPreviewNameFont(currentNameFont || 'none')
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
                    style={{ '--item-theme': deco.themeColor } as CSSProperties}
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
                    style={{ '--item-theme': finish.id === 'holographic' ? '#c084fc' : finish.id === 'glass' ? '#00f2fe' : finish.id === 'carbon' ? '#94a3b8' : '#38bdf8' } as CSSProperties}
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

          {/* TAB 5: CORES DE NOME */}
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
                    style={{ '--item-theme': effect.themeColor } as CSSProperties}
                  >
                    <div className="echo-inv-card-stage" style={{ minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                      <span className={`name-effect-${effect.id}`} style={{ fontSize: '15px', fontWeight: 700 }}>
                        {displayName || 'Jogador'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
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

          {/* TAB 6: FONTES DE NOME */}
          {activeTab === 'name_fonts' && (
            <div className="echo-inv-grid">
              {NAME_FONTS.map(font => {
                const isAcquired = (inventory.name_fonts || []).includes(font.id)
                if (filterOnlyAcquired && !isAcquired) return null
                const isEquipped = currentNameFont === font.id
                const isPreviewing = previewNameFont === font.id

                return (
                  <div
                    key={font.id}
                    className={`echo-inv-card ${isEquipped ? 'equipped' : ''} ${isPreviewing ? 'previewing' : ''}`}
                    onClick={() => setPreviewNameFont(font.id)}
                  >
                    <div className="echo-inv-card-stage" style={{ minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                      <span style={{ display: 'inline-block', color: 'var(--text-primary)', ...nameFontStyle(font.id), fontSize: `${22 * font.scale}px` }}>
                        {displayName || 'Jogador'}
                      </span>
                      {isEquipped && (
                        <span className="echo-inv-equipped-pill">● Ativa</span>
                      )}
                      {!isAcquired && (
                        <span className="echo-inv-store-tag">Na Loja</span>
                      )}
                    </div>

                    <div className="echo-inv-card-body">
                      <div className="echo-inv-card-title-row">
                        <h4>{font.name}</h4>
                        <span className="echo-inv-badge-finish">{font.category}</span>
                      </div>
                      <p>{font.description}</p>
                    </div>

                    <div className="echo-inv-card-actions" onClick={e => e.stopPropagation()}>
                      {isEquipped ? (
                        <span className="echo-inv-equipped-pill">✓ Equipada</span>
                      ) : isAcquired ? (
                        <button
                          type="button"
                          className="echo-inv-equip-btn"
                          onClick={() => handleEquipItem('name_fonts', font.id)}
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
