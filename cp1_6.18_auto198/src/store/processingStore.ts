import { create } from 'zustand'
import type {
  ProcessingParams,
  CropRatio,
  LUTPreset,
  ImageCache,
  ProcessedImage,
  CropOffset,
} from '../engine/types'
import { loadImageToImageData, imageDataToDataUrl, batchProcess } from '../engine/imageProcessor'
import { v4 as uuidv4 } from 'uuid'
import { downloadAllAsZip } from '../utils/zipDownload'

interface UploadedImageState {
  id: string
  file: File
  fileName: string
  imageData: ImageData
  previewUrl: string
}

interface ProcessingState {
  images: UploadedImageState[]
  params: ProcessingParams
  selectedImageId: string | null
  isProcessing: boolean
  processingProgress: number
  processingTotal: number
  processedImages: ProcessedImage[]
  imageCache: Map<string, ImageCache>
  isComplete: boolean
  showResults: boolean

  setCropRatio: (ratio: CropRatio) => void
  setBrightness: (value: number) => void
  setColorTemp: (value: number) => void
  setLutPreset: (preset: LUTPreset) => void
  setParams: (params: Partial<ProcessingParams>) => void
  uploadImages: (files: FileList | File[]) => Promise<void>
  selectImage: (id: string | null) => void
  setProcessing: (isProcessing: boolean) => void
  setProgress: (current: number, total: number) => void
  setProcessedImages: (images: ProcessedImage[]) => void
  updateImageCache: (id: string, cache: Partial<ImageCache>) => void
  getImageCache: (id: string) => ImageCache | undefined
  setCropOffset: (id: string, offset: CropOffset | null) => void
  setComplete: (complete: boolean) => void
  setShowResults: (show: boolean) => void
  startProcessing: () => Promise<void>
  downloadAll: () => Promise<void>
  reset: () => void
}

export const useProcessingStore = create<ProcessingState>((set, get) => ({
  images: [],
  params: {
    cropRatio: '1:1',
    brightness: 0,
    colorTemp: 0,
    lutPreset: 'none',
  },
  selectedImageId: null,
  isProcessing: false,
  processingProgress: 0,
  processingTotal: 0,
  processedImages: [],
  imageCache: new Map(),
  isComplete: false,
  showResults: false,

  setCropRatio: (ratio: CropRatio) =>
    set((state) => ({
      params: { ...state.params, cropRatio: ratio },
    })),

  setBrightness: (value: number) =>
    set((state) => ({
      params: { ...state.params, brightness: value },
    })),

  setColorTemp: (value: number) =>
    set((state) => ({
      params: { ...state.params, colorTemp: value },
    })),

  setLutPreset: (preset: LUTPreset) =>
    set((state) => ({
      params: { ...state.params, lutPreset: preset },
    })),

  setParams: (params: Partial<ProcessingParams>) =>
    set((state) => ({
      params: { ...state.params, ...params },
    })),

  uploadImages: async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter((file) => {
      const isValidType = file.type === 'image/jpeg' || file.type === 'image/png'
      const isValidSize = file.size <= 8 * 1024 * 1024
      return isValidType && isValidSize
    })

    if (validFiles.length === 0) {
      throw new Error('没有有效的图片文件（仅支持JPG/PNG，单张不超过8MB）')
    }

    const maxFiles = Math.min(validFiles.length, 50)
    const selectedFiles = validFiles.slice(0, maxFiles)

    const uploadPromises = selectedFiles.map(async (file) => {
      const id = uuidv4()
      const imageData = await loadImageToImageData(file)
      const previewUrl = imageDataToDataUrl(imageData)

      return {
        id,
        file,
        fileName: file.name,
        imageData,
        previewUrl,
      }
    })

    const uploadedImages = await Promise.all(uploadPromises)

    const newCache = new Map(get().imageCache)
    uploadedImages.forEach((img) => {
      newCache.set(img.id, {
        id: img.id,
        fileName: img.fileName,
        originalData: img.imageData,
        cropOffset: null,
        lastParams: null,
        isProcessed: false,
      })
    })

    set((state) => ({
      images: [...state.images, ...uploadedImages],
      selectedImageId: state.selectedImageId || uploadedImages[0]?.id || null,
      imageCache: newCache,
      isComplete: false,
      showResults: false,
    }))
  },

  selectImage: (id: string | null) => set({ selectedImageId: id }),

  setProcessing: (isProcessing: boolean) => set({ isProcessing }),

  setProgress: (current: number, total: number) =>
    set({
      processingProgress: current,
      processingTotal: total,
    }),

  setProcessedImages: (images: ProcessedImage[]) => {
    const newCache = new Map(get().imageCache)
    const params = get().params

    images.forEach((img) => {
      const existing = newCache.get(img.id)
      if (existing) {
        newCache.set(img.id, {
          ...existing,
          processedData: img.processedData,
          processedBlob: img.processedBlob,
          lastParams: { ...params },
          isProcessed: true,
        })
      }
    })

    set({
      processedImages: images,
      imageCache: newCache,
    })
  },

  updateImageCache: (id: string, cache: Partial<ImageCache>) => {
    const newCache = new Map(get().imageCache)
    const existing = newCache.get(id)
    if (existing) {
      newCache.set(id, { ...existing, ...cache })
      set({ imageCache: newCache })
    }
  },

  getImageCache: (id: string) => get().imageCache.get(id),

  setCropOffset: (id: string, offset: CropOffset | null) => {
    const newCache = new Map(get().imageCache)
    const existing = newCache.get(id)
    if (existing) {
      newCache.set(id, {
        ...existing,
        cropOffset: offset,
        isProcessed: false,
      })
      set({ imageCache: newCache })
    }
  },

  setComplete: (complete: boolean) => set({ isComplete: complete }),

  setShowResults: (show: boolean) => set({ showResults: show }),

  startProcessing: async () => {
    const state = get()
    if (state.images.length === 0 || state.isProcessing) return

    set({
      isProcessing: true,
      processingProgress: 0,
      processingTotal: state.images.length,
      isComplete: false,
      showResults: false,
    })

    const batchInput = state.images.map((img) => {
      const cache = state.imageCache.get(img.id)
      return {
        id: img.id,
        fileName: img.fileName,
        imageData: img.imageData,
        cropOffset: cache?.cropOffset || null,
      }
    })

    try {
      const results = await batchProcess(
        batchInput,
        state.params,
        (current, total) => {
          set({
            processingProgress: current,
            processingTotal: total,
          })
          return new Promise((resolve) => setTimeout(resolve, 0))
        }
      )

      set({
        processedImages: results,
        isProcessing: false,
        isComplete: true,
        showResults: true,
      })

      const newCache = new Map(state.imageCache)
      results.forEach((img) => {
        const existing = newCache.get(img.id)
        if (existing) {
          newCache.set(img.id, {
            ...existing,
            processedData: img.processedData,
            processedBlob: img.processedBlob,
            lastParams: { ...state.params },
            isProcessed: true,
          })
        }
      })
      set({ imageCache: newCache })
    } catch (err) {
      console.error('处理失败:', err)
      set({ isProcessing: false })
      alert('处理失败，请重试')
    }
  },

  downloadAll: async () => {
    const state = get()
    if (state.processedImages.length === 0) return

    try {
      await downloadAllAsZip(state.processedImages)
    } catch (err) {
      console.error('下载失败:', err)
      alert('下载失败，请重试')
    }
  },

  reset: () => {
    const state = get()
    state.images.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    set({
      images: [],
      selectedImageId: null,
      isProcessing: false,
      processingProgress: 0,
      processingTotal: 0,
      processedImages: [],
      imageCache: new Map(),
      isComplete: false,
      showResults: false,
    })
  },
}))
