import { useEffect, useRef, useState } from 'react'
import { GameLoop } from './gameLoop'
import { LevelManager, LevelData } from './levels'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<GameLoop | null>(null)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [gameState, setGameState] = useState<'playing' | 'victory'>('playing')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const levelData = LevelManager.generateLevel(currentLevel, canvas.width, canvas.height)
    const gameLoop = new GameLoop(canvas, levelData, {
      onVictory: () => setGameState('victory'),
      onLevelChange: (level) => setCurrentLevel(level),
    })
    gameLoopRef.current = gameLoop
    gameLoop.start()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      gameLoop.stop()
    }
  }, [])

  const handleNextLevel = () => {
    if (!gameLoopRef.current) return
    const nextLevel = currentLevel + 1
    setCurrentLevel(nextLevel)
    setGameState('playing')
    const canvas = canvasRef.current
    if (canvas) {
      const levelData = LevelManager.generateLevel(nextLevel, canvas.width, canvas.height)
      gameLoopRef.current.loadLevel(levelData)
    }
  }

  const handleRestart = () => {
    if (!gameLoopRef.current) return
    setGameState('playing')
    const canvas = canvasRef.current
    if (canvas) {
      const levelData = LevelManager.generateLevel(currentLevel, canvas.width, canvas.height)
      gameLoopRef.current.loadLevel(levelData)
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: 'none' }}
      />
      {gameState === 'victory' && (
        <VictoryOverlay
          onNext={handleNextLevel}
          onRestart={handleRestart}
          level={currentLevel}
        />
      )}
    </div>
  )
}

function VictoryOverlay({ onNext, onRestart, level }: { onNext: () => void; onRestart: () => void; level: number }) {
  const [textVisible, setTextVisible] = useState(false)
  const [buttonsVisible, setButtonsVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setTextVisible(true), 300)
    const t2 = setTimeout(() => setButtonsVisible(true), 1500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(10, 10, 30, 0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        fontSize: 'clamp(32px, 6vw, 72px)',
        fontWeight: 'bold',
        color: 'transparent',
        backgroundImage: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4, #6366f1)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        letterSpacing: '8px',
        opacity: textVisible ? 1 : 0,
        transform: textVisible ? 'scale(1)' : 'scale(0.8)',
        transition: 'all 0.8s ease-out',
        textShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <span>虚空缝合成功</span>
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          animation: textVisible ? 'scan 1.5s ease-out forwards' : 'none',
        }} />
      </div>
      <div style={{
        marginTop: 'clamp(20px, 4vh, 40px)',
        fontSize: 'clamp(14px, 2vw, 18px)',
        color: '#94a3b8',
        opacity: textVisible ? 1 : 0,
        transition: 'opacity 0.5s ease 0.5s',
      }}>
        第 {level} 关完成
      </div>
      <div style={{
        display: 'flex',
        gap: 'clamp(20px, 4vw, 40px)',
        marginTop: 'clamp(40px, 8vh, 80px)',
        opacity: buttonsVisible ? 1 : 0,
        transform: buttonsVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease-out',
      }}>
        <button
          onClick={onRestart}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.6), inset 0 0 20px rgba(251, 146, 60, 0.1)'
            e.currentTarget.style.borderColor = '#fb923c'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 10px rgba(251, 146, 60, 0.3)'
            e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.5)'
          }}
          style={{
            padding: 'clamp(12px, 2vh, 16px) clamp(24px, 4vw, 40px)',
            fontSize: 'clamp(14px, 1.8vw, 18px)',
            background: 'rgba(251, 146, 60, 0.1)',
            border: '2px solid rgba(251, 146, 60, 0.5)',
            color: '#fdba74',
            borderRadius: '8px',
            cursor: 'pointer',
            letterSpacing: '2px',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 10px rgba(251, 146, 60, 0.3)',
            fontFamily: 'inherit',
          }}
        >
          重新挑战
        </button>
        <button
          onClick={onNext}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.6), inset 0 0 20px rgba(99, 102, 241, 0.1)'
            e.currentTarget.style.borderColor = '#6366f1'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.3)'
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
          }}
          style={{
            padding: 'clamp(12px, 2vh, 16px) clamp(24px, 4vw, 40px)',
            fontSize: 'clamp(14px, 1.8vw, 18px)',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '2px solid rgba(99, 102, 241, 0.5)',
            color: '#a5b4fc',
            borderRadius: '8px',
            cursor: 'pointer',
            letterSpacing: '2px',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)',
            fontFamily: 'inherit',
          }}
        >
          下一关
        </button>
      </div>
      <style>{`
        @keyframes scan {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  )
}

export default App
