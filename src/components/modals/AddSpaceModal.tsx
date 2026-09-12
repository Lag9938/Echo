import type { FormEvent } from 'react'
import { UsersIcon, SparklesIcon, LinkIcon } from '../icons'

export function AddSpaceModal({
  isOpen,
  onClose,
  addSpaceModalTab,
  setAddSpaceModalTab,
  newSpace,
  setNewSpace,
  creating,
  createSpace,
  joinSpaceCode,
  setJoinSpaceCode,
  joining,
  joinSpace
}: {
  isOpen: boolean
  onClose: () => void
  addSpaceModalTab: 'options' | 'create' | 'join'
  setAddSpaceModalTab: (tab: 'options' | 'create' | 'join') => void
  newSpace: string
  setNewSpace: (val: string) => void
  creating: boolean
  createSpace: (e: FormEvent) => Promise<void> | void
  joinSpaceCode: string
  setJoinSpaceCode: (val: string) => void
  joining: boolean
  joinSpace: (e: FormEvent) => Promise<void> | void
}) {
  if (!isOpen) return null

  return (
    <div className="screen-picker-overlay" onClick={onClose}>
      <div className="screen-picker-modal" style={{ maxWidth: '520px', borderRadius: '16px', border: '1px solid rgba(0, 242, 254, 0.22)', background: 'linear-gradient(145deg, #141824, #0d1018)', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)' }} onClick={(e) => e.stopPropagation()}>
        {addSpaceModalTab === 'options' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#fff' }}>Adicionar um Espaço</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.4' }}>
                Um espaço é onde você e seus amigos se reúnem. Crie o seu próprio ou junte-se a um já existente.
              </p>
            </div>

            <div className="add-space-modal-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Criar */}
              <div 
                className="add-space-card"
                onClick={() => setAddSpaceModalTab('create')}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '18px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(0, 114, 255, 0.1))',
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#00f2fe',
                  marginBottom: '12px'
                }}>
                  <SparklesIcon style={{ width: '22px', height: '22px' }} />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#fff' }}>Criar o meu</h3>
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)', minHeight: '34px' }}>
                  Comece um espaço personalizado e convide seus amigos.
                </p>
                <button 
                  className="add-space-card-btn" 
                  type="button"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.15)', border: '1px solid rgba(0, 242, 254, 0.4)', color: '#00f2fe', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  Criar Espaço
                </button>
              </div>

              {/* Entrar */}
              <div 
                className="add-space-card"
                onClick={() => setAddSpaceModalTab('join')}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '18px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#10b981',
                  marginBottom: '12px'
                }}>
                  <UsersIcon style={{ width: '22px', height: '22px' }} />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#fff' }}>Entrar em um</h3>
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)', minHeight: '34px' }}>
                  Tem um link ou código de convite? Conecte-se agora.
                </p>
                <button 
                  className="add-space-card-btn" 
                  type="button"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, #00c6ff, #0072ff)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  Entrar no Espaço
                </button>
              </div>
            </div>

            <button className="picker-close-btn" style={{ width: '100%', marginTop: '18px', padding: '9px 0', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.65)', cursor: 'pointer' }} onClick={onClose}>Cancelar</button>
          </>
        )}

        {addSpaceModalTab === 'create' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 800, color: '#fff' }}>Criar seu espaço</h2>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.6)' }}>Dê um nome ao seu novo espaço. Você poderá personalizá-lo a qualquer momento.</p>
            </div>
            <form 
              onSubmit={async (e) => { 
                e.preventDefault(); 
                await createSpace(e); 
                onClose(); 
              }} 
              className="add-space-modal-form"
            >
              <input 
                value={newSpace} 
                onChange={(e) => setNewSpace(e.target.value)} 
                placeholder="Ex: Servidor dos Amigos, Equipe Valorant..." 
                required 
                minLength={2}
                maxLength={80}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '13.5px', marginBottom: '16px' }}
              />
              <button 
                type="submit" 
                className="add-space-modal-submit-btn" 
                disabled={creating}
                style={{ width: '100%', padding: '10px 0', borderRadius: '8px', background: 'linear-gradient(135deg, #00c6ff, #0072ff)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: creating ? 'not-allowed' : 'pointer' }}
              >
                {creating ? 'Criando...' : 'Criar Espaço'}
              </button>
            </form>
            <button className="add-space-modal-back-btn" style={{ marginTop: '12px', background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer', fontSize: '12px' }} onClick={() => setAddSpaceModalTab('options')}>← Voltar</button>
          </>
        )}

        {addSpaceModalTab === 'join' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 800, color: '#fff' }}>Entrar em um espaço</h2>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.6)' }}>Cole o link de convite ou o ID do espaço enviado por um amigo.</p>
            </div>
            <form 
              onSubmit={async (e) => { 
                e.preventDefault(); 
                await joinSpace(e); 
                onClose(); 
              }} 
              className="add-space-modal-form"
            >
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input 
                  value={joinSpaceCode} 
                  onChange={(e) => setJoinSpaceCode(e.target.value)} 
                  placeholder="https://lag9938.github.io/Echo/invite/?space=... ou código" 
                  required 
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(0, 242, 254, 0.25)', color: '#fff', fontSize: '13px' }}
                />
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <LinkIcon style={{ width: '12px', height: '12px', color: '#00f2fe' }} />
                <span>Aceita links completos de convite (https://...), links echo:// ou UUIDs.</span>
              </p>
              <button 
                type="submit" 
                className="add-space-modal-submit-btn" 
                disabled={joining}
                style={{ width: '100%', padding: '10px 0', borderRadius: '8px', background: 'linear-gradient(135deg, #00c6ff, #0072ff)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: joining ? 'not-allowed' : 'pointer' }}
              >
                {joining ? 'Entrando no Espaço...' : 'Entrar no Espaço'}
              </button>
            </form>
            <button className="add-space-modal-back-btn" style={{ marginTop: '12px', background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer', fontSize: '12px' }} onClick={() => setAddSpaceModalTab('options')}>← Voltar</button>
          </>
        )}
      </div>
    </div>
  )
}

