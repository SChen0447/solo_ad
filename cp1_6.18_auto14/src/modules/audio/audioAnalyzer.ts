export interface BandEnergy {
  low: number
  mid: number
  high: number
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private frequencyData: Uint8Array = new Uint8Array(new ArrayBuffer(0))
  private isPlaying = false

  async init(): Promise<void> {
    if (this.audioContext) return
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 512
    this.analyser.smoothingTimeConstant = 0.8
    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.value = 0.8
    this.frequencyData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount))
    this.analyser.connect(this.gainNode)
    this.gainNode.connect(this.audioContext.destination)
  }

  async loadFromFile(file: File): Promise<void> {
    if (!this.audioContext) await this.init()
    this.stop()
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)
    this.source = this.audioContext!.createBufferSource()
    this.source.buffer = audioBuffer
    this.source.connect(this.analyser!)
  }

  loadFromElement(audioElement: HTMLAudioElement): void {
    if (!this.audioContext || !this.analyser) {
      this.init().then(() => {
        this.source = this.audioContext!.createMediaElementSource(audioElement)
        this.source!.connect(this.analyser!)
      })
    } else {
      this.source = this.audioContext.createMediaElementSource(audioElement)
      this.source.connect(this.analyser)
    }
  }

  play(offset?: number): void {
    if (!this.audioContext || !this.source) return
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
    if ('buffer' in this.source) {
      const source = this.source as AudioBufferSourceNode
      const newSource = this.audioContext.createBufferSource()
      newSource.buffer = source.buffer
      newSource.connect(this.analyser!)
      newSource.start(0, offset || 0)
      this.source.disconnect()
      this.source = newSource
    }
    this.isPlaying = true
  }

  pause(): void {
    if (this.source && 'buffer' in this.source) {
      (this.source as AudioBufferSourceNode).stop()
    }
    this.isPlaying = false
  }

  stop(): void {
    if (this.source) {
      try {
        if ('stop' in this.source) {
          (this.source as AudioBufferSourceNode).stop()
        }
        this.source.disconnect()
      } catch (_) { /* noop */ }
      this.source = null
    }
    this.isPlaying = false
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  getBandEnergy(): BandEnergy {
    if (!this.analyser) {
      return { low: 0, mid: 0, high: 0 }
    }
    this.analyser.getByteFrequencyData(this.frequencyData as unknown as Uint8Array<ArrayBuffer>)
    const length = this.frequencyData.length
    const lowEnd = Math.floor(length * 0.1)
    const midEnd = Math.floor(length * 0.5)

    let lowSum = 0
    let midSum = 0
    let highSum = 0

    for (let i = 0; i < lowEnd; i++) {
      lowSum += this.frequencyData[i]
    }
    for (let i = lowEnd; i < midEnd; i++) {
      midSum += this.frequencyData[i]
    }
    for (let i = midEnd; i < length; i++) {
      highSum += this.frequencyData[i]
    }

    return {
      low: lowSum / lowEnd / 255,
      mid: midSum / (midEnd - lowEnd) / 255,
      high: highSum / (length - midEnd) / 255,
    }
  }

  getRawFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData as unknown as Uint8Array<ArrayBuffer>)
    }
    return this.frequencyData
  }

  dispose(): void {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.analyser = null
    this.gainNode = null
  }
}
