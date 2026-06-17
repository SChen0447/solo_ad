import React, { useRef, useState, useCallback, useEffect } from 'react'
import { AudioAnalyzer } from './audioAnalyzer'

interface AudioControlsProps {
  analyzer: AudioAnalyzer | null
  onEnergyUpdate: (energy: { low: number; mid: number; high: number }) => void
}

interface PresetTrack {
  name: string
  url: string
}

const PRESET_TRACKS: PresetTrack[] = [
  { name: 'Demo 1 - Electronic Pulse', url: '' },
  { name: 'Demo 2 - Ambient Waves', url: '' },
  { name: 'Demo 3 - Beat Drop', url: '' },
]

export const AudioControls: React.FC<AudioControlsProps> = ({ analyzer, onEnergyUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [currentTrackName, setCurrentTrackName] = useState<string>('')
  const [showPanel, setShowPanel] = useState(true)

  useEffect(() => {
    if (!analyzer) return
    let animationId: number
    const animate = () => {
      const energy = analyzer.getBandEnergy()
      onEnergyUpdate(energy)
      animationId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animationId)
  }, [analyzer, onEnergyUpdate])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !analyzer) return
    setCurrentTrackName(file.name)
    await analyzer.loadFromFile(file)
    analyzer.play()
    setIsPlaying(true)
  }, [analyzer])

  const handlePlayPause = useCallback(() => {
    if (!analyzer) return
    if (isPlaying) {
      analyzer.pause()
      setIsPlaying(false)
    } else {
      analyzer.play()
      setIsPlaying(true)
    }
  }, [analyzer, isPlaying])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (analyzer) {
      analyzer.setVolume(v)
    }
  }, [analyzer])

  const handlePresetSelect = useCallback(async (track: PresetTrack) => {
    if (!analyzer || !track.url) {
      setCurrentTrackName(track.name + ' (Demo mode)')
      setIsPlaying(true)
      return
    }
  }, [analyzer])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <div style={toggleStyle} onMouseEnter={() => setShowPanel(true)}>
        <button
          style={toggleButtonStyle}
          onClick={() => setShowPanel(!showPanel)}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = pulseGlow)}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = baseGlow)}
        >
          {showPanel ? '▼' : '▲'}
        </button>
      </div>

      {showPanel && (
        <div
          style={panelStyle}
          onMouseLeave={() => setShowPanel(true)}
        >
          <div style={headerStyle}>
            <span style={titleStyle}>🎵 Audio Controls</span>
          </div>

          <div style={trackNameStyle}>
            {currentTrackName || 'No track loaded'}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          <div style={buttonRowStyle}>
            <button
              style={buttonStyle}
              onClick={handleUploadClick}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = pulseGlow)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = baseGlow)}
            >
              📁 Upload
            </button>

            <button
              style={{ ...buttonStyle, ...(isPlaying ? activeButtonStyle : {}) }}
              onClick={handlePlayPause}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = pulseGlow)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = baseGlow)}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
          </div>

          <div style={volumeContainerStyle}>
            <span style={labelStyle}>🔊 Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              style={sliderStyle}
            />
            <span style={valueStyle}>{Math.round(volume * 100)}%</span>
          </div>

          <div style={presetContainerStyle}>
            <span style={labelStyle}>🎶 Presets</span>
            <div style={presetRowStyle}>
              {PRESET_TRACKS.map((track, i) => (
                <button
                  key={i}
                  style={presetButtonStyle}
                  onClick={() => handlePresetSelect(track)}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = pulseGlow)}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = baseGlow)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const baseGlow = '0 0 8px rgba(100, 200, 255, 0.3)'
const pulseGlow = '0 0 20px rgba(100, 200, 255, 0.7), 0 0 40px rgba(100, 200, 255, 0.3)'

const toggleStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 100,
}

const toggleButtonStyle: React.CSSProperties = {
  background: 'rgba(20, 20, 30, 0.6)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(100, 200, 255, 0.4)',
  color: '#aaddff',
  padding: '6px 16px',
  borderRadius: '0 0 12px 12px',
  cursor: 'pointer',
  fontSize: '14px',
  boxShadow: baseGlow,
  transition: 'all 0.3s ease',
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '60px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(15, 15, 25, 0.55)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(100, 200, 255, 0.25)',
  borderRadius: '16px',
  padding: '20px 24px',
  zIndex: 99,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(100, 200, 255, 0.1)',
  minWidth: '320px',
  maxWidth: '92vw',
}

const headerStyle: React.CSSProperties = {
  marginBottom: '12px',
}

const titleStyle: React.CSSProperties = {
  color: '#cceeFF',
  fontSize: '16px',
  fontWeight: 600,
  textShadow: '0 0 10px rgba(100, 200, 255, 0.5)',
}

const trackNameStyle: React.CSSProperties = {
  color: '#88bbdd',
  fontSize: '13px',
  marginBottom: '16px',
  padding: '8px 12px',
  background: 'rgba(0, 0, 0, 0.3)',
  borderRadius: '8px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  marginBottom: '16px',
}

const buttonStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(40, 60, 100, 0.5)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(100, 200, 255, 0.3)',
  color: '#cceeFF',
  padding: '10px 16px',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  boxShadow: baseGlow,
  transition: 'all 0.3s ease',
}

const activeButtonStyle: React.CSSProperties = {
  background: 'rgba(100, 200, 255, 0.25)',
  borderColor: 'rgba(100, 200, 255, 0.7)',
}

const volumeContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '14px',
}

const labelStyle: React.CSSProperties = {
  color: '#aaddFF',
  fontSize: '13px',
  minWidth: '70px',
}

const sliderStyle: React.CSSProperties = {
  flex: 1,
  accentColor: '#66ccff',
  height: '4px',
  cursor: 'pointer',
}

const valueStyle: React.CSSProperties = {
  color: '#88bbdd',
  fontSize: '12px',
  minWidth: '40px',
  textAlign: 'right',
}

const presetContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const presetRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
}

const presetButtonStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  background: 'rgba(40, 60, 100, 0.5)',
  border: '1px solid rgba(100, 200, 255, 0.3)',
  color: '#cceeFF',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  boxShadow: baseGlow,
  transition: 'all 0.3s ease',
}
