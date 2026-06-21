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
    if (!file || file.size === 0) {
      throw new Error('文件为空，请选择有效的音频文件')
    }
    if (!this.audioContext) {
      this.initAudioContext()
    }
    if (!this.audioContext) {
      throw new Error('无法初始化音频上下文，请检查浏览器支持')
    }
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
      } catch (e) {
        console.warn('恢复音频上下文失败:', e)
      }
    }
    let arrayBuffer: ArrayBuffer
    try {
      arrayBuffer = await file.arrayBuffer()
    } catch (e) {
      throw new Error('读取文件失败，请确保文件未被占用')
    }
    if (arrayBuffer.byteLength === 0) {
      throw new Error('音频文件内容为空')
    }
    try {
      const decodeBuffer = arrayBuffer.slice(0)
      this.audioBuffer = await this.audioContext.decodeAudioData(decodeBuffer)
    } catch (e) {
      throw new Error('音频解码失败，请确保文件格式正确（MP3或WAV）')
    }
    if (!this.audioBuffer || this.audioBuffer.length === 0) {
      throw new Error('解码后的音频数据为空，文件可能已损坏')
    }
    if (this.audioBuffer.duration <= 0) {
      throw new Error('音频时长无效，请检查文件')
    }
    return {
      duration: this.audioBuffer.duration,
      sampleRate: this.audioBuffer.sampleRate,
      numberOfChannels: this.audioBuffer.numberOfChannels,
    }
  }

  getWaveformData(samples: number = 1000): number[] {
    if (!this.audioBuffer) return []
    try {
      const channelData = this.audioBuffer.getChannelData(0)
      if (!channelData || channelData.length === 0) return []
      const blockSize = Math.max(1, Math.floor(channelData.length / samples))
      const waveform: number[] = []
      const len = Math.min(samples, Math.floor(channelData.length / blockSize))
      for (let i = 0; i < len; i++) {
        const start = i * blockSize
        let sum = 0
        let count = 0
        for (let j = 0; j < blockSize && start + j < channelData.length; j++) {
          const val = channelData[start + j]
          if (isFinite(val)) {
            sum += Math.abs(val)
            count++
          }
        }
        waveform.push(count > 0 ? sum / count : 0)
      }
      return waveform
    } catch (e) {
      console.error('获取波形数据失败:', e)
      return []
    }
  }

  play(startTime: number = this.pausedAt) {
    if (!this.audioBuffer || !this.audioContext || !this.analyser) {
      console.warn('播放失败：音频未就绪')
      return
    }
    try {
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
      this.source.onerror = (e) => {
        console.error('音频播放错误:', e)
        this.isPlaying = false
        this.stopAnimation()
      }
      const offset = Math.max(0, Math.min(startTime, this.audioBuffer.duration))
      this.source.start(0, offset)
      this.startTime = this.audioContext.currentTime - offset
      this.pausedAt = offset
      this.isPlaying = true
      this.startAnimation()
    } catch (e) {
      console.error('启动播放失败:', e)
      this.isPlaying = false
      this.stopAnimation()
    }
  }

  pause() {
    try {
      if (this.source && this.audioContext && this.isPlaying) {
        this.pausedAt = Math.max(0, this.audioContext.currentTime - this.startTime)
        this.source.stop()
        this.source = null
        this.isPlaying = false
        this.stopAnimation()
      }
    } catch (e) {
      console.error('暂停失败:', e)
      this.isPlaying = false
    }
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop()
      } catch (e) {
        console.warn('停止源失败（可能已停止）:', e)
      }
      this.source = null
    }
    this.isPlaying = false
    this.stopAnimation()
  }

  seek(time: number) {
    try {
      const validTime = Math.max(0, Math.min(time, this.audioBuffer?.duration || 0))
      if (!isFinite(validTime)) return
      const wasPlaying = this.isPlaying
      this.pausedAt = validTime
      if (wasPlaying) {
        this.play(this.pausedAt)
      }
    } catch (e) {
      console.error('跳转失败:', e)
    }
  }

  setPlaybackRate(rate: number) {
    try {
      const validRate = Math.max(0.5, Math.min(2.0, rate))
      if (!isFinite(validRate)) return
      this.playbackRate = validRate
      if (this.source) {
        this.source.playbackRate.value = validRate
      }
    } catch (e) {
      console.error('设置播放速率失败:', e)
    }
  }

  setVolume(volume: number) {
    try {
      const validVolume = Math.max(0, Math.min(1, volume))
      if (!isFinite(validVolume)) return
      if (this.gainNode) {
        this.gainNode.gain.value = validVolume
      }
    } catch (e) {
      console.error('设置音量失败:', e)
    }
  }

  getCurrentTime(): number {
    try {
      if (!this.isPlaying || !this.audioContext) return this.pausedAt
      const time = this.audioContext.currentTime - this.startTime
      return Math.max(0, Math.min(time, this.audioBuffer?.duration || 0))
    } catch (e) {
      return this.pausedAt
    }
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

  getWaveformInTimeRange(centerTime: number, rangeSeconds: number, samples: number = 200): number[] {
    if (!this.audioBuffer) return []
    try {
      const channelData = this.audioBuffer.getChannelData(0)
      if (!channelData || channelData.length === 0) return []
      const sampleRate = this.audioBuffer.sampleRate
      const halfRange = rangeSeconds / 2
      const startSample = Math.max(0, Math.floor((centerTime - halfRange) * sampleRate))
      const endSample = Math.min(channelData.length, Math.floor((centerTime + halfRange) * sampleRate))
      if (endSample <= startSample) return []
      const blockSize = Math.max(1, Math.floor((endSample - startSample) / samples))
      const waveform: number[] = []
      const len = Math.min(samples, Math.floor((endSample - startSample) / blockSize))
      for (let i = 0; i < len; i++) {
        const start = startSample + i * blockSize
        let sum = 0
        let count = 0
        for (let j = 0; j < blockSize && start + j < endSample; j++) {
          const val = channelData[start + j]
          if (isFinite(val)) {
            sum += Math.abs(val)
            count++
          }
        }
        waveform.push(count > 0 ? sum / count : 0)
      }
      return waveform
    } catch (e) {
      console.error('获取时间范围波形数据失败:', e)
      return []
    }
  }

  cleanup() {
    this.stop()
    this.stopAnimation()
    if (this.audioContext) {
      this.audioContext.close()
    }
  }
}
