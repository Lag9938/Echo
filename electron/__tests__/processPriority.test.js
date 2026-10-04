import { describe, it, expect, vi } from 'vitest'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { applyStreamingPriority } from '../services/processPriority.js'

const priorities = { PRIORITY_ABOVE_NORMAL: -7, PRIORITY_NORMAL: 0 }

describe('applyStreamingPriority', () => {
  it('sobe todos os processos do app para "acima do normal" e depois devolve ao normal', () => {
    const setPriority = vi.fn()
    const getAppMetrics = () => [{ pid: 10, type: 'Browser' }, { pid: 11, type: 'GPU' }, { pid: 12, type: 'Tab' }]

    expect(applyStreamingPriority(true, { getAppMetrics, setPriority, priorities, platform: 'win32' })).toBe(3)
    expect(setPriority.mock.calls).toEqual([[10, -7], [11, -7], [12, -7]])

    setPriority.mockClear()
    applyStreamingPriority(false, { getAppMetrics, setPriority, priorities, platform: 'win32' })
    expect(setPriority.mock.calls).toEqual([[10, 0], [11, 0], [12, 0]])
  })

  it('processo que já fechou (ou sem permissão) não derruba os outros', () => {
    const setPriority = vi.fn((pid) => { if (pid === 11) throw new Error('ESRCH') })
    const getAppMetrics = () => [{ pid: 10 }, { pid: 11 }, { pid: 12 }, null, { pid: 'x' }]
    expect(applyStreamingPriority(true, { getAppMetrics, setPriority, priorities, platform: 'win32' })).toBe(2)
  })

  it('fora do Windows não mexe em nada', () => {
    const setPriority = vi.fn()
    expect(applyStreamingPriority(true, { getAppMetrics: () => [{ pid: 1 }], setPriority, priorities, platform: 'linux' })).toBe(0)
    expect(setPriority).not.toHaveBeenCalled()
  })
})

// Confere no Windows de verdade que dá para mudar a prioridade de um processo FILHO (é o caso do processo de
// GPU e das janelas do Electron), sem precisar de administrador.
describe.runIf(process.platform === 'win32')('applyStreamingPriority (execução real no Windows)', () => {
  it('muda a prioridade de um processo filho e devolve ao normal', async () => {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 15000)'], { stdio: 'ignore' })
    try {
      await vi.waitFor(() => expect(child.pid).toBeTypeOf('number'))
      const getAppMetrics = () => [{ pid: child.pid }]

      expect(applyStreamingPriority(true, { getAppMetrics })).toBe(1)
      expect(os.getPriority(child.pid)).toBe(os.constants.priority.PRIORITY_ABOVE_NORMAL)

      applyStreamingPriority(false, { getAppMetrics })
      expect(os.getPriority(child.pid)).toBe(os.constants.priority.PRIORITY_NORMAL)
    } finally {
      child.kill()
    }
  })
})
