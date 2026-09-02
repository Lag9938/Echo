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

export const APP_CURRENT_VERSION = '0.23.6'

export const CHANGELOG_DATA: ReleaseNote[] = [
  {
    version: '0.23.6',
    title: 'Transmissão Nativa com Isolamento de Áudio (Estilo Discord)',
    date: '02 de Setembro de 2026',
    tagline: 'Captura nativa de som exclusiva por processo via Windows WASAPI Loopback, eliminação total de eco e fim do mutamento de voz.',
    isLatest: true,
    highlights: [
      {
        icon: '🛡️',
        badge: 'ESTILO DISCORD',
        title: 'Captura de Áudio Nativa por Processo (WASAPI Loopback)',
        description: 'Ao transmitir um jogo ou janela, o Echo agora isola nativamente o som daquele aplicativo no Windows. As vozes da chamada nunca são capturadas, eliminando 100% o retorno de voz e eco.'
      },
      {
        icon: '🎙️',
        badge: 'VOZ & TELA',
        title: 'Separação Definitiva de Faixas WebRTC',
        description: 'O áudio da transmissão e o seu microfone agora trafegam em canais totalmente independentes, garantindo que sua voz nunca mais seja mutada ou substituída pela tela.'
      },
      {
        icon: '🔊',
        badge: 'FIDELIDADE',
        title: 'Áudio Cristalino Sem Cortes',
        description: 'Remoção de filtros destrutivos de frequências e ducking forçado, preservando toda a fidelidade do som dos seus jogos a 48kHz estéreo.'
      }
    ]
  },
  {
    version: '0.23.5',
    title: 'Áudio Espacial 3D & Controles Granulares do Perfil',
    date: '02 de Setembro de 2026',
    tagline: 'Posicionamento estéreo de voz dos amigos em chamadas, distribuição 3D de squad e total liberdade de customização no perfil.',
    isLatest: false,
    highlights: [
      {
        icon: '🎧',
        badge: 'ÁUDIO 3D',
        title: 'Áudio Espacial 3D (Posicionamento Estéreo)',
        description: 'Ajuste individualmente a posição de cada amigo no seu fone de ouvido (esquerda, centro ou direita) para saber quem está falando apenas pela direção do som.'
      },
      {
        icon: '🌐',
        badge: 'SQUAD',
        title: 'Distribuição 3D de Squad Automática',
        description: 'Com 1 clique, distribua todos os membros da sua chamada de voz em um semicírculo estéreo natural.'
      },
      {
        icon: '🎛️',
        badge: 'PRIVACIDADE',
        title: 'Controle Granular do Perfil Gamer',
        description: 'Chave mestra para ativar/desativar o perfil gamer por completo ou individualmente (jogo principal, periféricos e badges de squad).'
      },
      {
        icon: '📌',
        badge: 'MINI PLAYER',
        title: 'Mini Player Flutuante (Picture-in-Picture)',
        description: 'Assista às transmissões dos seus amigos em uma janelinha flutuante arrastável com controles de volume rápidos.'
      }
    ]
  },
  {
    version: '0.23.4',
    title: 'Echo Player Card & Estúdio de Identidade Gamer',
    date: '02 de Setembro de 2026',
    tagline: 'Novo cartão holográfico de jogador com auras sonoras, jogo favorito, setup e painel modular.',
    isLatest: false,
    highlights: [
      {
        icon: '🎴',
        badge: 'EXCLUSIVO',
        title: 'Echo Player Card (Cartão Holográfico)',
        description: 'Design autêntico e futurista de Cartão de Jogador com texturas de som Synthwave, Carbono, Aurora e Malha Cyberpunk.'
      },
      {
        icon: '🔊',
        badge: 'NOVO',
        title: 'Aura Sonora Animada (Echo Waves)',
        description: 'Seu avatar agora conta com pulsos de onda acústica reativos em cores neon selecionáveis (Ciano, Ametista, Rubro, Ouro e Stealth).'
      },
      {
        icon: '🎮',
        badge: 'GAMER',
        title: 'Jogo Favorito & Setup de Periféricos',
        description: 'Exiba seu Main Game (Valorant, CS2, LoL, etc.) e seus periféricos favoritos diretamente no seu cartão de jogador.'
      },
      {
        icon: '🛠️',
        badge: 'INTERFACE',
        title: 'Editor de Perfil Modular em Abas',
        description: 'Configuração dividida em 3 abas práticas: Identidade, Cartão & Efeitos e Perfil Gamer.'
      }
    ]
  },
  {
    version: '0.23.3',
    title: 'Novo Perfil Customizável, Ícones Vetoriais e Sincronização de Membros',
    date: '02 de Setembro de 2026',
    tagline: 'Personalização completa do perfil de usuário, ícones SVG modernos e sincronização de membros em tempo real.',
    isLatest: true,
    highlights: [
      {
        icon: '🎨',
        badge: 'DESIGN',
        title: 'Estúdio de Customização de Perfil',
        description: 'Personalize seu perfil com Banners degradê exclusivos, molduras de avatar animadas (Neon Glow, Ouro, Cyber), biografia "Sobre Mim", pronomes e badges de prestígio com preview interativo em tempo real.'
      },
      {
        icon: '👥',
        badge: 'CORREÇÃO',
        title: 'Lista de Membros do Servidor em Tempo Real',
        description: 'A aba de membros agora atualiza instantaneamente quando alguém entra, separa membros por cargos (Dono, Moderador, Membro) e status online/offline com visualização de perfis.'
      },
      {
        icon: '✨',
        badge: 'VISUAL',
        title: 'Ícones Vetoriais SVG Unificados',
        description: 'Substituição completa de emojis antigos por ícones SVG elegantes nos controles de chamada, soundboard e barra de mensagens de voz.'
      },
      {
        icon: '📌',
        badge: 'CORREÇÃO',
        title: 'Identificador Preciso de Versão Atual',
        description: 'A aba de novidades agora destaca exclusivamente a sua versão instalada com o selo verde ATUAL.'
      }
    ]
  },
  {
    version: '0.23.2',
    title: 'Isolamento Acústico Split-Band & Supressão de Retorno',
    date: '02 de Setembro de 2026',
    tagline: 'Eliminação total de retorno de voz durante transmissões com motor DSP Split-Band.',
    highlights: [
      {
        icon: '🛡️',
        badge: 'ÁUDIO',
        title: 'Motor DSP Split-Band em Tempo Real',
        description: 'Separação acústica inteligente: o som do jogo (graves e agudos) permanece 100% livre enquanto a faixa de voz da chamada é isolada dinamicamente via sidechain.'
      },
      {
        icon: '🔇',
        badge: 'ESTABILIDADE',
        title: 'Supressão Anti-Retorno do Espectador',
        description: 'Enquanto você fala, o retorno acústico da tela é atenuado automaticamente para você nunca ouvir o eco da própria voz.'
      },
      {
        icon: '📺',
        badge: 'NOVO',
        title: 'Assistir Transmissões com 1 Clique',
        description: 'Cards da chamada com botões AO VIVO para escolher quem assistir, alternar telas ou ver tudo em grade.'
      }
    ]
  },
  {
    version: '0.23.1',
    title: 'Visualização de Múltiplas Transmissões e Estabilidade WebRTC',
    date: '02 de Setembro de 2026',
    tagline: 'Assista à tela de qualquer amigo com 1 clique e alterne transmissões instantaneamente.',
    highlights: [
      {
        icon: '📺',
        badge: 'NOVO',
        title: 'Assistir Transmissões com 1 Clique',
        description: 'Agora os cards da chamada mostram botões claros de AO VIVO para você escolher exatamente quem deseja assistir, alternar foco ou assistir todas em grade dividida.'
      },
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
        badge: 'DESIGN',
        title: 'Mural de Novidades & Versões',
        description: 'Fique por dentro de todas as mudanças e melhorias a cada atualização de forma rápida e visual.'
      }
    ]
  },
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
