import React, { useState, useRef, useEffect, useCallback } from 'react'
import { AudioEngine } from './AudioEngine'
import { Visualizer } from './Visualizer'
import { EQPanel } from './EQPanel'

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const App: React.FC = () => {
  const audioEngineRef = useRef<AudioEngine>(new AudioEngine())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [fileName, setFileName] = useState('')
  const [volume, setVolume] = useState(0.7)
  const [gains, setGains] = useState<number[]>([0, 0, 0, 0, 0, 0])
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const engine = audioEngineRef.current
    engine.onTimeUpdate = (time) => {
      if (!isDraggingRef.current) {
        setCurrentTime(time)
      }
    }
    return () => {
      engine.cleanup()
    }
  }, [])

  useEffect(() => {
    audioEngineRef.current.setVolume(volume)
  }, [volume])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    try {
      await audioEngineRef.current.loadFile(file)
      setFileName(file.name)
      setDuration(audioEngineRef.current.duration)
      setIsPlaying(true)
      setGains([0, 0, 0, 0, 0, 0])
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件加载失败')
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const togglePlay = () => {
    const engine = audioEngineRef.current
    if (!engine.duration) return

    if (engine.isPlaying) {
      engine.pause()
      setIsPlaying(false)
    } else {
      engine.play()
      setIsPlaying(true)
    }
  }

  const handleGainChange = useCallback((bandIndex: number, gain: number) => {
    audioEngineRef.current.setBandGain(bandIndex, gain)
    setGains(prev => {
      const updated = [...prev]
      updated[bandIndex] = gain
      return updated
    })
  }, [])

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (!progressRef.current || !audioEngineRef.current.duration) return

    isDraggingRef.current = true
    const rect = progressRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percentage * duration
    setCurrentTime(newTime)
    audioEngineRef.current.seek(newTime)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !progressRef.current) return
      const moveRect = progressRef.current.getBoundingClientRect()
      const movePercentage = Math.max(0, Math.min(1, (moveEvent.clientX - moveRect.left) / moveRect.width))
      const moveTime = movePercentage * duration
      setCurrentTime(moveTime)
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (!progressRef.current) return
      const upRect = progressRef.current.getBoundingClientRect()
      const upPercentage = Math.max(0, Math.min(1, (upEvent.clientX - upRect.left) / upRect.width))
      const upTime = upPercentage * duration
      audioEngineRef.current.seek(upTime)
      setCurrentTime(upTime)
      isDraggingRef.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [duration])

  const handleProgressTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!progressRef.current || !audioEngineRef.current.duration) return

    isDraggingRef.current = true
    const touch = e.touches[0]
    const rect = progressRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    const newTime = percentage * duration
    setCurrentTime(newTime)
    audioEngineRef.current.seek(newTime)

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!isDraggingRef.current || !progressRef.current) return
      const moveTouch = moveEvent.touches[0]
      const moveRect = progressRef.current.getBoundingClientRect()
      const movePercentage = Math.max(0, Math.min(1, (moveTouch.clientX - moveRect.left) / moveRect.width))
      const moveTime = movePercentage * duration
      setCurrentTime(moveTime)
    }

    const handleTouchEnd = () => {
      isDraggingRef.current = false
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }, [duration])

  const engine = audioEngineRef.current

  return (
    <div style={appStyle}>
      <div style={topBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <button onClick={handleUploadClick} style={uploadBtnStyle}>
            📁 上传音频
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <span style={fileNameStyle} title={fileName}>
            {fileName || '请上传MP3或WAV文件（最大10MB）'}
          </span>
        </div>
        <div style={timeDisplayStyle}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {error && (
        <div style={errorStyle}>
          ⚠️ {error}
        </div>
      )}

      <div style={{
        ...mainContentStyle,
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        <div style={leftPanelStyle}>
          <Visualizer
            getTimeDomainData={() => engine.getTimeDomainData()}
            getFrequencyData={() => engine.getFrequencyData()}
            getSampleRate={() => engine.getSampleRate()}
            isPlaying={isPlaying}
          />
        </div>

        <div style={rightPanelStyle}>
          <EQPanel
            onGainChange={handleGainChange}
            gains={gains}
          />
        </div>
      </div>

      <div style={controlsContainerStyle}>
        <div style={progressContainerStyle}>
          <span style={timeLabelStyle}>{formatTime(currentTime)}</span>
          <div
            ref={progressRef}
            style={progressBarStyle}
            onMouseDown={handleProgressMouseDown}
            onTouchStart={handleProgressTouchStart}
          >
            <div
              style={{
                ...progressFillStyle,
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`
              }}
            />
            <div
              style={{
                ...progressThumbStyle,
                left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 6px)`
              }}
            />
          </div>
          <span style={timeLabelStyle}>{formatTime(duration)}</span>
        </div>

        <div style={bottomControlsStyle}>
          <button onClick={togglePlay} style={playBtnStyle} disabled={!duration}>
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div style={volumeControlStyle}>
            <span style={{ color: '#888', fontSize: '12px', marginRight: '8px' }}>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={volumeSliderStyle}
            />
            <span style={{ color: '#888', fontSize: '11px', marginLeft: '8px', width: '30px' }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const appStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: '#000000',
  color: '#ffffff',
  padding: '16px',
  gap: '16px',
  overflow: 'auto'
}

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '12px 20px',
  background: '#1a1a2e',
  borderRadius: '12px',
  border: '1px solid #333'
}

const uploadBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#1a73e8',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap'
}

const fileNameStyle: React.CSSProperties = {
  color: '#ddd',
  fontSize: '14px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}

const timeDisplayStyle: React.CSSProperties = {
  color: '#aaa',
  fontSize: '14px',
  fontFamily: 'monospace',
  whiteSpace: 'nowrap'
}

const errorStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(255, 23, 68, 0.1)',
  border: '1px solid #ff1744',
  borderRadius: '8px',
  color: '#ff5252',
  fontSize: '13px'
}

const mainContentStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  gap: '16px',
  minHeight: 0
}

const leftPanelStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 0
}

const rightPanelStyle: React.CSSProperties = {
  width: '420px',
  minWidth: '320px',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center'
}

const controlsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '16px 20px',
  background: '#1a1a2e',
  borderRadius: '12px',
  border: '1px solid #333'
}

const progressContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%'
}

const timeLabelStyle: React.CSSProperties = {
  color: '#888',
  fontSize: '12px',
  fontFamily: 'monospace',
  width: '45px',
  textAlign: 'center'
}

const progressBarStyle: React.CSSProperties = {
  flex: 1,
  height: '4px',
  background: '#444',
  borderRadius: '2px',
  position: 'relative',
  cursor: 'pointer',
  transition: 'height 0.2s ease'
}

const progressFillStyle: React.CSSProperties = {
  height: '100%',
  background: '#1a73e8',
  borderRadius: '2px',
  transition: 'width 0.05s linear'
}

const progressThumbStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  width: '12px',
  height: '12px',
  background: '#1a73e8',
  borderRadius: '50%',
  transform: 'translateY(-50%)',
  opacity: 0,
  transition: 'opacity 0.2s ease',
  pointerEvents: 'none'
}

const bottomControlsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '24px'
}

const playBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: '#1a73e8',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  paddingLeft: '3px'
}

const volumeControlStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center'
}

const volumeSliderStyle: React.CSSProperties = {
  width: '120px',
  height: '4px',
  background: '#444',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
  WebkitAppearance: 'none',
  appearance: 'none'
}

export default App
