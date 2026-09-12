import type { FormEvent } from 'react'

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
      <div className="screen-picker-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        {addSpaceModalTab === 'options' && (
          <>
            <h2 style={{ textAlign: 'center' }}>Adicionar um espaço</h2>
            <p style={{ textAlign: 'center' }}>Um espaço é onde você e seus amigos se reúnem. Crie o seu próprio ou junte-se a um já existente.</p>
            <div className="add-space-modal-cards">
              <div className="add-space-card">
                <span className="add-space-card-icon">🎨</span>
                <h3>Criar o meu</h3>
                <p>Comece um espaço do seu jeito e convide os amigos para conversar.</p>
                <button className="add-space-card-btn" onClick={() => setAddSpaceModalTab('create')}>Criar Espaço</button>
              </div>
              <div className="add-space-card">
                <span className="add-space-card-icon">🤝</span>
                <h3>Entrar em um</h3>
                <p>Tem um link de convite? Junte-se a um espaço ativo agora.</p>
                <button className="add-space-card-btn" onClick={() => setAddSpaceModalTab('join')}>Entrar no Espaço</button>
              </div>
            </div>
            <button className="picker-close-btn" style={{ width: '100%', marginTop: '16px' }} onClick={onClose}>Cancelar</button>
          </>
        )}

        {addSpaceModalTab === 'create' && (
          <>
            <h2>Criar seu espaço</h2>
            <p>Dê um nome ao seu novo espaço. Você poderá alterá-lo a qualquer momento.</p>
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
                placeholder="Nome do espaço" 
                required 
                minLength={2}
                maxLength={80}
              />
              <button type="submit" className="add-space-modal-submit-btn" disabled={creating}>
                {creating ? 'Criando...' : 'Criar'}
              </button>
            </form>
            <button className="add-space-modal-back-btn" onClick={() => setAddSpaceModalTab('options')}>Voltar</button>
          </>
        )}

        {addSpaceModalTab === 'join' && (
          <>
            <h2>Entrar em um espaço</h2>
            <p>Cole o link ou código de convite enviado por um amigo para se juntar ao espaço.</p>
            <form 
              onSubmit={async (e) => { 
                e.preventDefault(); 
                await joinSpace(e); 
                onClose(); 
              }} 
              className="add-space-modal-form"
            >
              <input 
                value={joinSpaceCode} 
                onChange={(e) => setJoinSpaceCode(e.target.value)} 
                placeholder="Link de convite ou código do espaço" 
                required 
              />
              <button type="submit" className="add-space-modal-submit-btn" disabled={joining}>
                {joining ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <button className="add-space-modal-back-btn" onClick={() => setAddSpaceModalTab('options')}>Voltar</button>
          </>
        )}
      </div>
    </div>
  )
}
