import { useState, useCallback, useEffect, useRef, memo } from 'react'
import type { ImageItem } from './types'

interface LightboxProps {
  images: ImageItem[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

const Lightbox = memo(function Lightbox({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: LightboxProps) {
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [imageKey, setImageKey] = useState(0)

  const dragStartX = useRef(0)
  const dragStartY = useRef(0)
  const initialOffsetX = useRef(0)
  const initialOffsetY = useRef(0)
  const rafId = useRef<number | null>(null)

  const currentImage = images[currentIndex]

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  useEffect(() => {
    setScale(1)
    setOffsetX(0)
    setOffsetY(0)
    setImageKey((prev) => prev + 1)
  }, [currentIndex])

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }

    rafId.current = requestAnimationFrame(() => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale((prev) => {
        const newScale = Math.max(0.5, Math.min(3, prev + delta))
        return newScale
      })
    })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartY.current = e.clientY
    initialOffsetX.current = offsetX
    initialOffsetY.current = offsetY
  }, [offsetX, offsetY])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    e.stopPropagation()

    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }

    rafId.current = requestAnimationFrame(() => {
      const dx = e.clientX - dragStartX.current
      const dy = e.clientY - dragStartY.current
      setOffsetX(initialOffsetX.current + dx)
      setOffsetY(initialOffsetY.current + dy)
    })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }
  }, [onClose])

  const handlePrevClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onPrev()
  }, [onPrev])

  const handleNextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onNext()
  }, [onNext])

  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  const transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`

  return (
    <div
      className={`lightbox-overlay ${isVisible ? 'visible' : ''}`}
      onClick={handleOverlayClick}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="lightbox-header">
        <span className="lightbox-info">
          {currentImage.name} · {currentIndex + 1}/{images.length}
        </span>
        <button
          className="lightbox-close"
          onClick={handleCloseClick}
          aria-label="关闭"
        >
          ×
        </button>
      </div>

      <button
        className="lightbox-nav lightbox-nav-prev"
        onClick={handlePrevClick}
        aria-label="上一张"
      >
        ‹
      </button>

      <div
        className="lightbox-image-container"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <img
          key={imageKey}
          src={currentImage.url}
          alt={currentImage.name}
          className="lightbox-image"
          style={{ transform }}
          draggable={false}
        />
      </div>

      <button
        className="lightbox-nav lightbox-nav-next"
        onClick={handleNextClick}
        aria-label="下一张"
      >
        ›
      </button>
    </div>
  )
})

export default Lightbox
