import type { CSSProperties } from 'react'

/**
 * Fontes de nome: cada pessoa escolhe uma fonte para o próprio nome de exibição, e todo mundo a vê (mensagens, lista de
 * membros, cartão de perfil). Só o nome muda; @usuário, mensagens e o resto do app ficam na fonte padrão.
 *
 * As fontes vão dentro do app (pacotes @fontsource, importados em styles/name-fonts.css), então funcionam sem internet
 * e o navegador só baixa o arquivo de uma fonte quando algum nome na tela a usa.
 *
 * Para acrescentar uma: instale o pacote @fontsource dela, importe o CSS em styles/name-fonts.css e inclua uma entrada
 * aqui. `scale` e `lineHeight` mantêm a altura da linha parecida com a de um nome comum (fontes ornamentadas têm
 * medidas fora do normal e, sem isso, sobrepõem o texto vizinho).
 */
export interface NameFont {
  id: string
  name: string
  category: 'Elegante' | 'Futurista' | 'Manuscrita'
  description: string
  /** Só quem tem o Echo VIP pode usar */
  vip: boolean
  family: string
  weight: number
  italic?: boolean
  letterSpacing?: string
  /** Tamanho em relação ao texto ao redor (as fontes têm "olho" de tamanhos diferentes) */
  scale: number
  lineHeight?: number
}

export const NAME_FONTS: NameFont[] = [
  { id: 'sussurro', name: 'Sussurro', category: 'Elegante', description: 'Itálico fino e delicado, como convite de casamento.', vip: false, family: "'Cormorant Garamond'", weight: 700, italic: true, scale: 1.12 },
  { id: 'neon_grid', name: 'Neon Grid', category: 'Futurista', description: 'Geométrica de painel espacial, perfeita para quem joga.', vip: false, family: "'Orbitron'", weight: 700, letterSpacing: '0.03em', scale: 0.86 },
  { id: 'brisa', name: 'Brisa', category: 'Manuscrita', description: 'Pincel solto e simpático, verão e praia.', vip: false, family: "'Pacifico'", weight: 400, scale: 0.94 },
  { id: 'caligrafia', name: 'Caligrafia', category: 'Manuscrita', description: 'Letra cursiva de convite, fluida e elegante.', vip: false, family: "'Dancing Script'", weight: 700, scale: 1.12 },
  { id: 'rabisco', name: 'Rabisco', category: 'Manuscrita', description: 'Escrita à mão, informal e cheia de personalidade.', vip: false, family: "'Caveat'", weight: 700, scale: 1.2 },
  { id: 'monograma', name: 'Monograma', category: 'Manuscrita', description: 'Caligrafia de pena com floreios de convite de gala.', vip: false, family: "'Great Vibes'", weight: 400, scale: 1.2, lineHeight: 0.95 }
]

export const NAME_FONT_CATEGORIES = ['Todos', 'Elegante', 'Futurista', 'Manuscrita'] as const

export function getNameFont(id?: string | null): NameFont | null {
  if (!id || id === 'none') return null
  return NAME_FONTS.find((font) => font.id === id) ?? null
}

/**
 * Estilo a aplicar no elemento do nome. Devolve undefined para quem não escolheu fonte (ou escolheu uma que saiu do
 * catálogo), e aí o nome fica na fonte padrão do app.
 */
export function nameFontStyle(id?: string | null): CSSProperties | undefined {
  const font = getNameFont(id)
  if (!font) return undefined
  return {
    fontFamily: `${font.family}, var(--font-main, 'Inter'), sans-serif`,
    fontWeight: font.weight,
    fontStyle: font.italic ? 'italic' : 'normal',
    letterSpacing: font.letterSpacing,
    fontSize: `${font.scale}em`,
    lineHeight: font.lineHeight ?? 1.1,
    // folga nas laterais para os floreios das letras manuscritas não serem cortados por "overflow: hidden"
    paddingInline: '0.12em',
    // folga em cima e embaixo para as hastes que descem ("g", "y", "p") e as que sobem: o efeito de nome pinta o texto
    // com "background-clip: text", que só colore dentro da caixa do elemento, e sem isso a ponta da letra ficava cortada
    paddingBlock: '0.3em',
    marginBlock: '-0.3em'
  }
}

const key = (userId: string) => `echo-name-font-${userId}`

/** A fonte guardada neste aparelho para uma pessoa (a minha, ou a última vista de outra). */
export function readStoredNameFont(userId: string): string {
  try {
    return localStorage.getItem(key(userId)) || ''
  } catch {
    return ''
  }
}

export function storeNameFont(userId: string, fontId: string): void {
  try {
    localStorage.setItem(key(userId), fontId)
    localStorage.setItem('echo-name-font', fontId)
  } catch {
    // só aparência: nunca pode atrapalhar
  }
}

/** Guarda a fonte que uma pessoa publicou na presença, para continuar aparecendo quando ela estiver offline. */
export function rememberNameFont(userId: string, fontId: unknown): void {
  if (!userId || typeof fontId !== 'string') return
  try {
    if (localStorage.getItem(key(userId)) !== fontId) localStorage.setItem(key(userId), fontId)
  } catch {
    // só aparência
  }
}

/**
 * Qual fonte mostrar no nome de `userId`: a minha vem da tela (para mudar na hora ao equipar); a dos outros vem da
 * presença (tempo real) e, se a pessoa está offline, do último valor visto neste aparelho.
 */
export function resolveNameFontId(
  userId: string,
  myUserId: string,
  myFontId: string,
  presenceData: Record<string, any> | undefined
): string {
  if (userId === myUserId) return myFontId
  return presenceData?.[userId]?.name_font || readStoredNameFont(userId)
}
