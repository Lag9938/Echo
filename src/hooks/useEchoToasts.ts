import { useState, useCallback } from 'react'
import type { Toast } from '../types'

export function useEchoToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((title: string, message: string, type: 'info' | 'message' | 'friend' | any = 'info') => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { id, title, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
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
