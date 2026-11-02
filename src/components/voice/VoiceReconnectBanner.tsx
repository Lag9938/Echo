import { useVoiceStore } from '../../stores/useVoiceStore'

export interface VoiceReconnectBannerProps {
  isVoiceReconnecting?: boolean
  voiceReconnectCountdown?: number
  voiceReconnectAttempt?: number
  onRetry?: () => void
  onCancel?: () => void
}

export function VoiceReconnectBanner({
  isVoiceReconnecting: propIsVoiceReconnecting,
  voiceReconnectCountdown: propVoiceReconnectCountdown,
  voiceReconnectAttempt: propVoiceReconnectAttempt,
  onRetry: propOnRetry,
  onCancel: propOnCancel
}: VoiceReconnectBannerProps = {}) {
  const storeReconnecting = useVoiceStore((s) => s.isVoiceReconnecting || s.isVoiceNetworkUnstable)
  const storeCountdown = useVoiceStore((s) => s.voiceReconnectCountdown)
  const storeAttempt = useVoiceStore((s) => s.voiceReconnectAttempt)
  const storeRetry = useVoiceStore((s) => s.retryVoiceReconnect)
  const storeCancel = useVoiceStore((s) => s.cancelVoiceReconnect)

  const isVoiceReconnecting = propIsVoiceReconnecting ?? storeReconnecting
  const voiceReconnectCountdown = propVoiceReconnectCountdown ?? storeCountdown
  const voiceReconnectAttempt = propVoiceReconnectAttempt ?? storeAttempt
  const onRetry = propOnRetry ?? storeRetry
  const onCancel = propOnCancel ?? storeCancel

  if (!isVoiceReconnecting) return null

  return (
    <div className="voice-reconnecting-banner">
      <div className="voice-reconnecting-left">
        <span className="voice-reconnecting-spinner" />
        <div className="voice-reconnecting-info">
          <span className="voice-reconnecting-title">Conexão Interrompida</span>
          <span className="voice-reconnecting-desc">
            Tentando restabelecer chamada em <strong>{voiceReconnectCountdown}s</strong>... {voiceReconnectAttempt > 1 ? `(Tentativa ${voiceReconnectAttempt})` : ''}
          </span>
        </div>
      </div>
      <div className="voice-reconnecting-actions">
        <button 
          type="button" 
          className="voice-reconnect-now-btn"
          onClick={onRetry}
          title="Tentar reconectar imediatamente"
        >
          Reconectar Agora
        </button>
        <button 
          type="button" 
          className="voice-reconnect-cancel-btn"
          onClick={onCancel}
          title="Cancelar e sair da chamada"
        >
          Desconectar
        </button>
      </div>
    </div>
  )
}
