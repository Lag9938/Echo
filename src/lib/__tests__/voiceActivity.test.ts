import { describe, it, expect } from 'vitest'
import { isAutoImageCaption } from '../attachmentCaption'
import { diffVoiceUsers, summarizeCall } from '../voiceActivity'

describe('isAutoImageCaption', () => {
  it('reconhece nome de arquivo, "Imagem", link e vazio como legenda automática', () => {
    expect(isAutoImageCaption('screenshot_1789684430330.png')).toBe(true)
    expect(isAutoImageCaption('IMG 2024 (1).JPG')).toBe(true)
    expect(isAutoImageCaption('foto.webp')).toBe(true)
    expect(isAutoImageCaption('Imagem')).toBe(true)
    expect(isAutoImageCaption('https://media.giphy.com/x.gif')).toBe(true)
    expect(isAutoImageCaption('')).toBe(true)
    expect(isAutoImageCaption(undefined)).toBe(true)
  })

  it('mantém legendas de verdade', () => {
    expect(isAutoImageCaption('olha essa jogada')).toBe(false)
    expect(isAutoImageCaption('mapa novo.png ficou top')).toBe(false)
    expect(isAutoImageCaption('resultado final')).toBe(false)
  })
})

describe('diffVoiceUsers', () => {
  const names = { c1: 'Callzinha' }
  it('vê quem entrou e quem saiu, ignorando a própria pessoa', () => {
    const prev = { c1: { a: 'ana', me: 'Eu' } }
    const next = { c1: { a: 'ana', b: 'bia', me: 'Eu' } }
    expect(diffVoiceUsers(prev, next, names, 'me', 1000).map(e => e.text)).toEqual(['bia entrou na call Callzinha'])
    expect(diffVoiceUsers(next, prev, names, 'me', 1000).map(e => e.text)).toEqual(['bia saiu da call Callzinha'])
    expect(diffVoiceUsers({}, { c1: { me: 'Eu' } }, names, 'me', 1000)).toEqual([])
  })

  it('não gera nada quando nada mudou', () => {
    const snap = { c1: { a: 'ana' } }
    expect(diffVoiceUsers(snap, { c1: { a: 'ana' } }, names, 'me', 1)).toEqual([])
  })
})

describe('summarizeCall', () => {
  const channels = [{ id: 'c1', name: 'Sala 1' }, { id: 'c2', name: 'Sala 2' }]
  const u = (id: string, name: string) => ({ userId: id, displayName: name })

  it('devolve null sem ninguém em chamada', () => {
    expect(summarizeCall(channels, {}, null, () => null)).toBeNull()
  })

  it('prefere a chamada em que a pessoa está; senão a com mais gente', () => {
    const users = { c1: [u('a', 'ana')], c2: [u('b', 'bia'), u('c', 'caio')] }
    expect(summarizeCall(channels, users, null, () => null)?.channelId).toBe('c2')
    expect(summarizeCall(channels, users, 'c1', () => null)?.channelId).toBe('c1')
  })

  it('monta a frase do jogo com quem joga', () => {
    const users = { c1: [u('a', 'lordking'), u('b', 'elden'), u('c', 'teste')] }
    const game = (id: string) => (id === 'a' || id === 'b' ? 'VALORANT' : null)
    expect(summarizeCall(channels, users, null, game)?.activityText).toBe('lordking e elden jogam VALORANT')
    expect(summarizeCall(channels, users, null, (id) => (id === 'a' ? 'Roblox' : null))?.activityText).toBe('lordking joga Roblox')
    expect(summarizeCall(channels, users, null, () => null)?.activityText).toBeNull()
  })
})
