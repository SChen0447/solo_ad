import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AudioAnalyzer } from './audioAnalyzer'
import { WaveformVisualizer, EnvelopeEditor } from './waveformVisualizer'
import PlayerControls from './playerControls'
import EditorPanel from './editorPanel'
import type { TimeMarker, EnvelopePoint, FrequencyData } from './types'

const generateId = () => Math.random().toString(36).substring(2, 11)

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markers, setMarkers] = useState<TimeMarker[]>([])
  const [envelopePoints, setEnvelopePoints] = useState<EnvelopePoint[]>([])
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobilePanel, setShowMobilePanel] = useState(false)

  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const envelopeCanvasRef = useRef<HTMLCanvasElement>(null)
  const waveformVisualizerRef = useRef<WaveformVisualizer | null>(null)
  const envelopeEditorRef = useRef<EnvelopeEditor | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastEnvelopeVolumeRef = useRef<number>(1)
  const frequencyDataRef = useRef<FrequencyData | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    audioAnalyzerRef.current = new AudioAnalyzer()
    audioAnalyzerRef.current.setFrequencyCallback((data) => {
      frequencyDataRef.current = data
    })
    return () => {
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.cleanup()
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (waveformCanvasRef.current) {
      waveformVisualizerRef.current = new WaveformVisualizer(waveformCanvasRef.current)
      setupWaveformCallbacks()
    }
    if (envelopeCanvasRef.current) {
      envelopeEditorRef.current = new EnvelopeEditor(envelopeCanvasRef.current)
      setupEnvelopeCallbacks()
    }
    return () => {
      if (waveformVisualizerRef.current) {
        waveformVisualizerRef.current.destroy()
      }
      if (envelopeEditorRef.current) {
        envelopeEditorRef.current.destroy()
      }
    }
  }, [])

  const setupWaveformCallbacks = () => {
    const viz = waveformVisualizerRef.current
    if (!viz) return
    viz.setClickCallback((time, _labelX) => {
      const newMarker: TimeMarker = {
        id: generateId(),
        time,
        label: `标记 ${markers.length + 1}`,
      }
      setMarkers((prev) => [...prev, newMarker])
      setEditingMarkerId(newMarker.id)
      setTimeout(() => {
        viz.setEditingMarker(newMarker.id, newMarker.label)
      }, 0)
    })
    viz.setLabelDoubleClickCallback((id) => {
      const marker = markers.find((m) => m.id === id)
      if (marker) {
        setEditingMarkerId(id)
        viz.setEditingMarker(id, marker.label)
      }
    })
    viz.setLabelSubmitCallback((id, newLabel) => {
      setMarkers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, label: newLabel } : m))
      )
      setEditingMarkerId(null)
      viz.setEditingMarker(null)
    })
    viz.setMarkerClickCallback((id) => {
      const marker = markers.find((m) => m.id === id)
      if (marker) {
        handleSeek(marker.time)
      }
    })
  }

  const setupEnvelopeCallbacks = () => {
    const env = envelopeEditorRef.current
    if (!env) return
    env.setAddPointCallback((time, volume) => {
      if (envelopePoints.length >= 10) return
      const newPoint: EnvelopePoint = {
        id: generateId(),
        time,
        volume,
      }
      setEnvelopePoints((prev) => [...prev, newPoint])
    })
    env.setUpdatePointCallback((id, time, volume) => {
      setEnvelopePoints((prev) =>
        prev.map((p) => (p.id === id ? { ...p, time, volume } : p))
      )
    })
  }

  const renderLoop = useCallback(() => {
    const viz = waveformVisualizerRef.current
    const env = envelopeEditorRef.current
    const analyzer = audioAnalyzerRef.current
    if (analyzer) {
      const t = analyzer.getCurrentTime()
      setCurrentTime(t)
      if (viz) viz.setCurrentTime(t)
      if (env) env.setCurrentTime(t)
      if (env && duration > 0) {
        const vol = env.getInterpolatedVolume(t)
        if (Math.abs(vol - lastEnvelopeVolumeRef.current) > 0.005) {
          lastEnvelopeVolumeRef.current = vol
          analyzer.setVolume(vol)
        }
      }
      const playing = analyzer.getIsPlaying()
      if (playing !== isPlaying) {
        setIsPlaying(playing)
      }
    }
    if (viz) {
      if (frequencyDataRef.current) {
        viz.setFrequencyData(frequencyDataRef.current)
      }
      viz.render()
    }
    if (env) env.render()
    rafIdRef.current = requestAnimationFrame(renderLoop)
  }, [isPlaying, duration])

  useEffect(() => {
    rafIdRef.current = requestAnimationFrame(renderLoop)
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [renderLoop])

  useEffect(() => {
    const handleResize = () => {
      if (waveformVisualizerRef.current) {
        waveformVisualizerRef.current.resize()
      }
      if (envelopeEditorRef.current) {
        envelopeEditorRef.current.resize()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleFileUpload = async (file: File) => {
    setError(null)
    if (!file.name.match(/\.(mp3|wav)$/i)) {
      setError('仅支持 MP3 和 WAV 格式的音频文件')
      return
    }
    setIsLoading(true)
    setFileName(file.name)
    try {
      if (audioAnalyzerRef.current) {
        const info = await audioAnalyzerRef.current.decodeAudioFile(file)
        setDuration(info.duration)
        setCurrentTime(0)
        setIsPlaying(false)
        setMarkers([])
        setEnvelopePoints([])
        const waveData = audioAnalyzerRef.current.getWaveformData(800)
        if (waveformVisualizerRef.current) {
          waveformVisualizerRef.current.setStaticWaveform(waveData)
          waveformVisualizerRef.current.setDuration(info.duration)
          waveformVisualizerRef.current.setCurrentTime(0)
        }
        if (envelopeEditorRef.current) {
          envelopeEditorRef.current.setDuration(info.duration)
          envelopeEditorRef.current.setCurrentTime(0)
        }
      }
    } catch (err) {
      setError('音频文件解码失败，请尝试其他文件')
      setFileName(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingFile(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handlePlayPause = () => {
    if (!audioAnalyzerRef.current || !fileName) return
    if (isPlaying) {
      audioAnalyzerRef.current.pause()
      setIsPlaying(false)
    } else {
      audioAnalyzerRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (time: number) => {
    if (!audioAnalyzerRef.current) return
    audioAnalyzerRef.current.seek(time)
    setCurrentTime(time)
  }

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate)
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.setPlaybackRate(rate)
    }
  }

  const handleMarkerDelete = (id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id))
  }

  const handleEnvelopePointDelete = (id: string) => {
    setEnvelopePoints((prev) => prev.filter((p) => p.id !== id))
  }

  const handleJumpToMarker = (id: string) => {
    const marker = markers.find((m) => m.id === id)
    if (marker) {
      handleSeek(marker.time)
    }
  }

  useEffect(() => {
    if (waveformVisualizerRef.current) {
      waveformVisualizerRef.current.setMarkers(markers)
      waveformVisualizerRef.current.setEditingMarker(
        editingMarkerId,
        markers.find((m) => m.id === editingMarkerId)?.label
      )
    }
  }, [markers, editingMarkerId])

  useEffect(() => {
    if (envelopeEditorRef.current) {
      envelopeEditorRef.current.setPoints(envelopePoints)
    }
  }, [envelopePoints])

  const hasAudio = fileName !== null

  return (
    <div style={styles.appContainer}>
      <div style={styles.mainLayout}>
        <div style={styles.leftPanel}>
          {!hasAudio ? (
            <div
              style={{
                ...styles.uploadArea,
                borderColor: isDraggingFile ? '#6C63FF' : '#6C63FF',
                background: isDraggingFile ? 'rgba(108, 99, 255, 0.1)' : 'transparent',
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDraggingFile(true)
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                style={styles.hiddenInput}
                onChange={handleFileInputChange}
              />
              {isLoading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner} />
                  <div style={styles.loadingText}>正在解码音频文件...</div>
                </div>
              ) : (
                <>
                  <div style={styles.uploadIcon}>🎵</div>
                  <div style={styles.uploadTitle}>上传音频文件</div>
                  <div style={styles.uploadSubtitle}>支持 MP3、WAV 格式，10MB 以内约 3 秒完成</div>
                  <div style={styles.uploadHint}>点击或拖拽文件到此处</div>
                  {error && <div style={styles.errorText}>{error}</div>}
                </>
              )}
            </div>
          ) : (
            <div
              style={styles.editorArea}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDraggingFile(true)
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                style={styles.hiddenInput}
                onChange={handleFileInputChange}
              />
              <div style={styles.headerBar}>
                <div style={styles.fileInfo}>
                  <span style={styles.fileIcon}>🎧</span>
                  <span style={styles.fileName} title={fileName!}>{fileName}</span>
                </div>
                <button
                  style={styles.changeFileButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  更换文件
                </button>
              </div>

              <div style={styles.visualizerContainer}>
                <canvas
                  ref={waveformCanvasRef}
                  style={styles.waveformCanvas}
                />
                {isDraggingFile && (
                  <div style={styles.dragOverlay}>
                    <div style={styles.dragOverlayText}>松开以上传新文件</div>
                  </div>
                )}
              </div>

              <div style={styles.envelopeContainer}>
                <div style={styles.envelopeLabel}>音量包络线</div>
                <canvas
                  ref={envelopeCanvasRef}
                  style={styles.envelopeCanvas}
                />
              </div>

              <PlayerControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                playbackRate={playbackRate}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onRateChange={handleRateChange}
              />
            </div>
          )}
        </div>

        {!isMobile && (
          <div style={styles.divider} />
        )}

        {!isMobile && (
          <div style={styles.rightPanel}>
            <EditorPanel
              markers={markers}
              envelopePoints={envelopePoints}
              duration={duration}
              onMarkerClick={() => {}}
              onMarkerDelete={handleMarkerDelete}
              onEnvelopePointDelete={handleEnvelopePointDelete}
              onJumpToMarker={handleJumpToMarker}
            />
          </div>
        )}
      </div>

      {isMobile && (
        <>
          {showMobilePanel && (
            <div style={styles.mobilePanelOverlay} onClick={() => setShowMobilePanel(false)} />
          )}
          <div
            style={{
              ...styles.mobilePanel,
              transform: showMobilePanel ? 'translateY(0)' : 'translateY(100%)',
            }}
          >
            <div style={styles.mobilePanelHandle} />
            <div style={{ height: 'calc(100% - 30px)', overflow: 'auto' }}>
              <EditorPanel
                markers={markers}
                envelopePoints={envelopePoints}
                duration={duration}
                onMarkerClick={() => {}}
                onMarkerDelete={handleMarkerDelete}
                onEnvelopePointDelete={handleEnvelopePointDelete}
                onJumpToMarker={(id) => {
                  handleJumpToMarker(id)
                  setShowMobilePanel(false)
                }}
              />
            </div>
          </div>
          <button
            style={{
              ...styles.mobileToggleButton,
              background: showMobilePanel ? '#8B82FF' : '#6C63FF',
            }}
            onClick={() => setShowMobilePanel(!showMobilePanel)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              style={{
                transform: showMobilePanel ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-out',
              }}
            >
              <path
                d="M4 7L9 12L14 7"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    background: '#1A1A2E',
    overflow: 'hidden',
    position: 'relative',
  },
  mainLayout: {
    display: 'flex',
    width: '100%',
    height: '100%',
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    padding: 20,
    gap: 16,
  },
  divider: {
    width: 2,
    background: '#3D3D5C',
    flexShrink: 0,
  },
  rightPanel: {
    width: 320,
    flexShrink: 0,
    background: '#252540',
    overflow: 'hidden',
  },
  uploadArea: {
    flex: 1,
    border: '2px dashed #6C63FF',
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    padding: 40,
    minHeight: 400,
  },
  uploadIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  uploadTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#A0A0B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadHint: {
    fontSize: 13,
    color: '#6C63FF',
    marginTop: 16,
    padding: '8px 20px',
    border: '1px solid #6C63FF',
    borderRadius: 20,
    transition: 'all 0.2s ease-out',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  spinner: {
    width: 48,
    height: 48,
    border: '3px solid #2D2D44',
    borderTopColor: '#6C63FF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: 16,
    color: '#A0A0B8',
  },
  errorText: {
    marginTop: 20,
    fontSize: 13,
    color: '#FF6584',
    padding: '8px 16px',
    background: 'rgba(255, 101, 132, 0.1)',
    borderRadius: 6,
  },
  hiddenInput: {
    display: 'none',
  },
  editorArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minHeight: 0,
    position: 'relative',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: '#252540',
    borderRadius: 12,
    border: '1px solid #3D3D5C',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  fileIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  fileName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  changeFileButton: {
    padding: '6px 16px',
    fontSize: 12,
    color: '#FFFFFF',
    background: '#6C63FF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background 0.2s ease-out',
    flexShrink: 0,
  },
  visualizerContainer: {
    flex: 1,
    minHeight: 320,
    background: '#252540',
    borderRadius: 12,
    border: '1px solid #3D3D5C',
    position: 'relative',
    overflow: 'hidden',
  },
  waveformCanvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  dragOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(108, 99, 255, 0.15)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dragOverlayText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 500,
    padding: '12px 32px',
    background: 'rgba(108, 99, 255, 0.9)',
    borderRadius: 8,
  },
  envelopeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  envelopeLabel: {
    fontSize: 13,
    color: '#A0A0B8',
    padding: '0 4px',
  },
  envelopeCanvas: {
    width: '100%',
    height: 60,
    display: 'block',
    borderRadius: 8,
    cursor: 'crosshair',
  },
  mobilePanelOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  mobilePanel: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60vh',
    background: '#252540',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 999,
    transition: 'transform 0.3s ease-out',
    boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.3)',
  },
  mobilePanelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: '#3D3D5C',
    margin: '14px auto 0',
  },
  mobileToggleButton: {
    position: 'fixed',
    right: 20,
    bottom: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(108, 99, 255, 0.4)',
    transition: 'all 0.2s ease-out',
    zIndex: 1000,
  },
}

export default App
