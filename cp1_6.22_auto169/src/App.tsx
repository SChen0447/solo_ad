import { useCallback } from 'react'
import { RefreshCw, Grid3x3, Grid2x2 } from 'lucide-react'
import { usePixelAvatarStore } from '@/store/usePixelAvatarStore'
import { pixelateImage } from '@/pixelator/pixelEngine'
import UploadZone from '@/upload/UploadZone'
import PixelCanvas from '@/pixelator/PixelCanvas'
import PaletteEditor from '@/palette/PaletteEditor'
import ExportPanel from '@/export/ExportPanel'

export default function App() {
  const { sourceImage, pixelGrid, gridSize, isProcessing, setGridSize, setPixelGrid, setPalette, setIsProcessing, reset } =
    usePixelAvatarStore()

  const handleGridSizeToggle = useCallback(() => {
    const newSize = gridSize === 16 ? 32 : 16
    setGridSize(newSize)
    if (sourceImage) {
      setIsProcessing(true)
      const { pixelGrid: newGrid, palette: newPalette } = pixelateImage(sourceImage, newSize)
      setPixelGrid(newGrid)
      setPalette(newPalette)
      setIsProcessing(false)
    }
  }, [gridSize, sourceImage, setGridSize, setPixelGrid, setPalette, setIsProcessing])

  const handleReprocess = useCallback(() => {
    if (sourceImage) {
      setIsProcessing(true)
      const { pixelGrid: newGrid, palette: newPalette } = pixelateImage(sourceImage, gridSize)
      setPixelGrid(newGrid)
      setPalette(newPalette)
      setIsProcessing(false)
    }
  }, [sourceImage, gridSize, setPixelGrid, setPalette, setIsProcessing])

  return (
    <div className="min-h-screen bg-[#faf5eb]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-800 mb-2"
            style={{ fontFamily: '"Press Start 2P", "Courier New", monospace' }}
          >
            Pixel Avatar
          </h1>
          <p className="text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
            上传一张照片，自动生成像素风格头像。支持调色板编辑和多尺寸导出。
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          <div className="w-full lg:w-72 flex-shrink-0">
            <UploadZone />

            {sourceImage && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={handleGridSizeToggle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/80 text-stone-600 border border-stone-200 hover:bg-stone-100 transition-all"
                >
                  {gridSize === 16 ? (
                    <Grid3x3 className="w-3.5 h-3.5" />
                  ) : (
                    <Grid2x2 className="w-3.5 h-3.5" />
                  )}
                  {gridSize}×{gridSize}
                </button>
                <button
                  onClick={handleReprocess}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/80 text-stone-600 border border-stone-200 hover:bg-stone-100 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  重新生成
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/80 text-stone-500 border border-stone-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                >
                  清除
                </button>
              </div>
            )}

            {sourceImage && (
              <div className="mt-4">
                <p className="text-[10px] text-stone-400 mb-2 uppercase tracking-wider font-semibold">原始照片</p>
                <img
                  src={sourceImage.src}
                  alt="原始照片"
                  className="w-32 h-32 object-cover rounded-xl border border-stone-200 shadow-sm"
                />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center">
            {isProcessing && (
              <div className="flex items-center justify-center w-80 h-80 rounded-2xl bg-white/40 border border-stone-200">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
                  <p className="text-xs text-stone-400">像素化处理中...</p>
                </div>
              </div>
            )}
            {!isProcessing && <PixelCanvas />}

            {pixelGrid.length > 0 && (
              <div className="mt-6 w-full max-w-sm">
                <ExportPanel />
              </div>
            )}
          </div>

          {pixelGrid.length > 0 && (
            <div className="w-full lg:w-40 flex-shrink-0">
              <PaletteEditor />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
