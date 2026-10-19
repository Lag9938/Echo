import sakuraRingSrc from '../assets/effects/sakura-ring.webm'
import foxSpiritSrc from '../assets/effects/fox-spirit.webm'
import frostRingSrc from '../assets/effects/frost-ring.webm'
import dragonRingSrc from '../assets/effects/dragon-ring.webm'

/**
 * Decorações de avatar em VÍDEO: um anel de luz animado em volta do avatar. O vídeo tem transparência de verdade
 * (WebM VP9 com canal alfa: o fundo preto do original virou transparente), então funciona sobre qualquer fundo e nos
 * dois temas, sem depender de `mix-blend-mode`.
 *
 * Para criar uma nova: ponha o .webm em src/assets/effects/, importe aqui e acrescente uma entrada abaixo (e o
 * metadado, com o MESMO id, em AVATAR_DECORATIONS). Requisitos do vídeo: quadrado, com o miolo vazio onde entra o avatar.
 */
export interface AvatarVideoDecoration {
  id: string
  src: string
  /** Onde está o centro do anel no vídeo (frações da largura e da altura) */
  center: { x: number; y: number }
  /** Diâmetro do miolo vazio do anel, como fração da largura do vídeo (é onde o avatar entra) */
  hole: number
  /** O miolo fica `holeScale` vezes o avatar: 1 encosta no avatar, um pouco mais deixa uma folga */
  holeScale?: number
}

const REGISTRY: Record<string, AvatarVideoDecoration> = {
  sakura_ring: {
    id: 'sakura_ring',
    src: sakuraRingSrc,
    // medido no vídeo: anel centralizado, miolo vazio de 54% da largura
    center: { x: 0.499, y: 0.5 },
    hole: 0.543,
    holeScale: 1.04
  },
  fox_spirit: {
    id: 'fox_spirit',
    src: foxSpiritSrc,
    // vídeo 440×614 recortado em volta do anel (orelhas em cima, caudas embaixo): centro no meio; o miolo vazio varia
    // de 61,5% a 64,5% da largura ao longo do laço, então usamos o menor para o anel nunca encostar no avatar
    center: { x: 0.5, y: 0.5 },
    hole: 0.615,
    holeScale: 1.04
  },
  frost_ring: {
    id: 'frost_ring',
    src: frostRingSrc,
    // vídeo 1072×1928 recortado num quadrado em volta do anel (marca d'água fora): anel no centro, miolo do núcleo
    // luminoso com ~78% da largura; usamos um pouco menos para o anel nunca encostar no avatar
    center: { x: 0.5, y: 0.5 },
    hole: 0.77,
    holeScale: 1.04
  },
  dragon_ring: {
    id: 'dragon_ring',
    src: dragonRingSrc,
    // vídeo 720×1280 recortado num quadrado centrado no anel (o centro do anel foi medido e corrigido no recorte). A borda
    // interna do fogo fica a ~104 px do centro em 320 px; o avatar é maior que isso (miolo de 73% = raio ~112 px), então o
    // dragão e as chamas cobrem a borda da foto, por cima dela, em vez de ficarem ao redor
    center: { x: 0.5, y: 0.5 },
    hole: 0.73,
    holeScale: 1.04
  }
}

export function getAvatarVideoDecoration(id?: string | null): AvatarVideoDecoration | null {
  if (!id || id === 'none') return null
  return REGISTRY[id] ?? null
}

/**
 * A decoração ocupa uma caixa de 156% do avatar (ver AvatarDecoration), então o avatar ocupa 1/1,56 da caixa.
 * Devolve a largura que o vídeo precisa ter, em % da caixa, para o miolo do anel ficar `holeScale` vezes o avatar.
 */
export const DECORATION_BOX_PER_AVATAR = 1.56
export function videoWidthPercent(deco: AvatarVideoDecoration): number {
  return ((deco.holeScale ?? 1) / deco.hole / DECORATION_BOX_PER_AVATAR) * 100
}