import { useState, useCallback } from 'react'
import type { Toast } from '../types'

export function useEchoToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((
    title: string, 
    message: string, 
    type: 'info' | 'message' | 'friend' | any = 'info',
    onClickOrData?: (() => void) | any
  ) => {
    const id = Math.random().toString(36).substring(7)
    const onClick = typeof onClickOrData === 'function' ? onClickOrData : undefined
    const data = typeof onClickOrData !== 'function' ? onClickOrData : undefined

    setToasts(prev => [...prev, { id, title, message, type, onClick, data }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    toasts,
    setToasts,
    showToast,
    removeToast
  }
}
