import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEchoThreads } from '../useEchoThreads'
import { useThreadsStore } from '../../stores/useThreadsStore'
import { MESSAGE_DELETED_EVENT, THREAD_MESSAGE_EVENT } from '../../lib/threads'

const ME = 'me'
const channel = { id: 'c1', name: 'geral', type: 'text', space_id: 's1' } as any
const root = { id: 'r1', channel_id: 'c1', author_id: 'ana', body: 'vamos marcar?', created_at: '2026-10-04T12:00:00Z', status: 'sent' } as any
const row = (id: string, extra: Record<string, unknown> = {}) => ({
  id, channel_id: 'c1', author_id: 'ana', body: `resposta ${id}`, created_at: '2026-10-04T12:05:00Z', thread_root_id: 'r1',
  profiles: { display_name: 'Ana' }, ...extra
})

function makeSupabase(options: { summaries?: any; summariesError?: any; replies?: any[]; insertResult?: any; deleteError?: any } = {}) {
  const calls = { inserts: [] as any[], deletes: [] as string[], replyQueries: [] as string[] }
  const supabase = {
    rpc: vi.fn().mockResolvedValue({ data: options.summaries ?? [], error: options.summariesError ?? null }),
    from: vi.fn(() => ({
      select: () => ({
        eq: (_column: string, value: string) => {
          calls.replyQueries.push(value)
          return { order: () => ({ limit: () => Promise.resolve({ data: options.replies ?? [], error: null }) }) }
        }
      }),
      insert: (payload: any) => {
        calls.inserts.push(payload)
        return { select: () => ({ single: () => Promise.resolve(options.insertResult ?? { data: row('db-1', { author_id: ME, body: payload.body }), error: null }) }) }
      },
      delete: () => ({
        eq: (_column: string, id: string) => {
          calls.deletes.push(id)
          return Promise.resolve({ error: options.deleteError ?? null })
        }
      })
    }))
  }
  return { supabase, calls }
}

const render = (supabase: any, ch: any = channel) =>
  renderHook(({ current }: { current: any }) => useEchoThreads({ supabase, user: { id: ME } as any, channel: current, profileDisplayName: 'Eu' }), {
    initialProps: { current: ch }
  })

const emit = (name: string, detail: unknown) => act(() => { window.dispatchEvent(new CustomEvent(name, { detail })) })

describe('useEchoThreads', () => {
  beforeEach(() => act(() => useThreadsStore.getState().reset()))

  it('carrega o resumo dos tópicos do canal aberto', async () => {
    const { supabase } = makeSupabase({ summaries: [{ root_id: 'r1', reply_count: 2, last_reply_at: '2026-10-04T12:05:00Z', participant_ids: ['ana'] }] })
    const { result } = render(supabase)

    await waitFor(() => expect(result.current.enabled).toBe(true))
    expect(supabase.rpc).toHaveBeenCalledWith('get_thread_summaries', { p_channel_id: 'c1' })
    expect(result.current.summaries.r1.replyCount).toBe(2)
  })

  it('banco sem a migração (função não existe): tópicos ficam desligados e nada quebra', async () => {
    const { supabase } = makeSupabase({ summariesError: { code: 'PGRST202', message: 'function not found' } })
    const { result } = render(supabase)
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(result.current.enabled).toBe(false)
    expect(result.current.summaries).toEqual({})
  })

  it('canal de voz (ou nenhum canal) não busca tópicos', () => {
    const { supabase } = makeSupabase()
    render(supabase, { ...channel, type: 'voice' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('abrir um tópico busca as respostas dele e tira a marca de não lido', async () => {
    const { supabase, calls } = makeSupabase({ replies: [row('a'), row('b')] })
    act(() => useThreadsStore.getState().markUnread('r1', 'c1'))
    const { result } = render(supabase)

    await act(async () => { await result.current.openThread(root) })

    expect(calls.replyQueries).toEqual(['r1'])
    expect(result.current.openRoot?.id).toBe('r1')
    expect(result.current.replies.map((r) => r.id)).toEqual(['a', 'b'])
    expect(result.current.replies[0].profile?.display_name).toBe('Ana')
    expect(useThreadsStore.getState().unreadRoots).toEqual({})
    expect(useThreadsStore.getState().openRootId).toBe('r1')
  })

  it('responder grava com o vínculo do tópico e troca a resposta temporária pela oficial', async () => {
    const { supabase, calls } = makeSupabase()
    const { result } = render(supabase)
    await act(async () => { await result.current.openThread(root) })

    let ok = false
    await act(async () => { ok = await result.current.sendReply('  sexta às 21h ') })

    expect(ok).toBe(true)
    expect(calls.inserts).toEqual([{ channel_id: 'c1', author_id: ME, body: 'sexta às 21h', thread_root_id: 'r1' }])
    expect(result.current.replies).toHaveLength(1)
    expect(result.current.replies[0]).toMatchObject({ id: 'db-1', status: 'sent' })
    // O chat principal já mostra o tópico mesmo que o aviso em tempo real demore
    expect(result.current.summaries.r1.replyCount).toBe(1)
  })

  it('resposta recusada pelo banco fica na lista como falha, com aviso, e pode ser reenviada', async () => {
    const { supabase, calls } = makeSupabase({ insertResult: { data: null, error: { message: 'new row violates row-level security' } } })
    const { result } = render(supabase)
    await act(async () => { await result.current.openThread(root) })

    await act(async () => { await result.current.sendReply('oi') })
    expect(result.current.replies[0].status).toBe('failed')
    expect(result.current.notice).toMatch(/Não foi possível enviar/)

    await act(async () => { result.current.retryReply(result.current.replies[0]) })
    await waitFor(() => expect(calls.inserts).toHaveLength(2))
    expect(result.current.replies).toHaveLength(1)
  })

  it('sem tópico aberto ou com texto vazio não envia nada', async () => {
    const { supabase, calls } = makeSupabase()
    const { result } = render(supabase)
    await act(async () => { await result.current.sendReply('oi') })
    await act(async () => { await result.current.openThread(root) })
    await act(async () => { await result.current.sendReply('   ') })
    expect(calls.inserts).toEqual([])
  })

  it('resposta que chega em tempo real atualiza o resumo e entra no tópico aberto, sem duplicar', async () => {
    const { supabase } = makeSupabase()
    const { result } = render(supabase)
    await act(async () => { await result.current.openThread(root) })
    const payload = { ...row('live-1'), profile: { display_name: 'Bia' }, thread: { root_id: 'r1', reply_count: 1, last_reply_at: '2026-10-04T12:06:00Z', participant_ids: ['ana', 'bia'] } }

    emit(THREAD_MESSAGE_EVENT, payload)
    emit(THREAD_MESSAGE_EVENT, payload)

    expect(result.current.replies.map((r) => r.id)).toEqual(['live-1'])
    expect(result.current.summaries.r1).toMatchObject({ replyCount: 1, participantIds: ['ana', 'bia'] })
  })

  it('resposta de outro tópico só atualiza o resumo; de outro canal é ignorada', async () => {
    const { supabase } = makeSupabase()
    const { result } = render(supabase)
    await act(async () => { await result.current.openThread(root) })

    emit(THREAD_MESSAGE_EVENT, { ...row('x', { thread_root_id: 'r2' }), thread: { root_id: 'r2', reply_count: 1 } })
    emit(THREAD_MESSAGE_EVENT, { ...row('y', { channel_id: 'outro' }), thread: { root_id: 'r9', reply_count: 1 } })

    expect(result.current.replies).toEqual([])
    expect(Object.keys(result.current.summaries)).toEqual(['r2'])
  })

  it('resposta apagada sai do tópico e do resumo; raiz apagada fecha o tópico', async () => {
    const { supabase } = makeSupabase({
      summaries: [{ root_id: 'r1', reply_count: 2, last_reply_at: '2026-10-04T12:05:00Z', participant_ids: ['ana'] }],
      replies: [row('a'), row('b')]
    })
    const { result } = render(supabase)
    await waitFor(() => expect(result.current.enabled).toBe(true))
    await act(async () => { await result.current.openThread(root) })

    emit(MESSAGE_DELETED_EVENT, { id: 'a', channel_id: 'c1', thread_root_id: 'r1' })
    expect(result.current.replies.map((r) => r.id)).toEqual(['b'])
    expect(result.current.summaries.r1.replyCount).toBe(1)

    emit(MESSAGE_DELETED_EVENT, { id: 'r1', channel_id: 'c1', thread_root_id: null })
    expect(result.current.openRoot).toBeNull()
    expect(result.current.summaries).toEqual({})
    expect(useThreadsStore.getState().openRootId).toBeNull()
  })

  it('excluir resposta apaga no banco e tira da lista', async () => {
    const { supabase, calls } = makeSupabase({ replies: [row('a')] })
    const { result } = render(supabase)
    await act(async () => { await result.current.openThread(root) })

    await act(async () => { await result.current.deleteReply('a') })

    expect(calls.deletes).toEqual(['a'])
    expect(result.current.replies).toEqual([])
  })

  it('trocar de canal fecha o tópico e busca o resumo do canal novo', async () => {
    const { supabase } = makeSupabase()
    const { result, rerender } = render(supabase)
    await act(async () => { await result.current.openThread(root) })

    rerender({ current: { ...channel, id: 'c2' } })

    await waitFor(() => expect(supabase.rpc).toHaveBeenLastCalledWith('get_thread_summaries', { p_channel_id: 'c2' }))
    expect(result.current.openRoot).toBeNull()
    expect(useThreadsStore.getState().openRootId).toBeNull()
  })
})
