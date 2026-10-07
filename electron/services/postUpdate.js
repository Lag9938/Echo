import fs from 'node:fs'

// Primeira abertura depois de uma atualização.
//
// O instalador (ou o vigia) reabre o Echo sozinho, mas quem abre é um processo em segundo plano, e o Windows
// não deixa uma janela aberta assim passar na frente das outras: ela aparecia atrás do que a pessoa estivesse
// usando, e parecia que o app não tinha reiniciado. Aqui o app percebe que a versão mudou desde a última
// abertura e traz a própria janela para a frente.

/**
 * Compara a versão atual com a da última abertura (guardada em `file`) e grava a atual.
 * Devolve a versão anterior se mudou e null se é a mesma. Sem registro anterior (instalação nova, ou a
 * primeira abertura de uma versão que passou a guardar isto) devolve 'desconhecida': trazer a janela para a
 * frente nesse caso só ajuda.
 */
export function detectVersionChange(file, currentVersion) {
  let previous = null
  try {
    previous = fs.readFileSync(file, 'utf8').trim() || null
  } catch {
    previous = null
  }
  try {
    if (previous !== currentVersion) fs.writeFileSync(file, currentVersion)
  } catch {
    // sem conseguir gravar, a próxima abertura só vai trazer a janela para a frente de novo: inofensivo
  }
  if (previous === currentVersion) return null
  return previous ?? 'desconhecida'
}

/**
 * Mostra a janela e a põe na frente das outras. "Sempre no topo" por um instante é o que funciona no Windows
 * quando o app não foi aberto por um clique da pessoa; logo em seguida a janela volta ao comportamento normal.
 */
export function bringWindowToFront(win) {
  if (!win || win.isDestroyed()) return false
  try {
    if (win.isMinimized()) win.restore()
    win.show()
    win.setAlwaysOnTop(true)
    win.focus()
    win.moveTop()
    win.setAlwaysOnTop(false)
    return true
  } catch {
    return false
  }
}
