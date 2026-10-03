import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEchoPeerAudio } from '../useEchoPeerAudio'
import { clampMusicBotVolume, useMusicBotStore } from '../../stores/useMusicBotStore'
import type { VoiceParticipant } from '../../lib/useVoiceChannel'

const ME = 'aaaaaaaa-0000-4000-8000-00000000000a'
const FRIEND = 'bbbbbbbb-0000-4000-8000-00000000000b'
const BOT = 'music-bot-cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const participants = [{ userId: ME }, { userId: FRIEND }, { userId: BOT }] as VoiceParticipant[]

describe('volume individual do bot de música', () => {
  let changePeerVolume: ReturnType<typeof vi.fn<(peerId: string, volume: number) => void>>

  const render = () =>
    renderHook(() =>
      useEchoPeerAudio({
        userId: ME,
        participants,
        changePeerVolume,
        changePeerPan: vi.fn(),
        setSpatialAudioEnabled: vi.fn(),
        changePeerScreenVolume: vi.fn()
      })
    )

  const lastVolumeOf = (peerId: string) =>
    changePeerVolume.mock.calls.filter(([id]) => id === peerId).at(-1)?.[1]

  beforeEach(() => {
    localStorage.clear()
    changePeerVolume = vi.fn()
    act(() => useMusicBotStore.getState().setMyVolume(100))
  })

  it('aplica o volume do painel só no áudio do bot que chega neste app', () => {
    render()
    expect(lastVolumeOf(BOT)).toBe(1)

    act(() => useMusicBotStore.getState().setMyVolume(35))

    expect(lastVolumeOf(BOT)).toBe(0.35)
    expect(lastVolumeOf(FRIEND)).toBe(1)
    expect(changePeerVolume.mock.calls.some(([id]) => id === ME)).toBe(false)
  })

  it('não usa o volume salvo por pessoa para o bot, nem o do bot para as pessoas', () => {
    localStorage.setItem('echo-user-volumes', JSON.stringify({ [BOT]: 10, [FRIEND]: 60 }))
    act(() => useMusicBotStore.getState().setMyVolume(150))

    render()

    expect(lastVolumeOf(BOT)).toBe(1.5)
    expect(lastVolumeOf(FRIEND)).toBe(0.6)
  })

  it('guarda o volume entre chamadas e não o perde ao sair', () => {
    act(() => useMusicBotStore.getState().setMyVolume(42))
    act(() => useMusicBotStore.getState().reset())

    expect(useMusicBotStore.getState().myVolume).toBe(42)
    expect(localStorage.getItem('echo-music-bot-my-volume')).toBe('42')
  })

  it('limita o volume a 0–200 e ignora valores inválidos', () => {
    expect(clampMusicBotVolume(-5)).toBe(0)
    expect(clampMusicBotVolume(999)).toBe(200)
    expect(clampMusicBotVolume('73')).toBe(73)
    expect(clampMusicBotVolume('abc')).toBe(100)
    expect(clampMusicBotVolume(NaN)).toBe(100)
  })
})
