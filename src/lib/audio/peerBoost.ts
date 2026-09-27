// Volume acima de 100% para a voz dos outros participantes.
//
// Um <audio> só aceita volume de 0 a 1, então o controle de 100–200% do app não fazia nada: a voz ficava
// no máximo normal. Acima de 100% o som passa por um ganho do Web Audio (GainNode) e o elemento fica mudo.
// O elemento continua ligado à mesma MediaStream de propósito: no Chromium a voz de uma chamada só chega ao
// Web Audio se estiver anexada a um elemento (mesmo mudo). Até 100% nada muda: segue o caminho normal do <audio>.

interface BoostNode {
  stream: MediaStream
  source: MediaStreamAudioSourceNode
  gain: GainNode
  limiter: DynamicsCompressorNode
}

export const MAX_PEER_VOLUME = 2

export class PeerBoost {
  private ctx: AudioContext | null = null
  private nodes = new Map<string, BoostNode>()
  private sinkId = 'default'

  private getContext(): AudioContext | null {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx
    try {
      this.ctx = new AudioContext()
      this.applySink(this.ctx)
      return this.ctx
    } catch {
      return null
    }
  }

  private applySink(ctx: AudioContext) {
    const setSinkId = (ctx as any).setSinkId
    if (typeof setSinkId === 'function') {
      // 'default' vira '' (dispositivo padrão) no AudioContext
      Promise.resolve(setSinkId.call(ctx, this.sinkId === 'default' ? '' : this.sinkId)).catch(() => {})
    }
  }

  /** Dispositivo de saída escolhido pela pessoa: o caminho com ganho precisa ir para o mesmo lugar do <audio> */
  setSinkId(deviceId: string) {
    this.sinkId = deviceId
    if (this.ctx && this.ctx.state !== 'closed') this.applySink(this.ctx)
  }

  /**
   * Aplica volume (0 a 2) e mudo a um elemento de voz.
   * `muted` é tudo que silencia a pessoa por outro motivo (ensurdecido, etc.).
   */
  apply(key: string, audio: HTMLAudioElement, volume: number, muted: boolean) {
    const clamped = Math.max(0, Math.min(MAX_PEER_VOLUME, volume))
    const stream = audio.srcObject instanceof MediaStream ? audio.srcObject : null

    if (clamped > 1 && !muted && stream && stream.getAudioTracks().length > 0) {
      const node = this.ensureNode(key, stream)
      if (node) {
        node.gain.gain.value = clamped
        audio.volume = 1
        audio.muted = true
        return
      }
      // Sem Web Audio disponível: cai para o volume máximo do elemento
    }

    this.release(key)
    audio.volume = Math.min(1, clamped)
    audio.muted = muted || clamped === 0
  }

  private ensureNode(key: string, stream: MediaStream): BoostNode | null {
    const existing = this.nodes.get(key)
    if (existing && existing.stream === stream) return existing
    if (existing) this.release(key)

    const ctx = this.getContext()
    if (!ctx) return null
    try {
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
      const source = ctx.createMediaStreamSource(stream)
      const gain = ctx.createGain()
      // Limitador suave: o reforço não estoura em estalos quando a pessoa já fala alto
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -3
      limiter.knee.value = 0
      limiter.ratio.value = 20
      limiter.attack.value = 0.003
      limiter.release.value = 0.1
      source.connect(gain)
      gain.connect(limiter)
      limiter.connect(ctx.destination)
      const node = { stream, source, gain, limiter }
      this.nodes.set(key, node)
      return node
    } catch {
      return null
    }
  }

  /** Desfaz o caminho com ganho (volume voltou a ≤100%, a pessoa saiu ou a chamada acabou) */
  release(key: string) {
    const node = this.nodes.get(key)
    if (!node) return
    this.nodes.delete(key)
    try { node.source.disconnect() } catch {}
    try { node.gain.disconnect() } catch {}
    try { node.limiter.disconnect() } catch {}
  }

  releaseAll() {
    for (const key of [...this.nodes.keys()]) this.release(key)
  }

  isBoosting(key: string): boolean {
    return this.nodes.has(key)
  }
}
