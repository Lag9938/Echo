import { config } from './config.js'
import { supabase, getChannelType } from './supabaseClient.js'
import { parseCommand } from './commands.js'
import {
  handlePlay,
  handleSkip,
  handleStop,
  handlePause,
  handleResume,
  handleVolume,
  handleQueue,
  handleRemove,
  handleNext,
  handleNow,
  handleClear,
  endAllSessions,
  getActiveSessionCount
} from './sessionManager.js'
import { keepSubscribed } from './realtimeWatchdog.js'

console.log('[Echo Music Bot] Iniciando...')
console.log(`[Echo Music Bot] LiveKit: ${config.livekitUrl}`)
console.log(`[Echo Music Bot] Limite de sessões simultâneas: ${config.maxConcurrentSessions}`)

// Supabase Realtime só filtra por igualdade (não dá pra filtrar "body
// começa com !"), então assina todo INSERT em messages e filtra os
// comandos aqui na aplicação. Pra uma comunidade de porte pequeno/médio
// isso é totalmente tranquilo — o volume de mensagens é baixo perto do
// que o Realtime aguenta.
async function handleMessageInsert(payload) {
    const msg = payload.new
    if (!msg || msg.author_id === config.botAuthorId) return // ignora as próprias mensagens do bot

    const command = parseCommand(msg.body)
    if (!command) return

    // Só reage a comandos postados dentro de um canal de voz — é lá que
    // o bot consegue efetivamente publicar áudio via LiveKit (room = channel_id).
    const channelType = await getChannelType(msg.channel_id)
    if (channelType !== 'voice') return

    console.log(`[Command] !${command.name} em ${msg.channel_id} (sessões ativas: ${getActiveSessionCount()})`)

    try {
      switch (command.name) {
        case 'play': await handlePlay(msg.channel_id, command.arg); break
        case 'skip': await handleSkip(msg.channel_id); break
        case 'stop': await handleStop(msg.channel_id); break
        case 'pause': await handlePause(msg.channel_id); break
        case 'resume': await handleResume(msg.channel_id); break
        case 'volume': await handleVolume(msg.channel_id, command.arg); break
        case 'queue': await handleQueue(msg.channel_id); break
        case 'remove': await handleRemove(msg.channel_id, command.arg); break
        case 'next': await handleNext(msg.channel_id, command.arg); break
        case 'now': await handleNow(msg.channel_id, command.arg); break
        case 'clear': await handleClear(msg.channel_id); break
      }
    } catch (err) {
      console.error(`[Command] Erro ao processar "!${command.name}":`, err)
    }
}

// A inscrição é refeita sozinha se cair; se ficar minutos sem voltar, o processo sai com erro e o
// systemd (Restart=always) sobe um bot novo em vez de ele ficar rodando sem ouvir os comandos.
const commandsSubscription = keepSubscribed({
  subscribe: (onStatus) => supabase
    .channel('music-bot-commands')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleMessageInsert)
    .subscribe(onStatus),
  unsubscribe: (channel) => supabase.removeChannel(channel),
  isHealthy: (channel) => channel.state === 'joined' && supabase.realtime.isConnected(),
  onGiveUp: () => shutdown('Realtime sem inscrição', 1)
})

let shuttingDown = false
async function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[Echo Music Bot] ${reason}: encerrando ${getActiveSessionCount()} sessão(ões) ativa(s)...`)
  try {
    await endAllSessions()
    await commandsSubscription.stop()
  } catch (err) {
    console.error('[Echo Music Bot] Erro ao encerrar:', err)
  } finally {
    process.exit(exitCode)
  }
}

// O systemd manda SIGTERM num restart/stop normal — capturamos pra sair
// das salas do LiveKit de forma limpa em vez de deixar bots fantasmas
// conectados até o timeout do servidor.
process.on('SIGTERM', () => shutdown('Recebido SIGTERM'))
process.on('SIGINT', () => shutdown('Recebido SIGINT'))
