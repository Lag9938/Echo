import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useUndoableDelete } from '../useUndoableDelete'

describe('useUndoableDelete', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  function setup(removeResult: { message: string } | null | Error = null) {
    const showToast = vi.fn()
    const job = {
      id: 'm1',
      message: 'removida',
      hide: vi.fn(),
      restore: vi.fn(),
      remove: vi.fn(async () => {
        if (removeResult instanceof Error) throw removeResult
        return removeResult
      })
    }
    const hook = renderHook(() => useUndoableDelete(showToast))
    return { showToast, job, hook }
  }

  it('esconde na hora e só apaga depois de 6 segundos', async () => {
    const { job, hook, showToast } = setup()
    act(() => hook.result.current(job))
    expect(job.hide).toHaveBeenCalledTimes(1)
    expect(job.remove).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('Mensagem Excluída', 'removida', 'info', undefined, expect.objectContaining({ actionLabel: 'Desfazer' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(6100) })
    expect(job.remove).toHaveBeenCalledTimes(1)
    expect(job.restore).not.toHaveBeenCalled()
  })

  it('Desfazer devolve a mensagem e cancela a exclusão', async () => {
    const { job, hook, showToast } = setup()
    act(() => hook.result.current(job))
    act(() => { showToast.mock.calls[0][4].onAction() })
    expect(job.restore).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(job.remove).not.toHaveBeenCalled()
  })

  it('se o servidor recusar, devolve a mensagem e avisa', async () => {
    const { job, hook, showToast } = setup({ message: 'sem permissão' })
    act(() => hook.result.current(job))
    await act(async () => { await vi.advanceTimersByTimeAsync(6100) })
    expect(job.restore).toHaveBeenCalledTimes(1)
    expect(showToast).toHaveBeenCalledWith('Erro ao Excluir', 'sem permissão', 'info')
  })

  it('se a chamada falhar por exceção, devolve a mensagem e avisa', async () => {
    const { job, hook, showToast } = setup(new Error('rede'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    act(() => hook.result.current(job))
    await act(async () => { await vi.advanceTimersByTimeAsync(6100) })
    expect(job.restore).toHaveBeenCalledTimes(1)
    expect(showToast).toHaveBeenCalledWith('Erro', expect.any(String), 'info')
  })

  it('clique repetido na mesma mensagem é ignorado', () => {
    const { job, hook } = setup()
    act(() => { hook.result.current(job); hook.result.current(job) })
    expect(job.hide).toHaveBeenCalledTimes(1)
  })

  it('ao desmontar, conclui a exclusão pendente', async () => {
    const { job, hook } = setup()
    act(() => hook.result.current(job))
    hook.unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(job.remove).toHaveBeenCalledTimes(1)
  })
})
