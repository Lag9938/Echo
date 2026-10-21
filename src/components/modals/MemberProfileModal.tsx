import { useState } from 'react'
import { roleInk } from '../../lib/accentContrast'
import { ProfileEffect, PROFILE_EFFECTS } from '../ProfileEffect'
import { AvatarDecoration, AVATAR_DECORATIONS } from '../AvatarDecoration'
import { GameLogo, getGameBrandColor } from '../GameLogos'
import { playSoundboardEffect } from '../../lib/soundEffects'
import { copyToClipboard } from '../../lib/clipboard'
import { formatGameDuration } from '../../lib/formatters'
import {
  CrownIcon,
  MicIcon,
  UserPlusIcon,
  UserCheckIcon,
  ZapIcon,
  CopyIcon,
  MessageSquareIcon,
  VolumeIcon,
  LockIcon,
  ClockIcon,
  BanIcon
} from '../icons'
import { CommunityBadge } from '../CommunityBadge'
import { useUIStore } from '../../stores/useUIStore'
import { useNameFontStore } from '../../stores/useNameFontStore'
import { nameFontStyle, readStoredNameFont } from '../../lib/nameFonts'
import type { MemberProfileModalProps } from '../../types'

export function MemberProfileModal({
  inspectedMember,
  onClose,
  currentUser,
  isOnline,
  userPresenceStatus,
  validCustomStatus,
  memberClanTag,
  memberClanTagColor,
  activeGame,
  activeGameStartedAt,
  isVoiceUser,
  voiceChannelName,
  isServerOwner,
  avatarDecoration,
  profileEffect,
  bannerCustom,
  bannerPreset,
  onOpenDM,
  onAdjustVolume,
  voicePeer,
  showToast,
  friendships = [],
  onAddFriend,
  onAcceptFriend,
  onBlockUser,
  onUnblockUser,
  blockedUserIds,
  setPage
}: MemberProfileModalProps) {
  const [pokeCount, setPokeCount] = useState(0)
  const [isPoking, setIsPoking] = useState(false)
  const [copiedHandle, setCopiedHandle] = useState(false)
  const myNameFont = useNameFontStore((s) => s.fontId)

  const memberId = inspectedMember.user.id
  const isMe = currentUser?.id === memberId
  const friendship = friendships.find(f => f.user.id === memberId)
  const noteStorageKey = `echo-member-note-${memberId}`
  const [personalNote, setPersonalNote] = useState<string>(() => {
    return localStorage.getItem(noteStorageKey) || ''
  })
  const [isNoteOpen, setIsNoteOpen] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(noteStorageKey)?.trim())
  })

  const gameBrandColor = activeGame ? getGameBrandColor(activeGame) : '#4ade80'

  const memberBadge = isMe
    ? (localStorage.getItem(`echo-show-badge-${currentUser?.id}`) !== 'false' ? (localStorage.getItem(`echo-badge-${currentUser?.id}`) || (isServerOwner ? 'owner' : 'early')) : 'none')
    : ((inspectedMember as any).badge || (inspectedMember.user as any)?.badge || localStorage.getItem(`echo-badge-${memberId}`) || (isServerOwner ? 'owner' : null))

  const activeEffectMeta = profileEffect && profileEffect !== 'none'
    ? PROFILE_EFFECTS.find(e => e.id === profileEffect)
    : null

  const activeDecorationMeta = avatarDecoration && avatarDecoration !== 'none'
    ? AVATAR_DECORATIONS.find(d => d.id === avatarDecoration)
    : null

  const handleNoteChange = (val: string) => {
    setPersonalNote(val)
    localStorage.setItem(noteStorageKey, val)
  }

  const handleOpenEchoShop = () => {
    setPage?.('Loja')
    useUIStore.getState().setPage('Loja')
    onClose()
  }

  const handleOpenProfileSettings = () => {
    setPage?.('Configurações')
    useUIStore.getState().setPage('Configurações')
    onClose()
  }

  const handlePoke = () => {
    const nextCount = pokeCount + 1
    setPokeCount(nextCount)
    setIsPoking(true)
    setTimeout(() => setIsPoking(false), 450)

    try {
      if (nextCount >= 5) {
        playSoundboardEffect('levelup', 0.5)
      } else {
        playSoundboardEffect('ping', 0.5)
      }
    } catch {
      // AudioContext fallback
    }

    const name = inspectedMember.user.display_name
    if (nextCount === 1) {
      showToast('⚡ Cutucada enviada!', `Você cutucou ${name}!`, 'info')
    } else if (nextCount === 2) {
      showToast('⚡ Cutucou de novo!', `${name} recebeu o aviso!`, 'info')
    } else if (nextCount === 3) {
      showToast('💥 Combo Triplo!', `${name} recebeu 3 cutucadas seguidas!`, 'friend')
    } else if (nextCount >= 5) {
      showToast(`🔥 Super Combo (x${nextCount})!`, `Deixe ${name} respirar um pouco! 😂`, 'message')
    }
  }

  const handleCopyHandle = () => {
    const handle = `@${inspectedMember.user.display_name.toLowerCase().replace(/\s+/g, '')}`
    copyToClipboard(handle)
    setCopiedHandle(true)
    showToast('Nome Copiado!', `${handle} copiado para a área de transferência.`, 'info')
    setTimeout(() => setCopiedHandle(false), 2000)
  }

  const roleColor = inspectedMember.roleColor || 'var(--accent-color, #ff4d8d)'
  const handleName = inspectedMember.user.display_name.toLowerCase().replace(/\s+/g, '')

  const presenceLabel =
    userPresenceStatus === 'online'
      ? 'Online agora'
      : userPresenceStatus === 'idle'
        ? 'Ausente'
        : userPresenceStatus === 'dnd'
          ? 'Não perturbe'
          : isOnline
            ? 'Online'
            : 'Offline'

  const isBlocked = Boolean(!isMe && blockedUserIds?.has(memberId))

  return (
    <div className="screen-picker-overlay member-profile-overlay" onClick={onClose}>
      <div className="member-profile-card-modal" onClick={(e) => e.stopPropagation()}>
        <ProfileEffect effectId={profileEffect} />

        {/* 1. Banner com fusão suave em degradê até a superfície Matte */}
        <div
          className={`member-profile-banner ${bannerCustom ? 'has-custom-banner' : `texture-${bannerPreset || 'synthwave'}`}`}
          style={
            bannerCustom
              ? {
                  backgroundImage: `url(${bannerCustom})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }
              : {
                  background: `radial-gradient(circle at 80% 20%, ${roleColor}55, transparent 48%), linear-gradient(135deg, ${roleColor}dd 0%, #2a183b 55%, #18171e 100%)`
                }
          }
        >
          <div className="member-profile-banner-topbar">
            <div className="member-profile-banner-badges">
              {activeEffectMeta ? (
                <button
                  type="button"
                  className="member-cosmetic-banner-pill"
                  onClick={handleOpenEchoShop}
                  title="Ver efeito na EchoShop"
                >
                  <span>✨ {isMe ? `Efeito: ${activeEffectMeta.name}` : `Usa: ${activeEffectMeta.name}`}</span>
                </button>
              ) : activeDecorationMeta ? (
                <button
                  type="button"
                  className="member-cosmetic-banner-pill"
                  onClick={handleOpenEchoShop}
                  title="Ver moldura na EchoShop"
                >
                  <span>✨ {isMe ? `Moldura: ${activeDecorationMeta.name}` : `Usa: ${activeDecorationMeta.name}`}</span>
                </button>
              ) : isMe ? (
                <button
                  type="button"
                  className="member-cosmetic-banner-pill"
                  onClick={handleOpenEchoShop}
                  title="Personalizar seu cartão na EchoShop"
                >
                  <span>✨ Personalizar Cartão</span>
                </button>
              ) : null}
            </div>

            <button
              type="button"
              className="member-profile-close-btn"
              onClick={onClose}
              title="Fechar perfil"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="member-profile-body">
          {/* 2. Linha do Avatar + Ações Rápidas (sem o balão espremido no meio para nunca vazar do card) */}
          <div className="member-profile-avatar-row">
            <div className={`member-profile-avatar-large ${isPoking ? 'poke-animate' : ''}`}>
              {inspectedMember.user.avatar_url ? (
                <img src={inspectedMember.user.avatar_url} alt={inspectedMember.user.display_name} />
              ) : (
                inspectedMember.user.display_name.slice(0, 1).toUpperCase()
              )}
              {avatarDecoration && avatarDecoration !== 'none' && (
                <AvatarDecoration decorationId={avatarDecoration} />
              )}
              <span className={`member-profile-status-ring ${userPresenceStatus}`} />
            </div>

            <div className="member-profile-quick-actions">
              {isMe ? (
                <button
                  type="button"
                  className="member-quick-pill-btn"
                  onClick={handleOpenProfileSettings}
                  title="Editar perfil, avatar e status"
                >
                  <span>✏️ Editar Perfil</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="member-quick-icon-btn poke"
                    onClick={handlePoke}
                    title={pokeCount > 0 ? `Cutucar novamente (x${pokeCount})` : 'Cutucar com efeito sonoro ⚡'}
                  >
                    <ZapIcon style={{ width: '15px', height: '15px' }} />
                    {pokeCount > 0 && <span className="poke-counter-badge">x{pokeCount}</span>}
                  </button>

                  {onAddFriend && !friendship && (
                    <button
                      type="button"
                      className="member-quick-icon-btn friend-add"
                      onClick={() => onAddFriend(inspectedMember.user.id, inspectedMember.user.display_name)}
                      title="Adicionar aos amigos"
                    >
                      <UserPlusIcon style={{ width: '15px', height: '15px' }} />
                    </button>
                  )}

                  {friendship?.status === 'pending' && friendship.initiatorId === currentUser?.id && (
                    <button
                      type="button"
                      className="member-quick-icon-btn friend-pending"
                      disabled
                      title="Solicitação de amizade enviada"
                    >
                      <ClockIcon style={{ width: '15px', height: '15px' }} />
                    </button>
                  )}

                  {friendship?.status === 'pending' && friendship.initiatorId !== currentUser?.id && onAcceptFriend && (
                    <button
                      type="button"
                      className="member-quick-icon-btn friend-accept"
                      onClick={() => onAcceptFriend(friendship.id)}
                      title="Aceitar pedido de amizade"
                    >
                      <UserCheckIcon style={{ width: '15px', height: '15px' }} />
                    </button>
                  )}

                  {friendship?.status === 'accepted' && (
                    <button
                      type="button"
                      className="member-quick-icon-btn friend-accepted"
                      disabled
                      title="Vocês são amigos no Echo"
                    >
                      <UserCheckIcon style={{ width: '15px', height: '15px' }} />
                    </button>
                  )}

                  {voicePeer && onAdjustVolume && (
                    <button
                      type="button"
                      className="member-quick-icon-btn"
                      onClick={() => onAdjustVolume(voicePeer)}
                      title="Ajustar volume individual na chamada"
                    >
                      <VolumeIcon style={{ width: '15px', height: '15px' }} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 3. Identidade + Vitrine de Insígnias (sem tripla repetição de Dono) */}
          <div className="member-profile-header-info">
            <div className="member-profile-name-line">
              <div className="member-profile-name-cluster">
                <h3 className="member-profile-display-name" style={nameFontStyle(isMe ? myNameFont : readStoredNameFont(memberId))}>{inspectedMember.user.display_name}</h3>
                {memberClanTag && (
                  <span
                    className="member-clan-tag"
                    style={{
                      color: memberClanTagColor,
                      borderColor: `${memberClanTagColor}55`,
                      background: `${memberClanTagColor}15`
                    }}
                  >
                    [{memberClanTag}]
                  </span>
                )}
              </div>

              {/* Vitrine compacta de Insígnias */}
              {(memberBadge && memberBadge !== 'none') || activeEffectMeta || activeDecorationMeta ? (
                <div className="member-badge-showcase" title="Insígnias e Coleção">
                  {memberBadge && memberBadge !== 'none' && (
                    <CommunityBadge badgeId={memberBadge} size={15} showLabel={false} />
                  )}
                  {activeEffectMeta && (
                    <span className="member-mini-badge pink" title={`Efeito: ${activeEffectMeta.name}`}>
                      🌸
                    </span>
                  )}
                  {activeDecorationMeta && (
                    <span className="member-mini-badge cyan" title={`Moldura: ${activeDecorationMeta.name}`}>
                      💎
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            <div className="member-profile-handle-row">
              <button
                type="button"
                className="member-profile-handle-btn"
                onClick={handleCopyHandle}
                title="Clique para copiar menção @"
              >
                <span>@{handleName}</span>
                <span className={`handle-copy-hint ${copiedHandle ? 'copied' : ''}`}>
                  {copiedHandle ? (
                    '✓ Copiado'
                  ) : (
                    <>
                      <CopyIcon style={{ width: '11px', height: '11px' }} />
                      <span>Copiar</span>
                    </>
                  )}
                </span>
              </button>
              <span className="member-handle-dot" />
              <span className={`member-presence-inline ${userPresenceStatus}`}>
                ● {presenceLabel}
              </span>
            </div>

            {/* Balão de pensamento / Status personalizado com largura protegida */}
            {validCustomStatus && (
              <div
                className="member-profile-thought-bubble"
                onClick={isMe ? handleOpenProfileSettings : undefined}
                style={{ cursor: isMe ? 'pointer' : 'default' }}
                title={isMe ? 'Clique para alterar seu status personalizado' : undefined}
              >
                <span className="thought-icon">💭</span>
                <span className="thought-text">{validCustomStatus}</span>
              </div>
            )}
          </div>

          {/* 4. Cápsula Interna Matte (#18171e) — Protege leitura contra Efeitos de Vídeo */}
          <div className="member-matte-well">
            {/* Atividade em Tempo Real (Jogando ou Em Chamada de Voz) */}
            {activeGame ? (
              <div
                className="member-activity-card gaming"
                style={{
                  background: `linear-gradient(135deg, ${gameBrandColor}18 0%, ${gameBrandColor}06 100%)`,
                  borderColor: `${gameBrandColor}44`
                }}
              >
                <div className="member-activity-header" style={{ color: gameBrandColor }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <GameLogo gameName={activeGame} size={13} />
                    <span>Jogando Agora</span>
                  </span>
                  <span
                    className="member-activity-live-pill"
                    style={{
                      background: `${gameBrandColor}22`,
                      color: gameBrandColor,
                      borderColor: `${gameBrandColor}44`
                    }}
                  >
                    AO VIVO
                  </span>
                </div>
                <div className="member-activity-body">
                  <div
                    className="member-activity-icon-wrap"
                    style={{
                      background: `${gameBrandColor}18`,
                      border: `1px solid ${gameBrandColor}33`
                    }}
                  >
                    <GameLogo gameName={activeGame} size={22} />
                  </div>
                  <div className="member-activity-meta">
                    <h4 className="member-activity-name">{activeGame}</h4>
                    <p className="member-activity-sub">
                      {activeGameStartedAt ? formatGameDuration(activeGameStartedAt) : 'Em partida'}
                    </p>
                  </div>
                </div>
              </div>
            ) : isVoiceUser ? (
              <div className="member-activity-card voice">
                <div className="member-activity-body">
                  <div className="member-activity-icon-wrap voice">
                    <MicIcon style={{ width: '17px', height: '17px' }} />
                  </div>
                  <div className="member-activity-meta">
                    <div className="member-activity-voice-label">
                      <span>Em Canal de Voz</span>
                      <div className="voice-equalizer-wave">
                        <span className="voice-wave-bar" />
                        <span className="voice-wave-bar" />
                        <span className="voice-wave-bar" />
                      </div>
                    </div>
                    <h4 className="member-activity-name">{voiceChannelName || 'Sala de Áudio'}</h4>
                  </div>
                </div>
              </div>
            ) : null}

            {/* VISÃO 1 (PRÓPRIO PERFIL): Vitrine de Cosméticos Equipados -> Retenção na EchoShop */}
            {isMe && (
              <div className="member-loadout-section">
                <div className="member-section-header-row">
                  <span className="member-profile-section-title">✨ COSMÉTICOS EQUIPADOS</span>
                  <button
                    type="button"
                    className="member-section-link-btn"
                    onClick={handleOpenEchoShop}
                  >
                    Abrir EchoShop →
                  </button>
                </div>
                <div className="member-loadout-grid">
                  <button
                    type="button"
                    className="member-loadout-item"
                    onClick={handleOpenEchoShop}
                    title="Trocar Efeito de Perfil na EchoShop"
                  >
                    <span className="member-loadout-swatch">🌸</span>
                    <div className="member-loadout-info">
                      <span className="member-loadout-type">Efeito de Perfil</span>
                      <span className="member-loadout-name">
                        {activeEffectMeta ? activeEffectMeta.name : 'Escolher na Loja'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="member-loadout-item"
                    onClick={handleOpenEchoShop}
                    title="Trocar Moldura de Avatar na EchoShop"
                  >
                    <span className="member-loadout-swatch">💎</span>
                    <div className="member-loadout-info">
                      <span className="member-loadout-type">Moldura</span>
                      <span className="member-loadout-name">
                        {activeDecorationMeta ? activeDecorationMeta.name : 'Escolher na Loja'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Cargos no Espaço (Único lugar para cargos, sem tripla redundância!) */}
            <div className="member-profile-roles-section">
              <span className="member-profile-section-title">CARGOS NO ESPAÇO</span>
              <div className="member-profile-roles-wrap">
                {inspectedMember.roles && inspectedMember.roles.length > 0 ? (
                  inspectedMember.roles.map(r => {
                    const isOwnerRole = r.name.toLowerCase().includes('dono') || isServerOwner
                    const cleanRoleName = r.name.replace(/^[\p{Emoji}\s]+/gu, '').trim() || r.name
                    return (
                      <span
                        key={r.id}
                        className="member-role-pill"
                        style={{
                          color: roleInk(r.color),
                          borderColor: `${r.color}55`,
                          background: `${r.color}16`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <span className="role-dot" style={{ background: r.color }} />
                        {isOwnerRole && <CrownIcon style={{ width: '11px', height: '11px', color: r.color }} />}
                        <span>{cleanRoleName}</span>
                      </span>
                    )
                  })
                ) : (
                  <span
                    className="member-role-pill default"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <span className="role-dot" />
                    {isServerOwner && <CrownIcon style={{ width: '11px', height: '11px', color: '#ffb703' }} />}
                    <span>{inspectedMember.roleName?.replace(/^[\p{Emoji}\s]+/gu, '').trim() || 'Membro'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* VISÃO 2 (OUTRO MEMBRO): Nota Pessoal Compacta sob Demanda */}
            {!isMe && (
              <div className="member-private-note-section">
                {!isNoteOpen && !personalNote.trim() ? (
                  <button
                    type="button"
                    className="member-compact-note-trigger"
                    onClick={() => setIsNoteOpen(true)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <LockIcon style={{ width: '11px', height: '11px' }} />
                      <span>Nota privada sobre @{handleName}</span>
                    </span>
                    <span className="member-compact-note-add">+ Adicionar</span>
                  </button>
                ) : (
                  <div className="member-note-expanded">
                    <label className="member-private-note-label">
                      <LockIcon style={{ width: '11px', height: '11px' }} />
                      <span>NOTA PESSOAL (SÓ VOCÊ VÊ)</span>
                    </label>
                    <textarea
                      className="member-private-note-input"
                      rows={2}
                      value={personalNote}
                      onChange={(e) => handleNoteChange(e.target.value)}
                      onBlur={() => {
                        if (!personalNote.trim()) setIsNoteOpen(false)
                      }}
                      placeholder="Adicione uma anotação privada sobre este membro..."
                    />
                  </div>
                )}
              </div>
            )}

            {/* CTA Principal */}
            <div className="member-profile-actions">
              {isMe ? (
                <button
                  type="button"
                  className="member-profile-action-btn primary"
                  onClick={handleOpenEchoShop}
                >
                  <span>✨ Personalizar Cartão na EchoShop</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="member-profile-action-btn primary"
                  onClick={() => onOpenDM(inspectedMember.user.id)}
                >
                  <MessageSquareIcon />
                  <span>Conversar no Privado</span>
                </button>
              )}
            </div>
          </div>

          {/* 5. Rodapé: só o bloquear/desbloquear (os selos "Fundador do Espaço" e "Echo Pass" saíram: não diziam nada) */}
          {!isMe && onBlockUser && onUnblockUser && (
            <div className="member-profile-footer" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className={`member-footer-block-link ${isBlocked ? 'unblock' : ''}`}
                onClick={() =>
                  isBlocked
                    ? onUnblockUser(memberId, inspectedMember.user.display_name)
                    : onBlockUser(memberId, inspectedMember.user.display_name)
                }
              >
                <BanIcon style={{ width: '11px', height: '11px' }} />
                <span>{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

