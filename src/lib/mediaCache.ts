/**
 * Echo Media & Avatar LRU In-Memory Cache
 * Minimizes duplicate network requests for user avatars, badges and attachments.
 */

const MAX_CACHE_ENTRIES = 200
const memoryCache = new Map<string, string>()

export function getCachedMedia(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('blob:')) return url

  if (memoryCache.has(url)) {
    // Touch entry to refresh LRU position
    const val = memoryCache.get(url)!
    memoryCache.delete(url)
    memoryCache.set(url, val)
    return val
  }

  // Add to cache
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = memoryCache.keys().next().value
    if (firstKey) memoryCache.delete(firstKey)
  }
  memoryCache.set(url, url)
  return url
}

export function preloadMedia(url: string | null | undefined): void {
  if (!url || typeof Image === 'undefined') return
  if (memoryCache.has(url)) return

  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    img.onload = () => {
      getCachedMedia(url)
    }
  } catch {}
}

export const defaultImageProps = {
  loading: 'lazy' as const,
  decoding: 'async' as const
}
