export interface Theme {
  id: string;
  name: string;
  className: string;
  isPremium: boolean;
  tag: string;
  description: string;
  previewColors: string[]; // [cor_de_fundo, cor_do_acento, cor_do_texto]
  bgPrimary: string;
  bgSecondary: string;
  accentColor: string;
  textColor: string;
  glowColor?: string;
}

// O Echo tem só os dois temas Aurora; o escuro é o padrão de todo mundo.
export const DEFAULT_THEME_ID = 'aurora-dark'

export const THEMES: Theme[] = [
  {
    id: 'aurora-dark',
    name: 'Echo Aurora Dark',
    className: 'theme-aurora-dark',
    isPremium: false,
    tag: 'Acolhedor',
    description: 'Grafite profundo, quase preto, com vidro fosco fumê e o coral Echo de acento.',
    previewColors: ['#0c0b0d', '#df6d5d', '#f2edef'],
    bgPrimary: '#0c0b0d',
    bgSecondary: '#1a191e',
    accentColor: '#df6d5d',
    textColor: '#f2edef',
    glowColor: 'rgba(223, 109, 93, 0.35)'
  },
  {
    id: 'light',
    name: 'Echo Aurora Light',
    className: 'light-theme',
    isPremium: false,
    tag: 'Acolhedor',
    description: 'Papel pêssego com vidro fosco, manchas de lilás e damasco e o coral Echo de acento.',
    previewColors: ['#f6eef0', '#df6d5d', '#2a1f2d'],
    bgPrimary: '#f6eef0',
    bgSecondary: '#ffffff',
    accentColor: '#df6d5d',
    textColor: '#2a1f2d',
    glowColor: 'rgba(223, 109, 93, 0.35)'
  }
];
