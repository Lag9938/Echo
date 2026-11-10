// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { resolveGameIcon, isUsableGameIcon, MAX_GAME_ICON_LENGTH } from '../ipc/gameDetection.js'

const PNG = 'data:image/png;base64,' + 'A'.repeat(1500)

describe('ícone oficial do jogo (do .exe)', () => {
  it('acha o .exe pelo processo e devolve o ícone dele', async () => {
    const getProcessPaths = vi.fn().mockResolvedValue(new Map([[4321, 'C:\\Games\\eFootball\\eFootball.exe']]))
    const getFileIcon = vi.fn().mockResolvedValue(PNG)
    expect(await resolveGameIcon(4321, { getProcessPaths, getFileIcon })).toBe(PNG)
    expect(getFileIcon).toHaveBeenCalledWith('C:\\Games\\eFootball\\eFootball.exe')
  })

  it('guarda por .exe: o mesmo jogo não extrai o ícone de novo', async () => {
    const getProcessPaths = vi.fn().mockResolvedValue(new Map([[77, 'C:\\Games\\Cache\\game.exe']]))
    const getFileIcon = vi.fn().mockResolvedValue(PNG)
    await resolveGameIcon(77, { getProcessPaths, getFileIcon })
    await resolveGameIcon(77, { getProcessPaths, getFileIcon })
    expect(getFileIcon).toHaveBeenCalledTimes(1)
  })

  it('sem caminho (anti-cheat), com erro ou com imagem grande demais: sem ícone', async () => {
    expect(await resolveGameIcon(5, { getProcessPaths: vi.fn().mockResolvedValue(new Map()), getFileIcon: vi.fn() })).toBeNull()
    expect(await resolveGameIcon(6, { getProcessPaths: vi.fn().mockRejectedValue(new Error('x')), getFileIcon: vi.fn() })).toBeNull()
    const huge = 'data:image/png;base64,' + 'A'.repeat(MAX_GAME_ICON_LENGTH)
    expect(await resolveGameIcon(8, { getProcessPaths: vi.fn().mockResolvedValue(new Map([[8, 'C:\\big.exe']])), getFileIcon: vi.fn().mockResolvedValue(huge) })).toBeNull()
    expect(await resolveGameIcon(0)).toBeNull()
  })

  it('só aceita PNG embutido e pequeno', () => {
    expect(isUsableGameIcon(PNG)).toBe(true)
    expect(isUsableGameIcon('https://exemplo.com/icone.png')).toBe(false)
    expect(isUsableGameIcon('data:image/svg+xml;base64,AAA')).toBe(false)
    expect(isUsableGameIcon(null)).toBe(false)
  })
})
