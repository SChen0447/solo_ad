import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine, type PlaybackInfo, type GainBand } from './AudioEngine'
import Visualizer, { type VisualizerType } from './Visualizer'
import Controls from './Controls'

export default function App() {
  const engineRef = useRef<AudioEngine | null>(null)
  const [effectType, setEffectType] = useState<VisualizerType>('bars')
  const [gains, setGains] = useState({ low: 0, mid: 0, high: 0 })
  const [playback, setPlayback] = useState<PlaybackInfo>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
  })
  const [, setEngineReady] = useState(0)

  useEffect(() => {
    const engine = new AudioEngine()
    engineRef.current = engine
    engine.setPlaybackCallback((info) => {
      setPlayback(info)
    })
    setEngineReady(1)
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      await engineRef.current?.loadAudioFile(file)
    } catch (e) {
      console.error('Failed to load audio:', e)
      alert('音频加载失败，请检查文件格式（支持 MP3 / WAV）')
    }
  }, [])

  const handlePlayPause = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    if (engine.isPlaying) {
      engine.pause()
    } else {
      engine.play()
    }
  }, [])

  const handleSeek = useCallback((time: number) => {
    engineRef.current?.seek(time)
  }, [])

  const handleGainChange = useCallback((band: GainBand, value: number) => {
    setGains((prev) => {
      const next = { ...prev, [band]: value }
      engineRef.current?.setGain(band, value)
      return next
    })
  }, [])

  const handleEffectChange = useCallback((type: VisualizerType) => {
    setEffectType(type)
  }, [])

  const appStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    minHeight: 680,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  }

  return (
    <div style={appStyle}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(167,139,250,0.06) 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Visualizer
        audioEngine={engineRef.current}
        effectType={effectType}
        gains={gains}
      />
      <Controls
        gains={gains}
        onGainChange={handleGainChange}
        onFileUpload={handleFileUpload}
        playback={playback}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        effectType={effectType}
        onEffectChange={handleEffectChange}
      />
    </div>
  )
}
