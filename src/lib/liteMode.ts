// Modo Leve: o Echo gasta o mínimo de processador e placa de vídeo.
//
// Três escolhas (Configurações > Aparência):
//   - Automático (padrão): liga sozinho enquanto há um jogo aberto e desliga quando ele fecha.
//   - Ligado: sempre leve.
//   - Desligado: nunca leve, nem jogando.
//
// Quando ativo, o app inteiro fica "reduzido": animações decorativas viram um quadro só, vídeos e GIFs ficam parados,
// efeitos em canvas rodam a 15 quadros e os desfoques de vidro viram fundo opaco (a mesma classe do Modo Alto
// Desempenho). Os efeitos de nome (.name-effect-*) NÃO são tocados — regra do projeto.
// Quem aplica: hooks/useLiteModeEffect.ts (classe no <body>), styles/lite-mode.css e hooks/useMotionReduced.ts.

export type LitePreference = 'auto' | 'on' | 'off'

export const LITE_STORAGE_KEY = 'echo-lite-mode'

export const LITE_OPTIONS: Array<{ value: LitePreference; label: string; hint: string }> = [
  { value: 'auto', label: 'Automático', hint: 'Liga sozinho quando você abre um jogo' },
  { value: 'on', label: 'Sempre ligado', hint: 'Animações e desfoques reduzidos o tempo todo' },
  { value: 'off', label: 'Desligado', hint: 'Visual completo, mesmo jogando' }
]

export function readLitePreference(): LitePreference {
  try {
    const saved = localStorage.getItem(LITE_STORAGE_KEY)
    return saved === 'on' || saved === 'off' ? saved : 'auto'
  } catch {
    return 'auto'
  }
}

export function writeLitePreference(value: LitePreference): void {
  try {
    localStorage.setItem(LITE_STORAGE_KEY, value)
  } catch {
    // sem armazenamento: a escolha vale só nesta sessão
  }
}

/** O Modo Leve está valendo agora? */
export function isLiteActive(preference: LitePreference, gameRunning: boolean): boolean {
  if (preference === 'on') return true
  if (preference === 'off') return false
  return gameRunning
}

/** Por que está ativo, para mostrar na configuração */
export function liteReason(preference: LitePreference, gameRunning: boolean): 'manual' | 'game' | null {
  if (preference === 'on') return 'manual'
  if (preference === 'auto' && gameRunning) return 'game'
  return null
}
