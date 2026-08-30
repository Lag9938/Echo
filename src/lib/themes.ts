export interface Theme {
  id: string;
  name: string;
  className: string;
  isPremium: boolean;
  previewColors: string[]; // [cor_de_fundo, cor_do_acento, cor_do_texto]
}

export const THEMES: Theme[] = [
  {
    id: 'light',
    name: 'Claro Padrão',
    className: 'light-theme',
    isPremium: false,
    previewColors: ['#f5f7f6', '#df6d5d', '#2a3338']
  },
  {
    id: 'dark',
    name: 'Escuro Padrão',
    className: 'dark-theme',
    isPremium: false,
    previewColors: ['#121415', '#df6d5d', '#e3e7e8']
  },
  {
    id: 'dracula',
    name: 'Dracula',
    className: 'theme-dracula',
    isPremium: true,
    previewColors: ['#282a36', '#ff79c6', '#f8f8f2']
  },
  {
    id: 'matrix',
    name: 'Code Matrix',
    className: 'theme-matrix',
    isPremium: true,
    previewColors: ['#0d0e0d', '#00ff66', '#00ff66']
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    className: 'theme-cyberpunk',
    isPremium: true,
    previewColors: ['#14051c', '#fffe00', '#00f6ff']
  },
  {
    id: 'nord',
    name: 'Nordic Frost',
    className: 'theme-nord',
    isPremium: true,
    previewColors: ['#2e3440', '#88c0d0', '#d8dee9']
  }
];
