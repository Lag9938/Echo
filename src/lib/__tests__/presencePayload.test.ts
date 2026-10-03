import { describe, it, expect } from 'vitest'
import { buildPresencePayload, safePresenceBannerUrl } from '../presencePayload'

const ME = 'aaaaaaaa-0000-4000-8000-00000000000a'
const NOW = '2026-10-03T12:00:00.000Z'

function fakeStorage(values: Record<string, string> = {}) {
  return { getItem: (key: string) => (key in values ? values[key] : null) }
}

const base = (overrides: Record<string, unknown> = {}) => ({
  userId: ME,
  displayName: 'Ana',
  presenceStatus: 'online',
  storage: fakeStorage(),
  now: () => NOW,
  ...overrides
})

describe('buildPresencePayload', () => {
  it('sem nada salvo, manda o pacote completo com os padrões', () => {
    expect(buildPresencePayload(base())).toEqual({
      user_id: ME,
      display_name: 'Ana',
      online_at: NOW,
      custom_status: '',
      presence_status: 'online',
      current_game: null,
      game_presence: null,
      avatar_decoration: '',
      profile_effect: '',
      name_effect: 'resonance_cyan',
      badge: 'owner',
      banner_custom: '',
      banner_preset: 'synthwave',
      banner_url: '',
      voice_channel_id: null,
      voice_space_id: null
    })
  })

  it('todo pacote tem sempre os mesmos campos (o track substitui tudo, então faltar um campo apaga o dado)', () => {
    const keys = Object.keys(buildPresencePayload(base({ avatarUrl: 'https://x.test/a.png' }))).sort()
    expect(keys).toEqual([
      'avatar_decoration', 'avatar_url', 'badge', 'banner_custom', 'banner_preset', 'banner_url', 'current_game',
      'custom_status', 'display_name', 'game_presence', 'name_effect', 'online_at', 'presence_status',
      'profile_effect', 'user_id', 'voice_channel_id', 'voice_space_id'
    ])
  })

  it('a foto entra quando quem chama sabe a foto, e fica fora quando não sabe', () => {
    expect(buildPresencePayload(base({ avatarUrl: 'https://x.test/a.png' })).avatar_url).toBe('https://x.test/a.png')
    expect(buildPresencePayload(base({ avatarUrl: null })).avatar_url).toBe('')
    expect('avatar_url' in buildPresencePayload(base())).toBe(false)
  })

  it('o valor salvo no aparelho vale mais que o do estado da tela; a chave antiga serve de reserva', () => {
    const storage = fakeStorage({
      [`echo-avatar-decoration-${ME}`]: 'fire_storm',
      'echo-profile-effect': 'efeito_antigo',
      [`echo-name-effect-${ME}`]: 'aurora',
      [`echo-banner-preset-${ME}`]: 'oceano'
    })
    const payload = buildPresencePayload(base({ storage, avatarDecoration: 'cyber_hud', profileEffect: 'do_estado', nameEffect: 'do_estado' }))
    expect(payload.avatar_decoration).toBe('fire_storm')
    expect(payload.profile_effect).toBe('efeito_antigo')
    expect(payload.name_effect).toBe('aurora')
    expect(payload.banner_preset).toBe('oceano')
  })

  it('sem valor salvo, usa o cosmético do estado da tela', () => {
    const payload = buildPresencePayload(base({ avatarDecoration: 'cyber_hud', profileEffect: 'neve', nameEffect: 'aurora' }))
    expect(payload.avatar_decoration).toBe('cyber_hud')
    expect(payload.profile_effect).toBe('neve')
    expect(payload.name_effect).toBe('aurora')
  })

  it('status personalizado: o recém-digitado vale mais que o salvo', () => {
    const storage = fakeStorage({ 'echo-custom-status': 'salvo' })
    expect(buildPresencePayload(base({ storage })).custom_status).toBe('salvo')
    expect(buildPresencePayload(base({ storage, customStatus: 'novo' })).custom_status).toBe('novo')
    expect(buildPresencePayload(base({ storage, customStatus: '' })).custom_status).toBe('')
  })

  it('no modo invisível não publica status personalizado nem jogo, nem os recém-informados', () => {
    const storage = fakeStorage({ 'echo-custom-status': 'salvo' })
    const payload = buildPresencePayload(base({ storage, presenceStatus: 'invisible', customStatus: 'novo', game: { name: 'VALORANT' } }))
    expect(payload.presence_status).toBe('invisible')
    expect(payload.custom_status).toBe('')
    expect(payload.current_game).toBeNull()
    expect(payload.game_presence).toBeNull()
  })

  it('o jogo vai nos dois campos que o app lê', () => {
    const game = { name: 'Horizon', icon: '🎮', startedAt: 1 }
    const payload = buildPresencePayload(base({ game }))
    expect(payload.current_game).toBe(game)
    expect(payload.game_presence).toBe(game)
  })

  it('selo: o salvo, "owner" por padrão, e "none" quando a pessoa escondeu', () => {
    expect(buildPresencePayload(base({ storage: fakeStorage({ [`echo-badge-${ME}`]: 'founder' }) })).badge).toBe('founder')
    expect(buildPresencePayload(base({ storage: fakeStorage({ [`echo-badge-${ME}`]: 'founder', [`echo-show-badge-${ME}`]: 'false' }) })).badge).toBe('none')
  })

  it('banner: o recém-alterado vale mais que o salvo, e imagem embutida ou link gigante nunca vão na presença', () => {
    const storage = fakeStorage({ [`echo-banner-custom-${ME}`]: 'https://x.test/salvo.png' })
    expect(buildPresencePayload(base({ storage })).banner_url).toBe('https://x.test/salvo.png')
    const fresh = buildPresencePayload(base({ storage, bannerUrl: 'https://x.test/novo.png', bannerPreset: 'neon' }))
    expect(fresh.banner_url).toBe('https://x.test/novo.png')
    expect(fresh.banner_custom).toBe('https://x.test/novo.png')
    expect(fresh.banner_preset).toBe('neon')

    const embedded = fakeStorage({ 'echo-banner-custom': 'data:image/png;base64,AAAA' })
    expect(buildPresencePayload(base({ storage: embedded })).banner_url).toBe('')
    expect(safePresenceBannerUrl('https://x.test/' + 'a'.repeat(3000))).toBe('')
    expect(safePresenceBannerUrl(null)).toBe('')
  })

  it('a chamada atual vai no pacote; fora de chamada vai null', () => {
    const payload = buildPresencePayload(base({ voiceChannelId: 'c1', voiceSpaceId: 's1' }))
    expect(payload.voice_channel_id).toBe('c1')
    expect(payload.voice_space_id).toBe('s1')
    expect(buildPresencePayload(base({ voiceChannelId: '' })).voice_channel_id).toBeNull()
  })

  it('armazenamento indisponível não derruba: cai nos padrões', () => {
    const broken = { getItem: () => { throw new Error('bloqueado') } }
    const payload = buildPresencePayload(base({ storage: broken, avatarDecoration: 'cyber_hud' }))
    expect(payload.avatar_decoration).toBe('cyber_hud')
    expect(payload.badge).toBe('owner')
  })
})
