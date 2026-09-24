import { config } from './config.js'

/**
 * Interpreta o texto de uma mensagem de chat como um comando do bot.
 * Retorna null se a mensagem não for um comando reconhecido.
 *
 * Exemplos:
 *   "!play never gonna give you up"  -> { name: 'play', arg: 'never gonna give you up' }
 *   "!skip"                          -> { name: 'skip', arg: '' }
 */
export function parseCommand(body) {
  if (typeof body !== 'string') return null
  const trimmed = body.trim()
  if (!trimmed.startsWith(config.commandPrefix)) return null

  const withoutPrefix = trimmed.slice(config.commandPrefix.length)
  const spaceIdx = withoutPrefix.indexOf(' ')
  const rawName = (spaceIdx === -1 ? withoutPrefix : withoutPrefix.slice(0, spaceIdx)).toLowerCase()
  const arg = spaceIdx === -1 ? '' : withoutPrefix.slice(spaceIdx + 1).trim()

  const aliases = {
    play: 'play', p: 'play', tocar: 'play',
    skip: 'skip', s: 'skip', pular: 'skip',
    stop: 'stop', parar: 'stop', sair: 'stop',
    pause: 'pause', pausar: 'pause',
    resume: 'resume', continuar: 'resume', unpause: 'resume',
    queue: 'queue', fila: 'queue',
    volume: 'volume', vol: 'volume'
  }

  const name = aliases[rawName]
  if (!name) return null

  return { name, arg }
}
