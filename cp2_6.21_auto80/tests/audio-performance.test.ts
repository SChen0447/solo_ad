import { AudioAnalyzer } from '../src/audioAnalyzer'

function generateTestAudioBuffer(
  sampleRate: number,
  duration: number,
  frequencies: number[]
): AudioBuffer {
  const length = sampleRate * duration
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate })
  const buffer = audioContext.createBuffer(2, length, sampleRate)

  for (let channel = 0; channel < 2; channel++) {
    const channelData = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      let sample = 0
      for (const freq of frequencies) {
        sample += Math.sin((i * Math.PI * 2 * freq) / sampleRate)
      }
      channelData[i] = sample / frequencies.length * 0.5
    }
  }

  return buffer
}

function createBlobFromAudioBuffer(buffer: AudioBuffer, sampleRate: number): Blob {
  const length = buffer.length
  const numChannels = buffer.numberOfChannels
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
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

describe('AudioAnalyzer Performance Tests', () => {
  let audioAnalyzer: AudioAnalyzer
  const sampleRate = 44100

  beforeEach(() => {
    audioAnalyzer = new AudioAnalyzer()
  })

  afterEach(() => {
    audioAnalyzer.dispose()
  })

  test('audio parsing latency should be less than 50ms', async () => {
    const audioBuffer = generateTestAudioBuffer(sampleRate, 1, [440, 880])
    const blob = createBlobFromAudioBuffer(audioBuffer, sampleRate)
    const file = new File([blob], 'test.wav', { type: 'audio/wav' })

    const startTime = performance.now()
    await audioAnalyzer.loadAudioFile(file)
    const endTime = performance.now()
    const latency = endTime - startTime

    console.log(`Audio parsing latency: ${latency.toFixed(2)}ms`)
    expect(latency).toBeLessThan(50)
  }, 5000)

  test('spectrum update processing time should be fast enough for 30fps', async () => {
    const audioBuffer = generateTestAudioBuffer(sampleRate, 2, [220, 440, 660])
    const blob = createBlobFromAudioBuffer(audioBuffer, sampleRate)
    const file = new File([blob], 'test.wav', { type: 'audio/wav' })

    await audioAnalyzer.loadAudioFile(file)

    const updateCount = 100
    const targetInterval = 1000 / 30
    const intervals: number[] = []

    for (let i = 0; i < updateCount; i++) {
      const frameStart = performance.now()
      audioAnalyzer.getFrequencyData()
      audioAnalyzer.getAverageAmplitude()
      audioAnalyzer.getLowFrequencyAmplitude()
      const frameEnd = performance.now()
      intervals.push(frameEnd - frameStart)
    }

    const avgFrameTime = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const maxFrameTime = Math.max(...intervals)
    const theoreticalMaxFps = 1000 / avgFrameTime

    console.log(`Average frame processing time: ${avgFrameTime.toFixed(3)}ms`)
    console.log(`Max frame processing time: ${maxFrameTime.toFixed(3)}ms`)
    console.log(`Theoretical max FPS: ${theoreticalMaxFps.toFixed(2)}`)
    console.log(`Target FPS: 30 (max allowed processing time: ${targetInterval.toFixed(1)}ms)`)

    expect(avgFrameTime).toBeLessThan(targetInterval)
    expect(maxFrameTime).toBeLessThan(targetInterval)
    expect(theoreticalMaxFps).toBeGreaterThan(30)
  }, 5000)

  test('animation loop timing should maintain 30fps update rate', () => {
    const targetFps = 30
    const frameInterval = 1000 / targetFps
    let lastFrameTime = 0
    let frameCount = 0
    const startTime = performance.now()

    const simulateAnimationFrame = (time: number) => {
      const delta = time - lastFrameTime
      if (delta >= frameInterval) {
        lastFrameTime = time - (delta % frameInterval)
        frameCount++
      }
    }

    for (let i = 0; i < 1000; i += 16) {
      simulateAnimationFrame(startTime + i)
    }

    const totalTime = 1000
    const expectedFrames = Math.floor(totalTime / frameInterval)
    const actualFps = (frameCount / totalTime) * 1000

    console.log(`Target FPS: ${targetFps}`)
    console.log(`Expected frames in 1s: ${expectedFrames}`)
    console.log(`Actual frames in 1s: ${frameCount}`)
    console.log(`Actual FPS: ${actualFps.toFixed(2)}`)

    expect(actualFps).toBeGreaterThanOrEqual(28)
    expect(actualFps).toBeLessThanOrEqual(32)
    expect(frameCount).toBeGreaterThanOrEqual(expectedFrames - 2)
    expect(frameCount).toBeLessThanOrEqual(expectedFrames + 2)
  })

  test('frequency data should have exactly 128 bins', async () => {
    const audioBuffer = generateTestAudioBuffer(sampleRate, 1, [440])
    const blob = createBlobFromAudioBuffer(audioBuffer, sampleRate)
    const file = new File([blob], 'test.wav', { type: 'audio/wav' })

    await audioAnalyzer.loadAudioFile(file)

    const frequencyData = audioAnalyzer.getFrequencyData()
    expect(frequencyData.length).toBe(128)
  })

  test('frequency data values should be in valid range (0-255)', async () => {
    const audioBuffer = generateTestAudioBuffer(sampleRate, 1, [440, 880, 1320])
    const blob = createBlobFromAudioBuffer(audioBuffer, sampleRate)
    const file = new File([blob], 'test.wav', { type: 'audio/wav' })

    await audioAnalyzer.loadAudioFile(file)

    const frequencyData = audioAnalyzer.getFrequencyData()
    for (let i = 0; i < frequencyData.length; i++) {
      expect(frequencyData[i]).toBeGreaterThanOrEqual(0)
      expect(frequencyData[i]).toBeLessThanOrEqual(255)
    }
  })

  test('getAverageAmplitude should return value between 0 and 1', async () => {
    const audioBuffer = generateTestAudioBuffer(sampleRate, 1, [440])
    const blob = createBlobFromAudioBuffer(audioBuffer, sampleRate)
    const file = new File([blob], 'test.wav', { type: 'audio/wav' })

    await audioAnalyzer.loadAudioFile(file)

    const amplitude = audioAnalyzer.getAverageAmplitude()
    expect(amplitude).toBeGreaterThanOrEqual(0)
    expect(amplitude).toBeLessThanOrEqual(1)
  })

  test('volume control should work correctly', async () => {
    const audioBuffer = generateTestAudioBuffer(sampleRate, 1, [440])
    const blob = createBlobFromAudioBuffer(audioBuffer, sampleRate)
    const file = new File([blob], 'test.wav', { type: 'audio/wav' })

    await audioAnalyzer.loadAudioFile(file)

    audioAnalyzer.setVolume(0)
    expect(audioAnalyzer.getVolume()).toBeCloseTo(0, 5)

    audioAnalyzer.setVolume(0.5)
    expect(audioAnalyzer.getVolume()).toBeCloseTo(0.5, 5)

    audioAnalyzer.setVolume(1)
    expect(audioAnalyzer.getVolume()).toBeCloseTo(1, 5)

    audioAnalyzer.setVolume(-0.5)
    expect(audioAnalyzer.getVolume()).toBeCloseTo(0, 5)

    audioAnalyzer.setVolume(1.5)
    expect(audioAnalyzer.getVolume()).toBeCloseTo(1, 5)
  })

  test('FFT size should be 256 producing 128 frequency bins', async () => {
    const audioBuffer = generateTestAudioBuffer(sampleRate, 1, [440])
    const blob = createBlobFromAudioBuffer(audioBuffer, sampleRate)
    const file = new File([blob], 'test.wav', { type: 'audio/wav' })

    await audioAnalyzer.loadAudioFile(file)
    await audioAnalyzer.init()

    const frequencyData = audioAnalyzer.getFrequencyData()
    expect(frequencyData.length).toBe(128)
  })

  test('sample rate should be 44.1kHz', async () => {
    await audioAnalyzer.init()

    const context = (audioAnalyzer as any).audioContext as AudioContext
    expect(context.sampleRate).toBe(44100)
  })
})

describe('Integration Tests', () => {
  test('full audio visualization pipeline should work', async () => {
    const audioAnalyzer = new AudioAnalyzer()

    try {
      const sampleRate = 44100
      const audioBuffer = generateTestAudioBuffer(sampleRate, 1, [220, 440, 880])
      const blob = createBlobFromAudioBuffer(audioBuffer, sampleRate)
      const file = new File([blob], 'test.wav', { type: 'audio/wav' })

      const loadStart = performance.now()
      await audioAnalyzer.loadAudioFile(file)
      const loadEnd = performance.now()

      console.log(`Load time: ${(loadEnd - loadStart).toFixed(2)}ms`)
      expect(loadEnd - loadStart).toBeLessThan(50)

      for (let i = 0; i < 30; i++) {
        const frameStart = performance.now()
        const freqData = audioAnalyzer.getFrequencyData()
        const amplitude = audioAnalyzer.getAverageAmplitude()
        const lowFreqAmp = audioAnalyzer.getLowFrequencyAmplitude()
        const frameEnd = performance.now()

        expect(freqData.length).toBe(128)
        expect(amplitude).toBeGreaterThanOrEqual(0)
        expect(amplitude).toBeLessThanOrEqual(1)
        expect(lowFreqAmp).toBeGreaterThanOrEqual(0)
        expect(lowFreqAmp).toBeLessThanOrEqual(1)
        expect(frameEnd - frameStart).toBeLessThan(10)

        await new Promise((r) => setTimeout(r, 33))
      }
    } finally {
      audioAnalyzer.dispose()
    }
  }, 15000)
})
