import { Howl, Howler } from 'howler'
import { Song, NoteColor } from './BeatMap'

export interface AudioEvents {
  onBeat?: (time: number, note: NoteColor) => void
  onUpdate?: (currentTime: number) => void
  onEnd?: () => void
}

const NOTE_FREQUENCIES: Record<NoteColor, number> = {
  C: 523.25,
  D: 587.33,
  E: 659.25,
  F: 698.46,
  G: 783.99,
  A: 880.00,
}

function generateToneBuffer(
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
): AudioBuffer {
  const sampleRate = audioContext.sampleRate
  const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate)

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const envelope =
        Math.exp(-t * 4) * (1 - Math.exp(-t * 50))
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * volume
    }
  }

  return buffer
}

function bufferToBase64(buffer: AudioBuffer): string {
  const wav = audioBufferToWav(buffer)
  const bytes = new Uint8Array(wav)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return 'data:audio/wav;base64,' + btoa(binary)
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  const dataLength = buffer.length * blockAlign
  const bufferLength = 44 + dataLength

  const arrayBuffer = new ArrayBuffer(bufferLength)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  const channels: Float32Array[] = []
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return arrayBuffer
}

class AudioEngine {
  private musicHowl: Howl | null = null
  private sfxHowls: Map<string, Howl> = new Map()
  private audioContext: AudioContext | null = null
  private currentSong: Song | null = null
  private events: AudioEvents = {}
  private startTime: number = 0
  private rafId: number | null = null
  private beatIndex: number = 0
  private initiated: boolean = false
  private paused: boolean = false
  private pauseTime: number = 0
  private totalPausedTime: number = 0

  async init() {
    if (this.initiated) return

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    await this.generateSFX()
    this.initiated = true
  }

  private async generateSFX() {
    if (!this.audioContext) return

    const hitBuffer = generateToneBuffer(this.audioContext, 880, 0.08, 'sine', 0.25)
    const hitUrl = bufferToBase64(hitBuffer)
    this.sfxHowls.set('hit', new Howl({ src: [hitUrl], volume: 0.6 }))

    const perfectNotes = [523.25, 659.25, 783.99]
    const perfectBuffers = perfectNotes.map((f) =>
      generateToneBuffer(this.audioContext!, f, 0.05, 'triangle', 0.2)
    )
    const perfectUrls = perfectBuffers.map((b) => bufferToBase64(b))
    this.sfxHowls.set('perfect_c', new Howl({ src: [perfectUrls[0]], volume: 0.5 }))
    this.sfxHowls.set('perfect_e', new Howl({ src: [perfectUrls[1]], volume: 0.5 }))
    this.sfxHowls.set('perfect_g', new Howl({ src: [perfectUrls[2]], volume: 0.5 }))

    const missBuffer = generateToneBuffer(this.audioContext, 110, 0.12, 'sawtooth', 0.2)
    const missUrl = bufferToBase64(missBuffer)
    this.sfxHowls.set('miss', new Howl({ src: [missUrl], volume: 0.5 }))
  }

  private generateMusicBuffer(song: Song): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }

    const sampleRate = this.audioContext.sampleRate
    const totalSamples = Math.ceil(song.duration * sampleRate)
    const buffer = this.audioContext.createBuffer(2, totalSamples, sampleRate)

    const noteVolume = song.style === 'electronic' ? 0.18 : song.style === 'jazz' ? 0.15 : 0.12
    const oscType: OscillatorType =
      song.style === 'electronic' ? 'square' : song.style === 'jazz' ? 'triangle' : 'sine'

    for (const beat of song.beats) {
      const freq = NOTE_FREQUENCIES[beat.note]
      const startSample = Math.floor(beat.time * sampleRate)
      const toneDuration = 60 / song.bpm * 0.8
      const toneSamples = Math.floor(toneDuration * sampleRate)

      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel)
        for (let i = 0; i < toneSamples && startSample + i < totalSamples; i++) {
          const t = i / sampleRate
          const envelope =
            Math.exp(-t * 3.5) * (1 - Math.exp(-t * 40))
          const sample =
            Math.sin(2 * Math.PI * freq * t) * envelope * noteVolume
          if (song.style === 'electronic') {
            const harmonic = Math.sin(2 * Math.PI * freq * 2 * t) * envelope * noteVolume * 0.3
            data[startSample + i] += sample + harmonic
          } else {
            data[startSample + i] += sample
          }
        }
      }
    }

    const beatInterval = 60 / song.bpm
    const kickFreq = song.style === 'electronic' ? 60 : 50
    const kickVolume = song.style === 'electronic' ? 0.15 : 0.08

    for (let t = 0; t < song.duration; t += beatInterval) {
      const startSample = Math.floor(t * sampleRate)
      const kickSamples = Math.floor(0.15 * sampleRate)
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel)
        for (let i = 0; i < kickSamples && startSample + i < totalSamples; i++) {
          const tt = i / sampleRate
          const env = Math.exp(-tt * 20)
          const freqMod = kickFreq * (1 + 20 * Math.exp(-tt * 50))
          data[startSample + i] += Math.sin(2 * Math.PI * freqMod * tt) * env * kickVolume
        }
      }
    }

    return buffer
  }

  async loadSong(song: Song, events: AudioEvents = {}) {
    if (!this.initiated) {
      await this.init()
    }

    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume()
    }

    this.stop()
    this.currentSong = song
    this.events = events
    this.beatIndex = 0
    this.totalPausedTime = 0

    const musicBuffer = this.generateMusicBuffer(song)
    const musicUrl = bufferToBase64(musicBuffer)

    this.musicHowl = new Howl({
      src: [musicUrl],
      html5: false,
      onplay: () => {
        if (!this.paused) {
          this.startTime = performance.now() / 1000
          this.beatIndex = 0
        } else {
          this.totalPausedTime += performance.now() / 1000 - this.pauseTime
        }
        this.paused = false
        this.startLoop()
      },
      onpause: () => {
        this.paused = true
        this.pauseTime = performance.now() / 1000
        this.stopLoop()
      },
      onend: () => {
        this.stopLoop()
        events.onEnd?.()
      },
    })
  }

  private startLoop() {
    if (this.rafId !== null) return

    const loop = () => {
      if (!this.musicHowl || !this.currentSong) return

      const currentTime = this.getCurrentTime()

      this.events.onUpdate?.(currentTime)

      while (
        this.beatIndex < this.currentSong.beats.length &&
        this.currentSong.beats[this.beatIndex].time <= currentTime
      ) {
        const beat = this.currentSong.beats[this.beatIndex]
        this.events.onBeat?.(beat.time, beat.note)
        this.beatIndex++
      }

      if (currentTime >= this.currentSong.duration) {
        return
      }

      this.rafId = requestAnimationFrame(loop)
    }

    this.rafId = requestAnimationFrame(loop)
  }

  private stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  getCurrentTime(): number {
    if (!this.musicHowl) return 0
    return Math.max(0, this.musicHowl.seek() as number)
  }

  play() {
    this.musicHowl?.play()
  }

  pause() {
    this.musicHowl?.pause()
  }

  stop() {
    this.stopLoop()
    if (this.musicHowl) {
      this.musicHowl.stop()
      this.musicHowl.unload()
      this.musicHowl = null
    }
    this.currentSong = null
    this.paused = false
    this.beatIndex = 0
    this.totalPausedTime = 0
  }

  playHitSFX() {
    this.sfxHowls.get('hit')?.play()
  }

  playPerfectSFX() {
    const c = this.sfxHowls.get('perfect_c')
    const e = this.sfxHowls.get('perfect_e')
    const g = this.sfxHowls.get('perfect_g')
    if (c && e && g) {
      c.play()
      setTimeout(() => e.play(), 50)
      setTimeout(() => g.play(), 100)
    }
  }

  playMissSFX() {
    this.sfxHowls.get('miss')?.play()
  }

  isPlaying(): boolean {
    return this.musicHowl?.playing() ?? false
  }

  isPaused(): boolean {
    return this.paused
  }
}

export const audioEngine = new AudioEngine()
