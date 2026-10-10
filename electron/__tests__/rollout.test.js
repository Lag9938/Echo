import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isWithinRollout, readRollout, rolloutOf, setRollout, shouldCompleteRollout, INITIAL_ROLLOUT } from '../services/rollout.js'

const LATEST = [
  'version: 0.53.8',
  'files:',
  '  - url: Echo-Setup-0.53.8.exe',
  '    sha512: abc==',
  '    size: 160546038',
  'path: Echo-Setup-0.53.8.exe',
  'sha512: abc==',
  "releaseDate: '2026-10-10T18:52:25.000Z'",
  ''
].join('\n')

describe('liberação gradual', () => {
  it('escreve, troca e tira a porcentagem sem mexer no resto do arquivo', () => {
    const staged = setRollout(LATEST, 25)
    expect(staged).toBe(`${LATEST}stagingPercentage: 25\n`)
    expect(readRollout(staged)).toBe(25)

    const half = setRollout(staged, 50)
    expect(half.match(/stagingPercentage/g)).toHaveLength(1)
    expect(readRollout(half)).toBe(50)

    // 100% volta ao arquivo original: é exatamente o que os apps já recebem hoje
    expect(setRollout(half, 100)).toBe(LATEST)
    expect(readRollout(LATEST)).toBe(100)
  })

  it('0 pausa a versão; valores fora de 0 a 100 são recusados', () => {
    expect(readRollout(setRollout(LATEST, 0))).toBe(0)
    expect(() => setRollout(LATEST, 101)).toThrow()
    expect(() => setRollout(LATEST, -1)).toThrow()
    expect(() => setRollout(LATEST, 'abc')).toThrow()
    expect(() => setRollout(LATEST, 12.5)).toThrow()
  })

  it('arquivo com fim de linha do Windows e sem quebra no final', () => {
    const windows = LATEST.replace(/\n/g, '\r\n')
    expect(readRollout(setRollout(setRollout(windows, 25), 60))).toBe(60)
    expect(setRollout('version: 1.0.0', 10)).toBe('version: 1.0.0\nstagingPercentage: 10\n')
  })

  it('completa sozinha depois de 24 h, mas nunca uma versão pausada', () => {
    const publishedAt = '2026-10-10T12:00:00Z'
    const hours = (n) => new Date(publishedAt).getTime() + n * 3600 * 1000
    expect(shouldCompleteRollout({ percentage: 25, publishedAt, now: hours(23) })).toBe(false)
    expect(shouldCompleteRollout({ percentage: 25, publishedAt, now: hours(24) })).toBe(true)
    // Pausada (0%): fica pausada até alguém decidir
    expect(shouldCompleteRollout({ percentage: 0, publishedAt, now: hours(500) })).toBe(false)
    expect(shouldCompleteRollout({ percentage: 100, publishedAt, now: hours(500) })).toBe(false)
    expect(shouldCompleteRollout({ percentage: 25, publishedAt: 'data ruim', now: hours(500) })).toBe(false)
  })

  it('quem recebe: o grupo sorteado; pedido manual fura a fila; pausa vale para todos', () => {
    expect(isWithinRollout({ percentage: 25, manual: false, inDefaultGroup: true })).toBe(true)
    expect(isWithinRollout({ percentage: 25, manual: false, inDefaultGroup: false })).toBe(false)
    expect(isWithinRollout({ percentage: 25, manual: true, inDefaultGroup: false })).toBe(true)
    expect(isWithinRollout({ percentage: 0, manual: true, inDefaultGroup: true })).toBe(false)
    expect(isWithinRollout({ percentage: 100, manual: false, inDefaultGroup: true })).toBe(true)
  })

  it('lê a porcentagem do aviso de atualização', () => {
    expect(rolloutOf({ version: '1.0.0' })).toBe(100)
    expect(rolloutOf({ stagingPercentage: 25 })).toBe(25)
    expect(rolloutOf({ stagingPercentage: '0' })).toBe(0)
    expect(rolloutOf({ stagingPercentage: 'x' })).toBe(100)
    expect(rolloutOf(null)).toBe(100)
  })

  it('o fluxo de publicação nasce em liberação gradual e sobe o latest.yml por último', () => {
    const workflow = fs.readFileSync(path.join(process.cwd(), '.github', 'workflows', 'build-and-sign.yml'), 'utf8')
    expect(workflow).toContain('node scripts/set-rollout.mjs dist-desktop/latest.yml')
    expect(workflow.indexOf('set-rollout.mjs')).toBeLessThan(workflow.lastIndexOf('gh release upload'))
    expect(INITIAL_ROLLOUT).toBeGreaterThan(0)
    expect(INITIAL_ROLLOUT).toBeLessThan(100)
  })
})
