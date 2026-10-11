// Envio de arquivos nas conversas (canais, mensagens diretas e grupos).
//
// O limite e os tipos aceitos são os do servidor de arquivos (bucket "attachments" do Supabase): 25 MB e a
// lista abaixo. Conferir aqui antes de enviar troca um erro técnico em inglês por um aviso que a pessoa
// entende, e evita subir 25 MB para só então ser recusado.
//
// O nome e o tamanho do arquivo viajam no final do endereço, depois de "#" (essa parte nunca é enviada ao
// servidor): versões antigas do Echo abrem o endereço normalmente, e as novas mostram o cartão com nome e
// tamanho mesmo quando a mensagem tem legenda.

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
/** Quantos arquivos podem ser enviados de uma vez (soltando ou escolhendo vários) */
export const MAX_FILES_AT_ONCE = 10

/** Envia os arquivos um depois do outro, na ordem, parando no limite por vez */
export async function sendFilesInOrder(files: File[], send: (file: File) => unknown): Promise<number> {
  const batch = files.slice(0, MAX_FILES_AT_ONCE)
  for (const file of batch) await send(file)
  return files.length - batch.length
}

/** Extensão → tipo aceito pelo servidor. Serve também quando o Windows não informa o tipo do arquivo. */
const EXTENSION_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain', log: 'text/plain', md: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  zip: 'application/zip',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp'
}

const ALLOWED_EXACT = new Set(Object.values(EXTENSION_TYPES).concat(['application/x-zip-compressed']))
const ALLOWED_PREFIXES = ['image/', 'audio/', 'video/']

export function fileExtension(name: string | null | undefined): string {
  const clean = String(name || '').split(/[?#]/)[0]
  const dot = clean.lastIndexOf('.')
  if (dot <= 0 || dot === clean.length - 1) return ''
  return clean.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Tipo com que o arquivo deve ser enviado, ou null se o servidor não aceita esse tipo */
export function uploadContentType(file: { name: string; type?: string }): string | null {
  const declared = (file.type || '').toLowerCase()
  if (declared && (ALLOWED_EXACT.has(declared) || ALLOWED_PREFIXES.some((prefix) => declared.startsWith(prefix)))) return declared
  return EXTENSION_TYPES[fileExtension(file.name)] ?? null
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export type AttachmentCheck = { ok: true; contentType: string } | { ok: false; reason: string }

/** Pode enviar? Se não, `reason` é a frase para mostrar à pessoa. */
export function checkAttachment(file: { name: string; type?: string; size: number }): AttachmentCheck {
  if (file.size === 0) return { ok: false, reason: `"${file.name}" está vazio.` }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, reason: `"${file.name}" tem ${formatFileSize(file.size)}. O limite é de 25 MB por arquivo.` }
  }
  const contentType = uploadContentType(file)
  if (!contentType) {
    const ext = fileExtension(file.name)
    return {
      ok: false,
      reason: `O Echo não envia arquivos ${ext ? `.${ext}` : 'desse tipo'}. Aceitos: imagens, vídeos, áudios, PDF, Word, Excel, PowerPoint, texto, ZIP, RAR e 7z.`
    }
  }
  return { ok: true, contentType }
}

/** Texto curto do tipo, para o cartão do arquivo ("PDF", "ZIP", "Vídeo"...) */
export function fileKindLabel(name: string | null | undefined): string {
  const ext = fileExtension(name)
  if (!ext) return 'Arquivo'
  const type = EXTENSION_TYPES[ext] || ''
  if (type.startsWith('video/')) return 'Vídeo'
  if (type.startsWith('audio/')) return 'Áudio'
  if (type.startsWith('image/')) return 'Imagem'
  return ext.toUpperCase()
}

/** Acrescenta nome e tamanho ao endereço do arquivo (depois de "#") */
export function withFileInfo(url: string, file: { name: string; size: number }): string {
  const params = new URLSearchParams({ name: file.name.slice(0, 180), size: String(file.size) })
  return `${url.split('#')[0]}#${params.toString()}`
}

export interface FileInfo {
  /** Endereço limpo, sem a parte do "#" */
  url: string
  name: string
  size: number | null
}

/** Lê nome e tamanho do endereço. `fallbackName` cobre os arquivos enviados antes desta versão. */
export function readFileInfo(url: string | null | undefined, fallbackName?: string | null): FileInfo {
  const raw = String(url || '')
  const hash = raw.indexOf('#')
  const clean = hash >= 0 ? raw.slice(0, hash) : raw
  const params = new URLSearchParams(hash >= 0 ? raw.slice(hash + 1) : '')
  const size = Number(params.get('size'))
  const fromUrl = decodeURIComponent(clean.split('/').pop()?.split('?')[0] || '')
  return {
    url: clean,
    name: params.get('name') || (fallbackName || '').trim() || fromUrl || 'Arquivo',
    size: params.has('size') && Number.isFinite(size) && size >= 0 ? size : null
  }
}

/** A legenda é só o nome do arquivo repetido? (mensagens sem legenda guardam o nome no texto) */
export function isCaptionJustFileName(body: string | null | undefined, info: FileInfo): boolean {
  const text = (body || '').trim()
  return !text || text === info.name || text === 'Imagem' || text === 'Arquivo'
}

/** Arquivos de um arrastar-e-soltar ou colar (pastas e itens que não são arquivo ficam de fora) */
export function filesFromTransfer(transfer: Pick<DataTransfer, 'files'> | null | undefined): File[] {
  if (!transfer?.files) return []
  return Array.from(transfer.files).filter((file) => file.size > 0 || file.type !== '')
}
