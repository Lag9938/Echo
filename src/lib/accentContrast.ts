// Contraste WCAG para a cor de destaque. O usuário pode escolher qualquer cor; daí saem três variações que
// garantem leitura: o fundo de botões com texto branco, e a cor da própria cor usada como TEXTO sobre o fundo
// do tema. Escurece (ou clareia) mantendo o matiz e a saturação, em vez de misturar com preto (que deixa barrento).

import type { CSSProperties } from 'react'

type RGB = [number, number, number]

export function parseHex(color: string): RGB | null {
  const clean = color.replace('#', '').trim()
  if (clean.length === 3) {
    return [0, 1, 2].map((i) => parseInt(clean[i] + clean[i], 16)) as RGB
  }
  if (clean.length === 6) {
    return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16)) as RGB
  }
  return null
}

export function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`
}

const channel = (c: number) => {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

export function luminance([r, g, b]: RGB): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h / 6, s, l]
}

function hslToRgb([h, s, l]: [number, number, number]): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255]
}

/**
 * Devolve a cor (ou a mais próxima dela, só mudando a luminosidade) que atinge `minRatio` contra `against`.
 * `direction` diz para que lado andar: 'darken' para fundo claro/texto branco, 'lighten' para fundo escuro.
 */
export function adjustForContrast(color: string, against: string, minRatio: number, direction: 'darken' | 'lighten'): string {
  const rgb = parseHex(color)
  const bg = parseHex(against)
  if (!rgb || !bg) return color
  if (contrastRatio(rgb, bg) >= minRatio) return toHex(rgb)
  const [h, s, l] = rgbToHsl(rgb)
  const step = direction === 'darken' ? -0.01 : 0.01
  let current = l
  for (let i = 0; i < 100; i++) {
    current = Math.max(0, Math.min(1, current + step))
    // Mede já arredondado para hexadecimal: é a cor que de fato vai para a tela
    const candidate = parseHex(toHex(hslToRgb([h, s, current])))!
    if (contrastRatio(candidate, bg) >= minRatio || current <= 0 || current >= 1) return toHex(candidate)
  }
  return toHex(rgb)
}

export interface AccentVariants {
  /** topo e base do degradê de botões com texto branco */
  fillTop: string
  fill: string
  /** a cor usada como texto, legível sobre o fundo do tema */
  text: string
}

/** Fundo do tema onde o texto colorido aparece, para medir o contraste (o pior caso de cada tema) */
const SURFACE = { light: '#e4dadd', dark: '#1a191e' } as const

export function accentVariants(color: string, mode: 'light' | 'dark'): AccentVariants {
  return {
    fillTop: adjustForContrast(color, '#ffffff', 4.5, 'darken'),
    fill: adjustForContrast(color, '#ffffff', 4.9, 'darken'),
    text: mode === 'light'
      ? adjustForContrast(color, SURFACE.light, 4.6, 'darken')
      : adjustForContrast(color, SURFACE.dark, 4.6, 'lighten')
  }
}

/** Preto-ameixa ou branco, o que tiver mais contraste sobre $bg (selos coloridos: amarelo e ciano pedem texto escuro) */
export function readableTextColor(bg: string): string {
  const rgb = parseHex(bg)
  if (!rgb) return '#ffffff'
  const dark = parseHex('#1b1220')!
  return contrastRatio(rgb, [255, 255, 255]) >= contrastRatio(rgb, dark) ? '#ffffff' : '#1b1220'
}

/** Estilo de um selo colorido: o fundo vem da cor do item e o texto da cor que melhor lê sobre ela */
export function badgeStyle(bg: string): CSSProperties {
  return { backgroundColor: bg, ['--badge-ink' as string]: readableTextColor(bg) } as CSSProperties
}

/** Cor de cargo usada como TEXTO: mistura com a tinta do tema (--role-ink-base / --role-mix, ver variables.css), para ler no claro e no escuro */
export function roleInk(color: string | undefined, fallback = 'var(--text-primary)'): string {
  if (!color) return fallback
  return `color-mix(in srgb, ${color} var(--role-mix, 100%), var(--role-ink-base, #ffffff))`
}
