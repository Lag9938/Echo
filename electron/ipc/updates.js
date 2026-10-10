import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { app, dialog, ipcMain } from 'electron'
import path from 'node:path'
import { appendUpdateLog, startRelaunchWatchdog } from '../services/updateRelaunch.js'
import { isVersionBlocked, keepInstallerCopy, recordPendingUpdate } from '../services/rollback.js'
import { createUpdateState, isRendererHealthy, runReadyFallback } from '../services/updateFallback.js'

/** Tempo para a tela mostrar (e confirmar) o aviso antes de o processo principal assumir */
const FALLBACK_DELAY_MS = 30000

const state = createUpdateState()
const logFile = () => path.join(app.getPath('userData'), 'update.log')
const log = (message) => appendUpdateLog(logFile(), message)
let initialized = false
let installing = false
let developmentMode = true
let beforeInstall = () => {}

/** Instala a atualização já baixada e reabre o app. Usado pela tela, pela bandeja e pela conferência automática. */
export function installDownloadedUpdate(reason = 'pedido pela tela') {
  if (installing) return
  installing = true
  log(`instalando atualização (versão atual ${app.getVersion()}; ${reason})`)
  // O instalador deveria reabrir o Echo sozinho. Este vigia garante isso: se depois da instalação o
  // app não estiver aberto, ele é iniciado (e se a instalação falhar, volta a versão que já estava instalada).
  if (!developmentMode) {
    startRelaunchWatchdog({
      execPath: process.execPath,
      updaterDirName: `${app.getName().toLowerCase()}-updater`,
      logFile: logFile(),
      scriptFile: path.join(app.getPath('userData'), 'update-relaunch.ps1')
    })
  }
  beforeInstall()
  // Instalação silenciosa (/S) com --force-run: sem janela do instalador, nenhum aviso pode ficar esperando
  // um clique escondido atrás de outras janelas, e o instalador reabre o Echo ao terminar
  autoUpdater.quitAndInstall(true, true)
}

/** "Buscar atualizações" no menu da bandeja: funciona mesmo com a tela do app quebrada */
export async function checkForUpdatesFromTray() {
  if (developmentMode) {
    dialog.showMessageBox({ type: 'info', title: 'Echo', message: 'A busca por atualizações só existe no Echo instalado.', buttons: ['OK'] }).catch(() => {})
    return
  }
  if (state.status === 'ready') {
    const answer = await dialog.showMessageBox({
      type: 'info', title: 'Echo', message: `Nova versão do Echo pronta (${state.version})`,
      detail: 'Reinicie para instalar. Leva alguns segundos e o Echo reabre sozinho.',
      buttons: ['Reiniciar agora', 'Depois'], defaultId: 0, cancelId: 1
    }).catch(() => null)
    if (answer && answer.response === 0) installDownloadedUpdate('menu da bandeja')
    return
  }
  try {
    const result = await autoUpdater.checkForUpdates()
    const found = result?.updateInfo?.version
    const current = app.getVersion()
    const message = !found || found === current
      ? `Você já está na versão mais recente (${current}).`
      : isVersionBlocked(app.getPath('userData'), found)
        ? `A versão ${found} não abriu neste computador e foi desfeita. O Echo continua na ${current} até sair uma correção.`
        : `Baixando a versão ${found}. O Echo avisa quando ela estiver pronta para instalar.`
    dialog.showMessageBox({ type: 'info', title: 'Echo', message, buttons: ['OK'] }).catch(() => {})
  } catch (err) {
    dialog.showMessageBox({
      type: 'warning', title: 'Echo', message: 'Não foi possível buscar atualizações agora.',
      detail: String(err?.message || err).slice(0, 300), buttons: ['OK']
    }).catch(() => {})
  }
}

/**
 * Liga o atualizador. É chamado UMA vez, antes de criar a janela: buscar, baixar e instalar atualização não
 * pode depender de a janela existir (era registrado dentro da criação da janela — se ela falhasse, o app
 * nunca buscaria a correção).
 */
export function setupUpdatesIpc(safeHandle, isDevelopment, onInstallUpdate, getMainWindow) {
  if (initialized) return
  initialized = true
  developmentMode = isDevelopment
  beforeInstall = onInstallUpdate
  const send = (channel, payload) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
  }

  ipcMain.on('install-update', () => installDownloadedUpdate('pedido pela tela'))
  // A tela avisa que mostrou "Nova versão pronta": o caminho normal está funcionando
  ipcMain.on('update-ready-ack', (_event, version) => { if (typeof version === 'string') state.acknowledged = version })
  // A tela pode ter carregado depois de a atualização ficar pronta: ela pergunta o estado ao abrir
  safeHandle('get-update-state', () => ({ status: state.status === 'idle' ? 'idle' : state.status, version: state.version, percent: state.percent }))

  safeHandle('check-for-updates', async () => {
    if (!isDevelopment) {
      try {
        const result = await autoUpdater.checkForUpdates()
        return { success: true, updateInfo: result?.updateInfo }
      } catch (err) {
        return { success: false, error: err.message }
      }
    }
    return { success: false, message: 'Em modo de desenvolvimento' }
  })

  if (isDevelopment) return

  const dataDir = app.getPath('userData')
  // O download é pedido aqui, e não automático, para dar tempo de recusar uma versão que já foi desfeita
  // neste computador (services/rollback.js): senão ela seria baixada e instalada de novo ao fechar o app.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = true

  autoUpdater.on('update-available', (info) => {
    if (isVersionBlocked(dataDir, info.version)) {
      log(`atualização ${info.version} ignorada: foi desfeita neste computador`)
      return
    }
    console.log('Atualização disponível:', info.version)
    if (state.status !== 'ready' || state.version !== info.version) {
      state.status = 'downloading'; state.version = info.version; state.percent = 0
    }
    send('update-available', { version: info.version })
    autoUpdater.downloadUpdate().catch((err) => {
      log(`erro ao baixar a atualização ${info.version}: ${err?.message || err}`)
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    state.percent = Math.round(progress.percent)
    send('update-progress', { percent: state.percent, transferred: progress.transferred, total: progress.total })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Atualização baixada:', info.version)
    log(`atualização ${info.version} baixada`)
    // Anota como voltar para a versão atual se a nova não abrir, e guarda o instalador da nova para a
    // atualização seguinte poder voltar para ela sem depender da internet
    const current = app.getVersion()
    if (recordPendingUpdate(dataDir, { fromVersion: current, toVersion: info.version })) {
      log(`volta automática preparada: ${info.version} -> ${current} se a nova não abrir`)
    }
    if (info.downloadedFile) {
      keepInstallerCopy(dataDir, { version: info.version, downloadedFile: info.downloadedFile, currentVersion: current })
        .catch(() => {})
    }
    state.status = 'ready'; state.version = info.version; state.percent = 100
    send('update-ready', { version: info.version })

    // Uma conferência por versão: se a tela não deu sinal de vida, o processo principal assume
    if (state.scheduled !== info.version) {
      state.scheduled = info.version
      setTimeout(() => {
        if (installing) return
        runReadyFallback({
          state,
          version: info.version,
          isHealthy: isRendererHealthy,
          showDialog: (options) => dialog.showMessageBox(options),
          install: installDownloadedUpdate,
          log,
          wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
        }).catch((err) => log(`conferência da atualização falhou: ${err?.message || err}`))
      }, FALLBACK_DELAY_MS)
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('Erro no auto-updater:', err.message)
    log(`erro no atualizador: ${err.message}`)
  })

  autoUpdater.checkForUpdates().catch(err => {
    console.error('Erro ao verificar atualizações:', err)
  })

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 10 * 60 * 1000)
}
