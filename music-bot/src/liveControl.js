// Controle em tempo real: o app do Echo manda comandos de baixa latência direto para o bot pelo LiveKit
// (mensagem de dados na própria sala), sem passar pelo banco nem por mensagem no chat.
// Hoje só o volume usa isso, porque é o único que o usuário arrasta e espera ouvir na hora.
//
// O formato precisa ficar igual ao do app (src/lib/musicBotState.ts).

export const CONTROL_TOPIC = 'echo-music-bot'

/**
 * Interpreta uma mensagem de dados recebida na sala. Devolve { cmd: 'volume', percent } ou null
 * se não for para o bot, estiver malformada ou fora dos limites.
 */
export function parseControlMessage(payload, topic) {
  if (topic !== CONTROL_TOPIC || !payload) return null

  let data
  try {
    data = JSON.parse(Buffer.from(payload).toString('utf8'))
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null

  if (data.cmd === 'volume') {
    const percent = Number(data.value)
    if (!Number.isFinite(percent) || percent < 0 || percent > 200) return null
    return { cmd: 'volume', percent: Math.round(percent) }
  }
  return null
}
