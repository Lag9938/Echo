import { useEffect, useRef } from 'react'
import { SPACE_EVENT_NAMES, emitNotice, planSpaceEventChannels } from '../lib/realtimeNotices'

export interface UseEchoSpaceEventsOptions {
  supabase: any
  userId?: string
  spaceIds: string[]
}

// Um canal privado por espaço de que o usuário participa (space-events-<espaço>, só membros leem).
// O banco publica nele as mensagens novas dos canais que todo membro vê e as mudanças de membros, cargos e
// dados do espaço; antes isso vinha de ouvintes de tabela em canais públicos.
export function useEchoSpaceEvents({ supabase, userId, spaceIds }: UseEchoSpaceEventsOptions) {
  const channelsRef = useRef<Map<string, any>>(new Map())
  const spaceKey = [...spaceIds].sort().join(',')

  useEffect(() => {
    const channels = channelsRef.current
    const wanted = supabase && userId && spaceKey ? spaceKey.split(',') : []
    const { join, leave } = planSpaceEventChannels(channels.keys(), wanted)

    for (const spaceId of leave) {
      supabase?.removeChannel(channels.get(spaceId))
      channels.delete(spaceId)
    }
    for (const spaceId of join) {
      const channel = supabase.channel(`space-events-${spaceId}`, { config: { private: true } })
      for (const name of SPACE_EVENT_NAMES) {
        channel.on('broadcast', { event: name }, ({ payload }: { payload: any }) => emitNotice(name, payload))
      }
      channel.subscribe()
      channels.set(spaceId, channel)
    }
  }, [supabase, userId, spaceKey])

  // Ao sair da conta (ou desmontar), fecha tudo
  useEffect(() => {
    const channels = channelsRef.current
    return () => {
      for (const channel of channels.values()) supabase?.removeChannel(channel)
      channels.clear()
    }
  }, [supabase, userId])
}
