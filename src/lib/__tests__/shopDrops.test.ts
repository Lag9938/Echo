import { describe, it, expect } from 'vitest'
import { CURRENT_SHOP_DROP, markShopDropSeen, readSeenShopDrop, shouldShowShopDrop, type ShopDrop } from '../shopDrops'
import { AVATAR_DECORATIONS } from '../../components/AvatarDecoration'

const drop: ShopDrop = {
  id: 'colecao-x',
  title: 'Coleção X',
  tagline: 'teste',
  startsAt: '2026-10-18T00:00:00-03:00',
  endsAt: '2026-11-30T23:59:59-03:00',
  items: [{ kind: 'decoration', id: 'sakura_bloom' }]
}
const during = new Date('2026-10-20T12:00:00-03:00')

describe('novidades da loja ao abrir o Echo', () => {
  it('aparece para quem ainda não viu este lançamento', () => {
    expect(shouldShowShopDrop(drop, { seenDropId: null, now: during, whatsNewPending: false })).toBe(true)
    // Viu o lançamento anterior: este é novo, aparece
    expect(shouldShowShopDrop(drop, { seenDropId: 'colecao-antiga', now: during, whatsNewPending: false })).toBe(true)
  })

  it('aparece uma vez só por lançamento', () => {
    expect(shouldShowShopDrop(drop, { seenDropId: 'colecao-x', now: during, whatsNewPending: false })).toBe(false)
  })

  it('não disputa a tela com as novidades da versão (espera ela fechar)', () => {
    expect(shouldShowShopDrop(drop, { seenDropId: null, now: during, whatsNewPending: true })).toBe(false)
  })

  it('só dentro do período do lançamento', () => {
    expect(shouldShowShopDrop(drop, { seenDropId: null, now: new Date('2026-10-17T12:00:00-03:00'), whatsNewPending: false })).toBe(false)
    expect(shouldShowShopDrop(drop, { seenDropId: null, now: new Date('2026-12-01T12:00:00-03:00'), whatsNewPending: false })).toBe(false)
  })

  it('sem lançamento ou sem itens, nada aparece', () => {
    expect(shouldShowShopDrop(null, { seenDropId: null, now: during, whatsNewPending: false })).toBe(false)
    expect(shouldShowShopDrop({ ...drop, items: [] }, { seenDropId: null, now: during, whatsNewPending: false })).toBe(false)
  })

  it('o visto fica guardado por conta, e armazenamento quebrado não derruba', () => {
    const data: Record<string, string> = {}
    const storage = { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v } }
    markShopDropSeen('ana', 'colecao-x', storage)
    expect(readSeenShopDrop('ana', storage)).toBe('colecao-x')
    expect(readSeenShopDrop('bia', storage)).toBeNull()
    const broken = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } }
    expect(readSeenShopDrop('ana', broken)).toBeNull()
    expect(() => markShopDropSeen('ana', 'x', broken)).not.toThrow()
  })

  it('todo item anunciado existe na loja (senão a janela mostraria um avatar sem enfeite)', () => {
    const ids = new Set(AVATAR_DECORATIONS.map((d) => d.id))
    for (const item of CURRENT_SHOP_DROP?.items ?? []) expect(ids.has(item.id), item.id).toBe(true)
  })
})
