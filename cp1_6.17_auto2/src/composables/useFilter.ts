import { ref, computed } from 'vue'

export interface FilterStyle {
  id: string
  name: string
  icon: string
}

export interface HistoryItem {
  id: string
  styleId: string
  styleName: string
  imageData: string
  timestamp: number
}

export const filterStyles: FilterStyle[] = [
  { id: 'original', name: '原图', icon: '🖼️' },
  { id: 'oil', name: '油画', icon: '🎨' },
  { id: 'watercolor', name: '水彩', icon: '💧' },
  { id: 'sketch', name: '素描', icon: '✏️' },
  { id: 'pixel', name: '像素风', icon: '👾' },
  { id: 'vintage', name: '复古', icon: '📷' },
  { id: 'neon', name: '霓虹', icon: '💡' },
  { id: 'bw', name: '黑白', icon: '⬛' }
]

export function useFilter() {
  const originalImage = ref<HTMLImageElement | null>(null)
  const originalImageSrc = ref<string>('')
  const currentStyleId = ref<string>('original')
  const processedImageSrc = ref<string>('')
  const isProcessing = ref<boolean>(false)
  const history = ref<HistoryItem[]>([])
  const historyIndex = ref<number>(-1)
  const compareMode = ref<boolean>(false)
  const comparePosition = ref<number>(50)
  const compareDirection = ref<'horizontal' | 'vertical'>('horizontal')

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  const currentHistoryItem = computed(() => {
    if (historyIndex.value >= 0 && historyIndex.value < history.value.length) {
      return history.value[historyIndex.value]
    }
    return null
  })

  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          originalImage.value = img
          originalImageSrc.value = e.target?.result as string
          processedImageSrc.value = e.target?.result as string
          history.value = []
          historyIndex.value = -1
          currentStyleId.value = 'original'
          addToHistory('original', '原图', e.target?.result as string)
          resolve(img)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function addToHistory(styleId: string, styleName: string, imageData: string) {
    const newItem: HistoryItem = {
      id: `${styleId}-${Date.now()}`,
      styleId,
      styleName,
      imageData,
      timestamp: Date.now()
    }
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push(newItem)
    historyIndex.value = history.value.length - 1
  }

  function applyFilter(styleId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!originalImage.value) {
        reject(new Error('No image loaded'))
        return
      }

      if (styleId === 'original') {
        processedImageSrc.value = originalImageSrc.value
        currentStyleId.value = 'original'
        addToHistory('original', '原图', originalImageSrc.value)
        resolve(originalImageSrc.value)
        return
      }

      isProcessing.value = true

      requestAnimationFrame(() => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas not supported'))
            return
          }

          const img = originalImage.value!
          const maxSize = 1200
          let width = img.width
          let height = img.height

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize
              width = maxSize
            } else {
              width = (width / height) * maxSize
              height = maxSize
            }
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          const imageData = ctx.getImageData(0, 0, width, height)
          const data = imageData.data

          switch (styleId) {
            case 'oil':
              applyOilFilter(data, width, height)
              break
            case 'watercolor':
              applyWatercolorFilter(data, width, height)
              break
            case 'sketch':
              applySketchFilter(data, width, height)
              break
            case 'pixel':
              applyPixelFilter(ctx, canvas, width, height)
              break
            case 'vintage':
              applyVintageFilter(data)
              break
            case 'neon':
              applyNeonFilter(data, width, height)
              break
            case 'bw':
              applyBWFilter(data)
              break
          }

          if (styleId !== 'pixel') {
            ctx.putImageData(imageData, 0, 0)
          }

          const result = canvas.toDataURL('image/jpeg', 0.9)
          processedImageSrc.value = result
          currentStyleId.value = styleId

          const style = filterStyles.find(s => s.id === styleId)
          addToHistory(styleId, style?.name || styleId, result)

          isProcessing.value = false
          resolve(result)
        } catch (err) {
          isProcessing.value = false
          reject(err)
        }
      })
    })
  }

  function applyOilFilter(data: Uint8ClampedArray, width: number, height: number) {
    const radius = 3
    const intensityLevels = 20
    const tempData = new Uint8ClampedArray(data)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4

        let rTotal = 0, gTotal = 0, bTotal = 0, count = 0
        let maxCount = 0, maxIntensity = 0

        const intensityBin = new Array(intensityLevels).fill(0)
        const rBin = new Array(intensityLevels).fill(0)
        const gBin = new Array(intensityLevels).fill(0)
        const bBin = new Array(intensityLevels).fill(0)

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy
            const nx = x + dx
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const nidx = (ny * width + nx) * 4
              const r = tempData[nidx]
              const g = tempData[nidx + 1]
              const b = tempData[nidx + 2]
              const intensity = Math.floor(((r + g + b) / 3) * intensityLevels / 256)

              intensityBin[intensity]++
              rBin[intensity] += r
              gBin[intensity] += g
              bBin[intensity] += b

              if (intensityBin[intensity] > maxCount) {
                maxCount = intensityBin[intensity]
                maxIntensity = intensity
              }
            }
          }
        }

        data[idx] = rBin[maxIntensity] / maxCount
        data[idx + 1] = gBin[maxIntensity] / maxCount
        data[idx + 2] = bBin[maxIntensity] / maxCount
      }
    }
  }

  function applyWatercolorFilter(data: Uint8ClampedArray, width: number, height: number) {
    const tempData = new Uint8ClampedArray(data)
    const radius = 2

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4

        let r = 0, g = 0, b = 0, count = 0

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy
            const nx = x + dx
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const nidx = (ny * width + nx) * 4
              r += tempData[nidx]
              g += tempData[nidx + 1]
              b += tempData[nidx + 2]
              count++
            }
          }
        }

        r /= count
        g /= count
        b /= count

        const avg = (r + g + b) / 3
        const saturation = 1.3
        r = avg + (r - avg) * saturation
        g = avg + (g - avg) * saturation
        b = avg + (b - avg) * saturation

        data[idx] = Math.min(255, Math.max(0, r))
        data[idx + 1] = Math.min(255, Math.max(0, g))
        data[idx + 2] = Math.min(255, Math.max(0, b * 1.05))
      }
    }
  }

  function applySketchFilter(data: Uint8ClampedArray, width: number, height: number) {
    const grayData = new Uint8ClampedArray(width * height)

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      grayData[i / 4] = gray
    }

    const sobelData = new Float32Array(width * height)
    let maxVal = 0

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const gx =
          -grayData[idx - width - 1] + grayData[idx - width + 1] +
          -2 * grayData[idx - 1] + 2 * grayData[idx + 1] +
          -grayData[idx + width - 1] + grayData[idx + width + 1]

        const gy =
          -grayData[idx - width - 1] - 2 * grayData[idx - width] - grayData[idx - width + 1] +
          grayData[idx + width - 1] + 2 * grayData[idx + width] + grayData[idx + width + 1]

        const mag = Math.sqrt(gx * gx + gy * gy)
        sobelData[idx] = mag
        if (mag > maxVal) maxVal = mag
      }
    }

    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4
      let val = sobelData[idx]
      val = (val / maxVal) * 255
      val = 255 - val
      val = Math.pow(val / 255, 1.5) * 255

      data[i] = val
      data[i + 1] = val
      data[i + 2] = val
    }
  }

  function applyPixelFilter(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, width: number, height: number) {
    const pixelSize = Math.max(4, Math.floor(width / 150))
    const smallWidth = Math.floor(width / pixelSize)
    const smallHeight = Math.floor(height / pixelSize)

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = smallWidth
    tempCanvas.height = smallHeight
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.imageSmoothingEnabled = false

    tempCtx.drawImage(canvas, 0, 0, smallWidth, smallHeight)

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(tempCanvas, 0, 0, smallWidth, smallHeight, 0, 0, width, height)
  }

  function applyVintageFilter(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      const tr = 0.393 * r + 0.769 * g + 0.189 * b
      const tg = 0.349 * r + 0.686 * g + 0.168 * b
      const tb = 0.272 * r + 0.534 * g + 0.131 * b

      data[i] = Math.min(255, tr)
      data[i + 1] = Math.min(255, tg)
      data[i + 2] = Math.min(255, tb)

      data[i] = data[i] * 0.9 + 30
      data[i + 1] = data[i + 1] * 0.9 + 20
      data[i + 2] = data[i + 2] * 0.85 - 10
    }
  }

  function applyNeonFilter(data: Uint8ClampedArray, width: number, height: number) {
    const tempData = new Uint8ClampedArray(data)

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4

        let gxR = 0, gxG = 0, gxB = 0
        let gyR = 0, gyG = 0, gyB = 0

        const kernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
        const kernelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

        let ki = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nidx = ((y + dy) * width + (x + dx)) * 4
            gxR += tempData[nidx] * kernelX[ki]
            gxG += tempData[nidx + 1] * kernelX[ki]
            gxB += tempData[nidx + 2] * kernelX[ki]
            gyR += tempData[nidx] * kernelY[ki]
            gyG += tempData[nidx + 1] * kernelY[ki]
            gyB += tempData[nidx + 2] * kernelY[ki]
            ki++
          }
        }

        const r = Math.sqrt(gxR * gxR + gyR * gyR)
        const g = Math.sqrt(gxG * gxG + gyG * gyG)
        const b = Math.sqrt(gxB * gxB + gyB * gyB)

        data[idx] = Math.min(255, r * 1.5)
        data[idx + 1] = Math.min(255, g * 1.2)
        data[idx + 2] = Math.min(255, b * 2)
      }
    }
  }

  function applyBWFilter(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const contrast = 1.2
      const adjusted = (gray - 128) * contrast + 128
      data[i] = Math.min(255, Math.max(0, adjusted))
      data[i + 1] = data[i]
      data[i + 2] = data[i]
    }
  }

  function undo() {
    if (canUndo.value) {
      historyIndex.value--
      const item = history.value[historyIndex.value]
      processedImageSrc.value = item.imageData
      currentStyleId.value = item.styleId
    }
  }

  function redo() {
    if (canRedo.value) {
      historyIndex.value++
      const item = history.value[historyIndex.value]
      processedImageSrc.value = item.imageData
      currentStyleId.value = item.styleId
    }
  }

  function goToHistory(index: number) {
    if (index >= 0 && index < history.value.length) {
      historyIndex.value = index
      const item = history.value[index]
      processedImageSrc.value = item.imageData
      currentStyleId.value = item.styleId
    }
  }

  function toggleCompareMode() {
    compareMode.value = !compareMode.value
  }

  function setComparePosition(pos: number) {
    comparePosition.value = Math.max(0, Math.min(100, pos))
  }

  function toggleCompareDirection() {
    compareDirection.value = compareDirection.value === 'horizontal' ? 'vertical' : 'horizontal'
  }

  function exportImage(): string {
    return processedImageSrc.value
  }

  return {
    originalImage,
    originalImageSrc,
    currentStyleId,
    processedImageSrc,
    isProcessing,
    history,
    historyIndex,
    currentHistoryItem,
    canUndo,
    canRedo,
    compareMode,
    comparePosition,
    compareDirection,
    filterStyles,
    loadImage,
    applyFilter,
    undo,
    redo,
    goToHistory,
    toggleCompareMode,
    setComparePosition,
    toggleCompareDirection,
    exportImage
  }
}
