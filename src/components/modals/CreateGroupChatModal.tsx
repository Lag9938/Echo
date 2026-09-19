import { useState, useCallback } from 'react'
import type { FriendshipRequest } from '../../types'
import { SearchIcon, UsersIcon, XIcon } from '../icons'

interface CreateGroupChatModalProps {
  onClose: () => void
  onCreateGroup: (name: string, memberIds: string[]) => Promise<string | null>
  acceptedFriends: FriendshipRequest[]
}

export function CreateGroupChatModal({ onClose, onCreateGroup, acceptedFriends }: CreateGroupChatModalProps) {
  const [groupName, setGroupName] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const filtered = acceptedFriends.filter(f =>
    f.user.display_name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleFriend = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 9) next.add(id)
      return next
    })
  }, [])

  const handleCreate = useCallback(async () => {
    if (!groupName.trim() || selectedIds.size < 1) return
    setIsCreating(true)
    try {
      await onCreateGroup(groupName.trim(), [...selectedIds])
      onClose()
    } finally {
      setIsCreating(false)
    }
  }, [groupName, selectedIds, onCreateGroup, onClose])

  return (
    <div className="screen-picker-overlay" onClick={onClose}>
      <div
        className="member-profile-card-modal"
        style={{ maxWidth: 420, width: '90vw', padding: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <UsersIcon style={{ width: 18, height: 18, color: 'var(--accent-color)' }} />
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Criar Grupo</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4
            }}
          >
            <XIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Group name */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 6, letterSpacing: '0.05em' }}>
              NOME DO GRUPO
            </label>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Ex: Equipe de Ranked..."
              maxLength={60}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '9px 12px',
                color: '#fff', fontSize: 14, outline: 'none'
              }}
            />
          </div>

          {/* Friend search */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 6, letterSpacing: '0.05em' }}>
              ADICIONAR AMIGOS ({selectedIds.size}/9)
            </label>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <SearchIcon style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                width: 14, height: 14, color: 'rgba(255,255,255,0.35)', pointerEvents: 'none'
              }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar amigos..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, padding: '7px 12px 7px 32px',
                  color: '#fff', fontSize: 13, outline: 'none'
                }}
              />
            </div>

            {/* Selected chips */}
            {selectedIds.size > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {acceptedFriends.filter(f => selectedIds.has(f.user.id)).map(f => (
                  <span
                    key={f.user.id}
                    style={{
                      background: 'rgba(var(--accent-rgb, 0,242,254), 0.15)',
                      border: '1px solid rgba(var(--accent-rgb, 0,242,254), 0.3)',
                      borderRadius: 20, padding: '3px 10px 3px 6px',
                      fontSize: 12, color: '#fff',
                      display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer'
                    }}
                    onClick={() => toggleFriend(f.user.id)}
                  >
                    {f.user.avatar_url ? (
                      <img src={f.user.avatar_url} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>
                        {f.user.display_name[0]?.toUpperCase()}
                      </span>
                    )}
                    {f.user.display_name}
                    <XIcon style={{ width: 10, height: 10, opacity: 0.6 }} />
                  </span>
                ))}
              </div>
            )}

            {/* Friend list */}
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filtered.length === 0 && (
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '12px 0' }}>
                  Nenhum amigo encontrado
                </span>
              )}
              {filtered.map(f => {
                const isSelected = selectedIds.has(f.user.id)
                return (
                  <button
                    key={f.user.id}
                    type="button"
                    onClick={() => toggleFriend(f.user.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      background: isSelected ? 'rgba(var(--accent-rgb, 0,242,254), 0.1)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: `2px solid ${isSelected ? 'var(--accent-color, #00f2fe)' : 'rgba(255,255,255,0.25)'}`,
                      background: isSelected ? 'var(--accent-color, #00f2fe)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      transition: 'all 0.15s'
                    }}>
                      {isSelected && <span style={{ color: '#000', fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>

                    {/* Avatar */}
                    {f.user.avatar_url ? (
                      <img src={f.user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
                          {f.user.display_name[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}

                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                      {f.user.display_name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '9px 0',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: 'rgba(255,255,255,0.7)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!groupName.trim() || selectedIds.size < 1 || isCreating}
              style={{
                flex: 2, padding: '9px 0',
                background: !groupName.trim() || selectedIds.size < 1
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, var(--accent-color, #00f2fe), #4facfe)',
                border: 'none', borderRadius: 8,
                color: !groupName.trim() || selectedIds.size < 1 ? 'rgba(255,255,255,0.35)' : '#000',
                fontSize: 13, fontWeight: 700,
                cursor: !groupName.trim() || selectedIds.size < 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {isCreating ? 'Criando...' : `Criar Grupo${selectedIds.size > 0 ? ` (${selectedIds.size + 1})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
