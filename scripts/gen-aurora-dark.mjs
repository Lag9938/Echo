// Gera src/styles/aurora-dark.css a partir das regras do Aurora Light.
//
// Por quê: o visual do Aurora (painéis de vidro soltos, bordas, cantos, sombras, cartões, janelas…) está escrito
// uma vez só, nos arquivos do claro, com seletores `body.light-theme …`. Em vez de reescrever tudo à mão para o
// escuro (e deixar os dois desencontrarem), este script copia cada regra do claro trocando `.light-theme` por
// `.theme-aurora-dark` e converte as CORES: o vidro branco vira vidro grafite escuro, a tinta escura vira
// clara, as sombras ficam pretas, os verdes/âmbares/vermelhos ganham versões claras.
// Ajustes que não cabem numa regra geral ficam em src/styles/aurora-dark-overrides.css (escrito à mão).
//
// Uso: npm run aurora:dark   (rode de novo depois de mexer em qualquer arquivo do Aurora Light)
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'

const root = path.resolve(import.meta.dirname, '..')
// Primeiro as regras de tema claro dos arquivos antigos (tornam as superfícies transparentes/de vidro em vez do
// preto-ciano do tema escuro padrão); depois os arquivos do Aurora, na mesma ordem do índice src/App.css.
const LEGACY = [
  'base.css', 'topbar.css', 'sidebar.css', 'friends.css', 'chat.css', 'voice.css', 'calls.css', 'streaming.css',
  'effects.css', 'music-bot.css', 'settings/appearance.css', 'settings/layout.css', 'settings/profile.css'
]
const AURORA = [
  'space-studio-home.css',
  'friends-home.css',
  'shop-inventory.css',
  'settings-aurora.css',
  'member-profile.css',
  'voice-aurora.css',
  'aurora.css'
]
const SOURCES = [...LEGACY, ...AURORA]

const HEX = {
  '#2a1f2d': '#f6eff8', '#5b505f': '#c4b8ca', '#8a7f8e': '#9a8fa1',
  '#15803d': '#4ade80', '#14532d': '#86efac', '#166534': '#86efac', '#16a34a': '#4ade80',
  '#b45309': '#fbbf24', '#92400e': '#fbbf24', '#a16207': '#facc15',
  '#9a3a2e': '#fda99c', '#dc2626': '#f87171', '#b91c1c': '#f87171', '#dc3f3f': '#f87171',
  '#0369a1': '#7dd3fc', '#4338ca': '#a5b4fc', '#7e22ce': '#d8b4fe', '#be185d': '#f9a8d4',
  '#0f172a': '#f6eff8', '#1e293b': '#f6eff8', '#334155': '#d3c6d9', '#475569': '#c4b8ca', '#64748b': '#9a8fa1'
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const fmt = n => (Math.round(n * 100) / 100).toString()

// A cor do vidro vem de variáveis, para dar para trocar o tom do escuro (grafite…) sem regerar o arquivo
const glass = a => `rgba(var(--aurora-glass-rgb, 24, 22, 27), ${fmt(clamp(0.3 + a * 0.62, 0, 0.93))})`

const WHITE = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)/g
const NEAR_WHITE = /rgba\(\s*2[2-5]\d\s*,\s*2[2-5]\d\s*,\s*2[2-5]\d\s*,\s*([\d.]+)\s*\)/g
const INK =/rgba\(\s*(?:42\s*,\s*31\s*,\s*45|15\s*,\s*23\s*,\s*42)\s*,\s*([\d.]+)\s*\)/g
const BLACK = /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/g

function mapValue(prop, value) {
  const p = prop.toLowerCase()
  const isBg = p.startsWith('background')
  const isBorder = p.startsWith('border') || p.startsWith('outline')
  const isShadow = p.includes('shadow')
  let v = value

  // cores de texto/estado em hex
  v = v.replace(/#[0-9a-fA-F]{3,6}\b/g, m => HEX[m.toLowerCase()] ?? m)

  if (isShadow) {
    v = v.replace(/inset\s+([^,]*?)\s+(#fff|#ffffff)\b/gi, (_m, geo) => `inset ${geo} rgba(255, 255, 255, 0.14)`)
    v = v.replace(WHITE, (_m, a) => `rgba(255, 255, 255, ${fmt(clamp(parseFloat(a) * 0.35, 0.04, 0.25))})`)
    v = v.replace(INK, (_m, a) => `rgba(0, 0, 0, ${fmt(clamp(parseFloat(a) * 2.6, 0.12, 0.62))})`)
    return v
  }

  // mistura com branco vira mistura com a superfície escura
  v = v.replace(/,\s*(#fff|#ffffff)\s*\)/gi, ', var(--bg-secondary))')

  if (isBorder) {
    v = v.replace(WHITE, (_m, a) => `rgba(255, 255, 255, ${fmt(clamp(parseFloat(a) * 0.17, 0.08, 0.2))})`)
    v = v.replace(INK, (_m, a) => `rgba(255, 255, 255, ${fmt(clamp(parseFloat(a) * 1.1, 0.06, 0.2))})`)
    v = v.replace(BLACK, (_m, a) => `rgba(255, 255, 255, ${fmt(clamp(parseFloat(a) * 1.6, 0.06, 0.2))})`)
    v = v.replace(/(^|\s)(#fff|#ffffff)\b/gi, '$1rgba(255, 255, 255, 0.14)')
    return v
  }

  if (isBg) {
    v = v.replace(/rgba\(\s*255\s*,\s*236\s*,\s*231\s*,\s*[\d.]+\s*\)/g, 'rgba(223, 109, 93, 0.22)')
    v = v.replace(WHITE, (_m, a) => glass(parseFloat(a)))
    // brancos azulados do tema antigo (slate 241,245,249; 248,250,252…) também viram vidro escuro
    v = v.replace(NEAR_WHITE, (_m, a) => glass(parseFloat(a)))
    v = v.replace(/#(f[0-9a-f]|e[0-9a-f])(f[0-9a-f]|e[0-9a-f])(f[0-9a-f]|e[0-9a-f])\b/gi, 'var(--aurora-surface, #1c1b20)')
    v = v.replace(INK, (_m, a) => `rgba(255, 255, 255, ${fmt(clamp(parseFloat(a) * 1.25, 0.04, 0.22))})`)
    v = v.replace(BLACK, (_m, a) => parseFloat(a) <= 0.12 ? `rgba(255, 255, 255, ${fmt(clamp(parseFloat(a) * 1.5, 0.03, 0.14))})` : _m)
    v = v.replace(/(^|[\s,(])(#fff|#ffffff)\b(?!\s*0)/gi, '$1var(--aurora-surface, #1c1b20)')
    v = v.replace(/rgba\(\s*255\s*,\s*236\s*,\s*231\s*,\s*[\d.]+\s*\)/g, 'rgba(223, 109, 93, 0.22)')
    return v
  }

  // color, fill, stroke…: tinta escura vira clara; branco puro (texto sobre o coral) continua
  v = v.replace(INK, (_m, a) => `rgba(246, 239, 248, ${a})`)
  return v
}

function mapSelector(sel) {
  return sel.replace(/\.light-theme\b/g, '.theme-aurora-dark')
}

const out = []
let ruleCount = 0

for (const file of SOURCES) {
  const css = fs.readFileSync(path.join(root, 'src/styles', file), 'utf8')
  const tree = postcss.parse(css)
  const emitted = []

  const handleRule = rule => {
    const sels = rule.selectors.filter(s => s.includes('.light-theme'))
    if (!sels.length) return null
    const clone = rule.clone()
    clone.selectors = sels.map(mapSelector)
    clone.walkDecls(d => { d.value = mapValue(d.prop, d.value) })
    clone.raws.before = '\n'
    ruleCount++
    return clone
  }

  tree.each(node => {
    if (node.type === 'rule') {
      const c = handleRule(node)
      if (c) emitted.push(c)
    } else if (node.type === 'atrule' && /^(media|supports|layer)$/.test(node.name)) {
      const wrapper = node.clone({ nodes: [] })
      node.each(inner => {
        if (inner.type === 'rule') {
          const c = handleRule(inner)
          if (c) wrapper.append(c)
        }
      })
      if (wrapper.nodes?.length) emitted.push(wrapper)
    }
  })

  out.push(`/* ── de ${file} ── */\n` + emitted.map(n => n.toString()).join('\n'))
}

const header = `/* ==========================================================================
   ECHO AURORA DARK — GERADO. NÃO EDITE À MÃO.
   Origem: as regras do Aurora Light (${SOURCES.join(', ')}), com .light-theme trocado por
   .theme-aurora-dark e as cores convertidas por scripts/gen-aurora-dark.mjs.
   Ajustes manuais: src/styles/aurora-dark-overrides.css. Para regerar: npm run aurora:dark
   (${ruleCount} regras)
   ========================================================================== */
`
fs.writeFileSync(path.join(root, 'src/styles/aurora-dark.css'), header + out.join('\n\n') + '\n', 'utf8')
console.log(`aurora-dark.css gerado: ${ruleCount} regras`)
