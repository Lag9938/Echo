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

export const APP_CURRENT_VERSION = '0.23.23'

export const CHANGELOG_DATA: ReleaseNote[] = [
  {
    version: '0.23.23',
    title: 'Chat de Texto em Tempo Real (0ms) e Otimização de Performance',
    date: '06 de Setembro de 2026',
    tagline: 'Entrega instantânea de mensagens de texto via WebSocket Broadcast (0ms), interface otimista com indicador de retentativa, paginação inteligente com rolagem infinita e notas de voz ultraleves no Storage.',
    isLatest: true,
    highlights: [
      {
        icon: '⚡',
        badge: 'CHAT EM TEMPO REAL',
        title: 'Transmissão Instantânea via WebSocket (0ms)',
        description: 'Mensagens em canais de servidores agora chegam em tempo real instantâneo diretamente aos outros participantes através de WebSocket Broadcast, eliminando atrasos de sincronização.'
      },
      {
        icon: '🚀',
        badge: 'INTERFACE OTIMISTA',
        title: 'Envio Imediato e Retentativa Automática',
        description: 'Suas mensagens aparecem no chat no exato milissegundo em que você aperta Enter. Se houver oscilação de rede, um indicador vermelho com botão "Tentar novamente" permite reenviar sem perder o texto.'
      },
      {
        icon: '📜',
        badge: 'PAGINAÇÃO & ROLAGEM INFINITA',
        title: 'Histórico Sob Demanda e Menor Consumo',
        description: 'Os canais agora carregam as 50 mensagens mais recentes e puxam mensagens antigas suavemente ao rolar para o topo, mantendo a leitura estável e reduzindo o consumo de dados em 95%.'
      },
      {
        icon: '🎙️',
        badge: 'MENSAGENS DE VOZ',
        title: 'Áudios no Storage de Alta Velocidade',
        description: 'Gravações de áudio agora são salvas diretamente no armazenamento de nuvem do Echo com carregamento rápido e sem sobrecarregar o banco de dados.'
      }
    ]
  },
  {
    version: '0.23.22',
    title: 'Execução em Segundo Plano no Windows e Modo Cinema em Transmissões',
    date: '06 de Setembro de 2026',
    tagline: 'O Echo agora roda em segundo plano na bandeja do sistema (System Tray) ao fechar a janela, mantendo chamadas e streams 100% ativas, com ocultação automática de controles e cursor do mouse em transmissões.',
    highlights: [
      {
        icon: '🔔',
        badge: 'SEGUNDO PLANO & BANDEJA',
        title: 'Funcionamento Contínuo na Bandeja do Windows',
        description: 'Clicar no "X" para fechar a janela agora minimiza o Echo para a bandeja do sistema (System Tray) ao lado do relógio. Suas chamadas de voz, microfone e transmissões continuam funcionando sem interrupção enquanto você joga.'
      },
      {
        icon: '🎬',
        badge: 'MODO CINEMA',
        title: 'Ocultação Automática de Controles da Transmissão',
        description: 'A barra de informações ("AO VIVO", resolução, medidor de áudio) e os botões de controle sofrem fade out suave após 2,5 segundos de inatividade do mouse ou quando o cursor sai do vídeo.'
      },
      {
        icon: '🖱️',
        badge: 'CURSOR INVISÍVEL',
        title: 'Ocultação do Cursor do Mouse ao Assistir',
        description: 'A setinha do mouse desaparece por completo após os 2,5 segundos para não obstruir a visão da gameplay, reaparecendo instantaneamente ao menor movimento do mouse.'
      }
    ]
  },
  {
    version: '0.23.21',
    title: 'Fidelidade de Áudio em Transmissões e Decorações Responsivas',
    date: '06 de Setembro de 2026',
    tagline: 'Áudio de jogos e telas com máxima fidelidade (buffer inteligente de 160ms e transmissão contínua sem cortes), fluidez de vídeo aprimorada e decorações de avatar perfeitamente alinhadas em todo o app.',
    highlights: [
      {
        icon: '🎮',
        badge: 'TRANSMISSÃO DE ÁUDIO',
        title: 'Áudio de Jogos Contínuo e Cristalino',
        description: 'Eliminada a robotização e estalos no som de jogos durante o compartilhamento de tela com pre-buffer otimizado de 160ms, chunks de 42ms e desativação do DTX no áudio do jogo para preservar trilhas e ambiências.'
      },
      {
        icon: '🎬',
        badge: 'FLUIDEZ DE VÍDEO',
        title: 'Prioridade de Framerate na Transmissão',
        description: 'Transmissão com priorização dinâmica de taxa de quadros (maintain-framerate) para garantir movimentos fluidos em jogos competitivos mesmo em variações de rede.'
      },
      {
        icon: '🎨',
        badge: 'DECORAÇÕES 2.0',
        title: 'Decorações de Avatar Proporcionais',
        description: 'Auréola Sagrada, Escudo Hexagonal, Orelhas Neko, Coroa Prismática, Visor Tático e Orbe de Ressonância agora possuem escala matemática perfeitamente proporcional em miniaturas, listas de membros e perfil expandido.'
      }
    ]
  },
  {
    version: '0.23.20',
    title: 'Loja do Echo, Efeitos de Perfil Cinematográficos e Cosméticos 2.0',
    date: '06 de Setembro de 2026',
    tagline: 'Personalização completa da Loja do Echo: Efeitos de Perfil que cobrem toda a área do card, decorações de avatar animadas em alta resolução e Provador ao vivo.',
    highlights: [
      {
        icon: '🛍️',
        badge: 'LOJA DO ECHO',
        title: 'Nova Loja com Duas Seções e Provador ao Vivo',
        description: 'Acesse a Loja pelo menu lateral ou topbar e experimente cosméticos em tempo real antes de equipar no seu perfil.'
      },
      {
        icon: '✨',
        badge: 'PROFILE EFFECTS',
        title: 'Efeitos Cinematográficos de Perfil Completo',
        description: 'Animações imersivas que cobrem todo o card de perfil: Inferno de Chamas, Tempestade de Raios, Chuva de Sakura, Glitch Cibernético, Nébula Cósmica e mais.'
      },
      {
        icon: '🎭',
        badge: 'AVATARES 2.0',
        title: 'Decorações de Avatar Encorpadas e Novas Auras',
        description: 'Labaredas de fogo volumosas em múltiplas camadas na Fúria Flamejante, além das novas Asas Celestiais com Auréola Sagrada e Visor Tático Sci-Fi.'
      }
    ]
  },
  {
    version: '0.23.19',
    title: 'Estabilidade de Transmissão, Áudio Estéreo com IA e Inicialização do Windows',
    date: '05 de Setembro de 2026',
    tagline: 'Transmissões múltiplas ultra estáveis com bitrate dinâmico inteligente, supressão de ruído por IA nos dois ouvidos e inicialização com o Windows.',
    highlights: [
      {
        icon: '🎧',
        badge: 'ÁUDIO & IA',
        title: 'Supressão de Ruído por IA em Ambos os Fones',
        description: 'Corrigido o roteamento de áudio que transmitia apenas no fone esquerdo com IA ativada. Agora o som sai perfeitamente centralizado em estéreo e a supressão pode ser alternada em tempo real sem interrupções.'
      },
      {
        icon: '📡',
        badge: 'ESTABILIDADE',
        title: 'Transmissões Múltiplas e Chamadas Blindadas',
        description: 'Bitrate de vídeo otimizado dinamicamente (2.4 ~ 3.2 Mbps), ativação de Simulcast e DTX inteligente para chamadas fluidas sem travamentos mesmo com múltiplos compartilhamentos simultâneos.'
      },
      {
        icon: '🪟',
        badge: 'SISTEMA',
        title: 'Iniciar com o Windows (Auto Início Nativo)',
        description: 'Nova aba nas configurações permitindo que o Echo inicie automaticamente com o Windows, com suporte a inicialização minimizada na bandeja.'
      },
      {
        icon: '⚡',
        badge: 'PERFORMANCE',
        title: 'Otimização Extrema de Renderização',
        description: 'VU meters de volume desacoplados do ciclo de renderização do React, poupando CPU e eliminando qualquer engasgo durante chamadas com vários participantes.'
      }
    ]
  },
  {
    version: '0.23.7',
    title: 'Sincronização em Tempo Real e Estabilidade de Transmissão',
    date: '02 de Setembro de 2026',
    tagline: 'Sincronização instantânea de membros e canais de voz, fim do throttling em segundo plano e blindagem da transmissão contra quedas.',
    isLatest: false,
    highlights: [
      {
        icon: '👥',
        badge: 'SINCRONIZAÇÃO',
        title: 'Membros e Chamadas 100% em Tempo Real',
        description: 'A lista de membros do servidor e os canais de voz agora refletem todos os participantes ativos instantaneamente, sem travamentos na contagem ou dependência exclusiva de banco de dados.'
      },
      {
        icon: '⚡',
        badge: 'ESTABILIDADE',
        title: 'Fim do Throttling em Jogos & Alt-Tab',
        description: 'Adicionadas diretivas para impedir que o Chromium reduza o envio de vídeo quando você estiver jogando em tela cheia ou alternando janelas.'
      },
      {
        icon: '🛡️',
        badge: 'RESILIÊNCIA',
        title: 'Proteção de Áudio e Auto-Recuperação de Vídeo',
        description: 'O nó de áudio nativo foi blindado na memória contra o Garbage Collector e o player de vídeo agora retoma a reprodução automaticamente após oscilações de rede.'
      }
    ]
  },
  {
    version: '0.23.6',
    title: 'Transmissão Nativa com Isolamento de Áudio de Alta Fidelidade',
    date: '02 de Setembro de 2026',
    tagline: 'Captura nativa de som exclusiva por processo via Windows WASAPI Loopback, eliminação total de eco e fim do mutamento de voz.',
    isLatest: false,
    highlights: [
      {
        icon: '🛡️',
        badge: 'ISOLAMENTO NATIVO',
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
