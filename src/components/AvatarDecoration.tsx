import type { CSSProperties } from 'react'
import {
  SoundwaveOrbDecoration,
  FireStormDecoration,
  CyberHudDecoration,
  QuantumVortexDecoration,
  PrismaticCrownDecoration,
  CelestialHaloDecoration,
  GhostfireDecoration,
  NekoCyberDecoration,
  HexShieldDecoration,
  HeartHarmonyDecoration
} from './HighTierDecorations'

export interface DecorationMetadata {
  id: string
  name: string
  category: 'Aura' | 'Fantasia' | 'Cyber' | 'Animais'
  description: string
  badge: string
  themeColor: string
}

export const AVATAR_DECORATIONS: DecorationMetadata[] = [
  {
    id: 'soundwave_orb',
    name: 'Orbe de Ressonância',
    category: 'Aura',
    description: 'Anel circular de frequências acústicas oscilando ao redor do avatar com satélites harmônicos a 60 FPS.',
    badge: 'ECHO ORIGIN',
    themeColor: '#00f2fe'
  },
  {
    id: 'fire_storm',
    name: 'Labaredas de Plasma',
    category: 'Aura',
    description: 'Chamas vivas de plasma termonuclear com corona solar giratória e brasas ascendentes em física fluida.',
    badge: 'LENDÁRIO',
    themeColor: '#f97316'
  },
  {
    id: 'prismatic_crown',
    name: 'Coroa Prismática',
    category: 'Fantasia',
    description: 'Cristais poliédricos flutuantes que refratam luz e brilhos diamantados em arco-íris com refração especular.',
    badge: 'VIP',
    themeColor: '#fbbf24'
  },
  {
    id: 'cyber_hud',
    name: 'Visor Tático Neon',
    category: 'Cyber',
    description: 'Anéis de mira holográfica com retículo rotativo duplo e dados de telemetria sci-fi em tempo real.',
    badge: 'SCI-FI',
    themeColor: '#06b6d4'
  },
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
    id: 'hex_shield',
    name: 'Escudo Hexagonal',
    category: 'Cyber',
    description: 'Campo de força de colmeia cintilante com pulsos de absorção energética em ciano e menta.',
    badge: 'CYBER',
    themeColor: '#34d399'
  },
  {
    id: 'ghostfire',
    name: 'Chamas Espectrais',
    category: 'Aura',
    description: 'Espirais entrelaçadas de fogo fátuo esmeralda e ametista envolvendo o avatar com névoa mística.',
    badge: 'MÍTICO',
    themeColor: '#c084fc'
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
  }
]

const DECORATION_ALIASES: Record<string, string> = {
  solar_orbit: 'soundwave_orb',
  fire_elemental: 'fire_storm',
  rage_flame: 'fire_storm',
  butterflies: 'celestial_halo',
  sakura_warrior: 'ghostfire',
  ki_energy: 'quantum_vortex',
  cybernetic: 'cyber_hud',
  cat_ears: 'neko_cyber',
  heartbloom: 'heart_harmony',
  in_tears: 'heart_harmony',
  radiating_energy: 'quantum_vortex',
  royal_crown: 'prismatic_crown',
  cyber_tactical: 'cyber_hud',
  cyber_glow: 'cyber_hud',
  flaming_sword: 'ghostfire',
  glowing_rune: 'ghostfire',
  fairy_sprites: 'celestial_halo',
  malefic_crown: 'ghostfire',
  fallen_angel_wings: 'ghostfire',
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

  const renderVectorGraphic = () => {
    switch (normalizedId) {
      case 'soundwave_orb':
        return <SoundwaveOrbDecoration />
      case 'fire_storm':
        return <FireStormDecoration />
      case 'cyber_hud':
        return <CyberHudDecoration />
      case 'quantum_vortex':
        return <QuantumVortexDecoration />
      case 'prismatic_crown':
        return <PrismaticCrownDecoration />
      case 'celestial_halo':
        return <CelestialHaloDecoration />
      case 'ghostfire':
        return <GhostfireDecoration />
      case 'neko_cyber':
        return <NekoCyberDecoration />
      case 'hex_shield':
        return <HexShieldDecoration />
      case 'heart_harmony':
        return <HeartHarmonyDecoration />
      default:
        return <SoundwaveOrbDecoration />
    }
  }

  return (
    <div
      className={`echo-avatar-decoration-wrap deco-${normalizedId} ${className}`}
      style={{
        position: 'absolute',
        inset: '-26%',
        width: '152%',
        height: '152%',
        pointerEvents: 'none',
        zIndex: 2,
        borderRadius: '50%',
        ...style
      }}
      aria-hidden="true"
    >
      {renderVectorGraphic()}
    </div>
  )
}
