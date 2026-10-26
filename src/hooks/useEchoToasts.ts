import { useState, useCallback, useEffect } from 'react'
import type { Toast } from '../types'

export interface NotificationHistoryItem {
  id: string
  title: string
  message: string
  type: 'message' | 'mention' | 'friend' | 'voice' | 'info' | 'success' | 'warning' | 'error'
  createdAt: string
  read: boolean
  data?: any
  avatarUrl?: string
  avatarDecoration?: string | null
  badgeLabel?: string
}

export interface ToastExtraOptions {
  avatarUrl?: string
  avatarDecoration?: string | null
  badgeLabel?: string
  duration?: number
  timestamp?: number
  onQuickReply?: (replyText: string) => void | Promise<void>
  saveToInbox?: boolean
}

const NOTIFICATION_STORAGE_KEY = 'echo-notification-history-v1'

export function useEchoToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore
    }
    return []
  })

  // Salva no localStorage sempre que o histórico mudar
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationHistory.slice(0, 50)))
    } catch {
      // ignore
    }
  }, [notificationHistory])

  const showToast = useCallback((
    title: string, 
    message: string, 
    type: 'info' | 'message' | 'friend' | 'mention' | 'voice' | 'success' | 'warning' | 'error' | any = 'info',
    onClickOrData?: (() => void) | any,
    extraOptions?: ToastExtraOptions
  ) => {
    const id = Math.random().toString(36).substring(7)
    const onClick = typeof onClickOrData === 'function' ? onClickOrData : undefined
    const dataObj = typeof onClickOrData !== 'function' ? onClickOrData : undefined

    // Mescla dados de extraOptions e dataObj
    const avatarUrl = extraOptions?.avatarUrl || dataObj?.avatarUrl || dataObj?.senderAvatar
    const avatarDecoration = extraOptions?.avatarDecoration || dataObj?.avatarDecoration || null
    const badgeLabel = extraOptions?.badgeLabel || dataObj?.badgeLabel
    const duration = extraOptions?.duration || (type === 'mention' ? 6500 : 5000)
    const timestamp = extraOptions?.timestamp || Date.now()
    const onQuickReply = extraOptions?.onQuickReply || dataObj?.onQuickReply

    const newToast: Toast = {
      id,
      title,
      message,
      type,
      onClick,
      data: dataObj,
      avatarUrl,
      avatarDecoration,
      badgeLabel,
      duration,
      timestamp,
      onQuickReply
    }

    setToasts(prev => [...prev, newToast])

    // Determina se deve entrar para a Central de Notificações / Inbox
    const shouldSaveToInbox = extraOptions?.saveToInbox ?? (
      type === 'message' || 
      type === 'mention' || 
      type === 'friend' || 
      type === 'voice' || 
      Boolean(dataObj?.type)
    )

    if (shouldSaveToInbox) {
      const historyItem: NotificationHistoryItem = {
        id,
        title,
        message,
        type: (type as any) || 'info',
        createdAt: new Date().toISOString(),
        read: false,
        data: dataObj,
        avatarUrl,
        avatarDecoration,
        badgeLabel
      }
      setNotificationHistory(prev => [historyItem, ...prev.filter(item => item.id !== id)].slice(0, 50))
    }

    // Auto-dismiss após a duração especificada
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)

    return () => clearTimeout(timer)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const markNotificationAsRead = useCallback((id: string) => {
    setNotificationHistory(prev => prev.map(item => item.id === id ? { ...item, read: true } : item))
  }, [])

  const markAllNotificationsAsRead = useCallback(() => {
    setNotificationHistory(prev => prev.map(item => ({ ...item, read: true })))
  }, [])

  const clearNotificationHistory = useCallback(() => {
    setNotificationHistory([])
  }, [])

  const unreadNotificationsCount = notificationHistory.filter(item => !item.read).length

  return {
    toasts,
    setToasts,
    showToast,
    removeToast,
    notificationHistory,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotificationHistory
  }
}
