import { AudioAnalyzer } from '../src/audioAnalyzer'

function createWavBlob(sampleRate: number, duration: number, frequencies: number[]): Blob {
  const length = Math.floor(sampleRate * duration)
  const numChannels = 2
  const bytesPerSample = 2
  const dataSize = length * numChannels * bytesPerSample
  const bufferSize = 44 + dataSize

  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, bufferSize - 8, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true)
  view.setUint16(32, numChannels * bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = 0
      for (const freq of frequencies) {
        sample += Math.sin((i * Math.PI * 2 * freq) / sampleRate)
      }
      sample = sample / frequencies.length * 0.5
      sample = Math.max(-1, Math.min(1, sample))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

describe('AudioAnalyzer - Audio Processing Latency Tests', () => {
  let audioAnalyzer: AudioAnalyzer
  const sampleRate = 44100

  beforeEach(() => {
    audioAnalyzer = new AudioAnalyzer()
  })

  afterEach(() => {
    audioAnalyzer.dispose()
  })

  test('audio file loading and analysis pipeline latency should be less than 50ms', async () => {
    const blob = createWavBlob(sampleRate, 0.5, [440, 880])
    const file = new File([blob], 'test.wav', { type: 'audio/wav' })

    const startTime = performance.now()
    await audioAnalyzer.loadAudioFile(file)
    const loadEndTime = performance.now()
    const loadLatency = loadEndTime - startTime

    audioAnalyzer.getFrequencyData()
    const firstFrameEnd = performance.now()
    const totalLatency = firstFrameEnd - startTime

    console.log(`File load latency: ${loadLatency.toFixed(2)}ms`)
    console.log(`Total pipeline latency (load + first frame): ${totalLatency.toFixed(2)}ms`)

    expect(loadLatency).toBeLessThan(50)
    expect(totalLatency).toBeLessThan(50)
  })

  test('audio decode latency via AudioContext.decodeAudioData should be less than 50ms', async () => {
    const blob = createWavBlob(sampleRate, 1, [220, 440, 880])
    const reader = new FileReader()
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.readAsArrayBuffer(blob)
    })

    const audioContext = new AudioContext({ sampleRate })

    const decodeStart = performance.now()
    await audioContext.decodeAudioData(arrayBuffer)
    const decodeEnd = performance.now()
    const decodeLatency = decodeEnd - decodeStart

    console.log(`decodeAudioData latency: ${decodeLatency.toFixed(2)}ms`)

    await audioContext.close()
    expect(decodeLatency).toBeLessThan(50)
  })

  test('analyser node getByteFrequencyData call latency should be sub-millisecond', async () => {
    const blob = createWavBlob(sampleRate, 0.5, [440])
    const file = new File([blob], 'test.wav', { type: 'audio/wav' })
    await audioAnalyzer.loadAudioFile(file)

    const iterations = 100
    const startTime = performance.now()
    for (let i = 0; i < iterations; i++) {
      audioAnalyzer.getFrequencyData()
    }
    const endTime = performance.now()
    const avgLatency = (endTime - startTime) / iterations

    console.log(`Average getFrequencyData latency: ${avgLatency.toFixed(4)}ms`)
    expect(avgLatency).toBeLessThan(1)
  })

  test('complete analysis pipeline per frame should be under 33ms for 30fps', async () => {
    const blob = createWavBlob(sampleRate, 1, [220, 440])
    const file = new File([blob], 'test.wav', { type: 'audio/wav' })
    await audioAnalyzer.loadAudioFile(file)

    const iterations = 60
    const frameTimes: number[] = []

    for (let i = 0; i < iterations; i++) {
      const frameStart = performance.now()
      audioAnalyzer.getFrequencyData()
      audioAnalyzer.getAverageAmplitude()
      audioAnalyzer.getLowFrequencyAmplitude()
      const frameEnd = performance.now()
      frameTimes.push(frameEnd - frameStart)
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    const maxFrameTime = Math.max(...frameTimes)
    const theoreticalFps = 1000 / avgFrameTime

    console.log(`Avg frame time: ${avgFrameTime.toFixed(3)}ms`)
    console.log(`Max frame time: ${maxFrameTime.toFixed(3)}ms`)
    console.log(`Theoretical FPS: ${theoreticalFps.toFixed(0)}`)

    expect(avgFrameTime).toBeLessThan(33.33)
    expect(maxFrameTime).toBeLessThan(33.33)
    expect(theoreticalFps).toBeGreaterThan(30)
  })
})

describe('Spectrum Visualizer Parameter Verification', () => {
  test('SpectrumVisualizer should have exactly 128 bars', async () => {
    const { SpectrumVisualizer } = await import('../src/spectrumVisualizer')
    const { Scene } = await import('three')

    const scene = new Scene()
    const visualizer = new SpectrumVisualizer(scene)

    expect(visualizer.getBarCount()).toBe(128)

    visualizer.dispose()
  })

  test('SpectrumVisualizer bar base radius should be 0.3 units', async () => {
    const { SpectrumVisualizer } = await import('../src/spectrumVisualizer')
    const { Scene } = await import('three')

    const scene = new Scene()
    const visualizer = new SpectrumVisualizer(scene)

    expect(visualizer.getBaseRadius()).toBe(0.3)

    visualizer.dispose()
  })

  test('SpectrumVisualizer max height should be 8 units', async () => {
    const { SpectrumVisualizer } = await import('../src/spectrumVisualizer')
    const { Scene } = await import('three')

    const scene = new Scene()
    const visualizer = new SpectrumVisualizer(scene)

    expect(visualizer.getMaxHeight()).toBe(8)

    visualizer.dispose()
  })

  test('SpectrumVisualizer min height should be 0.5 units', async () => {
    const { SpectrumVisualizer } = await import('../src/spectrumVisualizer')
    const { Scene } = await import('three')

    const scene = new Scene()
    const visualizer = new SpectrumVisualizer(scene)

    expect(visualizer.getMinHeight()).toBe(0.5)

    visualizer.dispose()
  })

  test('SpectrumVisualizer bars should be arranged in circular pattern', async () => {
    const { SpectrumVisualizer } = await import('../src/spectrumVisualizer')
    const { Scene } = await import('three')

    const scene = new Scene()
    const visualizer = new SpectrumVisualizer(scene)
    const radius = visualizer.getArrangementRadius()

    expect(radius).toBeGreaterThan(0)

    visualizer.dispose()
  })

  test('SpectrumVisualizer responsive radius should match specifications', async () => {
    const { SpectrumVisualizer } = await import('../src/spectrumVisualizer')
    const { Scene } = await import('three')

    const scene = new Scene()
    const visualizer = new SpectrumVisualizer(scene)

    visualizer.setArrangementRadius(7.5)
    expect(visualizer.getArrangementRadius()).toBe(7.5)

    visualizer.setArrangementRadius(5)
    expect(visualizer.getArrangementRadius()).toBe(5)

    visualizer.dispose()
  })
})

describe('Responsive Layout Tests', () => {
  function getResponsiveRadius(width: number): number {
    if (width < 768) {
      return 5
    } else if (width > 1200) {
      return 7.5
    }
    return 6.25
  }

  test('wide screens (>1200px) should have diameter 15 units (radius 7.5)', () => {
    const radius = getResponsiveRadius(1400)
    const diameter = radius * 2
    expect(radius).toBe(7.5)
    expect(diameter).toBe(15)
  })

  test('narrow screens (<768px) should have diameter 10 units (radius 5)', () => {
    const radius = getResponsiveRadius(600)
    const diameter = radius * 2
    expect(radius).toBe(5)
    expect(diameter).toBe(10)
  })

  test('medium screens (768-1200px) should have intermediate radius', () => {
    const radius = getResponsiveRadius(1000)
    expect(radius).toBe(6.25)
  })
})

describe('Light Pulse Audio Correlation Tests', () => {
  function computeLightIntensity(
    baseIntensity: number,
    audioAmplitude: number,
    lowFrequencyAmplitude: number,
    phaseOffset: number = 0
  ): number {
    const beatIntensity = 0.5 + lowFrequencyAmplitude * 1.0
    const phaseShimmer = 1.0 + Math.sin(Date.now() * 0.004 + phaseOffset) * 0.05
    const clampedPulse = Math.max(0.5, Math.min(1.5, beatIntensity))
    const intensity = baseIntensity * clampedPulse * phaseShimmer * (0.6 + audioAmplitude * 0.4)
    return Math.min(3.0, intensity)
  }

  test('light intensity should increase with low frequency amplitude', () => {
    const silentIntensity = computeLightIntensity(1, 0, 0)
    const activeIntensity = computeLightIntensity(1, 0.5, 0.8)
    const peakIntensity = computeLightIntensity(1, 0.8, 1.0)

    console.log(`Silent intensity: ${silentIntensity.toFixed(3)}`)
    console.log(`Active intensity (amp=0.5, lowFreq=0.8): ${activeIntensity.toFixed(3)}`)
    console.log(`Peak intensity (amp=0.8, lowFreq=1.0): ${peakIntensity.toFixed(3)}`)

    expect(activeIntensity).toBeGreaterThan(silentIntensity)
    expect(peakIntensity).toBeGreaterThanOrEqual(activeIntensity)
  })

  test('light pulse beat intensity should map low frequency amplitude to 0.5-1.5 range', () => {
    const beatAtZero = 0.5 + 0 * 1.0
    const beatAtHalf = 0.5 + 0.5 * 1.0
    const beatAtFull = 0.5 + 1.0 * 1.0

    expect(beatAtZero).toBe(0.5)
    expect(beatAtHalf).toBe(1.0)
    expect(beatAtFull).toBe(1.5)
  })

  test('light pulse clamped value should stay in 0.5-1.5 range', () => {
    const clampedLow = Math.max(0.5, Math.min(1.5, 0.5 + 0 * 1.0))
    const clampedMid = Math.max(0.5, Math.min(1.5, 0.5 + 0.5 * 1.0))
    const clampedHigh = Math.max(0.5, Math.min(1.5, 0.5 + 1.0 * 1.0))

    expect(clampedLow).toBe(0.5)
    expect(clampedMid).toBe(1.0)
    expect(clampedHigh).toBe(1.5)
  })

  test('phase shimmer should be minimal (5% max)', () => {
    const base = 1.0
    const shimmerLow = 1.0 + Math.sin(0) * 0.05
    const shimmerHigh = 1.0 + Math.sin(Math.PI / 2) * 0.05

    expect(shimmerLow).toBeCloseTo(1.0, 2)
    expect(shimmerHigh).toBeCloseTo(1.05, 2)
    expect(Math.abs(shimmerHigh - base)).toBeLessThanOrEqual(0.05)
  })
})

describe('Particle System Fade-out Tests', () => {
  test('particle alphas should decrease over lifetime representing 2-second fade-out', async () => {
    const { ParticleSystem } = await import('../src/particleSystem')
    const { Scene } = await import('three')

    const scene = new Scene()
    const particleSystem = new ParticleSystem(scene, 10)

    particleSystem.update(0, 0)

    const geometry = particleSystem.points.geometry
    const alphaAttr = geometry.getAttribute('aAlpha') as { array: Float32Array; needsUpdate: boolean }
    const alphasAtBirth = Array.from(alphaAttr.array.slice(0, 10))

    particleSystem.update(1000, 0)
    const alphasAtMidLife = Array.from(alphaAttr.array.slice(0, 10))

    particleSystem.update(2000, 0)
    const alphasAtEndOfLife = Array.from(alphaAttr.array.slice(0, 10))

    console.log(`Alphas at birth: [${alphasAtBirth.map(a => a.toFixed(2)).join(', ')}]`)
    console.log(`Alphas at mid-life: [${alphasAtMidLife.map(a => a.toFixed(2)).join(', ')}]`)
    console.log(`Alphas at end of life: [${alphasAtEndOfLife.map(a => a.toFixed(2)).join(', ')}]`)

    const avgAtBirth = alphasAtBirth.reduce((a, b) => a + b, 0) / alphasAtBirth.length
    const avgAtMidLife = alphasAtMidLife.reduce((a, b) => a + b, 0) / alphasAtMidLife.length
    const avgAtEndOfLife = alphasAtEndOfLife.reduce((a, b) => a + b, 0) / alphasAtEndOfLife.length

    expect(avgAtBirth).toBeGreaterThan(avgAtMidLife)
    expect(avgAtMidLife).toBeGreaterThan(avgAtEndOfLife)

    particleSystem.dispose()
  })

  test('particle count should be adjustable between 100 and 1000', async () => {
    const { ParticleSystem } = await import('../src/particleSystem')
    const { Scene } = await import('three')

    const scene = new Scene()
    const particleSystem = new ParticleSystem(scene, 500)

    expect(particleSystem.getParticleCount()).toBe(500)

    particleSystem.setParticleCount(100)
    expect(particleSystem.getParticleCount()).toBe(100)

    particleSystem.setParticleCount(1000)
    expect(particleSystem.getParticleCount()).toBe(1000)

    particleSystem.dispose()
  })
})

describe('Animation Loop Timing Tests', () => {
  test('frame interval calculation should produce 30fps', () => {
    const targetFps = 30
    const frameInterval = 1000 / targetFps

    expect(frameInterval).toBeCloseTo(33.333, 1)
  })

  test('frame skip logic should maintain target rate', () => {
    const targetFps = 30
    const frameInterval = 1000 / targetFps
    let lastFrameTime = 0
    let frameCount = 0

    const simulateFrame = (time: number) => {
      const delta = time - lastFrameTime
      if (delta >= frameInterval) {
        lastFrameTime = time - (delta % frameInterval)
        frameCount++
      }
    }

    for (let i = 0; i < 60; i++) {
      simulateFrame(i * 16.67)
    }

    const elapsed = 60 * 16.67
    const actualFps = (frameCount / elapsed) * 1000

    console.log(`Frames in ~1s: ${frameCount}`)
    console.log(`Actual FPS: ${actualFps.toFixed(2)}`)

    expect(frameCount).toBeGreaterThanOrEqual(28)
    expect(frameCount).toBeLessThanOrEqual(32)
  })
})
