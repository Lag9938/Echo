import { useCallback, useEffect, useRef } from 'react'
import { UNDO_DELETE_MS } from '../lib/undoableDelete'
import type { ToastExtraOptions } from './useEchoToasts'

type ShowToast = (
  title: string,
  message: string,
  type?: 'info' | 'message' | 'friend',
  onClickOrData?: (() => void) | any,
  extraOptions?: ToastExtraOptions
) => void

export interface UndoableDeleteJob {
  /** Identifica a mensagem (um clique repetido enquanto espera é ignorado) */
  id: string
  /** Texto do aviso "Mensagem Excluída" */
  message: string
  /** Tira a mensagem da tela já */
  hide: () => void
  /** Devolve a mensagem à tela (Desfazer, ou erro ao apagar no servidor) */
  restore: () => void
  /** Apaga de verdade no banco. Devolve o erro, se houve. */
  remove: () => Promise<{ message: string } | null | undefined | void>
}

/**
 * Exclusão com "Desfazer" (lib/undoableDelete.ts): a mensagem some da tela, o aviso mostra "Desfazer" por 6 s e só
 * depois disso ela é apagada no banco. Usado por canais, DMs e grupos.
 * Ao sair do app (ou desmontar), as exclusões pendentes são concluídas em vez de a mensagem "voltar" depois.
 */
export function useUndoableDelete(showToast: ShowToast) {
  const pending = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>())
  const toastRef = useRef(showToast)
  toastRef.current = showToast

  useEffect(() => {
    const map = pending.current
    const flush = () => { for (const job of [...map.values()]) void job.commit() }
    window.addEventListener('beforeunload', flush)
    return () => { window.removeEventListener('beforeunload', flush); flush() }
  }, [])

  return useCallback((job: UndoableDeleteJob) => {
    const map = pending.current
    if (map.has(job.id)) return

    const commit = async () => {
      const current = map.get(job.id)
      if (!current) return
      clearTimeout(current.timer)
      map.delete(job.id)
      try {
        const error = await job.remove()
        if (error) {
          console.error('Error deleting message:', error)
          job.restore()
          toastRef.current('Erro ao Excluir', error.message, 'info')
        }
      } catch (err) {
        console.error('Failed to delete message:', err)
        job.restore()
        toastRef.current('Erro', 'Não foi possível excluir a mensagem.', 'info')
      }
    }

    job.hide()
    map.set(job.id, { timer: setTimeout(commit, UNDO_DELETE_MS), commit })
    toastRef.current('Mensagem Excluída', job.message, 'info', undefined, {
      duration: UNDO_DELETE_MS,
      saveToInbox: false,
      actionLabel: 'Desfazer',
      onAction: () => {
        const current = map.get(job.id)
        if (!current) return
        clearTimeout(current.timer)
        map.delete(job.id)
        job.restore()
      }
    })
  }, [])
}
