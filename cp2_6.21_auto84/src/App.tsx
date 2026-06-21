import { useState, useEffect, useCallback, useRef } from 'react'
import StarField from './StarField'
import Constellation from './Constellation'
import { CONSTELLATIONS, type ConstellationData } from './data/constellations'

export default function App() {
  const [currentLevel, setCurrentLevel] = useState(0)
  const [completedLevels, setCompletedLevels] = useState<boolean[]>(new Array(CONSTELLATIONS.length).fill(false))
  const [resetKey, setResetKey] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [lastScore, setLastScore] = useState(0)
  const [lastTime, setLastTime] = useState(0)
  const [resetPressed, setResetPressed] = useState(false)
  const timerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(performance.now())

  const constellation: ConstellationData = CONSTELLATIONS[currentLevel]

  const startTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    startTimeRef.current = performance.now()
    setElapsed(0)
    timerRef.current = window.setInterval(() => {
      setElapsed((performance.now() - startTimeRef.current) / 1000)
    }, 100)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    startTimer()
    return () => stopTimer()
  }, [currentLevel, resetKey, startTimer, stopTimer])

  const handleComplete = useCallback((score: number, usedTime: number) => {
    stopTimer()
    setCompletedLevels(prev => {
      const next = [...prev]
      next[currentLevel] = true
      return next
    })
    setDisplayScore(score)
    setLastScore(score)
    setLastTime(usedTime)
    setShowCompleteModal(true)
  }, [currentLevel, stopTimer])

  const handleNextLevel = useCallback(() => {
    setShowCompleteModal(false)
    if (currentLevel < CONSTELLATIONS.length - 1) {
      setCurrentLevel(prev => prev + 1)
      setResetKey(prev => prev + 1)
    } else {
      setCurrentLevel(0)
      setResetKey(prev => prev + 1)
      setCompletedLevels(new Array(CONSTELLATIONS.length).fill(false))
    }
  }, [currentLevel])

  const handleReset = useCallback(() => {
    setResetPressed(true)
    setTimeout(() => setResetPressed(false), 100)
    setResetKey(prev => prev + 1)
  }, [])

  const progressWidth = completedLevels.filter(Boolean).length / CONSTELLATIONS.length * 100

  return (
    <div style={styles.container}>
      <StarField
        starCount={250}
        minSize={2}
        maxSize={6}
        minOpacity={0.3}
        maxOpacity={1.0}
        minPulsePeriod={2000}
        maxPulsePeriod={4000}
      />

      <div style={styles.topBar}>
        <div style={styles.timeBox}>
          <span style={styles.timeLabel}>用时</span>
          <span style={styles.timeValue}>{elapsed.toFixed(1)}s</span>
        </div>
        <div style={styles.scoreBox}>
          <span style={styles.scoreLabel}>得分</span>
          <span style={styles.scoreValue}>{displayScore}</span>
        </div>
      </div>

      <div style={styles.mainArea}>
        <Constellation
          constellation={constellation}
          onComplete={handleComplete}
          resetKey={resetKey}
        />
      </div>

      <div style={styles.bottomBar}>
        <button
          style={{
            ...styles.resetButton,
            ...(resetPressed ? styles.resetButtonActive : {}),
          }}
          onClick={handleReset}
          onMouseEnter={e => (e.currentTarget.style.background = '#666666')}
          onMouseLeave={e => (e.currentTarget.style.background = '#444444')}
        >
          重置
        </button>

        <div style={styles.progressOuter}>
          <div
            style={{
              ...styles.progressInner,
              width: `${progressWidth}%`,
            }}
          />
          {CONSTELLATIONS.map((_, i) => {
            const isDone = completedLevels[i]
            const isCurrent = i === currentLevel
            return (
              <div
                key={`progress-dot-${i}`}
                onClick={() => {
                  if (isDone || i <= currentLevel) {
                    setCurrentLevel(i)
                    setResetKey(prev => prev + 1)
                  }
                }}
                style={{
                  ...styles.progressDot,
                  left: `${(i + 0.5) / CONSTELLATIONS.length * 100}%`,
                  background: isCurrent
                    ? '#00BFFF'
                    : isDone
                    ? '#8A2BE2'
                    : '#555555',
                  boxShadow: isCurrent
                    ? '0 0 8px #00BFFF, 0 0 16px rgba(0, 191, 255, 0.5)'
                    : isDone
                    ? '0 0 6px #8A2BE2'
                    : 'none',
                  cursor: isDone || i <= currentLevel ? 'pointer' : 'default',
                }}
              />
            )
          })}
        </div>

        <div style={styles.levelName}>
          第 {currentLevel + 1}/{CONSTELLATIONS.length} 关 · {constellation.name}
        </div>
      </div>

      {showCompleteModal && (
        <div style={styles.modalOverlay} onClick={handleNextLevel}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalTitle}>✨ 星座完成！✨</div>
            <div style={styles.modalConstellation}>{constellation.name}</div>
            <div style={styles.modalRow}>
              <span style={styles.modalLabel}>用时</span>
              <span style={styles.modalValue}>{lastTime.toFixed(2)} 秒</span>
            </div>
            <div style={styles.modalRow}>
              <span style={styles.modalLabel}>得分</span>
              <span style={{ ...styles.modalValue, color: '#FFD700' }}>{lastScore}</span>
            </div>
            <button
              style={styles.nextButton}
              onClick={handleNextLevel}
              onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #00BFFF 0%, #8A2BE2 100%)')}
            >
              {currentLevel < CONSTELLATIONS.length - 1 ? '下一关 →' : '重新开始 ♻'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: '320px',
  },
  topBar: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  timeBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '8px 16px',
    background: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '8px',
    border: '1px solid rgba(0, 191, 255, 0.3)',
    backdropFilter: 'blur(4px)',
    minWidth: '100px',
  },
  timeLabel: {
    fontSize: '12px',
    color: '#888888',
    letterSpacing: '1px',
  },
  timeValue: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#00BFFF',
    textShadow: '0 0 8px rgba(0, 191, 255, 0.6)',
    fontFamily: 'monospace',
  },
  scoreBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    padding: '8px 16px',
    background: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '8px',
    border: '1px solid rgba(138, 43, 226, 0.3)',
    backdropFilter: 'blur(4px)',
    minWidth: '100px',
  },
  scoreLabel: {
    fontSize: '12px',
    color: '#888888',
    letterSpacing: '1px',
  },
  scoreValue: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#FFD700',
    textShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
    fontFamily: 'monospace',
  },
  mainArea: {
    position: 'relative',
    zIndex: 5,
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  bottomBar: {
    position: 'relative',
    zIndex: 10,
    height: '60px',
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    gap: '16px',
    flexWrap: 'wrap',
    borderTop: '1px solid rgba(0, 191, 255, 0.15)',
  },
  resetButton: {
    width: '100px',
    height: '40px',
    borderRadius: '8px',
    background: '#444444',
    color: '#FFFFFF',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease',
    boxShadow: '0 0 0 rgba(0, 191, 255, 0)',
  },
  resetButtonActive: {
    transform: 'scale(0.95)',
    boxShadow: '0 0 12px rgba(0, 191, 255, 0.4)',
  },
  progressOuter: {
    position: 'relative',
    flex: 1,
    maxWidth: '300px',
    minWidth: '150px',
    height: '6px',
    borderRadius: '3px',
    background: '#333333',
    overflow: 'visible',
  },
  progressInner: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, #00BFFF 0%, #8A2BE2 100%)',
    transition: 'width 0.5s ease',
    boxShadow: '0 0 8px rgba(0, 191, 255, 0.5)',
  },
  progressDot: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid #1F2833',
    transition: 'all 0.3s ease',
    zIndex: 2,
  },
  levelName: {
    fontSize: '16px',
    color: '#E0E0E0',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    textShadow: '0 0 6px rgba(0, 191, 255, 0.3)',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.3s ease',
  },
  modalContent: {
    background: 'linear-gradient(135deg, rgba(31, 40, 51, 0.95) 0%, rgba(11, 12, 16, 0.98) 100%)',
    border: '1px solid rgba(0, 191, 255, 0.4)',
    borderRadius: '16px',
    padding: '32px 40px',
    minWidth: '280px',
    maxWidth: '90%',
    boxShadow: '0 0 40px rgba(0, 191, 255, 0.3), 0 0 80px rgba(138, 43, 226, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
    textShadow: '0 0 16px rgba(0, 191, 255, 0.8)',
    marginBottom: '4px',
  },
  modalConstellation: {
    fontSize: '20px',
    textAlign: 'center',
    color: '#8A2BE2',
    fontWeight: 600,
    marginBottom: '8px',
    textShadow: '0 0 10px rgba(138, 43, 226, 0.6)',
  },
  modalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  modalLabel: {
    fontSize: '14px',
    color: '#888888',
  },
  modalValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#00BFFF',
    fontFamily: 'monospace',
  },
  nextButton: {
    marginTop: '12px',
    height: '44px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 600,
    color: '#FFFFFF',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #00BFFF 0%, #8A2BE2 100%)',
    boxShadow: '0 4px 20px rgba(0, 191, 255, 0.4)',
    transition: 'all 0.2s ease',
  },
}
