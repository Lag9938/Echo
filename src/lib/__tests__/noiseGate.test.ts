import { describe, it, expect } from 'vitest'
import { NoiseGate, blockLevelDb } from '../audio/noiseGate'
import { browserNoiseSuppression } from '../audio/noiseSuppression'

const SR = 48000
const BLOCK = 128

/** Bloco senoidal com o nível RMS pedido em dBFS */
function tone(levelDb: number): Float32Array {
  const amp = Math.pow(10, levelDb / 20) * Math.SQRT2
  return Float32Array.from({ length: BLOCK }, (_, i) => amp * Math.sin((2 * Math.PI * 440 * i) / SR))
}

/** Roda N blocos e devolve o nível de saída do último */
function run(gate: NoiseGate, levelDb: number, blocks: number, thresholdDb = -45, enabled = true): number {
  const out = new Float32Array(BLOCK)
  for (let b = 0; b < blocks; b++) gate.process(tone(levelDb), out, { enabled, thresholdDb })
  return blockLevelDb(out)
}

const msToBlocks = (ms: number) => Math.ceil((ms / 1000) * SR / BLOCK)

describe('NoiseGate', () => {
  it('mede o nível do bloco em dBFS', () => {
    expect(blockLevelDb(tone(-20))).toBeCloseTo(-20, 0)
    expect(blockLevelDb(new Float32Array(BLOCK))).toBe(-Infinity)
  })

  it('ruído abaixo do limiar é cortado', () => {
    const gate = new NoiseGate(SR)
    expect(run(gate, -60, 50)).toBeLessThan(-100)
    expect(gate.isOpen).toBe(false)
  })

  it('voz acima do limiar passa praticamente inteira', () => {
    const gate = new NoiseGate(SR)
    const level = run(gate, -20, 20)
    expect(gate.isOpen).toBe(true)
    expect(level).toBeGreaterThan(-20.5)
  })

  it('segura o portão aberto nas pausas curtas (hold) e fecha depois', () => {
    const gate = new NoiseGate(SR)
    run(gate, -20, 20)
    run(gate, -70, msToBlocks(150)) // pausa curta entre palavras
    expect(gate.isOpen).toBe(true)
    run(gate, -70, msToBlocks(200)) // silêncio de verdade
    expect(gate.isOpen).toBe(false)
  })

  it('histerese: um som logo abaixo do limiar não fecha o portão já aberto', () => {
    const gate = new NoiseGate(SR)
    run(gate, -20, 20)
    run(gate, -48, msToBlocks(1000)) // 3 dB abaixo do limiar, dentro dos 6 dB de histerese
    expect(gate.isOpen).toBe(true)
  })

  it('histerese reinicia o hold: pausas curtas entre sílabas baixas não se somam', () => {
    const gate = new NoiseGate(SR)
    run(gate, -20, 20)
    for (let k = 0; k < 6; k++) {
      run(gate, -60, msToBlocks(100)) // pausa de 100 ms (abaixo do ponto de fechamento)
      run(gate, -48, msToBlocks(150)) // sílaba baixa, dentro da histerese
    }
    expect(gate.isOpen).toBe(true)
  })

  it('o limiar escolhido é respeitado', () => {
    const sensitive = new NoiseGate(SR)
    run(sensitive, -50, 5, -55)
    expect(sensitive.isOpen).toBe(true)
    const strict = new NoiseGate(SR)
    run(strict, -50, 5, -30)
    expect(strict.isOpen).toBe(false)
  })

  it('desligado, deixa tudo passar sem alterar', () => {
    const gate = new NoiseGate(SR)
    const input = tone(-70)
    const out = new Float32Array(BLOCK)
    gate.process(input, out, { enabled: false, thresholdDb: -45 })
    expect(Array.from(out)).toEqual(Array.from(input))
  })

  it('abre em rampa, sem salto brusco (evita estalos)', () => {
    const gate = new NoiseGate(SR)
    run(gate, -70, 10)
    const input = tone(-10)
    const out = new Float32Array(BLOCK)
    gate.process(input, out, { enabled: true, thresholdDb: -45 })
    expect(Math.abs(out[1])).toBeLessThan(Math.abs(input[1]))
  })

  it('avisa quando o estado muda (para o indicador de "falando")', () => {
    const gate = new NoiseGate(SR)
    const out = new Float32Array(BLOCK)
    expect(gate.process(tone(-20), out, { enabled: true, thresholdDb: -45 })).toBe(true)
    expect(gate.process(tone(-20), out, { enabled: true, thresholdDb: -45 })).toBe(false)
  })
})

describe('NoiseGate adaptativo', () => {
  const adaptive = (gate: NoiseGate, levelDb: number, blocks: number, thresholdDb = -45): number => {
    const out = new Float32Array(BLOCK)
    for (let b = 0; b < blocks; b++) gate.process(tone(levelDb), out, { enabled: true, thresholdDb, adaptive: true })
    return blockLevelDb(out)
  }

  it('ruído constante acima do limiar fixo abre o portão fixo, mas o adaptativo o fecha', () => {
    const fixed = new NoiseGate(SR)
    run(fixed, -36, msToBlocks(3000))
    expect(fixed.isOpen).toBe(true)

    const smart = new NoiseGate(SR)
    expect(adaptive(smart, -36, msToBlocks(3000))).toBeLessThan(-100)
    expect(smart.isOpen).toBe(false)
    expect(smart.noiseFloorDb).toBeCloseTo(-36, 0)
  })

  it('a voz bem acima do ruído passa, e depois volta a fechar', () => {
    const gate = new NoiseGate(SR)
    adaptive(gate, -36, msToBlocks(3000))
    const speech = adaptive(gate, -20, msToBlocks(300))
    expect(gate.isOpen).toBe(true)
    expect(speech).toBeGreaterThan(-21)
    adaptive(gate, -36, msToBlocks(800))
    expect(gate.isOpen).toBe(false)
  })

  it('em sala silenciosa vale o limiar escolhido (o piso baixo não o reduz)', () => {
    const gate = new NoiseGate(SR)
    adaptive(gate, -80, msToBlocks(1000))
    adaptive(gate, -50, msToBlocks(200)) // abaixo do limiar de -45
    expect(gate.isOpen).toBe(false)
  })

  it('o piso não passa do teto: voz alta continua abrindo numa sala muito barulhenta', () => {
    const gate = new NoiseGate(SR)
    adaptive(gate, -22, msToBlocks(3000))
    expect(gate.noiseFloorDb).toBeCloseTo(-22, 0)
    adaptive(gate, -20, msToBlocks(300))
    expect(gate.isOpen).toBe(true)
  })

  it('sem o modo adaptativo o comportamento é o de sempre', () => {
    const gate = new NoiseGate(SR)
    run(gate, -36, msToBlocks(3000))
    expect(gate.isOpen).toBe(true)
  })
})

describe('supressão do navegador x IA', () => {
  it('desliga a do navegador quando a IA está ligada', () => {
    expect(browserNoiseSuppression(true, true)).toBe(false)
    expect(browserNoiseSuppression(true, false)).toBe(true)
    expect(browserNoiseSuppression(false, false)).toBe(false)
  })
})
