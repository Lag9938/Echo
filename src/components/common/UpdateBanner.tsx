import { useState } from 'react'
import { CheckIcon, DownloadIcon, EchoAtomLogo } from '../icons'

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

  const percent = Math.max(0, Math.min(100, Math.round(updateProgress || 0)))

  return (
    <>
      {updateStatus !== 'idle' && !isApplying && (
        <div className={`update-banner ${updateStatus === 'ready' ? 'is-ready' : 'is-downloading'}`} role="status" aria-live="polite">
          <div className="update-banner-icon" aria-hidden="true">
            {updateStatus === 'downloading' ? (
              <>
                <span className="update-banner-ring" />
                <DownloadIcon style={{ width: 16, height: 16 }} />
              </>
            ) : (
              <CheckIcon style={{ width: 16, height: 16 }} />
            )}
          </div>

          {updateStatus === 'downloading' ? (
            <div className="update-banner-body">
              <div className="update-banner-line">
                <strong>Baixando a versão {updateVersion}</strong>
                <span className="update-banner-percent">{percent}%</span>
              </div>
              <div className="update-progress-bar">
                <div className="update-progress-fill" style={{ width: `${Math.max(percent, 4)}%` }} />
              </div>
            </div>
          ) : (
            <>
              <div className="update-banner-body">
                <div className="update-banner-line">
                  <strong>Nova versão {updateVersion} pronta</strong>
                </div>
                <span className="update-banner-sub">Reinicie o Echo para usar as novidades.</span>
              </div>
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
            <div className="update-applying-orbit" aria-hidden="true">
              <span className="update-applying-ring" />
              <span className="update-applying-ring is-outer" />
              <EchoAtomLogo size={34} />
            </div>
            <h3>Atualizando o Echo</h3>
            <p>Aplicando a versão {updateVersion} em segundo plano…</p>
            <div className="update-applying-track" aria-hidden="true">
              <span className="update-applying-bar" />
            </div>
            <span className="update-applying-note">O aplicativo reinicia sozinho em instantes.</span>
          </div>
        </div>
      )}
    </>
  )
}
