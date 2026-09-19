export interface Sticker {
  id: string
  name: string
  url: string
}

export interface StickerPack {
  id: string
  name: string
  icon: string
  stickers: Sticker[]
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'echo-vibes',
    name: 'Echo Vibes',
    icon: '✨',
    stickers: [
      { id: 'ev-gg', name: 'GG', url: 'https://media.tenor.com/Wq9JasqLZnMAAAAi/gg-easy.gif' },
      { id: 'ev-kek', name: 'Kek', url: 'https://media.tenor.com/R4QAzQ2oAvcAAAAi/pepe-laugh.gif' },
      { id: 'ev-hug', name: 'Abraço', url: 'https://media.tenor.com/0iFrmq3_J8sAAAAi/hug-cute.gif' },
      { id: 'ev-sad', name: 'Sad', url: 'https://media.tenor.com/Tl8aPVl8ixIAAAAi/pepe-sad.gif' },
      { id: 'ev-fire', name: 'On Fire', url: 'https://media.tenor.com/SYBSMKGcCTQAAAAi/fire-flame.gif' },
      { id: 'ev-ez', name: 'EZ', url: 'https://media.tenor.com/8CXt6KdBf8oAAAAi/ez-easy.gif' },
      { id: 'ev-shock', name: 'Chocado', url: 'https://media.tenor.com/2cL_oMGgCssAAAAi/shocked-surprised.gif' },
      { id: 'ev-love', name: 'Amor', url: 'https://media.tenor.com/VPk1e_R_TS4AAAAi/love-heart.gif' },
      { id: 'ev-ok', name: 'OK', url: 'https://media.tenor.com/GrRa5NOcv68AAAAi/ok-okay.gif' },
      { id: 'ev-nope', name: 'Nope', url: 'https://media.tenor.com/AkLstA9msXAAAAAi/no-nope.gif' },
      { id: 'ev-clap', name: 'Palmas', url: 'https://media.tenor.com/6A_hKx15l1QAAAAi/clap-applause.gif' },
      { id: 'ev-think', name: 'Pensando', url: 'https://media.tenor.com/Xbsv8NbTGBEAAAAi/thinking-think.gif' },
    ]
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    stickers: [
      { id: 'gm-win', name: 'Winner', url: 'https://media.tenor.com/QOsGEZm7TXkAAAAi/trophy-win.gif' },
      { id: 'gm-rip', name: 'RIP', url: 'https://media.tenor.com/hbpKGYS5X7oAAAAi/rip-dead.gif' },
      { id: 'gm-rage', name: 'Rage', url: 'https://media.tenor.com/1yLDWaYvqe4AAAAi/table-flip-rage.gif' },
      { id: 'gm-clutch', name: 'Clutch', url: 'https://media.tenor.com/Mw7B_QgUaBcAAAAi/clutch-gaming.gif' },
      { id: 'gm-noob', name: 'Noob', url: 'https://media.tenor.com/0maqsIFmIZIAAAAi/noob-noob.gif' },
      { id: 'gm-hack', name: 'Hackeando', url: 'https://media.tenor.com/XB5DLFbFXggAAAAi/hacker-coding.gif' },
      { id: 'gm-pog', name: 'POG', url: 'https://media.tenor.com/z0sEYJnWd2wAAAAi/pogchamp-pog.gif' },
      { id: 'gm-gg', name: 'GG WP', url: 'https://media.tenor.com/XBtFRDmYRgMAAAAi/gg-wp.gif' },
      { id: 'gm-lul', name: 'LUL', url: 'https://media.tenor.com/L63sSPFpqSkAAAAi/lol-laugh.gif' },
      { id: 'gm-aim', name: 'Mira', url: 'https://media.tenor.com/W_3TgxaZ1SYAAAAi/aim-target.gif' },
      { id: 'gm-goat', name: 'GOAT', url: 'https://media.tenor.com/Fs0ZxJZ7GZgAAAAi/goat-greatest.gif' },
      { id: 'gm-speed', name: 'Speed', url: 'https://media.tenor.com/BKCTDJKEgcMAAAAi/fast-speed.gif' },
    ]
  },
  {
    id: 'memes-br',
    name: 'Memes BR',
    icon: '🇧🇷',
    stickers: [
      { id: 'br-ata', name: 'Ata', url: 'https://media.tenor.com/uG3wVTcAtSwAAAAi/ata-meme.gif' },
      { id: 'br-pq', name: 'Por quê?', url: 'https://media.tenor.com/Mx1_PFoHsJQAAAAi/why-por-que.gif' },
      { id: 'br-isso', name: 'É isso', url: 'https://media.tenor.com/bVfwXxr3a8MAAAAi/thats-it.gif' },
      { id: 'br-brl', name: 'Bravo', url: 'https://media.tenor.com/EfJqNaXVsMgAAAAi/bravo-bom.gif' },
      { id: 'br-fds', name: 'FDS', url: 'https://media.tenor.com/Kp63RqkPYbwAAAAi/facepalm-disappointed.gif' },
      { id: 'br-eita', name: 'Eita', url: 'https://media.tenor.com/jBWlCGNimgUAAAAi/eita-wow.gif' },
      { id: 'br-vapo', name: 'Vaporeon', url: 'https://media.tenor.com/3eHJDenBnOwAAAAi/snorlax-sleep.gif' },
      { id: 'br-lula', name: 'Pow pow', url: 'https://media.tenor.com/DYnB9pRCZdcAAAAi/pow-pow-fist.gif' },
      { id: 'br-deus', name: 'Deus', url: 'https://media.tenor.com/pv2o2Wl2JOkAAAAi/pray-jesus.gif' },
      { id: 'br-ceis', name: 'Cê sabe', url: 'https://media.tenor.com/6SkbMtAlmEkAAAAi/you-know.gif' },
      { id: 'br-bora', name: 'Bora!', url: 'https://media.tenor.com/sMSZFN8kFsoAAAAi/lets-go-excited.gif' },
      { id: 'br-para', name: 'Para...', url: 'https://media.tenor.com/G1tEMOGXJogAAAAi/stop-stop-it.gif' },
    ]
  }
]
