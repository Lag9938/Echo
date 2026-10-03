// O "pacote de presença" que cada app publica no canal global: quem é a pessoa, o status, o jogo, os
// cosméticos e em que chamada está. O track() do Supabase SUBSTITUI o pacote inteiro (não junta com o
// anterior), então todo lugar que publica precisa mandar o pacote completo. Antes havia seis cópias dessa
// montagem, cada uma com detalhes diferentes (uma esquecia a foto, outra mandava o status personalizado
// mesmo no modo invisível); agora todas passam por aqui.

export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'invisible' | string

export interface PresencePayloadInput {
  userId: string
  displayName: string
  /** Foto do perfil. undefined = quem chama não sabe a foto, e o campo fica fora do pacote */
  avatarUrl?: string | null
  presenceStatus: PresenceStatus
  /** Status personalizado recém-digitado; sem isso, vale o que está salvo no aparelho */
  customStatus?: string
  /** Jogo detectado agora (nunca é publicado no modo invisível) */
  game?: unknown
  /** Cosméticos do estado da tela: usados quando o aparelho ainda não tem o valor salvo */
  avatarDecoration?: string | null
  profileEffect?: string | null
  nameEffect?: string | null
  /** Banner recém-alterado; sem isso, vale o salvo */
  bannerUrl?: string
  bannerPreset?: string
  voiceChannelId?: string | null
  voiceSpaceId?: string | null
  storage?: Pick<Storage, 'getItem'>
  now?: () => string
}

export interface PresencePayload {
  user_id: string
  display_name: string
  avatar_url?: string
  online_at: string
  custom_status: string
  presence_status: PresenceStatus
  current_game: unknown
  game_presence: unknown
  avatar_decoration: string
  profile_effect: string
  name_effect: string
  badge: string
  banner_custom: string
  banner_preset: string
  banner_url: string
  voice_channel_id: string | null
  voice_space_id: string | null
}

const MAX_BANNER_URL_LENGTH = 2048

/** Só links curtos vão na presença: uma imagem embutida ("data:") estouraria o limite do tempo real */
export function safePresenceBannerUrl(raw: string | null | undefined): string {
  return raw && !raw.startsWith('data:') && raw.length < MAX_BANNER_URL_LENGTH ? raw : ''
}

export function buildPresencePayload(input: PresencePayloadInput): PresencePayload {
  const storage = input.storage ?? localStorage
  const read = (key: string) => {
    try {
      return storage.getItem(key) || ''
    } catch {
      return ''
    }
  }
  const uid = input.userId
  const invisible = input.presenceStatus === 'invisible'

  // No modo invisível a pessoa aparece offline: nem status personalizado nem jogo são publicados
  const customStatus = invisible ? '' : (input.customStatus ?? read('echo-custom-status'))
  const game = invisible ? null : (input.game ?? null)

  const banner = safePresenceBannerUrl(input.bannerUrl || read(`echo-banner-custom-${uid}`) || read('echo-banner-custom'))
  const showBadge = read(`echo-show-badge-${uid}`) !== 'false'

  const payload: PresencePayload = {
    user_id: uid,
    display_name: input.displayName,
    online_at: input.now ? input.now() : new Date().toISOString(),
    custom_status: customStatus,
    presence_status: input.presenceStatus,
    current_game: game,
    game_presence: game,
    avatar_decoration: read(`echo-avatar-decoration-${uid}`) || read('echo-avatar-decoration') || input.avatarDecoration || '',
    profile_effect: read(`echo-profile-effect-${uid}`) || read('echo-profile-effect') || input.profileEffect || '',
    name_effect: read(`echo-name-effect-${uid}`) || input.nameEffect || 'resonance_cyan',
    badge: showBadge ? (read(`echo-badge-${uid}`) || 'owner') : 'none',
    banner_custom: banner,
    banner_preset: input.bannerPreset || read(`echo-banner-preset-${uid}`) || read('echo-banner-preset') || 'synthwave',
    banner_url: banner,
    voice_channel_id: input.voiceChannelId || null,
    voice_space_id: input.voiceSpaceId || null
  }
  if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl || ''
  return payload
}
