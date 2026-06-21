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

    decodeAudioData(arrayBuffer: ArrayBuffer) {
      const length = arrayBuffer.byteLength / 4
      const data = new Float32Array(length)
      return Promise.resolve({
        numberOfChannels: 2,
        length,
        sampleRate: 44100,
        duration: length / 44100,
        getChannelData: (ch: number) => data,
      })
    }
  },
})

Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
  get() {
    return this._paused !== undefined ? this._paused : true
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

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  getParameter: vi.fn(() => null),
  getExtension: vi.fn(() => null),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  createProgram: vi.fn(() => ({})),
  createShader: vi.fn(() => ({})),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  useProgram: vi.fn(),
  getAttribLocation: vi.fn(() => 0),
  getUniformLocation: vi.fn(() => ({})),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  drawArrays: vi.fn(),
  viewport: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  blendFunc: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),
  deleteBuffer: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  getProgramParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ''),
  getProgramInfoLog: vi.fn(() => ''),
  PIXEL_UNPACK_BUFFER: 0,
  ARRAY_BUFFER: 0x8892,
  STATIC_DRAW: 0x88E4,
  FLOAT: 0x1406,
  VERTEX_SHADER: 0x8B31,
  FRAGMENT_SHADER: 0x8B30,
  HIGH_FLOAT: 0x8DF2,
  COMPILE_STATUS: 0x8B81,
  LINK_STATUS: 0x8B82,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  COLOR_BUFFER_BIT: 0x00004000,
  DEPTH_BUFFER_BIT: 0x00000100,
  DEPTH_TEST: 0x0B71,
  BLEND: 0x0BE2,
  SRC_ALPHA: 0x0302,
  ONE_MINUS_SRC_ALPHA: 0x0303,
  TRIANGLES: 0x0004,
  POINTS: 0x0000,
  LINE_STRIP: 0x0003,
  TEXTURE_2D: 0x0DE1,
  TEXTURE0: 0x84C0,
  activeTexture: vi.fn(),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  createTexture: vi.fn(),
}) as any

Object.defineProperty(window, 'devicePixelRatio', {
  value: 1,
  writable: true,
})

Object.defineProperty(window, 'WebGLRenderer', {
  value: vi.fn(),
  writable: true,
})
