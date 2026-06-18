import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { BorderStyle, LayoutMode } from './Toolbar'

export interface ImageItem {
  id: string
  thumbnail: string
  original: string
}

interface PuzzleCanvasProps {
  images: ImageItem[]
  backgroundColor: string
  borderStyle: BorderStyle
  layoutMode: LayoutMode
  onImagesReorder: (newImages: ImageItem[]) => void
  onImageUpload: (files: File[]) => void
  canvasRef: React.RefObject<HTMLDivElement | null>
}

const CELL_SIZE = 100
const CANVAS_WIDTH = 1000
const PADDING = 20

const PuzzleCanvas: React.FC<PuzzleCanvasProps> = ({
  images,
  backgroundColor,
  borderStyle,
  layoutMode,
  onImagesReorder,
  onImageUpload,
  canvasRef
}) => {
  const gap = layoutMode === 'compact' ? 8 : 20
  const cellsPerRow = Math.floor((CANVAS_WIDTH - PADDING * 2 + gap) / (CELL_SIZE + gap))
  const actualCellWidth = (CANVAS_WIDTH - PADDING * 2 - gap * (cellsPerRow - 1)) / cellsPerRow

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getPosition = useCallback((index: number) => {
    const col = index % cellsPerRow
    const row = Math.floor(index / cellsPerRow)
    return {
      x: PADDING + col * (actualCellWidth + gap),
      y: PADDING + row * (actualCellWidth + gap)
    }
  }, [cellsPerRow, actualCellWidth, gap])

  const totalRows = images.length === 0 ? 1 : Math.ceil(images.length / cellsPerRow)
  const canvasHeight = Math.max(PADDING * 2 + totalRows * actualCellWidth + (totalRows - 1) * gap, 300)

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggingIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(img, 0, 0)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }, [dragOverIndex])

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - actualCellWidth / 2
      const y = e.clientY - rect.top - actualCellWidth / 2
      setDragPosition({ x, y })

      const col = Math.max(0, Math.min(cellsPerRow - 1, Math.floor((x - PADDING) / (actualCellWidth + gap))))
      const row = Math.max(0, Math.floor((y - PADDING) / (actualCellWidth + gap)))
      let targetIndex = row * cellsPerRow + col
      targetIndex = Math.min(targetIndex, images.length - 1)
      if (targetIndex >= 0 && dragOverIndex !== targetIndex) {
        setDragOverIndex(targetIndex)
      }
    }
  }, [canvasRef, actualCellWidth, cellsPerRow, gap, images.length, dragOverIndex])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (draggingIndex === null) return

    const fromIndex = draggingIndex
    let toIndex = dragOverIndex

    if (toIndex === null && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const col = Math.max(0, Math.min(cellsPerRow - 1, Math.floor((x - PADDING) / (actualCellWidth + gap))))
      const row = Math.max(0, Math.floor((y - PADDING) / (actualCellWidth + gap)))
      toIndex = Math.min(row * cellsPerRow + col, images.length - 1)
    }

    if (toIndex === null || fromIndex === toIndex) {
      setDraggingIndex(null)
      setDragOverIndex(null)
      setDragPosition(null)
      return
    }

    setIsAnimating(true)
    const newImages = [...images]
    const [removed] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, removed)
    onImagesReorder(newImages)

    setTimeout(() => {
      setIsAnimating(false)
      setDraggingIndex(null)
      setDragOverIndex(null)
      setDragPosition(null)
    }, 300)
  }, [draggingIndex, dragOverIndex, images, cellsPerRow, actualCellWidth, gap, onImagesReorder, canvasRef])

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null)
    setDragOverIndex(null)
    setDragPosition(null)
  }, [])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'image/jpeg' || f.type === 'image/jpg' || f.type === 'image/png'
    )
    if (files.length > 0) {
      onImageUpload(files)
    }
    setDraggingIndex(null)
    setDragOverIndex(null)
    setDragPosition(null)
  }, [onImageUpload])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onImageUpload(files)
      e.target.value = ''
    }
  }, [onImageUpload])

  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 500)
    return () => clearTimeout(timer)
  }, [layoutMode])

  const getBorderStyle = (): React.CSSProperties => {
    switch (borderStyle) {
      case 'white-rounded':
        return {
          border: '2px solid #ffffff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }
      case 'gray-dashed':
        return {
          border: '1px dashed #9ca3af',
          borderRadius: 8
        }
      default:
        return {
          border: 'none',
          borderRadius: 4
        }
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 24, overflow: 'auto' }}>
      <div
        ref={canvasRef}
        onDragOver={handleCanvasDragOver}
        onDrop={(e) => {
          if (draggingIndex === null) {
            handleFileDrop(e)
          } else {
            handleDrop(e)
          }
        }}
        onClick={handleClick}
        style={{
          width: CANVAS_WIDTH,
          minHeight: canvasHeight,
          height: images.length === 0 ? 300 : canvasHeight,
          background: backgroundColor,
          borderRadius: 12,
          position: 'relative',
          transition: 'background-color 0.4s ease-out',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          cursor: images.length === 0 ? 'pointer' : 'default',
          overflow: 'hidden'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {images.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: '#9ca3af'
            }}
          >
            <div style={{ width: 64, height: 64, opacity: 0.4 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>点击或拖拽图片到此处上传</p>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>支持 JPG/PNG，单张不超过 5MB</p>
          </div>
        )}

        {images.map((image, index) => {
          const pos = getPosition(index)
          const isDragging = draggingIndex === index
          const transition = isAnimating || !isDragging

          let translateX = 0
          let translateY = 0
          if (dragOverIndex !== null && draggingIndex !== null && !isDragging) {
            const from = draggingIndex
            const to = dragOverIndex
            if (from < to) {
              if (index > from && index <= to) {
                translateX = -1 * (actualCellWidth + gap)
              }
            } else if (from > to) {
              if (index >= to && index < from) {
                translateX = actualCellWidth + gap
              }
            }
          }

          return (
            <div
              key={image.id}
              draggable={!isDragging}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                width: actualCellWidth,
                height: actualCellWidth,
                left: isDragging && dragPosition ? dragPosition.x : pos.x + translateX,
                top: isDragging && dragPosition ? dragPosition.y : pos.y + translateY,
                opacity: isDragging ? 0.5 : 1,
                zIndex: isDragging ? 100 : 1,
                transition: transition
                  ? 'left 0.3s ease-out, top 0.3s ease-out, transform 0.3s ease-out, opacity 0.15s ease-out'
                  : 'none',
                cursor: 'grab',
                userSelect: 'none',
                ...getBorderStyle(),
                overflow: 'hidden'
              }}
            >
              <img
                src={image.thumbnail}
                alt=""
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  pointerEvents: 'none'
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PuzzleCanvas
