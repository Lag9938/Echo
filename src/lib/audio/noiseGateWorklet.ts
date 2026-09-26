// AudioWorklet do Noise Gate. Carregado com `import url from './noiseGateWorklet.ts?worker&url'`
// (o Vite empacota este arquivo junto com noiseGate.ts num módulo só) e registrado com audioWorklet.addModule.
import { NOISE_GATE_PROCESSOR, NoiseGate } from './noiseGate'

// Tipos do escopo do AudioWorklet (não fazem parte da lib DOM do TypeScript)
declare const sampleRate: number
declare function registerProcessor(name: string, ctor: unknown): void
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}

class NoiseGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'enabled', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'thresholdDb', defaultValue: -45, minValue: -100, maxValue: 0, automationRate: 'k-rate' }
    ]
  }

  private readonly gate = new NoiseGate(sampleRate)

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0]?.[0]
    const output = outputs[0]
    if (!output || output.length === 0) return true
    if (!input) {
      output.forEach(ch => ch.fill(0))
      return true
    }

    const changed = this.gate.process(input, output[0], {
      enabled: parameters.enabled[0] >= 0.5,
      thresholdDb: parameters.thresholdDb[0]
    })
    for (let c = 1; c < output.length; c++) output[c].set(output[0])
    // Avisa a thread principal para o indicador de "falando" seguir o portão
    if (changed) this.port.postMessage({ open: this.gate.isOpen })
    return true
  }
}

registerProcessor(NOISE_GATE_PROCESSOR, NoiseGateProcessor)
