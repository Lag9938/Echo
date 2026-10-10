// Atualização que não depende da tela do app.
//
// Baixar a atualização sempre foi feito pelo processo principal, mas INSTALAR dependia de a tela mostrar o aviso
// "Nova versão pronta" e de a pessoa clicar nele. Com a tela quebrada (em branco, travada, ou com o aviso com
// defeito), a correção ficava baixada e nunca era instalada — a não ser que a pessoa soubesse sair pela bandeja.
//
// Aqui o processo principal confere, um pouco depois de a atualização ficar pronta, se a tela deu sinal de vida:
//   - a tela nem carregou            -> instala sozinho (o app já não está funcionando; não há o que perguntar)
//   - a tela carregou, mas não confirmou que mostrou o aviso -> pergunta por uma janela do próprio sistema
//   - a tela confirmou o aviso       -> nada a fazer, o caminho normal está funcionando

/** Saúde da tela, informada pelo processo principal (main.js confere a tela e avisa aqui) */
let rendererHealthy = false
export function setRendererHealthy(value) { rendererHealthy = Boolean(value) }
export function isRendererHealthy() { return rendererHealthy }

export function createUpdateState() {
  return { status: 'idle', version: '', percent: 0, acknowledged: '', prompted: '', scheduled: '' }
}

export function planReadyFallback({ rendererHealthy: healthy, acknowledged, prompted }) {
  if (prompted) return 'none' // já tratado nesta execução do app
  if (!healthy) return 'install-now'
  if (!acknowledged) return 'ask'
  return 'none'
}

/**
 * Roda a conferência para a versão que ficou pronta. Devolve o que fez ('none' | 'installed' | 'declined').
 * Tudo o que toca o sistema vem de fora, para dar para testar.
 */
export async function runReadyFallback({ state, version, isHealthy, showDialog, install, log, wait }) {
  if (state.status !== 'ready' || state.version !== version) return 'none'
  const plan = planReadyFallback({
    rendererHealthy: isHealthy(),
    acknowledged: state.acknowledged === version,
    prompted: state.prompted === version
  })
  if (plan === 'none') return 'none'
  state.prompted = version

  if (plan === 'install-now') {
    log(`a tela do app não carregou: instalando a ${version} sem depender dela`)
    // O aviso é só informativo: sem resposta em 15 s (ninguém no computador, janela atrás de outra), instala igual
    await Promise.race([
      Promise.resolve(showDialog({
        type: 'info',
        title: 'Echo',
        message: 'O Echo vai reiniciar para instalar uma correção',
        detail: `A tela do Echo não carregou corretamente. A versão ${version} já foi baixada e será instalada agora.`,
        buttons: ['OK']
      })).catch(() => null),
      wait(15000)
    ])
    install('a tela não carregou')
    return 'installed'
  }

  log(`a tela não confirmou o aviso da ${version}: perguntando por uma janela do sistema`)
  const answer = await Promise.resolve(showDialog({
    type: 'info',
    title: 'Echo',
    message: `Nova versão do Echo pronta (${version})`,
    detail: 'Reinicie para instalar. Leva alguns segundos e o Echo reabre sozinho.',
    buttons: ['Reiniciar agora', 'Depois'],
    defaultId: 0,
    cancelId: 1
  })).catch(() => null)
  if (answer && answer.response === 0) { install('janela do sistema'); return 'installed' }
  return 'declined'
}
