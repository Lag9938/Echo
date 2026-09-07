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

// ─────────────────────────────────────────────────────────────────────────────
// User Inventory Management (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────────────────

export interface UserInventory {
  decorations: string[]
  effects: string[]
  auras: string[]
  finishes: string[]
}

const DEFAULT_INVENTORY: UserInventory = {
  decorations: ['soundwave_orb'],
  effects: ['echo_resonance'],
  auras: ['aura-cyan'],
  finishes: ['none']
}

export function getUserInventory(userId: string): UserInventory {
  if (!userId) return DEFAULT_INVENTORY
  try {
    const rawDecos = localStorage.getItem(`echo-inventory-decorations-${userId}`)
    const rawEffects = localStorage.getItem(`echo-inventory-effects-${userId}`)
    const rawAuras = localStorage.getItem(`echo-inventory-auras-${userId}`)
    const rawFinishes = localStorage.getItem(`echo-inventory-finishes-${userId}`)

    const decorations = rawDecos ? JSON.parse(rawDecos) : ['soundwave_orb']
    const effects = rawEffects ? JSON.parse(rawEffects) : ['echo_resonance']
    const auras = rawAuras ? JSON.parse(rawAuras) : ['aura-cyan']
    const finishes = rawFinishes ? JSON.parse(rawFinishes) : ['none']

    return {
      decorations: Array.from(new Set(['soundwave_orb', ...decorations])),
      effects: Array.from(new Set(['echo_resonance', ...effects])),
      auras: Array.from(new Set(['aura-cyan', ...auras])),
      finishes: Array.from(new Set(['none', ...finishes]))
    }
  } catch (e) {
    return DEFAULT_INVENTORY
  }
}

export function hasUserAcquired(
  userId: string,
  category: 'decorations' | 'effects' | 'auras' | 'finishes',
  itemId: string
): boolean {
  if (!itemId || itemId === 'none') return true
  const inv = getUserInventory(userId)
  return inv[category].includes(itemId)
}

export function acquireCosmetic(
  userId: string,
  category: 'decorations' | 'effects' | 'auras' | 'finishes',
  itemId: string
): UserInventory {
  const inv = getUserInventory(userId)
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
