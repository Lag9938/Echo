import { describe, it, expect } from 'vitest'
import { gradeConnection, summarizeRtcStats } from '../rtcStats'

const report = (stats: any[]) => ({ forEach: (cb: (s: any) => void) => stats.forEach(cb) })

describe('summarizeRtcStats', () => {
  it('lê latência, jitter e perda entre duas medições', () => {
    const first = summarizeRtcStats(
      [report([
        { type: 'candidate-pair', nominated: true, currentRoundTripTime: 0.04 },
        { type: 'inbound-rtp', kind: 'audio', packetsReceived: 1000, packetsLost: 0, jitter: 0.004 }
      ])],
      null
    )
    expect(first.stats).toEqual({ ping: 40, jitter: 4, packetLoss: 0 })

    const second = summarizeRtcStats(
      [report([
        { type: 'candidate-pair', nominated: true, currentRoundTripTime: 0.06 },
        { type: 'inbound-rtp', kind: 'audio', packetsReceived: 1090, packetsLost: 10, jitter: 0.012 }
      ])],
      first.counters
    )
    // 90 recebidos e 10 perdidos no intervalo = 10%
    expect(second.stats).toEqual({ ping: 60, jitter: 12, packetLoss: 10 })
  })

  it('junta publicador e assinante e usa a média das latências', () => {
    const { stats } = summarizeRtcStats(
      [
        report([{ type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 0.03 }]),
        report([{ type: 'candidate-pair', nominated: true, currentRoundTripTime: 0.05 }])
      ],
      null
    )
    expect(stats?.ping).toBe(40)
  })

  it('devolve null sem nenhuma medição de latência e ignora pares não usados', () => {
    expect(summarizeRtcStats([report([{ type: 'inbound-rtp', kind: 'audio', packetsReceived: 5 }])], null).stats).toBeNull()
    expect(summarizeRtcStats([report([{ type: 'candidate-pair', nominated: false, state: 'waiting', currentRoundTripTime: 0.9 }])], null).stats).toBeNull()
    expect(summarizeRtcStats([undefined, null], null).stats).toBeNull()
  })

  it('não conta perda negativa quando o contador reinicia', () => {
    const a = summarizeRtcStats([report([{ type: 'candidate-pair', nominated: true, currentRoundTripTime: 0.02 }, { type: 'inbound-rtp', kind: 'audio', packetsReceived: 500, packetsLost: 5 }])], null)
    const b = summarizeRtcStats([report([{ type: 'candidate-pair', nominated: true, currentRoundTripTime: 0.02 }, { type: 'inbound-rtp', kind: 'audio', packetsReceived: 20, packetsLost: 0 }])], a.counters)
    expect(b.stats?.packetLoss).toBe(0)
  })
})

describe('gradeConnection', () => {
  it('classifica pela latência, perda e jitter', () => {
    expect(gradeConnection(null)).toBe('good')
    expect(gradeConnection({ ping: 40, jitter: 5, packetLoss: 0 })).toBe('good')
    expect(gradeConnection({ ping: 150, jitter: 5, packetLoss: 0 })).toBe('mid')
    expect(gradeConnection({ ping: 40, jitter: 5, packetLoss: 3 })).toBe('mid')
    expect(gradeConnection({ ping: 300, jitter: 5, packetLoss: 0 })).toBe('poor')
    expect(gradeConnection({ ping: 40, jitter: 5, packetLoss: 12 })).toBe('poor')
  })
})
