import { AccessToken } from 'livekit-server-sdk'
import { Room, AudioSource, LocalAudioTrack, TrackPublishOptions, TrackSource, AudioFrame } from '@livekit/rtc-node'
import { config } from './config.js'

// Tamanho de frame recomendado pra WebRTC: 20ms.
const FRAME_MS = 20
const BYTES_PER_SAMPLE = 2 // PCM S16LE

function frameByteLength() {
  return Math.floor(config.sampleRate * config.channels * BYTES_PER_SAMPLE * FRAME_MS / 1000)
}

async function mintBotToken(roomName, identity) {
  const at = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
    identity,
    name: 'Echo Music Bot'
  })
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    // O bot não escuta ninguém: conecta com autoSubscribe desligado e nunca assina faixas dos outros
    // (não gasta banda nem CPU com isso). A permissão fica ligada porque o servidor só entrega as
    // mensagens de dados (controle de volume vindo do painel) a quem pode assinar.
    canSubscribe: true,
    canPublishData: true,
    // Permite publicar o estado (fila, faixa atual...) nos metadados do próprio participante,
    // que o app do Echo lê para montar o painel do bot (veja state.js).
    canUpdateOwnMetadata: true
  })
  return at.toJwt()
}

/**
 * Conecta o bot como participante na sala (= channel_id do canal de voz)
 * e publica uma AudioTrack vazia, pronta pra receber frames via
 * pumpPcmToSource(). Devolve { room, source, disconnect }.
 */
export async function joinAndPublish(roomName) {
  const identity = `music-bot-${roomName}`
  const token = await mintBotToken(roomName, identity)

  const room = new Room()
  await room.connect(config.livekitUrl, token, { autoSubscribe: false, dynacast: true })

  const source = new AudioSource(config.sampleRate, config.channels, config.audioQueueMs)
  const track = LocalAudioTrack.createAudioTrack('music', source)

  const publishOptions = new TrackPublishOptions()
  publishOptions.source = TrackSource.SOURCE_MICROPHONE

  await room.localParticipant.publishTrack(track, publishOptions)

  async function disconnect() {
    try { await room.disconnect() } catch (err) {
      console.warn('[LiveKit] Erro ao desconectar bot:', err.message)
    }
  }

  return { room, source, disconnect }
}

/**
 * Lê o stdout do ffmpeg (PCM S16LE cru) em pedaços de 20ms e alimenta a
 * AudioSource do LiveKit. Resolve quando o stream acaba (fim da faixa) ou
 * é interrompido (skip/stop).
 *
 * NOTA: a assinatura exata de AudioFrame/AudioSource pode variar entre
 * versões do @livekit/rtc-node — como não há como testar contra o pacote
 * real neste ambiente, vale conferir os tipos instalados (node_modules/@livekit/rtc-node)
 * na primeira execução real no servidor e ajustar se necessário.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function pumpPcmToSource(ffmpegStdout, source, { getVolume, isPaused, onFirstFrame } = {}) {
  const frameBytes = frameByteLength()
  const samplesPerChannel = frameBytes / BYTES_PER_SAMPLE / config.channels
  let buffered = Buffer.alloc(0)
  let firstFrameReported = false

  for await (const chunk of ffmpegStdout) {
    buffered = Buffer.concat([buffered, chunk])

    while (buffered.length >= frameBytes) {
      const frameBuf = buffered.subarray(0, frameBytes)
      buffered = buffered.subarray(frameBytes)

      // O AudioFrame do rtc-node lê `data.buffer` INTEIRO (ignora byteOffset),
      // então o Int16Array precisa ter um ArrayBuffer próprio — uma view sobre
      // Buffer.from()/subarray() aponta pro pool compartilhado do Node e o
      // LiveKit publicaria lixo de memória (ruído) em vez do áudio.
      const int16 = new Int16Array(frameBytes / BYTES_PER_SAMPLE)
      Buffer.from(int16.buffer).set(frameBuf)

      const volume = getVolume ? getVolume() : 1
      if (volume !== 1) {
        for (let i = 0; i < int16.length; i++) {
          const scaled = int16[i] * volume
          int16[i] = scaled > 32767 ? 32767 : scaled < -32768 ? -32768 : scaled
        }
      }

      // Pausa: para de consumir o ffmpeg (o pipe enche e o yt-dlp bloqueia
      // sozinho). Funciona em qualquer SO — SIGSTOP/SIGCONT não existem no Windows.
      while (isPaused && isPaused()) await sleep(100)

      const frame = new AudioFrame(int16, config.sampleRate, config.channels, samplesPerChannel)
      await source.captureFrame(frame)

      if (!firstFrameReported) {
        firstFrameReported = true
        if (onFirstFrame) onFirstFrame()
      }
    }
  }
}
