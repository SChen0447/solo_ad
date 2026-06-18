import { useRef, useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'
import { useNavigate } from 'react-router-dom'
import Toolbar from './Toolbar'
import StickyNote from './StickyNote'
import { useCanvasStore } from '../store'
import type { Point, PathData, StickyNoteData, ImageData, CanvasState } from '../server/server'

interface CanvasProps {
  meetingId: string
}

export default function Canvas({ meetingId }: CanvasProps) {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const lastDrawTimeRef = useRef(0)
  const pendingImageRef = useRef<File | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  const {
    paths, notes, images,
    currentColor, currentLineWidth, userName, onlineCount,
    addPath, appendPoint, addNote, moveNote, editNote, deleteNote,
    addImage, moveImage, deleteImage, clearCanvas,
    setOnlineCount, initState, isDrawing, setDrawing,
    currentPathId, setCurrentPath,
  } = useCanvasStore()

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    paths.forEach((path) => {
      if (path.points.length < 1) return
      ctx.strokeStyle = path.color
      ctx.lineWidth = path.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(path.points[0].x, path.points[0].y)
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y)
      }
      ctx.stroke()
    })
  }, [paths])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      redrawCanvas()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [redrawCanvas])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  useEffect(() => {
    if (!userName || !meetingId) {
      navigate('/')
      return
    }

    const socket = io()
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join', { meetingId, userName })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('joined', ({ state }: { userId: string; state: CanvasState }) => {
      initState(state)
    })

    socket.on('userCount', (count: number) => {
      setOnlineCount(count)
    })

    socket.on('draw:start', (data: { pathId: string; color: string; lineWidth: number; point: Point }) => {
      const path: PathData = {
        id: data.pathId,
        color: data.color,
        lineWidth: data.lineWidth,
        points: [data.point],
      }
      addPath(path)
    })

    socket.on('draw:continue', (data: { pathId: string; point: Point }) => {
      appendPoint(data.pathId, data.point)
    })

    socket.on('note:add', (note: StickyNoteData) => {
      addNote(note)
    })

    socket.on('note:move', (data: { id: string; x: number; y: number }) => {
      moveNote(data.id, data.x, data.y)
    })

    socket.on('note:edit', (data: { id: string; text: string }) => {
      editNote(data.id, data.text)
    })

    socket.on('note:delete', (data: { id: string }) => {
      deleteNote(data.id)
    })

    socket.on('image:add', (image: ImageData) => {
      addImage(image)
    })

    socket.on('image:move', (data: { id: string; x: number; y: number }) => {
      moveImage(data.id, data.x, data.y)
    })

    socket.on('image:delete', (data: { id: string }) => {
      deleteImage(data.id)
    })

    socket.on('canvas:clear', () => {
      clearCanvas()
    })

    socket.on('error', ({ message }: { message: string }) => {
      setErrorMsg(message)
      setTimeout(() => setErrorMsg(''), 3000)
    })

    return () => {
      socket.disconnect()
    }
  }, [meetingId, userName, navigate, initState, setOnlineCount, addPath, appendPoint, addNote, moveNote, editNote, deleteNote, addImage, moveImage, deleteImage, clearCanvas])

  const getCanvasPoint = (e: React.MouseEvent): Point => {
    return { x: e.clientX, y: e.clientY }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (pendingImageRef.current) return

    const point = getCanvasPoint(e)
    const pathId = uuidv4()
    setCurrentPath(pathId)
    setDrawing(true)

    const path: PathData = {
      id: pathId,
      color: currentColor,
      lineWidth: currentLineWidth,
      points: [point],
    }
    addPath(path)
    lastDrawTimeRef.current = Date.now()

    socketRef.current?.emit('draw:start', {
      pathId,
      color: currentColor,
      lineWidth: currentLineWidth,
      point,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentPathId) return

    const now = Date.now()
    if (now - lastDrawTimeRef.current < 20) return
    lastDrawTimeRef.current = now

    const point = getCanvasPoint(e)
    appendPoint(currentPathId, point)
    socketRef.current?.emit('draw:continue', { pathId: currentPathId, point })
  }

  const handleMouseUp = () => {
    if (isDrawing) {
      setDrawing(false)
      setCurrentPath(null)
    }
  }

  const handleAddNote = () => {
    const id = uuidv4()
    const x = window.innerWidth / 2 - 75
    const y = window.innerHeight / 2 - 75
    const note: StickyNoteData = { id, x, y, text: '' }
    addNote(note)
    socketRef.current?.emit('note:add', note)
  }

  const handleNoteMove = (id: string, x: number, y: number) => {
    moveNote(id, x, y)
    socketRef.current?.emit('note:move', { id, x, y })
  }

  const handleNoteEdit = (id: string, text: string) => {
    editNote(id, text)
    socketRef.current?.emit('note:edit', { id, text })
  }

  const handleNoteDelete = (id: string) => {
    deleteNote(id)
    socketRef.current?.emit('note:delete', { id })
  }

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('图片大小不能超过2MB')
      setTimeout(() => setErrorMsg(''), 3000)
      e.target.value = ''
      return
    }
    if (!file.type.startsWith('image/')) {
      setErrorMsg('请选择PNG或JPG格式的图片')
      setTimeout(() => setErrorMsg(''), 3000)
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > 300) {
          const ratio = 300 / width
          width = 300
          height = height * ratio
        }
        const id = uuidv4()
        const x = window.innerWidth / 2 - width / 2
        const y = window.innerHeight / 2 - height / 2
        const imageData: ImageData = { id, x, y, src, width, height }
        addImage(imageData)
        socketRef.current?.emit('image:add', imageData)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleImageMove = (id: string, x: number, y: number) => {
    moveImage(id, x, y)
    socketRef.current?.emit('image:move', { id, x, y })
  }

  const handleImageDelete = (id: string) => {
    deleteImage(id)
    socketRef.current?.emit('image:delete', { id })
  }

  const handleClearCanvas = () => {
    if (window.confirm('确定要清空画布吗？此操作不可撤销。')) {
      clearCanvas()
      socketRef.current?.emit('canvas:clear')
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#FFFFFF' }}>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 50,
        background: '#ECF0F1',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <button
          onClick={handleBack}
          style={{
            padding: '6px 12px',
            background: '#95A5A6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            marginRight: 16,
          }}
        >
          ← 返回
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#34495E', fontWeight: 600 }}>会议ID:</span>
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#2C3E50',
            letterSpacing: 2,
            background: '#fff',
            padding: '4px 10px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}>
            {meetingId}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isConnected ? '#2ECC71' : '#E74C3C',
          }} />
          <span style={{ fontSize: 14, color: '#34495E' }}>
            在线: {onlineCount}
          </span>
        </div>
        <div style={{ marginLeft: 20, fontSize: 14, color: '#7F8C8D' }}>
          用户: {userName}
        </div>
      </div>

      <Toolbar
        onAddNote={handleAddNote}
        onUploadImage={handleUploadImage}
        onClearCanvas={handleClearCanvas}
        imageInputRef={imageInputRef}
      />

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: 'crosshair',
        }}
      />

      {notes.map((note) => (
        <StickyNote
          key={note.id}
          note={note}
          onMove={handleNoteMove}
          onEdit={handleNoteEdit}
          onDelete={handleNoteDelete}
        />
      ))}

      {images.map((image) => (
        <ImageItem
          key={image.id}
          image={image}
          onMove={handleImageMove}
          onDelete={handleImageDelete}
        />
      ))}

      {errorMsg && (
        <div style={{
          position: 'fixed',
          top: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#E74C3C',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: 6,
          fontSize: 14,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {errorMsg}
        </div>
      )}
    </div>
  )
}

function ImageItem({
  image,
  onMove,
  onDelete,
}: {
  image: ImageData
  onMove: (id: string, x: number, y: number) => void
  onDelete: (id: string) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - image.x,
      y: e.clientY - image.y,
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.current.x
      const newY = e.clientY - dragOffset.current.y
      onMove(image.id, newX, newY)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, image.id, onMove])

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(image.id)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: image.x,
        top: image.y,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 5,
        userSelect: 'none',
      }}
    >
      <button
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          width: 24,
          height: 24,
          background: '#E74C3C',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: '24px',
          textAlign: 'center',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        ×
      </button>
      <img
        src={image.src}
        alt=""
        style={{
          width: image.width,
          height: image.height,
          display: 'block',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
        draggable={false}
      />
    </div>
  )
}
