import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { describeMicrophoneError, describeVoiceJoinError } from '../voiceJoinErrors'

const named = (name: string, message = '') => Object.assign(new Error(message), { name })

describe('falha ao entrar numa chamada', () => {
  it('microfone: cada causa vira uma orientação diferente, sempre entrando só ouvindo', () => {
    expect(describeMicrophoneError(named('NotAllowedError')).code).toBe('mic-blocked')
    expect(describeMicrophoneError(named('NotFoundError')).code).toBe('mic-missing')
    expect(describeMicrophoneError(named('NotReadableError')).code).toBe('mic-busy')
    expect(describeMicrophoneError('qualquer coisa').code).toBe('mic-error')
    for (const error of [named('NotAllowedError'), named('NotFoundError'), named('NotReadableError'), null]) {
      expect(describeMicrophoneError(error).title).toBe('Você entrou só ouvindo')
    }
  })

  it('conexão: distingue autorização, recusa do servidor e internet', () => {
    expect(describeVoiceJoinError(new Error('Não foi possível gerar credenciais seguras para conectar à sala de voz')).code).toBe('token')
    expect(describeVoiceJoinError(new Error('could not establish signal connection: timeout')).code).toBe('network')
    expect(describeVoiceJoinError(new Error('permission denied')).code).toBe('denied')
    expect(describeVoiceJoinError(undefined).code).toBe('unknown')
    expect(describeVoiceJoinError(new Error('x')).message.length).toBeGreaterThan(20)
  })

  it('o app nunca mais tira a pessoa da sala em silêncio', () => {
    // Lido do código: o defeito era exatamente este caminho existir sem aviso nenhum
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'useVoiceChannel.ts'), 'utf8')
    const joinCatch = source.slice(source.indexOf("console.error('[LiveKit] Falha ao entrar no canal de voz:'"))
    expect(joinCatch.slice(0, 1200)).toContain('describeVoiceJoinError')
    // Microfone que não abre não impede de entrar: a pessoa entra ouvindo
    expect(source).toContain('describeMicrophoneError')
    // A mesma conta em dois lugares não vira um cabo de guerra de reconexões
    expect(source).toContain('DisconnectReason.DUPLICATE_IDENTITY')
  })
})
