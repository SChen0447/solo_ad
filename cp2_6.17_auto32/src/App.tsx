import { useState, useCallback, useEffect, DragEvent } from 'react'
import Gallery from './Gallery'
import Lightbox from './Lightbox'
import type { ImageItem } from './types'

const MAX_FILE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function App() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const generateId = () => Math.random().toString(36).substring(2, 11)

  const readImageFile = (file: File): Promise<ImageItem | null> => {
    return new Promise((resolve) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        resolve(null)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        resolve(null)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const img = new Image()
        img.onload = () => {
          resolve({
            id: generateId(),
            name: file.name,
            url: dataUrl,
            width: img.width,
            height: img.height,
            size: file.size,
            type: file.type,
          })
        }
        img.onerror = () => resolve(null)
        img.src = dataUrl
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })
  }

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const imageFiles = files.filter((file) => ALLOWED_TYPES.includes(file.type))
    if (imageFiles.length === 0) return

    const results = await Promise.all(imageFiles.map(readImageFile))
    const validImages = results.filter((img): img is ImageItem => img !== null)

    if (validImages.length > 0) {
      setImages((prev) => [...prev, ...validImages])
    }
  }, [])

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const handleCloseLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  const handlePrevImage = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null
      return prev === 0 ? images.length - 1 : prev - 1
    })
  }, [images.length])

  const handleNextImage = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null
      return prev === images.length - 1 ? 0 : prev + 1
    })
  }, [images.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return
      if (e.key === 'Escape') {
        handleCloseLightbox()
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage()
      } else if (e.key === 'ArrowRight') {
        handleNextImage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, handleCloseLightbox, handlePrevImage, handleNextImage])

  return (
    <div
      className="app"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="header">
        <h1 className="title">图览</h1>
      </header>

      <main className="main">
        {isDragging && (
          <div className="drop-zone-overlay">
            <div className="drop-zone">
              <p>拖拽图片到此处释放</p>
              <p className="drop-zone-hint">支持 JPG、PNG、WebP 格式，单张不超过 15MB</p>
            </div>
          </div>
        )}

        {images.length === 0 && !isDragging && (
          <div className="empty-state">
            <div className="empty-drop-zone">
              <p>拖拽图片到此处开始浏览</p>
              <p className="drop-zone-hint">支持 JPG、PNG、WebP 格式，单张不超过 15MB</p>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <Gallery images={images} onImageClick={handleImageClick} />
        )}
      </main>

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={handleCloseLightbox}
          onPrev={handlePrevImage}
          onNext={handleNextImage}
        />
      )}
    </div>
  )
}

export default App
