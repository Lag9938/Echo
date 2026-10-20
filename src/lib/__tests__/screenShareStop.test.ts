import { describe, it, expect } from 'vitest'
import { captureEndedNotice } from '../screenShareStop'

describe('aviso de transmissão encerrada pela captura', () => {
  it('janela: diz que a janela fechou ou foi trocada (caso do jogo no navegador)', () => {
    const notice = captureEndedNotice('window:460366:1')
    expect(notice.title).toBe('Transmissão encerrada')
    expect(notice.message).toMatch(/janela/)
    expect(notice.message).toMatch(/Clique aqui/)
  })

  it('tela inteira ou fonte desconhecida: fala da captura da tela', () => {
    expect(captureEndedNotice('screen:0:0').message).toMatch(/capturar a tela/)
    expect(captureEndedNotice(null).message).toMatch(/capturar a tela/)
  })
})
