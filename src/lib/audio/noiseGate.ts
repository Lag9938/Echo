// Portão de ruído (Noise Gate) do microfone. Lógica pura, usada dentro do AudioWorklet
// (noiseGateWorklet.ts) e testada com o vitest.
//
// Abre quando o nível do bloco passa do limiar escolhido nas configurações; só fecha depois que o som
// fica abaixo do limiar menos a histerese por mais que o "hold" — assim o fim das palavras e as pausas
// curtas entre elas não são cortados. O ganho sobe e desce em rampa para não estalar.

/** Nome do processador registrado pelo worklet */
export const NOISE_GATE_PROCESSOR = 'echo-noise-gate'

export interface NoiseGateParams {
  enabled: boolean
  /** Nível (dBFS, RMS do bloco) a partir do qual a voz passa. Com `adaptive`, é o mínimo: o portão sobe sozinho acima disso. */
  thresholdDb: number
  /** Acompanha o piso de ruído do ambiente e mantém o limiar um pouco acima dele (veja ADAPTIVE_MARGIN_DB) */
  adaptive?: boolean
}

/**
 * Portão adaptativo. Um limiar fixo em dBFS não segue o ruído: com o ganho automático do microfone levantando o
 * ambiente (ou uma rua barulhenta), o ruído fica acima do limiar e o portão abre para ele o tempo todo. O piso
 * de ruído é o trecho mais baixo (blocos de 100 ms) dos últimos 4 s, que cobre as pausas entre palavras; o limiar
 * efetivo é o maior entre o escolhido nas configurações e esse piso + a margem. Não passa de ADAPTIVE_MAX_DB, para
 * uma sala muito barulhenta não fechar o portão em cima de quem fala alto.
 */
export const ADAPTIVE_MARGIN_DB = 12
export const ADAPTIVE_MAX_DB = -25
/**
 * O nível de um bloco de 128 amostras (2,7 ms) de ruído grave oscila mais de 6 dB, e os picos cruzavam o limiar e
 * reabriam o portão o tempo todo. No modo adaptativo a decisão usa a média dos últimos blocos (~20 ms).
 */
const SMOOTH_BLOCKS = 8
const FLOOR_CHUNK_MS = 100
const FLOOR_WINDOW_MS = 4000

export interface NoiseGateTiming {
  attackMs: number
  releaseMs: number
  holdMs: number
  /** Quantos dB abaixo do limiar o som precisa cair para o portão começar a fechar */
  hysteresisDb: number
}

export const DEFAULT_GATE_TIMING: NoiseGateTiming = {
  attackMs: 4,
  releaseMs: 120,
  holdMs: 250,
  hysteresisDb: 6
}

export function blockLevelDb(samples: Float32Array): number {
  if (samples.length === 0) return -Infinity
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  const rms = Math.sqrt(sum / samples.length)
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity
}

export class NoiseGate {
  private gain = 0
  private open = false
  private holdLeft = 0
  private readonly attackCoef: number
  private readonly releaseCoef: number
  private readonly holdSamples: number
  private readonly hysteresisDb: number
  // Piso de ruído: nível (dB) dos últimos blocos de 100 ms, o menor deles é o piso
  private readonly floorChunkSamples: number
  private readonly floorLevels: number[] = []
  private readonly floorMaxChunks: number
  private chunkPower = 0
  private chunkCount = 0
  private floorDb = -Infinity
  private readonly recentPowers: number[] = []

  constructor(sampleRate: number, timing: NoiseGateTiming = DEFAULT_GATE_TIMING) {
    this.floorChunkSamples = Math.round((FLOOR_CHUNK_MS / 1000) * sampleRate)
    this.floorMaxChunks = Math.round(FLOOR_WINDOW_MS / FLOOR_CHUNK_MS)
    const coef = (ms: number) => 1 - Math.exp(-1 / Math.max(1, (ms / 1000) * sampleRate))
    this.attackCoef = coef(timing.attackMs)
    this.releaseCoef = coef(timing.releaseMs)
    this.holdSamples = Math.round((timing.holdMs / 1000) * sampleRate)
    this.hysteresisDb = timing.hysteresisDb
  }

  get isOpen(): boolean {
    return this.open
  }

  /** Piso de ruído estimado (dBFS); -Infinity antes do primeiro bloco de 100 ms */
  get noiseFloorDb(): number {
    return this.floorDb
  }

  private trackFloor(input: Float32Array): void {
    for (let i = 0; i < input.length; i++) this.chunkPower += input[i] * input[i]
    this.chunkCount += input.length
    if (this.chunkCount < this.floorChunkSamples) return
    const rms = Math.sqrt(this.chunkPower / this.chunkCount)
    this.floorLevels.push(rms > 0 ? 20 * Math.log10(rms) : -120)
    if (this.floorLevels.length > this.floorMaxChunks) this.floorLevels.shift()
    this.floorDb = Math.min(...this.floorLevels)
    this.chunkPower = 0
    this.chunkCount = 0
  }

  /** Nível (dBFS) da média de potência dos últimos blocos */
  private smoothedLevelDb(input: Float32Array): number {
    let sum = 0
    for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
    this.recentPowers.push(input.length ? sum / input.length : 0)
    if (this.recentPowers.length > SMOOTH_BLOCKS) this.recentPowers.shift()
    const mean = this.recentPowers.reduce((a, b) => a + b, 0) / this.recentPowers.length
    return mean > 0 ? 10 * Math.log10(mean) : -Infinity
  }

  private effectiveThresholdDb(params: NoiseGateParams): number {
    if (!params.adaptive || !Number.isFinite(this.floorDb)) return params.thresholdDb
    const adaptive = Math.min(this.floorDb + ADAPTIVE_MARGIN_DB, ADAPTIVE_MAX_DB)
    return Math.max(params.thresholdDb, adaptive)
  }

  /** Processa um bloco. Devolve true se o estado aberto/fechado mudou neste bloco. */
  process(input: Float32Array, output: Float32Array, params: NoiseGateParams): boolean {
    const wasOpen = this.open

    if (!params.enabled) {
      output.set(input)
      this.gain = 1
      this.open = true
      this.holdLeft = this.holdSamples
      return wasOpen !== this.open
    }

    this.trackFloor(input)
    const thresholdDb = this.effectiveThresholdDb(params)
    const level = params.adaptive ? this.smoothedLevelDb(input) : blockLevelDb(input)
    if (level >= thresholdDb) {
      this.open = true
      this.holdLeft = this.holdSamples
    } else if (this.open) {
      if (level < thresholdDb - this.hysteresisDb) {
        this.holdLeft -= input.length
        if (this.holdLeft <= 0) this.open = false
      } else {
        // Ainda acima do ponto de fechamento: o hold recomeça (senão pausas curtas entre sílabas baixas se
        // somavam e o portão fechava no meio da frase)
        this.holdLeft = this.holdSamples
      }
    }

    const target = this.open ? 1 : 0
    const coef = this.open ? this.attackCoef : this.releaseCoef
    for (let i = 0; i < input.length; i++) {
      this.gain += (target - this.gain) * coef
      output[i] = input[i] * this.gain
    }
    return wasOpen !== this.open
  }
}
