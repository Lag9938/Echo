/**
 * Supressão de ruído do navegador (WebRTC). Com a supressão por IA (RNNoise) ligada ela fica desligada:
 * as duas em série deixam a voz metálica e cortam o começo das palavras (o Discord faz o mesmo com o Krisp).
 */
export function browserNoiseSuppression(preference: boolean, aiDenoiseEnabled: boolean): boolean {
  return preference && !aiDenoiseEnabled
}
