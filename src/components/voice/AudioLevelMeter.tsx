import { useRef, useEffect } from 'react'

export function AudioLevelMeter({ stream }: { stream: MediaStream | null }) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      if (barRef.current) barRef.current.style.width = '0%'
      return
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      audioContextRef.current = ctx

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.3
      analyserRef.current = analyser

      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      let lastVal = 0
      let lastUpdate = 0
      const updateLevel = (now: number) => {
        if (!analyserRef.current || !barRef.current) return

        if (now - lastUpdate > 33) {
          analyserRef.current.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i]
          }
          const avg = sum / bufferLength
          const target = Math.min(100, Math.round((avg / 255) * 150))
          
          lastVal = lastVal * 0.4 + target * 0.6
          barRef.current.style.width = `${Math.min(100, Math.round(lastVal))}%`
          lastUpdate = now
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }

      animationFrameRef.current = requestAnimationFrame(updateLevel)
    } catch (e) {
      console.warn('AudioLevelMeter: falha ao inicializar Web Audio API', e)
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [stream])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '280px', fontSize: '11px' }}>
      <span style={{ color: 'var(--text-muted, #8b949e)', whiteSpace: 'nowrap' }}>Nível de Áudio:</span>
      {stream && stream.getAudioTracks().length > 0 ? (
        <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
          <div ref={barRef} style={{ height: '100%', width: '0%', background: '#2ed573', transition: 'width 0.08s ease' }} />
        </div>
      ) : (
        <span style={{ color: '#ff4757', fontWeight: 'bold' }}>Não Detectado (Sem som)</span>
      )}
    </div>
  )
}
