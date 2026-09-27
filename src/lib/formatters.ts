export function formatGameDuration(startedAt?: number): string {
  if (!startedAt) return ''
  const diffMs = Math.max(0, Date.now() - startedAt)
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'há 1m'
  if (diffMins < 60) return `há ${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  const remMins = diffMins % 60
  return remMins > 0 ? `há ${diffHours}h ${remMins}m` : `há ${diffHours}h`
}

export const ROLE_COLOR_PRESETS = [
  '#99aab5',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#14b8a6'
]

export const SERVER_BANNER_PRESETS = [
  { id: 'dark', name: 'Dark Void', style: 'linear-gradient(135deg, #2b3240, #181b22)' },
  { id: 'magenta', name: 'Neon Pink', style: 'linear-gradient(135deg, #ff007f, #aa0055)' },
  { id: 'red', name: 'Ruby Crimson', style: 'linear-gradient(135deg, #e0554c, #8b1d16)' },
  { id: 'orange', name: 'Sunset Orange', style: 'linear-gradient(135deg, #f97316, #c2410c)' },
  { id: 'gold', name: 'Golden Glow', style: 'linear-gradient(135deg, #eab308, #a16207)' },
  { id: 'purple', name: 'Cyber Violet', style: 'linear-gradient(135deg, #8b5cf6, #5b21b6)' },
  { id: 'cyan', name: 'Arctic Cyan', style: 'linear-gradient(135deg, #06b6d4, #0e7490)' },
  { id: 'emerald', name: 'Emerald Forest', style: 'linear-gradient(135deg, #10b981, #047857)' }
]

export function getServerGradient(name: string): string {
  const gradients = [
    'linear-gradient(135deg, #5865F2, #7289DA)',
    'linear-gradient(135deg, #FF4655, #0F1923)',
    'linear-gradient(135deg, #10B981, #059669)',
    'linear-gradient(135deg, #8B5CF6, #6366F1)',
    'linear-gradient(135deg, #EC4899, #F43F5E)',
    'linear-gradient(135deg, #F59E0B, #D97706)',
    'linear-gradient(135deg, #06B6D4, #3B82F6)',
    'linear-gradient(135deg, #6366F1, #4F46E5)'
  ]
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = (name || '').charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

export function getServerInitials(name: string): string {
  if (!name) return 'SV'
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

