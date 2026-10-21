import fs from 'node:fs'
import path from 'node:path'

/**
 * As janelinhas do atualizador (services/updateNotice.js) rodam depois que o app fechou, num PowerShell solto, e por
 * isso não enxergam o tema escolhido no Echo (ele vive na tela, no localStorage). Aqui o processo principal pergunta
 * à tela qual tema está em uso e guarda a resposta num arquivinho; a volta automática (que roda na abertura seguinte,
 * sem tela ainda) lê esse arquivo.
 */
const FILE = 'appearance.json'

export function readStoredTheme(dir) {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(dir, FILE), 'utf8'))
    return value?.theme === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function storeTheme(dir, theme) {
  try {
    fs.writeFileSync(path.join(dir, FILE), JSON.stringify({ theme: theme === 'light' ? 'light' : 'dark' }))
  } catch {
    // só aparência: nunca pode atrapalhar a atualização
  }
}

/** Pergunta à tela se o tema claro está ligado. Sem tela (ou se ela demorar), devolve o último tema guardado. */
export async function probeTheme(win, dir, timeoutMs = 400) {
  const fallback = readStoredTheme(dir)
  if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) return fallback
  try {
    const light = await Promise.race([
      win.webContents.executeJavaScript("document.body.classList.contains('light-theme')"),
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ])
    if (light === null || light === undefined) return fallback
    const theme = light ? 'light' : 'dark'
    storeTheme(dir, theme)
    return theme
  } catch {
    return fallback
  }
}
