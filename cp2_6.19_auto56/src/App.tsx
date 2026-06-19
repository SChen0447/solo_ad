import React, { useState, useEffect, useRef, useCallback } from 'react'
import AuthScreen from './components/AuthScreen'
import ControlPanel from './components/ControlPanel'
import WordCloudCanvas from './components/WordCloudCanvas'
import KeywordInput from './components/KeywordInput'
import { roomManager } from './modules/room/RoomManager'
import { wordCloudEngine } from './modules/wordcloud/WordCloudEngine'
import { wordCloudRenderer } from './modules/wordcloud/WordCloudRenderer'
import { themeList, getTheme } from './theme/themes'
import type { User, KeywordWeight, ThemeId, KeywordMessage, WordCloudCanvasHandle, Theme } from './types'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
}

function lerpColor(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1)
  const b = hexToRgb(c2)
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t)
}

interface CssVars {
  '--primary': string
  '--primary-light': string
  '--background': string
  '--canvas-bg': string
  '--text': string
  '--text-secondary': string
  '--border': string
}

function themeToCssVars(theme: Theme): CssVars {
  return {
    '--primary': theme.primary,
    '--primary-light': theme.primary + '80',
    '--background': theme.background,
    '--canvas-bg': theme.canvasBackground,
    '--text': theme.id === 'dark' ? '#e2e8f0' : '#1e293b',
    '--text-secondary': theme.id === 'dark' ? '#94a3b8' : '#64748b',
    '--border': theme.id === 'dark' ? '#3f3f5a' : '#e2e8f0'
  }
}

const THEME_TRANSITION_DURATION = 400

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [roomId, setRoomId] = useState<string>('')
  const [onlineCount, setOnlineCount] = useState(0)
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('ocean')
  const [authError, setAuthError] = useState<string>('')
  const [keywords, setKeywords] = useState<KeywordWeight[]>([])
  const canvasRef = useRef<WordCloudCanvasHandle>(null)
  const previousWeightsRef = useRef<Map<string, number>>(new Map())
  const themeTransitionRef = useRef<number | null>(null)
  const currentCssVarsRef = useRef<CssVars>(themeToCssVars(getTheme('ocean')))

  const theme = getTheme(selectedThemeId)

  const applyCssVars = useCallback((vars: CssVars) => {
    const root = document.documentElement
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value)
    }
  }, [])

  const animateThemeTransition = useCallback((fromTheme: Theme, toTheme: Theme) => {
    if (themeTransitionRef.current) {
      cancelAnimationFrame(themeTransitionRef.current)
    }

    const fromVars = themeToCssVars(fromTheme)
    const toVars = themeToCssVars(toTheme)
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / THEME_TRANSITION_DURATION, 1)
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

      const interpolated: CssVars = {
        '--primary': lerpColor(fromVars['--primary'], toVars['--primary'], easeT),
        '--primary-light': lerpColor(fromVars['--primary-light'], toVars['--primary-light'], easeT),
        '--background': lerpColor(fromVars['--background'], toVars['--background'], easeT),
        '--canvas-bg': lerpColor(fromVars['--canvas-bg'], toVars['--canvas-bg'], easeT),
        '--text': lerpColor(fromVars['--text'], toVars['--text'], easeT),
        '--text-secondary': lerpColor(fromVars['--text-secondary'], toVars['--text-secondary'], easeT),
        '--border': lerpColor(fromVars['--border'], toVars['--border'], easeT)
      }

      applyCssVars(interpolated)
      currentCssVarsRef.current = interpolated

      if (t < 1) {
        themeTransitionRef.current = requestAnimationFrame(step)
      } else {
        applyCssVars(toVars)
        currentCssVarsRef.current = toVars
        themeTransitionRef.current = null
      }
    }

    themeTransitionRef.current = requestAnimationFrame(step)
  }, [applyCssVars])

  useEffect(() => {
    wordCloudEngine.setTheme(theme)
    wordCloudRenderer.setTheme(theme)
  }, [theme, selectedThemeId])

  useEffect(() => {
    const unsubBroadcast = roomManager.on('keyword:broadcast', (updatedKeywords) => {
      const prevWeights = new Map<string, number>()
      keywords.forEach((kw) => prevWeights.set(kw.word, kw.weight))
      previousWeightsRef.current = prevWeights

      setKeywords(updatedKeywords)

      const renderData = wordCloudEngine.compute(updatedKeywords)
      wordCloudRenderer.update(renderData, previousWeightsRef.current)
    })

    const unsubUserJoin = roomManager.on('user:join', () => {
      setOnlineCount(roomManager.getOnlineUsers().length)
    })

    const unsubUserLeave = roomManager.on('user:leave', () => {
      setOnlineCount(roomManager.getOnlineUsers().length)
    })

    const unsubClear = roomManager.on('room:clear', () => {
      previousWeightsRef.current.clear()
    })

    return () => {
      unsubBroadcast()
      unsubUserJoin()
      unsubUserLeave()
      unsubClear()
    }
  }, [keywords])

  useEffect(() => {
    const handleResize = (e: Event) => {
      const customEvent = e as CustomEvent<{ width: number; height: number }>
      if (customEvent.detail) {
        wordCloudEngine.setCanvasSize(customEvent.detail.width, customEvent.detail.height)
        if (keywords.length > 0) {
          const renderData = wordCloudEngine.compute(keywords)
          wordCloudRenderer.update(renderData)
        }
      }
    }

    window.addEventListener('wordcloud-resize', handleResize as EventListener)
    return () => window.removeEventListener('wordcloud-resize', handleResize as EventListener)
  }, [keywords])

  useEffect(() => {
    return () => {
      if (themeTransitionRef.current) {
        cancelAnimationFrame(themeTransitionRef.current)
      }
    }
  }, [])

  const handleCreateRoom = useCallback((roomName: string, teacherName: string) => {
    const { roomId: newRoomId, user } = roomManager.createRoom(roomName, teacherName)
    setRoomId(newRoomId)
    setCurrentUser(user)
    setOnlineCount(1)
    setAuthError('')

    setTimeout(() => {
      const canvas = canvasRef.current?.getCanvas()
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        wordCloudEngine.setCanvasSize(rect.width, rect.height)
      }
    }, 100)
  }, [])

  const handleJoinRoom = useCallback((roomIdInput: string, studentName: string) => {
    const result = roomManager.joinRoom(roomIdInput, studentName)
    if (result) {
      const { room, user } = result
      setRoomId(room.id)
      setCurrentUser(user)
      setOnlineCount(room.users.size)
      setKeywords(room.keywords)
      setAuthError('')

      setTimeout(() => {
        const canvas = canvasRef.current?.getCanvas()
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          wordCloudEngine.setCanvasSize(rect.width, rect.height)
          if (room.keywords.length > 0) {
            const renderData = wordCloudEngine.compute(room.keywords)
            wordCloudRenderer.update(renderData)
          }
        }
      }, 100)
    } else {
      setAuthError('房间不存在，请检查房间号是否正确')
    }
  }, [])

  const handleKeywordSubmit = useCallback((keyword: string) => {
    const message: KeywordMessage | null = roomManager.submitKeyword(keyword)
    if (message && canvasRef.current) {
      const canvas = canvasRef.current.getCanvas()
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const containerRect = canvas.closest('.canvas-section')?.getBoundingClientRect()
        if (containerRect) {
          canvasRef.current.triggerRocket(
            rect.width / 2,
            rect.height - 40,
            rect.width / 2,
            rect.height / 2,
            theme.primary
          )
        }
      }
    }
  }, [theme.primary])

  const handleClear = useCallback(async () => {
    if (canvasRef.current) {
      await canvasRef.current.triggerClear()
    }
    roomManager.clearKeywords()
    previousWeightsRef.current.clear()
  }, [])

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas()
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `wordcloud-${roomId}-${Date.now()}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [roomId])

  const handleThemeChange = useCallback((themeId: ThemeId) => {
    const fromTheme = getTheme(selectedThemeId)
    const toTheme = getTheme(themeId)
    setSelectedThemeId(themeId)
    animateThemeTransition(fromTheme, toTheme)
  }, [selectedThemeId, animateThemeTransition])

  if (!currentUser) {
    return <AuthScreen onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} error={authError} />
  }

  const isTeacher = currentUser.role === 'teacher'

  return (
    <div className="app-container">
      <header className="header">
        <div className="room-info">
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>实时互动词云</h2>
          <span className="role-badge">
            {isTeacher ? '👨‍🏫 教师' : '👩‍🎓 学生'} · {currentUser.nickname}
          </span>
        </div>
        <div className="room-info">
          <div className="room-code">
            房间号：{roomId}
          </div>
        </div>
      </header>

      <div className="main-content">
        <div style={{ display: 'flex', flex: '0 0 70%', flexDirection: 'column' }}>
          <WordCloudCanvas ref={canvasRef} theme={theme} />
          {!isTeacher && (
            <KeywordInput onSubmit={handleKeywordSubmit} />
          )}
        </div>

        <ControlPanel
          roomId={roomId}
          onlineCount={onlineCount}
          isTeacher={isTeacher}
          themes={themeList}
          selectedThemeId={selectedThemeId}
          onThemeChange={handleThemeChange}
          onClear={handleClear}
          onExport={handleExport}
        />
      </div>

      {isTeacher && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 50 }}>
          <KeywordInput onSubmit={handleKeywordSubmit} />
        </div>
      )}
    </div>
  )
}

export default App
