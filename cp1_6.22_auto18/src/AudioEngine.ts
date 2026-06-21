export type GainBand = 'low' | 'mid' | 'high'

export interface PlaybackInfo {
  currentTime: number
  duration: number
  isPlaying: boolean
}

export class AudioEngine {
  private audioContext: AudioContext | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private audioBuffer: AudioBuffer | null = null
  private lowFilter: BiquadFilterNode | null = null
  private midFilter: BiquadFilterNode | null = null
  private highFilter: BiquadFilterNode | null = null
  private analyser: AnalyserNode | null = null
  private masterGain: GainNode | null = null
  private frequencyBuffer: Uint8Array | null = null
  private timeDomainBuffer: Uint8Array | null = null
  private startTime: number = 0
  private pausedAt: number = 0
  private _isPlaying: boolean = false
  private onPlaybackChange: ((info: PlaybackInfo) => void) | null = null
  private playbackTimer: number | null = null

  get isPlaying(): boolean {
    return this._isPlaying
  }

  get duration(): number {
    return this.audioBuffer?.duration ?? 0
  }

  get currentTime(): number {
    if (!this.audioContext) return this.pausedAt
    if (this._isPlaying) {
      return this.pausedAt + (this.audioContext.currentTime - this.startTime)
    }
    return this.pausedAt
  }

  setPlaybackCallback(callback: (info: PlaybackInfo) => void): void {
    this.onPlaybackChange = callback
  }

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 512
      this.analyser.smoothingTimeConstant = 0.8
      this.frequencyBuffer = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount))
      this.timeDomainBuffer = new Uint8Array(new ArrayBuffer(this.analyser.fftSize))
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 1.0

      this.lowFilter = this.audioContext.createBiquadFilter()
      this.lowFilter.type = 'lowshelf'
      this.lowFilter.frequency.value = 200
      this.lowFilter.gain.value = 0

      this.midFilter = this.audioContext.createBiquadFilter()
      this.midFilter.type = 'peaking'
      this.midFilter.frequency.value = 1000
      this.midFilter.Q.value = 0.7
      this.midFilter.gain.value = 0

      this.highFilter = this.audioContext.createBiquadFilter()
      this.highFilter.type = 'highshelf'
      this.highFilter.frequency.value = 2000
      this.highFilter.gain.value = 0
    }
  }

  private startPlaybackTimer(): void {
    this.stopPlaybackTimer()
    this.playbackTimer = window.setInterval(() => {
      const current = this.currentTime
      const total = this.duration
      if (current >= total && total > 0) {
        this.pause()
        this.pausedAt = 0
        this.emitPlaybackChange()
        this.stopPlaybackTimer()
        return
      }
      this.emitPlaybackChange()
    }, 100)
  }

  private stopPlaybackTimer(): void {
    if (this.playbackTimer !== null) {
      clearInterval(this.playbackTimer)
      this.playbackTimer = null
    }
  }

  private emitPlaybackChange(): void {
    if (this.onPlaybackChange) {
      this.onPlaybackChange({
        currentTime: this.currentTime,
        duration: this.duration,
        isPlaying: this._isPlaying,
      })
    }
  }

  async loadAudioFile(file: File): Promise<void> {
    this.ensureContext()
    if (!this.audioContext) throw new Error('AudioContext not initialized')

    const arrayBuffer = await file.arrayBuffer()
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0))

    this.pausedAt = 0
    this._isPlaying = false
    this.emitPlaybackChange()
    this.play()
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer) return
    if (this._isPlaying) return

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    if (this.sourceNode) {
      this.sourceNode.onended = null
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    this.sourceNode = this.audioContext.createBufferSource()
    this.sourceNode.buffer = this.audioBuffer

    this.connectGraph()

    this.startTime = this.audioContext.currentTime
    this.sourceNode.start(0, this.pausedAt)
    this._isPlaying = true
    this.emitPlaybackChange()
    this.startPlaybackTimer()
  }

  pause(): void {
    if (!this.audioContext || !this._isPlaying) return

    this.pausedAt = this.pausedAt + (this.audioContext.currentTime - this.startTime)
    if (this.sourceNode) {
      this.sourceNode.onended = null
      try {
        this.sourceNode.stop()
      } catch (e) { /* noop */ }
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
    this._isPlaying = false
    this.emitPlaybackChange()
    this.stopPlaybackTimer()
  }

  seek(time: number): void {
    const wasPlaying = this._isPlaying
    if (wasPlaying) {
      this.pause()
    }
    this.pausedAt = Math.max(0, Math.min(time, this.duration))
    this.emitPlaybackChange()
    if (wasPlaying) {
      this.play()
    }
  }

  setGain(band: GainBand, value: number): void {
    this.ensureContext()
    const clamped = Math.max(-20, Math.min(20, value))
    if (band === 'low' && this.lowFilter) {
      this.lowFilter.gain.value = clamped
    } else if (band === 'mid' && this.midFilter) {
      this.midFilter.gain.value = clamped
    } else if (band === 'high' && this.highFilter) {
      this.highFilter.gain.value = clamped
    }
  }

  private connectGraph(): void {
    if (
      !this.audioContext ||
      !this.sourceNode ||
      !this.lowFilter ||
      !this.midFilter ||
      !this.highFilter ||
      !this.analyser ||
      !this.masterGain
    ) {
      return
    }
    this.sourceNode.connect(this.lowFilter)
    this.lowFilter.connect(this.midFilter)
    this.midFilter.connect(this.highFilter)
    this.highFilter.connect(this.analyser)
    this.analyser.connect(this.masterGain)
    this.masterGain.connect(this.audioContext.destination)
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser && this.frequencyBuffer) {
      this.analyser.getByteFrequencyData(this.frequencyBuffer as Uint8Array<ArrayBuffer>)
      return this.frequencyBuffer
    }
    return new Uint8Array(new ArrayBuffer(0))
  }

  getTimeDomainData(): Uint8Array {
    if (this.analyser && this.timeDomainBuffer) {
      this.analyser.getByteTimeDomainData(this.timeDomainBuffer as Uint8Array<ArrayBuffer>)
      return this.timeDomainBuffer
    }
    return new Uint8Array(new ArrayBuffer(0))
  }

  dispose(): void {
    this.stopPlaybackTimer()
    if (this.sourceNode) {
      try { this.sourceNode.stop() } catch (e) { /* noop */ }
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
    if (this.masterGain) { this.masterGain.disconnect(); this.masterGain = null }
    if (this.analyser) { this.analyser.disconnect(); this.analyser = null }
    if (this.lowFilter) { this.lowFilter.disconnect(); this.lowFilter = null }
    if (this.midFilter) { this.midFilter.disconnect(); this.midFilter = null }
    if (this.highFilter) { this.highFilter.disconnect(); this.highFilter = null }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.audioBuffer = null
    this.frequencyBuffer = null
    this.timeDomainBuffer = null
  }
}
