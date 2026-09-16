import posthog from 'posthog-js'

const POSTHOG_KEY = (import.meta.env.VITE_POSTHOG_KEY as string) || ''
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com'

let isInitialized = false

/**
 * Inicializa o cliente PostHog de forma segura.
 * Se nenhuma chave VITE_POSTHOG_KEY estiver configurada, funciona silenciosamente como no-op.
 */
export function initAnalytics(): boolean {
  if (isInitialized) return true

  if (!POSTHOG_KEY || typeof POSTHOG_KEY !== 'string' || POSTHOG_KEY.trim() === '') {
    if (import.meta.env.DEV) {
      console.log('[Analytics] VITE_POSTHOG_KEY não configurada. Telemetria inativa.')
    }
    return false
  }

  try {
    posthog.init(POSTHOG_KEY.trim(), {
      api_host: POSTHOG_HOST.trim(),
      persistence: 'localStorage',
      autocapture: false, // Não captura cliques aleatórios ou inputs
      disable_session_recording: true, // Mantém 0% de uso de CPU/GPU
      capture_pageview: false, // SPA Desktop, sem navegação tradicional
      capture_pageleave: false,
      loaded: () => {
        if (import.meta.env.DEV) {
          console.log('[Analytics] PostHog inicializado com sucesso.')
        }
      }
    })
    isInitialized = true
    return true
  } catch (err) {
    console.warn('[Analytics] Falha ao inicializar PostHog:', err)
    return false
  }
}

/**
 * Identifica o usuário logado para correlacionar métricas de retenção.
 */
export function identifyUser(user: { id: string; email?: string; displayName?: string }) {
  if (!isInitialized || !user?.id) return
  try {
    posthog.identify(user.id, {
      email: user.email || undefined,
      display_name: user.displayName || undefined
    })
  } catch (err) {
    console.warn('[Analytics] identify error:', err)
  }
}

/**
 * Limpa o rastreamento do usuário ao deslogar.
 */
export function resetUser() {
  if (!isInitialized) return
  try {
    posthog.reset()
  } catch (err) {
    console.warn('[Analytics] reset error:', err)
  }
}

/**
 * Disparo genérico e seguro de evento.
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (!isInitialized) return
  try {
    posthog.capture(eventName, properties)
  } catch (err) {
    console.warn(`[Analytics] Erro ao disparar evento ${eventName}:`, err)
  }
}

// -------------------------------------------------------------
// Eventos pré-definidos do Echo
// -------------------------------------------------------------

export function trackAppOpened(version: string) {
  trackEvent('app_opened', {
    version,
    os: 'windows',
    platform: 'desktop'
  })
}

export function trackVoiceJoined(channelId: string) {
  trackEvent('voice_joined', {
    channel_id: channelId
  })
}

export function trackVoiceLeft(channelId: string, durationSeconds: number) {
  trackEvent('voice_left', {
    channel_id: channelId,
    duration_seconds: Math.round(durationSeconds)
  })
}

export function trackScreenShareStarted(resolution?: string, fps?: number) {
  trackEvent('screenshare_started', {
    resolution: resolution || '720p',
    fps: fps || 30
  })
}

export function trackScreenShareStopped(durationSeconds?: number) {
  trackEvent('screenshare_stopped', {
    duration_seconds: durationSeconds ? Math.round(durationSeconds) : undefined
  })
}

export function trackProModalOpened(source: string = 'unknown') {
  trackEvent('pro_modal_opened', {
    source
  })
}

export function trackPixGenerated(value: number = 9.90) {
  trackEvent('pix_generated', {
    value,
    currency: 'BRL',
    billing_type: 'PIX'
  })
}

export function trackProActivated(durationDays: number = 30) {
  trackEvent('pro_activated', {
    duration_days: durationDays
  })
}

export function trackMessageSent(type: 'text' | 'image' | 'audio' | 'attachment') {
  trackEvent('message_sent', {
    message_type: type
  })
}
