import { describe, it, expect } from 'vitest'
import { parseKeyboardEventToAccelerator, formatKeyParts } from '../GlobalShortcutRecorder'

function keyEvent(overrides: Partial<KeyboardEvent> & { code: string; key: string }): KeyboardEvent {
  return {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...overrides
  } as KeyboardEvent
}

describe('parseKeyboardEventToAccelerator', () => {
  it('grava a tecla exatamente como a pessoa apertou, sem completar nada sozinho', () => {
    // Bug real: apertar só "C" (sem segurar nenhum modificador) virava "Alt+C" escondido da pessoa.
    const res = parseKeyboardEventToAccelerator(keyEvent({ code: 'KeyC', key: 'c' }))
    expect(res.accelerator).toBe('C')
  })

  it('avisa (mas não impede) quando a tecla sozinha vai virar um atalho sem modificador', () => {
    const res = parseKeyboardEventToAccelerator(keyEvent({ code: 'KeyV', key: 'v' }))
    expect(res.accelerator).toBe('V')
    expect(res.warning).toMatch(/Windows vai capturar essa tecla/)
  })

  it('com um modificador segurado, grava a combinação exata e não avisa nada', () => {
    const res = parseKeyboardEventToAccelerator(keyEvent({ code: 'KeyC', key: 'c', altKey: true }))
    expect(res.accelerator).toBe('Alt+C')
    expect(res.warning).toBeUndefined()

    const res2 = parseKeyboardEventToAccelerator(keyEvent({ code: 'KeyM', key: 'm', ctrlKey: true, shiftKey: true }))
    expect(res2.accelerator).toBe('Ctrl+Shift+M')
    expect(res2.warning).toBeUndefined()
  })

  it('teclas de função e teclas especiais (Insert, Home, F7...) não precisam de modificador nem geram aviso', () => {
    expect(parseKeyboardEventToAccelerator(keyEvent({ code: 'F7', key: 'F7' }))).toEqual({ accelerator: 'F7' })
    expect(parseKeyboardEventToAccelerator(keyEvent({ code: 'Insert', key: 'Insert' }))).toEqual({ accelerator: 'Insert' })
    expect(parseKeyboardEventToAccelerator(keyEvent({ code: 'ScrollLock', key: 'ScrollLock' }))).toEqual({ accelerator: 'ScrollLock' })
  })

  it('ignora quando a tecla apertada é só um modificador solto', () => {
    expect(parseKeyboardEventToAccelerator(keyEvent({ code: 'AltLeft', key: 'Alt' })).accelerator).toBeNull()
    expect(parseKeyboardEventToAccelerator(keyEvent({ code: 'ControlLeft', key: 'Control' })).accelerator).toBeNull()
  })
})

describe('formatKeyParts', () => {
  it('divide e traduz nomes para exibição', () => {
    expect(formatKeyParts('Alt+C')).toEqual(['Alt', 'C'])
    expect(formatKeyParts('Control+Return')).toEqual(['Ctrl', 'Enter'])
    expect(formatKeyParts('none')).toEqual([])
  })
})
