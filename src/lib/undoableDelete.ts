// Excluir mensagem com "Desfazer".
//
// O botão Excluir apagava para sempre no banco na hora, e um clique errado perdia a mensagem. Agora ela some da
// tela, aparece um aviso com "Desfazer" por 6 segundos, e só depois disso é apagada no banco.
// Quem usa: hooks/useEchoChannelMessages.ts (handleDeleteMessage).

/** Quanto tempo o "Desfazer" fica disponível, em ms */
export const UNDO_DELETE_MS = 6000

/** Devolve a mensagem à lista na posição certa pela data (a lista é do mais antigo para o mais novo) */
export function insertByCreatedAt<T extends { id: string; created_at: string }>(list: T[], item: T): T[] {
  if (list.some((m) => m.id === item.id)) return list
  const at = new Date(item.created_at).getTime()
  const index = list.findIndex((m) => new Date(m.created_at).getTime() > at)
  if (index === -1) return [...list, item]
  return [...list.slice(0, index), item, ...list.slice(index)]
}
