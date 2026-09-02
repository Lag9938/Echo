let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function playMuteSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    const now = ctx.currentTime
    osc.type = 'sine'
    
    // Two fast descending tones
    osc.frequency.setValueAtTime(380, now)
    osc.frequency.setValueAtTime(290, now + 0.07)
    
    gain.gain.setValueAtTime(volume * 0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
    
    osc.start(now)
    osc.stop(now + 0.18)
  } catch (e) {
    console.error("Failed to play SFX (mute):", e)
  }
}

export function playUnmuteSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    const now = ctx.currentTime
    osc.type = 'sine'
    
    // Two fast ascending tones
    osc.frequency.setValueAtTime(290, now)
    osc.frequency.setValueAtTime(390, now + 0.07)
    
    gain.gain.setValueAtTime(volume * 0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
    
    osc.start(now)
    osc.stop(now + 0.18)
  } catch (e) {
    console.error("Failed to play SFX (unmute):", e)
  }
}

export function playDeafenSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [440, 349.23, 261.63] // A4, F4, C4 (descending triad)
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'sine'
      osc.frequency.value = freq
      
      const startTime = now + index * 0.06
      gain.gain.setValueAtTime(0, now)
      gain.gain.setValueAtTime(volume * 0.18, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2)
      
      osc.start(startTime)
      osc.stop(startTime + 0.22)
    })
  } catch (e) {
    console.error("Failed to play SFX (deafen):", e)
  }
}

export function playUndeafenSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [261.63, 349.23, 440] // C4, F4, A4 (ascending triad)
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'sine'
      osc.frequency.value = freq
      
      const startTime = now + index * 0.06
      gain.gain.setValueAtTime(0, now)
      gain.gain.setValueAtTime(volume * 0.18, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2)
      
      osc.start(startTime)
      osc.stop(startTime + 0.22)
    })
  } catch (e) {
    console.error("Failed to play SFX (undeafen):", e)
  }
}

export function playJoinSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [261.63, 329.63, 392.00, 523.25] // C4, E4, G4, C5
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'sine'
      osc.frequency.value = freq
      
      const startTime = now + index * 0.08
      gain.gain.setValueAtTime(0, now)
      gain.gain.setValueAtTime(volume * 0.12, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35)
      
      osc.start(startTime)
      osc.stop(startTime + 0.4)
    })
  } catch (e) {
    console.error("Failed to play SFX (join):", e)
  }
}

export function playLeaveSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [523.25, 392.00, 329.63, 261.63] // C5, G4, E4, C4
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'sine'
      osc.frequency.value = freq
      
      const startTime = now + index * 0.08
      gain.gain.setValueAtTime(0, now)
      gain.gain.setValueAtTime(volume * 0.12, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35)
      
      osc.start(startTime)
      osc.stop(startTime + 0.4)
    })
  } catch (e) {
    console.error("Failed to play SFX (leave):", e)
  }
}

export function playScreenStartSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [587.33, 880.00] // D5, A5
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'triangle'
      osc.frequency.value = freq
      
      const startTime = now + index * 0.07
      gain.gain.setValueAtTime(0, now)
      gain.gain.setValueAtTime(volume * 0.10, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28)
      
      osc.start(startTime)
      osc.stop(startTime + 0.32)
    })
  } catch (e) {
    console.error("Failed to play SFX (screen start):", e)
  }
}

export function playScreenStopSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [880.00, 587.33] // A5, D5
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'triangle'
      osc.frequency.value = freq
      
      const startTime = now + index * 0.07
      gain.gain.setValueAtTime(0, now)
      gain.gain.setValueAtTime(volume * 0.10, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28)
      
      osc.start(startTime)
      osc.stop(startTime + 0.32)
    })
  } catch (e) {
    console.error("Failed to play SFX (screen stop):", e)
  }
}

export type SoundboardItem = {
  id: string
  name: string
  emoji: string
  category: string
  color: string
}

export const SOUNDBOARD_SOUNDS: SoundboardItem[] = [
  { id: 'airhorn', name: 'Buzina MLG', emoji: '🎺', category: 'Memes', color: '#ff4655' },
  { id: 'victory', name: 'Vitória!', emoji: '🏆', category: 'Gamer', color: '#f59e0b' },
  { id: 'badumtss', name: 'Ba-Dum-Tss', emoji: '🥁', category: 'Memes', color: '#8b5cf6' },
  { id: 'levelup', name: 'Level Up', emoji: '⚡', category: 'Gamer', color: '#10b981' },
  { id: 'bruh', name: 'Bruh...', emoji: '🗿', category: 'Memes', color: '#6b7280' },
  { id: 'applause', name: 'Aplausos', emoji: '👏', category: 'Comemoração', color: '#ec4899' },
  { id: 'quack', name: 'Pato', emoji: '🦆', category: 'Memes', color: '#eab308' },
  { id: 'alert', name: 'Alerta Vermelho', emoji: '🚨', category: 'Gamer', color: '#ef4444' },
  { id: 'ping', name: 'Ping Sonar', emoji: '🔔', category: 'SFX', color: '#3b82f6' },
  { id: 'tada', name: 'Tadaaa!', emoji: '🎉', category: 'Comemoração', color: '#06b6d4' }
]

export function playSoundboardEffect(soundId: string, volume = 0.6) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    switch (soundId) {
      case 'airhorn': {
        // Classic high-pitched tri-tone burst
        const pitches = [466.16, 466.16, 466.16, 622.25]
        pitches.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(freq, now + idx * 0.12)
          osc.connect(gain)
          gain.connect(ctx.destination)
          gain.gain.setValueAtTime(volume * 0.22, now + idx * 0.12)
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.11)
          osc.start(now + idx * 0.12)
          osc.stop(now + idx * 0.12 + 0.12)
        })
        break
      }

      case 'victory': {
        // Heroic fanfare triad
        const notes = [523.25, 659.25, 783.99, 1046.50]
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, now + idx * 0.1)
          osc.connect(gain)
          gain.connect(ctx.destination)
          const start = now + idx * 0.1
          const dur = idx === 3 ? 0.6 : 0.12
          gain.gain.setValueAtTime(volume * 0.28, start)
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
          osc.start(start)
          osc.stop(start + dur + 0.05)
        })
        break
      }

      case 'badumtss': {
        // Kick, snare, crash
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(140, now)
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.12)
        gain.gain.setValueAtTime(volume * 0.35, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.16)

        // Snare/Hat at 0.18s
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'triangle'
        osc2.frequency.setValueAtTime(280, now + 0.18)
        gain2.gain.setValueAtTime(volume * 0.25, now + 0.18)
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start(now + 0.18)
        osc2.stop(now + 0.5)
        break
      }

      case 'levelup': {
        // Fast 8-bit ascending arpeggio
        const arpeggio = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]
        arpeggio.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'square'
          const start = now + idx * 0.045
          osc.frequency.setValueAtTime(freq, start)
          gain.gain.setValueAtTime(volume * 0.14, start)
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(start)
          osc.stop(start + 0.1)
        })
        break
      }

      case 'bruh': {
        // Low distorted descending voice-like synth
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(120, now)
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.35)
        gain.gain.setValueAtTime(volume * 0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.42)
        break
      }

      case 'applause': {
        // Multi-frequency applause burst
        for (let i = 0; i < 6; i++) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          const offset = Math.random() * 0.3
          const freq = 400 + Math.random() * 600
          osc.frequency.setValueAtTime(freq, now + offset)
          gain.gain.setValueAtTime(volume * 0.08, now + offset)
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.4)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + offset)
          osc.stop(now + offset + 0.45)
        }
        break
      }

      case 'quack': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(450, now)
        osc.frequency.linearRampToValueAtTime(280, now + 0.15)
        gain.gain.setValueAtTime(volume * 0.28, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.25)
        break
      }

      case 'alert': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now)
        osc.frequency.setValueAtTime(587.33, now + 0.1)
        osc.frequency.setValueAtTime(880, now + 0.2)
        gain.gain.setValueAtTime(volume * 0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.38)
        break
      }

      case 'ping': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1760, now)
        gain.gain.setValueAtTime(volume * 0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.55)
        break
      }

      case 'tada': {
        const notes = [523.25, 659.25, 783.99, 1046.50]
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          const start = now + (idx < 2 ? idx * 0.08 : 0.2)
          osc.frequency.setValueAtTime(freq, start)
          gain.gain.setValueAtTime(volume * 0.22, start)
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(start)
          osc.stop(start + 0.5)
        })
        break
      }
    }
  } catch (e) {
    console.error(`Failed to play soundboard effect (${soundId}):`, e)
  }
}

export function playFriendRequestSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.setValueAtTime(880, now + 0.09) // A5
    gain.gain.setValueAtTime(volume * 0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.28)
  } catch (e) {
    console.error('Failed to play friend request SFX:', e)
  }
}

export function playFriendAcceptSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      const start = now + idx * 0.07
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(volume * 0.2, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.35)
    })
  } catch (e) {
    console.error('Failed to play friend accept SFX:', e)
  }
}

export function playDmNotificationSound(volume = 0.5) {
  if (volume <= 0) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(659.25, now) // E5
    osc.frequency.setValueAtTime(987.77, now + 0.08) // B5
    gain.gain.setValueAtTime(volume * 0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.25)
  } catch (e) {
    console.error('Failed to play DM notification SFX:', e)
  }
}

