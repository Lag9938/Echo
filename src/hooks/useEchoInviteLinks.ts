import { useEffect, useRef, type MutableRefObject } from 'react'

export interface UseEchoInviteLinksOptions {
  userId: string | undefined
  /** Quem de fato processa o convite (useEchoSpaces.processSpaceInvite), por referência para estar sempre atual */
  processSpaceInviteRef: MutableRefObject<((url: string) => Promise<void>) | null>
}

/**
 * Links de convite que chegam de fora da tela: colados/clicados dentro do app (evento 'echo-process-invite')
 * e abertos pelo sistema (echo://invite/... ou link web, via Electron). Um convite que chega antes do login
 * fica guardado e é processado assim que a pessoa entra.
 */
export function useEchoInviteLinks({ userId, processSpaceInviteRef }: UseEchoInviteLinksOptions) {
  const pendingDeepLinkUrlRef = useRef<string | null>(null)
  const userIdRef = useRef(userId)
  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  // In-App & Custom Invite Event Listener (Tratamento interno 100% no app sem abrir navegador)
  useEffect(() => {
    const handleInAppInviteEvent = (e: any) => {
      const input = e.detail?.input
      if (input && processSpaceInviteRef.current) {
        console.log('[InAppInvite] Processando convite internamente:', input)
        processSpaceInviteRef.current(input)
      }
    }
    window.addEventListener('echo-process-invite', handleInAppInviteEvent as EventListener)
    return () => {
      window.removeEventListener('echo-process-invite', handleInAppInviteEvent as EventListener)
    }
  }, [processSpaceInviteRef])

  // Deep-Link Protocol Listener (echo://invite/... ou URLs externas)
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return

    const handleInviteUrl = (url: string) => {
      if (url && typeof url === 'string' && (url.startsWith('echo://') || url.includes('/invite') || url.includes('space='))) {
        console.log('[DeepLink] Convite recebido via deep-link ou web:', url)
        if (userIdRef.current && processSpaceInviteRef.current) {
          processSpaceInviteRef.current(url)
        } else {
          pendingDeepLinkUrlRef.current = url
        }
      }
    }

    if (typeof api.onDeepLinkInvite === 'function') {
      api.onDeepLinkInvite(handleInviteUrl)
    }

    if (typeof api.getInitialInviteUrl === 'function') {
      api.getInitialInviteUrl().then((initialUrl: string | null) => {
        if (initialUrl) {
          handleInviteUrl(initialUrl)
        }
      }).catch(() => {})
    }
  }, [processSpaceInviteRef])

  // Processa convite pendente recebido antes de o usuário estar autenticado
  useEffect(() => {
    if (userId && pendingDeepLinkUrlRef.current && processSpaceInviteRef.current) {
      const url = pendingDeepLinkUrlRef.current
      pendingDeepLinkUrlRef.current = null
      console.log('[DeepLink] Executando convite pendente após login:', url)
      processSpaceInviteRef.current(url)
    }
  }, [userId, processSpaceInviteRef])
}
