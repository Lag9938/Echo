// Dados de exemplo para a prévia do Aurora. Nada aqui vem do banco: são pessoas, canais e mensagens
// inventados só para as telas ficarem preenchidas. Os tipos são soltos de propósito (any): o que importa
// é o visual, e os componentes reais aceitam o mesmo formato que o app monta.
import type { Channel, Message, ServerRole, Space } from '../types'

const hoursAgo = (h: number, m = 0) => new Date(Date.now() - (h * 60 + m) * 60_000).toISOString()

export const ME = { id: 'me', user_metadata: {} } as any

export const SPACES: Space[] = [
  { id: 's1', name: 'Amigos da Madrugada', description: 'Onde tudo acontece depois das 22h', creator_id: 'me', banner_theme: 'dark' },
  { id: 's2', name: 'GG Squad', description: 'Ranked e treino', creator_id: 'u3' },
  { id: 's3', name: 'LoFi Club', description: 'Música e estudo', creator_id: 'u3' },
  { id: 's4', name: 'Cantinho do Sol', description: '', creator_id: 'u4' }
]

export const CHANNELS: Channel[] = [
  { id: 'v1', name: 'Sala principal', type: 'voice', space_id: 's1', position: 0 },
  { id: 'v2', name: 'Estudo', type: 'voice', space_id: 's1', position: 1 },
  { id: 'v3', name: 'Jogatina', type: 'voice', space_id: 's1', position: 2 },
  { id: 't1', name: 'geral', type: 'text', space_id: 's1', position: 3, topic: 'Onde tudo acontece depois das 22h' },
  { id: 't2', name: 'clipes', type: 'text', space_id: 's1', position: 4 },
  { id: 't3', name: 'avisos', type: 'text', space_id: 's1', position: 5, is_announcement: true },
  { id: 't4', name: 'memes', type: 'text', space_id: 's1', position: 6 }
]

export const ROLES: ServerRole[] = [
  { id: 'r-owner', name: 'Dono', color: '#f59e0b', position: 0, permissions: {} as any, hoist: true },
  { id: 'r-mod', name: 'Moderador', color: '#3b82f6', position: 1, permissions: {} as any, hoist: true },
  { id: 'r-all', name: '@everyone', color: '#94a3b8', position: 9, permissions: {} as any, isEveryone: true }
]

export const MEMBER_ROLE_MAP: Record<string, string[]> = {
  me: ['r-owner'],
  u2: ['r-mod'],
  u3: ['r-mod']
}

const person = (id: string, name: string, extra: Record<string, any> = {}) => ({
  user: { id, display_name: name, avatar_url: undefined, ...extra }
})

export const MEMBERS = [
  person('me', 'teste'),
  person('u2', 'Kauê'),
  person('u3', 'Bia'),
  person('u4', 'Duda'),
  person('u5', 'Leo'),
  person('u6', 'Nina'),
  person('u7', 'Caio'),
  person('u8', 'Marina')
]

export const ONLINE = new Set(['me', 'u2', 'u3', 'u4', 'u5'])

export const PRESENCE: Record<string, any> = {
  me: { presence_status: 'online', name_effect: 'celestial_gold' },
  u2: { presence_status: 'online', name_effect: 'resonance_cyan', current_game: { name: 'VALORANT', startedAt: Date.now() - 3 * 3600_000 } },
  u3: { presence_status: 'idle', name_effect: 'cyber_matrix' },
  u4: { presence_status: 'dnd' },
  u5: { presence_status: 'online', name_effect: 'abyssal_amethyst' }
}

export const VOICE_USERS: Record<string, any[]> = {
  v1: [
    { userId: 'u2', displayName: 'Kauê', isSpeaking: true, isMuted: false, isDeafened: false, isScreenSharing: true },
    { userId: 'u3', displayName: 'Bia', isSpeaking: false, isMuted: true, isDeafened: false }
  ],
  v3: [{ userId: 'u4', displayName: 'Duda', isSpeaking: false, isMuted: false, isDeafened: false }]
}

const msg = (id: string, author: string, name: string, body: string, ago: [number, number], extra: Partial<Message> = {}): Message => ({
  id,
  channel_id: 't1',
  body,
  created_at: hoursAgo(ago[0], ago[1]),
  author_id: author,
  profile: { display_name: name },
  status: 'sent',
  ...extra
})

export const MESSAGES: Message[] = [
  msg('m1', 'u2', 'Kauê', 'Fechado. Já deixei a sala configurada em 60 FPS.', [26, 10]),
  msg('m2', 'me', 'teste', 'Tô dentro! Entro na sala principal em 5 minutos.', [26, 4]),
  msg('m3', 'u3', 'Bia', 'Mandei uma nota de voz explicando as regras', [25, 40]),
  msg('m4', 'u5', 'Leo', '@teste quem vem no vava hoje?', [3, 20]),
  msg('m5', 'me', 'teste', 'Eu entro! Só preciso terminar uma coisa aqui antes.', [3, 12]),
  msg('m6', 'u2', 'Kauê', 'Fechou, vou criar a sala agora e mando o link', [3, 8]),
  msg('m7', 'u3', 'Bia', 'Alguém sabe onde ficou o clipe da rodada 7?', [1, 30]),
  msg('m8', 'me', 'teste', 'Tá no canal de clipes, o do Kauê com o 4k', [1, 24]),
  msg('m9', 'u4', 'Duda', 'kkkk esse clipe é muito bom', [0, 40]),
  msg('m10', 'me', 'teste', 'quente demais', [0, 30], {
    body: '> @Duda: "kkkk esse clipe é muito bom"\nquente demais',
    reply_to_message_id: 'm9'
  }),
  msg('m11', 'u3', 'Bia', 'manda o print do 4k pra gente ver', [0, 20], {
    body: '> @teste: "screenshot_1792287248914.png"\nmanda o print do 4k pra gente ver',
    reply_to_message_id: 'm8'
  })
]

export const REACTIONS: Record<string, Record<string, string[]>> = {
  m1: { '🔥': ['u3', 'me', 'u5'], '😂': ['u4'] },
  m6: { '🎮': ['me', 'u3'] }
}

export const FRIENDS = [
  { id: 'f1', user: { id: 'u2', display_name: 'Kauê' }, status: 'accepted', initiatorId: 'me' },
  { id: 'f2', user: { id: 'u3', display_name: 'Bia' }, status: 'accepted', initiatorId: 'me' },
  { id: 'f3', user: { id: 'u4', display_name: 'Duda' }, status: 'accepted', initiatorId: 'u4' },
  { id: 'f4', user: { id: 'u5', display_name: 'Leo' }, status: 'accepted', initiatorId: 'me' },
  { id: 'f5', user: { id: 'u6', display_name: 'Nina' }, status: 'accepted', initiatorId: 'u6' }
] as any[]

export const DIRECT_MESSAGES = [
  { id: 'd1', sender_id: 'u2', receiver_id: 'me', body: 'Fechou pra hoje à noite?', created_at: hoursAgo(5, 10), read_at: hoursAgo(5, 0) },
  { id: 'd2', sender_id: 'me', receiver_id: 'u2', body: 'Fechou! Entro na sala principal às 22h.', created_at: hoursAgo(5, 2), read_at: hoursAgo(4, 50) },
  { id: 'd3', sender_id: 'u2', receiver_id: 'me', body: 'Perfeito, levo o pessoal do squad.', created_at: hoursAgo(4, 40), read_at: null },
  { id: 'd4', sender_id: 'u2', receiver_id: 'me', body: 'Ah, e já deixei o clipe da rodada 7 no canal de clipes.', created_at: hoursAgo(0, 30), read_at: null }
] as any[]

export const AUDIT_LOGS = [
  { id: 'a1', timestamp: hoursAgo(2), author_name: 'teste', action: 'Criou o canal', details: '#memes' },
  { id: 'a2', timestamp: hoursAgo(9), author_name: 'Kauê', action: 'Convidou um membro', details: 'Nina' },
  { id: 'a3', timestamp: hoursAgo(30), author_name: 'teste', action: 'Alterou o cargo', details: 'Moderador' }
] as any[]
