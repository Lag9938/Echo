/**
 * Ordem da lista de conversas diretas: alfabética pelo nome (sem diferenciar maiúsculas nem acentos), com o
 * id como desempate para dois nomes iguais nunca trocarem de lugar. Não depende de qual conversa está
 * aberta, de quem mandou mensagem por último nem de quem está online: a lista não se mexe sozinha.
 */
export function sortConversationsByName<T extends { id: string; display_name: string }>(conversations: T[]): T[] {
  return [...conversations].sort((a, b) =>
    (a.display_name || '').localeCompare(b.display_name || '', 'pt-BR', { sensitivity: 'base' })
    || a.id.localeCompare(b.id)
  )
}
