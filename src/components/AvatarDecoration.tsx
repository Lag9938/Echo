import type { CSSProperties } from 'react'
import { EchoCanvasDecoration, type CanvasDecorationId } from './EchoCanvasDecoration'

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
    description: 'Anel circular de frequências acústicas oscilando ao redor do avatar com satélites harmônicos.',
    badge: 'ECHO ORIGIN',
    themeColor: '#00f2fe'
  },
  {
    id: 'fire_storm',
    name: 'Labaredas de Plasma',
    category: 'Aura',
    description: 'Chamas vivas de plasma termonuclear com corona solar giratória e brasas ascendentes.',
    badge: 'LENDÁRIO',
    themeColor: '#f97316'
  },
  {
    id: 'prismatic_crown',
    name: 'Coroa Prismática',
    category: 'Fantasia',
    description: 'Cristais poliédricos flutuantes que refratam luz e brilhos diamantados em arco-íris.',
    badge: 'VIP',
    themeColor: '#fbbf24'
  },
  {
    id: 'cyber_hud',
    name: 'Visor Tático Neon',
    category: 'Cyber',
    description: 'Anéis de mira holográfica com retículo rotativo duplo e dados de telemetria sci-fi.',
    badge: 'SCI-FI',
    themeColor: '#06b6d4'
  },
  {
    id: 'quantum_vortex',
    name: 'Vórtice Quântico',
    category: 'Aura',
    description: 'Anéis orbitais cósmicos em 3D com partículas de antimatéria e arcos de plasma.',
    badge: 'CÓSMICO',
    themeColor: '#a855f7'
  },
  {
    id: 'celestial_halo',
    name: 'Auréola Sagrada',
    category: 'Fantasia',
    description: 'Auréola celestial dourada com poeira estelar divina flutuando sobre o avatar.',
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
    description: 'Espirais entrelaçadas de fogo fátuo esmeralda e ametista envolvendo o avatar.',
    badge: 'MÍTICO',
    themeColor: '#c084fc'
  },
  {
    id: 'neko_cyber',
    name: 'Orelhas Holográficas',
    category: 'Animais',
    description: 'Orelhinhas felinas estilizadas com contorno laser neon e partículas cintilantes.',
    badge: 'FOFO',
    themeColor: '#f472b6'
  },
  {
    id: 'heart_harmony',
    name: 'Sinfonia do Coração',
    category: 'Fantasia',
    description: 'Corações translúcidos e notas harmônicas flutuando suavemente em órbita.',
    badge: 'ROMÂNTICO',
    themeColor: '#ec4899'
  }
]

const DECORATION_ALIASES: Record<string, CanvasDecorationId> = {
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
  const normalizedId = (DECORATION_ALIASES[decorationId] || decorationId) as CanvasDecorationId

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
      <EchoCanvasDecoration decorationId={normalizedId} />
    </div>
  )
}


