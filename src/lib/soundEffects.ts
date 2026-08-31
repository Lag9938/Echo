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
