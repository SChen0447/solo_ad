import { useCallback, useState } from 'react'
import { useAppStore } from '../store'

const ImageUploader = () => {
  const [isDragging, setIsDragging] = useState(false)
  const setImageData = useAppStore(state => state.setImageData)

  const processFile = useCallback((file: File) => {
    if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
      alert('请上传 PNG 或 JPG 格式的图片')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        const maxSize = 1000
        let width = img.width
        let height = img.height

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const imageData = ctx.getImageData(0, 0, width, height)
          setImageData(imageData, src)
        }
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }, [setImageData])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  return (
    <div
      className={`upload-area ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div className="upload-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3498DB" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
      </div>
      <p className="upload-text">拖拽图片到此处，或点击上传</p>
      <p className="upload-hint">支持 PNG、JPG 格式</p>

      <style>{`
        .upload-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          border: 2px dashed #3498DB;
          border-radius: 12px;
          background: #ECF0F1;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }
        .upload-area:hover,
        .upload-area.dragging {
          border-color: #2C3E50;
          background: #EBF0F5;
          transform: scale(1.02);
        }
        .upload-icon {
          margin-bottom: 16px;
        }
        .upload-text {
          font-size: 18px;
          color: #2C3E50;
          margin: 0 0 8px 0;
          font-weight: 500;
        }
        .upload-hint {
          font-size: 14px;
          color: #7f8c8d;
          margin: 0;
        }
      `}</style>
    </div>
  )
}

export default ImageUploader
