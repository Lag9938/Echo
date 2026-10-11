import { describe, it, expect } from 'vitest'
import {
  MAX_ATTACHMENT_BYTES, checkAttachment, fileExtension, fileKindLabel, formatFileSize,
  isCaptionJustFileName, readFileInfo, uploadContentType, withFileInfo
} from '../attachments'

const MB = 1024 * 1024

describe('envio de arquivos', () => {
  it('aceita os tipos comuns e usa a extensão quando o Windows não informa o tipo', () => {
    expect(uploadContentType({ name: 'contrato.pdf', type: 'application/pdf' })).toBe('application/pdf')
    expect(uploadContentType({ name: 'jogada.mp4', type: 'video/mp4' })).toBe('video/mp4')
    // .rar e .7z costumam chegar sem tipo nenhum
    expect(uploadContentType({ name: 'mods.rar', type: '' })).toBe('application/vnd.rar')
    expect(uploadContentType({ name: 'mods.7z', type: '' })).toBe('application/x-7z-compressed')
    // Tipo que o servidor não conhece, mas a extensão resolve
    expect(uploadContentType({ name: 'config.json', type: 'text/json' })).toBe('application/json')
    expect(uploadContentType({ name: 'PLANILHA.XLSX', type: '' })).toContain('spreadsheetml')
  })

  it('recusa com uma frase clara o que o servidor não aceita', () => {
    const exe = checkAttachment({ name: 'instalador.exe', type: 'application/x-msdownload', size: MB })
    expect(exe.ok).toBe(false)
    expect(!exe.ok && exe.reason).toContain('.exe')

    const big = checkAttachment({ name: 'gravacao.mp4', type: 'video/mp4', size: MAX_ATTACHMENT_BYTES + 1 })
    expect(big.ok).toBe(false)
    expect(!big.ok && big.reason).toContain('25 MB')

    expect(checkAttachment({ name: 'vazio.txt', type: 'text/plain', size: 0 }).ok).toBe(false)
    expect(checkAttachment({ name: 'sem-extensao', type: '', size: 10 }).ok).toBe(false)
    expect(checkAttachment({ name: 'ok.zip', type: '', size: MAX_ATTACHMENT_BYTES })).toEqual({ ok: true, contentType: 'application/zip' })
  })

  it('nome e tamanho viajam no endereço e voltam iguais', () => {
    const url = withFileInfo('https://x.test/storage/channels/c1/123-abc.pdf', { name: 'Relatório final (v2).pdf', size: 1536000 })
    expect(url.startsWith('https://x.test/storage/channels/c1/123-abc.pdf#')).toBe(true)
    const info = readFileInfo(url)
    expect(info).toEqual({ url: 'https://x.test/storage/channels/c1/123-abc.pdf', name: 'Relatório final (v2).pdf', size: 1536000 })
    // Reaplicar não acumula
    expect(withFileInfo(url, { name: 'a.pdf', size: 1 }).split('#')).toHaveLength(2)
  })

  it('arquivos enviados por versões antigas: usa o texto da mensagem ou o fim do endereço', () => {
    expect(readFileInfo('https://x.test/a/123-abc.zip', 'mods.zip')).toEqual({ url: 'https://x.test/a/123-abc.zip', name: 'mods.zip', size: null })
    expect(readFileInfo('https://x.test/a/123-abc.zip').name).toBe('123-abc.zip')
    expect(readFileInfo(null).name).toBe('Arquivo')
  })

  it('não repete o nome do arquivo como legenda', () => {
    const info = readFileInfo(withFileInfo('https://x.test/a.pdf', { name: 'a.pdf', size: 10 }))
    expect(isCaptionJustFileName('a.pdf', info)).toBe(true)
    expect(isCaptionJustFileName('', info)).toBe(true)
    expect(isCaptionJustFileName('olha esse contrato', info)).toBe(false)
  })

  it('formata tamanho, extensão e tipo', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(20 * 1024)).toBe('20 KB')
    expect(formatFileSize(1536000)).toBe('1,5 MB')
    expect(formatFileSize(null)).toBe('')
    expect(fileExtension('foto.final.PNG')).toBe('png')
    expect(fileExtension('semponto')).toBe('')
    expect(fileExtension('.oculto')).toBe('')
    expect(fileKindLabel('a.pdf')).toBe('PDF')
    expect(fileKindLabel('clipe.mp4')).toBe('Vídeo')
    expect(fileKindLabel('x')).toBe('Arquivo')
  })
})
