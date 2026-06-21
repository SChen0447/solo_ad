import { expect } from 'vitest'

global.expect = expect

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: class MockAudioContext {
    sampleRate: number
    state: string = 'running'
    private analyser: any = null
    private gain: any = null

    constructor(options?: { sampleRate?: number }) {
      this.sampleRate = options?.sampleRate || 44100
    }

    createAnalyser() {
      const analyser = {
        fftSize: 256,
        frequencyBinCount: 128,
        smoothingTimeConstant: 0.8,
        connect: vi.fn(),
        disconnect: vi.fn(),
        getByteFrequencyData: vi.fn((arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256)
          }
        }),
      }
      this.analyser = analyser
      return analyser
    }

    createGain() {
      const gain = {
        gain: { value: 0.7 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }
      this.gain = gain
      return gain
    }

    createMediaElementSource(element: HTMLMediaElement) {
      return {
        connect: vi.fn(),
        disconnect: vi.fn(),
        mediaElement: element,
      }
    }

    createBuffer(channels: number, length: number, sampleRate: number) {
      const data: Float32Array[] = []
      for (let i = 0; i < channels; i++) {
        data.push(new Float32Array(length))
      }
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: (ch: number) => data[ch],
      }
    }

    resume() {
      this.state = 'running'
      return Promise.resolve()
    }

    close() {
      this.state = 'closed'
      return Promise.resolve()
    }
  },
})

let pausedState = true

Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
  get() {
    return this._paused !== undefined ? this._paused : pausedState
  },
  set(value) {
    this._paused = value
  },
  configurable: true,
})

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: function () {
    this._paused = false
    return Promise.resolve()
  },
})

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: function () {
    this._paused = true
  },
})

vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:test'),
  revokeObjectURL: vi.fn(),
})
