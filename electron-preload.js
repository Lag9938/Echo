const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),

  // Auto-update API
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, progress) => callback(progress)),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', (_event, info) => callback(info)),
  installUpdate: () => ipcRenderer.send('install-update')
})
