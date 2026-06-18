export type SoundType = 'rune' | 'damage' | 'victory' | 'boost'

class AudioManager {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private initialized = false

  init(): void {
    if (this.initialized) return
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 0.4
      this.masterGain.connect(this.audioContext.destination)
      this.initialized = true
    } catch (e) {
      console.warn('Web Audio API not supported:', e)
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.audioContext) {
      this.init()
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
    return this.audioContext
  }

  playSound(type: SoundType): void {
    const ctx = this.ensureContext()
    if (!ctx || !this.masterGain) return

    switch (type) {
      case 'rune':
        this.playRuneSound(ctx)
        break
      case 'damage':
        this.playDamageSound(ctx)
        break
      case 'victory':
        this.playVictorySound(ctx)
        break
      case 'boost':
        this.playBoostSound(ctx)
        break
    }
  }

  private playRuneSound(ctx: AudioContext): void {
    const now = ctx.currentTime
    const duration = 0.5

    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now)
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + duration * 0.3)
    osc1.frequency.exponentialRampToValueAtTime(1567.98, now + duration * 0.6)

    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + duration)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(783.99, now)
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + duration * 0.4)

    gain2.gain.setValueAtTime(0, now)
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.03)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9)

    osc1.connect(gain1)
    gain1.connect(this.masterGain!)
    osc2.connect(gain2)
    gain2.connect(this.masterGain!)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + duration)
    osc2.stop(now + duration)
  }

  private playDamageSound(ctx: AudioContext): void {
    const now = ctx.currentTime
    const duration = 0.4

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.exponentialRampToValueAtTime(55, now + duration)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, now)
    filter.frequency.exponentialRampToValueAtTime(200, now + duration)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(now)
    osc.stop(now + duration)
  }

  private playVictorySound(ctx: AudioContext): void {
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]

    notes.forEach((freq, i) => {
      const startTime = now + i * 0.12
      const duration = 0.5

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      osc.frequency.setValueAtTime(freq * 2, startTime + duration * 0.8)

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

      osc.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(startTime)
      osc.stop(startTime + duration)
    })

    setTimeout(() => {
      const chord = [659.25, 830.61, 1046.5]
      const chordTime = ctx.currentTime
      chord.forEach((freq) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.value = freq

        gain.gain.setValueAtTime(0, chordTime)
        gain.gain.linearRampToValueAtTime(0.12, chordTime + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.0)

        osc.connect(gain)
        gain.connect(this.masterGain!)

        osc.start(chordTime)
        osc.stop(chordTime + 1.0)
      })
    }, 700)
  }

  private playBoostSound(ctx: AudioContext): void {
    const now = ctx.currentTime
    const duration = 0.3

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + duration * 0.5)
    osc.frequency.exponentialRampToValueAtTime(1320, now + duration)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(now)
    osc.stop(now + duration)
  }
}

export const audioManager = new AudioManager()
