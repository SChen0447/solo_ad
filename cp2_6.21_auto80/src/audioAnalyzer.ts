export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private audioElement: HTMLAudioElement | null = null
  private frequencyData: Uint8Array
  private readonly fftSize: number = 256
  private readonly frequencyBinCount: number = 128

  constructor() {
    this.frequencyData = new Uint8Array(this.frequencyBinCount)
  }

  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 44100 })
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = this.fftSize
      this.analyser.smoothingTimeConstant = 0.8
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = 0.7
      this.analyser.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)
    }
  }

  async loadAudioFile(file: File): Promise<void> {
    await this.init()

    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.src = ''
    }

    this.audioElement = new Audio()
    this.audioElement.crossOrigin = 'anonymous'
    this.audioElement.src = URL.createObjectURL(file)

    if (this.source) {
      this.source.disconnect()
    }

    if (this.audioContext && this.analyser) {
      this.source = this.audioContext.createMediaElementSource(this.audioElement)
      this.source.connect(this.analyser)
    }

    await this.audioElement.play()
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData)
    }
    return this.frequencyData
  }

  getAverageAmplitude(): number {
    const data = this.getFrequencyData()
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      sum += data[i]
    }
    return sum / data.length / 255
  }

  getLowFrequencyAmplitude(): number {
    const data = this.getFrequencyData()
    let sum = 0
    const lowEnd = Math.floor(data.length * 0.2)
    for (let i = 0; i < lowEnd; i++) {
      sum += data[i]
    }
    return sum / lowEnd / 255
  }

  play(): void {
    if (this.audioElement && this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }
      this.audioElement.play()
    }
  }

  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause()
    }
  }

  togglePlay(): boolean {
    if (this.audioElement) {
      if (this.audioElement.paused) {
        this.play()
        return true
      } else {
        this.pause()
        return false
      }
    }
    return false
  }

  isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value))
    }
  }

  getVolume(): number {
    return this.gainNode ? this.gainNode.gain.value : 0.7
  }

  dispose(): void {
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.src = ''
      this.audioElement = null
    }
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
