import type { CSSProperties } from 'react'
import { EchoCanvasEffect, type CanvasProfileEffectId } from './EchoCanvasEffect'

export interface ProfileEffectMetadata {
  id: string
  name: string
  category: 'Áudio & Som' | 'Fogo & Energia' | 'Natureza' | 'Sci-Fi' | 'Místico' | 'Prestígio'
  description: string
  badge: string
  themeColor: string
}

export const PROFILE_EFFECTS: ProfileEffectMetadata[] = [
  {
    id: 'echo_resonance',
    name: 'Ressonância Harmônica',
    category: 'Áudio & Som',
    description: 'Ondas acústicas e anéis de choque sonoro pulsando em tons ciano e magenta com poeira harmônica.',
    badge: 'ECHO ORIGIN',
    themeColor: '#00f2fe'
  },
  {
    id: 'quantum_singularity',
    name: 'Singularidade Quântica',
    category: 'Místico',
    description: 'Disco de acreção gravitacional com fótons luminosos e poeira estelar em órbita relativística.',
    badge: 'CÓSMICO',
    themeColor: '#a855f7'
  },
  {
    id: 'plasma_overdrive',
    name: 'Núcleo de Plasma',
    category: 'Fogo & Energia',
    description: 'Labaredas volumétricas de plasma termonuclear com convecção ascendente e faíscas incandescentes.',
    badge: 'LENDÁRIO',
    themeColor: '#ff6b00'
  },
  {
    id: 'cyber_matrix',
    name: 'Sobrecarga de Dados',
    category: 'Sci-Fi',
    description: 'Circuitos ópticos futuristas com feixes de dados, scanlines de laser e retículos HUD táticos.',
    badge: 'CYBER',
    themeColor: '#06b6d4'
  },
  {
    id: 'glacial_aurora',
    name: 'Aurora Ártica',
    category: 'Natureza',
    description: 'Véus ondulantes de aurora boreal em esmeralda e índigo com cristais de gelo geométricos em queda.',
    badge: 'MÍTICO',
    themeColor: '#34d399'
  },
  {
    id: 'void_abyss',
    name: 'Abismo do Vazio',
    category: 'Místico',
    description: 'Névoa espectral de matéria escura e filamentos etéreos ultravioleta rastejando pelo card.',
    badge: 'SOMBRIO',
    themeColor: '#7c3aed'
  },
  {
    id: 'golden_stardust',
    name: 'Stardust Imperial',
    category: 'Prestígio',
    description: 'Cascata nobre de constelações douradas e poeira de ouro 24k com brilhos diamantados estelares.',
    badge: 'VIP',
    themeColor: '#fbbf24'
  },
  {
    id: 'sakura_breeze',
    name: 'Brisa de Florescer',
    category: 'Natureza',
    description: 'Pétalas de cerejeira em rotação 3D com correntes de vento suave e pólen estelar flutuante.',
    badge: 'DESTAQUE',
    themeColor: '#f472b6'
  }
]

const EFFECT_ALIASES: Record<string, CanvasProfileEffectId> = {
  inferno_flames: 'plasma_overdrive',
  thunderstorm: 'echo_resonance',
  sakura_petals: 'sakura_breeze',
  cyber_glitch: 'cyber_matrix',
  cosmic_nebula: 'quantum_singularity',
  arctic_frost: 'glacial_aurora',
  void_shadows: 'void_abyss',
  golden_luxury: 'golden_stardust',
  magic_hearts: 'echo_resonance',
  mastery: 'plasma_overdrive'
}

interface ProfileEffectProps {
  effectId?: string | null
  style?: CSSProperties
  className?: string
}

export function ProfileEffect({ effectId, style, className = '' }: ProfileEffectProps) {
  if (!effectId || effectId === 'none') return null
  const normalizedId = (EFFECT_ALIASES[effectId] || effectId) as CanvasProfileEffectId

  return (
    <div
      className={`profile-effect-container profile-effect-${normalizedId} ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1,
        borderRadius: 'inherit',
        ...style
      }}
      aria-hidden="true"
    >
      <EchoCanvasEffect effectId={normalizedId} />
    </div>
  )
}


