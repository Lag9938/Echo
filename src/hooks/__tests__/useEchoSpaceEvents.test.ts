/// <reference types="node" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { useEchoSpaceEvents } from '../useEchoSpaceEvents'
import { emitNotice, onNotice, planSpaceEventChannels } from '../../lib/realtimeNotices'

const SPACE_A = 'aaaaaaaa-0000-4000-8000-00000000000a'
const SPACE_B = 'bbbbbbbb-0000-4000-8000-00000000000b'

describe('avisos do banco: barramento', () => {
  it('quem escuta recebe o aviso e para de receber depois de cancelar', () => {
    const seen: any[] = []
    const stop = onNotice('space-membership', (notice) => seen.push(notice))
    emitNotice('space-membership', { space_id: SPACE_A, op: 'INSERT' })
    emitNotice('members-changed', { space_id: SPACE_A })
    stop()
    emitNotice('space-membership', { space_id: SPACE_B, op: 'DELETE' })
    expect(seen).toEqual([{ space_id: SPACE_A, op: 'INSERT' }])
  })

  it('aviso vazio (canal mandou sem conteúdo) não dispara nada', () => {
    const handler = vi.fn()
    const stop = onNotice('channel-activity', handler)
    emitNotice('channel-activity', undefined)
    emitNotice('channel-activity', null)
    stop()
    expect(handler).not.toHaveBeenCalled()
  })

  it('planeja só a diferença: entra nos espaços novos, sai dos que saíram e ignora espaços de demonstração', () => {
    expect(planSpaceEventChannels([SPACE_A], [SPACE_A, SPACE_B, 'mock-space-1'])).toEqual({ join: [SPACE_B], leave: [] })
    expect(planSpaceEventChannels([SPACE_A, SPACE_B], [SPACE_B])).toEqual({ join: [], leave: [SPACE_A] })
    expect(planSpaceEventChannels([], [])).toEqual({ join: [], leave: [] })
  })
})

describe('useEchoSpaceEvents', () => {
  let channels: Record<string, { handlers: Record<string, (event: { payload: any }) => void>; channel: any }>
  let supabase: any

  beforeEach(() => {
    channels = {}
    supabase = {
      channel: vi.fn((topic: string, _options: any) => {
        const handlers: Record<string, (event: { payload: any }) => void> = {}
        const channel: any = {
          topic,
          on: vi.fn((_kind: string, filter: { event: string }, handler: (event: { payload: any }) => void) => {
            handlers[filter.event] = handler
            return channel
          }),
          subscribe: vi.fn()
        }
        channels[topic] = { handlers, channel }
        return channel
      }),
      removeChannel: vi.fn()
    }
  })

  it('abre um canal PRIVADO por espaço e só usa broadcast', () => {
    renderHook(() => useEchoSpaceEvents({ supabase, userId: 'eu', spaceIds: [SPACE_A, SPACE_B] }))

    expect(Object.keys(channels).sort()).toEqual([`space-events-${SPACE_A}`, `space-events-${SPACE_B}`])
    for (const call of supabase.channel.mock.calls) expect(call[1]).toEqual({ config: { private: true } })
    for (const { channel } of Object.values(channels)) {
      expect(channel.subscribe).toHaveBeenCalledTimes(1)
      expect(channel.on.mock.calls.every(([kind]: [string]) => kind === 'broadcast')).toBe(true)
    }
  })

  it('repassa os avisos do espaço para quem escuta no app', () => {
    const activity: any[] = []
    const members: any[] = []
    const stops = [onNotice('channel-activity', (n) => activity.push(n)), onNotice('members-changed', (n) => members.push(n))]
    renderHook(() => useEchoSpaceEvents({ supabase, userId: 'eu', spaceIds: [SPACE_A] }))

    const { handlers } = channels[`space-events-${SPACE_A}`]
    handlers['channel-activity']({ payload: { id: 'm1', channel_id: 'c1', author_id: 'ana', body: 'oi' } })
    handlers['members-changed']({ payload: { space_id: SPACE_A, op: 'INSERT' } })
    stops.forEach((stop) => stop())

    expect(activity).toEqual([{ id: 'm1', channel_id: 'c1', author_id: 'ana', body: 'oi' }])
    expect(members).toEqual([{ space_id: SPACE_A, op: 'INSERT' }])
  })

  it('ao entrar em outro espaço não refaz os canais que já existem; ao sair fecha só o daquele espaço', () => {
    const { rerender } = renderHook(({ ids }) => useEchoSpaceEvents({ supabase, userId: 'eu', spaceIds: ids }), {
      initialProps: { ids: [SPACE_A] }
    })
    expect(supabase.channel).toHaveBeenCalledTimes(1)

    rerender({ ids: [SPACE_B, SPACE_A] })
    expect(supabase.channel).toHaveBeenCalledTimes(2)
    expect(supabase.removeChannel).not.toHaveBeenCalled()

    rerender({ ids: [SPACE_B] })
    expect(supabase.channel).toHaveBeenCalledTimes(2)
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1)
    expect(supabase.removeChannel).toHaveBeenCalledWith(channels[`space-events-${SPACE_A}`].channel)
  })

  it('ao desmontar (sair da conta) fecha todos os canais', () => {
    const { unmount } = renderHook(() => useEchoSpaceEvents({ supabase, userId: 'eu', spaceIds: [SPACE_A, SPACE_B] }))
    unmount()
    expect(supabase.removeChannel).toHaveBeenCalledTimes(2)
  })

  it('sem usuário não abre canal nenhum', () => {
    renderHook(() => useEchoSpaceEvents({ supabase, userId: undefined, spaceIds: [SPACE_A] }))
    expect(supabase.channel).not.toHaveBeenCalled()
  })
})

// Enquanto existir um ouvinte de tabela, o acesso público do Realtime não pode ser desligado e o banco volta
// a gastar tempo conferindo linha por linha. Este teste impede que um ouvinte novo entre sem ninguém notar.
describe('nenhum ouvinte de tabela (postgres_changes) no app nem no bot', () => {
  const root = path.resolve(__dirname, '../../..')
  function sourceFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return ['node_modules', '__tests__', 'test'].includes(entry.name) ? [] : sourceFiles(full)
      return /\.(ts|tsx|js|mjs|cjs)$/.test(entry.name) ? [full] : []
    })
  }

  it('o código do app e do bot de música não assina postgres_changes', () => {
    const files = [...sourceFiles(path.join(root, 'src')), ...sourceFiles(path.join(root, 'music-bot', 'src'))]
    expect(files.length).toBeGreaterThan(50)
    const offenders = files.filter((file) => /\.on\(\s*['"]postgres_changes['"]/.test(fs.readFileSync(file, 'utf8')))
    expect(offenders.map((file) => path.relative(root, file))).toEqual([])
  })

  it('todo canal do Realtime aberto pelo app é privado', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(path.join(root, 'src'))) {
      const text = fs.readFileSync(file, 'utf8')
      for (const match of text.matchAll(/\.channel\(([^\n]*)/g)) {
        const index = match.index ?? 0
        // O objeto de opções pode vir nas linhas seguintes
        if (!/private:\s*true/.test(text.slice(index, index + 400))) offenders.push(`${path.relative(root, file)}: ${match[0].trim()}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
