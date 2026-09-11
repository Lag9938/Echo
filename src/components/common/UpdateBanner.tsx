export interface UpdateBannerProps {
  updateStatus: 'idle' | 'downloading' | 'ready' | string
  updateVersion: string
  updateProgress: number
  onRestart: () => void
}

export function UpdateBanner({ updateStatus, updateVersion, updateProgress, onRestart }: UpdateBannerProps) {
  if (updateStatus === 'idle') return null

  return (
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
          <span>✅ Atualização v{updateVersion} pronta!</span>
          <button className="update-restart-btn" onClick={onRestart}>
            Reiniciar para atualizar
          </button>
        </>
      )}
    </div>
  )
}
