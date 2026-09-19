import { supabase } from './supabase'

export interface CustomSticker {
  id: string
  name: string
  url: string
  createdAt: number
}

// Compatibilidade com código legado
export type Sticker = CustomSticker

export interface StickerPack {
  id: string
  name: string
  icon: string
  stickers: CustomSticker[]
}

export const STICKER_PACKS: StickerPack[] = []

/**
 * Obtém a lista de figurinhas personalizadas salvas pelo usuário
 */
export function getCustomStickers(userId?: string): CustomSticker[] {
  try {
    const key = userId ? `echo-custom-stickers-${userId}` : 'echo-custom-stickers'
    const stored = localStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }

    // Tenta fallback sem ID se não encontrou específico
    if (userId) {
      const fallback = localStorage.getItem('echo-custom-stickers')
      if (fallback) {
        const parsed = JSON.parse(fallback)
        if (Array.isArray(parsed)) return parsed
      }
    }
  } catch (err) {
    console.error('Erro ao carregar figurinhas personalizadas:', err)
  }
  return []
}

/**
 * Salva uma nova figurinha na biblioteca pessoal do usuário
 */
export function saveCustomSticker(sticker: CustomSticker, userId?: string): CustomSticker[] {
  const current = getCustomStickers(userId)
  const filtered = current.filter(s => s.id !== sticker.id)
  const updated = [sticker, ...filtered]
  try {
    const key = userId ? `echo-custom-stickers-${userId}` : 'echo-custom-stickers'
    localStorage.setItem(key, JSON.stringify(updated))
    localStorage.setItem('echo-custom-stickers', JSON.stringify(updated))
  } catch (err) {
    console.error('Erro ao salvar figurinha:', err)
  }
  return updated
}

/**
 * Remove uma figurinha da biblioteca pessoal
 */
export function deleteCustomSticker(stickerId: string, userId?: string): CustomSticker[] {
  const current = getCustomStickers(userId)
  const updated = current.filter(s => s.id !== stickerId)
  try {
    const key = userId ? `echo-custom-stickers-${userId}` : 'echo-custom-stickers'
    localStorage.setItem(key, JSON.stringify(updated))
    localStorage.setItem('echo-custom-stickers', JSON.stringify(updated))
  } catch (err) {
    console.error('Erro ao deletar figurinha:', err)
  }
  return updated
}

/**
 * Redimensiona a foto para dimensões de sticker (máx 512x512) com transparência e alta nitidez
 */
export async function resizeImageToSticker(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Se for GIF animado, preserva os frames e não renderiza em canvas estático
    if (file.type === 'image/gif') {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX_DIM = 512
        let width = img.naturalWidth || img.width
        let height = img.naturalHeight || img.height

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width)
            width = MAX_DIM
          } else {
            width = Math.round((width * MAX_DIM) / height)
            height = MAX_DIM
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        try {
          const webp = canvas.toDataURL('image/webp', 0.9)
          if (webp && webp.startsWith('data:image/webp')) {
            resolve(webp)
            return
          }
        } catch {}

        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => resolve(e.target?.result as string)
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Processa a foto enviada pelo usuário, tenta fazer upload no Supabase Storage
 * e salva na coleção local de figurinhas
 */
export async function processImageToSticker(
  file: File,
  userId?: string
): Promise<CustomSticker> {
  // Limpa o nome do arquivo para usar como nome da figurinha
  const rawName = file.name ? file.name.replace(/\.[^/.]+$/, '').trim() : 'Figurinha'
  const cleanName = rawName.slice(0, 32) || 'Figurinha'

  let finalUrl = ''

  // 1. Tenta fazer upload no Supabase Storage (bucket 'attachments') para obter URL pública
  try {
    if (supabase && supabase.storage) {
      const ext = file.name ? file.name.split('.').pop() || 'png' : 'png'
      const sanitized = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')
      const filePath = `stickers/${userId || 'user'}_${Date.now()}_${sanitized}.${ext}`

      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (!error && data) {
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(filePath)
        if (urlData?.publicUrl) {
          finalUrl = urlData.publicUrl
        }
      }
    }
  } catch (err) {
    console.warn('Upload de figurinha para o storage falhou, usando data URL otimizada:', err)
  }

  // 2. Se o storage não estiver disponível ou falhar, processa via canvas local otimizado
  if (!finalUrl) {
    finalUrl = await resizeImageToSticker(file)
  }

  const newSticker: CustomSticker = {
    id: `custom-sticker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    url: finalUrl,
    createdAt: Date.now()
  }

  saveCustomSticker(newSticker, userId)
  return newSticker
}
