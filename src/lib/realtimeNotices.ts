// Avisos publicados pelo banco (migração 15) no lugar dos ouvintes de tabela (postgres_changes).
// Quem assina o canal privado repassa o aviso por aqui; os hooks que precisam dele escutam sem conhecer o canal.
//   caixa de entrada user:<id>   -> channel-activity (canal restrito), space-membership
//   space-events-<espaço>        -> channel-activity (canal que todo membro vê) e os avisos do espaço
//   room-messages-<canal>        -> pins-changed

export interface ChannelActivityNotice {
  id: string
  channel_id: string
  space_id?: string
  author_id: string
  thread_root_id?: string | null
  body?: string
}

export interface SpaceChangeNotice {
  space_id: string
  op?: string
}

export interface MemberProfileNotice {
  id: string
  display_name?: string | null
  avatar_url?: string | null
  avatar_decoration?: string | null
  profile_effect?: string | null
}

export interface RealtimeNoticeMap {
  'channel-activity': ChannelActivityNotice
  'space-membership': SpaceChangeNotice
  'members-changed': SpaceChangeNotice
  'roles-changed': SpaceChangeNotice
  'member-roles-changed': SpaceChangeNotice
  'space-updated': SpaceChangeNotice
  'member-profile': MemberProfileNotice
  'pins-changed': { channel_id: string }
}

export type RealtimeNoticeName = keyof RealtimeNoticeMap

// Eventos que chegam pelo canal de cada espaço
export const SPACE_EVENT_NAMES = [
  'channel-activity',
  'members-changed',
  'roles-changed',
  'member-roles-changed',
  'space-updated',
  'member-profile'
] as const satisfies readonly RealtimeNoticeName[]

const PREFIX = 'echo-notice:'

export function emitNotice<K extends RealtimeNoticeName>(name: K, payload: RealtimeNoticeMap[K] | null | undefined) {
  if (!payload || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PREFIX + name, { detail: payload }))
}

export function onNotice<K extends RealtimeNoticeName>(name: K, handler: (payload: RealtimeNoticeMap[K]) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (event: Event) => handler((event as CustomEvent).detail)
  window.addEventListener(PREFIX + name, listener)
  return () => window.removeEventListener(PREFIX + name, listener)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Quais canais de espaço abrir e fechar quando a lista de espaços muda (espaços de demonstração não têm canal)
export function planSpaceEventChannels(subscribed: Iterable<string>, wanted: Iterable<string>) {
  const want = new Set([...wanted].filter(id => UUID.test(id)))
  const have = new Set(subscribed)
  return {
    join: [...want].filter(id => !have.has(id)),
    leave: [...have].filter(id => !want.has(id))
  }
}
