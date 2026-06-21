import React, { useState, useEffect, useRef, useCallback } from 'react'
import LayerPanel from './LayerPanel'
import PropPanel from './PropPanel'
import { GameEngine } from '../engine/GameEngine'
import { RenderCanvas } from '../engine/RenderCanvas'
import { ExportManager } from '../engine/ExportManager'
import type { GameElement, GameState, ElementType } from '../types'
import { defaultElement, generateId } from '../types'

type DragMode = 'none' | 'move' | 'resize'

const TEMPLATES = {
  parkour: (): GameState => {
    const ground: GameElement = {
      id: generateId(), name: '地面', type: 'rect',
      x: 0, y: 500, width: 2000, height: 100, color: '#6B7280',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0.3, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    const player: GameElement = {
      id: generateId(), name: '玩家', type: 'rect',
      x: 100, y: 400, width: 40, height: 60, color: '#10B981',
      rotation: 0,
      physics: { gravity: 900, bounciness: 0, friction: 0.5, isStatic: false, velocityX: 0, velocityY: 0 },
      script: `// 跑酷控制
const speed = 300;
const jump = 400;
if (keys.has('ArrowLeft') || keys.has('KeyA')) element.x -= speed * dt;
if (keys.has('ArrowRight') || keys.has('KeyD')) element.x += speed * dt;
if ((keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW')) && element.physics.velocityY === 0) {
  element.physics.velocityY = -jump;
}`
    }
    const obstacle1: GameElement = {
      id: generateId(), name: '障碍1', type: 'rect',
      x: 400, y: 440, width: 40, height: 60, color: '#EF4444',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    const obstacle2: GameElement = {
      id: generateId(), name: '障碍2', type: 'rect',
      x: 600, y: 380, width: 80, height: 20, color: '#F59E0B',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    const score: GameElement = {
      id: generateId(), name: '得分标签', type: 'text',
      x: 20, y: 50, width: 0, height: 0, color: '#FFFFFF',
      rotation: 0, text: '跑酷：方向键移动，空格跳跃', fontSize: 18,
      physics: { gravity: 0, bounciness: 0, friction: 0, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    return {
      elements: [ground, obstacle1, obstacle2, player, score],
      score: 0, isRunning: false, isPaused: false, selectedId: null,
      title: '跑酷游戏', author: '独立开发者'
    }
  },
  platform: (): GameState => {
    const ground: GameElement = {
      id: generateId(), name: '地面', type: 'rect',
      x: 0, y: 550, width: 800, height: 50, color: '#4B5563',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0.2, friction: 0.3, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    const platform1: GameElement = {
      id: generateId(), name: '平台1', type: 'rect',
      x: 150, y: 450, width: 120, height: 20, color: '#8B5CF6',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0.5, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    const platform2: GameElement = {
      id: generateId(), name: '平台2', type: 'rect',
      x: 350, y: 350, width: 120, height: 20, color: '#8B5CF6',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0.5, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    const platform3: GameElement = {
      id: generateId(), name: '平台3', type: 'rect',
      x: 550, y: 250, width: 120, height: 20, color: '#8B5CF6',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0.5, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    const player: GameElement = {
      id: generateId(), name: '玩家球', type: 'circle',
      x: 100, y: 500, width: 40, height: 40, radius: 20, color: '#10B981',
      rotation: 0,
      physics: { gravity: 800, bounciness: 0.5, friction: 0.1, isStatic: false, velocityX: 0, velocityY: 0 },
      script: `// 平台跳跃控制
if (keys.has('ArrowLeft') || keys.has('KeyA')) element.physics.velocityX -= 400 * dt;
if (keys.has('ArrowRight') || keys.has('KeyD')) element.physics.velocityX += 400 * dt;
if (keys.has('Space') && element.physics.velocityY >= -1 && element.physics.velocityY <= 1) {
  element.physics.velocityY = -500;
}`
    }
    const goal: GameElement = {
      id: generateId(), name: '目标', type: 'circle',
      x: 610, y: 200, width: 40, height: 40, radius: 20, color: '#F59E0B',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    const info: GameElement = {
      id: generateId(), name: '提示', type: 'text',
      x: 20, y: 40, width: 0, height: 0, color: '#FFFFFF',
      rotation: 0, text: '平台跳跃：方向键移动，空格跳', fontSize: 18,
      physics: { gravity: 0, bounciness: 0, friction: 0, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    return {
      elements: [ground, platform1, platform2, platform3, goal, player, info],
      score: 0, isRunning: false, isPaused: false, selectedId: null,
      title: '平台跳跃', author: '独立开发者'
    }
  },
  bullet: (): GameState => {
    const player: GameElement = {
      id: generateId(), name: '玩家', type: 'rect',
      x: 380, y: 500, width: 40, height: 40, color: '#10B981',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0.3, isStatic: false, velocityX: 0, velocityY: 0 },
      script: `// 弹幕射击：方向键移动
const speed = 350;
if (keys.has('ArrowLeft')) element.x -= speed * dt;
if (keys.has('ArrowRight')) element.x += speed * dt;
if (keys.has('ArrowUp')) element.y -= speed * dt;
if (keys.has('ArrowDown')) element.y += speed * dt;
element.x = Math.max(0, Math.min(760, element.x));
element.y = Math.max(0, Math.min(560, element.y));

// 自动射击
if (!element._cooldown) element._cooldown = 0;
element._cooldown -= dt;
if (element._cooldown <= 0) {
  element._cooldown = 0.3;
  engine.addElement({
    id: engine.generateId(), name: '子弹', type: 'circle',
    x: element.x + 20, y: element.y - 10,
    width: 12, height: 12, radius: 6,
    color: '#3B82F6', rotation: 0,
    physics: { gravity: 0, bounciness: 0, friction: 0, isStatic: false, velocityX: 0, velocityY: -500 },
    script: 'if (element.y < -20) engine.removeElement(element.id);'
  });
}`
    }
    const enemy1: GameElement = {
      id: generateId(), name: '敌机1', type: 'rect',
      x: 100, y: 80, width: 50, height: 50, color: '#EF4444',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0, isStatic: false, velocityX: 80, velocityY: 0 },
      script: `// 移动的敌机
if (element.x <= 0 || element.x >= 750) element.physics.velocityX *= -1;`
    }
    const enemy2: GameElement = {
      id: generateId(), name: '敌机2', type: 'circle',
      x: 500, y: 150, width: 50, height: 50, radius: 25, color: '#F59E0B',
      rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0, isStatic: false, velocityX: 0, velocityY: 0 },
      script: `element.rotation += 180 * dt;
// 发射弹幕
if (!element._timer) element._timer = 0;
element._timer += dt;
if (element._timer > 1.5) {
  element._timer = 0;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    engine.addElement({
      id: engine.generateId(), name: '敌弹', type: 'circle',
      x: element.x, y: element.y,
      width: 10, height: 10, radius: 5,
      color: '#EC4899', rotation: 0,
      physics: { gravity: 0, bounciness: 0, friction: 0, isStatic: false,
        velocityX: Math.cos(angle) * 150, velocityY: Math.sin(angle) * 150 },
      script: 'if (element.x < -20 || element.x > 820 || element.y < -20 || element.y > 620) engine.removeElement(element.id);'
    });
  }
}`
    }
    const info: GameElement = {
      id: generateId(), name: '提示', type: 'text',
      x: 20, y: 40, width: 0, height: 0, color: '#FFFFFF',
      rotation: 0, text: '弹幕射击：方向键移动，自动射击', fontSize: 18,
      physics: { gravity: 0, bounciness: 0, friction: 0, isStatic: true, velocityX: 0, velocityY: 0 },
      script: ''
    }
    return {
      elements: [player, enemy1, enemy2, info],
      score: 0, isRunning: false, isPaused: false, selectedId: null,
      title: '弹幕射击', author: '独立开发者'
    }
  }
}

const EditorPanel: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    elements: [],
    score: 0,
    isRunning: false,
    isPaused: false,
    selectedId: null,
    title: '我的游戏',
    author: '开发者'
  })
  const [leftWidth, setLeftWidth] = useState(300)
  const [rightWidth, setRightWidth] = useState(280)
  const [showExportModal, setShowExportModal] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [mobilePropOpen, setMobilePropOpen] = useState(false)
  const [dragMode, setDragMode] = useState<DragMode>('none')
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const engineRef = useRef<GameEngine | null>(null)
  const rendererRef = useRef<RenderCanvas | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasWrapRef = useRef<HTMLDivElement | null>(null)
  const resizeRef = useRef<{ type: 'left' | 'right' | null }>({ type: null })

  useEffect(() => {
    engineRef.current = new GameEngine()
    engineRef.current.setFrameCallback((data) => {
      setGameState((prev) => ({
        ...prev,
        elements: JSON.parse(JSON.stringify(data.elements)),
        score: data.score,
        isPaused: data.isPaused
      }))
      if (rendererRef.current && canvasRef.current) {
        rendererRef.current.render(data)
      }
    })

    const shared = ExportManager.decodeShareURL()
    if (shared) {
      engineRef.current.setState(shared)
      setGameState(shared)
      setWelcomeMessage(`已加载分享的游戏：${shared.title}`)
      setTimeout(() => setWelcomeMessage(''), 3000)
    }

    const checkMobile = () => setIsMobile(window.innerWidth < 900)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new RenderCanvas(canvasRef.current)
      rendererRef.current.setEditing(!gameState.isRunning)
      resizeCanvas()
    }
    if (rendererRef.current) {
      rendererRef.current.setEditing(!gameState.isRunning)
      rendererRef.current.setSelectedId(gameState.selectedId)
    }
  }, [canvasRef.current, gameState.isRunning, gameState.selectedId])

  useEffect(() => {
    if (engineRef.current && canvasWrapRef.current) {
      engineRef.current.setCanvasSize(
        canvasWrapRef.current.clientWidth,
        canvasWrapRef.current.clientHeight
      )
    }
  }, [gameState.isRunning])

  const resizeCanvas = useCallback(() => {
    if (rendererRef.current && canvasWrapRef.current) {
      const w = canvasWrapRef.current.clientWidth
      const h = canvasWrapRef.current.clientHeight
      rendererRef.current.resize(w, h)
      if (engineRef.current) {
        engineRef.current.setCanvasSize(w, h)
      }
      renderIdle()
    }
  }, [])

  const renderIdle = useCallback(() => {
    if (rendererRef.current && engineRef.current) {
      rendererRef.current.render({
        elements: engineRef.current.getState().elements,
        score: 0,
        fps: 0,
        isPaused: false
      })
    }
  }, [])

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  useEffect(() => {
    const timer = setTimeout(resizeCanvas, 50)
    return () => clearTimeout(timer)
  }, [leftWidth, rightWidth, resizeCanvas])

  useEffect(() => {
    renderIdle()
  }, [gameState.elements, renderIdle])

  const syncEngine = () => {
    if (engineRef.current) {
      engineRef.current.setState(gameState)
    }
  }

  const handleAddElement = (type: ElementType) => {
    const el = defaultElement(type)
    el.x = (canvasWrapRef.current?.clientWidth || 400) / 2 - (type === 'circle' ? 20 : 40)
    el.y = (canvasWrapRef.current?.clientHeight || 300) / 2 - (type === 'circle' ? 20 : 30)
    const newState = { ...gameState, elements: [...gameState.elements, el], selectedId: el.id }
    setGameState(newState)
    engineRef.current?.setState(newState)
    renderIdle()
  }

  const handleSelect = (id: string) => {
    const newState = { ...gameState, selectedId: id }
    setGameState(newState)
    engineRef.current?.selectElement(id)
    renderIdle()
  }

  const handleDelete = (id: string) => {
    const newState = {
      ...gameState,
      elements: gameState.elements.filter(el => el.id !== id),
      selectedId: gameState.selectedId === id ? null : gameState.selectedId
    }
    setGameState(newState)
    engineRef.current?.removeElement(id)
    renderIdle()
  }

  const handleReorder = (ids: string[]) => {
    const map = new Map(gameState.elements.map(el => [el.id, el]))
    const newElements = ids.map(id => map.get(id)).filter(Boolean) as GameElement[]
    const newState = { ...gameState, elements: newElements }
    setGameState(newState)
    engineRef.current?.reorderElements(ids)
    renderIdle()
  }

  const handleUpdate = (id: string, updates: Partial<GameElement>) => {
    const newElements = gameState.elements.map(el =>
      el.id === id ? { ...el, ...updates, physics: updates.physics ? { ...el.physics, ...updates.physics } : el.physics } : el
    )
    const newState = { ...gameState, elements: newElements }
    setGameState(newState)
    engineRef.current?.updateElement(id, updates)
    renderIdle()
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (gameState.isRunning) return
    if (!rendererRef.current || !canvasWrapRef.current) return
    const rect = canvasWrapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const el = rendererRef.current.getElementAtPoint(x, y, gameState.elements)
    if (el) {
      handleSelect(el.id)
      setDragMode('move')
      if (el.type === 'circle' && el.radius) {
        setDragOffset({ x: x - el.x, y: y - el.y })
      } else {
        setDragOffset({ x: x - el.x, y: y - el.y })
      }
    } else {
      setGameState({ ...gameState, selectedId: null })
      engineRef.current?.selectElement(null)
      renderIdle()
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (gameState.isRunning || dragMode === 'none' || !gameState.selectedId || !canvasWrapRef.current) return
    const rect = canvasWrapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (dragMode === 'move') {
      const el = gameState.elements.find(e => e.id === gameState.selectedId)
      if (!el) return
      let newX = x - dragOffset.x
      let newY = y - dragOffset.y
      if (el.type === 'circle' && el.radius) {
        newX = Math.max(el.radius, Math.min(canvasWrapRef.current.clientWidth - el.radius, newX))
        newY = Math.max(el.radius, Math.min(canvasWrapRef.current.clientHeight - el.radius, newY))
      } else {
        newX = Math.max(0, Math.min(canvasWrapRef.current.clientWidth - el.width, newX))
        newY = Math.max(0, Math.min(canvasWrapRef.current.clientHeight - el.height, newY))
      }
      handleUpdate(gameState.selectedId, { x: newX, y: newY })
    }
  }

  const handleCanvasMouseUp = () => {
    setDragMode('none')
  }

  const handleRun = () => {
    syncEngine()
    engineRef.current?.start()
    setGameState(prev => ({ ...prev, isRunning: true, isPaused: false }))
  }

  const handlePause = () => {
    engineRef.current?.togglePause()
  }

  const handleStop = () => {
    engineRef.current?.stop()
    const finalState = engineRef.current?.getState() || gameState
    setGameState({ ...finalState, isRunning: false, isPaused: false })
  }

  const loadTemplate = (key: keyof typeof TEMPLATES) => {
    const template = TEMPLATES[key]()
    setGameState(template)
    engineRef.current?.setState(template)
    renderIdle()
    const names: Record<string, string> = { parkour: '跑酷', platform: '平台跳跃', bullet: '弹幕射击' }
    setWelcomeMessage(`已加载${names[key]}模板`)
    setTimeout(() => setWelcomeMessage(''), 3000)
  }

  const handleExport = () => {
    setShowExportModal(true)
  }

  const doExport = () => {
    const html = ExportManager.generateHTML(gameState)
    ExportManager.downloadHTML(html, `${gameState.title || 'game'}.html`)
    setShowExportModal(false)
  }

  const handleShare = async () => {
    try {
      const url = ExportManager.encodeShareURL(gameState)
      await ExportManager.copyToClipboard(url)
      setShareMessage('分享链接已复制到剪贴板！')
    } catch {
      setShareMessage('复制失败，请手动复制')
    }
    setTimeout(() => setShareMessage(''), 3000)
  }

  const handleResizeStart = (type: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current.type = type
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }

  const handleResizeMove = (e: MouseEvent) => {
    if (resizeRef.current.type === 'left') {
      setLeftWidth(Math.max(200, Math.min(500, e.clientX)))
    } else if (resizeRef.current.type === 'right') {
      setRightWidth(Math.max(240, Math.min(500, window.innerWidth - e.clientX)))
    }
  }

  const handleResizeEnd = () => {
    resizeRef.current.type = null
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
  }

  const selectedElement = gameState.elements.find(el => el.id === gameState.selectedId) || null

  return (
    <div style={styles.app}>
      <div style={styles.toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={styles.logo}>🎮 Game Sandbox</span>
          <div style={styles.templates}>
            <button style={styles.tplBtn} onClick={() => loadTemplate('parkour')} disabled={gameState.isRunning}>跑酷</button>
            <button style={styles.tplBtn} onClick={() => loadTemplate('platform')} disabled={gameState.isRunning}>平台</button>
            <button style={styles.tplBtn} onClick={() => loadTemplate('bullet')} disabled={gameState.isRunning}>弹幕</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!gameState.isRunning ? (
            <button style={{ ...styles.btn, ...styles.btnRun }} onClick={handleRun}>运行</button>
          ) : (
            <>
              <button style={{ ...styles.btn, ...styles.btnPause }} onClick={handlePause}>
                {gameState.isPaused ? '继续' : '暂停'}
              </button>
              <button style={{ ...styles.btn, ...styles.btnRun, background: '#EF4444' }} onClick={handleStop}>停止</button>
            </>
          )}
          <button style={{ ...styles.btn, ...styles.btnExport }} onClick={handleExport} disabled={gameState.isRunning}>导出</button>
          <button style={{ ...styles.btn, ...styles.btnShare }} onClick={handleShare} disabled={gameState.isRunning}>分享</button>
        </div>
      </div>

      <div style={styles.main}>
        {!isMobile && (
          <>
            <div style={{ ...styles.leftPanel, width: leftWidth }}>
              <LayerPanel
                elements={gameState.elements}
                selectedId={gameState.selectedId}
                onSelect={handleSelect}
                onReorder={handleReorder}
                onDelete={handleDelete}
                onAddElement={handleAddElement}
                disabled={gameState.isRunning}
              />
            </div>
            <div
              style={styles.divider}
              onMouseDown={(e) => handleResizeStart('left', e)}
            />
          </>
        )}

        <div ref={canvasWrapRef} style={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', cursor: gameState.isRunning ? 'default' : (dragMode ? 'grabbing' : 'crosshair') }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
          {welcomeMessage && (
            <div style={styles.welcome}>
              {welcomeMessage}
            </div>
          )}
          {shareMessage && (
            <div style={styles.toast}>{shareMessage}</div>
          )}
          {isMobile && !gameState.isRunning && (
            <button
              style={styles.mobilePropBtn}
              onClick={() => setMobilePropOpen(true)}
            >
              属性
            </button>
          )}
        </div>

        {!isMobile && (
          <>
            <div
              style={styles.divider}
              onMouseDown={(e) => handleResizeStart('right', e)}
            />
            <div style={{ ...styles.rightPanel, width: rightWidth }}>
              <PropPanel element={selectedElement} onUpdate={handleUpdate} />
            </div>
          </>
        )}
      </div>

      {isMobile && mobilePropOpen && (
        <div style={styles.mobileOverlay} onClick={() => setMobilePropOpen(false)}>
          <div
            style={styles.mobilePropPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #2A2A2A' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>属性面板</span>
              <button style={{ ...styles.closeBtn }} onClick={() => setMobilePropOpen(false)}>✕</button>
            </div>
            <div style={{ height: 'calc(100% - 49px)', overflowY: 'auto' }}>
              <PropPanel element={selectedElement} onUpdate={handleUpdate} />
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>导出游戏</h3>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>游戏标题</label>
              <input
                type="text"
                value={gameState.title}
                onChange={(e) => setGameState({ ...gameState, title: e.target.value })}
                style={styles.modalInput}
              />
            </div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>作者名</label>
              <input
                type="text"
                value={gameState.author}
                onChange={(e) => setGameState({ ...gameState, author: e.target.value })}
                style={styles.modalInput}
              />
            </div>
            <div style={styles.modalActions}>
              <button style={{ ...styles.btn, background: '#3A3A3A' }} onClick={() => setShowExportModal(false)}>取消</button>
              <button style={{ ...styles.btn, ...styles.btnExport }} onClick={doExport}>下载HTML</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#121212',
    color: '#fff'
  },
  toolbar: {
    height: 48,
    background: '#2A2A2A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    flexShrink: 0
  },
  logo: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff'
  },
  templates: {
    display: 'flex',
    gap: '6px'
  },
  tplBtn: {
    padding: '4px 12px',
    background: '#3A3A3A',
    color: '#ddd',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.15s'
  },
  btn: {
    width: 90,
    height: 32,
    borderRadius: 6,
    border: 'none',
    color: '#fff',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'filter 0.2s'
  },
  btnRun: { background: '#10B981' },
  btnPause: { background: '#F59E0B' },
  btnExport: { background: '#3B82F6' },
  btnShare: { background: '#8B5CF6' },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  leftPanel: {
    background: '#1E1E1E',
    flexShrink: 0,
    overflow: 'hidden'
  },
  rightPanel: {
    background: '#1E1E1E',
    flexShrink: 0,
    overflow: 'hidden'
  },
  divider: {
    width: 4,
    background: '#3A3A3A',
    cursor: 'col-resize',
    flexShrink: 0,
    transition: 'background 0.15s'
  },
  canvasWrap: {
    flex: 1,
    position: 'relative',
    background: '#E0E0E0',
    overflow: 'hidden'
  },
  welcome: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0,0,0,0.75)',
    color: '#fff',
    padding: '16px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    animation: 'float 2s ease-in-out infinite, fadeIn 0.3s ease-out',
    pointerEvents: 'none'
  },
  toast: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.8)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '13px'
  },
  mobilePropBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    background: '#3B82F6',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    cursor: 'pointer'
  },
  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end'
  },
  mobilePropPanel: {
    width: '100%',
    height: '70%',
    background: '#1E1E1E',
    borderRadius: '16px 16px 0 0',
    animation: 'slideUp 0.3s ease-out'
  },
  closeBtn: {
    background: 'transparent',
    color: '#aaa',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200
  },
  modal: {
    width: '90%',
    maxWidth: 420,
    background: 'linear-gradient(135deg, #1E1E2E, #2D2D44)',
    border: '2px solid #4A90D9',
    borderRadius: 16,
    padding: 28
  },
  modalTitle: {
    margin: '0 0 20px',
    fontSize: '20px',
    color: '#fff'
  },
  modalField: {
    marginBottom: 16
  },
  modalLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#bbb',
    marginBottom: 6
  },
  modalInput: {
    width: '100%',
    padding: '10px 12px',
    background: '#0D0D0D',
    border: '1px solid #3A3A3A',
    borderRadius: 8,
    color: '#fff',
    fontSize: '14px',
    outline: 'none'
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 20
  }
}

export default EditorPanel
