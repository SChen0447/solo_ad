const MIDI_TO_FREQ: Record<number, number> = {}
for (let midi = 0; midi < 128; midi++) {
  MIDI_TO_FREQ[midi] = 440 * Math.pow(2, (midi - 69) / 12)
}

interface ActiveNote {
  midi: number
  oscillators: OscillatorNode[]
  gainNode: GainNode
  startTime: number
}

export class AudioEngine {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private activeNotes: Map<number, ActiveNote> = new Map()
  private maxPolyphony = 8

  constructor() {
    this.initAudioContext()
  }

  private initAudioContext(): void {
    if (typeof window !== 'undefined' && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 0.5
      this.masterGain.connect(this.audioContext.destination)
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  playNote(midi: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return

    if (this.activeNotes.has(midi)) {
      this.stopNote(midi)
    }

    if (this.activeNotes.size >= this.maxPolyphony) {
      const oldestMidi = this.activeNotes.keys().next().value
      this.stopNote(oldestMidi)
    }

    const freq = MIDI_TO_FREQ[midi]
    if (!freq) return

    const now = this.audioContext.currentTime
    const velocityGain = Math.max(0.1, Math.min(1, velocity))

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(velocityGain, now + 0.01)
    gainNode.gain.linearRampToValueAtTime(velocityGain * 0.4, now + 0.3)

    gainNode.connect(this.masterGain)

    const oscillators: OscillatorNode[] = []
    const harmonics = [
      { freq: 1, gain: 0.6, type: 'sine' as OscillatorType },
      { freq: 2, gain: 0.3, type: 'triangle' as OscillatorType },
      { freq: 3, gain: 0.15, type: 'sine' as OscillatorType },
      { freq: 4, gain: 0.08, type: 'sine' as OscillatorType }
    ]

    for (const harmonic of harmonics) {
      const osc = this.audioContext.createOscillator()
      osc.type = harmonic.type
      osc.frequency.value = freq * harmonic.freq

      const oscGain = this.audioContext.createGain()
      oscGain.gain.value = harmonic.gain
      
      osc.connect(oscGain)
      oscGain.connect(gainNode)
      osc.start(now)
      oscillators.push(osc)
    }

    this.activeNotes.set(midi, {
      midi,
      oscillators,
      gainNode,
      startTime: now
    })
  }

  stopNote(midi: number): void {
    const note = this.activeNotes.get(midi)
    if (!note || !this.audioContext) return

    const now = this.audioContext.currentTime
    const releaseTime = now + 0.8

    note.gainNode.gain.cancelScheduledValues(now)
    note.gainNode.gain.setValueAtTime(note.gainNode.gain.value, now)
    note.gainNode.gain.linearRampToValueAtTime(0, releaseTime)

    for (const osc of note.oscillators) {
      osc.stop(releaseTime)
    }

    setTimeout(() => {
      note.oscillators.forEach(osc => {
        try { osc.disconnect() } catch (e) {}
      })
      try { note.gainNode.disconnect() } catch (e) {}
      this.activeNotes.delete(midi)
    }, 850)
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  stopAll(): void {
    for (const midi of this.activeNotes.keys()) {
      this.stopNote(midi)
    }
  }

  destroy(): void {
    this.stopAll()
    if (this.masterGain) {
      try { this.masterGain.disconnect() } catch (e) {}
      this.masterGain = null
    }
    if (this.audioContext) {
      try { this.audioContext.close() } catch (e) {}
      this.audioContext = null
    }
  }

  static midiToFrequency(midi: number): number {
    return MIDI_TO_FREQ[midi] || 0
  }
}
