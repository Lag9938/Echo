export interface VoiceReconnectBannerProps {
  isVoiceReconnecting: boolean
  voiceReconnectCountdown: number
  voiceReconnectAttempt: number
  onRetry: () => void
  onCancel: () => void
}

export function VoiceReconnectBanner({
  isVoiceReconnecting,
  voiceReconnectCountdown,
  voiceReconnectAttempt,
  onRetry,
  onCancel
}: VoiceReconnectBannerProps) {
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
