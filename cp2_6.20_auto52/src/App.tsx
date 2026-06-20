import React, { useState, useRef, useCallback, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { processStyle, shareImage, base64ToFile } from './services/styleProcessor'
import './App.css'

interface StyleOption {
  id: string
  name: string
  nameEn: string
  color: string
  gradient: string
}

const styleOptions: StyleOption[] = [
  { id: 'watercolor', name: '水彩', nameEn: 'Watercolor', color: '#87CEEB', gradient: 'linear-gradient(135deg, #87CEEB, #98D8C8)' },
  { id: 'oil', name: '油画', nameEn: 'Oil', color: '#CD853F', gradient: 'linear-gradient(135deg, #CD853F, #DEB887)' },
  { id: 'sketch', name: '素描', nameEn: 'Sketch', color: '#808080', gradient: 'linear-gradient(135deg, #808080, #A9A9A9)' },
  { id: 'pixel', name: '像素风', nameEn: 'Pixel Art', color: '#FF6B6B', gradient: 'linear-gradient(135deg, #FF6B6B, #FF8E53)' },
  { id: 'impressionism', name: '印象派', nameEn: 'Impressionism', color: '#9370DB', gradient: 'linear-gradient(135deg, #9370DB, #BA55D3)' },
]

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [processedImage, setProcessedImage] = useState<string>('')
  const [selectedStyle, setSelectedStyle] = useState<string>('watercolor')
  const [intensity, setIntensity] = useState(75)
  const [contrast, setContrast] = useState(0)
  const [detail, setDetail] = useState(100)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isImageFading, setIsImageFading] = useState(false)
  const [flashBorder, setFlashBorder] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const styleScrollRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }, [])

  const triggerConfetti = useCallback((x: number, y: number) => {
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: ['#FFD700', '#FFA500', '#FFEC8B'],
      ticks: 30,
      gravity: 1.2,
      startVelocity: 25,
    })
  }, [])

  const processImage = useCallback(async () => {
    if (!imageFile || !selectedStyle) return

    setIsProcessing(true)

    try {
      const data = await processStyle(imageFile, {
        style: selectedStyle,
        intensity,
        contrast,
        detail,
      })

      if (data.success) {
        setIsImageFading(true)
        setTimeout(() => {
          setProcessedImage(data.image)
          setIsImageFading(false)
        }, 150)
      }
    } catch (error) {
      console.error('Processing error:', error)
      showToastMessage('处理失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }, [imageFile, selectedStyle, intensity, contrast, detail, showToastMessage])

  const debouncedProcessImage = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      processImage()
    }, 300)
  }, [processImage])

  useEffect(() => {
    if (imageFile && selectedStyle) {
      debouncedProcessImage()
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [intensity, contrast, detail, selectedStyle, imageFile, debouncedProcessImage])

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToastMessage('请上传图片文件')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
      setProcessedImage('')
    }
    reader.readAsDataURL(file)
  }, [showToastMessage])

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
    
    setFlashBorder(true)
    setTimeout(() => setFlashBorder(false), 150)
    setTimeout(() => {
      setFlashBorder(true)
      setTimeout(() => setFlashBorder(false), 150)
    }, 150)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleStyleSelect = useCallback((style: StyleOption, e: React.MouseEvent) => {
    setSelectedStyle(style.id)
    triggerConfetti(e.clientX, e.clientY)
  }, [triggerConfetti])

  const handleSave = useCallback(() => {
    if (!processedImage) return

    const link = document.createElement('a')
    link.download = `style-${selectedStyle}-${Date.now()}.png`
    link.href = processedImage
    link.click()
    showToastMessage('图片已保存')
  }, [processedImage, selectedStyle, showToastMessage])

  const handleShare = useCallback(async () => {
    if (!processedImage) return

    try {
      const file = base64ToFile(processedImage, 'styled-image.png')
      const data = await shareImage(file)

      if (data.success) {
        const shareUrl = `${window.location.origin}/api/share/${data.shareId}`
        await navigator.clipboard.writeText(shareUrl)
        showToastMessage('分享链接已复制到剪贴板（5分钟有效）')
      }
    } catch (error) {
      console.error('Share error:', error)
      showToastMessage('分享失败，请重试')
    }
  }, [processedImage, showToastMessage])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const currentStyle = styleOptions.find(s => s.id === selectedStyle)

  return (
    <div className="app-container" style={styleObj.appContainer}>
      <header style={styleObj.header}>
        <h1 className="title" style={styleObj.title}>AI 风格化图像转换</h1>
        <p className="subtitle" style={styleObj.subtitle}>将你的照片变成艺术作品</p>
      </header>

      <main className="main-content" style={styleObj.mainContent}>
        <div className="preview-section" style={styleObj.previewSection}>
          <div
            className="upload-area"
            style={{
              ...styleObj.uploadArea,
              borderStyle: isDragging || flashBorder ? 'solid' : 'dashed',
              backgroundColor: isDragging ? 'rgba(74, 144, 217, 0.3)' : '#2D2D2D',
              borderColor: isDragging || flashBorder ? '#4A90D9' : 'rgba(255, 255, 255, 0.5)',
              ...(imagePreview ? { padding: '20px' } : {}),
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
            
            {imagePreview ? (
              <div style={styleObj.imageContainer}>
                <img
                  src={processedImage || imagePreview}
                  alt="Preview"
                  style={{
                    ...styleObj.previewImage,
                    opacity: isImageFading ? 0.4 : 1,
                    transition: 'opacity 0.3s ease',
                  }}
                />
                {isProcessing && (
                  <div style={styleObj.processingOverlay}>
                    <div style={styleObj.spinner}></div>
                    <span style={styleObj.processingText}>处理中...</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={styleObj.uploadPlaceholder}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', color: 'rgba(255,255,255,0.6)' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p style={styleObj.uploadText}>点击或拖拽上传图片</p>
                <p style={styleObj.uploadHint}>支持 JPG、PNG 格式，最大 5MB</p>
              </div>
            )}
          </div>

          {imagePreview && processedImage && (
            <div className="action-buttons" style={styleObj.actionButtons}>
              <button
                style={styleObj.saveButton}
                onClick={handleSave}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                保存图片
              </button>
              <button
                style={styleObj.shareButton}
                onClick={handleShare}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                分享图片
              </button>
            </div>
          )}
        </div>

        {imageFile && (
          <div className="control-panel" style={styleObj.controlPanel}>
            <div style={styleObj.panelHeader}>
              <h3 style={styleObj.panelTitle}>风格选择</h3>
            </div>
            
            <div
              ref={styleScrollRef}
              className="style-scroll-container"
              style={styleObj.styleScrollContainer}
            >
              <div style={styleObj.styleCardsContainer}>
                {styleOptions.map((style) => (
                  <div
                    key={style.id}
                    className="style-card"
                    style={{
                      ...styleObj.styleCard,
                      background: style.gradient,
                      transform: selectedStyle === style.id ? 'scale(1.1)' : 'scale(1)',
                      border: selectedStyle === style.id ? '3px solid #FFD700' : '2px solid rgba(255,255,255,0.2)',
                      boxShadow: selectedStyle === style.id ? '0 4px 20px rgba(255, 215, 0, 0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                    onClick={(e) => handleStyleSelect(style, e)}
                    onMouseEnter={(e) => {
                      if (selectedStyle !== style.id) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedStyle !== style.id) {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
                      }
                    }}
                  >
                    <div style={styleObj.styleCardOverlay}>
                      <span className="style-card-name" style={styleObj.styleCardName}>{style.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styleObj.slidersSection}>
              <h3 style={styleObj.panelTitle}>参数调节</h3>
              
              <div style={styleObj.sliderGroup}>
                <div style={styleObj.sliderLabelRow}>
                  <label style={styleObj.sliderLabel}>强度</label>
                  <span style={styleObj.sliderValue}>{intensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  style={styleObj.slider}
                />
              </div>

              <div style={styleObj.sliderGroup}>
                <div style={styleObj.sliderLabelRow}>
                  <label style={styleObj.sliderLabel}>对比度</label>
                  <span style={styleObj.sliderValue}>{contrast > 0 ? '+' : ''}{contrast}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  style={styleObj.slider}
                />
              </div>

              <div style={styleObj.sliderGroup}>
                <div style={styleObj.sliderLabelRow}>
                  <label style={styleObj.sliderLabel}>细节保留</label>
                  <span style={styleObj.sliderValue}>{detail}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="1"
                  value={detail}
                  onChange={(e) => setDetail(parseInt(e.target.value))}
                  style={styleObj.slider}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {showToast && (
        <div style={styleObj.toast}>
          {toastMessage}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

const styleObj: { [key: string]: React.CSSProperties } = {
  appContainer: {
    minHeight: '100vh',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    animation: 'fadeIn 0.5s ease',
  },
  title: {
    fontSize: '36px',
    fontWeight: '700',
    marginBottom: '8px',
    background: 'linear-gradient(135deg, #4A90D9, #9370DB)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  mainContent: {
    display: 'flex',
    gap: '30px',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: '1200px',
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  uploadArea: {
    width: '100%',
    maxWidth: '500px',
    minHeight: '400px',
    borderRadius: '12px',
    border: '2px dashed rgba(255, 255, 255, 0.5)',
    backgroundColor: '#2D2D2D',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  uploadText: {
    fontSize: '18px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  uploadHint: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '500px',
    borderRadius: '8px',
    objectFit: 'contain',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.2)',
    borderTopColor: '#4A90D9',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: '14px',
  },
  actionButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  saveButton: {
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(74, 144, 217, 0.3)',
  },
  shareButton: {
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #2ECC71, #27AE60)',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(46, 204, 113, 0.3)',
  },
  controlPanel: {
    width: '320px',
    padding: '24px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    animation: 'slideUp 0.3s ease',
  },
  panelHeader: {
    marginBottom: '20px',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#FFFFFF',
  },
  styleScrollContainer: {
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '12px',
    marginBottom: '24px',
  },
  styleCardsContainer: {
    display: 'flex',
    gap: '12px',
    padding: '4px',
  },
  styleCard: {
    minWidth: '80px',
    width: '80px',
    height: '80px',
    borderRadius: '8px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  styleCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '8px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
  },
  styleCardName: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  slidersSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sliderGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sliderLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sliderValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4A90D9',
    minWidth: '50px',
    textAlign: 'right',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255, 255, 255, 0.1)',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
  },
  toast: {
    position: 'fixed',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    color: '#FFFFFF',
    borderRadius: '8px',
    fontSize: '14px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    animation: 'slideUp 0.3s ease',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
}

export {}
