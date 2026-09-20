import { ipcMain } from 'electron'

// Handler seguro para registro de IPC sem risco de erro de duplicidade
export function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel)
  } catch (e) {}
  ipcMain.handle(channel, handler)
}
