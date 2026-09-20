import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateTempMessageId,
  createAntiSpamState,
  validateMessageAntiSpam,
  toggleEmojiReactionCore,
  shouldSendTypingNotification
} from '../useEchoMessagesCore'

describe('useEchoMessagesCore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('generateTempMessageId gera IDs únicos com prefixo', () => {
    const id1 = generateTempMessageId()
    const id2 = generateTempMessageId()
    expect(id1).toMatch(/^temp-\d+-[a-z0-9]+$/)
    expect(id1).not.toBe(id2)

    const customId = generateTempMessageId('custom')
    expect(customId).toMatch(/^custom-\d+-[a-z0-9]+$/)
  })

  it('validateMessageAntiSpam bloqueia envio repetido consecutivo em < 2s', () => {
    const state = createAntiSpamState()
    const now = 10000

    // Primeiro envio -> permitido
    const r1 = validateMessageAntiSpam(state, 'Olá mundo', now)
    expect(r1.allowed).toBe(true)

    // Envio idêntico 1s depois -> bloqueado por spam
    const r2 = validateMessageAntiSpam(state, 'Olá mundo', now + 1000)
    expect(r2.allowed).toBe(false)
    expect(r2.toastTitle).toBe('Spam Detectado')

    // Envio diferente 1s depois -> permitido
    const r3 = validateMessageAntiSpam(state, 'Outra mensagem', now + 1000)
    expect(r3.allowed).toBe(true)
  })

  it('validateMessageAntiSpam bloqueia flood de mais de 4 mensagens em 4s', () => {
    const state = createAntiSpamState()
    const baseTime = 20000

    // Envia 4 mensagens distintas
    expect(validateMessageAntiSpam(state, 'msg 1', baseTime).allowed).toBe(true)
    expect(validateMessageAntiSpam(state, 'msg 2', baseTime + 500).allowed).toBe(true)
    expect(validateMessageAntiSpam(state, 'msg 3', baseTime + 1000).allowed).toBe(true)
    expect(validateMessageAntiSpam(state, 'msg 4', baseTime + 1500).allowed).toBe(true)

    // 5ª mensagem dentro de 4s -> bloqueada
    const flood = validateMessageAntiSpam(state, 'msg 5', baseTime + 2000)
    expect(flood.allowed).toBe(false)
    expect(flood.toastTitle).toBe('Calma aí!')

    // Após 5s -> permitido novamente
    expect(validateMessageAntiSpam(state, 'msg 6', baseTime + 6000).allowed).toBe(true)
  })

  it('toggleEmojiReactionCore adiciona e remove reações e persiste no Supabase e localStorage', () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          then: vi.fn().mockImplementation((cb: any) => cb({ error: null }))
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: vi.fn().mockImplementation((cb: any) => cb({ error: null }))
              })
            })
          })
        })
      })
    }

    let reactions: Record<string, Record<string, string[]>> = {}

    // Adiciona reação
    reactions = toggleEmojiReactionCore(reactions, 'm-1', '🚀', 'u-1', mockSupabase)
    expect(reactions['m-1']['🚀']).toContain('u-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('message_reactions')

    // Remove reação ao clicar novamente
    reactions = toggleEmojiReactionCore(reactions, 'm-1', '🚀', 'u-1', mockSupabase)
    expect(reactions['m-1']['🚀']).toBeUndefined()
  })

  it('shouldSendTypingNotification limita envio de digitação pelo intervalo', () => {
    const lastSentRef = { current: 0 }

    expect(shouldSendTypingNotification(lastSentRef, 3000, 10000)).toBe(true)
    expect(lastSentRef.current).toBe(10000)

    // 1s depois -> false (dentro do intervalo de 3s)
    expect(shouldSendTypingNotification(lastSentRef, 3000, 11000)).toBe(false)

    // 4s depois -> true
    expect(shouldSendTypingNotification(lastSentRef, 3000, 14000)).toBe(true)
    expect(lastSentRef.current).toBe(14000)
  })
})
