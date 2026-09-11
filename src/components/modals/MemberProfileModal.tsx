import { useState } from 'react'
import { ProfileEffect } from '../ProfileEffect'
import { AvatarDecoration } from '../AvatarDecoration'
import { playSoundboardEffect } from '../../lib/soundEffects'
import { copyToClipboard } from '../../lib/clipboard'
import { formatGameDuration } from '../../lib/formatters'
import {
  CrownIcon,
  MicIcon,
  GamepadIcon,
  UserPlusIcon,
  UserCheckIcon,
  ZapIcon,
  CopyIcon,
  MessageSquareIcon,
  VolumeIcon,
  LockIcon,
  ClockIcon
} from '../icons'
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
  onOpenDM,
  onAdjustVolume,
  voicePeer,
  showToast,
  friendships = [],
  onAddFriend,
  onAcceptFriend
}: MemberProfileModalProps) {
  const [pokeCount, setPokeCount] = useState(0)
  const [isPoking, setIsPoking] = useState(false)
  const [copiedHandle, setCopiedHandle] = useState(false)

  const memberId = inspectedMember.user.id
  const isMe = currentUser?.id === memberId
  const friendship = friendships.find(f => f.user.id === memberId)
  const noteStorageKey = `echo-member-note-${memberId}`
  const [personalNote, setPersonalNote] = useState<string>(() => {
    return localStorage.getItem(noteStorageKey) || ''
  })

  const handleNoteChange = (val: string) => {
    setPersonalNote(val)
    localStorage.setItem(noteStorageKey, val)
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

  const roleColor = inspectedMember.roleColor || 'var(--accent-color, #00f2fe)'
  const handleName = inspectedMember.user.display_name.toLowerCase().replace(/\s+/g, '')

  return (
    <div className="screen-picker-overlay member-profile-overlay" onClick={onClose}>
      <div className="member-profile-card-modal" onClick={(e) => e.stopPropagation()}>
        <ProfileEffect effectId={profileEffect} />
        {/* Banner with dynamic aurora mesh gradient & badges */}
        <div 
          className="member-profile-banner" 
          style={{ 
            background: `linear-gradient(135deg, ${roleColor}ee 0%, #1e1b4b 60%, #0b0f19 100%)` 
          }}
        >
          <div className="member-profile-banner-badges">
            {isServerOwner && (
              <span className="member-banner-badge" title="Dono deste espaço">
                <CrownIcon style={{ width: '12px', height: '12px' }} />
                <span>Dono</span>
              </span>
            )}
            {isVoiceUser && (
              <span className="member-banner-badge" style={{ background: 'rgba(34, 197, 94, 0.45)', borderColor: '#22c55e' }}>
                <MicIcon style={{ width: '12px', height: '12px' }} />
                <span>Em Call</span>
              </span>
            )}
            {activeGame && (
              <span className="member-banner-badge" style={{ background: 'rgba(59, 130, 246, 0.45)', borderColor: '#3b82f6' }}>
                <GamepadIcon style={{ width: '12px', height: '12px' }} />
                <span>Jogando</span>
              </span>
            )}
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

        <div className="member-profile-body">
          {/* Avatar row with poke trigger */}
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

            {!isMe && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!friendship && onAddFriend && (
                  <button 
                    type="button" 
                    className="member-profile-friend-quick-trigger"
                    onClick={() => onAddFriend(inspectedMember.user.id, inspectedMember.user.display_name)}
                    title="Adicionar aos amigos"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      color: '#34d399',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <UserPlusIcon style={{ width: '13px', height: '13px' }} />
                    <span>Adicionar</span>
                  </button>
                )}

                <button 
                  type="button" 
                  className="member-profile-poke-trigger"
                  onClick={handlePoke}
                  title="Cutucar com efeito de som divertido"
                >
                  <ZapIcon style={{ width: '13px', height: '13px' }} />
                  <span>{pokeCount > 0 ? `Cutucar (x${pokeCount})` : 'Cutucar'}</span>
                </button>
              </div>
            )}
          </div>

          {/* User Display Name, Clan Tag, Copyable @handle */}
          <div className="member-profile-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 className="member-profile-display-name">{inspectedMember.user.display_name}</h3>
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

            <div className="member-profile-handle-row">
              <button 
                type="button" 
                className="member-profile-handle-btn" 
                onClick={handleCopyHandle}
                title="Clique para copiar menção @"
              >
                <span>@{handleName}</span>
                <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: copiedHandle ? '#10b981' : 'var(--text-muted)' }}>
                  {copiedHandle ? '✓ Copiado!' : (
                    <>
                      <CopyIcon style={{ width: '11px', height: '11px' }} />
                      <span>Copiar</span>
                    </>
                  )}
                </span>
              </button>
            </div>

            {validCustomStatus && (
              <div className="member-profile-custom-status">
                <MessageSquareIcon style={{ width: '13px', height: '13px', color: 'var(--accent-color, #00f2fe)', flexShrink: 0 }} />
                <span>{validCustomStatus}</span>
              </div>
            )}
          </div>

          {/* Activity Presence Card */}
          {activeGame ? (
            <div className="member-activity-card gaming">
              <div className="member-activity-header">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <GamepadIcon style={{ width: '13px', height: '13px' }} />
                  <span>Jogando Agora</span>
                </span>
                <span style={{ fontSize: '10px', background: 'rgba(34, 197, 94, 0.2)', padding: '2px 6px', borderRadius: '4px', color: '#4ade80' }}>
                  AO VIVO
                </span>
              </div>
              <div className="member-activity-body">
                <div className="member-activity-icon-wrap" style={{ color: '#4ade80' }}>
                  <GamepadIcon style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <h4 className="member-activity-name">{activeGame}</h4>
                  <p className="member-activity-sub">Echo Game Presence • {activeGameStartedAt ? formatGameDuration(activeGameStartedAt) : 'Em partida'}</p>
                </div>
              </div>
            </div>
          ) : isVoiceUser ? (
            <div className="member-activity-card voice">
              <div className="member-activity-header">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <VolumeIcon style={{ width: '13px', height: '13px' }} />
                  <span>Em Chamada de Voz</span>
                </span>
                <div className="voice-equalizer-wave">
                  <span className="voice-wave-bar" />
                  <span className="voice-wave-bar" />
                  <span className="voice-wave-bar" />
                </div>
              </div>
              <div className="member-activity-body">
                <div className="member-activity-icon-wrap" style={{ color: '#818cf8' }}>
                  <MicIcon style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <h4 className="member-activity-name">{voiceChannelName || 'Canal de Voz'}</h4>
                  <p className="member-activity-sub">Conectado na sala de áudio</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Private Personal Note */}
          <div className="member-private-note-section">
            <label className="member-private-note-label">
              <LockIcon style={{ width: '11px', height: '11px' }} />
              <span>NOTA PESSOAL (APENAS VOCÊ VÊ)</span>
            </label>
            <textarea
              className="member-private-note-input"
              rows={2}
              value={personalNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Clique para adicionar uma anotação privada sobre este membro..."
            />
          </div>

          {/* Roles Section */}
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
                      style={{ color: r.color, borderColor: `${r.color}66`, background: `${r.color}15`, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <span className="role-dot" style={{ background: r.color }} />
                      {isOwnerRole && <CrownIcon style={{ width: '11px', height: '11px', color: r.color }} />}
                      <span>{cleanRoleName}</span>
                    </span>
                  )
                })
              ) : (
                <span className="member-role-pill default" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span className="role-dot" />
                  {isServerOwner && <CrownIcon style={{ width: '11px', height: '11px', color: '#ffb703' }} />}
                  <span>{inspectedMember.roleName?.replace(/^[\p{Emoji}\s]+/gu, '').trim() || 'Membro'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions Section */}
          <div className="member-profile-actions">
            {!isMe && (
              <button 
                type="button" 
                className="member-profile-action-btn primary"
                onClick={() => onOpenDM(inspectedMember.user.id)}
              >
                <MessageSquareIcon />
                <span>Conversar no Privado</span>
              </button>
            )}

            {!isMe && onAddFriend && (
              <>
                {!friendship && (
                  <button
                    type="button"
                    className="member-profile-action-btn success"
                    onClick={() => onAddFriend(inspectedMember.user.id, inspectedMember.user.display_name)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
                    }}
                    title="Enviar pedido de amizade"
                  >
                    <UserPlusIcon style={{ width: '15px', height: '15px' }} />
                    <span>Adicionar Amigo</span>
                  </button>
                )}

                {friendship?.status === 'pending' && friendship.initiatorId === currentUser?.id && (
                  <button
                    type="button"
                    className="member-profile-action-btn secondary"
                    disabled
                    style={{
                      opacity: 0.85,
                      cursor: 'default',
                      borderColor: 'rgba(234, 179, 8, 0.4)',
                      color: '#facc15'
                    }}
                    title="Você já enviou um pedido de amizade"
                  >
                    <ClockIcon style={{ width: '15px', height: '15px' }} />
                    <span>Solicitação Enviada</span>
                  </button>
                )}

                {friendship?.status === 'pending' && friendship.initiatorId !== currentUser?.id && onAcceptFriend && (
                  <button
                    type="button"
                    className="member-profile-action-btn success"
                    onClick={() => onAcceptFriend(friendship.id)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
                    }}
                    title="Aceitar pedido de amizade pendente"
                  >
                    <UserCheckIcon style={{ width: '15px', height: '15px' }} />
                    <span>Aceitar Amizade</span>
                  </button>
                )}

                {friendship?.status === 'accepted' && (
                  <button
                    type="button"
                    className="member-profile-action-btn secondary"
                    disabled
                    style={{
                      opacity: 0.85,
                      cursor: 'default',
                      borderColor: 'rgba(16, 185, 129, 0.35)',
                      color: '#34d399'
                    }}
                    title="Vocês já são amigos no Echo"
                  >
                    <UserCheckIcon style={{ width: '15px', height: '15px' }} />
                    <span>Amigos</span>
                  </button>
                )}
              </>
            )}

            {voicePeer && !isMe && onAdjustVolume && (
              <button 
                type="button" 
                className="member-profile-action-btn secondary"
                onClick={() => onAdjustVolume(voicePeer)}
              >
                <VolumeIcon />
                <span>Ajustar Volume</span>
              </button>
            )}
          </div>

          <div className="member-profile-footer">
            <span>ECHO // VERIFIED PASS</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span>STATUS:</span>
              <span className={`status-dot-bullet ${isOnline ? 'online' : 'offline'}`} style={{ width: '6px', height: '6px' }} />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
