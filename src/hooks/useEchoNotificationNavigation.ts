import { useEffect, type MutableRefObject } from 'react'
import type { Channel, Page, Space } from '../types'

export interface UseEchoNotificationNavigationOptions {
  spaces: Space[]
  spaceChannelsRef: MutableRefObject<Record<string, Channel[]>>
  handleOpenDirectChat: (userId: string) => void
  handleOpenGroup: (groupId: string) => void
  setExpandedSpace: (spaceId: string) => void
  setSelectedChannel: (channel: Channel) => void
  setPage: (page: Page) => void
}

/**
 * Clique numa notificação (nativa do Windows, pelo Electron, ou a do próprio app): leva para a conversa
 * de onde ela veio — a DM, o grupo ou o canal do espaço.
 */
export function useEchoNotificationNavigation({
  spaces,
  spaceChannelsRef,
  handleOpenDirectChat,
  handleOpenGroup,
  setExpandedSpace,
  setSelectedChannel,
  setPage
}: UseEchoNotificationNavigationOptions) {
  useEffect(() => {
    const handleNotificationPayload = (data: any) => {
      if (!data) return
      if (data.type === 'dm' && data.senderId) {
        handleOpenDirectChat(data.senderId)
        setPage('Amigos')
      } else if (data.type === 'group' && data.groupId) {
        handleOpenGroup(data.groupId)
        setPage('Amigos')
      } else if (data.type === 'channel' && data.channelId) {
        const allChannels = Object.values(spaceChannelsRef.current).flat()
        const targetCh = allChannels.find(c => c.id === data.channelId)
        if (targetCh) {
          if (targetCh.space_id) {
            const sp = spaces.find(s => s.id === targetCh.space_id)
            if (sp) setExpandedSpace(sp.id)
          }
          setSelectedChannel(targetCh)
          setPage('Servidores')
        }
      }
    }

    if ((window as any).electronAPI?.onNotificationClicked) {
      ;(window as any).electronAPI.onNotificationClicked(handleNotificationPayload)
    }

    const handleCustomClick = (e: any) => {
      handleNotificationPayload(e.detail)
    }
    window.addEventListener('echo-notification-clicked', handleCustomClick)

    return () => {
      window.removeEventListener('echo-notification-clicked', handleCustomClick)
    }
    // Os "set" e a referência dos canais são estáveis; só as ações de abrir conversa e a lista de espaços mudam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleOpenDirectChat, handleOpenGroup, spaces])
}
