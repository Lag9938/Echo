// Imagens de perfil e de espaço (avatar, capa, ícone) reduzidas ANTES de subir.
//
// Por quê: o app baixa e decodifica a imagem inteira de cada pessoa em cada computador que a mostra. Fotos antigas
// subiram no tamanho original (uma de 3840×2160 aparecia num avatar de 32 px: ~33 MB de memória por foto
// decodificada, em todo mundo). A janela de ajuste de foto já recorta em 512 px, mas o ícone e a capa do espaço
// subiam sem redução, e GIFs passam direto (o canvas achataria a animação). Aqui fica a última barreira.

/** Tamanhos máximos por tipo de imagem (o app nunca mostra maior que isso) */
export const IMAGE_LIMITS = {
  avatar: { width: 512, height: 512 },
  banner: { width: 1500, height: 600 },
  spaceIcon: { width: 512, height: 512 },
  spaceBanner: { width: 1500, height: 600 }
} as const

export type ImageKind = keyof typeof IMAGE_LIMITS

/** GIF animado não é reduzido (perderia a animação): acima disto ele é recusado */
export const MAX_GIF_BYTES = 3 * 1024 * 1024

/** Dimensões que cabem no limite mantendo a proporção (nunca aumenta) */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width, height }
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function isGif(file: Pick<File, 'type' | 'name'>): boolean {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name)
}

/** Mensagem para quem tentou subir um GIF grande demais, ou null se pode subir */
export function gifUploadProblem(file: Pick<File, 'type' | 'name' | 'size'>): string | null {
  if (!isGif(file) || file.size <= MAX_GIF_BYTES) return null
  return `GIFs animados podem ter até ${Math.round(MAX_GIF_BYTES / 1048576)} MB (este tem ${(file.size / 1048576).toFixed(1)} MB). Reduza o GIF ou use uma imagem.`
}

/**
 * Reduz a imagem para caber no limite do tipo. GIF e SVG voltam como estão (animação/vetor); imagem que já cabe
 * também. O resultado é WebP (mantém transparência e pesa pouco); se o navegador não gerar WebP, JPEG.
 */
export async function prepareImageUpload(file: File, kind: ImageKind): Promise<File> {
  if (isGif(file) || file.type === 'image/svg+xml') return file
  const limit = IMAGE_LIMITS[kind]
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file // não é uma imagem que o navegador lê: o envio segue e o servidor decide
  }
  try {
    const target = fitWithin(bitmap.width, bitmap.height, limit.width, limit.height)
    if (target.width === bitmap.width && target.height === bitmap.height && file.size <= 400 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, target.width, target.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
    const out = blob && blob.type === 'image/webp'
      ? blob
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!out || out.size >= file.size) return file
    const ext = out.type === 'image/webp' ? 'webp' : 'jpg'
    return new File([out], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type: out.type })
  } finally {
    bitmap.close()
  }
}
