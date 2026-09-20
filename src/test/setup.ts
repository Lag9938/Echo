import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Auto cleanup DOM after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  // Mock HTMLMediaElement methods (play, pause, load)
  if (typeof HTMLMediaElement !== 'undefined') {
    HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve())
    HTMLMediaElement.prototype.pause = vi.fn()
    HTMLMediaElement.prototype.load = vi.fn()
  }

  // Mock AudioContext
  const mockAudioContext = vi.fn().mockImplementation(() => ({
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn().mockReturnValue({
      gain: { value: 1, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn()
    }),
    createStereoPanner: vi.fn().mockReturnValue({
      pan: { value: 0, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn()
    }),
    createMediaStreamSource: vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn()
    }),
    destination: {}
  }))

  window.AudioContext = mockAudioContext as any
  ;(window as any).webkitAudioContext = mockAudioContext
}
