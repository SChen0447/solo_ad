import type {
  ProcessedImage,
  ProcessingParams,
  CropRatio,
  CropOffset,
  LUTPreset,
} from './types'
import { RATIO_VALUES } from './types'

interface BatchProcessInput {
  id: string
  fileName: string
  imageData: ImageData
  cropOffset: CropOffset | null
}

export async function loadImageToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        reject(new Error('无法获取Canvas上下文'))
        return
      }
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(imageData)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

export function imageDataToBlob(imageData: ImageData, type: string = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('无法获取Canvas上下文'))
      return
    }
    ctx.putImageData(imageData, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Blob转换失败'))
    }, type)
  })
}

function calculateCropDimensions(
  srcWidth: number,
  srcHeight: number,
  ratio: CropRatio,
  offset: CropOffset | null
): { x: number; y: number; width: number; height: number } {
  const targetRatio = RATIO_VALUES[ratio]
  const srcRatio = srcWidth / srcHeight

  let cropWidth: number
  let cropHeight: number

  if (srcRatio > targetRatio) {
    cropHeight = srcHeight
    cropWidth = Math.round(cropHeight * targetRatio)
  } else {
    cropWidth = srcWidth
    cropHeight = Math.round(cropWidth / targetRatio)
  }

  let x: number
  let y: number

  if (offset) {
    const maxX = srcWidth - cropWidth
    const maxY = srcHeight - cropHeight
    x = Math.max(0, Math.min(maxX, Math.round(offset.x)))
    y = Math.max(0, Math.min(maxY, Math.round(offset.y)))
  } else {
    x = Math.round((srcWidth - cropWidth) / 2)
    y = Math.round((srcHeight - cropHeight) / 2)
  }

  return { x, y, width: cropWidth, height: cropHeight }
}

function cropImageData(
  src: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('无法获取Canvas上下文')

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = src.width
  tempCanvas.height = src.height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) throw new Error('无法获取Canvas上下文')
  tempCtx.putImageData(src, 0, 0)

  ctx.drawImage(tempCanvas, x, y, width, height, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}

function applyBrightness(data: Uint8ClampedArray, brightness: number): void {
  if (brightness === 0) return
  const factor = 1 + brightness / 100
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] * factor))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor))
  }
}

function applyColorTemp(data: Uint8ClampedArray, colorTemp: number): void {
  if (colorTemp === 0) return
  const temp = colorTemp / 50
  const rFactor = 1 + temp * 0.3
  const bFactor = 1 - temp * 0.3
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] * rFactor))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * bFactor))
  }
}

function applyVintageLUT(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    data[i] = Math.min(255, r * 1.1 + 20)
    data[i + 1] = Math.min(255, g * 0.95 + 10)
    data[i + 2] = Math.max(0, b * 0.75)

    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
    if (avg < 50) {
      data[i] = Math.min(255, data[i] * 1.2)
      data[i + 1] = Math.min(255, data[i + 1] * 1.1)
    }
  }
}

function applyCoolLUT(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    data[i] = Math.max(0, r * 0.85)
    data[i + 1] = Math.min(255, g * 0.95 + 15)
    data[i + 2] = Math.min(255, b * 1.15 + 20)

    const desaturate = 0.9
    const avg = (r + g + b) / 3
    data[i] = data[i] * desaturate + avg * (1 - desaturate)
    data[i + 1] = data[i + 1] * desaturate + avg * (1 - desaturate)
    data[i + 2] = data[i + 2] * desaturate + avg * (1 - desaturate)
  }
}

function applyMonochromeLUT(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    const contrast = gray > 128
      ? Math.min(255, 128 + (gray - 128) * 1.4)
      : Math.max(0, 128 - (128 - gray) * 1.4)
    data[i] = contrast
    data[i + 1] = contrast
    data[i + 2] = contrast
  }
}

function applyLUT(data: Uint8ClampedArray, lutPreset: LUTPreset): void {
  switch (lutPreset) {
    case 'vintage':
      applyVintageLUT(data)
      break
    case 'cool':
      applyCoolLUT(data)
      break
    case 'monochrome':
      applyMonochromeLUT(data)
      break
    default:
      break
  }
}

export function processSingleImage(
  imageData: ImageData,
  params: ProcessingParams,
  cropOffset: CropOffset | null
): ImageData {
  const { cropRatio, brightness, colorTemp, lutPreset } = params
  const crop = calculateCropDimensions(imageData.width, imageData.height, cropRatio, cropOffset)
  let result = cropImageData(imageData, crop.x, crop.y, crop.width, crop.height)
  applyBrightness(result.data, brightness)
  applyColorTemp(result.data, colorTemp)
  applyLUT(result.data, lutPreset)
  return result
}

export interface BatchProcessResult {
  processed: ProcessedImage[]
  progress: (current: number, total: number) => void
}

export async function batchProcess(
  images: BatchProcessInput[],
  params: ProcessingParams,
  onProgress?: (current: number, total: number) => Promise<void> | void
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = []
  const total = images.length

  for (let i = 0; i < total; i++) {
    const img = images[i]
    const processedData = processSingleImage(img.imageData, params, img.cropOffset)
    const processedBlob = await imageDataToBlob(processedData)

    results.push({
      id: img.id,
      fileName: img.fileName,
      originalData: img.imageData,
      processedData,
      processedBlob,
      params: { ...params },
    })

    if (onProgress) {
      await onProgress(i + 1, total)
    }

    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return results
}

export function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法获取Canvas上下文')
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}
