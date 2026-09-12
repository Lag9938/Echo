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
}

export const THEMES: Theme[] = [
  {
    id: 'dark',
    name: 'Echo Dark (Padrão)',
    className: 'dark-theme',
    isPremium: false,
    tag: 'Padrão',
    description: 'Equilíbrio elegante entre obsidiana e contraste confortável para o dia a dia.',
    previewColors: ['#121417', '#5865f2', '#e3e7e8'],
    bgPrimary: '#121417',
    bgSecondary: '#1a1d21',
    accentColor: '#5865f2',
    textColor: '#e3e7e8'
  },
  {
    id: 'amoled',
    name: 'Amoled Pitch Black',
    className: 'theme-amoled',
    isPremium: false,
    tag: 'OLED Puro',
    description: 'Preto 100% puro com contraste infinito e economia máxima para telas OLED.',
    previewColors: ['#000000', '#3b82f6', '#ffffff'],
    bgPrimary: '#000000',
    bgSecondary: '#0a0a0a',
    accentColor: '#3b82f6',
    textColor: '#ffffff'
  },
  {
    id: 'valorant',
    name: 'Valorant Tactical',
    className: 'theme-valorant',
    isPremium: false,
    tag: 'Tático',
    description: 'Estética militar de precisão com grafite escuro e vermelho Radianite.',
    previewColors: ['#0f1923', '#ff4655', '#ece8e1'],
    bgPrimary: '#0f1923',
    bgSecondary: '#18232f',
    accentColor: '#ff4655',
    textColor: '#ece8e1'
  },
  {
    id: 'midnight',
    name: 'Midnight Ocean',
    className: 'theme-midnight',
    isPremium: false,
    tag: 'Cósmico',
    description: 'Azul oceânico profundo iluminado por acentos aqua e ciano cristalino.',
    previewColors: ['#0b132b', '#00b4d8', '#e0e1dd'],
    bgPrimary: '#0b132b',
    bgSecondary: '#14213d',
    accentColor: '#00b4d8',
    textColor: '#e0e1dd'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    className: 'theme-cyberpunk',
    isPremium: false,
    tag: 'Synthwave',
    description: 'Atmosfera futurista de alta voltagem com roxo abissal e magenta neon.',
    previewColors: ['#0d041a', '#ff007f', '#00f2fe'],
    bgPrimary: '#0d041a',
    bgSecondary: '#190a33',
    accentColor: '#ff007f',
    textColor: '#00f2fe'
  },
  {
    id: 'forest',
    name: 'Forest Emerald',
    className: 'theme-forest',
    isPremium: false,
    tag: 'Zen',
    description: 'Tons de floresta noturna e esmeralda restauradora que descansam a visão.',
    previewColors: ['#07190f', '#10b981', '#ecfdf5'],
    bgPrimary: '#07190f',
    bgSecondary: '#0f291a',
    accentColor: '#10b981',
    textColor: '#ecfdf5'
  },
  {
    id: 'sunset',
    name: 'Sunset Rose',
    className: 'theme-sunset',
    isPremium: false,
    tag: 'Crepúsculo',
    description: 'Gradiente aveludado de entardecer com nuances de púrpura, rubi e rosa.',
    previewColors: ['#1a0b1c', '#f43f5e', '#fdf2f8'],
    bgPrimary: '#1a0b1c',
    bgSecondary: '#29122d',
    accentColor: '#f43f5e',
    textColor: '#fdf2f8'
  },
  {
    id: 'light',
    name: 'Echo Claro',
    className: 'light-theme',
    isPremium: false,
    tag: 'Dia',
    description: 'Superfície suave tipo papel com alto brilho para ambientes muito claros.',
    previewColors: ['#f4f6f8', '#5865f2', '#1e293b'],
    bgPrimary: '#f4f6f8',
    bgSecondary: '#ffffff',
    accentColor: '#5865f2',
    textColor: '#1e293b'
  }
];
