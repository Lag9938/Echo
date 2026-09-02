export interface ChangelogItem {
  badge?: string
  title: string
  description: string
  icon: string
}

export interface ReleaseNote {
  version: string
  title: string
  date: string
  tagline: string
  isLatest?: boolean
  highlights: ChangelogItem[]
}

export const APP_CURRENT_VERSION = '0.23.0'

export const CHANGELOG_DATA: ReleaseNote[] = [
  {
    version: '0.23.0',
    title: 'Isolamento de Áudio Anti-Eco e Super Transmissão',
    date: '02 de Setembro de 2026',
    tagline: 'Jogue e converse sem eco, com transmissão a 60 FPS ultra estável.',
    isLatest: true,
    highlights: [
      {
        icon: '🛡️',
        badge: 'NOVO',
        title: 'Modo Gamer Anti-Eco (DSP Inteligente)',
        description: 'Ao transmitir a tela, o Echo anula automaticamente as vozes dos seus amigos na chamada. Eles ouvem o som do seu jogo em alta definição sem ouvir a própria voz ecoando!'
      },
      {
        icon: '🎛️',
        badge: 'NOVO',
        title: 'Seletor de Áudio no Go Live',
        description: 'Alterne com 1 clique entre Modo Gamer Anti-Eco, Áudio Completo do PC ou Apenas Vídeo antes de iniciar a stream.'
      },
      {
        icon: '⚡',
        badge: 'ESTABILIDADE',
        title: 'Zero Quedas em Jogos com Anti-Cheat',
        description: 'Otimização completa para Valorant, CS2 e jogos em tela cheia com taxa estável a 60 FPS e sem travamentos.'
      },
      {
        icon: '✨',
        badge: 'NOVO',
        title: 'Mural de Novidades (O que há de novo)',
        description: 'Agora você sempre fica por dentro das novas funções e melhorias a cada atualização de forma rápida e visual.'
      }
    ]
  },
  {
    version: '0.22.0',
    title: 'Visual Glassmorphism, Status Reais e Central de Comandos',
    date: '01 de Setembro de 2026',
    tagline: 'Identidade visual única para servidores, privacidade total e controle rápido.',
    highlights: [
      {
        icon: '💎',
        badge: 'DESIGN',
        title: 'Echo Dock com Efeito de Vidro (Glass)',
        description: 'Barra lateral de servidores autêntica com acabamento em vidro translúcido fosco e bordas iluminadas.'
      },
      {
        icon: '🎚️',
        badge: 'NOVO',
        title: 'Central de Comandos do Servidor',
        description: 'Painel rápido com estatísticas ao vivo de membros, canais e atalhos rápidos de gerenciamento.'
      },
      {
        icon: '🎨',
        badge: 'DESIGN',
        title: 'Echo Channel Studio',
        description: 'Criação de canais de texto e voz com janela pop-up moderna e seleção visual de ícones.'
      },
      {
        icon: '👤',
        badge: 'PRIVACIDADE',
        title: 'Status Invisível & Não Perturbe Reais',
        description: 'O modo Invisível oculta sua atividade de jogos e o Não Perturbe silencia alertas sonoros para foco total.'
      }
    ]
  },
  {
    version: '0.21.0',
    title: 'Áudio de Estúdio e Soundboard Gamer',
    date: '28 de Agosto de 2026',
    tagline: 'Voz limpa com cancelamento de ruído e efeitos sonoros divertidos.',
    highlights: [
      {
        icon: '🎙️',
        badge: 'ÁUDIO',
        title: 'Processamento Vocal de Estúdio',
        description: 'Equalização adaptativa, compressor de voz e gate de ruído para microfones mais limpos e audíveis.'
      },
      {
        icon: '🔊',
        badge: 'DIVERSÃO',
        title: 'Soundboard em Tempo Real',
        description: 'Dispare efeitos sonoros engraçados na chamada para animar as partidas com seus amigos.'
      }
    ]
  }
]
