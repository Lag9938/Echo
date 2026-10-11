// Baixar um arquivo recebido numa conversa, com a janela "Salvar como" do Windows.
//
// A tela pede o download; este processo só aceita endereços do servidor de arquivos do Echo (anexos
// públicos do Supabase). Qualquer outro endereço é recusado: uma mensagem maliciosa não consegue fazer o app
// baixar algo de outro site por este caminho.

const ATTACHMENTS_PATH = '/storage/v1/object/public/attachments/'
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

/** Arquivos salvos por aqui nesta sessão: só eles podem ser mostrados na pasta a pedido da tela */
const savedPaths = new Set()
export function wasDownloadedHere(filePath) {
  return typeof filePath === 'string' && savedPaths.has(filePath)
}

/** O endereço é de um anexo do Echo? */
export function isAttachmentUrl(url) {
  if (typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
      && parsed.hostname.endsWith('.supabase.co')
      && parsed.pathname.startsWith(ATTACHMENTS_PATH)
      && !parsed.pathname.includes('..')
  } catch {
    return false
  }
}

/**
 * Nome sugerido na janela de salvar: só o nome (sem pasta), sem caracteres que o Windows recusa. O nome vem
 * de quem enviou o arquivo, então nada nele pode escolher a pasta de destino.
 */
export function safeDownloadName(name, fallback = 'arquivo') {
  const base = String(name || '').split(/[\\/]/).pop() || ''
  // eslint-disable-next-line no-control-regex
  let clean = base.replace(/[<>:"|?*\u0000-\u001f]/g, '_').replace(/^[\s.]+|[\s.]+$/g, '').slice(0, 150)
  if (!clean || WINDOWS_RESERVED.test(clean)) clean = fallback
  return clean
}

/**
 * Inicia o download e abre a janela "Salvar como". Devolve como terminou:
 * 'saved' (com o caminho), 'cancelled' (a pessoa fechou a janela) ou 'failed'.
 */
export function downloadAttachment(win, url, name) {
  return new Promise((resolve) => {
    if (!win || win.isDestroyed() || !isAttachmentUrl(url)) {
      resolve({ status: 'failed' })
      return
    }
    const cleanUrl = url.split('#')[0]
    const session = win.webContents.session
    const onDownload = (_event, item) => {
      if (item.getURL() !== cleanUrl) return
      session.removeListener('will-download', onDownload)
      const fromUrl = decodeURIComponent(new URL(cleanUrl).pathname.split('/').pop() || '')
      item.setSaveDialogOptions({ title: 'Salvar arquivo', defaultPath: safeDownloadName(name, safeDownloadName(fromUrl)) })
      item.once('done', (_doneEvent, state) => {
        if (state === 'completed') {
          savedPaths.add(item.getSavePath())
          resolve({ status: 'saved', path: item.getSavePath() })
        }
        else resolve({ status: state === 'cancelled' ? 'cancelled' : 'failed' })
      })
    }
    session.on('will-download', onDownload)
    win.webContents.downloadURL(cleanUrl)
  })
}
