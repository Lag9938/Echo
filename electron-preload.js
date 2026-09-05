const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
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

  // LiveKit SFU API
  getLiveKitConnection: (params) => ipcRenderer.invoke('get-livekit-connection', params),

  // Auto-start with Windows (Startup) API
  getAutoStartSettings: () => ipcRenderer.invoke('get-autostart-settings'),
  setAutoStartSettings: (settings) => ipcRenderer.invoke('set-autostart-settings', settings)
})
