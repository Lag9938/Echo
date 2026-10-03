// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { matchGameProcess, isGameExecutable, parseProcessPaths } from '../ipc/gameDetection.js'

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

  it('ignora o título da janela: uma aba do navegador ou qualquer app falando de um jogo não conta como "jogando"', () => {
    // Bug real: o usuário não estava jogando League of Legends, mas a atividade aparecia porque alguma
    // janela do sistema tinha esse texto no título (uma aba do navegador, um vídeo, esta conversa...).
    expect(matchGameProcess('chrome.exe', 'League of Legends - YouTube')).toBeNull()
    expect(matchGameProcess('Discord.exe', 'Falando sobre VALORANT no chat')).toBeNull()
    expect(matchGameProcess(null, 'League of Legends')).toBeNull()
    expect(matchGameProcess('', 'Counter-Strike 2 patch notes')).toBeNull()
  })

  it('reconhece como jogo qualquer executável instalado numa pasta de jogos, mesmo fora da lista', () => {
    // Bug real: o Horizon Forbidden West não está na lista de jogos e ficava sem 60 FPS na transmissão
    expect(isGameExecutable(
      'HorizonForbiddenWest',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Horizon Forbidden West Complete Edition\\HorizonForbiddenWest.exe'
    )).toBe(true)
    expect(isGameExecutable('AlanWake2', 'D:\\Epic Games\\AlanWake2\\AlanWake2.exe')).toBe(true)
    expect(isGameExecutable('witcher3', 'E:/GOG Games/The Witcher 3/bin/x64/witcher3.exe')).toBe(true)
    expect(isGameExecutable('forza', 'C:\\XboxGames\\Forza Horizon 5\\Content\\ForzaHorizon5.exe')).toBe(true)
    expect(isGameExecutable('algum', 'D:\\Jogos\\Algum Jogo\\algum.exe')).toBe(true)
  })

  it('não trata como jogo os programas comuns nem as lojas e launchers', () => {
    expect(isGameExecutable('chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')).toBe(false)
    expect(isGameExecutable('NVIDIA App', 'C:\\Program Files\\NVIDIA Corporation\\NVIDIA App\\CEF\\NVIDIA App.exe')).toBe(false)
    expect(isGameExecutable('steamwebhelper', 'C:\\Program Files (x86)\\Steam\\bin\\cef\\cef.win64\\steamwebhelper.exe')).toBe(false)
    expect(isGameExecutable('EpicGamesLauncher', 'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe')).toBe(false)
    expect(isGameExecutable('RiotClientUx', 'C:\\Riot Games\\Riot Client\\UX\\RiotClientUx.exe')).toBe(false)
    expect(isGameExecutable('wallpaper64', 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\wallpaper_engine\\wallpaper64.exe')).toBe(false)
  })

  it('sem o caminho do executável (processo protegido), decide só pela lista de jogos conhecidos', () => {
    expect(isGameExecutable('VALORANT-Win64-Shipping', null)).toBe(true)
    expect(isGameExecutable('HorizonForbiddenWest', null)).toBe(false)
    expect(isGameExecutable('', '')).toBe(false)
    expect(isGameExecutable(null, undefined)).toBe(false)
  })

  it('lê a saída "pid|caminho" e ignora linhas sem caminho ou quebradas', () => {
    const paths = parseProcessPaths('9996|\r\n14056|C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\r\nlixo\r\n\r\nabc|C:\\x.exe\r\n28304|D:\\a|b\\jogo.exe\r\n')
    expect(paths.size).toBe(2)
    expect(paths.get(14056)).toBe('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    expect(paths.get(28304)).toBe('D:\\a|b\\jogo.exe')
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
