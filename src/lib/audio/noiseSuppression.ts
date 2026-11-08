/**
 * Supressão de ruído do navegador (WebRTC). Com a supressão por IA (RNNoise) ligada ela fica desligada:
 * as duas em série deixam a voz metálica e cortam o começo das palavras (o Discord faz o mesmo com o Krisp).
 */
export function browserNoiseSuppression(preference: boolean, aiDenoiseEnabled: boolean): boolean {
  return preference && !aiDenoiseEnabled
}

/**
 * A IA foi pedida (e por isso a supressão do navegador abriu o microfone desligada), mas o RNNoise não carregou
 * (modelo, worklet ou o pipeline inteiro falhou): ligar a supressão do navegador no microfone já aberto, em vez
 * de a pessoa falar sem supressão nenhuma. Devolve true se ligou.
 */
export async function restoreBrowserNoiseSuppression(
  stream: MediaStream | null,
  preference: boolean,
  aiRequested: boolean,
  aiActive: boolean
): Promise<boolean> {
  if (!stream || !preference || !aiRequested || aiActive) return false
  const track = stream.getAudioTracks()[0]
  if (!track) return false
  try {
    await track.applyConstraints({ noiseSuppression: true })
    console.warn('[RNNoise] IA indisponível: supressão de ruído do navegador ligada no lugar')
    return true
  } catch (err) {
    console.warn('[RNNoise] IA indisponível e a supressão do navegador não pôde ser ligada:', err)
    return false
  }
}
