// Liberação gradual: lê ou troca a porcentagem de um latest.yml (regras em electron/services/rollout.js).
//
//   node scripts/set-rollout.mjs <latest.yml> <0-100|inicial>   grava a porcentagem ("inicial" = a padrão)
//   node scripts/set-rollout.mjs --read <latest.yml>            mostra a porcentagem atual
//   node scripts/set-rollout.mjs --due <latest.yml> <publicado> sai com 0 se já deve ir para 100%
import fs from 'node:fs'
import { INITIAL_ROLLOUT, readRollout, setRollout, shouldCompleteRollout } from '../electron/services/rollout.js'

const [first, second, third] = process.argv.slice(2)

if (first === '--read') {
  console.log(readRollout(fs.readFileSync(second, 'utf8')))
} else if (first === '--due') {
  const percentage = readRollout(fs.readFileSync(second, 'utf8'))
  const due = shouldCompleteRollout({ percentage, publishedAt: third })
  console.log(`liberação em ${percentage}%, publicada em ${third}: ${due ? 'completar agora' : 'nada a fazer'}`)
  process.exit(due ? 0 : 1)
} else if (first && second !== undefined) {
  const percentage = second === 'inicial' ? INITIAL_ROLLOUT : Number(second)
  fs.writeFileSync(first, setRollout(fs.readFileSync(first, 'utf8'), percentage))
  console.log(`liberação gravada em ${first}: ${percentage}%`)
} else {
  console.error('uso: node scripts/set-rollout.mjs <latest.yml> <0-100|inicial> | --read <latest.yml> | --due <latest.yml> <data>')
  process.exit(2)
}
