export interface Sticker {
  id: string
  name: string
  url: string
}

export interface StickerPack {
  id: string
  name: string
  icon: string
  stickers: Sticker[]
}

function svgUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`
}

// ─── PACK 1: ECHO VIBES ──────────────────────────────────────
const echoVibesStickers: Sticker[] = [
  {
    id: 'ev-gg',
    name: 'GG',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <defs>
          <linearGradient id="ggGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
          <filter id="ggGlow"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#f59e0b" flood-opacity="0.6"/></filter>
        </defs>
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#0f172a" stroke="#f59e0b" stroke-width="2.5" filter="url(#ggGlow)"/>
        <g style="transform-origin: center; animation: pulse 1.8s infinite ease-in-out;">
          <style>@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }</style>
          <path d="M42 34 L64 20 L86 34 L78 52 L50 52 Z" fill="url(#ggGrad)"/>
          <circle cx="42" cy="34" r="3" fill="#fff"/>
          <circle cx="64" cy="20" r="3.5" fill="#fff"/>
          <circle cx="86" cy="34" r="3" fill="#fff"/>
          <text x="64" y="90" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="36" fill="url(#ggGrad)" letter-spacing="1">GG</text>
        </g>
      </svg>
    `)
  },
  {
    id: 'ev-kek',
    name: 'Kek',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <defs>
          <linearGradient id="kekBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
        </defs>
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#064e3b" stroke="#10b981" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: kekLaugh 0.8s infinite alternate ease-in-out;">
          <style>@keyframes kekLaugh { 0% { transform: rotate(-3deg) scale(0.98); } 100% { transform: rotate(3deg) scale(1.04); } }</style>
          <circle cx="64" cy="62" r="38" fill="url(#kekBg)"/>
          <!-- Closed laughing eyes -->
          <path d="M45 52 Q53 44 61 52" stroke="#064e3b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
          <path d="M67 52 Q75 44 83 52" stroke="#064e3b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
          <!-- Laughing wide mouth -->
          <path d="M44 68 Q64 96 84 68 Z" fill="#881337"/>
          <path d="M50 68 Q64 78 78 68" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/>
          <!-- Tears of joy -->
          <path d="M38 52 Q32 60 38 66 Q44 60 38 52 Z" fill="#38bdf8"/>
          <path d="M90 52 Q96 60 90 66 Q84 60 90 52 Z" fill="#38bdf8"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#34d399">KEKW</text>
      </svg>
    `)
  },
  {
    id: 'ev-hug',
    name: 'Abraço',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#311042" stroke="#ec4899" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: hugSway 2s infinite ease-in-out;">
          <style>@keyframes hugSway { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }</style>
          <!-- Hearts -->
          <path d="M64 36 C64 24 46 22 46 36 C46 48 64 58 64 58 C64 58 82 48 82 36 C82 22 64 24 64 36 Z" fill="#f43f5e"/>
          <!-- Cute Cat/Bear Hugging -->
          <circle cx="50" cy="72" r="22" fill="#fb7185"/>
          <circle cx="78" cy="72" r="22" fill="#f472b6"/>
          <circle cx="44" cy="70" r="2.5" fill="#1e1b4b"/>
          <circle cx="56" cy="70" r="2.5" fill="#1e1b4b"/>
          <circle cx="72" cy="70" r="2.5" fill="#1e1b4b"/>
          <circle cx="84" cy="70" r="2.5" fill="#1e1b4b"/>
          <!-- Hug arms -->
          <path d="M54 78 Q64 88 74 78" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="13" fill="#fbcfe8">ABRAÇO</text>
      </svg>
    `)
  },
  {
    id: 'ev-sad',
    name: 'Sad',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#0f172a" stroke="#60a5fa" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: sadBob 2s infinite ease-in-out;">
          <style>@keyframes sadBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }</style>
          <circle cx="64" cy="58" r="34" fill="#3b82f6"/>
          <circle cx="52" cy="54" r="5" fill="#1e293b"/>
          <circle cx="76" cy="54" r="5" fill="#1e293b"/>
          <!-- Sad mouth -->
          <path d="M48 76 Q64 62 80 76" stroke="#1e293b" stroke-width="4" stroke-linecap="round" fill="none"/>
          <!-- Big Tear -->
          <path d="M76 60 Q82 72 76 78 Q70 72 76 60 Z" fill="#93c5fd"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="13" fill="#bfdbfe">SAD</text>
      </svg>
    `)
  },
  {
    id: 'ev-fire',
    name: 'On Fire',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <defs>
          <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="60%" stop-color="#f97316"/>
            <stop offset="100%" stop-color="#fde047"/>
          </linearGradient>
        </defs>
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#180c05" stroke="#ea580c" stroke-width="2.5"/>
        <g style="transform-origin: 64px 80px; animation: fireFlicker 1.2s infinite alternate ease-in-out;">
          <style>@keyframes fireFlicker { 0% { transform: scale(0.96) rotate(-2deg); } 100% { transform: scale(1.06) rotate(2deg); } }</style>
          <path d="M64 16 Q78 38 68 54 Q86 42 84 68 Q82 92 64 94 Q46 92 44 68 Q42 46 58 40 Q50 30 64 16 Z" fill="url(#fireGrad)"/>
          <path d="M64 48 Q72 60 66 70 Q76 66 74 78 Q72 88 64 90 Q56 88 54 78 Q52 68 62 62 Z" fill="#fef08a"/>
        </g>
        <text x="64" y="114" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#fdba74">ON FIRE</text>
      </svg>
    `)
  },
  {
    id: 'ev-ez',
    name: 'EZ',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#0f172a" stroke="#00f2fe" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 2s infinite ease-in-out;">
          <circle cx="64" cy="56" r="34" fill="#fbbf24"/>
          <!-- Cool black sunglasses -->
          <path d="M38 48 L90 48 L86 64 Q76 68 66 64 L64 56 L62 64 Q52 68 42 64 Z" fill="#0f172a"/>
          <line x1="42" y1="52" x2="56" y2="60" stroke="#38bdf8" stroke-width="2"/>
          <line x1="72" y1="52" x2="86" y2="60" stroke="#38bdf8" stroke-width="2"/>
          <!-- Smirk -->
          <path d="M52 74 Q68 84 76 72" stroke="#78350f" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#00f2fe">EZ CLAP</text>
      </svg>
    `)
  },
  {
    id: 'ev-shock',
    name: 'Chocado',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#1e1b4b" stroke="#a855f7" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1s infinite ease-in-out;">
          <circle cx="64" cy="56" r="34" fill="#facc15"/>
          <!-- Big wide shock eyes -->
          <circle cx="48" cy="48" r="10" fill="#fff"/>
          <circle cx="48" cy="48" r="4" fill="#0f172a"/>
          <circle cx="80" cy="48" r="10" fill="#fff"/>
          <circle cx="80" cy="48" r="4" fill="#0f172a"/>
          <!-- Open O mouth -->
          <ellipse cx="64" cy="74" rx="10" ry="14" fill="#1e1b4b"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#e9d5ff">CHOCADO</text>
      </svg>
    `)
  },
  {
    id: 'ev-love',
    name: 'Amor',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <defs>
          <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff1493"/>
            <stop offset="100%" stop-color="#ff4500"/>
          </linearGradient>
        </defs>
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#2d0a1e" stroke="#f43f5e" stroke-width="2.5"/>
        <g style="transform-origin: 64px 58px; animation: heartBeat 1.2s infinite ease-in-out;">
          <style>@keyframes heartBeat { 0%, 100% { transform: scale(1); } 20% { transform: scale(1.18); } 40% { transform: scale(1.05); } 60% { transform: scale(1.15); } }</style>
          <path d="M64 36 C64 16 34 16 34 38 C34 60 64 80 64 80 C64 80 94 60 94 38 C94 16 64 16 64 36 Z" fill="url(#heartGrad)"/>
          <circle cx="50" cy="34" r="4" fill="#fff" opacity="0.6"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#f43f5e">AMOR</text>
      </svg>
    `)
  },
  {
    id: 'ev-ok',
    name: 'OK',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#042f2e" stroke="#14b8a6" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 2s infinite ease-in-out;">
          <circle cx="64" cy="54" r="32" fill="#14b8a6"/>
          <!-- Big checkmark -->
          <path d="M48 54 L58 66 L82 42" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#2dd4bf">OK!</text>
      </svg>
    `)
  },
  {
    id: 'ev-nope',
    name: 'Nope',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#450a0a" stroke="#ef4444" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: nopeShake 1.5s infinite ease-in-out;">
          <style>@keyframes nopeShake { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-8deg); } 75% { transform: rotate(8deg); } }</style>
          <circle cx="64" cy="54" r="32" fill="#ef4444"/>
          <!-- Big X -->
          <line x1="46" y1="36" x2="82" y2="72" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
          <line x1="82" y1="36" x2="46" y2="72" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="15" fill="#fca5a5">NOPE</text>
      </svg>
    `)
  },
  {
    id: 'ev-clap',
    name: 'Palmas',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#1e1b4b" stroke="#818cf8" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 0.8s infinite alternate ease-in-out;">
          <text x="64" y="66" text-anchor="middle" font-size="44">👏</text>
          <circle cx="34" cy="36" r="3" fill="#facc15"/>
          <circle cx="94" cy="36" r="3" fill="#f43f5e"/>
          <circle cx="64" cy="22" r="3.5" fill="#38bdf8"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#a5b4fc">PALMAS</text>
      </svg>
    `)
  },
  {
    id: 'ev-think',
    name: 'Pensando',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#0f172a" stroke="#eab308" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 2s infinite ease-in-out;">
          <circle cx="64" cy="54" r="32" fill="#facc15"/>
          <circle cx="50" cy="44" r="4.5" fill="#0f172a"/>
          <circle cx="78" cy="44" r="4.5" fill="#0f172a"/>
          <!-- Perplexed mouth -->
          <line x1="50" y1="68" x2="78" y2="64" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
          <!-- Hand thinking -->
          <path d="M42 78 Q50 72 64 74" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
          <!-- Thinking dots -->
          <circle cx="94" cy="34" r="4" fill="#38bdf8"/>
          <circle cx="86" cy="24" r="3" fill="#38bdf8"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#fde047">HM...</text>
      </svg>
    `)
  }
]

// ─── PACK 2: GAMING ──────────────────────────────────────────
const gamingStickers: Sticker[] = [
  {
    id: 'gm-win',
    name: 'Winner',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#1c1917" stroke="#eab308" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1.8s infinite ease-in-out;">
          <path d="M40 32 L88 32 L82 62 Q76 74 64 74 Q52 74 46 62 Z" fill="#eab308"/>
          <path d="M40 38 Q26 42 34 54 Q40 60 44 58" stroke="#eab308" stroke-width="3.5" fill="none"/>
          <path d="M88 38 Q102 42 94 54 Q88 60 84 58" stroke="#eab308" stroke-width="3.5" fill="none"/>
          <rect x="58" y="74" width="12" height="12" fill="#ca8a04"/>
          <rect x="50" y="86" width="28" height="6" rx="3" fill="#ca8a04"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#fef08a">VICTORY</text>
      </svg>
    `)
  },
  {
    id: 'gm-rip',
    name: 'RIP',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#09090b" stroke="#71717a" stroke-width="2.5"/>
        <g>
          <path d="M40 88 L40 44 Q40 24 64 24 Q88 24 88 44 L88 88 Z" fill="#3f3f46" stroke="#71717a" stroke-width="2"/>
          <text x="64" y="58" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="20" fill="#e4e4e7">RIP</text>
          <!-- Small flowers / cross -->
          <line x1="64" y1="66" x2="64" y2="78" stroke="#a1a1aa" stroke-width="2"/>
          <line x1="58" y1="70" x2="70" y2="70" stroke="#a1a1aa" stroke-width="2"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="12" fill="#a1a1aa">F NO CHAT</text>
      </svg>
    `)
  },
  {
    id: 'gm-rage',
    name: 'Rage',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#3b0764" stroke="#dc2626" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: nopeShake 0.6s infinite ease-in-out;">
          <circle cx="64" cy="54" r="32" fill="#ef4444"/>
          <!-- Angry slanted eyebrows -->
          <line x1="42" y1="38" x2="58" y2="46" stroke="#450a0a" stroke-width="4.5" stroke-linecap="round"/>
          <line x1="86" y1="38" x2="70" y2="46" stroke="#450a0a" stroke-width="4.5" stroke-linecap="round"/>
          <circle cx="50" cy="52" r="4" fill="#450a0a"/>
          <circle cx="78" cy="52" r="4" fill="#450a0a"/>
          <!-- Clenched teeth -->
          <rect x="48" y="66" width="32" height="10" rx="3" fill="#fff" stroke="#450a0a" stroke-width="2"/>
          <line x1="58" y1="66" x2="58" y2="76" stroke="#450a0a" stroke-width="1.5"/>
          <line x1="68" y1="66" x2="68" y2="76" stroke="#450a0a" stroke-width="1.5"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#f87171">RAGE QUIT</text>
      </svg>
    `)
  },
  {
    id: 'gm-clutch',
    name: 'Clutch',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <defs>
          <linearGradient id="clutchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00f2fe"/>
            <stop offset="100%" stop-color="#4facfe"/>
          </linearGradient>
        </defs>
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#082f49" stroke="#00f2fe" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1.5s infinite ease-in-out;">
          <polygon points="64,18 78,48 108,52 86,74 92,104 64,88 36,104 42,74 20,52 50,48" fill="url(#clutchGrad)"/>
          <text x="64" y="68" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#0f172a">1v5</text>
        </g>
        <text x="64" y="114" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#38bdf8">CLUTCH!</text>
      </svg>
    `)
  },
  {
    id: 'gm-noob',
    name: 'Noob',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#14532d" stroke="#84cc16" stroke-width="2.5"/>
        <!-- Classic Noob colors (Yellow Head, Blue torso) -->
        <circle cx="64" cy="46" r="24" fill="#fde047"/>
        <circle cx="56" cy="42" r="3.5" fill="#1e293b"/>
        <circle cx="72" cy="42" r="3.5" fill="#1e293b"/>
        <path d="M58 56 Q64 62 70 56" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M40 70 L88 70 L82 92 L46 92 Z" fill="#0284c7"/>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#a3e635">NOOB</text>
      </svg>
    `)
  },
  {
    id: 'gm-hack',
    name: 'Hackeando',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#022c22" stroke="#10b981" stroke-width="2.5"/>
        <!-- Matrix skull / Terminal -->
        <g style="font-family: monospace; font-size: 10px; fill: #34d399;">
          <text x="24" y="34">01001000</text>
          <text x="24" y="46">01000001</text>
          <text x="24" y="58">01000011</text>
          <text x="24" y="70">01001011</text>
        </g>
        <circle cx="64" cy="56" r="26" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="2"/>
        <text x="64" y="64" text-anchor="middle" font-size="24">💻</text>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="12" fill="#6ee7b7">HACKING...</text>
      </svg>
    `)
  },
  {
    id: 'gm-pog',
    name: 'POG',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#18181b" stroke="#f97316" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1.2s infinite ease-in-out;">
          <circle cx="64" cy="54" r="32" fill="#ea580c"/>
          <circle cx="52" cy="44" r="6" fill="#fff"/>
          <circle cx="54" cy="44" r="2.5" fill="#000"/>
          <circle cx="76" cy="44" r="6" fill="#fff"/>
          <circle cx="78" cy="44" r="2.5" fill="#000"/>
          <ellipse cx="64" cy="68" rx="8" ry="12" fill="#431407"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#fb923c">POGGERS</text>
      </svg>
    `)
  },
  {
    id: 'gm-ggwp',
    name: 'GG WP',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#1e1b4b" stroke="#6366f1" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 2s infinite ease-in-out;">
          <rect x="24" y="32" width="80" height="48" rx="10" fill="#312e81" stroke="#818cf8" stroke-width="2"/>
          <text x="64" y="64" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="22" fill="#a5b4fc">GG WP</text>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="12" fill="#c7d2fe">BOM JOGO</text>
      </svg>
    `)
  },
  {
    id: 'gm-lul',
    name: 'LUL',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#022c22" stroke="#22c55e" stroke-width="2.5"/>
        <circle cx="64" cy="52" r="30" fill="#22c55e"/>
        <path d="M44 44 Q54 36 64 44" stroke="#052e16" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M64 44 Q74 36 84 44" stroke="#052e16" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M46 58 Q64 86 82 58 Z" fill="#fff"/>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#86efac">LUL</text>
      </svg>
    `)
  },
  {
    id: 'gm-aim',
    name: 'Mira',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#18181b" stroke="#ef4444" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1.5s infinite ease-in-out;">
          <circle cx="64" cy="54" r="28" fill="none" stroke="#ef4444" stroke-width="2.5"/>
          <circle cx="64" cy="54" r="14" fill="none" stroke="#ef4444" stroke-width="1.5"/>
          <circle cx="64" cy="54" r="3" fill="#ef4444"/>
          <line x1="64" y1="20" x2="64" y2="34" stroke="#ef4444" stroke-width="2.5"/>
          <line x1="64" y1="74" x2="64" y2="88" stroke="#ef4444" stroke-width="2.5"/>
          <line x1="30" y1="54" x2="44" y2="54" stroke="#ef4444" stroke-width="2.5"/>
          <line x1="84" y1="54" x2="98" y2="54" stroke="#ef4444" stroke-width="2.5"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#fca5a5">HEADSHOT</text>
      </svg>
    `)
  },
  {
    id: 'gm-goat',
    name: 'GOAT',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#1e1b4b" stroke="#eab308" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 2s infinite ease-in-out;">
          <text x="64" y="66" text-anchor="middle" font-size="44">🐐</text>
          <path d="M48 24 L64 12 L80 24 L74 34 L54 34 Z" fill="#eab308"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#fef08a">G.O.A.T</text>
      </svg>
    `)
  },
  {
    id: 'gm-speed',
    name: 'Speed',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#0f172a" stroke="#00f2fe" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1s infinite ease-in-out;">
          <!-- Speedometer arc -->
          <path d="M34 68 A 34 34 0 1 1 94 68" stroke="#334155" stroke-width="8" stroke-linecap="round" fill="none"/>
          <path d="M34 68 A 34 34 0 0 1 84 38" stroke="#00f2fe" stroke-width="8" stroke-linecap="round" fill="none"/>
          <!-- Needle at MAX -->
          <line x1="64" y1="58" x2="88" y2="40" stroke="#f43f5e" stroke-width="4" stroke-linecap="round"/>
          <circle cx="64" cy="58" r="6" fill="#fff"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#38bdf8">TURBO</text>
      </svg>
    `)
  }
]

// ─── PACK 3: MEMES BR ────────────────────────────────────────
const memesBrStickers: Sticker[] = [
  {
    id: 'br-ata',
    name: 'Ata',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#1e1b4b" stroke="#ec4899" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 2s infinite ease-in-out;">
          <rect x="30" y="28" width="68" height="46" rx="8" fill="#3b0764" stroke="#d8b4fe" stroke-width="2"/>
          <text x="64" y="58" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="20" fill="#f472b6">ATA</text>
          <rect x="52" y="74" width="24" height="6" fill="#a855f7"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="12" fill="#fbcfe8">ATA. CLARO.</text>
      </svg>
    `)
  },
  {
    id: 'br-pq',
    name: 'Por quê?',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#172554" stroke="#3b82f6" stroke-width="2.5"/>
        <!-- Nazaré calculating math formulas -->
        <circle cx="64" cy="52" r="28" fill="#facc15"/>
        <circle cx="54" cy="46" r="3" fill="#1e293b"/>
        <circle cx="74" cy="46" r="3" fill="#1e293b"/>
        <line x1="56" y1="62" x2="72" y2="62" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round"/>
        <g style="font-family: monospace; font-size: 11px; fill: #60a5fa; font-weight: bold;">
          <text x="18" y="32">a²+b²</text>
          <text x="82" y="32">√x÷y</text>
          <text x="20" y="78">∫f(x)</text>
          <text x="84" y="78">cos(θ)</text>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#93c5fd">POR QUÊ?</text>
      </svg>
    `)
  },
  {
    id: 'br-isso',
    name: 'É isso',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#1c1917" stroke="#fbbf24" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 2s infinite ease-in-out;">
          <text x="64" y="64" text-anchor="middle" font-size="40">☕</text>
        </g>
        <text x="64" y="94" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#fbbf24">É SOBRE ISSO</text>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="10" fill="#a8a29e">E TÁ TUDO BEM</text>
      </svg>
    `)
  },
  {
    id: 'br-calma',
    name: 'Calma',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#042f2e" stroke="#14b8a6" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1.6s infinite ease-in-out;">
          <circle cx="64" cy="52" r="30" fill="#0d9488"/>
          <text x="64" y="58" text-anchor="middle" font-size="28">✋</text>
        </g>
        <text x="64" y="96" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#2dd4bf">CALMA</text>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="10" fill="#99f6e4">CALABRESO</text>
      </svg>
    `)
  },
  {
    id: 'br-eita',
    name: 'Eita',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#2e1065" stroke="#c084fc" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1s infinite ease-in-out;">
          <circle cx="64" cy="52" r="30" fill="#a855f7"/>
          <circle cx="52" cy="46" r="7" fill="#fff"/>
          <circle cx="52" cy="46" r="3" fill="#000"/>
          <circle cx="76" cy="46" r="7" fill="#fff"/>
          <circle cx="76" cy="46" r="3" fill="#000"/>
          <path d="M54 66 Q64 74 74 66" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#e9d5ff">EITA!</text>
      </svg>
    `)
  },
  {
    id: 'br-valeu',
    name: 'Valeu',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#064e3b" stroke="#10b981" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1.5s infinite ease-in-out;">
          <text x="64" y="66" text-anchor="middle" font-size="44">👍</text>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="15" fill="#6ee7b7">VALEU!</text>
      </svg>
    `)
  },
  {
    id: 'br-partiu',
    name: 'Partiu',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#082f49" stroke="#00f2fe" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1.2s infinite ease-in-out;">
          <text x="64" y="64" text-anchor="middle" font-size="42">🚀</text>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="15" fill="#38bdf8">PARTIU!</text>
      </svg>
    `)
  },
  {
    id: 'br-brabo',
    name: 'Brabo',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#18181b" stroke="#f59e0b" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1.6s infinite ease-in-out;">
          <text x="64" y="66" text-anchor="middle" font-size="44">💪</text>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="15" fill="#fbbf24">BRABO!</text>
      </svg>
    `)
  },
  {
    id: 'br-vixi',
    name: 'Vixi',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#450a0a" stroke="#f97316" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: nopeShake 1s infinite ease-in-out;">
          <text x="64" y="64" text-anchor="middle" font-size="40">😬</text>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#fdba74">VIXI MARIA</text>
      </svg>
    `)
  },
  {
    id: 'br-rindo',
    name: 'Rindo',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#1e1b4b" stroke="#8b5cf6" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1s infinite ease-in-out;">
          <text x="64" y="62" text-anchor="middle" font-size="42">🤣</text>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#c4b5fd">KKKKKKK</text>
      </svg>
    `)
  },
  {
    id: 'br-choro',
    name: 'Chorando',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: pulse 1.4s infinite ease-in-out;">
          <text x="64" y="62" text-anchor="middle" font-size="42">😭</text>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#7dd3fc">RIR P/ NÃO CHORAR</text>
      </svg>
    `)
  },
  {
    id: 'br-confuso',
    name: 'Confuso',
    url: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="118" height="118" x="5" y="5" rx="26" fill="#27272a" stroke="#a1a1aa" stroke-width="2.5"/>
        <g style="transform-origin: center; animation: nopeShake 1.8s infinite ease-in-out;">
          <text x="64" y="62" text-anchor="middle" font-size="42">🧐</text>
        </g>
        <text x="64" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#e4e4e7">TRAVOU AQUI</text>
      </svg>
    `)
  }
]

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'echo-vibes',
    name: 'Echo Vibes',
    icon: '✨',
    stickers: echoVibesStickers
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    stickers: gamingStickers
  },
  {
    id: 'memes-br',
    name: 'Memes BR',
    icon: '🇧🇷',
    stickers: memesBrStickers
  }
]
