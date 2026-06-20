import React, { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { identifyItem } from '../api'
import { categoryColors, theme } from '../styles/theme'
import { useNavigate } from 'react-router-dom'

const UploadModule: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [features, setFeatures] = useState<number[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const extractHistogram = useCallback((img: HTMLImageElement): number[] => {
    const canvas = canvasRef.current
    if (!canvas) return []

    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    const size = 128
    canvas.width = size
    canvas.height = size
    ctx.drawImage(img, 0, 0, size, size)

    const imageData = ctx.getImageData(0, 0, size, size)
    const data = imageData.data

    const bins = 16
    const histogram = new Array(48).fill(0)

    for (let i = 0; i < data.length; i += 4) {
      const r = Math.floor((data[i] / 255) * bins)
      const g = Math.floor((data[i + 1] / 255) * bins)
      const b = Math.floor((data[i + 2] / 255) * bins)
      histogram[r]++
      histogram[bins + g]++
      histogram[32 + b]++
    }

    const total = (size * size)
    return histogram.map(v => v / total)
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const validTypes = ['image/jpeg', 'image/png', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        setError('请上传 JPG 或 PNG 格式的图片')
        return
      }

      if (file.size > 3 * 1024 * 1024) {
        setError('图片大小不能超过 3MB')
        return
      }

      setError(null)
      setCategory(null)
      setLoading(true)

      const reader = new FileReader()
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string
        setPreviewUrl(dataUrl)

        const img = new Image()
        img.onload = async () => {
          const hist = extractHistogram(img)
          setFeatures(hist)

          const base64 = dataUrl.split(',')[1]
          try {
            const result = await identifyItem(base64, hist)
            setCategory(result.category)
          } catch (err) {
            setError('识别失败，请重试')
          } finally {
            setLoading(false)
          }
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(file)
    },
    [extractHistogram]
  )

  const handleBrowse = () => {
    if (category) {
      navigate(`/gallery?category=${encodeURIComponent(category)}`)
    }
  }

  const badgeColor = category ? categoryColors[category] || '#95A5A6' : '#95A5A6'

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <h2 style={{ textAlign: 'center', marginBottom: 32, fontSize: 28 }}>
        上传闲置物品照片
      </h2>

      <label
        style={{
          display: 'block',
          border: '2px dashed #D4A373',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: '#FFFFFF',
          transition: 'all 0.3s ease',
        }}
      >
        {previewUrl ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {category && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  minWidth: 70,
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 6,
                  backgroundColor: badgeColor,
                  color: '#FFFFFF',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  boxShadow: theme.shadows.card,
                }}
              >
                {category}
              </motion.div>
            )}
            <motion.img
              src={previewUrl}
              alt="预览"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                maxWidth: '100%',
                maxHeight: 300,
                borderRadius: 12,
                objectFit: 'contain',
              }}
            />
          </div>
        ) : (
          <div>
            <i
              className="fas fa-cloud-upload-alt"
              style={{ fontSize: 48, color: '#D4A373', marginBottom: 16 }}
            />
            <p style={{ color: '#7A5C3F', fontSize: 16, marginBottom: 8 }}>
              点击或拖拽上传图片
            </p>
            <p style={{ color: '#999999', fontSize: 12 }}>
              支持 JPG/PNG 格式，最大 3MB
            </p>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </label>

      {loading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', marginTop: 20, color: '#7A5C3F' }}
        >
          <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />
          正在识别物品类别...
        </motion.p>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', marginTop: 20, color: '#E74C3C' }}
        >
          {error}
        </motion.p>
      )}

      {category && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: 'center', marginTop: 24 }}
        >
          <p style={{ color: '#5D4E37', marginBottom: 16 }}>
            识别成功！您的物品是 <strong style={{ color: '#4A3728' }}>{category}</strong>
          </p>
          <button
            onClick={handleBrowse}
            style={{
              backgroundColor: '#D4A373',
              color: '#FFFFFF',
              padding: '12px 32px',
              borderRadius: 20,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            浏览改造灵感
          </button>
        </motion.div>
      )}
    </div>
  )
}

export default UploadModule
