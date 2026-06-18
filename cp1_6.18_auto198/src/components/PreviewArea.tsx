import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useProcessingStore } from '../store/processingStore'
import { processSingleImage, imageDataToDataUrl } from '../engine/imageProcessor'
import { RATIO_VALUES } from '../engine/types'


const containerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#121212',
  fontFamily: 'Inter, sans-serif',
  overflow: 'hidden',
}

const uploadZoneStyle = (isDragging: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '60px 40px',
  margin: '20px',
  border: `2px dashed ${isDragging ? '#1a73e8' : '#333'}`,
  borderRadius: '8px',
  backgroundColor: isDragging ? 'rgba(26, 115, 232, 0.1)' : '#1e1e1e',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
})

const uploadTextStyle: React.CSSProperties = {
  color: '#9e9e9e',
  fontSize: '14px',
  marginTop: '16px',
}

const uploadButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 32px',
  backgroundColor: '#1a73e8',
  color: '#ffffff',
  border: 'none',
  borderRadius: '2px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.1s ease',
}

const thumbnailGridStyle: React.CSSProperties = {
  height: '150px',
  padding: '16px 20px',
  display: 'flex',
  gap: '12px',
  overflowX: 'auto',
  overflowY: 'hidden',
  alignItems: 'center',
  borderBottom: '1px solid #333',
  flexShrink: 0,
}

const thumbnailStyle = (isSelected: boolean): React.CSSProperties => ({
  flex: '0 0 120px',
  width: '120px',
  height: '120px',
  borderRadius: '2px',
  border: isSelected ? '2px solid #1a73e8' : '2px solid #333',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'border-color 0.2s ease, transform 0.1s ease',
  position: 'relative',
  backgroundColor: '#1e1e1e',
})

const thumbnailImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const previewContainerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  position: 'relative',
  overflow: 'hidden',
}

const previewWrapperStyle: React.CSSProperties = {
  width: '600px',
  height: '400px',
  position: 'relative',
  backgroundColor: '#1e1e1e',
  borderRadius: '2px',
  border: '1px solid #333',
  overflow: 'hidden',
}

const previewImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  animation: 'fadeIn 0.3s ease',
}

const cropBoxStyle: React.CSSProperties = {
  position: 'absolute',
  border: '2px solid #ffffff',
  cursor: 'move',
  boxSizing: 'border-box',
  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
}

const handleStyle = (position: string): React.CSSProperties => ({
  position: 'absolute',
  width: '10px',
  height: '10px',
  backgroundColor: '#ffffff',
  borderRadius: '50%',
  cursor: position.includes('left') || position.includes('right') ? 'ew-resize' : 'ns-resize',
  ...(position === 'nw' || position === 'se' ? { cursor: 'nwse-resize' } : {}),
  ...(position === 'ne' || position === 'sw' ? { cursor: 'nesw-resize' } : {}),
  ...(position.includes('top') ? { top: '-5px' } : {}),
  ...(position.includes('bottom') ? { bottom: '-5px' } : {}),
  ...(position.includes('left') ? { left: '-5px' } : {}),
  ...(position.includes('right') ? { right: '-5px' } : {}),
  transform: 'translate(0, 0)',
})

const startButtonStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '24px',
  right: '24px',
  padding: '12px 32px',
  backgroundColor: '#1a73e8',
  color: '#ffffff',
  border: 'none',
  borderRadius: '2px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.1s ease',
  fontFamily: 'Inter, sans-serif',
}

const resultsOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(5px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 500,
  animation: 'fadeIn 0.3s ease',
}

const resultsPanelStyle: React.CSSProperties = {
  width: '600px',
  height: '400px',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '2px solid #333333',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  animation: 'fadeIn 0.3s ease',
}

const resultsTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#121212',
  marginBottom: '16px',
}

const resultsGridStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '12px',
  padding: '8px',
}

const resultItemStyle: React.CSSProperties = {
  aspectRatio: '1',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '1px solid #e0e0e0',
}

const resultImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const downloadButtonStyle: React.CSSProperties = {
  marginTop: '16px',
  padding: '12px 32px',
  backgroundColor: '#1a73e8',
  color: '#ffffff',
  border: 'none',
  borderRadius: '2px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'cursor',
  alignSelf: 'center',
  transition: 'all 0.1s ease',
  fontFamily: 'Inter, sans-serif',
}

const hiddenInputStyle: React.CSSProperties = {
  display: 'none',
}

export const PreviewArea: React.FC = () => {
  const {
    images,
    selectedImageId,
    params,
    uploadImages,
    selectImage,
    isProcessing,
    showResults,
    setShowResults,
    processedImages,
    imageCache,
    setCropOffset,
  } = useProcessingStore()

  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const [isResizingCrop, setIsResizingCrop] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const selectedImage = images.find((img) => img.id === selectedImageId)
  const selectedCache = selectedImageId ? imageCache.get(selectedImageId) : undefined

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null)
      setCropBox(null)
      return
    }

    const processed = processSingleImage(selectedImage.imageData, params, selectedCache?.cropOffset || null)
    const url = imageDataToDataUrl(processed)
    setPreviewUrl(url)
    setPreviewKey((prev) => prev + 1)
  }, [selectedImageId, params, selectedCache?.cropOffset])

  useEffect(() => {
    if (!selectedImage || !previewRef.current || !imageRef.current) return

    const img = imageRef.current
    const container = previewRef.current

    const imgRect = img.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    const displayWidth = img.naturalWidth
    const displayHeight = img.naturalHeight

    const ratio = RATIO_VALUES[params.cropRatio]

    let cropWidth: number
    let cropHeight: number

    if (displayWidth / displayHeight > ratio) {
      cropHeight = displayHeight
      cropWidth = cropHeight * ratio
    } else {
      cropWidth = displayWidth
      cropHeight = cropWidth / ratio
    }

    const scaleX = imgRect.width / displayWidth
    const scaleY = imgRect.height / displayHeight

    const offsetX = (imgRect.left - containerRect.left)
    const offsetY = (imgRect.top - containerRect.top)

    let cropX: number
    let cropY: number

    if (selectedCache?.cropOffset) {
      const srcRatio = selectedImage.imageData.width / selectedImage.imageData.height
      let srcCropWidth: number
      let srcCropHeight: number

      if (srcRatio > ratio) {
        srcCropHeight = selectedImage.imageData.height
        srcCropWidth = srcCropHeight * ratio
      } else {
        srcCropWidth = selectedImage.imageData.width
        srcCropHeight = srcCropWidth / ratio
      }

      const scaleToDisplay = imgRect.width / selectedImage.imageData.width
      cropX = offsetX + selectedCache.cropOffset.x * scaleToDisplay
      cropY = offsetY + selectedCache.cropOffset.y * scaleToDisplay
      cropWidth = srcCropWidth * scaleToDisplay
      cropHeight = srcCropHeight * scaleToDisplay
    } else {
      cropX = offsetX + (imgRect.width - cropWidth * scaleX) / 2
      cropY = offsetY + (imgRect.height - cropHeight * scaleY) / 2
      cropWidth = cropWidth * scaleX
      cropHeight = cropHeight * scaleY
    }

    setCropBox({ x: cropX, y: cropY, width: cropWidth, height: cropHeight })
  }, [selectedImageId, params.cropRatio, previewUrl])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      try {
        await uploadImages(files)
      } catch (err) {
        console.error('上传失败:', err)
        alert(err instanceof Error ? err.message : '上传失败')
      }
    }
  }, [uploadImages])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      try {
        await uploadImages(files)
      } catch (err) {
        console.error('上传失败:', err)
        alert(err instanceof Error ? err.message : '上传失败')
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [uploadImages])

  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    if (cropBox) {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingCrop(true)
      setDragStart({ x: e.clientX - cropBox.x, y: e.clientY - cropBox.y })
    }
  }, [cropBox])

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizingCrop(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!cropBox || !previewRef.current || !selectedImage || !selectedImageId) return
    if (!isDraggingCrop && !isResizingCrop) return

    const containerRect = previewRef.current.getBoundingClientRect()
    const img = imageRef.current
    if (!img) return
    const imgRect = img.getBoundingClientRect()

    const offsetX = imgRect.left - containerRect.left
    const offsetY = imgRect.top - containerRect.top

    const ratio = RATIO_VALUES[params.cropRatio]

    if (isDraggingCrop && dragStart) {
      let newX = e.clientX - containerRect.left - dragStart.x
      let newY = e.clientY - containerRect.top - dragStart.y

      newX = Math.max(offsetX, Math.min(offsetX + imgRect.width - cropBox.width, newX))
      newY = Math.max(offsetY, Math.min(offsetY + imgRect.height - cropBox.height, newY))

      const scaleToSource = selectedImage.imageData.width / imgRect.width
      const srcOffsetX = (newX - offsetX) * scaleToSource
      const srcOffsetY = (newY - offsetY) * scaleToSource

      setCropBox({ ...cropBox, x: newX, y: newY })
      setCropOffset(selectedImageId, { x: srcOffsetX, y: srcOffsetY })
    }

    if (isResizingCrop && dragStart) {
      const dx = e.clientX - dragStart.x

      let newWidth = cropBox.width + dx
      let newHeight = newWidth / ratio

      const maxWidth = imgRect.width
      const maxHeight = imgRect.height

      if (newWidth > maxWidth) {
        newWidth = maxWidth
        newHeight = newWidth / ratio
      }
      if (newHeight > maxHeight) {
        newHeight = maxHeight
        newWidth = newHeight * ratio
      }

      const minWidth = 50
      if (newWidth < minWidth) {
        newWidth = minWidth
        newHeight = newWidth / ratio
      }

      const scaleToSource = selectedImage.imageData.width / imgRect.width
      const srcOffsetX = (cropBox.x - offsetX) * scaleToSource
      const srcOffsetY = (cropBox.y - offsetY) * scaleToSource

      setCropBox({ ...cropBox, width: newWidth, height: newHeight })
      setCropOffset(selectedImageId, { x: srcOffsetX, y: srcOffsetY })
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [isDraggingCrop, isResizingCrop, dragStart, cropBox, selectedImage, selectedImageId, params.cropRatio, setCropOffset])

  const handleMouseUp = useCallback(() => {
    setIsDraggingCrop(false)
    setIsResizingCrop(false)
    setDragStart(null)
  }, [])

  useEffect(() => {
    if (isDraggingCrop || isResizingCrop) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingCrop, isResizingCrop, handleMouseMove, handleMouseUp])

  if (images.length === 0) {
    return (
      <div style={containerStyle}>
        <div
          style={uploadZoneStyle(isDragging)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: '48px', color: '#1a73e8', marginBottom: '16px' }}>📷</div>
          <div style={{ fontSize: '16px', color: '#e0e0e0', fontWeight: 500 }}>
            点击或拖拽图片到此处上传
          </div>
          <div style={uploadTextStyle}>
            支持 JPG/PNG 格式，单张不超过 8MB，最多 50 张
          </div>
          <button
            style={uploadButtonStyle}
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            选择图片
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          style={hiddenInputStyle}
          onChange={handleFileSelect}
        />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={thumbnailGridStyle}>
      {images.map((img) => (
        <div
          key={img.id}
          style={thumbnailStyle(img.id === selectedImageId)}
          onClick={() => selectImage(img.id)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ffffff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = img.id === selectedImageId ? '#1a73e8' : '#333'
          }}
        >
          <img src={img.previewUrl} alt={img.fileName} style={thumbnailImageStyle} />
        </div>
      ))}
    </div>

      <div style={previewContainerStyle}>
        <div ref={previewRef} style={previewWrapperStyle}>
          {previewUrl && (
            <img
              ref={imageRef}
              key={previewKey}
              src={previewUrl}
              alt="预览"
              style={previewImageStyle}
              draggable={false}
            />
          )}
          {cropBox && selectedImageId && (
            <div
              style={{
                ...cropBoxStyle,
                left: cropBox.x,
                top: cropBox.y,
                width: cropBox.width,
                height: cropBox.height,
              }}
              onMouseDown={handleCropMouseDown}
            >
              <div style={handleStyle('nw')} onMouseDown={(e) => handleResizeMouseDown(e)} />
              <div style={handleStyle('ne')} onMouseDown={(e) => handleResizeMouseDown(e)} />
              <div style={handleStyle('sw')} onMouseDown={(e) => handleResizeMouseDown(e)} />
              <div style={handleStyle('se')} onMouseDown={(e) => handleResizeMouseDown(e)}
            </div>
          )}
        </div>

        <button
          style={startButtonStyle}
          disabled={isProcessing}
          onMouseDown={(e) => {
            if (!isProcessing) e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) e.currentTarget.style.backgroundColor = '#1557b0'
          }}
          onClick={() => {
            const { startProcessing } = useProcessingStore.getState()
            startProcessing()
          }}
        >
          {isProcessing ? '处理中...' : '开始处理'}
        </button>
      </div>

      {showResults && (
        <div style={resultsOverlayStyle}>
          <div style={resultsPanelStyle}>
            <h3 style={resultsTitleStyle}>处理完成！</h3>
            <div style={resultsGridStyle}>
              {processedImages.map((img) => {
                const url = URL.createObjectURL(img.processedBlob)
                return (
                  <div key={img.id} style={resultItemStyle}>
                    <img src={url} alt={img.fileName} style={resultImageStyle} />
                  </div>
                )
              })}
            </div>
            <button
              style={downloadButtonStyle}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1557b0'
              }}
              onClick={() => {
                const { downloadAll } = useProcessingStore.getState()
                downloadAll()
              }}
            >
              全部下载
            </button>
            <button
              style={{
                ...downloadButtonStyle,
                backgroundColor: '#666',
                marginTop: '8px',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onClick={() => setShowResults(false)}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        style={hiddenInputStyle}
        onChange={handleFileSelect}
      />

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        ::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  )
}
