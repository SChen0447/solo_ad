import React, { useState, useEffect, useRef } from 'react'
import GameCanvas from './game/GameCanvas'
import EditorPanel from './editor/EditorPanel'
import { LevelData } from './types'

type Page = 'menu' | 'levels' | 'game' | 'editor' | 'stats'

interface GameStats {
  totalSteps: number
  totalObservations: number
  totalTime: number
  currentLevel: number
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('menu')
  const [levels, setLevels] = useState<LevelData[]>([])
  const [selectedLevel, setSelectedLevel] = useState<LevelData | null>(null)
  const [gameStats, setGameStats] = useState<GameStats>({
    totalSteps: 0,
    totalObservations: 0,
    totalTime: 0,
    currentLevel: 0,
  })
  const [loading, setLoading] = useState(true)
  const starsCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetchLevels()
  }, [])

  const fetchLevels = async () => {
    try {
      const response = await fetch('/api/levels')
      if (response.ok) {
        const data = await response.json()
        setLevels(data)
      }
    } catch (err) {
      console.error('加载关卡失败:', err)
      setLevels([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (page !== 'menu' && page !== 'levels') return

    const canvas = starsCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    interface Star {
      x: number
      y: number
      size: number
      baseAlpha: number
      phase: number
      speed: number
    }

    const stars: Star[] = []
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
      })
    }

    let animId: number
    let time = 0

    const animate = () => {
      time += 0.016
      ctx.fillStyle = '#0B0E17'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const star of stars) {
        const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase))
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fill()
      }

      animId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [page])

  const handleStartGame = (level: LevelData) => {
    setSelectedLevel(level)
    setPage('game')
    setGameStats({
      totalSteps: 0,
      totalObservations: 0,
      totalTime: 0,
      currentLevel: levels.findIndex(l => l.id === level.id),
    })
  }

  const handleWin = (stats: { steps: number; observations: number; time: number }) => {
    const nextLevelIndex = levels.findIndex(l => l.id === selectedLevel?.id) + 1
    const newStats = {
      totalSteps: gameStats.totalSteps + stats.steps,
      totalObservations: gameStats.totalObservations + stats.observations,
      totalTime: gameStats.totalTime + stats.time,
      currentLevel: nextLevelIndex,
    }
    setGameStats(newStats)

    if (nextLevelIndex >= 5 || nextLevelIndex >= levels.length) {
      setPage('stats')
    } else {
      setSelectedLevel(levels[nextLevelIndex])
      setPage('game')
    }
  }

  const renderStarsBackground = () => (
    <canvas
      ref={starsCanvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
      }}
    />
  )

  const renderMenu = () => (
    <div style={styles.menuContainer}>
      {renderStarsBackground()}
      <div style={styles.menuContent}>
        <h1 style={styles.gameTitle}>量子迷宫</h1>
        <p style={styles.gameSubtitle}>Quantum Maze</p>
        <p style={styles.gameDescription}>
          操控概率波，通过观测坍缩，找到通往出口的路径
        </p>
        <div style={styles.menuButtons}>
          <button
            style={styles.primaryButton}
            onClick={() => setPage('levels')}
          >
            开始游戏
          </button>
          <button
            style={styles.secondaryButton}
            onClick={() => setPage('editor')}
          >
            关卡编辑器
          </button>
        </div>
        <div style={styles.howToPlay}>
          <h3 style={styles.howToTitle}>游戏说明</h3>
          <ul style={styles.howToList}>
            <li>使用 <strong>方向键 / WASD</strong> 移动概率波</li>
            <li>按 <strong>空格键</strong> 执行观测，坍缩到概率最大位置</li>
            <li><span style={{ color: '#F59E0B' }}>橙色</span> 量子纠缠门：成对出现，进入一端传送到另一端</li>
            <li><span style={{ color: '#EF4444' }}>红色</span> 概率陷阱：使概率波扩散</li>
            <li><span style={{ color: '#10B981' }}>绿色</span> 观测站：放大查看概率分布</li>
          </ul>
        </div>
      </div>
    </div>
  )

  const renderLevelSelect = () => (
    <div style={styles.menuContainer}>
      {renderStarsBackground()}
      <div style={styles.levelSelectContent}>
        <button style={styles.backButton} onClick={() => setPage('menu')}>
          ← 返回主菜单
        </button>
        <h2 style={styles.levelSelectTitle}>选择关卡</h2>
        <div style={styles.levelGrid}>
          {loading ? (
            <p style={styles.loadingText}>加载中...</p>
          ) : (
            levels.slice(0, 5).map((level, index) => (
              <div
                key={level.id}
                style={styles.levelCard}
                onClick={() => handleStartGame(level)}
              >
                <div style={styles.levelNumber}>{index + 1}</div>
                <div style={styles.levelName}>{level.name}</div>
                <div style={styles.levelDifficulty}>
                  {'★'.repeat(level.difficulty)}
                  {'☆'.repeat(5 - level.difficulty)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  const renderStats = () => {
    const maxSteps = 500
    const maxObservations = 50
    const maxTime = 600

    const stepsProgress = Math.min(100, (gameStats.totalSteps / maxSteps) * 100)
    const obsProgress = Math.min(100, (gameStats.totalObservations / maxObservations) * 100)
    const timeProgress = Math.min(100, (gameStats.totalTime / maxTime) * 100)

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}分${secs}秒`
    }

    return (
      <div style={styles.menuContainer}>
        {renderStarsBackground()}
        <div style={styles.statsContainer}>
          <h1 style={styles.statsTitle}>🎉 通关成功！</h1>
          <p style={styles.statsSubtitle}>你完成了所有 5 个关卡</p>

          <div style={styles.statsCard}>
            <div style={styles.statItem}>
              <div style={styles.statLabel}>总步数</div>
              <div style={styles.statValue}>{gameStats.totalSteps}</div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${stepsProgress}%`,
                    background: `linear-gradient(90deg, #EF4444, #10B981)`,
                  }}
                />
              </div>
            </div>

            <div style={styles.statItem}>
              <div style={styles.statLabel}>观测次数</div>
              <div style={styles.statValue}>{gameStats.totalObservations}</div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${obsProgress}%`,
                    background: `linear-gradient(90deg, #EF4444, #10B981)`,
                  }}
                />
              </div>
            </div>

            <div style={styles.statItem}>
              <div style={styles.statLabel}>总用时</div>
              <div style={styles.statValue}>{formatTime(gameStats.totalTime)}</div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${timeProgress}%`,
                    background: `linear-gradient(90deg, #EF4444, #10B981)`,
                  }}
                />
              </div>
            </div>
          </div>

          <button
            style={styles.primaryButton}
            onClick={() => setPage('menu')}
          >
            返回主菜单
          </button>
        </div>
      </div>
    )
  }

  if (page === 'menu') return renderMenu()
  if (page === 'levels') return renderLevelSelect()
  if (page === 'stats') return renderStats()
  if (page === 'editor') return <EditorPanel onBack={() => setPage('menu')} />
  if (page === 'game' && selectedLevel) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#0B0E17' }}>
        <GameCanvas
          level={selectedLevel}
          onWin={handleWin}
          onBack={() => setPage('levels')}
        />
      </div>
    )
  }

  return null
}

const styles: Record<string, React.CSSProperties> = {
  menuContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  menuContent: {
    textAlign: 'center',
    zIndex: 1,
    maxWidth: '600px',
    padding: '40px',
  },
  gameTitle: {
    fontSize: '64px',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
    background: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  gameSubtitle: {
    fontSize: '24px',
    color: '#6B7280',
    margin: '8px 0 16px 0',
    letterSpacing: '4px',
  },
  gameDescription: {
    fontSize: '16px',
    color: '#9CA3AF',
    margin: '0 0 40px 0',
  },
  menuButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
    marginBottom: '40px',
  },
  primaryButton: {
    padding: '14px 40px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
    color: 'white',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
  },
  secondaryButton: {
    padding: '12px 32px',
    borderRadius: '8px',
    border: '1px solid #4B5563',
    background: 'transparent',
    color: '#D1D5DB',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  howToPlay: {
    textAlign: 'left',
    background: 'rgba(31, 41, 55, 0.6)',
    borderRadius: '12px',
    padding: '20px 24px',
    backdropFilter: 'blur(10px)',
  },
  howToTitle: {
    color: '#E5E7EB',
    fontSize: '16px',
    margin: '0 0 12px 0',
  },
  howToList: {
    color: '#9CA3AF',
    fontSize: '14px',
    margin: 0,
    paddingLeft: '20px',
    lineHeight: '2',
  },
  levelSelectContent: {
    zIndex: 1,
    width: '100%',
    maxWidth: '800px',
    padding: '40px',
  },
  backButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #4B5563',
    background: 'transparent',
    color: '#D1D5DB',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '24px',
  },
  levelSelectTitle: {
    color: '#fff',
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '0 0 32px 0',
  },
  levelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
  },
  levelCard: {
    background: 'rgba(31, 41, 55, 0.6)',
    borderRadius: '12px',
    padding: '24px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  levelNumber: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#60A5FA',
    marginBottom: '8px',
  },
  levelName: {
    color: '#E5E7EB',
    fontSize: '14px',
    marginBottom: '8px',
  },
  levelDifficulty: {
    color: '#F59E0B',
    fontSize: '14px',
  },
  loadingText: {
    color: '#9CA3AF',
    textAlign: 'center',
    gridColumn: '1 / -1',
  },
  statsContainer: {
    zIndex: 1,
    textAlign: 'center',
    maxWidth: '500px',
    padding: '40px',
  },
  statsTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#fff',
    margin: '0 0 8px 0',
  },
  statsSubtitle: {
    color: '#9CA3AF',
    fontSize: '18px',
    margin: '0 0 32px 0',
  },
  statsCard: {
    background: 'rgba(31, 41, 55, 0.8)',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '32px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
  },
  statItem: {
    marginBottom: '24px',
    textAlign: 'left',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: '14px',
    marginBottom: '8px',
  },
  statValue: {
    color: '#fff',
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#374151',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
}

export default App
