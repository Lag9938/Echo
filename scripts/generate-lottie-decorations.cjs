const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '../public/assets/lottie/decorations')
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

function hex(hexStr) {
  hexStr = hexStr.replace('#', '')
  return [
    parseInt(hexStr.substring(0, 2), 16) / 255,
    parseInt(hexStr.substring(2, 4), 16) / 255,
    parseInt(hexStr.substring(4, 6), 16) / 255,
    1
  ]
}

function makeCircleShape(name, size, color, strokeWidth, dash, gap) {
  const it = [
    {
      ty: 'el',
      nm: 'Ellipse',
      p: { a: 0, k: [0, 0] },
      s: { a: 0, k: [size, size] }
    },
    {
      ty: 'st',
      nm: 'Stroke',
      c: { a: 0, k: color },
      w: { a: 0, k: strokeWidth },
      o: { a: 0, k: 100 }
    },
    {
      ty: 'tr',
      nm: 'Transform',
      p: { a: 0, k: [0, 0] },
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
      r: { a: 0, k: 0 },
      o: { a: 0, k: 100 }
    }
  ]

  if (dash && gap) {
    it[1].d = [
      { n: 'd', nm: 'dash', v: { a: 0, k: dash } },
      { n: 'g', nm: 'gap', v: { a: 0, k: gap } }
    ]
  }

  return {
    ty: 'gr',
    nm: name,
    it
  }
}

function makeRotatingLayer(
  ind,
  name,
  shapes,
  startDeg,
  endDeg,
  duration = 120,
  scale = [100, 100]
) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: {
        a: 1,
        k: [
          { t: 0, s: [startDeg], e: [endDeg] },
          { t: duration, s: [endDeg] }
        ]
      },
      p: { a: 0, k: [150, 150, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [scale[0], scale[1], 100] }
    },
    ao: 0,
    shapes,
    ip: 0,
    op: duration,
    st: 0,
    bm: 0
  }
}

function makePulsingLayer(
  ind,
  name,
  shapes,
  minScale,
  maxScale,
  minOp = 60,
  maxOp = 100,
  duration = 120
) {
  const half = Math.floor(duration / 2)
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: 0, s: [minOp], e: [maxOp] },
          { t: half, s: [maxOp], e: [minOp] },
          { t: duration, s: [minOp] }
        ]
      },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [150, 150, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: {
        a: 1,
        k: [
          { t: 0, s: [minScale, minScale, 100], e: [maxScale, maxScale, 100] },
          { t: half, s: [maxScale, maxScale, 100], e: [minScale, minScale, 100] },
          { t: duration, s: [minScale, minScale, 100] }
        ]
      }
    },
    ao: 0,
    shapes,
    ip: 0,
    op: duration,
    st: 0,
    bm: 0
  }
}

function makeFloatingTopLayer(
  ind,
  name,
  shapes,
  minY,
  maxY,
  duration = 120
) {
  const half = Math.floor(duration / 2)
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: {
        a: 1,
        k: [
          { t: 0, s: [-2], e: [2] },
          { t: half, s: [2], e: [-2] },
          { t: duration, s: [-2] }
        ]
      },
      p: {
        a: 1,
        k: [
          { t: 0, s: [150, minY, 0], e: [150, maxY, 0] },
          { t: half, s: [150, maxY, 0], e: [150, minY, 0] },
          { t: duration, s: [150, minY, 0] }
        ]
      },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }
    },
    ao: 0,
    shapes,
    ip: 0,
    op: duration,
    st: 0,
    bm: 0
  }
}

// 1. FIRE STORM
function buildFireStorm() {
  const flameTongues = []
  const count = 16
  for (let i = 0; i < count; i++) {
    const angle = (i * 360) / count
    const rad = (angle * Math.PI) / 180
    const rBase = 100
    const x = Math.cos(rad) * rBase
    const y = Math.sin(rad) * rBase

    flameTongues.push({
      ty: 'gr',
      nm: `Spike_${i}`,
      it: [
        {
          ty: 'rc',
          nm: 'Tongue',
          p: { a: 0, k: [x, y] },
          s: { a: 0, k: [14, 4] },
          r: { a: 0, k: 2 }
        },
        {
          ty: 'fl',
          nm: 'Fill',
          c: { a: 0, k: i % 2 === 0 ? hex('#f97316') : hex('#fef08a') },
          o: { a: 0, k: 90 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: angle },
          o: { a: 0, k: 100 }
        }
      ]
    })
  }

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 120,
    w: 300,
    h: 300,
    nm: 'FireStorm',
    ddd: 0,
    assets: [],
    layers: [
      makeRotatingLayer(
        1,
        'OuterFlameCorona',
        [makeCircleShape('Corona', 214, hex('#f97316'), 5, 24, 16)],
        0,
        360
      ),
      makeRotatingLayer(
        2,
        'InnerFlameRing',
        [makeCircleShape('InnerRing', 196, hex('#fef08a'), 3, 14, 10)],
        360,
        0
      ),
      makePulsingLayer(3, 'FlameTongues', flameTongues, 96, 108, 70, 100),
      makeRotatingLayer(
        4,
        'CrimsonEmbers',
        [makeCircleShape('Embers', 226, hex('#ef4444'), 2, 8, 40)],
        -180,
        180
      )
    ]
  }
}

// 2. CYBER HUD
function buildCyberHud() {
  const brackets = []
  const angles = [45, 135, 225, 315]
  angles.forEach((deg, i) => {
    brackets.push({
      ty: 'gr',
      nm: `Bracket_${i}`,
      it: [
        {
          ty: 'rc',
          nm: 'Corner',
          p: { a: 0, k: [0, -108] },
          s: { a: 0, k: [22, 5] },
          r: { a: 0, k: 1 }
        },
        {
          ty: 'fl',
          nm: 'Fill',
          c: { a: 0, k: hex('#00f2fe') },
          o: { a: 0, k: 100 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: deg },
          o: { a: 0, k: 100 }
        }
      ]
    })
  })

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 120,
    w: 300,
    h: 300,
    nm: 'CyberHud',
    ddd: 0,
    assets: [],
    layers: [
      makeRotatingLayer(
        1,
        'TelemetryRing',
        [makeCircleShape('DashedTelemetry', 218, hex('#00f2fe'), 3, 40, 20)],
        0,
        180
      ),
      makeRotatingLayer(
        2,
        'ReverseTargetRing',
        [makeCircleShape('FineGrid', 196, hex('#10b981'), 2, 10, 8)],
        180,
        -180
      ),
      makePulsingLayer(3, 'TacticalBrackets', brackets, 95, 105, 80, 100),
      makePulsingLayer(
        4,
        'Crosshairs',
        [
          makeCircleShape('CrosshairRing', 232, hex('#00f2fe'), 1.5, 4, 32),
          makeCircleShape('CoreAccent', 186, hex('#38bdf8'), 1.5, 16, 28)
        ],
        98,
        102,
        90,
        100
      )
    ]
  }
}

// 3. PRISMATIC CROWN
function buildPrismaticCrown() {
  const crownPeaks = [
    {
      ty: 'gr',
      nm: 'CrownBase',
      it: [
        {
          ty: 'rc',
          nm: 'BaseBar',
          p: { a: 0, k: [0, 12] },
          s: { a: 0, k: [90, 8] },
          r: { a: 0, k: 3 }
        },
        {
          ty: 'fl',
          nm: 'GoldFill',
          c: { a: 0, k: hex('#fbbf24') },
          o: { a: 0, k: 100 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 }
        }
      ]
    },
    {
      ty: 'gr',
      nm: 'CenterPeak',
      it: [
        {
          ty: 'rc',
          nm: 'Jewel',
          p: { a: 0, k: [0, -10] },
          s: { a: 0, k: [18, 28] },
          r: { a: 0, k: 4 }
        },
        {
          ty: 'fl',
          nm: 'CyanDiamond',
          c: { a: 0, k: hex('#a5f3fc') },
          o: { a: 0, k: 100 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 45 },
          o: { a: 0, k: 100 }
        }
      ]
    },
    {
      ty: 'gr',
      nm: 'LeftPeak',
      it: [
        {
          ty: 'rc',
          nm: 'JewelLeft',
          p: { a: 0, k: [-28, 0] },
          s: { a: 0, k: [14, 20] },
          r: { a: 0, k: 3 }
        },
        {
          ty: 'fl',
          nm: 'GoldLeft',
          c: { a: 0, k: hex('#fbbf24') },
          o: { a: 0, k: 100 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 30 },
          o: { a: 0, k: 100 }
        }
      ]
    },
    {
      ty: 'gr',
      nm: 'RightPeak',
      it: [
        {
          ty: 'rc',
          nm: 'JewelRight',
          p: { a: 0, k: [28, 0] },
          s: { a: 0, k: [14, 20] },
          r: { a: 0, k: 3 }
        },
        {
          ty: 'fl',
          nm: 'GoldRight',
          c: { a: 0, k: hex('#fbbf24') },
          o: { a: 0, k: 100 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: -30 },
          o: { a: 0, k: 100 }
        }
      ]
    }
  ]

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 120,
    w: 300,
    h: 300,
    nm: 'PrismaticCrown',
    ddd: 0,
    assets: [],
    layers: [
      makeFloatingTopLayer(1, 'FloatingCrown', crownPeaks, 42, 54),
      makePulsingLayer(
        2,
        'CrownGlowRing',
        [makeCircleShape('HaloBase', 198, hex('#fde047'), 3, 20, 15)],
        97,
        103,
        70,
        100
      ),
      makeRotatingLayer(
        3,
        'DiamondSparkles',
        [makeCircleShape('SparkleDots', 220, hex('#fbbf24'), 2, 6, 45)],
        0,
        120
      )
    ]
  }
}

// 4. HEX SHIELD
function buildHexShield() {
  const nodes = []
  for (let i = 0; i < 6; i++) {
    const angle = (i * 360) / 6
    const rad = (angle * Math.PI) / 180
    const x = Math.cos(rad) * 105
    const y = Math.sin(rad) * 105
    nodes.push({
      ty: 'gr',
      nm: `HexNode_${i}`,
      it: [
        {
          ty: 'el',
          nm: 'Dot',
          p: { a: 0, k: [x, y] },
          s: { a: 0, k: [10, 10] }
        },
        {
          ty: 'fl',
          nm: 'Fill',
          c: { a: 0, k: hex('#34d399') },
          o: { a: 0, k: 100 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 }
        }
      ]
    })
  }

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 120,
    w: 300,
    h: 300,
    nm: 'HexShield',
    ddd: 0,
    assets: [],
    layers: [
      makePulsingLayer(
        1,
        'ExpandingHexBarrier',
        [makeCircleShape('HexRing', 210, hex('#34d399'), 4, 30, 12)],
        94,
        108,
        50,
        100
      ),
      makeRotatingLayer(
        2,
        'OrbitingHexNodes',
        nodes,
        0,
        360
      ),
      makeRotatingLayer(
        3,
        'CounterRipples',
        [makeCircleShape('Ripple', 192, hex('#06b6d4'), 2.5, 15, 10)],
        180,
        -180
      ),
      makePulsingLayer(
        4,
        'EnergyGlowRing',
        [makeCircleShape('OuterAura', 228, hex('#34d399'), 1.5, 8, 20)],
        98,
        104,
        60,
        90
      )
    ]
  }
}

// 5. QUANTUM VORTEX
function buildQuantumVortex() {
  const satellites = []
  for (let i = 0; i < 4; i++) {
    const angle = (i * 360) / 4
    const rad = (angle * Math.PI) / 180
    satellites.push({
      ty: 'gr',
      nm: `Sat_${i}`,
      it: [
        {
          ty: 'el',
          nm: 'SatOrb',
          p: { a: 0, k: [Math.cos(rad) * 112, Math.sin(rad) * 112] },
          s: { a: 0, k: [12, 12] }
        },
        {
          ty: 'fl',
          nm: 'Fill',
          c: { a: 0, k: hex('#c084fc') },
          o: { a: 0, k: 100 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 }
        }
      ]
    })
  }

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 120,
    w: 300,
    h: 300,
    nm: 'QuantumVortex',
    ddd: 0,
    assets: [],
    layers: [
      makeRotatingLayer(
        1,
        'CosmicSpiral1',
        [makeCircleShape('SpiralA', 220, hex('#a855f7'), 4, 60, 25)],
        0,
        360
      ),
      makeRotatingLayer(
        2,
        'CosmicSpiral2',
        [makeCircleShape('SpiralB', 196, hex('#ec4899'), 3, 30, 15)],
        360,
        0
      ),
      makeRotatingLayer(
        3,
        'AntimatterSatellites',
        satellites,
        0,
        -360
      ),
      makePulsingLayer(
        4,
        'EventHorizonCore',
        [makeCircleShape('Core', 208, hex('#c084fc'), 2, 10, 10)],
        96,
        106,
        60,
        100
      )
    ]
  }
}

// 6. SOUNDWAVE ORB
function buildSoundwaveOrb() {
  const bars = []
  const barCount = 24
  for (let i = 0; i < barCount; i++) {
    const angle = (i * 360) / barCount
    const rad = (angle * Math.PI) / 180
    const x = Math.cos(rad) * 102
    const y = Math.sin(rad) * 102
    bars.push({
      ty: 'gr',
      nm: `Bar_${i}`,
      it: [
        {
          ty: 'rc',
          nm: 'FreqBar',
          p: { a: 0, k: [x, y] },
          s: { a: 0, k: [i % 2 === 0 ? 12 : 6, 3] },
          r: { a: 0, k: 1.5 }
        },
        {
          ty: 'fl',
          nm: 'Fill',
          c: { a: 0, k: i % 2 === 0 ? hex('#00f2fe') : hex('#38bdf8') },
          o: { a: 0, k: 95 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: angle },
          o: { a: 0, k: 100 }
        }
      ]
    })
  }

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 120,
    w: 300,
    h: 300,
    nm: 'SoundwaveOrb',
    ddd: 0,
    assets: [],
    layers: [
      makePulsingLayer(1, 'AudioFrequencies', bars, 94, 110, 75, 100),
      makeRotatingLayer(
        2,
        'HarmonicRing',
        [makeCircleShape('AcousticCircle', 204, hex('#00f2fe'), 3.5, 30, 20)],
        0,
        360
      ),
      makeRotatingLayer(
        3,
        'SubRing',
        [makeCircleShape('BassRing', 190, hex('#0284c7'), 2, 12, 12)],
        180,
        -180
      ),
      makePulsingLayer(
        4,
        'OuterPulse',
        [makeCircleShape('EchoPulse', 224, hex('#00f2fe'), 1.5, 8, 30)],
        98,
        105,
        50,
        90
      )
    ]
  }
}

// 7. HEART HARMONY
function buildHeartHarmony() {
  const hearts = [
    {
      ty: 'gr',
      nm: 'HeartLeft',
      it: [
        {
          ty: 'rc',
          nm: 'HeartBox1',
          p: { a: 0, k: [-105, 0] },
          s: { a: 0, k: [16, 16] },
          r: { a: 0, k: 5 }
        },
        {
          ty: 'fl',
          nm: 'Fill',
          c: { a: 0, k: hex('#ec4899') },
          o: { a: 0, k: 90 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 45 },
          o: { a: 0, k: 100 }
        }
      ]
    },
    {
      ty: 'gr',
      nm: 'HeartRight',
      it: [
        {
          ty: 'rc',
          nm: 'HeartBox2',
          p: { a: 0, k: [105, -20] },
          s: { a: 0, k: [14, 14] },
          r: { a: 0, k: 4 }
        },
        {
          ty: 'fl',
          nm: 'Fill',
          c: { a: 0, k: hex('#f472b6') },
          o: { a: 0, k: 90 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 45 },
          o: { a: 0, k: 100 }
        }
      ]
    }
  ]

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 120,
    w: 300,
    h: 300,
    nm: 'HeartHarmony',
    ddd: 0,
    assets: [],
    layers: [
      makePulsingLayer(1, 'FloatingHearts', hearts, 92, 112, 60, 100),
      makeRotatingLayer(
        2,
        'PastelRibbon',
        [makeCircleShape('BlossomBorder', 202, hex('#ec4899'), 3, 35, 20)],
        0,
        180
      ),
      makeRotatingLayer(
        3,
        'StardustSwirl',
        [makeCircleShape('Stardust', 218, hex('#f472b6'), 2, 6, 30)],
        180,
        -180
      ),
      makePulsingLayer(
        4,
        'InnerGlow',
        [makeCircleShape('CorePink', 190, hex('#fb7185'), 2, 15, 15)],
        96,
        104,
        70,
        95
      )
    ]
  }
}

// 8. CELESTIAL HALO
function buildCelestialHalo() {
  const haloEllipse = [
    {
      ty: 'gr',
      nm: 'HaloGroup',
      it: [
        {
          ty: 'el',
          nm: 'OvalHalo',
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [130, 42] }
        },
        {
          ty: 'st',
          nm: 'Stroke',
          c: { a: 0, k: hex('#fde047') },
          w: { a: 0, k: 6 },
          o: { a: 0, k: 100 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 }
        }
      ]
    }
  ]

  const wings = [
    {
      ty: 'gr',
      nm: 'WingLeft',
      it: [
        {
          ty: 'rc',
          nm: 'FeatherL',
          p: { a: 0, k: [-110, 20] },
          s: { a: 0, k: [32, 8] },
          r: { a: 0, k: 4 }
        },
        {
          ty: 'fl',
          nm: 'FillL',
          c: { a: 0, k: hex('#fde047') },
          o: { a: 0, k: 80 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: -35 },
          o: { a: 0, k: 100 }
        }
      ]
    },
    {
      ty: 'gr',
      nm: 'WingRight',
      it: [
        {
          ty: 'rc',
          nm: 'FeatherR',
          p: { a: 0, k: [110, 20] },
          s: { a: 0, k: [32, 8] },
          r: { a: 0, k: 4 }
        },
        {
          ty: 'fl',
          nm: 'FillR',
          c: { a: 0, k: hex('#fde047') },
          o: { a: 0, k: 80 }
        },
        {
          ty: 'tr',
          nm: 'Tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 35 },
          o: { a: 0, k: 100 }
        }
      ]
    }
  ]

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 120,
    w: 300,
    h: 300,
    nm: 'CelestialHalo',
    ddd: 0,
    assets: [],
    layers: [
      makeFloatingTopLayer(1, 'HeavenlyHalo', haloEllipse, 40, 52),
      makePulsingLayer(2, 'AngelicWings', wings, 95, 105, 70, 100),
      makeRotatingLayer(
        3,
        'DivineStardust',
        [makeCircleShape('StardustRing', 216, hex('#fde047'), 2, 8, 35)],
        0,
        180
      ),
      makePulsingLayer(
        4,
        'SacredAuraBorder',
        [makeCircleShape('AuraLine', 194, hex('#fef08a'), 2.5, 20, 15)],
        97,
        103,
        70,
        95
      )
    ]
  }
}

// Generate all files
const decos = {
  'fire_storm.json': buildFireStorm(),
  'cyber_hud.json': buildCyberHud(),
  'prismatic_crown.json': buildPrismaticCrown(),
  'hex_shield.json': buildHexShield(),
  'quantum_vortex.json': buildQuantumVortex(),
  'soundwave_orb.json': buildSoundwaveOrb(),
  'heart_harmony.json': buildHeartHarmony(),
  'celestial_halo.json': buildCelestialHalo()
}

Object.entries(decos).forEach(([filename, json]) => {
  const filePath = path.join(OUT_DIR, filename)
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
  const size = fs.statSync(filePath).size
  console.log(`Generated ${filename} (${(size / 1024).toFixed(1)} KB)`)
})
