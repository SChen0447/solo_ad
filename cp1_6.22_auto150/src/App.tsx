import React, { useState, useEffect, useRef, useCallback } from 'react'
import { HandDetection, HandData } from './HandDetection'
import { AudioEngine } from './AudioEngine'
import InstrumentScene from './InstrumentScene'

const App: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [handData, setHandData] = useState<HandData[]>([])
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())
  const [showInstructions, setShowInstructions] = useState(true)
  
  const handDetectionRef = useRef<HandDetection | null>(null)
  const audioEngineRef = useRef<AudioEngine | null>(null)

  const handleNotePlay = useCallback((midi: number, velocity: number) => {
    setActiveNotes(prev => {
      const next = new Set(prev)
      next.add(midi)
      return next
    })
  }, [])

  const handleNoteStop = useCallback((midi: number) => {
    setActiveNotes(prev => {
      const next = new Set(prev)
      next.delete(midi)
      return next
    })
  }, [])

  const requestCameraPermission = useCallback(async () => {
    setIsLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      
      handDetectionRef.current = new HandDetection()
      audioEngineRef.current = new AudioEngine()
      
      await handDetectionRef.current.init((data: HandData[]) => {
        setHandData(data)
      })
      
      handDetectionRef.current.start()
      setShowInstructions(false)
    } catch (error) {
      console.error('Camera permission denied:', error)
      setHasPermission(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (handDetectionRef.current) {
        handDetectionRef.current.stop()
        handDetectionRef.current = null
      }
      if (audioEngineRef.current) {
        audioEngineRef.current.destroy()
        audioEngineRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.resume()
      }
    }
    
    window.addEventListener('click', handleFirstInteraction, { once: true })
    window.addEventListener('touchstart', handleFirstInteraction, { once: true })
    
    return () => {
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('touchstart', handleFirstInteraction)
    }
  }, [])

  const pianoKeys = ['C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
                     'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3']

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0a',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse at center, rgba(74, 222, 128, 0.05) 0%, transparent 50%), radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.03) 0%, transparent 40%)',
          pointerEvents: 'none'
        }}
      />

      <InstrumentScene
        handData={handData}
        audioEngine={audioEngineRef.current}
        onNotePlay={handleNotePlay}
        onNoteStop={handleNoteStop}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '28px',
              fontWeight: 600,
              color: '#ffffff',
              margin: 0,
              letterSpacing: '0.5px'
            }}
          >
            Gesture Piano
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.5)',
              margin: '4px 0 0 0',
              fontWeight: 300
            }}
          >
            手势钢琴 · 无触演奏
          </p>
        </div>

        {hasPermission && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '20px',
              border: '1px solid rgba(74, 222, 128, 0.3)'
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: handData.length > 0 ? '#4ade80' : '#f59e0b',
                animation: handData.length > 0 ? 'pulse 2s infinite' : 'none'
              }}
            />
            <span
              style={{
                fontSize: '13px',
                color: handData.length > 0 ? '#4ade80' : '#f59e0b',
                fontWeight: 500
              }}
            >
              {handData.length > 0 ? `检测到 ${handData.length} 只手` : '等待手势...'}
            </span>
          </div>
        )}
      </div>

      {showInstructions && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 10, 10, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(10px)'
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              padding: '48px',
              backgroundColor: 'rgba(20, 20, 20, 0.8)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '64px',
                marginBottom: '16px'
              }}
            >
              🎹
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '32px',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 12px 0'
              }}
            >
              欢迎体验手势钢琴
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.6',
                margin: '0 0 32px 0'
              }}
            >
              将手放在摄像头前，移动指尖悬停在琴键上方即可演奏。<br />
              无需接触，即可创造美妙的音乐。
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                marginBottom: '32px',
                textAlign: 'left'
              }}
            >
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>👆</div>
                <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: 500, marginBottom: '4px' }}>悬停按下</div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>指尖停留在琴键上150ms触发音符</div>
              </div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✋</div>
                <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: 500, marginBottom: '4px' }}>双手演奏</div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>支持同时检测两只手，最多10个音符</div>
              </div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔊</div>
                <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: 500, marginBottom: '4px' }}>力度感应</div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>指尖距离映射音量大小</div>
              </div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎹</div>
                <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: 500, marginBottom: '4px' }}>24键钢琴</div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>从C2到B3，两个完整八度</div>
              </div>
            </div>

            {hasPermission === false && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#f87171',
                  fontSize: '13px'
                }}
              >
                ⚠️ 摄像头权限被拒绝，请在浏览器设置中允许访问摄像头
              </div>
            )}

            <button
              onClick={requestCameraPermission}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#4ade80',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: isLoading ? 0.6 : 1,
                transform: isLoading ? 'scale(0.98)' : 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#22c55e'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#4ade80'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  正在启动...
                </span>
              ) : (
                '🎥 允许摄像头并开始演奏'
              )}
            </button>
          </div>
        </div>
      )}

      {hasPermission && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            padding: '12px 24px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 10
          }}
        >
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
            当前音符:
          </span>
          {activeNotes.size > 0 ? (
            Array.from(activeNotes).map(midi => {
              const noteIndex = midi - 48
              const noteName = pianoKeys[noteIndex] || midi.toString()
              return (
                <span
                  key={midi}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: 'rgba(74, 222, 128, 0.2)',
                    border: '1px solid rgba(74, 222, 128, 0.4)',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#4ade80',
                    minWidth: '40px',
                    textAlign: 'center'
                  }}
                >
                  {noteName}
                </span>
              )
            })
          ) : (
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.3)' }}>
              —
            </span>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default App
