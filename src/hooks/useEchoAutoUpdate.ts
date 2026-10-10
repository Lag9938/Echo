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
    // Confirma ao processo principal que o aviso está na tela. Sem essa confirmação ele assume e pergunta por
    // uma janela do sistema (ou instala sozinho, se a tela nem carregou).
    const showReady = (version: string) => {
      setUpdateStatus('ready')
      setUpdateVersion(version)
      api.ackUpdateReady?.(version)
    }
    api.onUpdateAvailable((info: { version: string }) => {
      setUpdateStatus('downloading')
      setUpdateVersion(info.version)
    })
    api.onUpdateProgress((progress: { percent: number }) => {
      setUpdateProgress(progress.percent)
    })
    api.onUpdateReady((info: { version: string }) => showReady(info.version))
    // A atualização pode ter ficado pronta antes de esta tela carregar (o aviso chegou sem ninguém ouvindo)
    api.getUpdateState?.().then((state: { status: UpdateStatus; version: string; percent: number } | undefined) => {
      if (!state || state.status === 'idle') return
      if (state.status === 'ready') { showReady(state.version); return }
      setUpdateStatus((current) => (current === 'ready' ? current : 'downloading'))
      setUpdateVersion((current) => current || state.version)
      setUpdateProgress((current) => Math.max(current, state.percent || 0))
    }).catch(() => {})
  }, [])

  return { updateStatus, updateVersion, updateProgress }
}
