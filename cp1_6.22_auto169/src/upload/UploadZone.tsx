import { useCallback, useState } from 'react'
import { CloudUpload, ImagePlus } from 'lucide-react'
import { usePixelAvatarStore } from '@/store/usePixelAvatarStore'
import { pixelateImage } from '@/pixelator/pixelEngine'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']

export default function UploadZone() {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setSourceImage, setPixelGrid, setPalette, setIsProcessing, gridSize } =
    usePixelAvatarStore()

  const processFile = useCallback(
    (file: File) => {
      setError(null)

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('请上传 JPG 或 PNG 格式的图片')
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('文件大小不能超过 2MB')
        return
      }

      setIsProcessing(true)

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          setSourceImage(img)
          const { pixelGrid, palette } = pixelateImage(img, gridSize)
          setPixelGrid(pixelGrid)
          setPalette(palette)
          setIsProcessing(false)
        }
        img.onerror = () => {
          setError('图片加载失败，请重试')
          setIsProcessing(false)
        }
        img.src = e.target?.result as string
      }
      reader.onerror = () => {
        setError('文件读取失败，请重试')
        setIsProcessing(false)
      }
      reader.readAsDataURL(file)
    },
    [gridSize, setSourceImage, setPixelGrid, setPalette, setIsProcessing]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.jpg,.jpeg,.png'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) processFile(file)
    }
    input.click()
  }, [processFile])

  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          w-full h-64 rounded-2xl cursor-pointer
          border-2 border-dashed transition-all duration-200
          ${
            isDragging
              ? 'scale-[1.02] bg-[#f0f9ff] border-sky-400 shadow-lg shadow-sky-100'
              : 'border-stone-300 bg-white/60 hover:border-stone-400 hover:bg-stone-50'
          }
        `}
      >
        <div
          className={`
            mb-3 transition-transform duration-200
            ${isDragging ? 'scale-110' : ''}
          `}
        >
          {isDragging ? (
            <ImagePlus className="w-12 h-12 text-sky-500" strokeWidth={1.5} />
          ) : (
            <CloudUpload className="w-12 h-12 text-stone-400" strokeWidth={1.5} />
          )}
        </div>

        <p className="text-sm font-medium text-stone-600 mb-1">
          {isDragging ? '释放以上传图片' : '点击上传或拖拽图片到此处'}
        </p>
        <p className="text-xs text-stone-400">支持 JPG、PNG，最大 2MB</p>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
          {error}
        </div>
      )}
    </div>
  )
}
