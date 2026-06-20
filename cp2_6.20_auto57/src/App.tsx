import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ThemeSelector, { Theme, themes } from './story/ThemeSelector'
import { storyModule, LoadProgressCallback } from './story/StoryModule'
import { canvasModule } from './canvas/CanvasModule'

interface StoryRecord {
  id: string
  title: string
  content: string
  theme: string
  timestamp: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  baseX: number
  baseY: number
}

interface ToolbarState {
  visible: boolean
  x: number
  y: number
  text: string
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400
const PARTICLE_COUNT = 150
const HISTORY_KEY = 'story_history'
const MAX_HISTORY = 5

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 135, g: 206, b: 235 }
}

const App: React.FC = () => {
  const [storyText, setStoryText] = useState<string>('')
  const [displayedText, setDisplayedText] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true)
  const [modelProgress, setModelProgress] = useState<number>(0)
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const [selectedThemeId, setSelectedThemeId] = useState<string>('')
  const [userInput, setUserInput] = useState<string>('')
  const [history, setHistory] = useState<StoryRecord[]>([])
  const [toolbar, setToolbar] = useState<ToolbarState>({ visible: false, x: 0, y: 0, text: '' })
  const [speakingRange, setSpeakingRange] = useState<{ start: number; end: number } | null>(null)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [lastSceneUpdate, setLastSceneUpdate] = useState<number>(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement>(null)
  const storyPanelRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const animationRef = useRef<number>(0)
  const charAnimationRef = useRef<number>(0)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY)
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load history')
      }
    }
  }, [])

  const saveHistory = useCallback((record: StoryRecord): void => {
    setHistory(prev => {
      const newHistory = [record, ...prev].slice(0, MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
      return newHistory
    })
  }, [])

  useEffect(() => {
    const loadModel = async (): Promise<void> => {
      setIsLoadingModel(true)
      try {
        await storyModule.loadModel(((progress: number) => {
          setModelProgress(Math.round(progress * 100))
        }) as LoadProgressCallback)
      } catch (e) {
        console.error('Model load failed, using fallback')
      } finally {
        setIsLoadingModel(false)
        setModelProgress(100)
      }
    }
    loadModel()

    return () => {
      canvasModule.destroy()
    }
  }, [])

  useEffect(() => {
    if (canvasRef.current) {
      canvasModule.initialize(canvasRef.current, selectedThemeId || undefined)
    }
  }, [selectedThemeId])

  const initParticles = useCallback((width: number, height: number): void => {
    const particles: Particle[] = []
    const colorStart = hexToRgb('#87CEEB')
    const colorEnd = hexToRgb('#DDA0DD')

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const t = Math.random()
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 1.2 + 0.3,
        vy: (Math.random() - 0.5) * 1.2 + 0.3,
        size: 2 + Math.random() * 2,
        color: `rgba(${Math.round(lerp(colorStart.r, colorEnd.r, t))}, ${Math.round(lerp(colorStart.g, colorEnd.g, t))}, ${Math.round(lerp(colorStart.b, colorEnd.b, t))}, ${0.4 + Math.random() * 0.4})`
      })
    }
    particlesRef.current = particles
  }, [])

  useEffect(() => {
    const canvas = particleCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = (): void => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles(canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e: MouseEvent): void => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouse)

    const animate = (): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const { x: mx, y: my } = mouseRef.current

      particlesRef.current.forEach(p => {
        p.baseX += p.vx
        p.baseY += p.vy

        if (p.baseX < -10) p.baseX = canvas.width + 10
        if (p.baseX > canvas.width + 10) p.baseX = -10
        if (p.baseY < -10) p.baseY = canvas.height + 10
        if (p.baseY > canvas.height + 10) p.baseY = -10

        const dx = mx - p.baseX
        const dy = my - p.baseY
        const dist = Math.sqrt(dx * dx + dy * dy)
        let offsetX = 0
        let offsetY = 0

        if (dist < 200) {
          const force = (1 - dist / 200) * 20
          offsetX = (dx / dist) * force
          offsetY = (dy / dist) * force
        }

        p.x = lerp(p.x, p.baseX + offsetX, 0.08)
        p.y = lerp(p.y, p.baseY + offsetY, 0.08)

        ctx.beginPath()
        ctx.fillStyle = p.color
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
      cancelAnimationFrame(animationRef.current)
    }
  }, [initParticles])

  useEffect(() => {
    if (!displayedText || displayedText.length === 0) return
    const now = Date.now()
    if (now - lastSceneUpdate < 500) return

    const timer = setTimeout(() => {
      canvasModule.renderScene(canvasRef.current, displayedText, selectedThemeId || undefined)
      setLastSceneUpdate(now)
    }, 300)

    return () => clearTimeout(timer)
  }, [displayedText, selectedThemeId, lastSceneUpdate])

  useEffect(() => {
    const totalLength = storyText.length
    if (totalLength === 0) {
      setDisplayedText('')
      return
    }

    let currentIdx = displayedText.length
    if (currentIdx >= totalLength) return

    const animateChars = (): void => {
      if (currentIdx < totalLength) {
        currentIdx += 1
        setDisplayedText(storyText.slice(0, currentIdx))
        const expectedPercent = totalLength > 0 ? Math.min(100, Math.round((currentIdx / totalLength) * 100)) : 100
        setGenerationProgress(p => Math.max(p, expectedPercent))
        charAnimationRef.current = window.setTimeout(animateChars, 50)
      } else {
        setGenerationProgress(100)
      }
    }

    animateChars()

    return () => {
      clearTimeout(charAnimationRef.current)
    }
  }, [storyText])

  useEffect(() => {
    const handleSelectionChange = (): void => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
        setToolbar(prev => ({ ...prev, visible: false }))
        return
      }

      const range = selection.getRangeAt(0)
      const storyPanel = storyPanelRef.current
      if (!storyPanel || !storyPanel.contains(range.commonAncestorContainer)) {
        setToolbar(prev => ({ ...prev, visible: false }))
        return
      }

      const rect = range.getBoundingClientRect()
      setToolbar({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 45,
        text: selection.toString()
      })
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement
      if (toolbar.visible && !target.closest('.text-toolbar')) {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed) {
          setToolbar(prev => ({ ...prev, visible: false }))
        }
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [toolbar.visible])

  const handleGenerate = useCallback(async (): Promise<void> => {
    if (isGenerating || isLoadingModel) return

    const theme = themes.find(t => t.id === selectedThemeId)
    let prompt = userInput.trim()

    if (!prompt && !theme) return

    if (theme) {
      prompt = theme.prefix + prompt
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setStoryText('')
    setDisplayedText('')

    try {
      const result = await storyModule.generateStory(prompt, (partial: string) => {
        setStoryText(partial)
      }, 100)

      setTimeout(() => {
        const record: StoryRecord = {
          id: Date.now().toString(),
          title: (userInput.trim() || theme?.name || '故事').slice(0, 20),
          content: result,
          theme: selectedThemeId,
          timestamp: Date.now()
        }
        saveHistory(record)
      }, 1000)
    } catch (e) {
      console.error('Generation failed')
      setGenerationProgress(100)
    } finally {
      setIsGenerating(false)
      setTimeout(() => setGenerationProgress(0), 1000)
    }
  }, [isGenerating, isLoadingModel, selectedThemeId, userInput, saveHistory])

  const handleThemeSelect = useCallback((theme: Theme): void => {
    setSelectedThemeId(theme.id)
    if (!isLoadingModel && !isGenerating) {
      setTimeout(() => {
        handleGenerate()
      }, 300)
    }
  }, [isLoadingModel, isGenerating, handleGenerate])

  const handleLoadHistory = useCallback((record: StoryRecord): void => {
    setSelectedThemeId(record.theme)
    setStoryText(record.content)
    setGenerationProgress(100)
    setTimeout(() => setGenerationProgress(0), 1000)
  }, [])

  const handleCopy = useCallback((): void => {
    if (toolbar.text) {
      navigator.clipboard.writeText(toolbar.text).catch(() => {})
    }
    setToolbar(prev => ({ ...prev, visible: false }))
    window.getSelection()?.removeAllRanges()
  }, [toolbar.text])

  const handleSpeak = useCallback((): void => {
    if (!toolbar.text || typeof window.speechSynthesis === 'undefined') {
      setToolbar(prev => ({ ...prev, visible: false }))
      return
    }

    window.speechSynthesis.cancel()
    setSpeakingRange(null)

    const utterance = new SpeechSynthesisUtterance(toolbar.text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utteranceRef.current = utterance

    const fullText = displayedText
    const startIdx = fullText.indexOf(toolbar.text)
    if (startIdx >= 0) {
      setSpeakingRange({ start: startIdx, end: startIdx + toolbar.text.length })
    }

    utterance.onend = () => {
      setSpeakingRange(null)
    }
    utterance.onerror = () => {
      setSpeakingRange(null)
    }

    window.speechSynthesis.speak(utterance)
    setToolbar(prev => ({ ...prev, visible: false }))
    window.getSelection()?.removeAllRanges()
  }, [toolbar.text, displayedText])

  const handleStopSpeak = useCallback((): void => {
    if (typeof window.speechSynthesis !== 'undefined') {
      window.speechSynthesis.cancel()
    }
    setSpeakingRange(null)
  }, [])

  const formatTime = (ts: number): string => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const renderStoryText = useMemo(() => {
    if (!displayedText || !speakingRange) {
      return displayedText
    }

    const parts: React.ReactNode[] = []
    const { start, end } = speakingRange

    if (start > 0) {
      parts.push(<span key="pre">{displayedText.slice(0, start)}</span>)
    }

    parts.push(
      <span
        key="highlight"
        style={{
          backgroundColor: 'rgba(255, 235, 59, 0.4)',
          borderRadius: '3px',
          padding: '0 2px',
          transition: 'background-color 0.2s ease'
        }}
      >
        {displayedText.slice(start, end)}
      </span>
    )

    if (end < displayedText.length) {
      parts.push(<span key="post">{displayedText.slice(end)}</span>)
    }

    return parts
  }, [displayedText, speakingRange])

  const layoutStyle = isMobile
    ? { flexDirection: 'column' as const }
    : { flexDirection: 'row' as const }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      <canvas
        ref={particleCanvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, padding: isMobile ? '16px' : '32px' }}>
        <header style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: isMobile ? '28px' : '42px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6c63ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 30px rgba(108, 99, 255, 0.5)',
              animation: 'breathing 2s ease-in-out infinite',
              letterSpacing: '2px',
              marginBottom: '8px'
            }}
          >
            ✨ 交互式故事生成器
          </h1>
          <p style={{ color: '#a0a0c0', fontSize: '14px', marginTop: '8px' }}>
            选择主题或输入提示词，开启你的创作之旅
          </p>

          {isLoadingModel && (
            <div style={{
              marginTop: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(108, 99, 255, 0.15)',
              padding: '8px 20px',
              borderRadius: '20px',
              border: '1px solid rgba(108, 99, 255, 0.3)'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #6c63ff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.5s linear infinite'
              }} />
              <span style={{ color: '#c0c0ff', fontSize: '13px' }}>
                模型加载中... {modelProgress}%
              </span>
              <div style={{
                width: '80px',
                height: '4px',
                background: 'rgba(108, 99, 255, 0.2)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${modelProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #667eea, #764ba2)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </header>

        <section style={{ marginBottom: '32px' }}>
          <ThemeSelector
            onSelect={handleThemeSelect}
            selectedId={selectedThemeId}
          />
        </section>

        <div style={{
          display: 'flex',
          ...layoutStyle,
          gap: isMobile ? '16px' : '24px',
          maxWidth: '1400px',
          margin: '0 auto 32px',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          position: 'relative'
        }}>
          <div style={{
            flex: isMobile ? 'none' : '0 0 55%',
            width: isMobile ? '100%' : '55%',
            position: 'relative'
          }}>
            <div
              ref={storyPanelRef}
              style={{
                background: 'rgba(20, 20, 50, 0.5)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '12px',
                padding: '24px',
                minHeight: isMobile ? '250px' : '400px',
                maxHeight: '600px',
                overflowY: 'auto',
                border: '1px solid rgba(108, 99, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                userSelect: 'text',
                cursor: 'text'
              }}
            >
              {displayedText.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '300px',
                  color: '#6060a0',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                    {isLoadingModel ? '模型正在加载，请稍候...' : '选择一个主题或输入提示词开始生成故事'}
                  </p>
                  <p style={{ fontSize: '13px', opacity: 0.7 }}>
                    你的故事将逐字显示在这里
                  </p>
                </div>
              ) : (
                <div style={{
                  fontSize: '16px',
                  lineHeight: 2,
                  color: '#e0e0ff',
                  letterSpacing: '0.5px'
                }}>
                  {renderStoryText}
                  {isGenerating && (
                    <span style={{
                      display: 'inline-block',
                      width: '2px',
                      height: '1.2em',
                      backgroundColor: '#6c63ff',
                      marginLeft: '2px',
                      verticalAlign: 'text-bottom',
                      animation: 'blink 0.8s step-end infinite'
                    }} />
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{
            flex: isMobile ? 'none' : '0 0 40%',
            width: isMobile ? '100%' : '40%',
            position: 'sticky',
            top: '16px'
          }}>
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: `${CANVAS_WIDTH}px`,
              margin: '0 auto',
              aspectRatio: '2 / 1',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 0 30px rgba(108, 99, 255, 0.3), 0 0 0 2px rgba(108, 99, 255, 0.5)',
              border: '2px solid rgba(108, 99, 255, 0.5)'
            }}>
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  imageRendering: 'pixelated'
                }}
              />
            </div>
            <div style={{
              marginTop: '12px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#8080b0'
            }}>
              🖼️ 场景根据故事内容自动生成
            </div>
          </div>

          {!isMobile && history.length > 0 && (
            <div style={{
              width: '220px',
              flexShrink: 0,
              position: 'sticky',
              top: '16px'
            }}>
              <div style={{
                background: 'rgba(20, 20, 50, 0.5)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid rgba(108, 99, 255, 0.2)',
                maxHeight: '600px',
                overflowY: 'auto'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#c0c0ff',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  📚 历史记录
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {history.map(record => (
                    <div
                      key={record.id}
                      onClick={() => handleLoadHistory(record)}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(108, 99, 255, 0.08)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(108, 99, 255, 0.18)'
                        e.currentTarget.style.borderColor = 'rgba(108, 99, 255, 0.4)'
                        e.currentTarget.style.transform = 'translateX(4px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(108, 99, 255, 0.08)'
                        e.currentTarget.style.borderColor = 'transparent'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <div style={{
                        fontSize: '13px',
                        color: '#e0e0ff',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '4px'
                      }}>
                        {record.title}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#8080b0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>{themes.find(t => t.id === record.theme)?.name || '自定义'}</span>
                        <span>{formatTime(record.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {isMobile && history.length > 0 && (
          <div style={{
            maxWidth: '100%',
            margin: '0 auto 32px'
          }}>
            <div style={{
              background: 'rgba(20, 20, 50, 0.5)',
              backdropFilter: 'blur(16px)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(108, 99, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#c0c0ff',
                marginBottom: '12px'
              }}>📚 历史记录</h3>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {history.map(record => (
                  <div
                    key={record.id}
                    onClick={() => handleLoadHistory(record)}
                    style={{
                      minWidth: '140px',
                      padding: '10px',
                      background: 'rgba(108, 99, 255, 0.12)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      color: '#e0e0ff',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: '4px'
                    }}>
                      {record.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8080b0' }}>
                      {formatTime(record.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <section style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: isMobile ? '0' : '0 32px'
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{
              position: 'relative',
              flex: isMobile ? '1 1 100%' : '1 1 60%',
              minWidth: isMobile ? '100%' : '300px'
            }}>
              <input
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleGenerate()
                }}
                placeholder={selectedThemeId ? '输入提示词（可选）...' : '输入你的故事提示词...'}
                disabled={isGenerating || isLoadingModel}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  fontSize: '15px',
                  borderRadius: '8px',
                  background: 'rgba(30, 30, 60, 0.8)',
                  color: '#ffffff',
                  border: '2px solid rgba(60, 60, 140, 0.6)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#6c63ff'
                  e.target.style.boxShadow = '0 0 15px rgba(108, 99, 255, 0.3)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(60, 60, 140, 0.6)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || isLoadingModel || (!userInput.trim() && !selectedThemeId)}
              style={{
                position: 'relative',
                padding: '14px 32px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '8px',
                background: isGenerating || isLoadingModel
                  ? 'linear-gradient(135deg, #4a4a8a, #3a3a6a)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: isGenerating || isLoadingModel || (!userInput.trim() && !selectedThemeId)
                  ? 'not-allowed'
                  : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: (!userInput.trim() && !selectedThemeId) ? 0.5 : 1,
                minHeight: '48px'
              }}
              onMouseEnter={e => {
                if (!isGenerating && !isLoadingModel && userInput.trim() || selectedThemeId) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(108, 99, 255, 0.4)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {isGenerating && (
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 0.5s linear infinite'
                }} />
              )}
              {isGenerating ? '生成中...' : isLoadingModel ? '加载中...' : '✨ 生成故事'}
            </button>

            {speakingRange && (
              <button
                onClick={handleStopSpeak}
                style={{
                  padding: '14px 20px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.8)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: '48px'
                }}
              >
                ⏹ 停止朗读
              </button>
            )}
          </div>

          {(isGenerating || generationProgress > 0) && generationProgress < 100 && (
            <div style={{
              marginTop: '16px',
              width: '100%',
              maxWidth: '600px',
              margin: '16px auto 0'
            }}>
              <div style={{
                height: '6px',
                background: 'rgba(108, 99, 255, 0.15)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${generationProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #6c63ff 100%)',
                  transition: 'width 0.1s linear',
                  borderRadius: '3px',
                  boxShadow: '0 0 10px rgba(108, 99, 255, 0.5)'
                }} />
              </div>
              <div style={{
                textAlign: 'center',
                marginTop: '8px',
                fontSize: '12px',
                color: '#8080b0'
              }}>
                {generationProgress}%
              </div>
            </div>
          )}
        </section>
      </div>

      {toolbar.visible && (
        <div
          className="text-toolbar"
          style={{
            position: 'fixed',
            left: `${toolbar.x}px`,
            top: `${toolbar.y}px`,
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '4px',
            padding: '6px',
            background: 'rgba(30, 30, 60, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '6px',
            border: '1px solid rgba(108, 99, 255, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: 'transparent',
              color: '#e0e0ff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108, 99, 255, 0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            📋 复制
          </button>
          <button
            onClick={handleSpeak}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: 'transparent',
              color: '#e0e0ff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108, 99, 255, 0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            🔊 朗读
          </button>
        </div>
      )}

      <style>{`
        @keyframes breathing {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-5px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(20, 20, 50, 0.3);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(108, 99, 255, 0.4);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(108, 99, 255, 0.6);
        }
        input::placeholder {
          color: #606090;
        }
      `}</style>
    </div>
  )
}

export default App
