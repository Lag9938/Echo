import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const storage = vi.hoisted(() => ({
  upload: vi.fn(),
  getPublicUrl: vi.fn()
}))

vi.mock('../../lib/supabase', () => ({
  supabase: { storage: { from: () => storage } },
  isSupabaseConfigured: true
}))

import { useEchoDMActions } from '../useEchoDMActions'
import { useEchoAudioPreferences, useEchoAudioSettingsActions } from '../useEchoAudioPreferences'

const ME = 'aaaaaaaa-0000-4000-8000-00000000000a'

describe('useEchoDMActions', () => {
  const makeOptions = (overrides: Record<string, unknown> = {}) => ({
    userId: ME,
    dmDraft: '',
    selectedDMUserIdRef: { current: null as string | null },
    setSelectedDMUserId: vi.fn(),
    setUnreadDMs: vi.fn(),
    setDirectMessages: vi.fn(),
    setRecentDMUserIds: vi.fn(),
    loadDirectMessages: vi.fn(),
    sendDirectMessage: vi.fn().mockResolvedValue(undefined),
    setPage: vi.fn(),
    setIsUploading: vi.fn(),
    setError: vi.fn(),
    startVoiceNoteRecording: vi.fn(),
    toggleSaveMessage: vi.fn(),
    ...overrides
  })

  beforeEach(() => {
    storage.upload.mockResolvedValue({ error: null })
    storage.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.test/arquivo.png' } })
  })

  it('abrir uma conversa seleciona a pessoa, zera o não lido dela e carrega as mensagens', () => {
    const options = makeOptions()
    const { result } = renderHook(() => useEchoDMActions(options))

    act(() => result.current.handleOpenDM('ana'))

    expect(options.setSelectedDMUserId).toHaveBeenCalledWith('ana')
    expect(options.loadDirectMessages).toHaveBeenCalledWith('ana')
    const clearUnread = options.setUnreadDMs.mock.calls[0][0] as (prev: Record<string, number>) => Record<string, number>
    expect(clearUnread({ ana: 3, bia: 1 })).toEqual({ bia: 1 })
    const untouched = { bia: 1 }
    expect(clearUnread(untouched)).toBe(untouched)
  })

  it('abrir e navegar também troca para a página de amigos', () => {
    const options = makeOptions()
    const { result } = renderHook(() => useEchoDMActions(options))
    act(() => result.current.handleOpenDMAndNavigate('ana'))
    expect(options.setSelectedDMUserId).toHaveBeenCalledWith('ana')
    expect(options.setPage).toHaveBeenCalledWith('Amigos')
  })

  it('fechar a conversa limpa a seleção e as mensagens', () => {
    const options = makeOptions()
    const { result } = renderHook(() => useEchoDMActions(options))
    act(() => result.current.handleCloseDM())
    expect(options.setSelectedDMUserId).toHaveBeenCalledWith(null)
    expect(options.setDirectMessages).toHaveBeenCalledWith([])
  })

  it('enviar pelo formulário manda o texto sem espaços nas pontas e ignora mensagem vazia', async () => {
    const preventDefault = vi.fn()
    const filled = makeOptions({ dmDraft: '  oi  ' })
    const a = renderHook(() => useEchoDMActions(filled))
    await act(async () => { await a.result.current.handleSendDMForm({ preventDefault } as any) })
    expect(preventDefault).toHaveBeenCalled()
    expect(filled.sendDirectMessage).toHaveBeenCalledWith('oi')

    const empty = makeOptions({ dmDraft: '   ' })
    const b = renderHook(() => useEchoDMActions(empty))
    await act(async () => { await b.result.current.handleSendDMForm({ preventDefault } as any) })
    expect(empty.sendDirectMessage).not.toHaveBeenCalled()
  })

  it('enviar arquivo grava dentro da pasta do próprio usuário e manda a mensagem com o link', async () => {
    const options = makeOptions()
    const { result } = renderHook(() => useEchoDMActions(options))
    const file = new File(['x'], 'foto de férias.PNG', { type: 'image/png' })

    await act(async () => { await result.current.handleUploadDMFile(file, '  olha isso ') })

    // A regra do banco só aceita anexos de DM em dm/<id do próprio usuário>/
    const path = storage.upload.mock.calls[0][0] as string
    expect(path).toMatch(new RegExp(`^dm/${ME}/\\d+-[0-9a-f-]{36}\\.PNG$`))
    expect(storage.upload.mock.calls[0][1]).toBe(file)
    expect(options.sendDirectMessage).toHaveBeenCalledWith('olha isso', 'https://cdn.test/arquivo.png', 'image')
    expect(options.setIsUploading.mock.calls).toEqual([[true], [false]])
  })

  it('arquivo que não é imagem vai como "file" e, sem legenda, usa o rascunho ou o nome do arquivo', async () => {
    const options = makeOptions({ dmDraft: '' })
    const { result } = renderHook(() => useEchoDMActions(options))
    await act(async () => { await result.current.handleUploadDMFile(new File(['x'], 'relatorio.pdf', { type: 'application/pdf' })) })
    expect(options.sendDirectMessage).toHaveBeenCalledWith('relatorio.pdf', 'https://cdn.test/arquivo.png', 'file')
  })

  it('falha no envio do arquivo mostra o erro, libera o envio e não manda mensagem', async () => {
    storage.upload.mockResolvedValue({ error: { message: 'arquivo grande demais' } })
    const options = makeOptions()
    const { result } = renderHook(() => useEchoDMActions(options))

    await act(async () => { await result.current.handleUploadDMFile(new File(['x'], 'a.png', { type: 'image/png' })) })

    expect(options.setError).toHaveBeenCalledWith('arquivo grande demais')
    expect(options.setIsUploading.mock.calls).toEqual([[true], [false]])
    expect(options.sendDirectMessage).not.toHaveBeenCalled()
  })

  it('tirar uma conversa dos recentes só fecha a tela se for a conversa aberta', () => {
    const open = makeOptions({ selectedDMUserIdRef: { current: 'ana' } })
    const a = renderHook(() => useEchoDMActions(open))
    act(() => a.result.current.handleRemoveRecentDM('ana'))
    const filter = open.setRecentDMUserIds.mock.calls[0][0] as (prev: string[]) => string[]
    expect(filter(['ana', 'bia'])).toEqual(['bia'])
    expect(open.setSelectedDMUserId).toHaveBeenCalledWith(null)

    const other = makeOptions({ selectedDMUserIdRef: { current: 'bia' } })
    const b = renderHook(() => useEchoDMActions(other))
    act(() => b.result.current.handleRemoveRecentDM('ana'))
    expect(other.setSelectedDMUserId).not.toHaveBeenCalled()
  })

  it('figurinha, áudio e salvar mensagem chamam a ação certa', () => {
    const options = makeOptions()
    const { result } = renderHook(() => useEchoDMActions(options))

    act(() => result.current.handleSendDMSticker('https://cdn.test/s.webp', 'gato'))
    expect(options.sendDirectMessage).toHaveBeenCalledWith('[Sticker: gato]', 'https://cdn.test/s.webp', 'sticker')

    act(() => result.current.handleStartVoiceNoteDM())
    expect(options.startVoiceNoteRecording).toHaveBeenCalledWith('dm')

    const msg = { id: 'm1' }
    act(() => result.current.handleToggleSaveDM(msg, { id: 'ana', display_name: 'Ana' }))
    expect(options.toggleSaveMessage).toHaveBeenCalledWith(msg, 'dm', { sourceName: '@Ana', dmUserId: 'ana' })
  })
})

describe('useEchoAudioPreferences', () => {
  beforeEach(() => localStorage.clear())

  it('sem nada salvo usa os padrões', () => {
    const { result } = renderHook(() => useEchoAudioPreferences())
    expect(result.current.noiseSuppressionEnabled).toBe(true)
    expect(result.current.echoCancellationEnabled).toBe(true)
    expect(result.current.noiseGateEnabled).toBe(true)
    expect(result.current.noiseGateThreshold).toBe(-45)
    expect(result.current.sfxVolume).toBe(0.5)
  })

  it('lê o que estava salvo', () => {
    localStorage.setItem('echo-noise-suppression', 'false')
    localStorage.setItem('echo-noise-gate-threshold', '-30')
    localStorage.setItem('echo-sfx-volume', '0')
    const { result } = renderHook(() => useEchoAudioPreferences())
    expect(result.current.noiseSuppressionEnabled).toBe(false)
    expect(result.current.noiseGateThreshold).toBe(-30)
    expect(result.current.sfxVolume).toBe(0)
  })

  it('mudar volume dos efeitos e portão de ruído atualiza a tela, salva e mantém a referência atual', () => {
    const { result } = renderHook(() => useEchoAudioPreferences())

    act(() => result.current.handleSfxVolumeChange(0.8))
    act(() => result.current.handleNoiseGateEnabledChange(false))
    act(() => result.current.handleNoiseGateThresholdChange(-52))

    expect(result.current.sfxVolume).toBe(0.8)
    expect(result.current.sfxVolumeRef.current).toBe(0.8)
    expect(result.current.noiseGateEnabled).toBe(false)
    expect(result.current.noiseGateThreshold).toBe(-52)
    expect(localStorage.getItem('echo-sfx-volume')).toBe('0.8')
    expect(localStorage.getItem('echo-noise-gate-enabled')).toBe('false')
    expect(localStorage.getItem('echo-noise-gate-threshold')).toBe('-52')
  })
})

describe('useEchoAudioSettingsActions', () => {
  beforeEach(() => localStorage.clear())

  const makeOptions = (overrides: Record<string, unknown> = {}) => ({
    activeVoiceChannelId: 'c1' as string | null,
    selectedInputId: 'mic-1',
    changeInputDevice: vi.fn(),
    noiseSuppressionEnabled: true,
    setNoiseSuppressionEnabled: vi.fn(),
    echoCancellationEnabled: true,
    setEchoCancellationEnabled: vi.fn(),
    setSpatialAudioEnabledState: vi.fn(),
    setUserStereoPans: vi.fn(),
    participants: [{ userId: 'ana' }, { userId: 'bia' }],
    changePeerPan: vi.fn(),
    ...overrides
  })

  it('em chamada, trocar supressão de ruído ou eco reabre o microfone com as duas opções certas', () => {
    const options = makeOptions({ echoCancellationEnabled: false })
    const { result } = renderHook(() => useEchoAudioSettingsActions(options))

    act(() => result.current.handleNoiseSuppressionChange(false))
    expect(options.setNoiseSuppressionEnabled).toHaveBeenCalledWith(false)
    expect(localStorage.getItem('echo-noise-suppression')).toBe('false')
    expect(options.changeInputDevice).toHaveBeenLastCalledWith('mic-1', false, false)

    act(() => result.current.handleEchoCancellationChange(true))
    expect(options.setEchoCancellationEnabled).toHaveBeenCalledWith(true)
    expect(localStorage.getItem('echo-echo-cancellation')).toBe('true')
    expect(options.changeInputDevice).toHaveBeenLastCalledWith('mic-1', true, true)
  })

  it('fora de chamada só salva a preferência, sem mexer no microfone', () => {
    const options = makeOptions({ activeVoiceChannelId: null })
    const { result } = renderHook(() => useEchoAudioSettingsActions(options))
    act(() => result.current.handleNoiseSuppressionChange(false))
    expect(options.setNoiseSuppressionEnabled).toHaveBeenCalledWith(false)
    expect(options.changeInputDevice).not.toHaveBeenCalled()
  })

  it('áudio espacial salva a escolha; zerar posições centraliza todo mundo', () => {
    localStorage.setItem('echo-user-stereo-pans', '{"ana":0.5}')
    const options = makeOptions()
    const { result } = renderHook(() => useEchoAudioSettingsActions(options))

    act(() => result.current.handleToggleSpatialAudio(true))
    expect(options.setSpatialAudioEnabledState).toHaveBeenCalledWith(true)
    expect(localStorage.getItem('echo-spatial-audio-enabled')).toBe('true')

    act(() => result.current.handleResetAllPans())
    expect(options.setUserStereoPans).toHaveBeenCalledWith({})
    expect(localStorage.getItem('echo-user-stereo-pans')).toBeNull()
    expect(options.changePeerPan.mock.calls).toEqual([['ana', 0], ['bia', 0]])
  })
})
