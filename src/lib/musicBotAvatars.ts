import animeBoyUrl from '../assets/music-bot/anime-boy.jpg'
import animeGirlUrl from '../assets/music-bot/anime-girl.jpg'
import animeChibiUrl from '../assets/music-bot/anime-chibi.jpg'
import robot3dUrl from '../assets/music-bot/robot-3d.jpg'
import android3dUrl from '../assets/music-bot/android-3d.jpg'

export interface MusicBotAvatarOption {
  id: string
  name: string
  category: 'anime' | '3d' | 'classic' | 'custom'
  badge: string
  url: string
}

export const MUSIC_BOT_DEFAULT_AVATAR_ID = 'anime-boy'

export const MUSIC_BOT_AVATAR_PRESETS: MusicBotAvatarOption[] = [
  {
    id: 'anime-boy',
    name: 'Anime Boy DJ',
    category: 'anime',
    badge: 'Desenho 2D',
    url: animeBoyUrl
  },
  {
    id: 'anime-girl',
    name: 'Anime Girl Lofi',
    category: 'anime',
    badge: 'Desenho 2D',
    url: animeGirlUrl
  },
  {
    id: 'anime-chibi',
    name: 'Chibi Robô',
    category: 'anime',
    badge: 'Desenho 2D',
    url: animeChibiUrl
  },
  {
    id: 'robot-3d',
    name: 'Robô Mascote',
    category: '3d',
    badge: '3D Metálico',
    url: robot3dUrl
  },
  {
    id: 'android-3d',
    name: 'Androide DJ',
    category: '3d',
    badge: '3D Futurista',
    url: android3dUrl
  },
  {
    id: 'letter-e',
    name: 'Minimalista (Letra E)',
    category: 'classic',
    badge: 'Original',
    url: ''
  }
]

export function resolveMusicBotAvatarUrl(avatarIdOrUrl: string | null | undefined): string {
  if (!avatarIdOrUrl) return animeBoyUrl
  if (
    avatarIdOrUrl.startsWith('http://') ||
    avatarIdOrUrl.startsWith('https://') ||
    avatarIdOrUrl.startsWith('data:')
  ) {
    return avatarIdOrUrl
  }
  const found = MUSIC_BOT_AVATAR_PRESETS.find((p) => p.id === avatarIdOrUrl)
  return found?.url || animeBoyUrl
}
