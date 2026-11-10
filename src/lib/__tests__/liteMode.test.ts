import { beforeEach, describe, expect, it } from 'vitest'
import { isLiteActive, liteReason, readLitePreference, writeLitePreference } from '../liteMode'

describe('Modo Leve', () => {
  beforeEach(() => localStorage.clear())

  it('automático liga só com jogo aberto', () => {
    expect(isLiteActive('auto', false)).toBe(false)
    expect(isLiteActive('auto', true)).toBe(true)
  })

  it('ligado e desligado ignoram o jogo', () => {
    expect(isLiteActive('on', false)).toBe(true)
    expect(isLiteActive('off', true)).toBe(false)
  })

  it('diz por que está ativo', () => {
    expect(liteReason('auto', true)).toBe('game')
    expect(liteReason('on', false)).toBe('manual')
    expect(liteReason('off', true)).toBeNull()
    expect(liteReason('auto', false)).toBeNull()
  })

  it('o padrão é automático e a escolha é lembrada', () => {
    expect(readLitePreference()).toBe('auto')
    writeLitePreference('off')
    expect(readLitePreference()).toBe('off')
    writeLitePreference('on')
    expect(readLitePreference()).toBe('on')
  })

  it('valor inválido guardado volta para automático', () => {
    localStorage.setItem('echo-lite-mode', 'xyz')
    expect(readLitePreference()).toBe('auto')
  })
})
