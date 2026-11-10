import { useEffect, useRef, useState } from 'react'

interface StillAvatarImageProps {
  src: string
  alt?: string
  className?: string
  /** Maior lado (px) em que a imagem é desenhada; o resto é só o CSS escalando */
  maxSize?: number
  /**
   * Desfoque (px da tela pequena) aplicado UMA vez, ao desenhar. Para fundos desfocados: um `filter: blur()` no
   * CSS é refeito a cada repintura do cartão (por exemplo, toda vez que a pessoa começa ou para de falar).
   */
  blurPx?: number
  /** Se a imagem não carregar: mostra a imagem normal (padrão) ou nada (fundos decorativos não devem virar GIF vivo) */
  fallback?: 'image' | 'none'
}

/**
 * Foto de perfil PARADA: desenha só o primeiro quadro numa tela (canvas). Um GIF num <img> fica animando e
 * mantém todos os quadros decodificados na memória; na chamada, com o fundo desfocado de cada cartão, era
 * custo a mais para cada pessoa na sala. Sem o GIF vivo, o navegador também deixa de redesenhar o desfoque.
 */
export function StillAvatarImage({ src, alt = '', className, maxSize = 256, blurPx = 0, fallback = 'image' }: StillAvatarImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (cancelled || !canvas || !ctx || !img.naturalWidth) return
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight))
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      if (blurPx > 0) ctx.filter = `blur(${blurPx}px) saturate(1.2)`
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      // Solta o GIF (e seus quadros) assim que o primeiro foi desenhado
      img.onload = null
      img.src = ''
    }
    img.onerror = () => { if (!cancelled) setFailed(true) }
    img.src = src
    return () => {
      cancelled = true
      img.onload = null
      img.onerror = null
    }
  }, [src, maxSize, blurPx])

  if (failed) {
    if (fallback === 'none') return null
    // Imagem que não carregou: mostra a imagem normal, que ao menos exibe o texto alternativo
    return <img src={src} alt={alt} className={className} />
  }
  return <canvas ref={canvasRef} className={className} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} />
}
