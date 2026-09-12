import { isEchoInviteUrl, triggerInAppInvite } from './invite'

/**
 * Abre um link com segurança no navegador padrão do sistema operacional (Chrome, Edge, etc.)
 * Se for um link de convite do Echo, trata internamente no app sem abrir navegador externo!
 * Se estiver no ambiente Electron, utiliza a IPC bridge `electronAPI.openExternal`.
 * Caso contrário (no navegador web), faz fallback com clique programático em âncora e window.open.
 */
export function openExternalUrl(url: string | null | undefined): void {
  if (!url || typeof url !== 'string') return
  const trimmed = url.trim()
  if (!trimmed) return

  // Se for um link de convite do próprio Echo, NÃO abre o navegador externo!
  // Trata e conecta internamente direto no app
  if (isEchoInviteUrl(trimmed)) {
    triggerInAppInvite(trimmed)
    return
  }

  // 1. Tenta via Electron IPC bridge
  if (typeof window !== 'undefined' && window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(trimmed).catch((err) => {
      console.warn('[openExternalUrl] Falha via electronAPI:', err)
    })
    return
  }

  // 2. Se for ambiente puramente Web (navegador), abre aba normalmente
  fallbackOpen(trimmed)
}

function fallbackOpen(url: string) {
  if (typeof window === 'undefined') return
  try {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
