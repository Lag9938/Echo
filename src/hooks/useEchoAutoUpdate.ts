import { useEffect, useState } from 'react'

export type UpdateStatus = 'idle' | 'downloading' | 'ready'

/**
 * Estado da atualização automática, vindo do Electron: baixando (com o progresso) ou pronta para aplicar.
 * É o que alimenta o aviso "Nova versão pronta" (UpdateBanner).
 */
export function useEchoAutoUpdate() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateProgress, setUpdateProgress] = useState(0)

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onUpdateAvailable) return
    api.onUpdateAvailable((info: { version: string }) => {
      setUpdateStatus('downloading')
      setUpdateVersion(info.version)
    })
    api.onUpdateProgress((progress: { percent: number }) => {
      setUpdateProgress(progress.percent)
    })
    api.onUpdateReady((info: { version: string }) => {
      setUpdateStatus('ready')
      setUpdateVersion(info.version)
    })
  }, [])

  return { updateStatus, updateVersion, updateProgress }
}
