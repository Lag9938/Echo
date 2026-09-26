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
  /** Nível (dBFS, RMS do bloco) a partir do qual a voz passa */
  thresholdDb: number
}

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

  constructor(sampleRate: number, timing: NoiseGateTiming = DEFAULT_GATE_TIMING) {
    const coef = (ms: number) => 1 - Math.exp(-1 / Math.max(1, (ms / 1000) * sampleRate))
    this.attackCoef = coef(timing.attackMs)
    this.releaseCoef = coef(timing.releaseMs)
    this.holdSamples = Math.round((timing.holdMs / 1000) * sampleRate)
    this.hysteresisDb = timing.hysteresisDb
  }

  get isOpen(): boolean {
    return this.open
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

    const level = blockLevelDb(input)
    if (level >= params.thresholdDb) {
      this.open = true
      this.holdLeft = this.holdSamples
    } else if (this.open && level < params.thresholdDb - this.hysteresisDb) {
      this.holdLeft -= input.length
      if (this.holdLeft <= 0) this.open = false
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
