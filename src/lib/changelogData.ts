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

export const APP_CURRENT_VERSION = '0.23.29'

export const CHANGELOG_DATA: ReleaseNote[] = [
  {
    version: '0.23.29',
    title: 'Echo v0.23.29 - Topbar Suave, Controles Integrados & Telas Fluídas',
    date: '09 de Setembro de 2026',
    tagline: 'Animação e recolhimento sincronizado da topbar, controles de janela dinâmicos, novo botão fechar minimalista e preenchimento total das telas de Amigos e Ajustes.',
    isLatest: true,
    highlights: [
      {
        icon: '✨',
        badge: 'INTERFACE',
        title: 'Animação Suave da Barra Superior',
        description: 'Transição ultra suave ao recolher e exibir a barra superior, garantindo que os botões de controle acompanhem perfeitamente o movimento.'
      },
      {
        icon: '📐',
        badge: 'RESPONSIVIDADE',
        title: 'Expansão Total das Telas',
        description: 'As telas de Amigos e Ajustes agora ocupam 100% da área útil dinamicamente, sem deixar espaços vazios quando a barra superior se recolhe.'
      },
      {
        icon: '🎯',
        badge: 'USABILIDADE',
        title: 'Botão Fechar Reativo & Gestão de Espaços',
        description: 'Novo botão de fechar modal minimalista no estilo Discord com resposta de clique instantânea e seleção intuitiva de integrantes.'
      }
    ]
  },
  {
    version: '0.23.28',
    title: 'Correção de Detecção de Jogos e Presença Rica',
    date: '08 de Setembro de 2026',
    tagline: 'Filtro inteligente de processos do sistema operacional para evitar falsos-positivos na atividade de jogos.',
    isLatest: false,
    highlights: [
      {
        icon: '🎮',
        badge: 'RICH PRESENCE',
        title: 'Detecção Precisa de Jogos',
        description: 'Eliminamos falsos-positivos onde serviços do sistema (como TrustedInstaller do Windows) eram confundidos com jogos.'
      },
      {
        icon: '⚡',
        badge: 'DESEMPENHO',
        title: 'Filtro de Sessões do Sistema',
        description: 'Processos de segundo plano e serviços da Sessão 0 são ignorados automaticamente pela rotina de escaneamento.'
      }
    ]
  },
  {
    version: '0.23.27',
    title: 'Modernização de Servidores e Sincronização em Tempo Real',
    date: '08 de Setembro de 2026',
    tagline: 'Configurações de servidores totalmente renovadas, sincronização multi-usuário de cargos em tempo real e nova interface com barra flutuante de alterações.',
    isLatest: false,
    highlights: [
      {
        icon: '🛡️',
        badge: 'CARGOS & PERMISSÕES',
        title: 'Sincronização Multi-usuário em Tempo Real',
        description: 'Cargos e permissões agora são sincronizados instantaneamente entre todos os membros do servidor via Supabase Realtime.'
      },
      {
        icon: '🎨',
        badge: 'VISÃO GERAL',
        title: 'Barra Flutuante e Live Preview',
        description: 'Barra animada para salvar ou redefinir alterações pendentes, seletor visual de banners e card de pré-visualização ao vivo do servidor.'
      },
      {
        icon: '👥',
        badge: 'MEMBROS',
        title: 'Gestão Rápida com Popover',
        description: 'Atribua cargos com facilidade através do novo menu popover interativo e badges coloridos com remoção rápida.'
      },
      {
        icon: '💬',
        badge: 'MODERAÇÃO',
        title: 'Permissões Categorizadas e Prévia de Chat',
        description: 'Visualize na hora como as mensagens do cargo aparecerão no chat e configure permissões organizadas por categorias com switches modernos.'
      }
    ]
  },
  {
    version: '0.23.26',
    title: 'Melhorias de Usabilidade, PTT Instantâneo e Transmissão Precisa',
    date: '07 de Setembro de 2026',
    tagline: 'Configuração reativa de Push-to-Talk sem recarregar telas, leitura dinâmica e fiel de FPS na transmissão e interface de inventário e configurações renovada.',
    isLatest: false,
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
