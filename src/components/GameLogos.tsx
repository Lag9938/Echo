import React, { useState, useEffect } from 'react'

interface GameLogoProps {
  gameName?: string | null
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Normalizes a game name string to identify the corresponding game.
 */
export function getGameKey(rawName?: string | null): string {
  if (!rawName) return 'default'
  const n = rawName.toLowerCase()
  if (n.includes('valorant')) return 'valorant'
  if (n.includes('league of legends') || n.includes('lol') || n.includes('leagueclient')) return 'lol'
  if (n.includes('counter-strike') || n.includes('cs2') || n.includes('cs:go') || n.includes('csgo')) return 'cs2'
  if (n.includes('minecraft')) return 'minecraft'
  if (n.includes('gta') || n.includes('grand theft auto') || n.includes('fivem')) return 'gta5'
  if (n.includes('roblox')) return 'roblox'
  if (n.includes('fortnite')) return 'fortnite'
  if (n.includes('apex')) return 'apex'
  if (n.includes('overwatch')) return 'overwatch'
  if (n.includes('rocket league')) return 'rocketleague'
  if (n.includes('dota')) return 'dota2'
  if (n.includes('cyberpunk')) return 'cyberpunk'
  if (n.includes('rainbow six') || n.includes('r6')) return 'r6'
  if (n.includes('rust')) return 'rust'
  if (n.includes('genshin')) return 'genshin'
  return 'default'
}

/**
 * Returns brand accent color for each game.
 */
export function getGameBrandColor(rawName?: string | null): string {
  const key = getGameKey(rawName)
  switch (key) {
    case 'valorant': return '#ff4655'
    case 'lol': return '#c89b3c'
    case 'cs2': return '#de9b35'
    case 'minecraft': return '#588c2b'
    case 'gta5': return '#5ea348'
    case 'roblox': return '#ffffff'
    case 'fortnite': return '#ffd700'
    case 'apex': return '#da292a'
    case 'overwatch': return '#f99e1a'
    case 'rocketleague': return '#0099ff'
    case 'dota2': return '#cf302b'
    case 'cyberpunk': return '#fee702'
    case 'rust': return '#cd412b'
    default: return '#00f2fe'
  }
}

/**
 * Renders authentic, crisp vector SVGs as a fallback or directly.
 */
function renderInlineVector(key: string, size: number) {
  switch (key) {
    case 'valorant':
      return (
        <svg
          width={size}
          height={size}
          viewBox="240 0 520 430"
          fill="none"
          className="game-logo-svg game-logo-valorant"
        >
          {/* Authentic Riot Games Valorant V mark */}
          <path
            fill="#ff4655"
            d="M 245.44 4.65 C 248.61 2.76 250.63 6.58 252.34 8.59 C 362.37 146.24 472.53 283.79 582.55 421.44 C 584.81 423.40 583.10 427.59 580.05 427.14 C 527.37 427.20 474.68 427.16 422.00 427.16 C 417.78 427.21 413.74 425.11 411.15 421.82 C 356.49 353.53 301.86 285.21 247.20 216.91 C 244.88 214.15 243.68 210.58 243.83 206.99 C 243.83 141.01 243.85 75.02 243.81 9.04 C 243.84 7.48 243.78 5.46 245.44 4.65 Z"
          />
          <path
            fill="#ff4655"
            d="M 754.32 4.33 C 756.57 3.48 759.05 5.56 758.72 7.92 C 758.80 73.93 758.71 139.94 758.76 205.95 C 758.91 209.69 758.09 213.56 755.66 216.50 C 739.05 237.28 722.42 258.05 705.81 278.82 C 703.04 282.42 698.51 284.41 693.98 284.18 C 641.65 284.13 589.31 284.21 536.98 284.14 C 533.89 284.62 532.13 280.45 534.41 278.44 C 606.98 187.65 679.61 96.89 752.22 6.12 C 752.77 5.34 753.47 4.74 754.32 4.33 Z"
          />
        </svg>
      )

    case 'lol':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-lol"
        >
          <defs>
            <linearGradient id="inlineLolGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0e6d2" />
              <stop offset="50%" stopColor="#c89b3c" />
              <stop offset="100%" stopColor="#785a28" />
            </linearGradient>
            <linearGradient id="inlineLolBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ac8b9" />
              <stop offset="100%" stopColor="#005a82" />
            </linearGradient>
          </defs>
          <polygon points="50,4 92,26 92,74 50,96 8,74 8,26" fill="#091428" stroke="url(#inlineLolGold)" strokeWidth="5" />
          <path d="M34,22 L46,22 L46,64 L68,64 L68,76 L34,76 Z" fill="url(#inlineLolGold)" />
          <polygon points="68,26 76,34 68,42 60,34" fill="url(#inlineLolBlue)" />
        </svg>
      )

    case 'cs2':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-cs2"
        >
          <rect width="100" height="100" rx="20" fill="#181c24" />
          <polygon points="20,80 40,20 60,20 40,80" fill="#de9b35" />
          <text x="50" y="68" fontFamily="'Impact', 'Arial Black', sans-serif" fontSize="42" fontWeight="900" fill="#ffffff" textAnchor="middle">CS2</text>
        </svg>
      )

    case 'minecraft':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-minecraft"
        >
          <polygon points="50,6 94,30 50,54 6,30" fill="#588c2b" />
          <polygon points="6,30 50,54 50,94 6,70" fill="#573d26" />
          <polygon points="50,54 94,30 94,70 50,94" fill="#3b2716" />
          <polygon points="6,30 50,54 50,62 6,38" fill="#467222" />
          <polygon points="50,54 94,30 94,38 50,62" fill="#3b5e1c" />
        </svg>
      )

    case 'roblox':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-roblox"
        >
          <rect width="100" height="100" rx="20" fill="#111215" />
          <polygon points="26,12 88,28 74,88 12,72" fill="#ffffff" />
          <polygon points="44,42 58,46 54,60 40,56" fill="#111215" />
        </svg>
      )

    case 'gta5':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-gta5"
        >
          <circle cx="50" cy="50" r="46" fill="#1c2421" stroke="#5ea348" strokeWidth="4" />
          <path d="M30,22 L45,78 L55,78 L70,22 L56,22 L50,54 L44,22 Z" fill="#5ea348" />
          <path d="M46,30 L50,50 L54,30 Z" fill="#ffffff" />
          <text x="50" y="90" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="900" fill="#ffffff" textAnchor="middle">FIVE</text>
        </svg>
      )

    case 'fortnite':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-fortnite"
        >
          <rect width="100" height="100" rx="20" fill="#111116" />
          <text x="50" y="78" fontFamily="'Impact', 'Arial Black', sans-serif" fontSize="80" fontWeight="900" fill="#ffd700" textAnchor="middle">F</text>
        </svg>
      )

    case 'apex':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-apex"
        >
          <polygon points="50,8 10,88 32,88 50,52 68,88 90,88" fill="#da292a" />
          <polygon points="42,76 50,60 58,76" fill="#ffffff" />
        </svg>
      )

    case 'overwatch':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-overwatch"
        >
          <circle cx="50" cy="50" r="44" fill="none" stroke="#f99e1a" strokeWidth="9" />
          <path d="M26,36 L42,66 L58,66 L74,36" fill="none" stroke="#f99e1a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M34,36 L66,36" fill="none" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
        </svg>
      )

    case 'rocketleague':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-rocketleague"
        >
          <path d="M50,8 L16,24 L16,56 C16,76 32,90 50,94 C68,90 84,76 84,56 L84,24 Z" fill="#0099ff" />
          <circle cx="50" cy="50" r="18" fill="#ffffff" />
          <path d="M50,32 L50,68 M32,50 L68,50" stroke="#0099ff" strokeWidth="6" />
        </svg>
      )

    case 'dota2':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-dota2"
        >
          <rect width="100" height="100" rx="18" fill="#cf302b" />
          <polygon points="18,60 46,90 18,90" fill="#181c20" />
          <polygon points="90,44 64,18 90,18" fill="#181c20" />
          <polygon points="28,20 90,82 82,90 20,28" fill="#181c20" />
        </svg>
      )

    case 'cyberpunk':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-cyberpunk"
        >
          <rect width="100" height="100" rx="16" fill="#fee702" />
          <rect x="20" y="32" width="60" height="12" fill="#00f2fe" />
          <rect x="20" y="56" width="60" height="12" fill="#ff003c" />
        </svg>
      )

    case 'rust':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="game-logo-svg game-logo-rust"
        >
          <rect width="100" height="100" rx="16" fill="#cd412b" />
          <rect x="34" y="34" width="32" height="32" fill="#ffffff" rx="4" />
          <circle cx="50" cy="50" r="8" fill="#cd412b" />
        </svg>
      )

    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="game-logo-svg game-logo-default"
          style={{ color: '#00f2fe' }}
        >
          {/* Sleek Modern Gamepad Controller */}
          <rect x="2" y="6" width="20" height="12" rx="4" />
          <path d="M6 12h4m-2-2v4" />
          <circle cx="15" cy="11" r="1" fill="currentColor" />
          <circle cx="18" cy="13" r="1" fill="currentColor" />
        </svg>
      )
  }
}

/**
 * Returns crisp local SVG logos for popular games.
 * Loads the official file from `./assets/games/${key}.svg` with an authentic inline vector fallback.
 */
export function GameLogo({ gameName, size = 18, className = '', style }: GameLogoProps) {
  const key = getGameKey(gameName)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    setLoadFailed(false)
  }, [key])

  return (
    <span
      className={`game-logo-container game-logo-${key} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: `${size}px`,
        height: `${size}px`,
        ...style
      }}
      title={gameName || 'Jogo'}
    >
      {!loadFailed ? (
        <img
          src={`./assets/games/${key}.svg`}
          alt={gameName || key}
          width={size}
          height={size}
          className="game-logo-img"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            objectFit: 'contain',
            display: 'block'
          }}
          onError={() => setLoadFailed(true)}
        />
      ) : (
        renderInlineVector(key, size)
      )}
    </span>
  )
}
