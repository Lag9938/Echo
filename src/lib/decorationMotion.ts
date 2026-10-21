// Quando uma decoração de avatar se mexe.
//
// Nas listas (membros, mensagens, amigos, rodapé) os avatares são pequenos e muitos: animar todos o tempo todo era o
// maior custo de desenho do app (medido: 9 decorações na tela de amigos = ~6% de um núcleo na tela e ~14% na placa de
// vídeo). Como no Discord, a decoração pequena fica parada e só anima com o mouse em cima; a grande (perfil, loja,
// "Novo na Loja") é a estrela da tela e anima sempre. O corte é pelo tamanho da caixa da decoração, para valer em
// qualquer lugar sem cada tela precisar dizer se é "lista".
//
// Quem aplica: styles/decoration-motion.css (decorações em SVG, por container query), components/AvatarVideoDecoration
// (as em vídeo) e lib/animationGovernor.ts (não assume as pequenas, senão elas continuariam andando depois do mouse sair).

/** Largura da caixa da decoração (156% do avatar) a partir da qual ela é "grande": avatar de ~64 px ou mais */
export const LARGE_DECORATION_PX = 100

/** A caixa da decoração é pequena (decoração de lista: parada até passar o mouse)? */
export function isSmallDecorationBox(width: number): boolean {
  return width < LARGE_DECORATION_PX
}

/**
 * Cartões das grades da Loja e do Inventário: cada um mostra uma decoração (ou efeito de perfil) em tamanho grande,
 * e eram várias tocando ao mesmo tempo. Medido no app aberto na Loja: 5 decorações em vídeo juntas (vídeo com
 * transparência é decodificado no processador) = 63% de um núcleo na tela; só a prévia tocando = 32%. Dentro destes
 * cartões, a animação só roda com o mouse em cima do cartão; a prévia grande (o item escolhido) continua tocando.
 */
export const SHOWCASE_CARD_SELECTOR = '.echo-shop-card, .echo-inv-card'

/** O cartão de grade que contém o elemento, se houver (é nele que o mouse precisa estar) */
export function showcaseCardOf(el: Element | null | undefined): Element | null {
  return el && typeof el.closest === 'function' ? el.closest(SHOWCASE_CARD_SELECTOR) : null
}
