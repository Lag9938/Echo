import { useState } from 'react'
import { EchoAtomLogo } from '../icons'

export interface UpdateBannerProps {
  updateStatus: 'idle' | 'downloading' | 'ready' | string
  updateVersion: string
  updateProgress: number
  onRestart: () => void
}

export function UpdateBanner({ updateStatus, updateVersion, updateProgress, onRestart }: UpdateBannerProps) {
  const [isApplying, setIsApplying] = useState(false)

  if (updateStatus === 'idle' && !isApplying) return null

  const handleRestart = () => {
    setIsApplying(true)
    onRestart()
  }

  return (
    <>
      {updateStatus !== 'idle' && !isApplying && (
        <div className="update-banner">
          {updateStatus === 'downloading' ? (
            <>
              <span>⬇️ Baixando atualização v{updateVersion}... {updateProgress}%</span>
              <div className="update-progress-bar">
                <div className="update-progress-fill" style={{ width: `${updateProgress}%` }} />
              </div>
            </>
          ) : (
            <>
              <span>✅ Nova versão v{updateVersion} pronta!</span>
              <button className="update-restart-btn" onClick={handleRestart}>
                Reiniciar para atualizar
              </button>
            </>
          )}
        </div>
      )}

      {isApplying && (
        <div className="update-applying-overlay">
          <div className="update-applying-modal">
            <div className="brand-mark-atom" style={{ width: 44, height: 44, margin: '0 auto' }}>
              <EchoAtomLogo size={34} />
            </div>
            <h3>Atualizando o Echo</h3>
            <p>Aplicando a versão v{updateVersion} em segundo plano…</p>
            <div className="loader" />
            <span>O aplicativo reiniciará automaticamente em instantes.</span>
          </div>
        </div>
      )}
    </>
  )
}
