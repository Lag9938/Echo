import os from 'node:os'

// Prioridade dos processos do Echo enquanto ele transmite a tela.
//
// Um jogo em primeiro plano (Valorant, CS2) usa o processador inteiro e ainda ganha prioridade do Windows. Com o
// Echo na prioridade normal, a captura e a codificação da transmissão ficavam esperando a vez e os quadros
// saíam em rajadas — a transmissão "engasga" mesmo com internet e servidor sobrando.
// "Acima do normal" é o mesmo nível que programas de voz e de gravação usam; não é "alta" nem "tempo real",
// então o jogo continua respondendo.

/**
 * Aplica a prioridade a todos os processos do app (principal, GPU, janelas e utilitários).
 * Devolve quantos processos foram ajustados. Nunca lança erro: sem permissão, o processo só fica como estava.
 */
export function applyStreamingPriority(boost, {
  getAppMetrics,
  setPriority = os.setPriority,
  priorities = os.constants.priority,
  platform = process.platform
}) {
  if (platform !== 'win32') return 0
  const level = boost ? priorities.PRIORITY_ABOVE_NORMAL : priorities.PRIORITY_NORMAL
  let changed = 0
  for (const metric of getAppMetrics()) {
    if (!metric || typeof metric.pid !== 'number') continue
    try {
      setPriority(metric.pid, level)
      changed++
    } catch {
      // processo que acabou de fechar, ou sem permissão: segue para o próximo
    }
  }
  return changed
}
