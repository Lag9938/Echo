/**
 * Ordem da lista de conversas diretas: alfabética pelo nome (sem diferenciar maiúsculas nem acentos), com o
 * id como desempate para dois nomes iguais nunca trocarem de lugar. Não depende de qual conversa está
 * aberta, de quem mandou mensagem por último nem de quem está online: a lista não se mexe sozinha.
 */
export function sortConversationsByName<T extends { id: string; display_name: string }>(conversations: T[]): T[] {
  return [...conversations].sort((a, b) =>
    sortKey(a.display_name).localeCompare(sortKey(b.display_name), 'pt-BR', { sensitivity: 'base' })
    || a.id.localeCompare(b.id)
  )
}

/** Nome sem espaços nas pontas: há nomes salvos com um espaço na frente, que iam parar no topo da lista */
function sortKey(name: string | null | undefined): string {
  return (name || '').trim()
}
