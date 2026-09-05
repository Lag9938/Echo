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

  // Rich Presence Game Detection API
  onGameDetected: (callback) => {
    ipcRenderer.removeAllListeners('game-detected')
    ipcRenderer.on('game-detected', (_event, game) => callback(game))
  },
  checkActiveGame: () => ipcRenderer.invoke('check-active-game'),

  // Push-to-Talk Global Shortcut API
  registerGlobalPTT: (shortcut) => ipcRenderer.invoke('register-global-ptt', shortcut),
  unregisterGlobalPTT: () => ipcRenderer.invoke('unregister-global-ptt'),
  onPTTStateChange: (callback) => {
    ipcRenderer.removeAllListeners('ptt-state')
    ipcRenderer.on('ptt-state', (_event, isPressed) => callback(isPressed))
  },

  // Windows Native Notifications API
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),

  // LiveKit SFU API
  getLiveKitConnection: (params) => ipcRenderer.invoke('get-livekit-connection', params),

  // Auto-start with Windows (Startup) API
  getAutoStartSettings: () => ipcRenderer.invoke('get-autostart-settings'),
  setAutoStartSettings: (settings) => ipcRenderer.invoke('set-autostart-settings', settings)
})
