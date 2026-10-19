import type { CSSProperties } from 'react'
import {
  BunnyMoonDecoration,
  SakuraBloomDecoration,
  ArcaneCircleDecoration,
  CrystalWingsDecoration,
  PumpkinNightDecoration,
  FrostCrystalDecoration,
  HoloCatEarsPro,
  HeartSymphonyPro,
  SacredHaloPro,
  QuantumVortexPro
} from './PackDecorations'


export interface HighTierDecorationRendererProps {
  id: string
  className?: string
  style?: CSSProperties
}

export function HighTierDecorationRenderer({ id, className = '', style }: HighTierDecorationRendererProps) {
  switch (id) {
    case 'quantum_vortex':
      return <QuantumVortexPro className={className} style={style} />
    case 'celestial_halo':
      return <SacredHaloPro className={className} style={style} />
    case 'neko_cyber':
      return <HoloCatEarsPro className={className} style={style} />
    case 'heart_harmony':
      return <HeartSymphonyPro className={className} style={style} />
    case 'bunny_moon':
      return <BunnyMoonDecoration className={className} style={style} />
    case 'sakura_bloom':
      return <SakuraBloomDecoration className={className} style={style} />
    case 'arcane_circle':
      return <ArcaneCircleDecoration className={className} style={style} />
    case 'crystal_wings':
      return <CrystalWingsDecoration className={className} style={style} />
    case 'pumpkin_night':
      return <PumpkinNightDecoration className={className} style={style} />
    case 'frost_crystal':
      return <FrostCrystalDecoration className={className} style={style} />
    default:
      // id desconhecido (decoração que saiu do catálogo): sem decoração, em vez de cair numa errada
      return null
  }
}

export default HighTierDecorationRenderer


