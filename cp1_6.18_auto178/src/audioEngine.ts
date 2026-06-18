export class AudioEngine {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private audioBuffer: AudioBuffer | null = null
  private startTime: number = 0
  private pauseTime: number = 0
  private isPlaying: boolean = false
  private animationFrameId: number | null = null
  private onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null
  private onEnded: (() => void) | null = null

  private fftSize: number = 512
  private frequencyData: Uint8Array

  constructor() {
    this.frequencyData = new Uint8Array(this.fftSize / 2)
  }

  private initContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = this.fftSize
      this.analyser.smoothingTimeConstant = 0.8
      this.gainNode = this.audioContext.createGain()
      this.analyser.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)
    }
  }

  async decodeAudioFile(file: File): Promise<{ duration: number; fileName: string; fileSize: number }> {
    this.initContext()
    this.stop()

    const arrayBuffer = await file.arrayBuffer()
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)

    return {
      duration: this.audioBuffer.duration,
      fileName: file.name,
      fileSize: file.size,
    }
  }

  play(offset: number = 0): void {
    if (!this.audioContext || !this.audioBuffer || this.isPlaying) return

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    this.source = this.audioContext.createBufferSource()
    this.source.buffer = this.audioBuffer
    this.source.connect(this.analyser!)
    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false
        this.onEnded?.()
      }
    }

    this.startTime = this.audioContext.currentTime - offset
    this.source.start(0, offset)
    this.isPlaying = true

    this.startTimeUpdate()
  }

  pause(): void {
    if (!this.isPlaying || !this.source || !this.audioContext) return

    this.pauseTime = this.audioContext.currentTime - this.startTime
    this.source.stop()
    this.source.onended = null
    this.source.disconnect()
    this.source = null
    this.isPlaying = false

    this.stopTimeUpdate()
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop()
      } catch (e) {
        // ignore
      }
      this.source.disconnect()
      this.source = null
    }
    this.isPlaying = false
    this.pauseTime = 0
    this.stopTimeUpdate()
  }

  seek(time: number): void {
    const wasPlaying = this.isPlaying
    if (wasPlaying) {
      this.pause()
    }
    this.pauseTime = time
    if (wasPlaying) {
      this.play(time)
    }
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = volume / 100
    }
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>)
    }
    return this.frequencyData
  }

  getBarCount(): number {
    return this.fftSize / 2
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  getCurrentTime(): number {
    if (!this.isPlaying || !this.audioContext) return this.pauseTime
    return this.audioContext.currentTime - this.startTime
  }

  setOnTimeUpdate(callback: (currentTime: number, duration: number) => void): void {
    this.onTimeUpdate = callback
  }

  setOnEnded(callback: () => void): void {
    this.onEnded = callback
  }

  private startTimeUpdate(): void {
    this.stopTimeUpdate()
    const tick = () => {
      if (this.isPlaying && this.audioBuffer && this.onTimeUpdate) {
        const current = this.getCurrentTime()
        this.onTimeUpdate(current, this.audioBuffer.duration)
      }
      this.animationFrameId = requestAnimationFrame(tick)
    }
    this.animationFrameId = requestAnimationFrame(tick)
  }

  private stopTimeUpdate(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  destroy(): void {
    this.stop()
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.audioBuffer = null
  }
}
