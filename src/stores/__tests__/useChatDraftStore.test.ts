import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatDraftStore, useChannelDraft } from '../useChatDraftStore'

describe('useChatDraftStore', () => {
  beforeEach(() => {
    useChatDraftStore.setState({ drafts: {} })
  })

  it('deve inicializar com rascunhos vazios', () => {
    expect(useChatDraftStore.getState().getDraft('ch-1')).toBe('')
  })

  it('deve armazenar e recuperar rascunho de um canal específico', () => {
    act(() => {
      useChatDraftStore.getState().setDraft('ch-1', 'Olá mundo')
    })
    expect(useChatDraftStore.getState().getDraft('ch-1')).toBe('Olá mundo')
    expect(useChatDraftStore.getState().getDraft('ch-2')).toBe('')
  })

  it('deve isolar rascunhos entre canais diferentes (estilo Discord)', () => {
    act(() => {
      useChatDraftStore.getState().setDraft('ch-geral', 'Mensagem no geral')
      useChatDraftStore.getState().setDraft('ch-memes', 'Foto engraçada')
    })

    expect(useChatDraftStore.getState().getDraft('ch-geral')).toBe('Mensagem no geral')
    expect(useChatDraftStore.getState().getDraft('ch-memes')).toBe('Foto engraçada')
  })

  it('deve limpar o rascunho de um canal específico sem afetar os outros', () => {
    act(() => {
      useChatDraftStore.getState().setDraft('ch-1', 'Texto 1')
      useChatDraftStore.getState().setDraft('ch-2', 'Texto 2')
      useChatDraftStore.getState().clearDraft('ch-1')
    })

    expect(useChatDraftStore.getState().getDraft('ch-1')).toBe('')
    expect(useChatDraftStore.getState().getDraft('ch-2')).toBe('Texto 2')
  })

  it('o hook useChannelDraft deve atualizar reativamente quando o rascunho do canal muda', () => {
    const { result } = renderHook(() => useChannelDraft('ch-1'))
    expect(result.current).toBe('')

    act(() => {
      useChatDraftStore.getState().setDraft('ch-1', 'Digitando...')
    })

    expect(result.current).toBe('Digitando...')
  })
})
