import sakuraCardSrc from '../assets/effects/sakura-card.mp4'
import echoResonanceSrc from '../assets/effects/echo-resonance-card.mp4'
import quantumSingularitySrc from '../assets/effects/quantum-singularity-card.mp4'
import plasmaOverdriveSrc from '../assets/effects/plasma-overdrive-card.mp4'
import cyberMatrixSrc from '../assets/effects/cyber-matrix-card.mp4'
import glacialAuroraSrc from '../assets/effects/glacial-aurora-card.mp4'
import voidAbyssSrc from '../assets/effects/void-abyss-card.mp4'
import goldenStardustSrc from '../assets/effects/golden-stardust-card.mp4'
import sakuraBreezeSrc from '../assets/effects/sakura-breeze-card.mp4'

/**
 * Efeitos de perfil em VÍDEO que cobrem o cartão inteiro (estilo Discord): um .mp4 com fundo 100% preto que, com
 * `mix-blend-mode: screen`, deixa só as luzes e partículas aparecerem por cima do cartão de perfil.
 *
 * (Não confundir com as decorações de avatar em vídeo, que ficam em lib/avatarVideoDecorations.ts.)
 *
 * Para ligar um efeito a um usuário basta o id dele no campo `profile_effect` (ou `profileEffect="id"` no modal).
 * Para criar um: ponha o vídeo em src/assets/effects/, importe aqui e acrescente uma entrada em REGISTRY; para ele
 * aparecer na Loja, acrescente também o metadado, com o MESMO id, em PROFILE_EFFECTS (components/ProfileEffect.tsx).
 * Requisitos do vídeo: fundo preto puro (#000), sem áudio, laço sem emenda visível. Ele cobre o cartão inteiro
 * (object-fit: cover); um 9:16 de ~540×960 ou 720×1280 funciona bem, com a área do avatar (alto à esquerda) vazia.
 */
export interface ProfileVideoEffect {
  id: string
  name: string
  src: string
  /** Enquadramento do vídeo dentro do cartão (object-position). Padrão: centralizado */
  position?: string
}

const REGISTRY: Record<string, ProfileVideoEffect> = {
  echo_resonance: {
    id: 'echo_resonance',
    name: 'Ressonância Harmônica',
    src: echoResonanceSrc,
    position: 'center'
  },
  quantum_singularity: {
    id: 'quantum_singularity',
    name: 'Singularidade Quântica',
    src: quantumSingularitySrc,
    position: 'center top'
  },
  plasma_overdrive: {
    id: 'plasma_overdrive',
    name: 'Núcleo de Plasma',
    src: plasmaOverdriveSrc,
    position: 'center bottom'
  },
  cyber_matrix: {
    id: 'cyber_matrix',
    name: 'Sobrecarga de Dados',
    src: cyberMatrixSrc,
    position: 'center'
  },
  glacial_aurora: {
    id: 'glacial_aurora',
    name: 'Aurora Ártica',
    src: glacialAuroraSrc,
    position: 'center'
  },
  void_abyss: {
    id: 'void_abyss',
    name: 'Abismo do Vazio',
    src: voidAbyssSrc,
    position: 'center top'
  },
  golden_stardust: {
    id: 'golden_stardust',
    name: 'Stardust Imperial',
    src: goldenStardustSrc,
    position: 'center'
  },
  sakura_breeze: {
    id: 'sakura_breeze',
    name: 'Brisa de Florescer',
    src: sakuraBreezeSrc,
    position: 'center top'
  },
  sakura_garden: {
    id: 'sakura_garden',
    name: 'Jardim de Sakura',
    src: sakuraCardSrc,
    position: 'center'
  }
}

/** Devolve o efeito de vídeo com esse id, ou null (id vazio, "none" ou de outro tipo de efeito) */
export function getProfileVideoEffect(id?: string | null): ProfileVideoEffect | null {
  if (!id || id === 'none') return null
  return REGISTRY[id] ?? null
}

/** Lista dos efeitos de vídeo disponíveis (para uma futura tela de escolha) */
export function listProfileVideoEffects(): ProfileVideoEffect[] {
  return Object.values(REGISTRY)
}

/** Registra ou troca um efeito em tempo de execução */
export function registerProfileVideoEffect(effect: ProfileVideoEffect): void {
  REGISTRY[effect.id] = effect
}