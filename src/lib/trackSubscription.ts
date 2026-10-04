// Liga ou desliga a assinatura de uma faixa remota do LiveKit (tela ou áudio da tela).
//
// A comparação é com `isDesired` (o que o app PEDIU ao servidor), não com `isSubscribed` (a faixa já chegou).
// A sala conecta com assinatura automática: quando alguém começa a transmitir, o servidor já vai mandar a
// faixa, mas ela ainda não chegou e `isSubscribed` é false. Comparar com ele fazia o app concluir "já não
// estou assinando" e NÃO cancelar — quem não estava assistindo recebia a transmissão inteira (até 8 Mbps
// saindo do servidor de voz) até algum outro evento refazer a conta.
export interface SubscribablePublication {
  readonly isDesired: boolean
  setSubscribed: (subscribed: boolean) => void
}

/** Devolve true se mandou um pedido novo ao servidor. */
export function syncTrackSubscription(publication: SubscribablePublication | undefined | null, wanted: boolean): boolean {
  if (!publication || publication.isDesired === wanted) return false
  publication.setSubscribed(wanted)
  return true
}
