const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  restoreWindow: (sourceId) => ipcRenderer.invoke('restore-window', sourceId),
  startProcessAudioCapture: (sourceId) => ipcRenderer.invoke('start-process-audio-capture', sourceId),
  stopProcessAudioCapture: () => ipcRenderer.invoke('stop-process-audio-capture'),
  onScreenshareAudioChunk: (callback) => {
    // Remove all existing listeners first to prevent duplicates
    ipcRenderer.removeAllListeners('screenshare-audio-chunk')
    ipcRenderer.on('screenshare-audio-chunk', (_event, chunk) => callback(chunk))
  },

  // Auto-update API
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, progress) => callback(progress)),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', (_event, info) => callback(info)),
  installUpdate: () => ipcRenderer.send('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Rich Presence Game Detection API
  onGameDetected: (callback) => {
    ipcRenderer.removeAllListeners('game-detected')
    ipcRenderer.on('game-detected', (_event, game) => callback(game))
  },
  checkActiveGame: () => ipcRenderer.invoke('check-active-game'),

  // Global Voice Shortcuts API (PTT, Mute, Deafen)
  registerGlobalPTT: (shortcut) => ipcRenderer.invoke('register-global-ptt', shortcut),
  unregisterGlobalPTT: () => ipcRenderer.invoke('unregister-global-ptt'),
  onPTTStateChange: (callback) => {
    ipcRenderer.removeAllListeners('ptt-state')
    ipcRenderer.on('ptt-state', (_event, isPressed) => callback(isPressed))
  },
  registerGlobalVoiceShortcut: (action, shortcutKey) => ipcRenderer.invoke('register-global-voice-shortcut', { action, shortcutKey }),
  unregisterGlobalVoiceShortcut: (action) => ipcRenderer.invoke('unregister-global-voice-shortcut', action),
  onGlobalVoiceToggle: (callback) => {
    ipcRenderer.removeAllListeners('global-voice-toggle')
    ipcRenderer.on('global-voice-toggle', (_event, action) => callback(action))
  },

  // Windows Native Notifications API
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),

  // LiveKit SFU API
  getLiveKitConnection: (params) => ipcRenderer.invoke('get-livekit-connection', params),

  // Auto-start with Windows (Startup) API
  getAutoStartSettings: () => ipcRenderer.invoke('get-autostart-settings'),
  setAutoStartSettings: (settings) => ipcRenderer.invoke('set-autostart-settings', settings),

  // Window Management API (Custom Controls)
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  quitApp: () => ipcRenderer.invoke('app-quit'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  setFullScreen: (flag) => ipcRenderer.invoke('window-set-fullscreen', flag),
  isFullScreen: () => ipcRenderer.invoke('window-is-fullscreen'),

  // Deep-Link Invite API
  getInitialInviteUrl: () => ipcRenderer.invoke('get-initial-invite-url'),
  onDeepLinkInvite: (callback) => {
    ipcRenderer.removeAllListeners('deep-link-invite')
    ipcRenderer.on('deep-link-invite', (_event, url) => callback(url))
  },

  // Mini Overlay Window API
  toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),
  openOverlay: () => ipcRenderer.invoke('open-overlay'),
  closeOverlay: () => ipcRenderer.invoke('close-overlay'),
  isOverlayOpen: () => ipcRenderer.invoke('is-overlay-open'),

  // Open External URL in default browser
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
})
