// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { matchGameProcess } from '../ipc/gameDetection.js'

describe('Electron IPC - Game Detection', () => {
  it('detecta VALORANT com sufixo .exe e shipping', () => {
    const res1 = matchGameProcess('VALORANT-Win64-Shipping.exe')
    expect(res1).not.toBeNull()
    expect(res1?.name).toBe('VALORANT')

    const res2 = matchGameProcess('VALORANT.exe')
    expect(res2).not.toBeNull()
    expect(res2?.name).toBe('VALORANT')
  })

  it('detecta Counter-Strike 2 e CS:GO mesmo com extensão .exe', () => {
    const res1 = matchGameProcess('cs2.exe')
    expect(res1).not.toBeNull()
    expect(res1?.name).toBe('Counter-Strike 2')

    const res2 = matchGameProcess('csgo.exe')
    expect(res2).not.toBeNull()
    expect(res2?.name).toBe('Counter-Strike 2')
  })

  it('detecta League of Legends pelo executável de cliente ou jogo', () => {
    const res = matchGameProcess('LeagueClientUx.exe')
    expect(res).not.toBeNull()
    expect(res?.name).toBe('League of Legends')
  })

  it('detecta outros jogos populares da lista (GTA, Apex, Minecraft, Roblox)', () => {
    expect(matchGameProcess('GTA5.exe')?.name).toBe('Grand Theft Auto V')
    expect(matchGameProcess('r5apex.exe')?.name).toBe('Apex Legends')
    expect(matchGameProcess('RobloxPlayerBeta.exe')?.name).toBe('Roblox')
    expect(matchGameProcess('javaw.exe')?.name).toBe('Minecraft')
  })

  it('retorna null para processos comuns de sistema ou browsers', () => {
    expect(matchGameProcess('chrome.exe')).toBeNull()
    expect(matchGameProcess('explorer.exe')).toBeNull()
    expect(matchGameProcess('System Idle Process')).toBeNull()
  })

  it('divide linhas de stdout do tasklist com CRLF corretamente', () => {
    const stdout = '"System Idle Process","0","Services","0","8 K"\r\n"System","4","Services","0","3,876 K"\r\n"VALORANT-Win64-Shipping.exe","1234","Console","1","2,000,000 K"\r\n'
    const lines = stdout.split(/\r?\n/)
    expect(lines.length).toBeGreaterThanOrEqual(3)

    let foundGame = null
    for (const line of lines) {
      if (!line.trim()) continue
      const match = line.match(/^"([^"]+)"/)
      if (match && match[1]) {
        const matched = matchGameProcess(match[1])
        if (matched) {
          foundGame = matched
          break
        }
      }
    }
    expect(foundGame).not.toBeNull()
    expect(foundGame?.name).toBe('VALORANT')
  })
})
