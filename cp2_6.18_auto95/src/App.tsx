import React, { useState, useRef, useCallback } from 'react'
import PuzzleCanvas, { type ImageItem } from './components/PuzzleCanvas'
import Toolbar, { type BorderStyle, type LayoutMode } from './components/Toolbar'
import { processImageFile, canvasToBase64 } from './utils/imageHelper'
import { copyTextToClipboard, copyImageToClipboard, generateShareLink } from './utils/shareHelper'

const App: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([])
  const [backgroundColor, setBackgroundColor] = useState<string>('#f3f4f6')
  const [borderStyle, setBorderStyle] = useState<BorderStyle>('none')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('compact')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [showPreview, setShowPreview] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  const handleImagesReorder = useCallback((newImages: ImageItem[]) => {
    setImages(newImages)
  }, [])

  const handleImageUpload = useCallback(async (files: File[]) => {
    setUploadError(null)
    const newItems: ImageItem[] = []

    for (const file of files) {
      try {
        const result = await processImageFile(file)
        newItems.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          thumbnail: result.thumbnail,
          original: result.original
        })
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : '图片处理失败')
      }
    }

    if (newItems.length > 0) {
      setImages((prev) => [...prev, ...newItems])
    }
  }, [])

  const handleShare = useCallback(async () => {
    if (!canvasRef.current || images.length === 0) return

    setIsGenerating(true)
    try {
      const base64 = await canvasToBase64(canvasRef.current)
      setPreviewImage(base64)
      setShowPreview(true)
    } catch (err) {
      console.error('生成预览失败:', err)
      setUploadError('生成预览失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }, [images.length])

  const handleCopyLink = useCallback(async () => {
    const link = generateShareLink()
    const success = await copyTextToClipboard(link)
    if (success) {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 1500)
    }
  }, [])

  const handleCopyImage = useCallback(async () => {
    if (!previewImage) return
    const success = await copyImageToClipboard(previewImage)
    if (success) {
      setCopiedImage(true)
      setTimeout(() => setCopiedImage(false), 1500)
    } else {
      setUploadError('图片复制失败，请手动保存图片')
    }
  }, [previewImage])

  const closePreview = useCallback(() => {
    setShowPreview(false)
    setPreviewImage(null)
    setCopiedLink(false)
    setCopiedImage(false)
  }, [])

  const CheckIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f9fafb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
    >
      <header
        style={{
          padding: '16px 32px',
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
            图片拼贴分享板
          </h1>
        </div>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          已上传 {images.length} 张图片
        </span>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <PuzzleCanvas
            images={images}
            backgroundColor={backgroundColor}
            borderStyle={borderStyle}
            layoutMode={layoutMode}
            onImagesReorder={handleImagesReorder}
            onImageUpload={handleImageUpload}
            canvasRef={canvasRef}
          />

          {uploadError && (
            <div
              style={{
                margin: '0 24px 12px',
                padding: '10px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                color: '#dc2626',
                fontSize: 13,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              {uploadError}
              <button
                onClick={() => setUploadError(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: 18,
                  padding: '0 4px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
          )}

          <div
            style={{
              padding: '16px 24px 28px',
              background: '#ffffff',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12
            }}
          >
            <button
              onClick={handleShare}
              disabled={images.length === 0 || isGenerating}
              style={{
                padding: '12px 32px',
                fontSize: 15,
                fontWeight: 600,
                color: '#ffffff',
                background: images.length === 0 ? '#9ca3af' : '#3b82f6',
                border: 'none',
                borderRadius: 8,
                cursor: images.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease-out',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: images.length === 0 ? 'none' : '0 2px 8px rgba(59,130,246,0.3)'
              }}
              onMouseEnter={(e) => {
                if (images.length > 0) {
                  e.currentTarget.style.background = '#2563eb'
                }
              }}
              onMouseLeave={(e) => {
                if (images.length > 0) {
                  e.currentTarget.style.background = '#3b82f6'
                }
              }}
            >
              {isGenerating ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                  </svg>
                  生成中...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  生成并分享
                </>
              )}
            </button>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>
              {images.length === 0 ? '请先上传图片' : '完成拼贴后点击生成分享卡片'}
            </span>
          </div>
        </div>

        <Toolbar
          backgroundColor={backgroundColor}
          onBackgroundColorChange={setBackgroundColor}
          borderStyle={borderStyle}
          onBorderStyleChange={setBorderStyle}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
        />
      </div>

      {showPreview && (
        <div
          onClick={closePreview}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 24,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 900,
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
                预览分享卡片
              </h3>
              <button
                onClick={closePreview}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: '#f3f4f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: '#6b7280',
                  transition: 'all 0.15s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 24, overflow: 'auto', flex: 1, background: '#f9fafb' }}>
              {previewImage && (
                <img
                  src={previewImage}
                  alt="预览"
                  style={{
                    width: '100%',
                    maxWidth: 1200,
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto',
                    borderRadius: 12,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                />
              )}
            </div>

            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'center',
                gap: 16,
                background: '#ffffff'
              }}
            >
              <button
                onClick={handleCopyLink}
                style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: copiedLink ? '#ffffff' : '#374151',
                  background: copiedLink ? '#10b981' : '#f3f4f6',
                  border: copiedLink ? '1px solid #10b981' : '1px solid #d1d5db',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}
                onMouseEnter={(e) => {
                  if (!copiedLink) {
                    e.currentTarget.style.background = '#e5e7eb'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!copiedLink) {
                    e.currentTarget.style.background = '#f3f4f6'
                  }
                }}
              >
                {copiedLink ? (
                  <>
                    <CheckIcon />
                    已复制
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    复制链接
                  </>
                )}
              </button>

              <button
                onClick={handleCopyImage}
                style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#ffffff',
                  background: copiedImage ? '#10b981' : '#3b82f6',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: copiedImage ? 'none' : '0 2px 8px rgba(59,130,246,0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!copiedImage) {
                    e.currentTarget.style.background = '#2563eb'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!copiedImage) {
                    e.currentTarget.style.background = '#3b82f6'
                  }
                }}
              >
                {copiedImage ? (
                  <>
                    <CheckIcon />
                    已复制
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    复制图片
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1024px) {
          header { padding: 12px 20px !important; }
        }
        @media (max-width: 900px) {
          div[style*="flex: 1; display: flex; min-height: 0;"] {
            flex-direction: column !important;
          }
          div[style*="width: 240px;"] {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid #e5e7eb;
            height: auto !important;
            flex-direction: row !important;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  )
}

export default App
