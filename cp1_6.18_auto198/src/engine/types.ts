export type CropRatio = '1:1' | '4:3' | '16:9'

export type LUTPreset = 'none' | 'vintage' | 'cool' | 'monochrome'

export interface ProcessingParams {
  cropRatio: CropRatio
  brightness: number
  colorTemp: number
  lutPreset: LUTPreset
}

export interface CropOffset {
  x: number
  y: number
}

export interface ImageCache {
  id: string
  fileName: string
  originalData: ImageData
  processedData?: ImageData
  processedBlob?: Blob
  cropOffset: CropOffset | null
  lastParams: ProcessingParams | null
  isProcessed: boolean
}

export interface ProcessedImage {
  id: string
  fileName: string
  originalData: ImageData
  processedData: ImageData
  processedBlob: Blob
  params: ProcessingParams
}

export interface UploadedImage {
  id: string
  file: File
  fileName: string
  imageData: ImageData
  previewUrl: string
}

export const RATIO_VALUES: Record<CropRatio, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
}

export const LUT_LABELS: Record<LUTPreset, string> = {
  none: '无',
  vintage: '复古暖黄',
  cool: '冷灰蓝调',
  monochrome: '高对比黑白',
}

export const RATIO_LABELS: Record<CropRatio, string> = {
  '1:1': '1:1正方形',
  '4:3': '4:3横图',
  '16:9': '16:9横图',
}
