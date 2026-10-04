import { describe, it, expect } from 'vitest'
import {
  applyThreadMessage,
  applyThreadReplyDeleted,
  applyThreadRootDeleted,
  formatReplyCount,
  isMissingThreadColumn,
  mergeThreadReply,
  planThreadReplyNotice,
  summariesFromRows,
  type ThreadSummaries
} from '../threads'

const summary = (rootId: string, replyCount: number, participantIds: string[] = ['a']): ThreadSummaries => ({
  [rootId]: { rootId, replyCount, lastReplyAt: '2026-10-04T12:00:00Z', participantIds }
})

describe('resumo dos tópicos', () => {
  it('converte as linhas do banco e ignora o que vier quebrado ou sem respostas', () => {
    const rows = [
      { root_id: 'r1', reply_count: 3, last_reply_at: '2026-10-04T12:00:00Z', participant_ids: ['a', 'b'] },
      { root_id: 'r2', reply_count: 0, last_reply_at: null, participant_ids: [] },
      { reply_count: 5 },
      null
    ]
    expect(summariesFromRows(rows)).toEqual({
      r1: { rootId: 'r1', replyCount: 3, lastReplyAt: '2026-10-04T12:00:00Z', participantIds: ['a', 'b'] }
    })
    expect(summariesFromRows(null)).toEqual({})
  })

  it('resposta nova: vale a contagem que o banco mandou (a mesma resposta chegando duas vezes não conta em dobro)', () => {
    const payload = {
      id: 'm9', author_id: 'b', created_at: '2026-10-04T13:00:00Z', thread_root_id: 'r1',
      thread: { root_id: 'r1', reply_count: 4, last_reply_at: '2026-10-04T13:00:00Z', participant_ids: ['a', 'b'] }
    }
    const once = applyThreadMessage(summary('r1', 3), payload)
    const twice = applyThreadMessage(once, payload)
    expect(once.r1).toEqual({ rootId: 'r1', replyCount: 4, lastReplyAt: '2026-10-04T13:00:00Z', participantIds: ['a', 'b'] })
    expect(twice.r1.replyCount).toBe(4)
  })

  it('primeira resposta cria o tópico no resumo; aviso sem o resumo do banco soma um', () => {
    const created = applyThreadMessage({}, { id: 'm1', author_id: 'b', created_at: '2026-10-04T13:00:00Z', thread_root_id: 'r7' })
    expect(created.r7).toEqual({ rootId: 'r7', replyCount: 1, lastReplyAt: '2026-10-04T13:00:00Z', participantIds: ['b'] })
    expect(applyThreadMessage(summary('r1', 2), { id: 'x', author_id: 'c', thread_root_id: 'r1' }).r1.replyCount).toBe(3)
  })

  it('aviso que não é de tópico não muda nada', () => {
    const before = summary('r1', 2)
    expect(applyThreadMessage(before, { id: 'm1' })).toBe(before)
  })

  it('resposta apagada diminui a contagem e o tópico some quando chega a zero', () => {
    expect(applyThreadReplyDeleted(summary('r1', 2), 'r1').r1.replyCount).toBe(1)
    expect(applyThreadReplyDeleted(summary('r1', 1), 'r1')).toEqual({})
    const before = summary('r1', 1)
    expect(applyThreadReplyDeleted(before, 'outro')).toBe(before)
    expect(applyThreadReplyDeleted(before, null)).toBe(before)
  })

  it('mensagem-raiz apagada leva o tópico junto', () => {
    expect(applyThreadRootDeleted(summary('r1', 5), 'r1')).toEqual({})
    const before = summary('r1', 5)
    expect(applyThreadRootDeleted(before, 'mensagem-comum')).toBe(before)
  })

  it('escreve "1 resposta" e "N respostas"', () => {
    expect(formatReplyCount(1)).toBe('1 resposta')
    expect(formatReplyCount(12)).toBe('12 respostas')
  })
})

describe('lista de respostas do tópico aberto', () => {
  const reply = (id: string, extra: Record<string, unknown> = {}) =>
    ({ id, body: id, created_at: '2026-10-04T12:00:00Z', author_id: 'a', ...extra }) as any

  it('acrescenta resposta nova no fim', () => {
    expect(mergeThreadReply([reply('a')], reply('b')).map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('a mesma resposta chegando de novo (envio + tempo real) não duplica', () => {
    const list = mergeThreadReply([reply('a')], reply('a', { body: 'atualizada' }))
    expect(list).toHaveLength(1)
    expect(list[0].body).toBe('atualizada')
  })

  it('a confirmação do banco troca a resposta temporária pela oficial', () => {
    const sending = reply('temp-1', { tempId: 'temp-1', status: 'sending' })
    const list = mergeThreadReply([sending], reply('db-1', { tempId: 'temp-1', status: 'sent' }))
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: 'db-1', status: 'sent' })
  })
})

describe('aviso de resposta em tópico (caixa de entrada)', () => {
  const context = (overrides: Record<string, unknown> = {}) => ({
    myUserId: 'me',
    knownChannels: [{ id: 'c1', name: 'geral', space_id: 's1' }],
    currentChannelId: 'outro-canal',
    openThreadRootId: null,
    mutedSpaceIds: new Set<string>(),
    appFocused: true,
    ...overrides
  })
  const notice = { channelId: 'c1', rootId: 'r1', messageId: 'm1', senderId: 'ana', senderName: 'Ana' }

  it('com outro canal aberto: marca o tópico e o canal como não lidos, sem notificação do sistema', () => {
    expect(planThreadReplyNotice(notice, context())).toEqual({ rootId: 'r1', channelId: 'c1', markChannelUnread: true, notification: null })
  })

  it('com o app em segundo plano: notifica, dizendo quem respondeu e onde', () => {
    const action = planThreadReplyNotice(notice, context({ appFocused: false }))
    expect(action?.notification?.title).toBe('Nova resposta em um tópico de #geral')
    expect(action?.notification?.body).toContain('Ana')
  })

  it('espaço silenciado não notifica, mas o tópico fica marcado', () => {
    const action = planThreadReplyNotice(notice, context({ appFocused: false, mutedSpaceIds: new Set(['s1']) }))
    expect(action).toMatchObject({ rootId: 'r1', notification: null })
  })

  it('no próprio canal, com o tópico fechado: marca só o tópico (o canal já está aberto)', () => {
    expect(planThreadReplyNotice(notice, context({ currentChannelId: 'c1' }))).toMatchObject({ markChannelUnread: false })
  })

  it('com o tópico aberto na tela, não faz nada', () => {
    expect(planThreadReplyNotice(notice, context({ currentChannelId: 'c1', openThreadRootId: 'r1' }))).toBeNull()
  })

  it('ignora aviso incompleto, resposta minha e canal que este app não conhece', () => {
    expect(planThreadReplyNotice(null, context())).toBeNull()
    expect(planThreadReplyNotice({ channelId: 'c1' }, context())).toBeNull()
    expect(planThreadReplyNotice({ ...notice, senderId: 'me' }, context())).toBeNull()
    expect(planThreadReplyNotice({ ...notice, channelId: 'canal-que-nao-vejo' }, context())).toBeNull()
  })
})

describe('banco sem a migração 14', () => {
  it('reconhece o erro de coluna de tópico inexistente', () => {
    expect(isMissingThreadColumn({ code: '42703', message: 'column messages.thread_root_id does not exist' })).toBe(true)
    expect(isMissingThreadColumn({ code: 'PGRST204', message: "Could not find the 'thread_root_id' column of 'messages'" })).toBe(true)
  })

  it('outros erros não são confundidos com isso', () => {
    expect(isMissingThreadColumn({ code: '42703', message: 'column messages.outra does not exist' })).toBe(false)
    expect(isMissingThreadColumn({ code: '42501', message: 'permission denied' })).toBe(false)
    expect(isMissingThreadColumn(null)).toBe(false)
  })
})
