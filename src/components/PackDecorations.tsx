import React, { memo, useId } from 'react'

/**
 * Pacote de decorações de avatar: Coelha Lunar, Sakura, Círculo Arcano, Asas de Cristal, Noite das Abóboras e
 * Geada Cristalina. Segue o mesmo contrato das de HighTierDecorations: um SVG de 120×120 com o avatar no centro
 * (raio ≈ 38) e a decoração em volta/por cima. As animações ficam em styles/avatar-decorations-pack.css.
 *
 * Duas regras de desempenho, porque estas aparecem em listas com dezenas de avatares:
 *  - só `transform` e `opacity` se mexem (nada de filtro SVG animado: o brilho é uma cópia mais larga e
 *    translúcida do mesmo traço, não um desfoque);
 *  - as animações respeitam "reduzir movimento" (a regra global de accessibility.css as congela num quadro).
 */

interface DecorationProps {
  className?: string
  style?: React.CSSProperties
}

const useUid = () => useId().replace(/[^a-zA-Z0-9_-]/g, '_')

const rad = (deg: number) => (deg * Math.PI) / 180
/** Ponto sobre o círculo centrado em (60,60): ângulo 0 = para cima */
const polar = (r: number, deg: number): [number, number] => [60 + r * Math.sin(rad(deg)), 60 - r * Math.cos(rad(deg))]

/** Estrela de quatro pontas (brilho) */
function Sparkle({ x, y, s = 1, fill = '#ffffff', delay = 0, dur = 2.6 }: { x: number; y: number; s?: number; fill?: string; delay?: number; dur?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="pk-twinkle"
        style={{ animationDelay: `${-delay}s`, animationDuration: `${dur}s` }}
        d="M0 -6 Q0.9 -0.9 6 0 Q0.9 0.9 0 6 Q-0.9 0.9 -6 0 Q-0.9 -0.9 0 -6 Z"
        fill={fill}
      />
    </g>
  )
}

/* ═════════════════════════════ 1. COELHA LUNAR ═════════════════════════════ */
function BunnyMoonDecorationImpl({ className = '', style }: DecorationProps) {
  const uid = useUid()
  const ear = `bm_ear_${uid}`
  const inner = `bm_inner_${uid}`
  const moon = `bm_moon_${uid}`
  const halo = `bm_halo_${uid}`
  const bow = `bm_bow_${uid}`
  const cloud = `bm_cloud_${uid}`

  // Orelha em pé (esquerda) e orelha com a ponta dobrada (direita)
  const earUp = 'M -8.5 0 C -14 -13 -11.5 -32 -1 -41 C 9.5 -32 13.5 -13 8.5 0 Z'
  const innerUp = 'M -4.5 -2 C -7.5 -12 -6.5 -27.5 -1 -34.5 C 4.5 -27.5 7.5 -12 4.5 -2 Z'
  const earBent = 'M -8.5 0 C -13.5 -12 -11.5 -29.5 -3 -38.5 C 4.5 -43.5 15.5 -39.5 15.5 -31 C 15.5 -25.5 11 -21.5 11 -14.5 C 11 -8.5 9 -4 8 0 Z'
  const innerBent = 'M -4.5 -2 C -7 -12 -6 -26 -2 -33 C 2 -37 9.2 -35 10.2 -31 C 7.2 -28 6 -20 5 -14 C 4.6 -8 4.6 -4 4.2 -2 Z'

  const Ear = ({ x, rot, cls, bent }: { x: number; rot: number; cls: string; bent?: boolean }) => (
    <g transform={`translate(${x} 35) rotate(${rot}) scale(0.88)`}>
      <g className={`pk-ear ${cls}`}>
        <path d={bent ? earBent : earUp} fill={`url(#${ear})`} stroke="#f472b6" strokeWidth="1.9" strokeLinejoin="round" />
        <path d={bent ? innerBent : innerUp} fill={`url(#${inner})`} opacity="0.96" />
        <path d="M -5.2 -3 L -3.4 -8 M -1.6 -3 L -0.5 -8.5 M 2.2 -3 L 3 -8" stroke="#f9a8d4" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
        <ellipse cx={bent ? -6.5 : -6.4} cy="-27" rx="1.6" ry="5.2" transform={`rotate(10 ${bent ? -6.5 : -6.4} -27)`} fill="#ffffff" opacity="0.85" />
      </g>
    </g>
  )

  const phases = [
    { k: 'new', mirror: false },
    { k: 'crescent', mirror: false },
    { k: 'half', mirror: false },
    { k: 'gibbous', mirror: false },
    { k: 'full', mirror: false },
    { k: 'gibbous', mirror: true },
    { k: 'half', mirror: true },
    { k: 'crescent', mirror: true }
  ]
  const phasePath = (k: string) => {
    if (k === 'crescent') return 'M 0 -2.5 A 2.5 2.5 0 0 1 0 2.5 A 1.25 2.5 0 0 0 0 -2.5 Z'
    if (k === 'half') return 'M 0 -2.5 A 2.5 2.5 0 0 1 0 2.5 Z'
    if (k === 'gibbous') return 'M 0 -2.5 A 2.5 2.5 0 0 1 0 2.5 A 1.25 2.5 0 0 1 0 -2.5 Z'
    return ''
  }

  return (
    <svg viewBox="0 0 120 120" className={`echo-deco-svg pk-deco pk-bunny-moon ${className}`} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={ear} x1="0" y1="-40" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.58" stopColor="#ffeaf4" />
          <stop offset="1" stopColor="#fbcfe8" />
        </linearGradient>
        <linearGradient id={inner} x1="0" y1="-34" x2="0" y2="-2" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fbcfe8" />
          <stop offset="0.6" stopColor="#f472b6" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
        <radialGradient id={moon} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#fffdf0" />
          <stop offset="0.55" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </radialGradient>
        <linearGradient id={halo} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbcfe8" />
          <stop offset="0.5" stopColor="#f472b6" />
          <stop offset="1" stopColor="#c4b5fd" />
        </linearGradient>
        <linearGradient id={bow} x1="0" y1="-6" x2="0" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f9a8d4" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={cloud} x1="0" y1="-6" x2="0" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#fce7f3" />
        </linearGradient>
      </defs>

      {/* Halo duplo pastel + filigrana lunar */}
      <circle cx="60" cy="60" r="45" stroke={`url(#${halo})`} strokeWidth="6" opacity="0.22" />
      <circle className="pk-breathe" cx="60" cy="60" r="47.2" stroke="#f9a8d4" strokeWidth="0.9" strokeDasharray="4 5" opacity="0.65" />
      <circle cx="60" cy="60" r="44.6" stroke={`url(#${halo})`} strokeWidth="2" opacity="0.95" />

      {/* 8 Fases da Lua em órbita contínua */}
      <g className="pk-spin-60">
        {phases.map((p, i) => {
          const [x, y] = polar(50.5, i * 45)
          return (
            <g key={i} transform={`translate(${x} ${y}) ${p.mirror ? 'scale(-1 1)' : ''}`}>
              <circle r="2.6" stroke="#fde68a" strokeWidth="0.65" opacity="0.78" />
              {p.k === 'full' ? <circle r="2.6" fill="#fff7c2" /> : p.k === 'new' ? null : <path d={phasePath(p.k)} fill="#fff7c2" />}
            </g>
          )
        })}
      </g>

      {/* Orelhas felpudas com animação independente */}
      <Ear x={42} rot={-14} cls="pk-ear-l" />
      <Ear x={78} rot={16} cls="pk-ear-r" bent />

      {/* Laço de Fita Kawaii com Broche Estelar Dourado e Pingente entre as orelhas */}
      <g className="pk-bob" transform="translate(60 17)">
        <path d="M -2 2 L -6 10 L -3 9 L -1 11 L 0 3" fill="#f472b6" opacity="0.9" />
        <path d="M 2 2 L 6 10 L 3 9 L 1 11 L 0 3" fill="#f472b6" opacity="0.9" />
        <path d="M 0 0 C -6.5 -5.5, -12 -4.2, -11.5 1.2 C -11 5.5, -5.5 5.2, 0 1.2 Z" fill={`url(#${bow})`} stroke="#ffffff" strokeWidth="0.85" />
        <path d="M 0 0 C 6.5 -5.5, 12 -4.2, 11.5 1.2 C 11 5.5, 5.5 5.2, 0 1.2 Z" fill={`url(#${bow})`} stroke="#ffffff" strokeWidth="0.85" />
        <path d="M 0 -3.8 L 1.1 -1.1 L 3.8 0 L 1.1 1.1 L 0 3.8 L -1.1 1.1 L -3.8 0 L -1.1 -1.1 Z" fill="#fef08a" stroke="#f59e0b" strokeWidth="0.55" />
      </g>

      {/* Nuvem fofinha no canto superior esquerdo */}
      <g className="pk-float" transform="translate(18 84) scale(0.78)">
        <path d="M -10 5 C -10 1.5, -6 0.5, -4 2.2 C -2 -1.2, 4 -1.2, 5.5 2.2 C 8 1.2, 10.5 3, 9.8 6.5 L -9.5 6.5 Z" fill={`url(#${cloud})`} stroke="#f9a8d4" strokeWidth="0.9" />
      </g>

      {/* Berço Lunar: Lua Crescente Dourada aninhada em nuvem fofinha na base direita */}
      <g className="pk-float" style={{ animationDelay: '-1.2s' }} transform="translate(93 88)">
        <circle cx="2" cy="-4" r="14" fill="#fde68a" opacity="0.2" />
        <path d="M 3 -15 A 11.5 11.5 0 1 0 11.5 3.5 A 8.8 8.8 0 0 1 3 -15 Z" fill={`url(#${moon})`} stroke="#fef08a" strokeWidth="0.75" />
        <circle cx="-1.5" cy="-2" r="1.3" fill="#f59e0b" opacity="0.38" />
        <circle cx="2.5" cy="2" r="0.9" fill="#f59e0b" opacity="0.38" />
        <path d="M -12 6 C -12 2, -7.5 1, -5 2.8 C -2.8 -1.2, 4.2 -1.2, 6.2 2.8 C 9.2 1.8, 12 3.8, 11.2 7.8 L -11.2 7.8 Z" fill={`url(#${cloud})`} stroke="#f9a8d4" strokeWidth="0.95" />
      </g>

      <Sparkle x={96} y={20} s={0.82} fill="#fde68a" delay={0.2} />
      <Sparkle x={112} y={52} s={0.62} fill="#fbcfe8" delay={1.1} />
      <Sparkle x={11} y={30} s={0.76} fill="#fbcfe8" delay={0.7} />
      <Sparkle x={105} y={104} s={0.68} fill="#ffffff" delay={1.6} />
      <Sparkle x={16} y={98} s={0.58} fill="#c4b5fd" delay={2.0} />
      <Sparkle x={24} y={10} s={0.55} fill="#fde68a" delay={2.4} />
    </svg>
  )
}

/* ═════════════════════════════ 2. CHUVA DE SAKURA ═════════════════════════════ */
function SakuraBloomDecorationImpl({ className = '', style }: DecorationProps) {
  const uid = useUid()
  const petal = `sk_petal_${uid}`
  const petalDeep = `sk_petal_deep_${uid}`
  const ring = `sk_ring_${uid}`
  const bark = `sk_bark_${uid}`

  const petalPath = 'M0 0 C -6 -3 -7.6 -10 -2.6 -13.2 L 0 -10.8 L 2.6 -13.2 C 7.6 -10 6 -3 0 0 Z'

  const Blossom = ({ x, y, s = 1, rot = 0 }: { x: number; y: number; s?: number; rot?: number }) => (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle r="8.5" fill="#fda4af" opacity="0.18" />
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} transform={`rotate(${a})`} d={petalPath} fill={`url(#${petal})`} stroke="#fb7185" strokeWidth="0.55" strokeOpacity="0.65" strokeLinejoin="round" />
      ))}
      <circle r="2.6" fill="#fef08a" stroke="#f59e0b" strokeWidth="0.4" />
      {[0, 72, 144, 216, 288].map((a) => (
        <g key={`s${a}`} transform={`rotate(${a})`}>
          <line x1="0" y1="-2.2" x2="0" y2="-4.6" stroke="#fb7185" strokeWidth="0.45" />
          <circle cx="0" cy="-4.8" r="0.75" fill="#fde047" />
        </g>
      ))}
    </g>
  )

  const Bud = ({ x, y, rot = 0, s = 1 }: { x: number; y: number; rot?: number; s?: number }) => (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M 0 0 C -3 -2 -3.2 -6.5 0 -9 C 3.2 -6.5 3 -2 0 0 Z" fill={`url(#${petalDeep})`} stroke="#ffe4e6" strokeWidth="0.45" />
      <path d="M -2 0.2 L 0 -2.2 L 2 0.2" stroke="#4d7c0f" strokeWidth="0.9" strokeLinecap="round" fill="none" />
    </g>
  )

  const falling = [
    { x: 34, y: 8, dx: 11, dy: 35, r: 210, d: 5.8, t: 0 },
    { x: 58, y: 3, dx: -9, dy: 32, r: -170, d: 5.1, t: 1.6 },
    { x: 84, y: 9, dx: 10, dy: 36, r: 230, d: 6.4, t: 2.9 },
    { x: 106, y: 30, dx: -11, dy: 34, r: -195, d: 5.5, t: 0.8 },
    { x: 10, y: 54, dx: 10, dy: 33, r: 185, d: 6.1, t: 2.2 },
    { x: 112, y: 66, dx: -10, dy: 31, r: -215, d: 5.0, t: 3.7 },
    { x: 24, y: 80, dx: 11, dy: 30, r: 190, d: 5.7, t: 1.2 },
    { x: 74, y: 14, dx: -8, dy: 36, r: 165, d: 6.0, t: 4.3 }
  ]

  return (
    <svg viewBox="0 0 120 120" className={`echo-deco-svg pk-deco pk-sakura ${className}`} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={petal} x1="0" y1="0" x2="0" y2="-13" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fb7185" />
          <stop offset="0.48" stopColor="#fda4af" />
          <stop offset="1" stopColor="#fff1f2" />
        </linearGradient>
        <linearGradient id={petalDeep} x1="0" y1="0" x2="0" y2="-9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e11d48" />
          <stop offset="1" stopColor="#fda4af" />
        </linearGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fda4af" />
          <stop offset="0.5" stopColor="#f472b6" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id={bark} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3f2c" />
          <stop offset="1" stopColor="#431e15" />
        </linearGradient>
      </defs>

      {/* Cordão duplo Mizuhiki rosa e dourado */}
      <circle cx="60" cy="60" r="45.5" stroke={`url(#${ring})`} strokeWidth="6" opacity="0.2" />
      <circle cx="60" cy="60" r="45.2" stroke={`url(#${ring})`} strokeWidth="2" opacity="0.92" />
      <g className="pk-spin-60">
        <circle cx="60" cy="60" r="48" stroke="#fde68a" strokeWidth="0.85" strokeDasharray="8 6 2 6" opacity="0.7" />
      </g>

      {/* Ramo de Bonsai Superior Esquerdo esculpido */}
      <g className="pk-sway" style={{ transformOrigin: '18px 46px' }}>
        <path d="M 11 58 C 12 40, 22 23, 45 14 M 21 35 C 28 29, 34 27, 40 28 M 15 47 C 9 42, 8 35, 11 29" stroke={`url(#${bark})`} strokeWidth="2.4" strokeLinecap="round" />
        <Bud x={47} y={14} rot={65} s={0.85} />
        <Bud x={10} y={28} rot={-25} s={0.78} />
        <Blossom x={27} y={26} s={1.08} rot={12} />
        <Blossom x={16} y={42} s={0.82} rot={-22} />
        <Blossom x={39} y={17} s={0.68} rot={32} />
      </g>

      {/* Ramo de Bonsai Inferior Direito esculpido */}
      <g className="pk-sway" style={{ transformOrigin: '102px 76px', animationDelay: '-2.2s' }}>
        <path d="M 109 64 C 107 82, 96 97, 75 106 M 99 84 C 92 90, 86 92, 80 91" stroke={`url(#${bark})`} strokeWidth="2.3" strokeLinecap="round" />
        <Bud x={73} y={106} rot={-115} s={0.82} />
        <Blossom x={93} y={94} s={1.04} rot={-16} />
        <Blossom x={104} y={80} s={0.78} rot={26} />
        <Blossom x={82} y={102} s={0.64} rot={8} />
      </g>

      {/* Chuva contínua de 8 pétalas em rotação */}
      {falling.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <path
            className="pk-petal"
            d={petalPath}
            transform="scale(0.6)"
            fill={`url(#${petal})`}
            stroke="#fb7185"
            strokeWidth="0.35"
            style={{ ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`, ['--rot' as string]: `${p.r}deg`, animationDuration: `${p.d}s`, animationDelay: `${-p.t}s` }}
          />
        </g>
      ))}

      <Sparkle x={74} y={9} s={0.74} fill="#ffffff" delay={0.4} />
      <Sparkle x={111} y={48} s={0.58} fill="#fde68a" delay={1.4} />
      <Sparkle x={18} y={96} s={0.62} fill="#ffe4e6" delay={2.1} />
    </svg>
  )
}

/* ═════════════════════════════ 3. CÍRCULO ARCANO ═════════════════════════════ */
function ArcaneCircleDecorationImpl({ className = '', style }: DecorationProps) {
  const uid = useUid()
  const g1 = `ac_g1_${uid}`
  const g2 = `ac_g2_${uid}`
  const gemCyan = `ac_gem_c_${uid}`
  const gemViol = `ac_gem_v_${uid}`

  const runes = [
    'M -2 2.4 L 0 -2.8 L 2 2.4 M -1.2 0.8 L 1.2 0.8',
    'M -2 -2.6 L 2 -2.6 M 0 -2.6 L 0 2.8 M -2 0.2 L 2 0.2',
    'M -1.6 -2.8 L 1.8 0 L -1.6 2.8 M 0.2 0 L 2.4 0',
    'M 0 -2.9 L 0 2.9 M -2 -1 L 0 -2.9 L 2 -1',
    'M -2 -2.4 L 2 2.4 M 2 -2.4 L -2 2.4 M 0 -3 L 0 3',
    'M -2 2.6 L -2 -2.6 L 2 2.6 L 2 -2.6'
  ]
  const ticks = Array.from({ length: 48 }, (_, i) => i * 7.5)

  return (
    <svg viewBox="0 0 120 120" className={`echo-deco-svg pk-deco pk-arcane ${className}`} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9d5ff" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id={g2} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#c084fc" />
        </linearGradient>
        <linearGradient id={gemCyan} x1="0" y1="-5" x2="0" y2="5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ecfeff" />
          <stop offset="0.5" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id={gemViol} x1="0" y1="-5" x2="0" y2="5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f5f3ff" />
          <stop offset="0.5" stopColor="#c084fc" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>

      {/* Halo místico externo + Octagrama de Geometria Sagrada girando */}
      <circle cx="60" cy="60" r="53.5" stroke={`url(#${g1})`} strokeWidth="5.5" opacity="0.2" />
      <g className="pk-spin-60">
        <circle cx="60" cy="60" r="53.5" stroke={`url(#${g1})`} strokeWidth="1.2" />
        <polygon points="60,7 72.5,47.5 113,60 72.5,72.5 60,113 47.5,72.5 7,60 47.5,47.5" stroke="#22d3ee" strokeWidth="0.9" opacity="0.5" />
        <polygon points="60,7 72.5,47.5 113,60 72.5,72.5 60,113 47.5,72.5 7,60 47.5,47.5" transform="rotate(45 60 60)" stroke="#c084fc" strokeWidth="0.9" opacity="0.5" />
        {ticks.map((a, i) => {
          const long = i % 6 === 0
          const [x1, y1] = polar(53.5, a)
          const [x2, y2] = polar(long ? 49.8 : 51.5, a)
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={long ? '#67e8f9' : '#a78bfa'} strokeWidth={long ? 1.4 : 0.75} strokeLinecap="round" opacity={long ? 0.95 : 0.7} />
        })}
      </g>

      <circle cx="60" cy="60" r="48.2" stroke={`url(#${g2})`} strokeWidth="1" opacity="0.85" />

      {/* Anel de 12 Runas Ancestrais em contra-rotação */}
      <g className="pk-spin-45r">
        {Array.from({ length: 12 }, (_, i) => {
          const a = i * 30
          const [x, y] = polar(45.2, a)
          return (
            <g key={a} transform={`translate(${x} ${y}) rotate(${a})`}>
              <path d={runes[i % runes.length]} stroke={i % 2 === 0 ? '#e9d5ff' : '#67e8f9'} strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )
        })}
      </g>

      {/* Selo de contenção interno pulsante */}
      <circle className="pk-breathe" cx="60" cy="60" r="42" stroke={`url(#${g1})`} strokeWidth="1.6" />

      {/* 4 Gemas de Mana Cardeais Lapidadas em órbita */}
      <g className="pk-spin-18">
        {[0, 90, 180, 270].map((a, i) => {
          const [x, y] = polar(51.5, a)
          const isCyan = i % 2 === 0
          return (
            <g key={a} transform={`translate(${x} ${y}) rotate(${a})`}>
              <circle r="5.5" fill={isCyan ? '#22d3ee' : '#a855f7'} opacity="0.28" />
              <polygon points="0,-4.6 3.2,0 0,4.6 -3.2,0" fill={`url(#${isCyan ? gemCyan : gemViol})`} stroke="#ffffff" strokeWidth="0.65" />
              <polygon points="0,-2.4 1.5,0 0,2.4 -1.5,0" fill="#ffffff" opacity="0.75" />
            </g>
          )
        })}
      </g>

      <Sparkle x={60} y={4} s={0.65} fill="#67e8f9" delay={0.3} />
      <Sparkle x={115} y={60} s={0.6} fill="#e9d5ff" delay={1.2} />
      <Sparkle x={5} y={60} s={0.6} fill="#67e8f9" delay={2.0} />
    </svg>
  )
}

/* ═════════════════════════════ 4. ASAS DE CRISTAL ═════════════════════════════ */
function CrystalWingsDecorationImpl({ className = '', style }: DecorationProps) {
  const uid = useUid()
  const f1 = `cw_f1_${uid}`
  const f2 = `cw_f2_${uid}`
  const ring = `cw_ring_${uid}`

  const feather = 'M 0 0 C -6.6 -9 -7 -24.5 0 -41 C 7 -24.5 6.6 -9 0 0 Z'
  const quills = [
    { a: -98, s: 0.66 },
    { a: -82, s: 0.86 },
    { a: -65, s: 1.04 },
    { a: -48, s: 1.18 },
    { a: -32, s: 1.22 },
    { a: -17, s: 1.08 },
    { a: -3, s: 0.86 }
  ]
  const L = 40 * 0.94
  const tips = quills.map((q) => [Math.sin(rad(q.a)) * L * q.s, -Math.cos(rad(q.a)) * L * q.s])
  const membrane = `M 0 0 ${tips.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} Z`

  const Wing = ({ side }: { side: 'l' | 'r' }) => (
    <g transform={side === 'r' ? 'matrix(-1 0 0 1 120 0)' : undefined}>
      <g className={`pk-wing pk-wing-${side}`}>
        <g transform="translate(24 64)">
          <path d={membrane} fill={`url(#${f2})`} opacity="0.26" stroke="#e0f2fe" strokeWidth="0.6" strokeOpacity="0.6" strokeLinejoin="round" />
          {quills.map((q, i) => (
            <g key={i} transform={`rotate(${q.a}) scale(${q.s * 0.94})`}>
              <path d={feather} fill={`url(#${i % 2 ? f2 : f1})`} opacity="0.9" />
              <path d={feather} stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.85" strokeLinejoin="round" />
              <path d="M 0 -4 L 0 -34 M 0 -18 L -2.6 -24 M 0 -24 L 2.6 -30" stroke="#ffffff" strokeWidth="0.65" strokeOpacity="0.7" strokeLinecap="round" />
            </g>
          ))}
          <circle r="3" fill="#ffffff" stroke="#67e8f9" strokeWidth="0.8" />
          <circle r="6" fill="#bae6fd" opacity="0.35" />
        </g>
      </g>
    </g>
  )

  return (
    <svg viewBox="0 0 120 120" className={`echo-deco-svg pk-deco pk-wings ${className}`} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={f1} x1="0" y1="0" x2="0" y2="-38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.5" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id={f2} x1="0" y1="0" x2="0" y2="-38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.55" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="0.5" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>

      <Wing side="l" />
      <Wing side="r" />

      <circle cx="60" cy="60" r="44.2" stroke={`url(#${ring})`} strokeWidth="5" opacity="0.2" />
      <circle cx="60" cy="60" r="44.2" stroke={`url(#${ring})`} strokeWidth="1.6" opacity="0.9" />

      {/* Diadema Astral no topo */}
      <g className="pk-bob" transform="translate(60 14)">
        <polygon points="0,-6 4,0 0,6 -4,0" fill="#e0f2fe" stroke="#ffffff" strokeWidth="0.8" />
        <polygon points="-7,-1 -4,-3 -3,1 -6,2" fill="#c4b5fd" />
        <polygon points="7,-1 4,-3 3,1 6,2" fill="#c4b5fd" />
      </g>

      <Sparkle x={9} y={32} s={0.78} fill="#e0f2fe" delay={0.3} />
      <Sparkle x={111} y={34} s={0.78} fill="#ede9fe" delay={1.2} />
      <Sparkle x={22} y={104} s={0.62} fill="#bae6fd" delay={1.9} />
      <Sparkle x={98} y={104} s={0.62} fill="#ddd6fe" delay={0.8} />
      <Sparkle x={60} y={4} s={0.68} fill="#ffffff" delay={1.6} />
    </svg>
  )
}

/* ═════════════════════════════ 5. NOITE DAS ABÓBORAS ═════════════════════════════ */
function PumpkinNightDecorationImpl({ className = '', style }: DecorationProps) {
  const uid = useUid()
  const ring = `pn_ring_${uid}`
  const vine = `pn_vine_${uid}`
  const body = `pn_body_${uid}`
  const glow = `pn_glow_${uid}`
  const moon = `pn_moon_${uid}`

  const batPath = 'M0 -0.8 C 2 -3.4, 5.5 -4.2, 9.2 -1.8 C 7.4 -0.4, 6.8 1.2, 5.2 2.2 C 3.8 1, 2.2 1.2, 0 3.6 C -2.2 1.2, -3.8 1, -5.2 2.2 C -6.8 1.2, -7.4 -0.4, -9.2 -1.8 C -5.5 -4.2, -2 -3.4, 0 -0.8 Z'

  return (
    <svg viewBox="0 0 120 120" className={`echo-deco-svg pk-deco pk-pumpkin ${className}`} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="0.45" stopColor="#ea580c" />
          <stop offset="0.78" stopColor="#a855f7" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id={vine} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b1d5e" />
          <stop offset="1" stopColor="#1b0c2e" />
        </linearGradient>
        <radialGradient id={body} cx="0.4" cy="0.3" r="0.78">
          <stop offset="0" stopColor="#fed7aa" />
          <stop offset="0.45" stopColor="#fb923c" />
          <stop offset="0.82" stopColor="#ea580c" />
          <stop offset="1" stopColor="#9a3412" />
        </radialGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#fb923c" stopOpacity="0.65" />
          <stop offset="0.6" stopColor="#a855f7" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={moon} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="0.6" stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>

      {/* Halo externo místico roxo/laranja + anel principal + cipós envolvendo o aro */}
      <circle cx="60" cy="60" r="46" stroke={`url(#${ring})`} strokeWidth="6.5" opacity="0.22" />
      <circle className="pk-breathe" cx="60" cy="60" r="48.5" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 6" opacity="0.55" />
      <circle cx="60" cy="60" r="45.2" stroke={`url(#${ring})`} strokeWidth="2.2" opacity="0.95" />
      <path d="M 16 48 C 12 62, 17 78, 28 89 C 38 99, 54 107, 72 104 C 89 101, 102 88, 105 70" stroke={`url(#${vine})`} strokeWidth="2.2" strokeLinecap="round" opacity="0.92" />
      <path d="M 22 33 C 33 18, 52 12, 72 15 C 88 18, 101 30, 105 46" stroke="#c084fc" strokeWidth="1" strokeDasharray="5 3 1.5 3" strokeLinecap="round" opacity="0.85" />

      {/* Lua Crescente de Halloween no topo direito */}
      <g className="pk-bob" style={{ transformOrigin: '95px 22px', animationDuration: '3.6s' }}>
        <circle cx="95" cy="22" r="10.5" fill={`url(#${glow})`} />
        <path d="M 91 13.5 A 9.2 9.2 0 1 1 85.5 28.5 A 7.2 7.2 0 1 0 91 13.5 Z" fill={`url(#${moon})`} stroke="#fed7aa" strokeWidth="0.5" />
      </g>

      {/* Teia de aranha curvada acompanhando o arco superior esquerdo do anel */}
      <g className="pk-web" opacity="0.88" stroke="#e9d5ff" strokeWidth="0.7" strokeLinecap="round">
        <path d="M 15 44 L 38 16 M 15 44 L 46 24 M 15 44 L 33 34 M 15 44 L 24 19" strokeOpacity="0.75" />
        <path d="M 21 36 Q 26 32 30 26 Q 34 22 38 16" fill="none" />
        <path d="M 18 40 Q 23 37 26 32 Q 30 29 33 24" fill="none" />
        <path d="M 26 30 Q 32 27 36 21" fill="none" />
      </g>

      {/* Aranha pendurada suavemente a partir do arco da teia */}
      <g className="pk-dangle" style={{ transformOrigin: '28px 25px' }}>
        <line x1="28" y1="25" x2="28" y2="39" stroke="#e9d5ff" strokeWidth="0.65" strokeDasharray="1.5 1" opacity="0.85" />
        <ellipse cx="28" cy="41.5" rx="3.2" ry="2.7" fill="#170d2a" stroke="#a855f7" strokeWidth="0.65" />
        <circle cx="28" cy="38.8" r="1.7" fill="#170d2a" stroke="#a855f7" strokeWidth="0.55" />
        <path d="M 25.2 40.5 L 22.2 38.8 L 20.8 40.4 M 25 41.8 L 21.8 41.8 L 20.5 43.5 M 25.4 43 L 22.8 44.2 L 21.8 46" stroke="#c084fc" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 30.8 40.5 L 33.8 38.8 L 35.2 40.4 M 31 41.8 L 34.2 41.8 L 35.5 43.5 M 30.6 43 L 33.2 44.2 L 34.2 46" stroke="#c084fc" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="27.2" cy="38.9" r="0.65" fill="#fb923c" />
        <circle cx="28.8" cy="38.9" r="0.65" fill="#fb923c" />
      </g>

      {/* Fogos-fátuos místicos nas laterais */}
      <g className="pk-wisp" transform="translate(105, 62)">
        <path d="M 0 5 C -3 5, -4 1, -1.5 -3 C 0 -5.5, 1.5 -7, 0.5 -10 C 3.5 -6.5, 4.5 -2, 3 1.5 C 2 4, 1 5, 0 5 Z" fill="#a855f7" opacity="0.85" />
        <path d="M 0 3.5 C -1.5 3.5, -2 1, -0.5 -2 C 0.5 -4, 1 -5, 0.5 -7 C 2 -4.5, 2.5 -1.5, 1.5 1 C 1 2.5, 0.5 3.5, 0 3.5 Z" fill="#f0abfc" />
      </g>
      <g className="pk-wisp" transform="translate(13, 66) scale(0.82)" style={{ animationDelay: '-1.1s' }}>
        <path d="M 0 5 C -3 5, -4 1, -1.5 -3 C 0 -5.5, 1.5 -7, 0.5 -10 C 3.5 -6.5, 4.5 -2, 3 1.5 C 2 4, 1 5, 0 5 Z" fill="#fb923c" opacity="0.85" />
        <path d="M 0 3.5 C -1.5 3.5, -2 1, -0.5 -2 C 0.5 -4, 1 -5, 0.5 -7 C 2 -4.5, 2.5 -1.5, 1.5 1 C 1 2.5, 0.5 3.5, 0 3.5 Z" fill="#fef08a" />
      </g>

      {/* Morcegos em órbita em duas camadas */}
      <g className="pk-spin-16">
        <g transform="translate(97 25) scale(1.65)">
          <g className="pk-upright">
            <g className="pk-flap">
              <path d={batPath} fill="#170d2a" stroke="#c084fc" strokeWidth="0.6" strokeLinejoin="round" />
              <circle cx="-0.9" cy="-0.3" r="0.45" fill="#fb923c" />
              <circle cx="0.9" cy="-0.3" r="0.45" fill="#fb923c" />
            </g>
          </g>
        </g>
        <g transform="translate(22 95) scale(1.35)">
          <g className="pk-upright" style={{ animationDelay: '-0.5s' }}>
            <g className="pk-flap" style={{ animationDelay: '-0.2s' }}>
              <path d={batPath} fill="#170d2a" stroke="#fb923c" strokeWidth="0.55" strokeLinejoin="round" />
            </g>
          </g>
        </g>
      </g>

      <g className="pk-spin-22r">
        <g transform="translate(60 8) scale(1.25)">
          <g className="pk-upright-22">
            <g className="pk-flap" style={{ animationDelay: '-0.35s' }}>
              <path d={batPath} fill="#170d2a" stroke="#a855f7" strokeWidth="0.55" strokeLinejoin="round" />
            </g>
          </g>
        </g>
      </g>

      {/* Dupla de Abóboras Iluminadas (Jack-o'-Lantern + Mini Abóbora) */}
      <g transform="translate(26 93) scale(1.16)">
        <circle className="pk-flicker" r="17" fill={`url(#${glow})`} />

        {/* Mini abóbora acompanhante à direita */}
        <g transform="translate(11.5, 4.5) rotate(14) scale(0.62)">
          <path d="M -0.8 -8.2 C -0.8 -10.5 0.8 -12 2.8 -12.4 C 2 -11 2.2 -9.5 3 -8.2 Z" fill="#4d7c0f" />
          <ellipse cx="-4" cy="0" rx="5.2" ry="7.4" fill={`url(#${body})`} />
          <ellipse cx="4" cy="0" rx="5.2" ry="7.4" fill={`url(#${body})`} />
          <ellipse cx="0" cy="0" rx="4.8" ry="7.8" fill={`url(#${body})`} />
          <g className="pk-flicker" fill="#fef08a">
            <path d="M -4.2 -1.6 L -2 -3.8 L -1 -1.2 Z" />
            <path d="M 4.2 -1.6 L 2 -3.8 L 1 -1.2 Z" />
            <path d="M -3.6 2.2 Q 0 5.2 3.6 2.2 Q 0 6.8 -3.6 2.2 Z" />
          </g>
        </g>

        {/* Abóbora Principal */}
        <g className="pk-bob">
          <path d="M -3 -8.2 C -6.5 -10.5, -8.5 -7.5, -6.5 -5.5" stroke="#65a30d" strokeWidth="0.8" strokeLinecap="round" fill="none" />
          <path d="M 2.5 -8.5 C 5.5 -10.5, 7.5 -8, 6 -6" stroke="#65a30d" strokeWidth="0.75" strokeLinecap="round" fill="none" />
          <path d="M -1.2 -8.4 C -1.2 -11.4, 0.8 -13.2, 3.4 -13.6 C 2.4 -11.8, 2.5 -10, 3.6 -8.4 Z" fill="#65a30d" stroke="#365314" strokeWidth="0.55" />
          <ellipse cx="-5.8" cy="0.2" rx="5.2" ry="7.8" fill={`url(#${body})`} stroke="#7c2d12" strokeWidth="0.45" />
          <ellipse cx="5.8" cy="0.2" rx="5.2" ry="7.8" fill={`url(#${body})`} stroke="#7c2d12" strokeWidth="0.45" />
          <ellipse cx="-3" cy="0.4" rx="5.2" ry="8.4" fill={`url(#${body})`} stroke="#9a3412" strokeWidth="0.45" />
          <ellipse cx="3" cy="0.4" rx="5.2" ry="8.4" fill={`url(#${body})`} stroke="#9a3412" strokeWidth="0.45" />
          <ellipse cx="0" cy="0.5" rx="4.8" ry="8.7" fill={`url(#${body})`} stroke="#9a3412" strokeWidth="0.4" />
          <g className="pk-flicker">
            <path d="M -6 -2 L -3 -5 L -1.2 -1.4 Z" fill="#ea580c" />
            <path d="M -5.4 -2.1 L -3 -4.4 L -1.6 -1.6 Z" fill="#fef08a" />
            <path d="M 6 -2 L 3 -5 L 1.2 -1.4 Z" fill="#ea580c" />
            <path d="M 5.4 -2.1 L 3 -4.4 L 1.6 -1.6 Z" fill="#fef08a" />
            <path d="M -1.1 -0.2 L 0 -1.8 L 1.1 -0.2 Z" fill="#fef08a" />
            <path d="M -5.4 2 L -3.4 3.8 L -1.8 2.2 L 0 4.2 L 1.8 2.2 L 3.4 3.8 L 5.4 2 L 4 5.8 L 1.8 4.8 L 0 6.6 L -1.8 4.8 L -4 5.8 Z" fill="#fef08a" stroke="#ea580c" strokeWidth="0.35" strokeLinejoin="round" />
          </g>
        </g>
      </g>

      <Sparkle x={106} y={44} s={0.62} fill="#fdba74" delay={0.4} />
      <Sparkle x={68} y={9} s={0.55} fill="#e9d5ff" delay={1.4} />
      <Sparkle x={11} y={82} s={0.5} fill="#fb923c" delay={2.1} />
    </svg>
  )
}

/* ═════════════════════════════ 6. GEADA CRISTALINA ═════════════════════════════ */
function FrostCrystalDecorationImpl({ className = '', style }: DecorationProps) {
  const uid = useUid()
  const ring = `fc_ring_${uid}`
  const prismLight = `fc_prism_light_${uid}`
  const prismDark = `fc_prism_dark_${uid}`
  const aura = `fc_aura_${uid}`

  const Flake = ({ x, y, s, dur, delay, stroke = '#f0f9ff' }: { x: number; y: number; s: number; dur: number; delay: number; stroke?: string }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="pk-flake" style={{ animationDuration: `${dur}s`, animationDelay: `${-delay}s` }}>
        <circle r="5" fill={`url(#${aura})`} />
        {[0, 60, 120].map((a) => (
          <g key={a} transform={`rotate(${a})`} stroke={stroke} strokeWidth="1.05" strokeLinecap="round">
            <path d="M 0 -6.4 L 0 6.4" />
            <path d="M -2.2 -3.8 L 0 -5.5 L 2.2 -3.8 M -2.2 3.8 L 0 5.5 L 2.2 3.8" strokeWidth="0.9" />
          </g>
        ))}
        <circle r="1.3" fill="#ffffff" />
      </g>
    </g>
  )

  const snow = [
    { x: 38, y: 8, dx: 6, dy: 28, d: 5.4, t: 0, r: 1.4, c: '#ffffff' },
    { x: 82, y: 8, dx: -6, dy: 30, d: 6.1, t: 2.1, r: 1.2, c: '#e0f2fe' },
    { x: 109, y: 42, dx: -5, dy: 26, d: 5.0, t: 1.2, r: 1.3, c: '#ffffff' },
    { x: 11, y: 44, dx: 5, dy: 26, d: 5.8, t: 3.0, r: 1.3, c: '#bae6fd' },
    { x: 92, y: 110, dx: -4, dy: -22, d: 5.2, t: 0.8, r: 1.2, c: '#e0f2fe' },
    { x: 28, y: 108, dx: 4, dy: -20, d: 5.7, t: 2.5, r: 1.2, c: '#ffffff' }
  ]

  return (
    <svg viewBox="0 0 120 120" className={`echo-deco-svg pk-deco pk-frost ${className}`} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.38" stopColor="#bae6fd" />
          <stop offset="0.72" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#e0f2fe" />
        </linearGradient>
        <linearGradient id={prismLight} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
        <linearGradient id={prismDark} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="0.55" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
        <radialGradient id={aura}>
          <stop offset="0" stopColor="#7dd3fc" stopOpacity="0.45" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Aura glacial suave + anel lapidado duplo */}
      <circle cx="60" cy="60" r="45.5" stroke={`url(#${ring})`} strokeWidth="6" opacity="0.22" />
      <circle className="pk-breathe" cx="60" cy="60" r="48" stroke="#bae6fd" strokeWidth="0.9" strokeDasharray="6 4 1.5 4" opacity="0.6" />
      <circle cx="60" cy="60" r="44.8" stroke={`url(#${ring})`} strokeWidth="2.2" opacity="0.95" />
      <circle cx="60" cy="60" r="43.2" stroke="#ffffff" strokeWidth="0.7" opacity="0.7" />

      {/* Arcos de gelo esculpido abraçando o aro */}
      <path d="M 32 24 A 45.5 45.5 0 0 1 88 24" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <path d="M 18 76 A 45.5 45.5 0 0 0 46 103" stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      <path d="M 102 76 A 45.5 45.5 0 0 1 74 103" stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />

      {/* 1. Coroa Glacial no topo (cluster de 3 prismas lapidados em duas faces) */}
      <g className="pk-shimmer" transform="translate(60, 14)">
        <circle cy="-2" r="10" fill={`url(#${aura})`} />
        <g transform="translate(-7.5, 2.5) rotate(-24) scale(0.78)">
          <polygon points="0,-11 -3.8,-2 -2.2,4 0,4" fill={`url(#${prismLight})`} />
          <polygon points="0,-11 3.8,-2 2.2,4 0,4" fill={`url(#${prismDark})`} />
          <polyline points="-3.8,-2 0,-4.5 3.8,-2" stroke="#ffffff" strokeWidth="0.55" opacity="0.85" />
        </g>
        <g transform="translate(7.5, 2.5) rotate(24) scale(0.78)">
          <polygon points="0,-11 -3.8,-2 -2.2,4 0,4" fill={`url(#${prismLight})`} />
          <polygon points="0,-11 3.8,-2 2.2,4 0,4" fill={`url(#${prismDark})`} />
          <polyline points="-3.8,-2 0,-4.5 3.8,-2" stroke="#ffffff" strokeWidth="0.55" opacity="0.85" />
        </g>
        <g>
          <polygon points="0,-13.5 -4.4,-2.5 -2.6,4.5 0,4.5" fill={`url(#${prismLight})`} />
          <polygon points="0,-13.5 4.4,-2.5 2.6,4.5 0,4.5" fill={`url(#${prismDark})`} />
          <polygon points="0,-13.5 -4.4,-2.5 0,-5 4.4,-2.5" fill="#ffffff" opacity="0.7" />
          <line x1="0" y1="-13.5" x2="0" y2="4.5" stroke="#ffffff" strokeWidth="0.65" opacity="0.9" />
        </g>
      </g>

      {/* 2. Clusters laterais assimétricos de cristal */}
      <g className="pk-shimmer" style={{ animationDelay: '-0.8s' }} transform="translate(23, 33) rotate(-54)">
        <g transform="translate(-4, 1.5) rotate(-18) scale(0.65)">
          <polygon points="0,-11 -3.5,-2 -2,3.5 0,3.5" fill={`url(#${prismLight})`} />
          <polygon points="0,-11 3.5,-2 2,3.5 0,3.5" fill={`url(#${prismDark})`} />
        </g>
        <polygon points="0,-10.5 -3.6,-2 -2.2,3.5 0,3.5" fill={`url(#${prismLight})`} />
        <polygon points="0,-10.5 3.6,-2 2.2,3.5 0,3.5" fill={`url(#${prismDark})`} />
        <line x1="0" y1="-10.5" x2="0" y2="3.5" stroke="#ffffff" strokeWidth="0.55" />
      </g>

      <g className="pk-shimmer" style={{ animationDelay: '-1.4s' }} transform="translate(97, 33) rotate(54)">
        <g transform="translate(4, 1.5) rotate(18) scale(0.65)">
          <polygon points="0,-11 -3.5,-2 -2,3.5 0,3.5" fill={`url(#${prismLight})`} />
          <polygon points="0,-11 3.5,-2 2,3.5 0,3.5" fill={`url(#${prismDark})`} />
        </g>
        <polygon points="0,-10.5 -3.6,-2 -2.2,3.5 0,3.5" fill={`url(#${prismLight})`} />
        <polygon points="0,-10.5 3.6,-2 2.2,3.5 0,3.5" fill={`url(#${prismDark})`} />
        <line x1="0" y1="-10.5" x2="0" y2="3.5" stroke="#ffffff" strokeWidth="0.55" />
      </g>

      <g className="pk-shimmer" style={{ animationDelay: '-0.4s' }} transform="translate(24, 88) rotate(-128)">
        <g transform="translate(-4.5, 2) rotate(-22) scale(0.72)">
          <polygon points="0,-11 -3.5,-2 -2,3.5 0,3.5" fill={`url(#${prismLight})`} />
          <polygon points="0,-11 3.5,-2 2,3.5 0,3.5" fill={`url(#${prismDark})`} />
        </g>
        <g transform="translate(4.5, 2) rotate(20) scale(0.62)">
          <polygon points="0,-10 -3.2,-2 -1.8,3.5 0,3.5" fill={`url(#${prismLight})`} />
          <polygon points="0,-10 3.2,-2 1.8,3.5 0,3.5" fill={`url(#${prismDark})`} />
        </g>
        <polygon points="0,-12 -4,-2 -2.4,4 0,4" fill={`url(#${prismLight})`} />
        <polygon points="0,-12 4,-2 2.4,4 0,4" fill={`url(#${prismDark})`} />
        <line x1="0" y1="-12" x2="0" y2="4" stroke="#ffffff" strokeWidth="0.6" />
      </g>

      {/* Pingentes de gelo (estalactites) na base */}
      <g className="pk-shimmer" style={{ animationDelay: '-1.9s' }} transform="translate(56, 105)">
        <polygon points="-8,0 -5.5,0 -6.8,7.5" fill={`url(#${prismLight})`} />
        <polygon points="-2,0 1.8,0 -0.1,11" fill={`url(#${prismLight})`} />
        <polygon points="-0.1,0 1.8,0 -0.1,11" fill={`url(#${prismDark})`} />
        <polygon points="4.5,0 7,0 5.7,6.5" fill={`url(#${prismLight})`} />
      </g>

      {/* 3. Flocos de neve dendríticos girando suavemente */}
      <Flake x={15} y={58} s={1.08} dur={18} delay={0} />
      <Flake x={106} y={58} s={0.95} dur={22} delay={6} stroke="#e0f2fe" />
      <Flake x={38} y={14} s={0.76} dur={20} delay={11} />

      {snow.map((p, i) => (
        <circle
          key={i}
          className="pk-snow"
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill={p.c}
          style={{ ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`, animationDuration: `${p.d}s`, animationDelay: `${-p.t}s` }}
        />
      ))}

      <Sparkle x={82} y={14} s={0.62} fill="#ffffff" delay={0.3} />
      <Sparkle x={11} y={76} s={0.55} fill="#bae6fd" delay={1.5} />
      <Sparkle x={107} y={78} s={0.55} fill="#ffffff" delay={2.3} />
    </svg>
  )
}

/* ══════════════ REDESENHOS DAS DECORAÇÕES QUE JÁ EXISTIAM (mesmos ids, acabamento do pacote) ══════════════ */

/* ───────────── Orelhas Holográficas: orelhas neko cyber + conchas de headset + equalizador 5 bandas + bigodes laser ───────────── */
function HoloCatEarsProImpl({ className = '', style }: DecorationProps) {
  const uid = useUid()
  const neon = `hc_neon_${uid}`
  const fill = `hc_fill_${uid}`
  const cup = `hc_cup_${uid}`
  const clipL = `hc_clipl_${uid}`
  const clipR = `hc_clipr_${uid}`

  const ear = 'M -13 0 C -14 -11 -10.5 -24 -4.2 -33 C -1.2 -37 2.2 -37 4.2 -33 C 9.8 -24 13 -11 13 0 Z'
  const innerEar = 'M -8 -2 C -9 -10 -6.2 -20 -2.2 -26.5 C 0.5 -29.5 2 -29.5 3.5 -26.5 C 6.6 -20 8.5 -10 7.5 -2 Z'

  const Ear = ({ x, rot, cls, clip, flip }: { x: number; rot: number; cls: string; clip: string; flip?: boolean }) => (
    <g transform={`translate(${x} 33) rotate(${rot}) ${flip ? 'scale(-1 1)' : ''}`}>
      <g className={`pk-ear ${cls}`}>
        {/* Aura externa neon */}
        <path d={ear} stroke="#22d3ee" strokeWidth="5" opacity="0.18" strokeLinejoin="round" />
        <path d={ear} fill={`url(#${fill})`} />
        <clipPath id={clip}>
          <path d={innerEar} />
        </clipPath>
        {/* Interior com malha holográfica, linhas de scan e equalizador de 5 bandas */}
        <g clipPath={`url(#${clip})`}>
          <rect x="-10" y="-32" width="20" height="32" fill="#083344" opacity="0.55" />
          {[-26, -22, -18, -14, -10, -6, -2].map((y) => (
            <line key={y} x1="-10" y1={y} x2="10" y2={y} stroke="#67e8f9" strokeWidth="0.55" opacity="0.5" />
          ))}
          {[-6, -3, 0, 3, 6].map((bx, i) => (
            <rect
              key={bx}
              className="pk-eq"
              style={{ animationDelay: `${-i * 0.19}s` }}
              x={bx - 0.95}
              y="-15"
              width="1.9"
              height="14"
              rx="0.95"
              fill={i % 2 === 0 ? '#f472b6' : '#22d3ee'}
            />
          ))}
        </g>
        {/* Moldura dupla de chassi cyber + circuitos */}
        <path d={innerEar} stroke="#67e8f9" strokeWidth="0.9" opacity="0.85" />
        <path d={ear} stroke={`url(#${neon})`} strokeWidth="2.4" strokeLinejoin="round" />
        <path d={ear} stroke="#ffffff" strokeWidth="0.65" strokeLinejoin="round" opacity="0.75" />
        {/* Brincos / Piercings de argola neon na borda da orelha */}
        <circle cx="-11.5" cy="-12" r="2.2" stroke="#fde047" strokeWidth="1" fill="none" />
        <circle cx="-12.2" cy="-7.5" r="1.8" stroke="#f472b6" strokeWidth="0.9" fill="none" />
        {/* Antena de ponta com pulso */}
        <circle cx="0" cy="-35.2" r="2.2" fill="#67e8f9" />
        <circle className="pk-shimmer" cx="0" cy="-35.2" r="4.8" fill="#67e8f9" opacity="0.32" />
      </g>
    </g>
  )

  return (
    <svg viewBox="0 0 120 120" className={`echo-deco-svg pk-deco pk-holocat ${className}`} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={neon} x1="0" y1="-35" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="0.5" stopColor="#f472b6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={fill} x1="0" y1="-35" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#06b6d4" stopOpacity="0.42" />
          <stop offset="1" stopColor="#db2777" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={cup} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="0.5" stopColor="#311042" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Halo HUD giratório externo */}
      <circle cx="60" cy="60" r="46.5" stroke={`url(#${neon})`} strokeWidth="4.5" opacity="0.14" />
      <g className="pk-spin-45r">
        <circle cx="60" cy="60" r="46.5" stroke={`url(#${neon})`} strokeWidth="1.4" strokeDasharray="14 6 2 6 4 6" strokeLinecap="round" opacity="0.9" />
      </g>
      <g className="pk-spin-30">
        <circle cx="60" cy="60" r="43.2" stroke="#67e8f9" strokeWidth="0.75" strokeDasharray="4 14" strokeLinecap="round" opacity="0.65" />
      </g>

      {/* Tiara / Headband dupla do headset */}
      <path d={`M ${polar(44, -52)[0]} ${polar(44, -52)[1]} A 44 44 0 0 1 ${polar(44, 52)[0]} ${polar(44, 52)[1]}`} stroke="#f472b6" strokeWidth="6" opacity="0.2" strokeLinecap="round" />
      <path d={`M ${polar(44, -52)[0]} ${polar(44, -52)[1]} A 44 44 0 0 1 ${polar(44, 52)[0]} ${polar(44, 52)[1]}`} stroke="#1e1b4b" strokeWidth="3.8" strokeLinecap="round" />
      <path d={`M ${polar(44, -52)[0]} ${polar(44, -52)[1]} A 44 44 0 0 1 ${polar(44, 52)[0]} ${polar(44, 52)[1]}`} stroke={`url(#${neon})`} strokeWidth="1.8" strokeLinecap="round" />

      {/* Conchas laterais do Headset Cyber (Ear-cups) + Bigodes de Laser */}
      {[
        { x: 14.5, rot: -8, dir: -1 },
        { x: 105.5, rot: 8, dir: 1 }
      ].map((c, idx) => (
        <g key={idx} transform={`translate(${c.x} 62) rotate(${c.rot})`}>
          <rect x="-4.5" y="-11" width="9" height="22" rx="4.5" fill={`url(#${cup})`} stroke={`url(#${neon})`} strokeWidth="1.4" />
          <ellipse cx="0" cy="0" rx="2.4" ry="6.5" stroke="#67e8f9" strokeWidth="0.9" fill="#22d3ee" fillOpacity="0.25" />
          <circle className="pk-shimmer" cx="0" cy="0" r="1.4" fill="#f9a8d4" />
          {/* Bigodes holográficos (whiskers) */}
          <g className="pk-shimmer" style={{ animationDelay: `${-idx * 0.8}s` }}>
            <line x1={c.dir * 4.5} y1="-4" x2={c.dir * 12} y2="-7" stroke="#67e8f9" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
            <line x1={c.dir * 4.5} y1="0" x2={c.dir * 13.5} y2="0" stroke="#f472b6" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
            <line x1={c.dir * 4.5} y1="4" x2={c.dir * 12} y2="7" stroke="#67e8f9" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
          </g>
        </g>
      ))}

      {/* Orelhas Neko com equalizador */}
      <Ear x={37} rot={-21} cls="pk-ear-l" clip={clipL} />
      <Ear x={83} rot={21} cls="pk-ear-r" clip={clipR} flip />

      {/* Pingente de campainha cyber (Neko Bell) na base */}
      <g className="pk-swing" transform="translate(60 105.5)">
        <path d="M -9 -1.5 Q 0 2.5 9 -1.5" stroke="#f472b6" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="0" cy="3" r="4.8" fill="#0f172a" stroke="#67e8f9" strokeWidth="1.4" />
        <path d="M -3 2.2 L 3 2.2" stroke="#f472b6" strokeWidth="0.9" />
        <circle cx="0" cy="4.6" r="1.1" fill="#fde047" />
      </g>

      <Sparkle x={60} y={7} s={0.72} fill="#67e8f9" delay={0.3} />
      <Sparkle x={12} y={42} s={0.58} fill="#f9a8d4" delay={1.2} />
      <Sparkle x={108} y={42} s={0.58} fill="#67e8f9" delay={0.8} />
      <Sparkle x={94} y={99} s={0.55} fill="#f9a8d4" delay={1.9} />
    </svg>
  )
}

/* ───────────── Sinfonia do Coração: pauta musical dourada, corações alados lapidados e notas que sobem ───────────── */
function HeartSymphonyProImpl({ className = '', style }: DecorationProps) {
  const uid = useUid()
  const heart = `hs_heart_${uid}`
  const wing = `hs_wing_${uid}`
  const ring = `hs_ring_${uid}`
  const gold = `hs_gold_${uid}`

  const heartPath = 'M 0 6.5 C -11.5 -1.8 -10.5 -11.5 -4.6 -11.5 C -2 -11.5 0 -9.4 0 -7.2 C 0 -9.4 2 -11.5 4.6 -11.5 C 10.5 -11.5 11.5 -1.8 0 6.5 Z'
  const note = 'M 0 0 L 0 -9.5 L 5.4 -8 L 5.4 -6 L 2 -6.8 L 2 0.5 C 2 2 0.8 3 -0.7 3 C -2.1 3 -3.2 2 -3.2 0.8 C -3.2 -0.5 -1.9 -1.4 -0.4 -1.4 C -0.1 -1.4 0.2 -1.3 0.4 -1.1 Z'

  const hearts = [
    { a: 0, r: 47, s: 1.08, winged: true },
    { a: 60, r: 46, s: 0.72, winged: false },
    { a: 120, r: 48, s: 0.9, winged: true },
    { a: 180, r: 46, s: 0.75, winged: false },
    { a: 240, r: 48, s: 0.92, winged: true },
    { a: 300, r: 46, s: 0.72, winged: false }
  ]

  return (
    <svg viewBox="0 0 120 120" className={`echo-deco-svg pk-deco pk-hearts ${className}`} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={heart} cx="0.35" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#fff1f2" />
          <stop offset="0.3" stopColor="#fb7185" />
          <stop offset="0.72" stopColor="#e11d48" />
          <stop offset="1" stopColor="#881337" />
        </radialGradient>
        <linearGradient id={wing} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#fce7f3" />
          <stop offset="1" stopColor="#f9a8d4" />
        </linearGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fda4af" />
          <stop offset="0.5" stopColor="#f472b6" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#fffbeb" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Pauta musical tripla (pentagrama circular) + fitas em contra-rotação */}
      <circle cx="60" cy="60" r="45.5" stroke={`url(#${ring})`} strokeWidth="5.5" opacity="0.16" />
      <circle cx="60" cy="60" r="43.5" stroke={`url(#${gold})`} strokeWidth="0.75" opacity="0.55" />
      <circle cx="60" cy="60" r="45.5" stroke={`url(#${ring})`} strokeWidth="1.2" strokeDasharray="2 5" strokeLinecap="round" opacity="0.88" />
      <g className="pk-spin-45r">
        <circle cx="60" cy="60" r="47.5" stroke={`url(#${gold})`} strokeWidth="0.9" strokeDasharray="18 10 3 10" strokeLinecap="round" opacity="0.75" />
      </g>

      {/* Corações de rubi lapidados em órbita (os principais têm asinhas de querubim) */}
      <g className="pk-spin-40">
        {hearts.map((h) => {
          const [x, y] = polar(h.r, h.a)
          return (
            <g key={h.a} transform={`translate(${x} ${y}) scale(${h.s})`}>
              <g className="pk-upright" style={{ animationDuration: '40s' }}>
                <g className="pk-beat" style={{ animationDelay: `${-h.a / 90}s` }}>
                  <circle r="10" fill="#fb7185" opacity="0.22" />
                  {h.winged && (
                    <g opacity="0.95">
                      <path d="M -5 -4 C -11 -9 -16 -7 -14 -2 C -12 -1 -9 0 -5 -1 Z" fill={`url(#${wing})`} stroke="#f472b6" strokeWidth="0.5" />
                      <path d="M 5 -4 C 11 -9 16 -7 14 -2 C 12 -1 9 0 5 -1 Z" fill={`url(#${wing})`} stroke="#f472b6" strokeWidth="0.5" />
                    </g>
                  )}
                  <path d={heartPath} fill={`url(#${heart})`} stroke="#ffe4e6" strokeWidth="0.7" strokeLinejoin="round" />
                  {/* Facetas de cristal internas */}
                  <polygon points="0,-5 -4,-2 0,3.5 4,-2" fill="#ffffff" opacity="0.18" />
                  <path d="M -6.2 -7.4 C -4.8 -9.6 -2.4 -9.8 -1.6 -8.4" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
                </g>
              </g>
            </g>
          )
        })}
      </g>

      {/* Notas musicais subindo ao redor do card */}
      {[
        { x: 16, y: 42, c: '#fda4af', d: 4.0, t: 0, s: 1 },
        { x: 103, y: 48, c: '#fde68a', d: 4.5, t: 1.1, s: 0.95 },
        { x: 22, y: 88, c: '#f9a8d4', d: 4.2, t: 2.2, s: 0.9 },
        { x: 98, y: 86, c: '#fecdd3', d: 4.7, t: 3.1, s: 1 },
        { x: 60, y: 16, c: '#fde68a', d: 3.8, t: 1.7, s: 0.85 }
      ].map((n, i) => (
        <g key={i} transform={`translate(${n.x} ${n.y}) scale(${n.s})`}>
          <path className="pk-note" d={note} fill={n.c} style={{ animationDuration: `${n.d}s`, animationDelay: `${-n.t}s` }} />
        </g>
      ))}

      <Sparkle x={60} y={5} s={0.68} fill="#ffffff" delay={0.4} />
      <Sparkle x={14} y={62} s={0.55} fill="#fde68a" delay={1.1} />
      <Sparkle x={108} y={66} s={0.55} fill="#fecdd3" delay={1.8} />
    </svg>
  )
}

/* ───────────── Auréola Sagrada: auréola serafim com asas celestiais, estrela polaris, raios divinos e penas ───────────── */
function SacredHaloProImpl({ className = '', style }: DecorationProps) {
  const uid = useUid()
  const gold = `sh_gold_${uid}`
  const ray = `sh_ray_${uid}`
  const feather = `sh_feather_${uid}`
  const wing = `sh_wing_${uid}`

  const featherPath = 'M 0 0 C -2.2 -4 -2.2 -8.5 0 -13 C 2.2 -8.5 2.2 -4 0 0 Z M 0 0 L 0 -13'

  const SeraphWing = ({ flip }: { flip?: boolean }) => (
    <g transform={`translate(${flip ? 104.5 : 15.5} 58) ${flip ? 'scale(-1 1)' : ''}`}>
      <g className="pk-wing-l">
        <path d="M 2 -18 C -9 -25 -13 -14 -7 -6 C -12 -7 -14 2 -6 7 C -10 8 -10 16 -2 18 C 2 14 4 4 2 -18 Z" fill={`url(#${wing})`} stroke={`url(#${gold})`} strokeWidth="0.9" />
        <path d="M 1 -10 C -5 -13 -7 -8 -3 -3 M 0 -1 C -5 -2 -6 3 -2 6 M 0 7 C -4 7 -4 12 -1 14" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" opacity="0.65" />
      </g>
    </g>
  )

  return (
    <svg viewBox="0 0 120 120" className={`echo-deco-svg pk-deco pk-halo ${className}`} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d97706" />
          <stop offset="0.5" stopColor="#fef08a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={ray} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.65" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={feather} x1="0" y1="0" x2="0" y2="-13" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id={wing} x1="0" y1="-20" x2="0" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.65" stopColor="#fef3c7" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Aro sagrado gravado em ouro */}
      <circle cx="60" cy="60" r="45.5" stroke="#fde68a" strokeWidth="5.5" opacity="0.14" />
      <g className="pk-spin-60">
        <circle cx="60" cy="60" r="45.5" stroke={`url(#${gold})`} strokeWidth="1.4" strokeDasharray="14 5 2 5" strokeLinecap="round" opacity="0.9" />
      </g>
      <g className="pk-spin-45r">
        <circle cx="60" cy="60" r="43.2" stroke="#fef08a" strokeWidth="0.75" strokeDasharray="3 9" strokeLinecap="round" opacity="0.7" />
      </g>

      {/* Asas de Serafim guardiãs nas laterais */}
      <SeraphWing />
      <SeraphWing flip />

      {/* Raios divinos (God-rays) pulsando da coroa */}
      <g className="pk-breathe">
        {[-44, -30, -16, 0, 16, 30, 44].map((a, idx) => (
          <path key={a} transform={`translate(60 15) rotate(${a})`} d={`M -2.4 0 L 0 ${idx % 2 === 0 ? -26 : -19} L 2.4 0 Z`} fill={`url(#${ray})`} />
        ))}
      </g>

      {/* Auréola elíptica dupla 3D + Estrela Polaris central */}
      <g className="pk-halo-float">
        <ellipse cx="60" cy="15.5" rx="26" ry="7.2" stroke="#fde68a" strokeWidth="6.5" opacity="0.24" />
        <ellipse cx="60" cy="15.5" rx="25" ry="6.5" stroke={`url(#${gold})`} strokeWidth="2.8" />
        <ellipse cx="60" cy="15.5" rx="21.5" ry="4.8" stroke="#ffffff" strokeWidth="1" opacity="0.92" />
        {/* Losangos solares cravados na auréola */}
        {[-18, -9, 9, 18].map((dx) => (
          <polygon key={dx} points={`${60 + dx},13.5 ${60 + dx + 1.4},15.5 ${60 + dx},17.5 ${60 + dx - 1.4},15.5`} fill="#ffffff" />
        ))}
        {/* Estrela Polaris de 8 pontas no ápice */}
        <g transform="translate(60 9)">
          <polygon points="0,-6.5 1.4,-1.4 6.5,0 1.4,1.4 0,6.5 -1.4,1.4 -6.5,0 -1.4,-1.4" fill="#ffffff" />
          <polygon points="-3.8,-3.8 -0.8,-1.5 3.8,-3.8 1.5,-0.8 3.8,3.8 0.8,1.5 -3.8,3.8 -1.5,0.8" fill="#fde68a" />
          <circle r="1.6" fill="#ffffff" />
        </g>
        <path d="M 37 17.5 Q 60 24.5 83 17.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.88" />
      </g>

      {/* Penas angelicais flutuando */}
      {[
        { x: 22, y: 28, dx: 6, dy: 42, r: 38, d: 6.2, t: 0 },
        { x: 98, y: 26, dx: -6, dy: 44, r: -42, d: 6.8, t: 1.8 },
        { x: 14, y: 74, dx: 5, dy: 32, r: 28, d: 5.8, t: 3.4 },
        { x: 105, y: 72, dx: -5, dy: 34, r: -32, d: 6.4, t: 4.7 }
      ].map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y})`}>
          <path
            className="pk-petal"
            d={featherPath}
            fill={`url(#${feather})`}
            stroke="#f59e0b"
            strokeWidth="0.45"
            transform="scale(0.92)"
            style={{ ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px`, ['--rot' as string]: `${f.r}deg`, animationDuration: `${f.d}s`, animationDelay: `${-f.t}s` }}
          />
        </g>
      ))}
      <Sparkle x={88} y={8} s={0.82} fill="#fff7c2" delay={0.5} />
      <Sparkle x={32} y={7} s={0.65} fill="#ffffff" delay={1.3} />
      <Sparkle x={108} y={88} s={0.58} fill="#fde68a" delay={2.0} />
      <Sparkle x={12} y={92} s={0.58} fill="#fff7c2" delay={0.9} />
    </svg>
  )
}

/* ───────────── Vórtice Quântico: singularidade Gargantua, jatos relativísticos, cometas e antimatéria ───────────── */
function QuantumVortexProImpl({ className = '', style }: DecorationProps) {
  const uid = useUid()
  const g1 = `qv_g1_${uid}`
  const g2 = `qv_g2_${uid}`
  const g3 = `qv_g3_${uid}`
  const horizon = `qv_hor_${uid}`
  const jet = `qv_jet_${uid}`

  const rings = [
    { g: g1, tilt: -24, rx: 54, ry: 17.5, cls: 'pk-spin-16', head: '#e9d5ff' },
    { g: g2, tilt: 36, rx: 52.5, ry: 15.5, cls: 'pk-spin-18r', head: '#67e8f9' },
    { g: g3, tilt: 96, rx: 51, ry: 14, cls: 'pk-spin-24', head: '#f9a8d4' }
  ]
  const infall = Array.from({ length: 12 }, (_, i) => {
    const a = i * 30 + 10
    const [x, y] = polar(55, a)
    const [tx, ty] = [-(Math.sin(rad(a)) * 10.5), Math.cos(rad(a)) * 10.5]
    return { x, y, tx, ty, d: 2.4 + (i % 4) * 0.38, t: (i * 0.33) % 2.4 }
  })

  return (
    <svg viewBox="0 0 120 120" className={`echo-deco-svg pk-deco pk-vortex ${className}`} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g1} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7c3aed" stopOpacity="0.05" />
          <stop offset="0.5" stopColor="#c084fc" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={g2} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id={g3} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f472b6" stopOpacity="0.05" />
          <stop offset="0.5" stopColor="#ec4899" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={horizon} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="0.5" stopColor="#c084fc" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
        <radialGradient id={jet} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#67e8f9" stopOpacity="0.85" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Horizonte de Eventos + Lente Gravitacional (Gargantua) */}
      <circle cx="60" cy="60" r="42.5" stroke="#a855f7" strokeWidth="6" opacity="0.22" />
      <circle className="pk-breathe" cx="60" cy="60" r="41.8" stroke={`url(#${horizon})`} strokeWidth="1.6" />
      <g className="pk-spin-30">
        <circle cx="60" cy="60" r="44.2" stroke="#67e8f9" strokeWidth="0.9" strokeDasharray="8 6 2 6" strokeLinecap="round" opacity="0.75" />
      </g>

      {/* Três discos de acreção 3D inclinados + cometas relativísticos */}
      {rings.map((r, i) => (
        <g key={i} className={r.cls}>
          <g transform={`rotate(${r.tilt} 60 60)`}>
            <ellipse cx="60" cy="60" rx={r.rx} ry={r.ry} stroke={`url(#${r.g})`} strokeWidth="5.5" opacity="0.22" />
            <ellipse cx="60" cy="60" rx={r.rx} ry={r.ry} stroke={`url(#${r.g})`} strokeWidth="1.6" opacity="0.88" />
            <ellipse
              className="pk-comet"
              style={{ ['--len' as string]: '346', animationDuration: `${2.9 + i * 0.8}s`, animationDelay: `${-i * 0.8}s` }}
              cx="60"
              cy="60"
              rx={r.rx}
              ry={r.ry}
              stroke={r.head}
              strokeWidth="2.8"
              strokeDasharray="20 326"
              strokeLinecap="round"
            />
          </g>
        </g>
      ))}

      {/* Quasares / Jatos Relativísticos Polares (topo e base) */}
      {[12, 108].map((py, idx) => (
        <g key={py} className="pk-shimmer" style={{ animationDelay: `${-idx * 1.1}s` }} transform={`translate(60 ${py})`}>
          <circle r="7.5" fill={`url(#${jet})`} />
          <polygon points="0,-6 1.3,-1.3 6,0 1.3,1.3 0,6 -1.3,1.3 -6,0 -1.3,-1.3" fill="#ffffff" opacity="0.9" />
        </g>
      ))}

      {/* Partículas de antimatéria espiralando para o horizonte de eventos */}
      {infall.map((p, i) => (
        <circle
          key={i}
          className="pk-suck"
          cx={p.x}
          cy={p.y}
          r={i % 2 === 0 ? 1.45 : 1.15}
          fill={i % 3 === 0 ? '#e9d5ff' : i % 3 === 1 ? '#67e8f9' : '#f9a8d4'}
          style={{ ['--dx' as string]: `${p.tx}px`, ['--dy' as string]: `${p.ty}px`, animationDuration: `${p.d}s`, animationDelay: `${-p.t}s` }}
        />
      ))}
    </svg>
  )
}

// Memoizadas: sem isso toda renderização do pai (relógios de 1 s nas listas de membros) refazia o desenho inteiro
export const BunnyMoonDecoration = memo(BunnyMoonDecorationImpl)
export const SakuraBloomDecoration = memo(SakuraBloomDecorationImpl)
export const ArcaneCircleDecoration = memo(ArcaneCircleDecorationImpl)
export const CrystalWingsDecoration = memo(CrystalWingsDecorationImpl)
export const PumpkinNightDecoration = memo(PumpkinNightDecorationImpl)
export const FrostCrystalDecoration = memo(FrostCrystalDecorationImpl)
export const HoloCatEarsPro = memo(HoloCatEarsProImpl)
export const HeartSymphonyPro = memo(HeartSymphonyProImpl)
export const SacredHaloPro = memo(SacredHaloProImpl)
export const QuantumVortexPro = memo(QuantumVortexProImpl)
