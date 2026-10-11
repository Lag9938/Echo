// Por que a entrada numa chamada falhou, em palavras que a pessoa entende.
//
// Antes, qualquer falha ao entrar (microfone, servidor, internet) só tirava a pessoa da sala, sem mensagem
// nenhuma: para ela, "cliquei para entrar e o Echo me desconectou na hora". Sem o motivo, nem ela nem quem dá
// suporte tinha por onde começar.

export interface VoiceNotice {
  title: string
  message: string
  /** Rótulo curto para a análise de uso (sem dados pessoais) */
  code: string
}

function errorName(error: unknown): string {
  return typeof error === 'object' && error !== null && 'name' in error ? String((error as { name: unknown }).name) : ''
}

function errorText(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) return String((error as { message: unknown }).message)
  return String(error ?? '')
}

/** O microfone não pôde ser aberto: a pessoa entra só ouvindo, com este aviso */
export function describeMicrophoneError(error: unknown): VoiceNotice {
  const name = errorName(error)
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      code: 'mic-blocked',
      title: 'Você entrou só ouvindo',
      message: 'O Windows está bloqueando o microfone para o Echo. Abra Configurações do Windows > Privacidade e segurança > Microfone, libere o acesso e entre de novo na chamada.'
    }
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return {
      code: 'mic-missing',
      title: 'Você entrou só ouvindo',
      message: 'Nenhum microfone foi encontrado. Confira se o fone ou o microfone está conectado e entre de novo na chamada.'
    }
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return {
      code: 'mic-busy',
      title: 'Você entrou só ouvindo',
      message: 'O microfone não respondeu: ele pode estar em uso por outro programa ou ter sido desconectado. Feche o outro programa (ou reconecte o fone) e entre de novo na chamada.'
    }
  }
  return {
    code: 'mic-error',
    title: 'Você entrou só ouvindo',
    message: 'Não foi possível abrir o microfone. Confira o dispositivo em Configurações > Voz e Áudio e entre de novo na chamada.'
  }
}

/** A entrada na chamada falhou de vez (não conectou) */
export function describeVoiceJoinError(error: unknown): VoiceNotice {
  const text = errorText(error).toLowerCase()
  if (text.includes('credenciais')) {
    return {
      code: 'token',
      title: 'Não foi possível entrar na chamada',
      message: 'O Echo não conseguiu a autorização para entrar nesta sala. Verifique sua conexão e tente de novo; se continuar, feche e abra o Echo.'
    }
  }
  if (text.includes('permission') || text.includes('not allowed') || text.includes('unauthorized') || text.includes('401') || text.includes('403')) {
    return {
      code: 'denied',
      title: 'Não foi possível entrar na chamada',
      message: 'O servidor de voz recusou a entrada. Você pode não ter permissão para esta sala.'
    }
  }
  if (text.includes('timeout') || text.includes('timed out') || text.includes('websocket') || text.includes('could not establish') || text.includes('network') || text.includes('fetch') || text.includes('signal')) {
    return {
      code: 'network',
      title: 'Não foi possível entrar na chamada',
      message: 'Não deu para conectar ao servidor de voz. Verifique sua internet (e se um antivírus ou firewall não está bloqueando o Echo) e tente de novo.'
    }
  }
  return {
    code: 'unknown',
    title: 'Não foi possível entrar na chamada',
    message: 'Algo deu errado ao entrar na sala. Tente de novo; se continuar, feche e abra o Echo.'
  }
}

/** A mesma conta entrou na chamada por outro aparelho ou outra janela do Echo */
export const DUPLICATE_SESSION_NOTICE: VoiceNotice = {
  code: 'duplicate',
  title: 'Você saiu da chamada',
  message: 'Sua conta entrou nesta chamada em outro lugar (outro computador ou outra janela do Echo). Só uma sessão por conta pode ficar na mesma sala.'
}
