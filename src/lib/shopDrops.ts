// "Novidades na Loja": a janela que aparece ao abrir o Echo quando chega uma coleção nova (como o Discord faz).
//
// Cada coleção é um "lançamento" com id próprio. A janela aparece uma vez por lançamento para cada conta: quem
// fechou ou foi à loja não a vê de novo até o próximo lançamento. Para anunciar uma coleção nova, troque
// CURRENT_SHOP_DROP (id novo = aparece de novo para todo mundo).
//
// Ela nunca disputa a tela com a janela de novidades da versão: se as duas aparecem na mesma abertura (o dia
// da atualização), a da versão vai primeiro e a da loja aparece logo depois que a pessoa fechar a outra.

export interface ShopDropItem {
  kind: 'decoration'
  id: string
}

export interface ShopDrop {
  id: string
  title: string
  tagline: string
  /** Data (ISO) a partir da qual a janela pode aparecer */
  startsAt: string
  /** Data (ISO) depois da qual a coleção não é mais novidade */
  endsAt?: string
  items: ShopDropItem[]
}

export const CURRENT_SHOP_DROP: ShopDrop | null = {
  id: '2026-10-estacoes',
  title: 'Coleção Estações',
  tagline: 'Um dragão de fogo, abóboras de Halloween, sakura e asas de cristal para enfeitar o seu avatar.',
  startsAt: '2026-10-18T00:00:00-03:00',
  endsAt: '2026-11-30T23:59:59-03:00',
  items: [
    { kind: 'decoration', id: 'dragon_ring' },
    { kind: 'decoration', id: 'pumpkin_night' },
    { kind: 'decoration', id: 'sakura_bloom' },
    { kind: 'decoration', id: 'crystal_wings' }
  ]
}

export function shopDropSeenKey(userId: string): string {
  return `echo-shop-drop-seen-${userId}`
}

interface ShowOptions {
  /** Id do último lançamento que essa conta já viu */
  seenDropId: string | null
  now: Date
  /** A janela de novidades da versão está aberta agora */
  whatsNewPending: boolean
}

/** A janela de novidades da loja deve aparecer agora? */
export function shouldShowShopDrop(drop: ShopDrop | null, { seenDropId, now, whatsNewPending }: ShowOptions): boolean {
  if (!drop || drop.items.length === 0) return false
  if (seenDropId === drop.id || whatsNewPending) return false
  const time = now.getTime()
  if (time < Date.parse(drop.startsAt)) return false
  if (drop.endsAt && time > Date.parse(drop.endsAt)) return false
  return true
}

/** Lê o que essa conta já viu (armazenamento indisponível = trata como não visto, a janela só aparece) */
export function readSeenShopDrop(userId: string, storage: Pick<Storage, 'getItem'> = localStorage): string | null {
  try {
    return storage.getItem(shopDropSeenKey(userId))
  } catch {
    return null
  }
}

export function markShopDropSeen(userId: string, dropId: string, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(shopDropSeenKey(userId), dropId)
  } catch {
    // sem armazenamento a janela pode reaparecer na próxima abertura; nada quebra
  }
}
