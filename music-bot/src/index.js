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
  endAllSessions,
  getActiveSessionCount
} from './sessionManager.js'

console.log('[Echo Music Bot] Iniciando...')
console.log(`[Echo Music Bot] LiveKit: ${config.livekitUrl}`)
console.log(`[Echo Music Bot] Limite de sessões simultâneas: ${config.maxConcurrentSessions}`)

// Supabase Realtime só filtra por igualdade (não dá pra filtrar "body
// começa com !"), então assina todo INSERT em messages e filtra os
// comandos aqui na aplicação. Pra uma comunidade de porte pequeno/médio
// isso é totalmente tranquilo — o volume de mensagens é baixo perto do
// que o Realtime aguenta.
const realtimeChannel = supabase
  .channel('music-bot-commands')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
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
      }
    } catch (err) {
      console.error(`[Command] Erro ao processar "!${command.name}":`, err)
    }
  })
  .subscribe((status) => {
    console.log(`[Realtime] Status da inscrição: ${status}`)
  })

async function shutdown(signal) {
  console.log(`[Echo Music Bot] Recebido ${signal}, encerrando ${getActiveSessionCount()} sessão(ões) ativa(s)...`)
  try {
    await endAllSessions()
    await supabase.removeChannel(realtimeChannel)
  } finally {
    process.exit(0)
  }
}

// O systemd manda SIGTERM num restart/stop normal — capturamos pra sair
// das salas do LiveKit de forma limpa em vez de deixar bots fantasmas
// conectados até o timeout do servidor.
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
