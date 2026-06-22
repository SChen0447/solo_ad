import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { useCountdown } from '../hooks/useCountdown'
import Guestbook from './Guestbook'
import './Postcard.css'

const Postcard: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { postcard, isLoading, loadPostcard, isUnlocked, setIsUnlocked } = useAppContext()
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [messageLines, setMessageLines] = useState<string[]>([])
  const animationStarted = useRef(false)

  useEffect(() => {
    if (id) {
      loadPostcard(id)
    }
  }, [id, loadPostcard])

  const countdown = useCountdown(
    postcard ? new Date(postcard.unlockDate) : new Date(Date.now() + 86400000)
  )

  useEffect(() => {
    if (countdown.isExpired && !isUnlocked && postcard) {
      setIsUnlocked(true)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [countdown.isExpired, isUnlocked, postcard, setIsUnlocked])

  useEffect(() => {
    if (isUnlocked && postcard) {
      const lines = parseMarkdown(postcard.message)
      setMessageLines(lines)
    }
  }, [isUnlocked, postcard])

  const parseMarkdown = (text: string): string[] => {
    return text.split('\n').filter(line => line.trim() !== '')
  }

  const renderMarkdownLine = (line: string, index: number) => {
    let processed = line
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>')
    processed = processed.replace(/`(.*?)`/g, '<code>$1</code>')
    
    if (processed.startsWith('### ')) {
      return <h3 key={index} dangerouslySetInnerHTML={{ __html: processed.slice(4) }} style={{ animationDelay: `${index * 0.3}s` }} />
    }
    if (processed.startsWith('## ')) {
      return <h2 key={index} dangerouslySetInnerHTML={{ __html: processed.slice(3) }} style={{ animationDelay: `${index * 0.3}s` }} />
    }
    if (processed.startsWith('# ')) {
      return <h1 key={index} dangerouslySetInnerHTML={{ __html: processed.slice(2) }} style={{ animationDelay: `${index * 0.3}s` }} />
    }
    
    return (
      <p 
        key={index} 
        className="message-line"
        dangerouslySetInnerHTML={{ __html: processed }}
        style={{ animationDelay: `${index * 0.3}s` }}
      />
    )
  }

  useEffect(() => {
    if (!showConfetti || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3']
    const confettiCount = 50
    const confetti: Array<{
      x: number
      y: number
      size: number
      color: string
      speedY: number
      speedX: number
      rotation: number
      rotationSpeed: number
      opacity: number
    }> = []

    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: 2 + Math.random() * 4,
        speedX: -1 + Math.random() * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: -0.1 + Math.random() * 0.2,
        opacity: 1
      })
    }

    let startTime = Date.now()
    let animationId: number

    const animate = () => {
      const elapsed = Date.now() - startTime
      const fadeStart = 3000
      const fadeDuration = 2000

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      confetti.forEach((c) => {
        c.y += c.speedY
        c.x += c.speedX
        c.rotation += c.rotationSpeed

        if (elapsed > fadeStart) {
          c.opacity = Math.max(0, 1 - (elapsed - fadeStart) / fadeDuration)
        }

        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate(c.rotation)
        ctx.fillStyle = c.color
        ctx.globalAlpha = c.opacity
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6)
        ctx.restore()
      })

      if (elapsed < 5000) {
        animationId = requestAnimationFrame(animate)
      }
    }

    if (!animationStarted.current) {
      animationStarted.current = true
      animationId = requestAnimationFrame(animate)
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [showConfetti])

  if (isLoading) {
    return (
      <div className="postcard-loading">
        <span className="loading-spinner-large"></span>
      </div>
    )
  }

  if (!postcard) {
    return (
      <div className="postcard-not-found">
        <h2>明信片不存在</h2>
        <p>请检查链接是否正确</p>
      </div>
    )
  }

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0')
  }

  return (
    <div className="postcard-page">
      {showConfetti && <canvas ref={canvasRef} className="confetti-canvas" />}
      
      <div className="postcard-wrapper">
        <div className={`postcard-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
          <div 
            className="postcard-image"
            style={{ backgroundImage: `url(${postcard.imageUrl})` }}
          >
            <div className="postcard-overlay"></div>
          </div>

          <div className="postcard-content">
            {!isUnlocked ? (
              <div className="countdown-container">
                <h2 className="countdown-title">距离解锁还有</h2>
                <div className="countdown-timer">
                  <div className="countdown-item">
                    <span className="countdown-number">{formatNumber(countdown.days)}</span>
                    <span className="countdown-label">天</span>
                  </div>
                  <span className="countdown-separator">:</span>
                  <div className="countdown-item">
                    <span className="countdown-number">{formatNumber(countdown.hours)}</span>
                    <span className="countdown-label">时</span>
                  </div>
                  <span className="countdown-separator">:</span>
                  <div className="countdown-item">
                    <span className="countdown-number">{formatNumber(countdown.minutes)}</span>
                    <span className="countdown-label">分</span>
                  </div>
                  <span className="countdown-separator">:</span>
                  <div className="countdown-item">
                    <span className="countdown-number">{formatNumber(countdown.seconds)}</span>
                    <span className="countdown-label">秒</span>
                  </div>
                </div>
                <p className="countdown-hint">时光正在流转，静静等待那一刻...</p>
              </div>
            ) : (
              <div className="message-container">
                <h2 className="message-title">💌 来自时光的祝福</h2>
                <div className="message-content">
                  {messageLines.map((line, index) => renderMarkdownLine(line, index))}
                </div>
              </div>
            )}
          </div>
        </div>

        {isUnlocked && postcard && (
          <Guestbook postcardId={postcard.id} />
        )}
      </div>
    </div>
  )
}

export default Postcard
