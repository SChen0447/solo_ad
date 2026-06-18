import React, { useEffect, useRef, useCallback, useState } from 'react'
import { AudioEngine } from './audioEngine'
import { SpectrumRenderer } from './spectrumRenderer'
import { useAppStore } from './store'
import { PlaybackBar } from './components/PlaybackBar'
import { ControlPanel } from './components/ControlPanel'

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioEngineRef = useRef<AudioEngine | null>(null)
  const rendererRef = useRef<SpectrumRenderer | null>(null)
  const animationRef = useRef<number | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)

  const {
    currentStyle,
    background,
    audio,
    setAudioState,
    setSpectrumData,
    exportProgress,
    setExporting,
    setExportProgress,
  } = useAppStore()

  useEffect(() => {
    const engine = new AudioEngine()
    audioEngineRef.current = engine

    engine.setVolume(audio.volume)

    engine.setOnTimeUpdate((currentTime, duration) => {
      setAudioState({ currentTime, duration })
    })

    engine.setOnEnded(() => {
      setAudioState({ isPlaying: false, currentTime: 0 })
    })

    return () => {
      engine.destroy()
      audioEngineRef.current = null
    }
  }, [])

  useEffect(() => {
    if (canvasRef.current) {
      const renderer = new SpectrumRenderer(canvasRef.current)
      rendererRef.current = renderer
      renderer.setStyle(currentStyle)

      const handleResize = () => {
        renderer.resize()
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setStyle(currentStyle)
    }
  }, [currentStyle])

  useEffect(() => {
    if (rendererRef.current && background.noiseEnabled) {
      rendererRef.current.setBackgroundNoise(background.noiseDensity)
    }
  }, [background.noiseDensity, background.noiseEnabled])

  useEffect(() => {
    const animate = () => {
      const engine = audioEngineRef.current
      const renderer = rendererRef.current

      if (engine && renderer) {
        const freqData = engine.getFrequencyData()
        setSpectrumData(freqData)
        renderer.render(freqData, background)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [background, setSpectrumData])

  const handleFileUpload = useCallback(
    async (file: File) => {
      const engine = audioEngineRef.current
      if (!engine) return

      try {
        const { duration, fileName, fileSize } = await engine.decodeAudioFile(file)
        setAudioState({
          fileName,
          fileSize,
          duration,
          currentTime: 0,
          isPlaying: false,
        })
      } catch (err) {
        console.error('音频解码失败:', err)
        alert('音频解码失败，请检查文件格式')
      }
    },
    [setAudioState]
  )

  const handleExport = useCallback(async () => {
    const renderer = rendererRef.current
    const engine = audioEngineRef.current
    if (!renderer) return

    setShowExportModal(true)
    setExporting(true)
    setExportProgress(0)

    const progressInterval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) return prev
        return prev + 10
      })
    }, 150)

    setTimeout(() => {
      let dataUrl: string
      if (engine && audio.fileName) {
        const freqData = engine.getFrequencyData()
        dataUrl = renderer.exportFrameWithSpectrum(freqData, background)
      } else {
        dataUrl = renderer.exportFrame(background)
      }

      const link = document.createElement('a')
      link.download = `wallpaper-${Date.now()}.png`
      link.href = dataUrl
      link.click()

      clearInterval(progressInterval)
      setExportProgress(100)

      setTimeout(() => {
        setExporting(false)
        setShowExportModal(false)
      }, 500)
    }, 300)
  }, [background, audio.fileName, setExporting, setExportProgress])

  const progressPercent = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0

  return (
    <div style={styles.app}>
      <div style={styles.mainContent}>
        <div style={styles.spectrumContainer}>
          <canvas ref={canvasRef} style={styles.canvas} />
          {!audio.fileName && (
            <div style={styles.placeholder}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <p style={styles.placeholderText}>上传音频文件开始可视化</p>
              <p style={styles.placeholderSubtext}>支持 MP3 / WAV 格式，最大 20MB</p>
            </div>
          )}
        </div>

        <div style={styles.playbackWrapper}>
          <PlaybackBar audioEngine={audioEngineRef} onFileUpload={handleFileUpload} />
        </div>
      </div>

      <ControlPanel onExport={handleExport} />

      {showExportModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalTitle}>导出壁纸</div>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${exportProgress}%` }} />
            </div>
            <div style={styles.progressText}>{exportProgress}%</div>
            {exportProgress >= 100 && (
              <div style={styles.successText}>导出完成！</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          background-color: #0a0a0f;
          font-family: system-ui, -apple-system, sans-serif;
          color: white;
        }
        #root {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: #2a2a35;
        }
        ::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        input[type="checkbox"]:checked + span {
          background-color: #7b2ff7 !important;
        }
        input[type="checkbox"]:checked + span::before {
          transform: translateX(16px);
        }
        button:hover {
          filter: brightness(1.1);
        }
        .play-btn:hover {
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0f',
    display: 'flex',
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 5%',
    position: 'relative',
    minWidth: 0,
  },
  spectrumContainer: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  canvas: {
    width: '100%',
    height: '100%',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  placeholder: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
  },
  placeholderText: {
    marginTop: '16px',
    fontSize: '18px',
    marginBottom: '8px',
  },
  placeholderSubtext: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.3)',
  },
  playbackWrapper: {
    display: 'flex',
    justifyContent: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#151520',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '32px',
    minWidth: '300px',
    textAlign: 'center',
    backdropFilter: 'blur(12px)',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '20px',
    color: 'white',
  },
  progressBarBg: {
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #7b2ff7, #ff006e)',
    borderRadius: '4px',
    transition: 'width 0.2s ease',
  },
  progressText: {
    marginTop: '12px',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  successText: {
    marginTop: '12px',
    fontSize: '14px',
    color: '#4ade80',
  },
}

export default App
