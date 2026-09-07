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

export const APP_CURRENT_VERSION = '0.23.26'

export const CHANGELOG_DATA: ReleaseNote[] = [
  {
    version: '0.23.26',
    title: 'Melhorias de Usabilidade, PTT Instantâneo e Transmissão Precisa',
    date: '07 de Setembro de 2026',
    tagline: 'Configuração reativa de Push-to-Talk sem recarregar telas, leitura dinâmica e fiel de FPS na transmissão e interface de inventário e configurações renovada.',
    isLatest: true,
    highlights: [
      {
        icon: '🎙️',
        badge: 'VOZ & ÁUDIO',
        title: 'Push-to-Talk 100% Reativo',
        description: 'Alterne entre detecção automática e PTT com tecla gamer sem recarregar a janela ou perder o foco das configurações.'
      },
      {
        icon: '🖥️',
        badge: 'TRANSMISSÃO',
        title: 'Taxa de Quadros Fiel e Dinâmica',
        description: 'O medidor de transmissão agora exibe com precisão o FPS real da sua captura (30 FPS para navegadores e 60 FPS para jogos).'
      },
      {
        icon: '🎒',
        badge: 'INVENTÁRIO & LOJA',
        title: 'Visual Modernizado e Limpo',
        description: 'Ícones vetoriais coloridos nas abas, botões de ação sem emojis desnecessários e navegação simplificada sem banners redundantes.'
      },
      {
        icon: '⚡',
        badge: 'SISTEMA',
        title: 'Interface Minimalista e Polida',
        description: 'Barra superior limpa com foco em navegação e botões de fechamento refinados.'
      }
    ]
  }
]
