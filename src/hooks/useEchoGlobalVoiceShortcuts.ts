import { useEffect, useRef, useState } from 'react'

export type GlobalVoiceAction = 'toggle-mute' | 'toggle-deafen' | 'toggle-ai-denoise'

export interface UseEchoGlobalVoiceShortcutsOptions {
  handleToggleMute: () => void
  handleToggleDeafen: () => void
  toggleAiDenoise: () => void
  isAiDenoiseEnabled: boolean
  showToast: (title: string, message: string, type?: any) => void
}

/**
 * Atalhos globais de voz (mutar, silenciar fone, filtro de ruído), que funcionam mesmo com o Echo em
 * segundo plano: guarda as teclas escolhidas, registra no Electron e reage quando uma delas é apertada.
 */
export function useEchoGlobalVoiceShortcuts({
  handleToggleMute,
  handleToggleDeafen,
  toggleAiDenoise,
  isAiDenoiseEnabled,
  showToast
}: UseEchoGlobalVoiceShortcutsOptions) {
  const [muteShortcut, setMuteShortcut] = useState<string>(() => localStorage.getItem('echo-shortcut-mute') || 'F8')
  const [deafenShortcut, setDeafenShortcut] = useState<string>(() => localStorage.getItem('echo-shortcut-deafen') || 'F9')
  const [aiDenoiseShortcut, setAiDenoiseShortcut] = useState<string>(() => localStorage.getItem('echo-shortcut-ai-denoise') || 'F7')

  // Registro dos atalhos globais no Electron. Fica num efeito só dele, que depende apenas das teclas: antes
  // ele rodava junto com o ouvinte abaixo, que era refeito a cada renderização, e um atalho recusado mostrava
  // o aviso, o aviso renderizava a tela, a tela registrava de novo... e o aviso aparecia sem parar.
  const warnedShortcutsRef = useRef<Record<string, string>>({})
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.registerGlobalVoiceShortcut) return

    // Antes o resultado do registro era ignorado: se o Windows recusasse a tecla (já usada por outro
    // programa, ou uma combinação que ele não deixa registrar sem Ctrl/Alt/Shift), a pessoa via o atalho
    // "salvo" nas Configurações mas ele simplesmente não funcionava, sem nenhum aviso.
    const registerOrWarn = (action: GlobalVoiceAction, shortcut: string, label: string) => {
      if (!shortcut || shortcut === 'none') {
        delete warnedShortcutsRef.current[action]
        api.unregisterGlobalVoiceShortcut?.(action)
        return
      }
      Promise.resolve(api.registerGlobalVoiceShortcut(action, shortcut)).then((result: any) => {
        if (!result || result.success !== false) {
          delete warnedShortcutsRef.current[action]
          return
        }
        // Um aviso por tecla recusada; só avisa de novo se a pessoa escolher outra tecla e ela também falhar
        if (warnedShortcutsRef.current[action] === shortcut) return
        warnedShortcutsRef.current[action] = shortcut
        showToast(
          'Atalho não pôde ser ativado',
          `"${shortcut}" para ${label} não funcionou — provavelmente já está em uso por outro programa aberto. Escolha outra tecla nas Configurações.`,
          'info'
        )
      }).catch(() => {})
    }

    registerOrWarn('toggle-mute', muteShortcut, 'Mutar Microfone')
    registerOrWarn('toggle-deafen', deafenShortcut, 'Silenciar Fone')
    registerOrWarn('toggle-ai-denoise', aiDenoiseShortcut, 'Filtro de Ruído IA')
  }, [muteShortcut, deafenShortcut, aiDenoiseShortcut, showToast])

  // Ouvinte do aperto das teclas. As ações mudam de identidade a cada renderização, então ficam numa
  // referência atualizada depois de cada uma: o ouvinte é inscrito uma vez só e sempre chama a ação atual.
  const latestRef = useRef({ handleToggleMute, handleToggleDeafen, toggleAiDenoise, isAiDenoiseEnabled, showToast })
  useEffect(() => {
    latestRef.current = { handleToggleMute, handleToggleDeafen, toggleAiDenoise, isAiDenoiseEnabled, showToast }
  })

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onGlobalVoiceToggle) return

    const removeListener = api.onGlobalVoiceToggle((action: string) => {
      const latest = latestRef.current
      if (action === 'toggle-mute') {
        latest.handleToggleMute()
      } else if (action === 'toggle-deafen') {
        latest.handleToggleDeafen()
      } else if (action === 'toggle-ai-denoise') {
        latest.toggleAiDenoise()
        const willBeActive = !latest.isAiDenoiseEnabled
        latest.showToast('Filtro de Ruído IA', willBeActive ? 'Supressão por IA Ativada' : 'Supressão por IA Desativada', 'info')
      }
    })

    return () => {
      if (typeof removeListener === 'function') removeListener()
    }
  }, [])

  return {
    muteShortcut,
    setMuteShortcut,
    deafenShortcut,
    setDeafenShortcut,
    aiDenoiseShortcut,
    setAiDenoiseShortcut
  }
}
