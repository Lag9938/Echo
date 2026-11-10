import { describe, it, expect } from 'vitest'
import { musicRowText } from '../MusicBotMiniPlayer'
import type { MusicBotState } from '../../../lib/musicBotState'

const state = (patch: Partial<MusicBotState>): MusicBotState => ({
  v: 1,
  status: 'playing',
  volume: 100,
  liveVolume: true,
  current: { title: 'lo-fi para estudar', durationSeconds: 190, positionMs: 0, source: null },
  queue: [],
  queueTotal: 0,
  history: [],
  ...patch
})

describe('linha do bot de música na sala', () => {
  it('sem nada tocando: "Música" e o convite para abrir o painel', () => {
    expect(musicRowText(null, 0)).toEqual({ title: 'Música', sub: 'Nada tocando · clique para abrir' })
    expect(musicRowText(state({ status: 'idle', current: null }), 0).title).toBe('Música')
  })

  it('tocando: a música em destaque, com o tempo e a fila embaixo', () => {
    expect(musicRowText(state({ queueTotal: 2 }), 84_000)).toEqual({
      title: 'lo-fi para estudar',
      sub: 'Música · 1:24 de 3:10 · +2 na fila'
    })
  })

  it('pausado e carregando', () => {
    expect(musicRowText(state({ status: 'paused' }), 5_000).sub).toBe('Pausado · 0:05 de 3:10')
    expect(musicRowText(state({ status: 'loading' }), 0).sub).toBe('Carregando a música…')
  })

  it('sem duração conhecida (transmissão ao vivo) mostra só o tempo; horas aparecem quando passa de 1 h', () => {
    expect(musicRowText(state({ current: { title: 'rádio', durationSeconds: null, positionMs: 0, source: null } }), 3_725_000).sub).toBe('Música · 1:02:05')
  })
})
