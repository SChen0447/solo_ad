import React, { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Toolbar from './Toolbar'
import StickyNote from './StickyNote'
import {
  type CanvasState,
  type DrawPath,
  type DrawPoint,
  type StickyNoteData,
  type NoteColor,
  type WSMessage,
  MAX_HISTORY
} from '../shared/types'

const buildPathD = (points: DrawPoint[]): string => {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2
    const yc = (points[i].y + points[i + 1].y) / 2
    d += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`
  }
  if (points.length >= 2) {
    const last = points[points.length - 1]
    d += ` T ${last.x} ${last.y}`
  }
  return d
}

const Whiteboard: React.FC = () => {
  const [canvasState, setCanvasState] = useState<CanvasState>({ paths: [], notes: [] })
  const [history, setHistory] = useState<CanvasState[]>([{ paths: [], notes: [] }])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [penColor, setPenColor] = useState('#212121')
  const [penWidth, setPenWidth] = useState(3)
  const [noteColor, setNoteColor] = useState<NoteColor>('yellow')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<DrawPath | null>(null)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const [wsConnected, setWsConnected] = useState(false)
  const [userCount, setUserCount] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  const wsRef = useRef<WebSocket | null>(null)
  const clientIdRef = useRef<string>('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const currentPathRef = useRef<DrawPath | null>(null)

  const pushHistory = useCallback((state: CanvasState) => {
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1)
      const next = [...truncated, JSON.parse(JSON.stringify(state))]
      if (next.length > MAX_HISTORY) {
        return next.slice(next.length - MAX_HISTORY)
      }
      return next
    })
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [historyIndex])

  const doUndo = useCallback(() => {
    if (historyIndex > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        setHistoryIndex((prev) => prev - 1)
        setCanvasState(JSON.parse(JSON.stringify(history[historyIndex - 1])))
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'snapshot',
              payload: history[historyIndex - 1],
              clientId: clientIdRef.current
            } as WSMessage)
          )
        }
        setTimeout(() => setIsTransitioning(false), 200)
      }, 100)
    }
  }, [history, historyIndex])

  const doRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setHistoryIndex((prev) => prev + 1)
        setCanvasState(JSON.parse(JSON.stringify(history[historyIndex + 1])))
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'snapshot',
              payload: history[historyIndex + 1],
              clientId: clientIdRef.current
            } as WSMessage)
          )
        }
        setTimeout(() => setIsTransitioning(false), 200)
      }, 100)
    }
  }, [history, historyIndex])

  const doClear = useCallback(() => {
    const emptyState: CanvasState = { paths: [], notes: [] }
    setCanvasState(emptyState)
    pushHistory(emptyState)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'clear',
          payload: null,
          clientId: clientIdRef.current
        } as WSMessage)
      )
    }
  }, [pushHistory])

  const addNote = useCallback(() => {
    const centerX = (-offsetX + canvasSize.w / 2) / scale
    const centerY = (-offsetY + (canvasSize.h - 40) / 2) / scale
    const newNote: StickyNoteData = {
      id: uuidv4(),
      x: centerX - 60,
      y: centerY - 40,
      content: '',
      color: noteColor
    }
    const newState = {
      ...canvasState,
      notes: [...canvasState.notes, newNote]
    }
    setCanvasState(newState)
    pushHistory(newState)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'note-add',
          payload: newNote,
          clientId: clientIdRef.current
        } as WSMessage)
      )
    }
  }, [canvasState, noteColor, offsetX, offsetY, canvasSize, scale, pushHistory])

  const updateNote = useCallback(
    (updated: StickyNoteData) => {
      const newState = {
        ...canvasState,
        notes: canvasState.notes.map((n) => (n.id === updated.id ? updated : n))
      }
      setCanvasState(newState)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'note-update',
            payload: updated,
            clientId: clientIdRef.current
          } as WSMessage)
        )
      }
    },
    [canvasState]
  )

  const deleteNote = useCallback(
    (id: string) => {
      const newState = {
        ...canvasState,
        notes: canvasState.notes.filter((n) => n.id !== id)
      }
      setCanvasState(newState)
      pushHistory(newState)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'note-delete',
            payload: { id },
            clientId: clientIdRef.current
          } as WSMessage)
        )
      }
    },
    [canvasState, pushHistory]
  )

  const screenToCanvas = (sx: number, sy: number): DrawPoint => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const x = rect ? sx - rect.left : sx
    const y = rect ? sy - rect.top : sy
    return {
      x: (x - offsetX) / scale,
      y: (y - offsetY) / scale
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (e.shiftKey || e.button === 1) {
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY }
      return
    }
    setIsDrawing(true)
    const pt = screenToCanvas(e.clientX, e.clientY)
    const path: DrawPath = {
      id: uuidv4(),
      points: [pt],
      color: penColor,
      width: penWidth
    }
    currentPathRef.current = path
    setCurrentPath(path)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffsetX(panStart.current.ox + (e.clientX - panStart.current.x))
      setOffsetY(panStart.current.oy + (e.clientY - panStart.current.y))
      return
    }
    if (!isDrawing || !currentPathRef.current) return
    const pt = screenToCanvas(e.clientX, e.clientY)
    const newPath = {
      ...currentPathRef.current,
      points: [...currentPathRef.current.points, pt]
    }
    currentPathRef.current = newPath
    setCurrentPath(newPath)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'draw',
          payload: newPath,
          clientId: clientIdRef.current
        } as WSMessage)
      )
    }
  }

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      return
    }
    if (!isDrawing || !currentPathRef.current) return
    const finalPath = currentPathRef.current
    setIsDrawing(false)
    setCurrentPath(null)
    if (finalPath.points.length > 1) {
      const newState = {
        ...canvasState,
        paths: [...canvasState.paths, finalPath]
      }
      setCanvasState(newState)
      pushHistory(newState)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'draw-end',
            payload: finalPath,
            clientId: clientIdRef.current
          } as WSMessage)
        )
      }
    }
    currentPathRef.current = null
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const newScale = Math.min(Math.max(scale + delta, 0.2), 5)
    const rect = canvasRef.current?.getBoundingClientRect()
    const mx = rect ? e.clientX - rect.left : 0
    const my = rect ? e.clientY - rect.top : 0
    const factor = newScale / scale
    setOffsetX(mx - (mx - offsetX) * factor)
    setOffsetY(my - (my - offsetY) * factor)
    setScale(newScale)
  }

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
    }

    ws.onclose = () => {
      setWsConnected(false)
    }

    ws.onerror = () => {
      setWsConnected(false)
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        if (msg.clientId && msg.clientId === clientIdRef.current) return

        switch (msg.type) {
          case 'init': {
            clientIdRef.current = msg.payload.clientId
            const state = msg.payload.state as CanvasState
            setCanvasState(state)
            setHistory([state])
            setHistoryIndex(0)
            break
          }
          case 'draw':
          case 'draw-end': {
            const path = msg.payload as DrawPath
            setCanvasState((prev) => {
              const idx = prev.paths.findIndex((p) => p.id === path.id)
              const paths =
                idx >= 0
                  ? [...prev.paths.slice(0, idx), path, ...prev.paths.slice(idx + 1)]
                  : [...prev.paths, path]
              return { ...prev, paths }
            })
            if (msg.type === 'draw-end') {
              setCanvasState((prev) => {
                pushHistory(prev)
                return prev
              })
            }
            break
          }
          case 'note-add': {
            const note = msg.payload as StickyNoteData
            setCanvasState((prev) => {
              const next = { ...prev, notes: [...prev.notes, note] }
              pushHistory(next)
              return next
            })
            break
          }
          case 'note-update': {
            const note = msg.payload as StickyNoteData
            setCanvasState((prev) => ({
              ...prev,
              notes: prev.notes.map((n) => (n.id === note.id ? note : n))
            }))
            break
          }
          case 'note-delete': {
            const { id } = msg.payload as { id: string }
            setCanvasState((prev) => {
              const next = { ...prev, notes: prev.notes.filter((n) => n.id !== id) }
              pushHistory(next)
              return next
            })
            break
          }
          case 'clear': {
            const empty: CanvasState = { paths: [], notes: [] }
            setCanvasState(empty)
            pushHistory(empty)
            break
          }
          case 'snapshot': {
            const state = msg.payload as CanvasState
            setCanvasState(state)
            pushHistory(state)
            break
          }
          case 'user-count': {
            setUserCount(msg.payload.count)
            break
          }
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err)
      }
    }

    return () => {
      ws.close()
    }
  }, [pushHistory])

  const gridSize = 5 * scale
  const pathsToRender = currentPath
    ? [...canvasState.paths, currentPath]
    : canvasState.paths

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="app-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            <path d="M2 2l7.586 7.586"/>
            <circle cx="11" cy="11" r="2"/>
          </svg>
          <span>协作白板</span>
        </div>
        <div className="top-bar-right">
          <div className="user-count">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>{userCount}</span>
          </div>
          <div
            className={`connection-status ${wsConnected ? 'connected' : 'disconnected'}`}
            title={wsConnected ? '已连接' : '断线'}
          />
        </div>
      </div>

      <div className="main-content">
        <Toolbar
          penColor={penColor}
          penWidth={penWidth}
          noteColor={noteColor}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onPenColorChange={setPenColor}
          onPenWidthChange={setPenWidth}
          onNoteColorChange={setNoteColor}
          onAddNote={addNote}
          onUndo={doUndo}
          onRedo={doRedo}
          onClear={doClear}
        />

        <div
          ref={canvasRef}
          className={`canvas-container ${isTransitioning ? 'fading' : ''}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            backgroundImage: `linear-gradient(to right, rgba(25, 118, 210, 0.08) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(25, 118, 210, 0.08) 1px, transparent 1px)`,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            backgroundPosition: `${offsetX}px ${offsetY}px`,
            cursor: isPanning ? 'grabbing' : isDrawing ? 'crosshair' : 'crosshair'
          }}
        >
          <svg
            className="drawing-layer"
            style={{
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
              transformOrigin: '0 0'
            }}
          >
            {pathsToRender.map((path) => (
              <path
                key={path.id}
                d={buildPathD(path.points)}
                stroke={path.color}
                strokeWidth={path.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </svg>

          <div className="notes-layer">
            {canvasState.notes.map((note) => (
              <StickyNote
                key={note.id}
                note={note}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                onUpdate={updateNote}
                onDelete={deleteNote}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Whiteboard
