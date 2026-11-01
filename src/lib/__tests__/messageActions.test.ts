import { describe, it, expect } from 'vitest'
import {
  FORWARD_PREFIX,
  unwrapMessageBody,
  parseReplyQuote,
  getMessageSnippetLabel,
  buildReplyPrefix,
  buildForwardedBody,
  findRepliedMessage
} from '../messageActions'

describe('messageActions', () => {
  describe('unwrapMessageBody', () => {
    it('returns plain body when no prefix is present', () => {
      const res = unwrapMessageBody('Olá, tudo bem?')
      expect(res).toEqual({
        cleanBody: 'Olá, tudo bem?',
        replyQuoteText: null,
        isForwarded: false
      })
    })

    it('extracts replyQuoteText from > @Autor: "trecho" prefix', () => {
      const raw = '> @Carlos: "Bora jogar hoje?"\nSim, às 21h!'
      const res = unwrapMessageBody(raw)
      expect(res).toEqual({
        cleanBody: 'Sim, às 21h!',
        replyQuoteText: '@Carlos: "Bora jogar hoje?"',
        isForwarded: false
      })
    })

    it('detects forwarded prefix and unwraps clean body', () => {
      const raw = `${FORWARD_PREFIX}Olha essa clipada!`
      const res = unwrapMessageBody(raw)
      expect(res).toEqual({
        cleanBody: 'Olha essa clipada!',
        replyQuoteText: null,
        isForwarded: true
      })
    })

    it('handles forwarded message that originally had a reply prefix', () => {
      const raw = `${FORWARD_PREFIX}> @Ana: "Oi"\nTudo ótimo`
      const res = unwrapMessageBody(raw)
      expect(res.isForwarded).toBe(true)
      expect(res.cleanBody).toBe('Tudo ótimo')
    })
  })

  describe('parseReplyQuote', () => {
    it('parses @Author: "snippet" format', () => {
      expect(parseReplyQuote('@Lag: "Vamos testar"')).toEqual({
        author: 'Lag',
        snippet: 'Vamos testar'
      })
    })
  })

  describe('getMessageSnippetLabel', () => {
    it('returns friendly labels for voice notes, stickers, and images', () => {
      expect(getMessageSnippetLabel({ body: 'Audio', attachment_type: 'audio' })).toBe('🎤 Mensagem de voz')
      expect(getMessageSnippetLabel({ body: 'Sticker', attachment_type: 'sticker' })).toBe('✨ Figurinha')
      expect(getMessageSnippetLabel({ body: 'screenshot_123.png', attachment_url: 'https://x/a.png', attachment_type: 'image' })).toBe('📷 Foto')
    })

    it('truncates long text messages cleanly', () => {
      const longText = 'a'.repeat(80)
      const label = getMessageSnippetLabel({ body: longText })
      expect(label.length).toBeLessThanOrEqual(60)
    })
  })

  describe('buildReplyPrefix & buildForwardedBody', () => {
    it('builds reply prefix with author and clean snippet', () => {
      const prefix = buildReplyPrefix('Igor', { body: 'Bora call agora' })
      expect(prefix).toBe('> @Igor: "Bora call agora"\n')
    })

    it('builds forwarded body with FORWARD_PREFIX and strips nested prefixes', () => {
      const forwarded = buildForwardedBody({
        body: '> @Igor: "Oi"\nMensagem importante'
      })
      expect(forwarded).toBe(`${FORWARD_PREFIX}Mensagem importante`)
    })
  })

  describe('findRepliedMessage', () => {
    it('finds original message matching snippet before current index', () => {
      const messages = [
        { id: 'm1', body: 'Primeira mensagem', author: 'Igor' },
        { id: 'm2', body: 'Bora jogar Valorant hoje?', author: 'Amigo' },
        { id: 'm3', body: '> @Amigo: "Bora jogar Valorant hoje?"\nBora!', author: 'Igor' }
      ]
      const found = findRepliedMessage(messages, 2, '@Amigo: "Bora jogar Valorant hoje?"', (m) => m.author)
      expect(found?.id).toBe('m2')
    })
  })
})
