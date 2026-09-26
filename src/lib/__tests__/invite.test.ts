import { describe, it, expect, vi } from 'vitest'
import {
  getDeepLinkInviteUrl,
  getPublicInviteUrl,
  isEchoInviteUrl,
  parseInvite
} from '../invite'
import {
  getInviteDetails,
  getOrCreateSpaceInvite,
  inviteErrorMessage,
  joinSpaceWithInvite,
  revokeAllSpaceInvites
} from '../spaceInvites'

const CODE = 'h4v7pbvczez2'
const SPACE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CHANNEL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

describe('links de convite', () => {
  it('monta o link público e o deep link com o código', () => {
    expect(getPublicInviteUrl(CODE)).toBe(`https://lag9938.github.io/Echo/invite/?code=${CODE}&v=3`)
    expect(getPublicInviteUrl(CODE, CHANNEL)).toBe(`https://lag9938.github.io/Echo/invite/?code=${CODE}&channel=${CHANNEL}&v=3`)
    expect(getDeepLinkInviteUrl(CODE)).toBe(`echo://invite/${CODE}`)
    expect(getDeepLinkInviteUrl(CODE, CHANNEL)).toBe(`echo://invite/${CODE}?channel=${CHANNEL}`)
  })

  it('devolve string vazia sem código', () => {
    expect(getPublicInviteUrl('')).toBe('')
    expect(getDeepLinkInviteUrl('')).toBe('')
  })

  it('reconhece links de convite do Echo', () => {
    expect(isEchoInviteUrl(getPublicInviteUrl(CODE))).toBe(true)
    expect(isEchoInviteUrl(`echo://invite/${CODE}`)).toBe(true)
    expect(isEchoInviteUrl(`https://lag9938.github.io/Echo/invite/?space=${SPACE}`)).toBe(true)
    expect(isEchoInviteUrl('https://exemplo.com/login?code=abcdefghijkl')).toBe(false)
    expect(isEchoInviteUrl(null)).toBe(false)
  })
})

describe('parseInvite', () => {
  it('aceita o código puro, em qualquer caixa', () => {
    expect(parseInvite(CODE)).toEqual({ code: CODE })
    expect(parseInvite(`  ${CODE.toUpperCase()}  `)).toEqual({ code: CODE })
  })

  it('lê o link web novo, com e sem canal', () => {
    expect(parseInvite(getPublicInviteUrl(CODE))).toEqual({ code: CODE, channelId: undefined })
    expect(parseInvite(getPublicInviteUrl(CODE, CHANNEL))).toEqual({ code: CODE, channelId: CHANNEL })
  })

  it('lê o deep link', () => {
    expect(parseInvite(`echo://invite/${CODE}`)).toEqual({ code: CODE, channelId: undefined })
    expect(parseInvite(`echo://invite/${CODE}?channel=${CHANNEL}`)).toEqual({ code: CODE, channelId: CHANNEL })
  })

  it('trata UUID como link antigo (não como código)', () => {
    expect(parseInvite(SPACE)).toEqual({ legacySpaceId: SPACE })
    expect(parseInvite(`https://lag9938.github.io/Echo/invite/?space=${SPACE}&channel=${CHANNEL}&v=2`))
      .toEqual({ legacySpaceId: SPACE, channelId: CHANNEL })
    expect(parseInvite(`echo://invite/${SPACE}`)).toEqual({ legacySpaceId: SPACE, channelId: undefined })
    // o parâmetro `code` de links antigos podia carregar o UUID
    expect(parseInvite(`https://lag9938.github.io/Echo/invite/?code=${SPACE}`)).toEqual({ legacySpaceId: SPACE, channelId: undefined })
  })

  it('acha o convite dentro de uma mensagem colada inteira', () => {
    const msg = `Entre no meu espaço "Meu Servidor" no Echo!\n🔗 Link Direto: ${getPublicInviteUrl(CODE, CHANNEL)}\n🔑 Código de convite: ${CODE}`
    expect(parseInvite(msg)).toEqual({ code: CODE, channelId: CHANNEL })

    const legacyMsg = `Entre no meu espaço!\n🔑 Código do Espaço: ${SPACE}`
    expect(parseInvite(legacyMsg)).toEqual({ legacySpaceId: SPACE, channelId: undefined })
  })

  it('ignora canal que não é UUID', () => {
    expect(parseInvite(`echo://invite/${CODE}?channel=abc`)?.channelId).toBeUndefined()
  })

  it.each([null, undefined, '', '   ', 'oi', 'https://exemplo.com', 'código com espaços', 'a'.repeat(40)])(
    'devolve null para entrada sem convite: %s',
    (input) => {
      expect(parseInvite(input as any)).toBeNull()
    }
  )
})

describe('inviteErrorMessage', () => {
  it('traduz os erros conhecidos do servidor', () => {
    expect(inviteErrorMessage('invite_not_found')).toMatch(/inválido ou revogado/)
    expect(inviteErrorMessage('invite_expired')).toMatch(/expirou/)
    expect(inviteErrorMessage('invite_exhausted')).toMatch(/limite de usos/)
    expect(inviteErrorMessage('not_authenticated')).toMatch(/login/)
    expect(inviteErrorMessage('Could not find the function public.join_space_with_invite')).toMatch(/Atualize/)
  })

  it('não vaza mensagem técnica desconhecida', () => {
    expect(inviteErrorMessage('duplicate key value violates unique constraint "x"')).toBe('Não foi possível concluir o convite. Tente novamente.')
    expect(inviteErrorMessage(undefined)).toBe('Não foi possível concluir o convite. Tente novamente.')
  })
})

describe('chamadas ao servidor', () => {
  const client = (impl: (fn: string, args: any) => any) => ({ rpc: vi.fn(async (fn: string, args: any) => impl(fn, args)) }) as any

  it('dono recebe convite permanente numa única chamada', async () => {
    const c = client(() => ({ data: { code: CODE, space_id: SPACE, expires_at: null }, error: null }))
    await expect(getOrCreateSpaceInvite(c, SPACE)).resolves.toEqual({ code: CODE, spaceId: SPACE, expiresAt: null })
    expect(c.rpc).toHaveBeenCalledTimes(1)
    expect(c.rpc).toHaveBeenCalledWith('get_or_create_space_invite', { p_space_id: SPACE, p_expires_in_hours: 0 })
  })

  it('membro comum cai para o convite de 7 dias', async () => {
    const c = client((_fn, args) =>
      args.p_expires_in_hours === 0
        ? { data: null, error: { message: 'forbidden_never_expires' } }
        : { data: { code: CODE, space_id: SPACE, expires_at: '2026-10-01T00:00:00Z' }, error: null }
    )
    const invite = await getOrCreateSpaceInvite(c, SPACE)
    expect(invite.expiresAt).toBe('2026-10-01T00:00:00Z')
    expect(c.rpc).toHaveBeenNthCalledWith(2, 'get_or_create_space_invite', { p_space_id: SPACE, p_expires_in_hours: 168 })
  })

  it('não-membro recebe erro legível', async () => {
    const c = client(() => ({ data: null, error: { message: 'not_a_member' } }))
    await expect(getOrCreateSpaceInvite(c, SPACE)).rejects.toThrow('Você não faz parte deste espaço.')
  })

  it('getInviteDetails aceita objeto ou lista e devolve null se inválido', async () => {
    const detail = { id: SPACE, name: 'Servidor', member_count: 3 }
    expect(await getInviteDetails(client(() => ({ data: detail, error: null })), CODE)).toEqual(detail)
    expect(await getInviteDetails(client(() => ({ data: [detail], error: null })), CODE)).toEqual(detail)
    expect(await getInviteDetails(client(() => ({ data: null, error: null })), CODE)).toBeNull()
    expect(await getInviteDetails(client(() => ({ data: null, error: { message: 'x' } })), CODE)).toBeNull()
  })

  it('joinSpaceWithInvite devolve o espaço ou o erro traduzido', async () => {
    const ok = client(() => ({ data: { space_id: SPACE, name: 'Servidor', already_member: false }, error: null }))
    await expect(joinSpaceWithInvite(ok, CODE)).resolves.toEqual({ spaceId: SPACE, name: 'Servidor', alreadyMember: false })
    expect(ok.rpc).toHaveBeenCalledWith('join_space_with_invite', { p_code: CODE })

    const expired = client(() => ({ data: null, error: { message: 'invite_expired' } }))
    await expect(joinSpaceWithInvite(expired, CODE)).rejects.toThrow(/expirou/)
  })

  it('revokeAllSpaceInvites devolve a quantidade', async () => {
    expect(await revokeAllSpaceInvites(client(() => ({ data: 4, error: null })), SPACE)).toBe(4)
    await expect(revokeAllSpaceInvites(client(() => ({ data: null, error: { message: 'forbidden' } })), SPACE)).rejects.toThrow()
  })
})
