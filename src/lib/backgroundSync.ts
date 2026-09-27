// Sincronização de redundância em segundo plano.
//
// Amizades, grupos e membros do espaço já chegam em tempo real (Realtime). A releitura periódica só existe para
// recuperar eventos perdidos (conexão que caiu). Rodar isso a cada 60s em todo app aberto gerava ~15 mil pedidos
// por dia ao Supabase (e o volume de logs cobrado junto). Agora: intervalo maior, nada enquanto a janela está
// escondida e uma releitura ao voltar para o app, que é quando os dados desatualizados fariam diferença.

export const BACKGROUND_SYNC_INTERVAL_MS = 5 * 60 * 1000
export const BACKGROUND_SYNC_RESUME_GAP_MS = 60 * 1000

interface BackgroundSyncOptions {
  intervalMs?: number
  /** Ao voltar para a janela, só relê se a última sincronização foi há mais que isso */
  resumeGapMs?: number
}

/** Agenda `sync` de tempos em tempos (só com a janela visível) e ao voltar para ela. Devolve a função de cancelar. */
export function startBackgroundSync(sync: () => void, options: BackgroundSyncOptions = {}): () => void {
  const intervalMs = options.intervalMs ?? BACKGROUND_SYNC_INTERVAL_MS
  const resumeGapMs = options.resumeGapMs ?? BACKGROUND_SYNC_RESUME_GAP_MS
  let lastSyncAt = Date.now()

  const run = () => {
    lastSyncAt = Date.now()
    sync()
  }

  const timer = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return
    run()
  }, intervalMs)

  const onVisibilityChange = () => {
    if (document.hidden) return
    if (Date.now() - lastSyncAt >= resumeGapMs) run()
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    clearInterval(timer)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
