import { lazy, Suspense, type CSSProperties } from 'react'
import { AvatarVideoDecoration } from './AvatarVideoDecoration'
import { getAvatarVideoDecoration } from '../lib/avatarVideoDecorations'

const HighTierDecorationRenderer = lazy(() => import('./HighTierDecorations'))

export interface DecorationMetadata {
  id: string
  name: string
  category: 'Aura' | 'Fantasia' | 'Animais' | 'Sazonal'
  description: string
  badge: string
  themeColor: string
}

export const AVATAR_DECORATIONS: DecorationMetadata[] = [
  {
    id: 'quantum_vortex',
    name: 'Vórtice Quântico',
    category: 'Aura',
    description: 'Disco de acreção cósmico em 3D com partículas de antimatéria e jatos de plasma ultravioleta.',
    badge: 'CÓSMICO',
    themeColor: '#a855f7'
  },
  {
    id: 'celestial_halo',
    name: 'Auréola Sagrada',
    category: 'Fantasia',
    description: 'Auréola celestial dourada com feixes de glória divina e poeira estelar flutuando suavemente.',
    badge: 'DIVINO',
    themeColor: '#fde047'
  },
  {
    id: 'neko_cyber',
    name: 'Orelhas Holográficas',
    category: 'Animais',
    description: 'Orelhinhas felinas estilizadas com contorno laser neon, equalizador sonoro e partículas cintilantes.',
    badge: 'FOFO',
    themeColor: '#f472b6'
  },
  {
    id: 'heart_harmony',
    name: 'Sinfonia do Coração',
    category: 'Fantasia',
    description: 'Corações translúcidos tridimensionais e notas harmônicas flutuando suavemente em órbita.',
    badge: 'ROMÂNTICO',
    themeColor: '#ec4899'
  },
  {
    id: 'bunny_moon',
    name: 'Coelha Lunar',
    category: 'Animais',
    description: 'Orelhinhas macias de coelha que balançam de leve, uma lua crescente flutuando e brilhos pastel em volta.',
    badge: 'KAWAII',
    themeColor: '#f9a8d4'
  },
  {
    id: 'sakura_bloom',
    name: 'Chuva de Sakura',
    category: 'Sazonal',
    description: 'Galhos de cerejeira em flor e pétalas que caem girando devagar, com um aro cor-de-rosa suave.',
    badge: 'PRIMAVERA',
    themeColor: '#fda4af'
  },
  {
    id: 'arcane_circle',
    name: 'Círculo Arcano',
    category: 'Fantasia',
    description: 'Anéis de runas girando em sentidos opostos, marcas de calibragem e orbes de energia em órbita.',
    badge: 'MÍSTICO',
    themeColor: '#8b5cf6'
  },
  {
    id: 'crystal_wings',
    name: 'Asas de Cristal',
    category: 'Fantasia',
    description: 'Asas de penas de vidro iridescente que batem devagar, com poeira de estrelas ao redor.',
    badge: 'ASTRAL',
    themeColor: '#67e8f9'
  },
  {
    id: 'pumpkin_night',
    name: 'Noite das Abóboras',
    category: 'Sazonal',
    description: 'Morcegos em órbita, uma teia com aranha e uma abóbora de rosto aceso sob um aro laranja e roxo.',
    badge: 'HALLOWEEN',
    themeColor: '#fb923c'
  },
  {
    id: 'frost_crystal',
    name: 'Geada Cristalina',
    category: 'Sazonal',
    description: 'Cristais de gelo cintilando em volta do avatar, flocos que giram e neve caindo bem de leve.',
    badge: 'INVERNO',
    themeColor: '#7dd3fc'
  },
  {
    // Em vídeo (ver lib/avatarVideoDecorations.ts): o id precisa ser o mesmo do registro
    id: 'sakura_ring',
    name: 'Sakura Cinematográfico',
    category: 'Sazonal',
    description: 'Um anel de luz rosa com pétalas de cerejeira girando em volta do avatar, em vídeo animado.',
    badge: 'CINEMA',
    themeColor: '#f9a8d4'
  },
  {
    // Em vídeo (ver lib/avatarVideoDecorations.ts): o id precisa ser o mesmo do registro
    id: 'fox_spirit',
    name: 'Espírito da Raposa',
    category: 'Animais',
    description: 'Um anel de fogo espectral violeta com orelhas de raposa e caudas ondulantes em volta do avatar, em vídeo animado.',
    badge: 'ESPÍRITO',
    themeColor: '#c084fc'
  },
  {
    // Em vídeo (ver lib/avatarVideoDecorations.ts): o id precisa ser o mesmo do registro
    id: 'frost_ring',
    name: 'Anel de Gelo',
    category: 'Sazonal',
    description: 'Um anel de luz azul-gelo com névoa de geada girando e flocos de neve em volta do avatar, em vídeo animado.',
    badge: 'GELO',
    themeColor: '#7dd3fc'
  },
  {
    // Em vídeo (ver lib/avatarVideoDecorations.ts): o id precisa ser o mesmo do registro
    id: 'dragon_ring',
    name: 'Dragão de Fogo',
    category: 'Fantasia',
    description: 'Um dragão de fogo dourado enrolado em volta do avatar, com chamas dançando e fagulhas subindo, em vídeo animado.',
    badge: 'LENDÁRIO',
    themeColor: '#f59e0b'
  }
]
const DECORATION_ALIASES: Record<string, string> = {
  butterflies: 'celestial_halo',
  sakura_warrior: 'sakura_bloom',
  ki_energy: 'quantum_vortex',
  cat_ears: 'neko_cyber',
  heartbloom: 'heart_harmony',
  in_tears: 'heart_harmony',
  radiating_energy: 'quantum_vortex',
  flaming_sword: 'arcane_circle',
  glowing_rune: 'arcane_circle',
  fairy_sprites: 'celestial_halo',
  malefic_crown: 'arcane_circle',
  fallen_angel_wings: 'crystal_wings',
  angelic_wings: 'celestial_halo'
}

interface AvatarDecorationProps {
  decorationId: string
  className?: string
  style?: CSSProperties
}

export function AvatarDecoration({ decorationId, className = '', style }: AvatarDecorationProps) {
  if (!decorationId || decorationId === 'none') return null

  // Support direct animated WebP/APNG/GIF/URL assets (Discord & custom asset spec)
  const isDirectAsset =
    decorationId.startsWith('http://') ||
    decorationId.startsWith('https://') ||
    decorationId.startsWith('data:') ||
    decorationId.startsWith('/') ||
    /\.(webp|apng|gif|png|svg)$/i.test(decorationId)

  if (isDirectAsset) {
    return (
      <div
        className={`echo-avatar-decoration-wrap echo-deco-direct-asset ${className}`}
        style={{
          position: 'absolute',
          inset: '-20%',
          width: '140%',
          height: '140%',
          pointerEvents: 'none',
          zIndex: 2,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
        aria-hidden="true"
      >
        <img
          src={decorationId}
          alt=""
          loading="eager"
          decoding="async"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none'
          }}
        />
      </div>
    )
  }

  const normalizedId = DECORATION_ALIASES[decorationId] || decorationId

  // Decoração em vídeo (anel animado com transparência): o vídeo é centrado e dimensionado pelo miolo do anel
  const videoDeco = getAvatarVideoDecoration(normalizedId)
  if (videoDeco) {
    return (
      <div
        className={`echo-avatar-decoration-wrap deco-${normalizedId} ${className}`}
        style={{ position: 'absolute', inset: '-28%', width: '156%', height: '156%', pointerEvents: 'none', zIndex: 2, overflow: 'visible', ...style }}
        aria-hidden="true"
      >
        <AvatarVideoDecoration deco={videoDeco} />
      </div>
    )
  }

  return (
    <div
      className={`echo-avatar-decoration-wrap deco-${normalizedId} ${className}`}
      style={{
        position: 'absolute',
        inset: '-28%',
        width: '156%',
        height: '156%',
        pointerEvents: 'none',
        zIndex: 2,
        overflow: 'visible',
        ...style
      }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <HighTierDecorationRenderer id={normalizedId} />
      </Suspense>
    </div>
  )
}
