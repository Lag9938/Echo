import { memo, useState } from 'react'
import { fileKindLabel, formatFileSize, readFileInfo } from '../../lib/attachments'
import { openExternalUrl } from '../../lib/openExternal'
import '../../styles/attachments.css'

interface FileAttachmentCardProps {
  /** Endereço do arquivo, com ou sem nome e tamanho depois de "#" */
  url: string
  /** Texto da mensagem: nos arquivos antigos é onde o nome ficava */
  fallbackName?: string | null
}

type DownloadState = 'idle' | 'downloading' | 'saved' | 'failed'

/** Cartão de um arquivo recebido ou enviado numa conversa: tipo, nome, tamanho e o botão de baixar */
export const FileAttachmentCard = memo(function FileAttachmentCard({ url, fallbackName }: FileAttachmentCardProps) {
  const info = readFileInfo(url, fallbackName)
  const [state, setState] = useState<DownloadState>('idle')
  const [savedPath, setSavedPath] = useState<string | null>(null)

  async function download() {
    if (state === 'downloading') return
    if (state === 'saved' && savedPath) {
      window.electronAPI?.showDownloadedFile?.(savedPath).catch(() => {})
      return
    }
    const api = window.electronAPI
    if (!api?.downloadAttachment) {
      // Fora do app instalado (ou numa versão do app sem esta função): o navegador faz o download
      openExternalUrl(info.url)
      return
    }
    setState('downloading')
    try {
      const result = await api.downloadAttachment(info.url, info.name)
      if (result.status === 'saved') {
        setSavedPath(result.path ?? null)
        setState('saved')
      } else {
        setState(result.status === 'cancelled' ? 'idle' : 'failed')
      }
    } catch {
      setState('failed')
    }
  }

  const size = formatFileSize(info.size)
  const action = state === 'downloading' ? 'Baixando…'
    : state === 'saved' ? 'Mostrar na pasta'
    : state === 'failed' ? 'Tentar de novo'
    : 'Baixar'

  return (
    <div className={`file-card file-card-${state}`}>
      <span className="file-card-kind" aria-hidden="true">{fileKindLabel(info.name)}</span>
      <div className="file-card-text">
        <span className="file-card-name" title={info.name}>{info.name}</span>
        <span className="file-card-meta">
          {state === 'failed' ? 'Não foi possível baixar.' : state === 'saved' ? 'Salvo no computador' : size || 'Arquivo'}
        </span>
      </div>
      <button type="button" className="file-card-action" onClick={download} disabled={state === 'downloading'}>
        {action}
      </button>
    </div>
  )
})
