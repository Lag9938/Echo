import { describe, it, expect } from 'vitest'
import { isAttachmentUrl, safeDownloadName } from '../services/attachmentDownload.js'

const BASE = 'https://abc.supabase.co/storage/v1/object/public/attachments'

describe('baixar arquivo de uma conversa', () => {
  it('só aceita endereços do servidor de arquivos do Echo', () => {
    expect(isAttachmentUrl(`${BASE}/channels/c1/1-x.pdf`)).toBe(true)
    expect(isAttachmentUrl(`${BASE}/dm/u1/1-x.zip#name=a.zip&size=10`)).toBe(true)
    expect(isAttachmentUrl('https://site-qualquer.com/virus.exe')).toBe(false)
    expect(isAttachmentUrl('http://abc.supabase.co/storage/v1/object/public/attachments/a.pdf')).toBe(false)
    expect(isAttachmentUrl('https://abc.supabase.co/storage/v1/object/public/outro-bucket/a.pdf')).toBe(false)
    expect(isAttachmentUrl('https://supabase.co.evil.com/storage/v1/object/public/attachments/a.pdf')).toBe(false)
    expect(isAttachmentUrl('file:///C:/Windows/system.ini')).toBe(false)
    expect(isAttachmentUrl(null)).toBe(false)
    expect(isAttachmentUrl('não é endereço')).toBe(false)
  })

  it('o nome sugerido nunca escolhe a pasta nem usa caracteres proibidos', () => {
    expect(safeDownloadName('Relatório final.pdf')).toBe('Relatório final.pdf')
    expect(safeDownloadName('..\\..\\Windows\\System32\\cmd.exe')).toBe('cmd.exe')
    expect(safeDownloadName('../../etc/passwd')).toBe('passwd')
    expect(safeDownloadName('a<b>:c|d?.txt')).toBe('a_b__c_d_.txt')
    expect(safeDownloadName('CON')).toBe('arquivo')
    expect(safeDownloadName('nul.txt')).toBe('arquivo')
    expect(safeDownloadName('')).toBe('arquivo')
    expect(safeDownloadName('...')).toBe('arquivo')
    expect(safeDownloadName('x'.repeat(400)).length).toBe(150)
  })
})
