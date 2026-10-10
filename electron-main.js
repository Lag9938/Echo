// Echo Desktop Bootstrap.
// O guarda de inicialização roda primeiro e só então o app (electron/main.js) é carregado: se uma versão nova
// vier quebrada a ponto de o código principal nem carregar, o guarda reinstala a versão anterior.
import { guardedStart } from './electron/startupGuard.js'

await guardedStart(() => import('./electron/main.js'))
