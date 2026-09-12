export interface GamePresenceInfo {
  name: string
  icon?: string
  startedAt?: number
  processName?: string
}

export interface LiveKitConnectionResult {
  success: boolean
  url?: string
  token?: string
  error?: string
}

export interface AutoStartSettings {
  openAtLogin: boolean
  openAsHidden?: boolean
}

export interface ElectronAPI {
  // Screen & Process Audio Capture
  getSources: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>
  restoreWindow: (sourceId: string | number) => Promise<any>
  startProcessAudioCapture: (sourceId: string | number) => Promise<any>
  stopProcessAudioCapture: () => Promise<any>
  onScreenshareAudioChunk: (callback: (chunk: any) => void) => void

  // Auto-updater
  onUpdateAvailable: (callback: (info: { version: string }) => void) => void
  onUpdateProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => void
  onUpdateReady: (callback: (info: { version: string }) => void) => void
  installUpdate: () => void
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>

  // Rich Presence Game Detection
  onGameDetected: (callback: (game: GamePresenceInfo | null) => void) => void
  checkActiveGame: () => Promise<GamePresenceInfo | null>

  // Push-to-Talk Global Shortcut
  registerGlobalPTT: (shortcut: string) => Promise<{ success: boolean; error?: string }>
  unregisterGlobalPTT: () => Promise<{ success: boolean }>
  onPTTStateChange: (callback: (isPressed: boolean) => void) => void
  registerGlobalVoiceShortcut: (action: 'toggle-mute' | 'toggle-deafen', shortcut: string) => Promise<{ success: boolean; error?: string }>
  unregisterGlobalVoiceShortcut: (action: 'toggle-mute' | 'toggle-deafen') => Promise<{ success: boolean }>
  onGlobalVoiceToggle: (callback: (action: 'toggle-mute' | 'toggle-deafen') => void) => void

  // Native Notifications
  showNotification: (options: { title: string; body?: string }) => Promise<{ success: boolean }>

  // LiveKit SFU Connection & JWT Generation
  getLiveKitConnection: (params?: { room?: string; identity?: string; name?: string; avatarUrl?: string }) => Promise<LiveKitConnectionResult>

  // Windows Startup Settings
  getAutoStartSettings: () => Promise<{ openAtLogin: boolean }>
  setAutoStartSettings: (settings: AutoStartSettings) => Promise<{ success: boolean; openAtLogin?: boolean; error?: string }>

  // Window Controls
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  quitApp?: () => Promise<void>
  isMaximized: () => Promise<boolean>
  setFullScreen: (flag: boolean) => Promise<void>
  isFullScreen: () => Promise<boolean>

  // Deep-Linking Protocol (echo://)
  getInitialInviteUrl: () => Promise<string | null>
  onDeepLinkInvite: (callback: (url: string) => void) => void

  // Mini Overlay Game Window
  toggleOverlay: () => Promise<boolean>
  openOverlay: () => Promise<boolean>
  closeOverlay: () => Promise<boolean>
  isOverlayOpen: () => Promise<boolean>

  // External Browser URL Opening
  openExternal: (url: string) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
