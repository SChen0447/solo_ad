import { useState, useEffect, useRef } from 'react'
import { useGameStore } from './store'
import { audioManager } from './AudioManager'

function Heart({ filled }: { filled: boolean }) {
  const [animating, setAnimating] = useState(false)
  const prevFilled = useRef(filled)

  useEffect(() => {
    if (prevFilled.current && !filled) {
      setAnimating(true)
      const t = setTimeout(() => setAnimating(false), 400)
      return () => clearTimeout(t)
    }
    prevFilled.current = filled
  }, [filled])

  const scale = animating ? 'scale(0.5)' : 'scale(1)'

  return (
    <svg
      className={`heart ${filled ? '' : 'lost'}`}
      viewBox="0 0 32 32"
      style={{ transform: scale, transition: 'transform 0.3s ease' }}
    >
      <defs>
        <linearGradient id={`heartGrad-${filled}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={filled ? '#ff6b9d' : '#444466'} />
          <stop offset="100%" stopColor={filled ? '#ff4466' : '#333344'} />
        </linearGradient>
      </defs>
      <path
        d="M16 28 C 6 22, 2 16, 4 11 C 5.5 7, 9 5, 12 6 C 14 6.5, 15.5 8, 16 10 C 16.5 8, 18 6.5, 20 6 C 23 5, 26.5 7, 28 11 C 30 16, 26 22, 16 28 Z"
        fill={`url(#heartGrad-${filled})`}
        stroke={filled ? '#ff88aa' : '#555577'}
        strokeWidth="1"
      />
      {filled && (
        <ellipse
          cx="11"
          cy="12"
          rx="2.5"
          ry="2"
          fill="#ffccdd"
          opacity="0.6"
        />
      )}
    </svg>
  )
}

function HealthBar() {
  const lives = useGameStore(state => state.lives)
  const maxLives = useGameStore(state => state.maxLives)

  return (
    <div className="hearts">
      {Array.from({ length: maxLives }).map((_, i) => (
        <Heart key={i} filled={i < lives} />
      ))}
    </div>
  )
}

function ProgressBar() {
  const activated = useGameStore(state => state.activatedRunes)
  const total = useGameStore(state => state.totalRunes)
  const percent = total > 0 ? (activated / total) * 100 : 0

  return (
    <div style={{ position: 'relative' }}>
      <div className="progress-container">
        <div
          className="progress-bar"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="progress-text">
        {activated} / {total} 符文已激活
      </div>
    </div>
  )
}

function BoostIndicator() {
  const isBoosting = useGameStore(state => state.isBoosting)
  const cooldown = useGameStore(state => state.boostCooldown)
  const boostActiveTime = useGameStore(state => state.boostActiveTime)

  const maxCooldown = 2
  const boostDuration = 0.5

  let pct = 0
  let text = '加速就绪'

  if (isBoosting) {
    pct = (boostActiveTime / boostDuration) * 100
    text = '加速中！'
  } else if (cooldown > 0) {
    pct = ((maxCooldown - cooldown) / maxCooldown) * 100
    text = `冷却 ${cooldown.toFixed(1)}s`
  } else {
    pct = 100
  }

  const ready = !isBoosting && cooldown <= 0

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 28,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 8,
      zIndex: 10
    }}>
      <div style={{
        fontSize: 14,
        color: ready ? '#ffd700' : '#8899bb',
        fontWeight: 'bold',
        textShadow: ready ? '0 0 10px rgba(255, 215, 0, 0.6)' : 'none',
        letterSpacing: 2
      }}>
        {text}
      </div>
      <div style={{
        width: 160,
        height: 14,
        background: 'rgba(20, 20, 50, 0.7)',
        border: '2px solid rgba(120, 140, 255, 0.5)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: isBoosting
            ? 'linear-gradient(90deg, #ffffff, #ffd700)'
            : ready
              ? 'linear-gradient(90deg, #ffd700, #ffaa00)'
              : 'linear-gradient(90deg, #4455aa, #6677cc)',
          borderRadius: 6,
          transition: 'width 0.1s ease',
          boxShadow: isBoosting
            ? '0 0 12px rgba(255, 215, 0, 0.9)'
            : ready
              ? '0 0 10px rgba(255, 170, 0, 0.6)'
              : 'none',
          opacity: ready ? 1 : 0.7
        }} />
      </div>
      <div style={{
        fontSize: 11,
        color: '#667799',
        letterSpacing: 1
      }}>
        空格键加速
      </div>
    </div>
  )
}

function DamageOverlay() {
  const damageFlash = useGameStore(state => state.damageFlash)
  const damageFlashTime = useGameStore(state => state.damageFlashTime)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (damageFlash) {
      setActive(true)
      const timer = setTimeout(() => {
        setActive(false)
        useGameStore.setState({ damageFlash: false })
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [damageFlash, damageFlashTime])

  return (
    <div className={`damage-overlay ${active ? 'active' : ''}`} />
  )
}

function VictoryParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phase = useGameStore(state => state.phase)

  useEffect(() => {
    if (phase !== 'victory') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      life: number
      maxLife: number
    }[] = []

    const colors = ['#ffd700', '#fff5a0', '#ffa500', '#ffed4e', '#ffcc00', '#ffffff']

    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 4 + Math.random() * 10
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 2 + Math.random() * 1.5
      })
    }

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 200,
        vx: (Math.random() - 0.5) * 2,
        vy: -(1 + Math.random() * 3),
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 2 + Math.random() * 2
      })
    }

    let raf: number
    const start = Date.now()

    const loop = () => {
      const elapsed = (Date.now() - start) / 1000
      ctx.fillStyle = 'rgba(10, 10, 30, 0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.life += 1 / 60
        if (p.life >= p.maxLife) return

        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.vx *= 0.99

        const t = p.life / p.maxLife
        const alpha = 1 - t
        const size = p.size * (1 - t * 0.5)

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 15

        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      if (elapsed < 4) {
        raf = requestAnimationFrame(loop)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [phase])

  return phase === 'victory' ? (
    <canvas ref={canvasRef} className="particles-canvas" />
  ) : null
}

function StartScreen() {
  const phase = useGameStore(state => state.phase)
  const startGame = useGameStore(state => state.startGame)

  if (phase !== 'start') return null

  const handleStart = () => {
    audioManager.init()
    startGame()
  }

  return (
    <div className="overlay-screen">
      <div className="game-title">符光掠影</div>
      <div className="game-subtitle">Glimmer of Runes</div>

      <div className="instruction">
        <p>
          <span className="key">W</span><span className="key">A</span>
          <span className="key">S</span><span className="key">D</span>
          &nbsp;控制光之符印飞行移动
        </p>
        <p>
          <span className="key">空格</span>
          &nbsp;短暂加速（持续0.5秒，冷却2秒）
        </p>
        <p style={{ marginTop: 16 }}>
          💎 碰撞能量符文以激活它们，点亮全部符文开启传送门
        </p>
        <p>
          👾 躲避从边缘袭来的黑暗阴影触手，避免被接触
        </p>
        <p>
          🌀 激活所有符文后，进入中央传送门即可通关
        </p>
      </div>

      <button className="btn-glow" onClick={handleStart}>
        开 始 探 索
      </button>
    </div>
  )
}

function VictoryScreen() {
  const phase = useGameStore(state => state.phase)
  const activated = useGameStore(state => state.activatedRunes)
  const resetGame = useGameStore(state => state.resetGame)
  const startGame = useGameStore(state => state.startGame)
  const lives = useGameStore(state => state.lives)

  if (phase !== 'victory') return null

  const handleRestart = () => {
    startGame()
  }

  const handleMenu = () => {
    resetGame()
  }

  return (
    <div className="overlay-screen" style={{ background: 'radial-gradient(ellipse at center, rgba(30, 20, 60, 0.75) 0%, rgba(10, 5, 30, 0.92) 100%)' }}>
      <VictoryParticles />

      <div className="victory-title">通 关 胜 利</div>
      <div className="victory-subtitle">✨ 符印之光已照亮殿堂 ✨</div>

      <div className="instruction" style={{ padding: '24px 48px' }}>
        <p style={{ fontSize: 18, textAlign: 'center', lineHeight: 2.5 }}>
          激活符文：<span style={{ color: '#ffd700', fontWeight: 'bold' }}>{activated}</span>
          &nbsp;&nbsp;/&nbsp;&nbsp; 总计：<span style={{ color: '#88aaff' }}>{activated}</span>
        </p>
        <p style={{ fontSize: 18, textAlign: 'center', lineHeight: 2.5 }}>
          剩余生命：
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ color: i < lives ? '#ff6b9d' : '#444466', fontSize: 20 }}>
              {i < lives ? '♥' : '♡'}
            </span>
          ))}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <button className="btn-glow" onClick={handleRestart}>
          再 玩 一 次
        </button>
        <button
          className="btn-glow"
          style={{
            background: 'linear-gradient(135deg, #6677cc, #4455aa)',
            color: '#ffffff'
          }}
          onClick={handleMenu}
        >
          返 回 主 菜 单
        </button>
      </div>
    </div>
  )
}

function GameOverScreen() {
  const phase = useGameStore(state => state.phase)
  const activated = useGameStore(state => state.activatedRunes)
  const total = useGameStore(state => state.totalRunes)
  const resetGame = useGameStore(state => state.resetGame)
  const startGame = useGameStore(state => state.startGame)

  if (phase !== 'gameover') return null

  const handleRestart = () => {
    audioManager.init()
    startGame()
  }

  const handleMenu = () => {
    resetGame()
  }

  return (
    <div className="overlay-screen">
      <div className="gameover-title">光 之 熄 灭</div>
      <div className="gameover-subtitle">符印被黑暗吞噬了……</div>

      <div className="instruction" style={{ padding: '24px 48px' }}>
        <p style={{ fontSize: 18, textAlign: 'center', lineHeight: 2.5 }}>
          已激活符文：<span style={{ color: '#ffd700', fontWeight: 'bold' }}>{activated}</span>
          &nbsp;&nbsp;/&nbsp;&nbsp; 总计：<span style={{ color: '#88aaff' }}>{total}</span>
        </p>
        <p style={{ fontSize: 16, textAlign: 'center', lineHeight: 2, color: '#aa8899' }}>
          进度 {Math.round((activated / total) * 100)}%
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <button className="btn-glow" onClick={handleRestart}>
          重 新 挑 战
        </button>
        <button
          className="btn-glow"
          style={{
            background: 'linear-gradient(135deg, #6677cc, #4455aa)',
            color: '#ffffff'
          }}
          onClick={handleMenu}
        >
          返 回 主 菜 单
        </button>
      </div>
    </div>
  )
}

export default function UIPanel() {
  const phase = useGameStore(state => state.phase)
  const showHUD = phase === 'playing' || phase === 'victory'

  return (
    <div className="ui-panel">
      {showHUD && (
        <>
          <div className="top-bar">
            <HealthBar />
            <ProgressBar />
          </div>
          <BoostIndicator />
          <DamageOverlay />
        </>
      )}
      <StartScreen />
      <VictoryScreen />
      <GameOverScreen />
    </div>
  )
}
