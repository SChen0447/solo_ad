const BAND_CONFIGS = [
  { frequency: 60, type: 'lowshelf' as BiquadFilterType, Q: 1 },
  { frequency: 250, type: 'peaking' as BiquadFilterType, Q: 1 },
  { frequency: 1000, type: 'peaking' as BiquadFilterType, Q: 1 },
  { frequency: 4000, type: 'peaking' as BiquadFilterType, Q: 1 },
  { frequency: 12000, type: 'peaking' as BiquadFilterType, Q: 1 },
  { frequency: 16000, type: 'highshelf' as BiquadFilterType, Q: 1 },
]

const MAX_FILE_SIZE = 10 * 1024 * 1024

export class AudioEngine {
  private audioContext: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private audioBuffer: AudioBuffer | null = null
  private filters: BiquadFilterNode[] = []
  private analyser: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private timeDomainData: Uint8Array = new Uint8Array()
  private frequencyData: Uint8Array = new Uint8Array()
  private startTime = 0
  private pauseTime = 0
  private animationFrameId: number | null = null

  public isPlaying = false
  public duration = 0
  public fileName = ''
  public onTimeUpdate: ((currentTime: number) => void) | null = null

  private dBToLinear(dB: number): number {
    return Math.pow(10, dB / 20)
  }

  async loadFile(file: File): Promise<void> {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`文件大小超过限制（最大10MB），当前文件大小：${(file.size / 1024 / 1024).toFixed(2)}MB`)
    }

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav']
    if (!validTypes.includes(file.type) && 
        !file.name.toLowerCase().endsWith('.mp3') && 
        !file.name.toLowerCase().endsWith('.wav')) {
      throw new Error('不支持的文件格式，请上传MP3或WAV文件')
    }

    this.stop()

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }

    this.fileName = file.name

    const arrayBuffer = await file.arrayBuffer()
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
    this.duration = this.audioBuffer.duration

    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.8

    const bufferLength = this.analyser.frequencyBinCount
    this.timeDomainData = new Uint8Array(bufferLength)
    this.frequencyData = new Uint8Array(bufferLength)

    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.value = this.dBToLinear(0)

    this.filters = BAND_CONFIGS.map(config => {
      const filter = this.audioContext!.createBiquadFilter()
      filter.type = config.type
      filter.frequency.value = config.frequency
      filter.Q.value = config.Q
      filter.gain.value = 0
      return filter
    })

    this.play()
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer || this.isPlaying) return

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    this.source = this.audioContext.createBufferSource()
    this.source.buffer = this.audioBuffer
    this.source.onended = () => {
      if (this.isPlaying) {
        this.stop()
        this.pauseTime = 0
      }
    }

    this.connectNodes()

    const offset = this.pauseTime
    this.source.start(0, offset)
    this.startTime = this.audioContext.currentTime - offset
    this.isPlaying = true

    this.startTimeUpdate()
  }

  pause(): void {
    if (!this.source || !this.audioContext || !this.isPlaying) return

    this.pauseTime = this.audioContext.currentTime - this.startTime
    this.source.onended = null
    this.source.stop()
    this.source.disconnect()
    this.source = null
    this.isPlaying = false

    this.stopTimeUpdate()
  }

  stop(): void {
    if (this.source) {
      this.source.onended = null
      try {
        this.source.stop()
      } catch (_) {
        // ignore errors if already stopped
      }
      this.source.disconnect()
      this.source = null
    }
    this.isPlaying = false
    this.pauseTime = 0
    this.stopTimeUpdate()
  }

  seek(time: number): void {
    if (!this.audioBuffer) return

    const wasPlaying = this.isPlaying
    this.pauseTime = Math.max(0, Math.min(time, this.duration))

    if (wasPlaying) {
      this.pause()
      this.play()
    }
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.audioContext?.currentTime || 0, 0.01)
    }
  }

  setBandGain(bandIndex: number, dB: number): void {
    if (bandIndex >= 0 && bandIndex < this.filters.length && this.audioContext) {
      const clampedDb = Math.max(-12, Math.min(12, dB))
      this.filters[bandIndex].gain.setTargetAtTime(clampedDb, this.audioContext.currentTime, 0.01)
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0
    if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime
    }
    return this.pauseTime
  }

  getTimeDomainData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(this.timeDomainData)
    }
    return this.timeDomainData
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData)
    }
    return this.frequencyData
  }

  getSampleRate(): number {
    return this.audioContext?.sampleRate || 44100
  }

  private connectNodes(): void {
    if (!this.source || !this.analyser || !this.gainNode || !this.audioContext) return

    let prevNode: AudioNode = this.source

    for (const filter of this.filters) {
      prevNode.connect(filter)
      prevNode = filter
    }

    prevNode.connect(this.analyser)
    this.analyser.connect(this.gainNode)
    this.gainNode.connect(this.audioContext.destination)
  }

  private startTimeUpdate(): void {
    const update = () => {
      if (this.isPlaying && this.onTimeUpdate) {
        this.onTimeUpdate(this.getCurrentTime())
      }
      this.animationFrameId = requestAnimationFrame(update)
    }
    this.animationFrameId = requestAnimationFrame(update)
  }

  private stopTimeUpdate(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  cleanup(): void {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

export const BAND_FREQUENCIES = [60, 250, 1000, 4000, 12000, 16000]
export const BAND_LABELS = ['60Hz', '250Hz', '1kHz', '4kHz', '12kHz', '16kHz']
