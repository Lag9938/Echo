// Por que uma transmissão de tela terminou. Vai para a análise de uso (evento screenshare_stopped, campo
// stop_reason) e decide o aviso para quem transmitia.
//
// Antes, quando a captura terminava sozinha (a janela transmitida fechou, o jogo abriu em outra janela, o
// navegador reiniciou), a transmissão sumia sem nenhum aviso e sem registro do motivo: só dava para adivinhar.

export type ScreenShareStopReason =
  /** A pessoa clicou em "Parar" */
  | 'manual'
  /** O Windows/Chromium encerrou a captura: a janela ou a tela transmitida deixou de existir */
  | 'capture_ended'
  /** A conexão caiu e a chamada foi refeita (a tela não volta sozinha) */
  | 'connection_lost'
  /** Saiu da chamada transmitindo */
  | 'left_call'
  /** Trocou de janela/tela ("Mudar de janela"): a anterior termina e a nova começa */
  | 'replaced'

/** O aviso para quem transmitia quando a captura terminou sozinha (clicar nele abre a escolha de tela) */
export function captureEndedNotice(sourceId: string | null | undefined): { title: string; message: string } {
  const isWindow = typeof sourceId === 'string' && sourceId.startsWith('window:')
  return {
    title: 'Transmissão encerrada',
    message: isWindow
      ? 'A janela que você transmitia foi fechada ou trocada por outra (um jogo no navegador pode abrir em outra janela). Clique aqui para escolher de novo.'
      : 'O Windows parou de capturar a tela (por exemplo, um monitor foi desligado ou a resolução mudou). Clique aqui para escolher de novo.'
  }
}

/** Evento que pede para abrir a escolha de tela (o aviso acima dispara; hooks/useEchoScreenShare.ts escuta) */
export const OPEN_SCREEN_PICKER_EVENT = 'echo-open-screen-picker'
