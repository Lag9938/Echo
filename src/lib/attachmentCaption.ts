// Uma imagem enviada sem legenda vira uma mensagem cujo texto é o NOME DO ARQUIVO ("screenshot_1789….png") ou
// "Imagem". Isso é só o nome interno do envio, não algo que a pessoa escreveu: mostrar embaixo da foto é ruído.

const IMAGE_FILE_NAME = /^[^\s/\\][^/\\]*\.(png|jpe?g|gif|webp|bmp|heic|heif|avif|svg)$/i

/** true se o texto de uma mensagem com imagem é só o nome do arquivo (ou vazio, "Imagem" ou um link) */
export function isAutoImageCaption(body: string | null | undefined): boolean {
  const text = (body ?? '').trim()
  if (!text) return true
  if (text === 'Imagem') return true
  if (/^https?:\/\//i.test(text)) return true
  return IMAGE_FILE_NAME.test(text)
}
