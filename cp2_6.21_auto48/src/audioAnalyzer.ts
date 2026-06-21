import type { FrequencyData } from './types'

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private audioBuffer: AudioBuffer | null = null
  private source: AudioBufferSourceNode | null = null
  private startTime: number = 0
  private pausedAt: number = 0
  private isPlaying: boolean = false
  private onFrequencyUpdate: ((data: FrequencyData) => void) | null = null
  private animationId: number | null = null
  private playbackRate: number = 1

  constructor() {
    this.initAudioContext()
  }

  private initAudioContext() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 512
    this.analyser.smoothingTimeConstant = 0.8
    this.gainNode = this.audioContext.createGain()
    this.analyser.connect(this.gainNode)
    this.gainNode.connect(this.audioContext.destination)
  }

  setFrequencyCallback(callback: (data: FrequencyData) => void) {
    this.onFrequencyUpdate = callback
  }

  async decodeAudioFile(file: File): Promise<{ duration: number; sampleRate: number; numberOfChannels: number }> {
    if (!this.audioContext) {
      this.initAudioContext()
    }
    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume()
    }
    const arrayBuffer = await file.arrayBuffer()
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer.slice(0))
    return {
      duration: this.audioBuffer.duration,
      sampleRate: this.audioBuffer.sampleRate,
      numberOfChannels: this.audioBuffer.numberOfChannels,
    }
  }

  getWaveformData(samples: number = 1000): number[] {
    if (!this.audioBuffer) return []
    const channelData = this.audioBuffer.getChannelData(0)
    const blockSize = Math.floor(channelData.length / samples)
    const waveform: number[] = []
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j])
      }
      waveform.push(sum / blockSize)
    }
    return waveform
  }

  play(startTime: number = this.pausedAt) {
    if (!this.audioBuffer || !this.audioContext || !this.analyser) return
    this.stop()
    this.source = this.audioContext.createBufferSource()
    this.source.buffer = this.audioBuffer
    this.source.playbackRate.value = this.playbackRate
    this.source.connect(this.analyser)
    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false
        this.pausedAt = 0
        this.stopAnimation()
      }
    }
    const offset = Math.min(startTime, this.audioBuffer.duration)
    this.source.start(0, offset)
    this.startTime = this.audioContext.currentTime - offset
    this.pausedAt = offset
    this.isPlaying = true
    this.startAnimation()
  }

  pause() {
    if (this.source && this.audioContext && this.isPlaying) {
      this.pausedAt = this.audioContext.currentTime - this.startTime
      this.source.stop()
      this.source = null
      this.isPlaying = false
      this.stopAnimation()
    }
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop()
      } catch (e) {}
      this.source = null
    }
    this.isPlaying = false
    this.stopAnimation()
  }

  seek(time: number) {
    const wasPlaying = this.isPlaying
    this.pausedAt = Math.max(0, Math.min(time, this.audioBuffer?.duration || 0))
    if (wasPlaying) {
      this.play(this.pausedAt)
    }
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate
    if (this.source) {
      this.source.playbackRate.value = rate
    }
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  getCurrentTime(): number {
    if (!this.isPlaying || !this.audioContext) return this.pausedAt
    return this.audioContext.currentTime - this.startTime
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  private startAnimation() {
    const analyze = () => {
      if (!this.isPlaying || !this.analyser) return
      const bufferLength = this.analyser.frequencyBinCount
      const frequencyData = new Uint8Array(bufferLength)
      const waveformData = new Float32Array(this.analyser.fftSize)
      this.analyser.getByteFrequencyData(frequencyData)
      this.analyser.getFloatTimeDomainData(waveformData)
      if (this.onFrequencyUpdate) {
        this.onFrequencyUpdate({
          frequencies: frequencyData,
          waveform: waveformData,
          timestamp: performance.now(),
        })
      }
      this.animationId = requestAnimationFrame(analyze)
    }
    analyze()
  }

  private stopAnimation() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  cleanup() {
    this.stop()
    this.stopAnimation()
    if (this.audioContext) {
      this.audioContext.close()
    }
  }
}
