import React, { useEffect, useRef, useState, useCallback } from 'react'

interface VisualizerProps {
  getTimeDomainData: () => Uint8Array
  getFrequencyData: () => Uint8Array
  getSampleRate: () => number
  isPlaying: boolean
}

const FFT_SIZE = 2048
const MIN_FREQ = 20
const MAX_FREQ = 20000

export const Visualizer: React.FC<VisualizerProps> = ({
  getTimeDomainData,
  getFrequencyData,
  getSampleRate,
  isPlaying
}) => {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const [waveformSize, setWaveformSize] = useState({ width: 0, height: 0 })
  const [spectrumSize, setSpectrumSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const logIndexMapRef = useRef<{ startBin: number; endBin: number; xStart: number; width: number }[]>([])

  const computeCanvasSize = useCallback((containerWidth: number) => {
    const isMobile = containerWidth < 480
    const scale = isMobile ? Math.max(0.6, containerWidth / 480) : 1
    return {
      waveform: {
        width: Math.round(480 * scale),
        height: Math.round(200 * scale)
      },
      spectrum: {
        width: Math.round(480 * scale),
        height: Math.round(150 * scale)
      }
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSizes = () => {
      const containerWidth = container.getBoundingClientRect().width - 24
      const sizes = computeCanvasSize(containerWidth)
      setWaveformSize(sizes.waveform)
      setSpectrumSize(sizes.spectrum)
    }

    updateSizes()

    const observer = new ResizeObserver(updateSizes)
    observer.observe(container)

    return () => observer.disconnect()
  }, [computeCanvasSize])

  const buildLogIndexMap = useCallback((fftSize: number, sampleRate: number, numBars: number) => {
    const nyquist = sampleRate / 2
    const binCount = fftSize / 2
    const minLog = Math.log10(MIN_FREQ)
    const maxLog = Math.log10(Math.min(MAX_FREQ, nyquist))
    const logRange = maxLog - minLog

    const bars: { startBin: number; endBin: number; xStart: number; width: number }[] = []
    let xCursor = 0
    const totalLogWidth = logRange

    for (let i = 0; i < numBars; i++) {
      const logLow = minLog + (i / numBars) * totalLogWidth
      const logHigh = minLog + ((i + 1) / numBars) * totalLogWidth
      const freqLow = Math.pow(10, logLow)
      const freqHigh = Math.pow(10, logHigh)
      const startBin = Math.min(Math.round((freqLow / nyquist) * binCount), binCount - 1)
      const endBin = Math.min(Math.round((freqHigh / nyquist) * binCount), binCount - 1)
      const barWidth = ((logHigh - logLow) / totalLogWidth) * 100
      bars.push({ startBin, endBin, xStart: xCursor, width: barWidth })
      xCursor += barWidth
    }

    return bars
  }, [])

  useEffect(() => {
    const sampleRate = getSampleRate()
    const numBars = Math.min(64, Math.floor(spectrumSize.width / 6))
    if (numBars > 0) {
      logIndexMapRef.current = buildLogIndexMap(FFT_SIZE, sampleRate, numBars)
    }
  }, [spectrumSize.width, buildLogIndexMap, getSampleRate])

  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = waveformSize
    if (width === 0 || height === 0) return
    canvas.width = width * window.devicePixelRatio
    canvas.height = height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#666'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    for (let i = 0; i <= 6; i++) {
      const x = (width / 6) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    const data = getTimeDomainData()
    const bufferLength = data.length

    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#1a73e8')
    gradient.addColorStop(1, '#64b5f6')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(0, height)

    for (let i = 0; i < width; i++) {
      const dataIndex = Math.floor((i / width) * bufferLength)
      const value = data[dataIndex]
      const y = height - (value / 255) * height
      ctx.lineTo(i, y)
    }

    ctx.lineTo(width, height)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#64b5f6'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i < width; i++) {
      const dataIndex = Math.floor((i / width) * bufferLength)
      const value = data[dataIndex]
      const y = height - (value / 255) * height
      if (i === 0) {
        ctx.moveTo(i, y)
      } else {
        ctx.lineTo(i, y)
      }
    }
    ctx.stroke()

    ctx.strokeStyle = '#888'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
  }, [getTimeDomainData, waveformSize])

  const drawSpectrum = useCallback(() => {
    const canvas = spectrumCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = spectrumSize
    if (width === 0 || height === 0) return
    canvas.width = width * window.devicePixelRatio
    canvas.height = height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#666'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    const freqData = getFrequencyData()
    const bars = logIndexMapRef.current
    if (bars.length < 1) return

    const drawWidth = width - 20
    const startX = 10
    const barGap = 1

    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i]
      const barPixelWidth = Math.max(2, (bar.width / 100) * drawWidth - barGap)
      const x = startX + (bar.xStart / 100) * drawWidth

      let sum = 0
      let count = 0
      for (let j = bar.startBin; j <= bar.endBin; j++) {
        sum += freqData[j] || 0
        count++
      }
      const avgValue = count > 0 ? sum / count : 0

      const normalizedValue = isPlaying ? avgValue / 255 : Math.max(avgValue / 255, 0.05)
      const barHeight = normalizedValue * (height - 20)
      const y = height - barHeight - 10

      const hue = 120 - (i / bars.length) * 120
      const saturation = 100
      const lightness = 50 + normalizedValue * 10
      const gradient = ctx.createLinearGradient(0, y, 0, height - 10)
      gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`)
      gradient.addColorStop(1, `hsl(${Math.max(0, hue - 30)}, ${saturation}%, ${Math.max(30, lightness - 20)}%)`)

      ctx.fillStyle = gradient
      ctx.fillRect(x, y, barPixelWidth, barHeight)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.fillRect(x, y, barPixelWidth, 2)
    }

    const labelFreqs = [20, 100, 500, 1000, 5000, 10000, 20000]
    const sampleRate = getSampleRate()
    const nyquist = sampleRate / 2
    ctx.fillStyle = '#888'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    for (const freq of labelFreqs) {
      if (freq > nyquist) continue
      const logMin = Math.log10(MIN_FREQ)
      const logMax = Math.log10(Math.min(MAX_FREQ, nyquist))
      const pos = (Math.log10(freq) - logMin) / (logMax - logMin)
      const x = startX + pos * (width - 20)
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`
      ctx.fillText(label, x, height - 2)
    }
  }, [getFrequencyData, getSampleRate, spectrumSize, isPlaying])

  useEffect(() => {
    const render = () => {
      drawWaveform()
      drawSpectrum()
      animationRef.current = requestAnimationFrame(render)
    }
    animationRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animationRef.current)
  }, [drawWaveform, drawSpectrum])

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
      <div style={cardStyle}>
        <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>时域波形</div>
        <canvas
          ref={waveformCanvasRef}
          style={{
            width: `${waveformSize.width}px`,
            height: `${waveformSize.height}px`,
            display: 'block',
            borderRadius: '4px'
          }}
        />
      </div>
      <div style={cardStyle}>
        <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>频域频谱</div>
        <canvas
          ref={spectrumCanvasRef}
          style={{
            width: `${spectrumSize.width}px`,
            height: `${spectrumSize.height}px`,
            display: 'block',
            borderRadius: '4px'
          }}
        />
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#1a1a2e',
  borderRadius: '12px',
  border: '1px solid #333',
  padding: '12px',
  transition: 'all 0.2s ease'
}

export default Visualizer
