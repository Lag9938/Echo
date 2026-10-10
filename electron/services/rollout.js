// Liberação gradual das atualizações.
//
// Uma versão nova não chega a todo mundo de uma vez: o arquivo que os apps consultam (latest.yml) leva uma
// linha `stagingPercentage: N`, e só N% das instalações enxergam a versão. Cada instalação tem um número
// fixo sorteado na primeira vez (o electron-updater guarda em disco), então quem está nos primeiros 25%
// continua neles quando a porcentagem sobe. Se a versão der problema, basta pôr 0: ninguém mais a recebe.
//
// A porcentagem é trocada sem compilar nada (.github/workflows/rollout.yml reenvia só o latest.yml).

/** Porcentagem com que toda versão nasce */
export const INITIAL_ROLLOUT = 25
/** Depois de quantas horas sem ninguém pausar a versão vai para todo mundo */
export const FULL_ROLLOUT_AFTER_HOURS = 24

const STAGING_LINE = /^stagingPercentage:.*\r?\n?/m

/** Porcentagem escrita num latest.yml (100 quando não há linha: versão liberada para todos) */
export function readRollout(yamlText) {
  const match = String(yamlText || '').match(/^stagingPercentage:\s*(\d+)\s*$/m)
  if (!match) return 100
  return Math.min(100, Number(match[1]))
}

/** Devolve o latest.yml com a porcentagem pedida. 100 tira a linha (é o formato de versão totalmente liberada). */
export function setRollout(yamlText, percentage) {
  const value = Number(percentage)
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(`porcentagem inválida: ${percentage} (use um inteiro de 0 a 100)`)
  }
  const text = String(yamlText || '').replace(STAGING_LINE, '')
  if (value === 100) return text
  return `${text.endsWith('\n') || text === '' ? text : `${text}\n`}stagingPercentage: ${value}\n`
}

/**
 * A liberação deve ir para 100% agora? Só quando está em andamento (nem pausada em 0, nem já completa) e a
 * versão foi publicada há tempo suficiente sem ninguém pausar.
 */
export function shouldCompleteRollout({ percentage, publishedAt, now = Date.now(), afterHours = FULL_ROLLOUT_AFTER_HOURS }) {
  if (!(percentage > 0 && percentage < 100)) return false
  const published = new Date(publishedAt).getTime()
  if (!Number.isFinite(published)) return false
  return now - published >= afterHours * 3600 * 1000
}

/**
 * Esta instalação recebe a versão? `inDefaultGroup` é a conta do electron-updater (o número fixo da
 * instalação contra a porcentagem). Quem pede a atualização na mão ("Buscar atualizações") recebe mesmo fora
 * do grupo — menos quando a versão está pausada (0%), que vale para todo mundo.
 */
export function isWithinRollout({ percentage, manual, inDefaultGroup }) {
  if (percentage === 0) return false
  if (manual) return true
  return Boolean(inDefaultGroup)
}

/** Porcentagem que veio no aviso de atualização (sem o campo = 100) */
export function rolloutOf(updateInfo) {
  const raw = updateInfo?.stagingPercentage
  if (raw == null) return 100
  const value = parseInt(raw, 10)
  return Number.isNaN(value) ? 100 : Math.max(0, Math.min(100, value))
}
