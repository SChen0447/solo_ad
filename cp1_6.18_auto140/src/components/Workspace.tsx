import React, { useState, useRef, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { usePuzzleStore } from '../store/usePuzzleStore'
import { splitImage, shufflePieces, type PuzzlePiece } from '../utils/puzzleSplitter'
import {
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  triggerScalePulse,
  createInitialDragState
} from '../utils/dragHandler'
import './Workspace.css'

interface WorkspaceProps {
  mode: 'single' | 'collaborative'
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
  maxLife: number
}

const Workspace: React.FC<WorkspaceProps> = ({ mode }) => {
  const {
    roomCode,
    userId,
    nickname,
    users,
    imageDataUrl,
    gridSize,
    pieces,
    imageWidth,
    imageHeight,
    offsetX,
    offsetY,
    dragState,
    remoteDrags,
    isComplete,
    showPreview,
    showAllPieces,
    isAnimating,
    setMode,
    setRoomCode,
    setUserId,
    setNickname,
    setUsers,
    setImageDataUrl,
    setGridSize,
    setPieces,
    setImageDimensions,
    updatePiecePosition,
    placePiece,
    setDragState,
    addRemoteDrag,
    updateRemoteDrag,
    removeRemoteDrag,
    setIsComplete,
    setShowPreview,
    setShowAllPieces,
    setIsAnimating,
    resetPuzzle
  } = usePuzzleStore()

  const [joinCode, setJoinCode] = useState('')
  const [inputNickname, setInputNickname] = useState(nickname)
  const [error, setError] = useState<string | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [showVictory, setShowVictory] = useState(false)

  const workspaceRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement>(null)
  const pieceRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    setMode(mode)
    if (mode === 'collaborative' && !socketRef.current) {
      socketRef.current = io('http://localhost:3001', {
        transports: ['websocket', 'polling']
      })

      const socket = socketRef.current

      socket.on('connect', () => {
        console.log('Connected to server')
      })

      socket.on('room-created', (data: { roomCode: string; userId: string; users: any[] }) => {
        setRoomCode(data.roomCode)
        setUserId(data.userId)
        setUsers(data.users)
        setError(null)
      })

      socket.on('joined-room', (data: {
        roomCode: string
        userId: string
        users: any[]
        imageDataUrl: string | null
        gridSize: number
        pieces: PuzzlePiece[]
      }) => {
        setRoomCode(data.roomCode)
        setUserId(data.userId)
        setUsers(data.users)
        if (data.imageDataUrl) {
          setImageDataUrl(data.imageDataUrl)
          setGridSize(data.gridSize)
          setPieces(data.pieces)
        }
        setError(null)
      })

      socket.on('user-joined', (data: { users: any[] }) => {
        setUsers(data.users)
      })

      socket.on('user-left', (data: { users: any[] }) => {
        setUsers(data.users)
      })

      socket.on('image-updated', (data: {
        imageDataUrl: string
        gridSize: number
        pieces: PuzzlePiece[]
      }) => {
        setImageDataUrl(data.imageDataUrl)
        setGridSize(data.gridSize)
        setPieces(data.pieces)
      })

      socket.on('piece-moved', (data: {
        pieceId: string
        x: number
        y: number
        rotation: number
        userId: string
      }) => {
        if (data.userId !== userId) {
          updatePiecePosition(data.pieceId, data.x, data.y, data.rotation)
        }
      })

      socket.on('piece-placed', (data: { pieceId: string; userId: string }) => {
        placePiece(data.pieceId, data.userId)
        checkCompletion()
      })

      socket.on('drag-start', (data: { pieceId: string; userId: string; x: number; y: number }) => {
        if (data.userId !== userId) {
          addRemoteDrag(data.pieceId, data.userId, data.x, data.y)
        }
      })

      socket.on('drag-move', (data: { pieceId: string; userId: string; x: number; y: number }) => {
        if (data.userId !== userId) {
          updateRemoteDrag(data.pieceId, data.x, data.y)
          updatePiecePosition(data.pieceId, data.x, data.y)
        }
      })

      socket.on('drag-end', (data: { pieceId: string; userId: string }) => {
        if (data.userId !== userId) {
          removeRemoteDrag(data.pieceId)
        }
      })

      socket.on('puzzle-complete', () => {
        triggerVictoryEffect()
      })

      socket.on('state-synced', (data: any) => {
        setUsers(data.users)
        if (data.imageDataUrl) {
          setImageDataUrl(data.imageDataUrl)
          setGridSize(data.gridSize)
          setPieces(data.pieces)
        }
      })

      socket.on('error', (data: { message: string }) => {
        setError(data.message)
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from server')
      })
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [mode, userId])

  const checkCompletion = useCallback(() => {
    const currentPieces = usePuzzleStore.getState().pieces
    if (currentPieces.length > 0 && currentPieces.every(p => p.isPlaced)) {
      setIsComplete(true)
      triggerVictoryEffect()
    }
  }, [setIsComplete])

  const createParticles = (centerX: number, centerY: number) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
    const newParticles: Particle[] = []
    
    for (let i = 0; i < 100; i++) {
      const angle = (Math.PI * 2 * i) / 100 + Math.random() * 0.5
      const speed = 2 + Math.random() * 8
      newParticles.push({
        id: Date.now() + i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 6,
        life: 1,
        maxLife: 60 + Math.random() * 60
      })
    }
    
    setParticles(prev => [...prev, ...newParticles])
  }

  const animateParticles = useCallback(() => {
    const canvas = particleCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    setParticles(prev => {
      const updated = prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.15,
        life: p.life - 1 / p.maxLife
      })).filter(p => p.life > 0)

      updated.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life
        ctx.fill()
        ctx.globalAlpha = 1
      })

      if (updated.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animateParticles)
      }

      return updated
    })
  }, [])

  const triggerVictoryEffect = () => {
    setShowVictory(true)
    setIsAnimating(true)
    
    const rect = workspaceRef.current?.getBoundingClientRect()
    if (rect && particleCanvasRef.current) {
      particleCanvasRef.current.width = rect.width
      particleCanvasRef.current.height = rect.height
      createParticles(rect.width / 2, rect.height / 2)
      animateParticles()
    }

    setTimeout(() => {
      setShowVictory(false)
      setIsAnimating(false)
    }, 5000)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('请上传 jpg、png 或 webp 格式的图片')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB')
      return
    }

    setError(null)
    setIsAnimating(true)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string
      setImageDataUrl(dataUrl)

      const rect = workspaceRef.current?.getBoundingClientRect()
      if (!rect) return

      const result = await splitImage(dataUrl, gridSize, rect.width, rect.height)
      
      const offsetX = (rect.width - result.imageWidth) / 2
      const offsetY = (rect.height - result.imageHeight) / 2
      
      setImageDimensions(result.imageWidth, result.imageHeight, offsetX, offsetY)
      setPieces(result.pieces)
      setIsComplete(false)
      setIsAnimating(false)

      if (mode === 'collaborative' && socketRef.current && roomCode) {
        socketRef.current.emit('update-image', {
          roomCode,
          imageDataUrl: dataUrl,
          gridSize,
          pieces: result.pieces
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleGridSizeChange = (value: number) => {
    setGridSize(value)
    if (imageDataUrl && workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect()
      splitImage(imageDataUrl, value, rect.width, rect.height).then(result => {
        const offsetX = (rect.width - result.imageWidth) / 2
        const offsetY = (rect.height - result.imageHeight) / 2
        setImageDimensions(result.imageWidth, result.imageHeight, offsetX, offsetY)
        setPieces(result.pieces)
        setIsComplete(false)
      })
    }
  }

  const handleShuffle = () => {
    if (pieces.length === 0 || !workspaceRef.current) return
    const rect = workspaceRef.current.getBoundingClientRect()
    const shuffled = shufflePieces(pieces, rect.width, rect.height)
    setPieces(shuffled)
    setIsComplete(false)
  }

  const createRoom = () => {
    if (socketRef.current && inputNickname.trim()) {
      setNickname(inputNickname)
      socketRef.current.emit('create-room', { nickname: inputNickname.trim() })
    }
  }

  const joinRoom = () => {
    if (socketRef.current && inputNickname.trim() && joinCode.trim().length === 6) {
      setNickname(inputNickname)
      socketRef.current.emit('join-room', {
        roomCode: joinCode.trim(),
        nickname: inputNickname.trim()
      })
    }
  }

  const onPieceMouseDown = (e: React.MouseEvent | React.TouchEvent, piece: PuzzlePiece) => {
    if (piece.isPlaced || isAnimating) return
    e.preventDefault()

    const rect = workspaceRef.current?.getBoundingClientRect()
    if (!rect) return

    const newDragState = handleDragStart(e, piece, rect)
    setDragState(newDragState)

    if (mode === 'collaborative' && socketRef.current && roomCode && userId) {
      socketRef.current.emit('drag-start', {
        roomCode,
        pieceId: piece.id,
        userId,
        x: newDragState.currentX,
        y: newDragState.currentY
      })
    }
  }

  useEffect(() => {
    if (!dragState.isDragging || !dragState.pieceId) return

    const piece = pieces.find(p => p.id === dragState.pieceId)
    if (!piece) return

    const rect = workspaceRef.current?.getBoundingClientRect()
    if (!rect) return

    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      const result = handleDragMove(e, dragState, piece, pieces, rect)
      const newPath = [...dragState.path, { x: result.newX, y: result.newY }].slice(-100)
      updatePiecePosition(piece.id, result.newX, result.newY, 0)
      setDragState({ currentX: result.newX, currentY: result.newY, path: newPath })

      if (mode === 'collaborative' && socketRef.current && roomCode && userId) {
        socketRef.current.emit('drag-move', {
          roomCode,
          pieceId: piece.id,
          userId,
          x: result.newX,
          y: result.newY
        })
      }
    }

    const onMouseUp = (e: MouseEvent | TouchEvent) => {
      let clientX: number, clientY: number
      if ('changedTouches' in e) {
        clientX = e.changedTouches[0].clientX
        clientY = e.changedTouches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }

      const x = clientX - rect.left
      const y = clientY - rect.top
      const finalX = x - dragState.offsetX
      const finalY = y - dragState.offsetY

      const result = handleDragEnd(piece, finalX, finalY)
      
      if (result.isPlaced) {
        placePiece(piece.id)
        updatePiecePosition(piece.id, result.x, result.y, 0)
        
        const pieceElement = pieceRefs.current.get(piece.id)
        if (pieceElement) {
          triggerScalePulse(pieceElement)
        }

        if (mode === 'collaborative' && socketRef.current && roomCode && userId) {
          socketRef.current.emit('piece-placed', {
            roomCode,
            pieceId: piece.id,
            userId
          })
        }
        
        checkCompletion()
      } else {
        updatePiecePosition(piece.id, result.x, result.y)
      }

      setDragState(createInitialDragState())

      if (mode === 'collaborative' && socketRef.current && roomCode && userId) {
        socketRef.current.emit('drag-end', {
          roomCode,
          pieceId: piece.id,
          userId
        })
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onMouseMove, { passive: false })
    window.addEventListener('touchend', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onMouseMove)
      window.removeEventListener('touchend', onMouseUp)
    }
  }, [dragState.isDragging, dragState.pieceId, dragState.offsetX, dragState.offsetY])

  const renderRemoteDragPaths = () => {
    return Array.from(remoteDrags.values()).map(drag => {
      if (drag.path.length < 2) return null
      const pathData = drag.path.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
      ).join(' ')

      return (
        <svg
          key={drag.pieceId}
          className="remote-drag-path"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}
        >
          <path
            d={pathData}
            stroke="rgba(66, 153, 225, 0.5)"
            strokeWidth="2"
            strokeDasharray="5,5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      )
    })
  }

  const renderMyDragPath = () => {
    if (!dragState.isDragging || dragState.path?.length < 2) return null
    const pathData = dragState.path.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ')

    return (
      <svg
        className="my-drag-path"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 99 }}
      >
        <path
          d={pathData}
          stroke="rgba(72, 187, 120, 0.8)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <div className="workspace-container">
      <canvas ref={particleCanvasRef} className="particle-canvas" />
      
      {mode === 'collaborative' && !roomCode && (
        <div className="collab-modal">
          <div className="collab-modal-content">
            <h2>协作模式</h2>
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                value={inputNickname}
                onChange={(e) => setInputNickname(e.target.value)}
                placeholder="请输入你的昵称"
                maxLength={12}
              />
            </div>
            <div className="collab-actions">
              <button className="btn-primary" onClick={createRoom}>
                创建房间
              </button>
              <div className="join-room">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="输入6位房间码"
                  maxLength={6}
                />
                <button className="btn-secondary" onClick={joinRoom}>
                  加入房间
                </button>
              </div>
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      )}

      {mode === 'collaborative' && roomCode && (
        <div className="top-bar">
          <div className="room-info">
            <span className="room-code">房间码: {roomCode}</span>
            <span className="user-count">
              在线: {users.length} 人
            </span>
          </div>
          <div className="user-list">
            {users.map(user => (
              <span key={user.id} className={`user-badge ${user.id === userId ? 'me' : ''}`}>
                {user.nickname}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="main-content">
        <div 
          ref={workspaceRef}
          className="puzzle-workspace"
          onContextMenu={(e) => e.preventDefault()}
        >
          {!imageDataUrl ? (
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-icon">📷</div>
              <h3>点击上传图片</h3>
              <p>支持 JPG、PNG、WebP 格式，最大 10MB</p>
            </div>
          ) : (
            <>
              <div 
                className="target-outline"
                style={{
                  left: offsetX,
                  top: offsetY,
                  width: imageWidth,
                  height: imageHeight
                }}
              />
              
              {pieces.map((piece, index) => (
                <div
                  key={piece.id}
                  ref={(el) => { if (el) pieceRefs.current.set(piece.id, el) }}
                  className={`puzzle-piece ${piece.isPlaced ? 'placed' : ''} ${dragState.pieceId === piece.id ? 'dragging' : ''}`}
                  style={{
                    left: piece.x,
                    top: piece.y,
                    width: piece.width,
                    height: piece.height,
                    transform: `rotate(${piece.isPlaced ? 0 : piece.rotation}deg)`,
                    zIndex: dragState.pieceId === piece.id ? 1000 : (piece.isPlaced ? 10 : 100 + index),
                    animationDelay: `${index * 0.03}s`
                  }}
                  onMouseDown={(e) => onPieceMouseDown(e, piece)}
                  onTouchStart={(e) => onPieceMouseDown(e, piece)}
                >
                  <img
                    src={piece.imageDataUrl}
                    alt={`Piece ${piece.row}-${piece.col}`}
                    draggable={false}
                  />
                </div>
              ))}
              
              {renderRemoteDragPaths()}
              {renderMyDragPath()}
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

        <div className="side-panel">
          <div className="panel-section">
            <h3>难度设置</h3>
            <div className="slider-container">
              <input
                type="range"
                min="3"
                max="5"
                step="1"
                value={gridSize}
                onChange={(e) => handleGridSizeChange(Number(e.target.value))}
                disabled={!imageDataUrl}
              />
              <span className="grid-size-label">{gridSize} × {gridSize}</span>
            </div>
          </div>

          <div className="panel-section">
            <button 
              className="btn-primary full-width"
              onClick={() => fileInputRef.current?.click()}
            >
              📷 上传图片
            </button>
            <button 
              className="btn-secondary full-width"
              onClick={handleShuffle}
              disabled={pieces.length === 0}
            >
              🔀 重新打乱
            </button>
            <button 
              className="btn-secondary full-width"
              onClick={resetPuzzle}
              disabled={pieces.length === 0}
            >
              🗑️ 清除拼图
            </button>
          </div>

          {showPreview && imageDataUrl && (
            <div 
              className="panel-section preview-section"
              onClick={() => setShowAllPieces(!showAllPieces)}
            >
              <h3>预览 {showAllPieces ? '(全览)' : ''}</h3>
              <div className="preview-container">
                <img 
                  src={imageDataUrl} 
                  alt="Preview" 
                  className={`preview-image ${showAllPieces ? 'show-all' : ''}`}
                />
                <div className="preview-overlay">
                  {pieces.map(piece => (
                    <div
                      key={piece.id}
                      className={`preview-piece ${piece.isPlaced ? 'placed' : ''}`}
                      style={{
                        left: `${(piece.col / gridSize) * 100}%`,
                        top: `${(piece.row / gridSize) * 100}%`,
                        width: `${100 / gridSize}%`,
                        height: `${100 / gridSize}%`
                      }}
                    />
                  ))}
                </div>
              </div>
              <p className="preview-hint">点击切换全览模式</p>
            </div>
          )}

          <div className="panel-section stats-section">
            <h3>进度</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${pieces.length > 0 ? (pieces.filter(p => p.isPlaced).length / pieces.length) * 100 : 0}%` 
                }}
              />
            </div>
            <p>
              {pieces.filter(p => p.isPlaced).length} / {pieces.length} 块
            </p>
          </div>
        </div>
      </div>

      {showVictory && (
        <div className="victory-overlay">
          <div className="victory-content">
            <h1>🎉 拼图完成！</h1>
            <p>太棒了！你成功还原了原图</p>
            <button className="btn-primary" onClick={() => setShowVictory(false)}>
              继续
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Workspace
