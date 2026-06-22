import { useState } from 'react'
import { Download, Copy, Check } from 'lucide-react'
import { usePixelAvatarStore } from '@/store/usePixelAvatarStore'
import { renderPixelArtToCanvas } from '@/pixelator/pixelEngine'

type ExportSize = 128 | 256

export default function ExportPanel() {
  const { pixelGrid, palette, gridSize } = usePixelAvatarStore()
  const [selectedSize, setSelectedSize] = useState<ExportSize>(256)
  const [copied, setCopied] = useState(false)
  const [pressing, setPressing] = useState<'download' | 'copy' | null>(null)

  const handleDownload = () => {
    if (pixelGrid.length === 0) return

    const canvas = renderPixelArtToCanvas(pixelGrid, selectedSize, palette, gridSize)
    const link = document.createElement('a')
    link.download = `pixel-avatar-${selectedSize}x${selectedSize}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleCopy = async () => {
    if (pixelGrid.length === 0) return

    const canvas = renderPixelArtToCanvas(pixelGrid, selectedSize, palette, gridSize)
    canvas.toBlob(async (blob) => {
      if (!blob) return
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        setCopied(false)
      }
    }, 'image/png')
  }

  const isDisabled = pixelGrid.length === 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
        <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
          导出
        </span>
      </div>

      <div className="flex items-center gap-2">
        {([128, 256] as ExportSize[]).map((size) => (
          <button
            key={size}
            onClick={() => setSelectedSize(size)}
            disabled={isDisabled}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${
                selectedSize === size
                  ? 'bg-stone-800 text-white shadow-md'
                  : 'bg-white/60 text-stone-500 border border-stone-200 hover:bg-stone-100'
              }
              ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            {size}×{size}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={isDisabled}
          onMouseDown={() => setPressing('download')}
          onMouseUp={() => setPressing(null)}
          onMouseLeave={() => setPressing(null)}
          className={`
            flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
            bg-stone-800 text-white transition-all duration-100
            hover:bg-stone-700
            ${pressing === 'download' ? 'translate-x-[1px] translate-y-[1px] shadow-none' : 'shadow-md shadow-stone-300'}
            ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
          `}
        >
          <Download className="w-3.5 h-3.5" />
          下载 PNG
        </button>

        <button
          onClick={handleCopy}
          disabled={isDisabled}
          onMouseDown={() => setPressing('copy')}
          onMouseUp={() => setPressing(null)}
          onMouseLeave={() => setPressing(null)}
          className={`
            flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
            transition-all duration-100
            ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }
            ${pressing === 'copy' ? 'translate-x-[1px] translate-y-[1px] shadow-none' : 'shadow-sm'}
            ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
          `}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '已复制' : '复制到剪贴板'}
        </button>
      </div>
    </div>
  )
}
