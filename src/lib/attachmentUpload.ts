import type { SupabaseClient } from '@supabase/supabase-js'
import { checkAttachment, fileExtension, withFileInfo } from './attachments'

export type UploadResult =
  | { ok: true; url: string; attachmentType: 'image' | 'file'; fileName: string }
  | { ok: false; reason: string }

/**
 * Confere e envia um arquivo para a pasta indicada (ex.: "channels/<canal>" ou "dm/<eu>") e devolve o
 * endereço pronto para a mensagem. Imagens seguem como antes; os demais arquivos levam nome e tamanho no
 * endereço. Qualquer recusa volta como frase para mostrar à pessoa.
 */
export async function uploadAttachment(client: SupabaseClient, folder: string, file: File): Promise<UploadResult> {
  const check = checkAttachment(file)
  if (!check.ok) return { ok: false, reason: check.reason }

  const ext = fileExtension(file.name) || check.contentType.split('/')[1]?.replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const { error } = await client.storage.from('attachments').upload(path, file, { contentType: check.contentType })
  if (error) {
    return { ok: false, reason: `Não foi possível enviar "${file.name}". ${describeUploadError(error.message)}` }
  }
  const publicUrl = client.storage.from('attachments').getPublicUrl(path).data.publicUrl
  const isImage = check.contentType.startsWith('image/')
  return {
    ok: true,
    url: isImage ? publicUrl : withFileInfo(publicUrl, file),
    attachmentType: isImage ? 'image' : 'file',
    fileName: file.name
  }
}

/** Erro do servidor de arquivos em português */
export function describeUploadError(message: string | null | undefined): string {
  const text = String(message || '').toLowerCase()
  if (text.includes('exceeded') || text.includes('too large') || text.includes('payload')) return 'O arquivo passa do limite de 25 MB.'
  if (text.includes('mime') || text.includes('not supported') || text.includes('invalid')) return 'Esse tipo de arquivo não é aceito.'
  if (text.includes('row-level security') || text.includes('unauthorized') || text.includes('policy')) return 'Você não tem permissão para enviar arquivos aqui.'
  if (text.includes('fetch') || text.includes('network')) return 'Verifique sua conexão e tente de novo.'
  return 'Tente de novo em instantes.'
}
