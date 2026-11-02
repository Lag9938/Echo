import React, { memo } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Space, Channel } from '../../types'
import { useEchoVoiceSession } from '../../hooks/useEchoVoiceSession'

export interface VoiceSessionControllerProps {
  user: User
  profileDisplayName: string
  profileAvatarUrl?: string
  sfxVolume: number
  selectedInputIdRef: React.MutableRefObject<string>
  selectedOutputIdRef: React.MutableRefObject<string>
  noiseSuppressionEnabledRef: React.MutableRefObject<boolean>
  echoCancellationEnabledRef: React.MutableRefObject<boolean>
  noiseGateEnabled?: boolean
  noiseGateThreshold?: number
  spaces: Space[]
  spaceChannelsRef: React.MutableRefObject<Record<string, Channel[]>>
  selectedChannel: Channel | null
  spaceChannels: Record<string, Channel[]>
  activeSharingSourceRef: React.MutableRefObject<any>
  setActiveSharingSourceRef: React.MutableRefObject<((src: any) => void) | null>
  lastActivityRef: React.MutableRefObject<number>
  setShowAfkPrompt: (show: boolean) => void
  setShowAfkDisconnectedModal: (show: boolean) => void
  showToast?: (title: string, message: string, type?: any, onClick?: () => void) => void
  supabase: any
  presenceData?: Record<string, any>
}

export const VoiceSessionController = memo(function VoiceSessionController({
  user,
  profileDisplayName,
  profileAvatarUrl,
  sfxVolume,
  selectedInputIdRef,
  selectedOutputIdRef,
  noiseSuppressionEnabledRef,
  echoCancellationEnabledRef,
  noiseGateEnabled,
  noiseGateThreshold,
  spaces,
  spaceChannelsRef,
  selectedChannel,
  spaceChannels,
  activeSharingSourceRef,
  setActiveSharingSourceRef,
  lastActivityRef,
  setShowAfkPrompt,
  setShowAfkDisconnectedModal,
  showToast,
  supabase,
  presenceData
}: VoiceSessionControllerProps) {
  useEchoVoiceSession({
    user,
    profileDisplayName,
    profileAvatarUrl,
    sfxVolume,
    getSelectedInputId: () => selectedInputIdRef.current,
    getSelectedOutputId: () => selectedOutputIdRef.current,
    getNoiseSuppressionEnabled: () => noiseSuppressionEnabledRef.current,
    getEchoCancellationEnabled: () => echoCancellationEnabledRef.current,
    noiseGateEnabled,
    noiseGateThreshold,
    spaces,
    spaceChannelsRef,
    selectedChannel,
    spaceChannels,
    getActiveSharingSource: () => activeSharingSourceRef.current,
    onBeforeJoinVoice: () => {
      lastActivityRef.current = Date.now()
      setShowAfkPrompt(false)
      setShowAfkDisconnectedModal(false)
    },
    onLeaveVoice: () => {
      if (setActiveSharingSourceRef.current) {
        setActiveSharingSourceRef.current(null)
      }
    },
    showToast,
    supabase,
    presenceData
  })

  return null
})
