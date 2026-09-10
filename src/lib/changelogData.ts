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

export const APP_CURRENT_VERSION = '0.32.2'

export const CHANGELOG_DATA: ReleaseNote[] = [
  {
    version: '0.32.2',
    title: 'Echo v0.32.2 - Tela Cheia Imersiva Sem Barra do Windows em Transmissões',
    date: '10 de Setembro de 2026',
    tagline: 'Experiência de tela cheia 100% imersiva ao assistir transmissões de amigos: o aplicativo agora entra no modo Tela Cheia Nativo do Windows ocultando completamente a barra de tarefas.',
    isLatest: true,
    highlights: [
      {
        icon: '🖥️',
        badge: 'TELA CHEIA',
        title: 'Modo Tela Cheia Real no Windows',
        description: 'Ao clicar no botão de tela cheia ou pressionar Esc, o Echo agora alterna a janela para Tela Cheia Nativa do sistema operacional, ocultando a barra de tarefas do Windows para uma visualização imersiva e sem distrações.'
      },
      {
        icon: '⌨️',
        badge: 'ATALHOS',
        title: 'Saída Rápida com Esc ou Botão',
        description: 'Pressione Esc a qualquer momento ou clique no botão do player para restaurar instantaneamente a janela do Echo ao tamanho normal e reexibir a barra do Windows.'
      }
    ]
  },
  {
    version: '0.32.1',
    title: 'Echo v0.32.1 - Correção Visual do Rodapé de Perfil, Auréolas & Status Gamer',
    date: '10 de Setembro de 2026',
    tagline: 'Ajustes finos no rodapé de perfil: auréolas e decorações com respiro total sem cortes, separação impecável de nome e status, indicador luminoso de presença e sincronização contínua de jogos ativos.',
    isLatest: false,
    highlights: [
      {
        icon: '👑',
        badge: 'VISUAL',
        title: 'Auréola e Decorações com Respiro Perfeito',
        description: 'Ajustado o padding superior do rodapé para 16px com overflow visível, garantindo que a Auréola Celestial e efeitos elevados fiquem inteiros e sem cortes na borda superior.'
      },
      {
        icon: '👤',
        badge: 'PERFIL',
        title: 'Separação Elegante de Nome e Status',
        description: 'Corrigida a tipografia do rodapé para dispor o nome de exibição e o sub-status ("Online", "Ausente", etc.) em linhas separadas e bem alinhadas, além do ponto circular de status no avatar.'
      },
      {
        icon: '🎮',
        badge: 'JOGOS',
        title: 'Presença Gamer Contínua e Persistente',
        description: 'O card de jogo ativo (como Valorant) agora se mantém persistente mesmo após recarregar a interface, com re-sincronização instantânea e atualização de tempo de partida.'
      }
    ]
  },
  {
    version: '0.32.0',
    title: 'Echo v0.32.0 - Detecção Automática de Jogos, Mini Overlay Gamer & Mensagens Salvas',
    date: '10 de Setembro de 2026',
    tagline: 'Detecção ao vivo dos seus jogos no Windows com tempo de partida, Mini Overlay flutuante com indicador de voz para jogar sem Alt+Tab e salvamento de mensagens importantes com estrela.',
    isLatest: false,
    highlights: [
      {
        icon: '🎮',
        badge: 'JOGOS',
        title: 'Detecção Automática de Jogos (Rich Presence Real)',
        description: 'O Echo detecta seus jogos abertos no Windows (como Valorant, CS2, League of Legends, GTA V, Minecraft e outros) e exibe seu status com tempo de partida para todos os seus amigos.'
      },
      {
        icon: '🪟',
        badge: 'OVERLAY',
        title: 'Mini Overlay Flutuante (Picture-in-Picture)',
        description: 'Uma janela compacta e translúcida que fica sempre no topo por cima dos seus jogos, mostrando quem está falando na chamada com anel verde luminoso e controles rápidos.'
      },
      {
        icon: '⭐',
        badge: 'FAVORITOS',
        title: 'Mensagens Salvas com Estrela',
        description: 'Guarde links, estratégias, prints, áudios e anotações com apenas um clique em uma aba privada de acesso rápido com filtros e busca.'
      },
      {
        icon: '⚡',
        badge: 'ATALHOS',
        title: 'Acesso Rápido na Barra Superior e Chamadas',
        description: 'Novo botão de Mensagens Salvas na barra de navegação com contador e botão de ativação do Mini Overlay diretamente no painel de voz.'
      }
    ]
  },
  {
    version: '0.31.0',
    title: 'Echo v0.31.0 - Mensagens de Voz Modernas, Exclusão de Mensagens & Visual Dinâmico',
    date: '10 de Setembro de 2026',
    tagline: 'Novo player de áudio com ondas sonoras, envio de mensagens de voz em conversas privadas, exclusão de mensagens enviadas e novas animações táteis na barra de navegação.',
    isLatest: false,
    highlights: [
      {
        icon: '🎵',
        badge: 'NOVIDADE',
        title: 'Player Moderno com Ondas Sonoras',
        description: 'Visual totalmente renovado para mensagens de áudio com ondas sonoras dinâmicas, controle de velocidade de reprodução (1x, 1.5x, 2x) e design limpo sem emojis antigos.'
      },
      {
        icon: '💬',
        badge: 'PRIVADO',
        title: 'Áudios nas Conversas Privadas',
        description: 'Agora você pode gravar e enviar mensagens de voz diretamente nas conversas privadas com seus amigos, com barra de gravação e temporizador em tempo real.'
      },
      {
        icon: '🗑️',
        badge: 'MENSAGENS',
        title: 'Excluir Mensagens Enviadas',
        description: 'Enviou algo por engano? Agora você pode apagar mensagens de texto e áudio tanto nos canais dos servidores quanto nas conversas diretas com facilidade.'
      },
      {
        icon: '✨',
        badge: 'VISUAL',
        title: 'Interface Mais Viva com Animações',
        description: 'A barra superior, os ícones de servidores e as ações do canal agora respondem com animações suaves ao passar o mouse e clicar, dando mais vida ao aplicativo.'
      },
      {
        icon: '👥',
        badge: 'COMUNIDADE',
        title: 'Convidar Amigos para o Servidor',
        description: 'Adicione seus amigos da lista diretamente ao seu servidor de forma simples e rápida, sem precisar copiar e colar códigos manuais.'
      }
    ]
  },
  {
    version: '0.30.0',
    title: 'Echo v0.30.0 - Convites Nativos (echo://) & Membros em Chamadas',
    date: '09 de Setembro de 2026',
    tagline: 'Links de convite reais com abertura direta no aplicativo Echo e código de acesso, sincronização imediata de membros em chamadas com mais de 3 pessoas e faixa de participantes ao vivo durante transmissões de tela.',
    isLatest: false,
    highlights: [
      {
        icon: '🔗',
        badge: 'CONVITES',
        title: 'Links de Convite Reais (echo://)',
        description: 'Os links de convite agora utilizam o protocolo nativo echo:// com código de espaço copiado automaticamente. Diga adeus aos links quebrados ou sites externos!'
      },
      {
        icon: '👥',
        badge: 'CHAMADAS',
        title: 'Membros Sempre Visíveis (4+ Participantes)',
        description: 'Sincronização imediata de participantes mesclando LiveKit WebRTC e Supabase Presence. Nunca mais perca ninguém de vista ao entrar em chamadas cheias!'
      },
      {
        icon: '📺',
        badge: 'STREAMING',
        title: 'Faixa de Participantes em Transmissões',
        description: 'Assista a transmissões de tela cheia sem perder os avatares dos amigos na chamada. Uma faixa interativa mantém todos os membros visíveis estilo Discord.'
      },
      {
        icon: '⚡',
        badge: 'ESTABILIDADE',
        title: 'Conexão Instantânea de Voz',
        description: 'Correção na geração de tokens do processo nativo para que a conexão com o servidor de áudio seja estabelecida com zero atraso.'
      }
    ]
  },
  {
    version: '0.3.2',
    title: 'Echo v0.3.2 - Otimização de Transmissão (Zero Lag) & Amizades',
    date: '09 de Setembro de 2026',
    tagline: 'Transmissão ultra-leve sem perda de FPS em jogos (H.264 GPU Zero-Copy & Fim do Simulcast), adicione amigos direto do card de membro, convites de canal e chat privado estilo Discord.',
    isLatest: false,
    highlights: [
      {
        icon: '⚡',
        badge: 'DESEMPENHO',
        title: 'Transmissão sem Queda de FPS (NVENC/GPU)',
        description: 'Codificação acelerada por hardware H.264 via GPU e fim do simulcast em transmissões de tela. Chega de quedas bruscas de FPS ou engasgos no Valorant e CS2!'
      },
      {
        icon: '⏸️',
        badge: 'ECONOMIA',
        title: 'Pausa Inteligente de Preview Local',
        description: 'A pré-visualização da sua própria transmissão é pausada automaticamente durante o jogo para liberar 100% de processamento da GPU.'
      },
      {
        icon: '👥',
        badge: 'SOCIAL',
        title: 'Adicionar Amigo Direto do Perfil',
        description: 'Adicione pessoas à sua lista de amigos diretamente ao clicar no nome ou card de qualquer membro do servidor.'
      },
      {
        icon: '🔗',
        badge: 'CONVITES',
        title: 'Convites por Canal com Conexão de Áudio',
        description: 'Compartilhe links diretos de canais (texto ou voz). Ao clicar, o convidado entra direto na chamada do canal sem erros.'
      }
    ]
  },
  {
    version: '0.3.1',
    title: 'Echo v0.3.1 - Convites por Link, Cargos Padrão & Efeitos Sonoros',
    date: '09 de Setembro de 2026',
    tagline: 'Links de convite direto estilo Discord, cargo padrão automático para novos membros, detecção nativa de jogos ativos, sons de chamada e botões táteis animados.',
    isLatest: false,
    highlights: [
      {
        icon: '🔗',
        badge: 'CONVITES',
        title: 'Convites por Link Direto (Estilo Discord)',
        description: 'Compartilhe links diretos (echo://invite/...) ou copie o código direto para entrar com 1 clique.'
      },
      {
        icon: '🛡️',
        badge: 'GESTÃO',
        title: 'Cargo Padrão Automático',
        description: 'Defina um cargo padrão nas configurações do espaço para atribuí-lo instantaneamente a qualquer usuário que entrar.'
      },
      {
        icon: '🎮',
        badge: 'DETECÇÃO',
        title: 'Filtro Nativo de Jogos Ativos',
        description: 'Detecção Win32 inteligente em primeiro plano que elimina falsos-positivos de jogos em segundo plano (como Roblox fechado).'
      },
      {
        icon: '🔊',
        badge: 'ÁUDIO',
        title: 'Sons de Entrada e Saída de Chamadas',
        description: 'Efeitos sonoros nítidos avisam quando amigos entram ou saem da chamada de voz em canais ou DMs 1v1.'
      },
      {
        icon: '✨',
        badge: 'VISUAL',
        title: 'Botões Táteis & Indicadores Duplos',
        description: 'Botões de ação de amigos vivos com hover neon, e exibição simultânea de microfone mutado e fone ensurdecido.'
      }
    ]
  },
  {
    version: '0.23.29',
    title: 'Echo v0.23.29 - Topbar Suave, Controles Integrados & Telas Fluídas',
    date: '09 de Setembro de 2026',
    tagline: 'Animação e recolhimento sincronizado da topbar, controles de janela dinâmicos, novo botão fechar minimalista e preenchimento total das telas de Amigos e Ajustes.',
    isLatest: false,
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
