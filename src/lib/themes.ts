export interface Theme {
  id: string;
  name: string;
  className: string;
  isPremium: boolean;
  previewColors: string[]; // [cor_de_fundo, cor_do_acento, cor_do_texto]
}

export const THEMES: Theme[] = [
  {
    id: 'dark',
    name: 'Echo Dark (Padrão)',
    className: 'dark-theme',
    isPremium: false,
    previewColors: ['#121415', '#5865f2', '#e3e7e8']
  },
  {
    id: 'amoled',
    name: 'Amoled Pitch Black',
    className: 'theme-amoled',
    isPremium: false,
    previewColors: ['#000000', '#5865f2', '#ffffff']
  },
  {
    id: 'valorant',
    name: 'Valorant Red',
    className: 'theme-valorant',
    isPremium: false,
    previewColors: ['#0f1923', '#ff4655', '#ece8e1']
  },
  {
    id: 'midnight',
    name: 'Midnight Ocean',
    className: 'theme-midnight',
    isPremium: false,
    previewColors: ['#0b132b', '#48cae4', '#e0e1dd']
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    className: 'theme-cyberpunk',
    isPremium: false,
    previewColors: ['#0f051d', '#ff007f', '#00ffff']
  },
  {
    id: 'forest',
    name: 'Forest Emerald',
    className: 'theme-forest',
    isPremium: false,
    previewColors: ['#0a1f14', '#10b981', '#ecfdf5']
  },
  {
    id: 'sunset',
    name: 'Sunset Rose',
    className: 'theme-sunset',
    isPremium: false,
    previewColors: ['#200e1f', '#f43f5e', '#fdf2f8']
  },
  {
    id: 'light',
    name: 'Echo Claro',
    className: 'light-theme',
    isPremium: false,
    previewColors: ['#f5f7f6', '#5865f2', '#2a3338']
  }
];
