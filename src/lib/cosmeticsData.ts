import { AVATAR_DECORATIONS, type DecorationMetadata } from '../components/AvatarDecoration'
import { PROFILE_EFFECTS, type ProfileEffectMetadata } from '../components/ProfileEffect'

export interface AuraMetadata {
  id: string
  name: string
  color: string
  category: string
  description: string
  badge: string
}

export interface CardFinishMetadata {
  id: 'none' | 'holographic' | 'glass' | 'carbon'
  name: string
  badge: string
  description: string
  previewClass: string
}

export const NEON_AURAS: AuraMetadata[] = [
  {
    id: 'aura-cyan',
    name: 'Ciano Elétrico',
    color: '#00f2fe',
    category: 'Aura',
    description: 'Borda incandescente com pulso de alta frequência em ciano neon puro.',
    badge: 'ORIGIN'
  },
  {
    id: 'aura-purple',
    name: 'Ametista Neon',
    color: '#a855f7',
    category: 'Místico',
    description: 'Brilho profundo de ametista ultravioleta com atmosfera cósmica.',
    badge: 'CÓSMICO'
  },
  {
    id: 'aura-crimson',
    name: 'Carmesim Surge',
    color: '#ff4655',
    category: 'Energia',
    description: 'Anel térmico agressivo em vermelho rubi com glow de sobrecarga.',
    badge: 'SURGE'
  },
  {
    id: 'aura-gold',
    name: 'Solar Dourado',
    color: '#fbbf24',
    category: 'Prestígio',
    description: 'Resplendor dourado imperial com iluminação nobre de 24 quilates.',
    badge: 'VIP'
  },
  {
    id: 'aura-stealth',
    name: 'Monocromático',
    color: '#ffffff',
    category: 'Minimalista',
    description: 'Contorno de luz branca suave e minimalista para perfis discretos.',
    badge: 'CLEAN'
  }
]

export const CARD_FINISHES: CardFinishMetadata[] = [
  {
    id: 'none',
    name: 'Minimalista Fosco',
    badge: 'PADRÃO',
    description: 'Acabamento dark slate clássico, refinado e confortável para os olhos.',
    previewClass: 'finish-preview-none'
  },
  {
    id: 'holographic',
    name: 'Holográfico Prismático',
    badge: 'FOIL',
    description: 'Borda com gradiente iridescente reativo à luz com reflexo dinâmico.',
    previewClass: 'finish-preview-holo'
  },
  {
    id: 'glass',
    name: 'Vidro Fumê Glassmorphism',
    badge: 'PRESTÍGIO',
    description: 'Translucidez moderna com desfoque profundo e reflexo acetinado.',
    previewClass: 'finish-preview-glass'
  },
  {
    id: 'carbon',
    name: 'Fibra de Carbono',
    badge: 'ESPORTIVO',
    description: 'Textura tática em trama fosca esportiva com sombreamento tridimensional.',
    previewClass: 'finish-preview-carbon'
  }
]

export interface NameEffectMetadata {
  id: string
  name: string
  themeColor: string
  category: string
  badge: string
  description: string
  gradient: string
  glowColor: string
  shimmer: boolean
  hasAuraPlate: boolean
}

export const NAME_EFFECTS: NameEffectMetadata[] = [
  {
    id: 'resonance_cyan',
    name: 'Pulso Ressonante',
    themeColor: '#00f2fe',
    category: 'Ressonância',
    badge: 'ORIGIN',
    description: 'Gradiente elétrico em ciano e safira com ondas harmônicas de áudio e brilho pulsante.',
    gradient: 'linear-gradient(90deg, #00f2fe, #4facfe, #00f2fe)',
    glowColor: 'rgba(0, 242, 254, 0.45)',
    shimmer: true,
    hasAuraPlate: true
  },
  {
    id: 'solar_flare',
    name: 'Chama Solar',
    themeColor: '#f59e0b',
    category: 'Energia',
    badge: 'SURGE',
    description: 'Chama térmica incandescente com transição de âmbar dourado e vermelho rubi.',
    gradient: 'linear-gradient(90deg, #fbbf24, #f97316, #ef4444, #fbbf24)',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    shimmer: true,
    hasAuraPlate: true
  },
  {
    id: 'cyber_matrix',
    name: 'Matriz Cyberpunk',
    themeColor: '#ec4899',
    category: 'Cyber',
    badge: 'CYBER',
    description: 'Estética neon sintética em rosa choque e violeta com feixes luminosos contínuos.',
    gradient: 'linear-gradient(90deg, #f472b6, #c084fc, #38bdf8, #f472b6)',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    shimmer: true,
    hasAuraPlate: true
  },
  {
    id: 'celestial_gold',
    name: 'Ouro Celestial',
    themeColor: '#fbbf24',
    category: 'Prestígio',
    badge: 'VIP',
    description: 'Aura nobre de 24 quilates com brilho cintilante acetinado para perfis de destaque.',
    gradient: 'linear-gradient(90deg, #fef08a, #f59e0b, #d97706, #fef08a)',
    glowColor: 'rgba(251, 191, 36, 0.45)',
    shimmer: true,
    hasAuraPlate: true
  },
  {
    id: 'abyssal_amethyst',
    name: 'Ametista Cósmica',
    themeColor: '#a855f7',
    category: 'Cósmico',
    badge: 'MÍSTICO',
    description: 'Radiação ultravioleta profunda com partículas estelares e atmosfera de nebulosa.',
    gradient: 'linear-gradient(90deg, #c084fc, #a855f7, #6366f1, #c084fc)',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    shimmer: true,
    hasAuraPlate: true
  },
  {
    id: 'emerald_frequency',
    name: 'Frequência Esmeralda',
    themeColor: '#10b981',
    category: 'Ressonância',
    badge: 'PULSO',
    description: 'Esmeralda bioluminescente de alta intensidade com vibração de equalizador sônico.',
    gradient: 'linear-gradient(90deg, #34d399, #10b981, #059669, #34d399)',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    shimmer: true,
    hasAuraPlate: true
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// User Inventory Management (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────────────────

export interface UserInventory {
  decorations: string[]
  effects: string[]
  auras: string[]
  finishes: string[]
  name_effects: string[]
}

const DEFAULT_INVENTORY: UserInventory = {
  decorations: ['soundwave_orb'],
  effects: ['echo_resonance'],
  auras: ['aura-cyan'],
  finishes: ['none'],
  name_effects: ['resonance_cyan']
}

export function getUserInventory(userId: string): UserInventory {
  if (!userId) return DEFAULT_INVENTORY
  try {
    const rawDecos = localStorage.getItem(`echo-inventory-decorations-${userId}`)
    const rawEffects = localStorage.getItem(`echo-inventory-effects-${userId}`)
    const rawAuras = localStorage.getItem(`echo-inventory-auras-${userId}`)
    const rawFinishes = localStorage.getItem(`echo-inventory-finishes-${userId}`)
    const rawNameEffects = localStorage.getItem(`echo-inventory-name_effects-${userId}`)

    const decorations = rawDecos ? JSON.parse(rawDecos) : ['soundwave_orb']
    const effects = rawEffects ? JSON.parse(rawEffects) : ['echo_resonance']
    const auras = rawAuras ? JSON.parse(rawAuras) : ['aura-cyan']
    const finishes = rawFinishes ? JSON.parse(rawFinishes) : ['none']
    const nameEffects = rawNameEffects ? JSON.parse(rawNameEffects) : ['resonance_cyan']

    return {
      decorations: Array.from(new Set(['soundwave_orb', ...decorations])),
      effects: Array.from(new Set(['echo_resonance', ...effects])),
      auras: Array.from(new Set(['aura-cyan', ...auras])),
      finishes: Array.from(new Set(['none', ...finishes])),
      name_effects: Array.from(new Set(['resonance_cyan', ...nameEffects]))
    }
  } catch (e) {
    return DEFAULT_INVENTORY
  }
}

export function hasUserAcquired(
  userId: string,
  category: 'decorations' | 'effects' | 'auras' | 'finishes' | 'name_effects',
  itemId: string
): boolean {
  if (!itemId || itemId === 'none') return true
  const inv = getUserInventory(userId)
  return inv[category] ? inv[category].includes(itemId) : false
}

export function acquireCosmetic(
  userId: string,
  category: 'decorations' | 'effects' | 'auras' | 'finishes' | 'name_effects',
  itemId: string
): UserInventory {
  const inv = getUserInventory(userId)
  if (!inv[category]) {
    inv[category] = []
  }
  if (!inv[category].includes(itemId)) {
    inv[category].push(itemId)
    try {
      localStorage.setItem(`echo-inventory-${category}-${userId}`, JSON.stringify(inv[category]))
    } catch (e) {}
  }
  return inv
}

export { AVATAR_DECORATIONS, PROFILE_EFFECTS }
export type { DecorationMetadata, ProfileEffectMetadata }
