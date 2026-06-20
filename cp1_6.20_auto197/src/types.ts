export interface ExtractedColor {
  hex: string
  percentage: number
}

export interface ExtractedFont {
  name: string
  confidence: number
  sampleText: string
}

export interface ComponentVersion {
  id: string
  componentName: string
  version: number
  imageUrl: string
  uploadDate: string
  colors: ExtractedColor[]
  fonts: ExtractedFont[]
  note?: string
}

export interface Component {
  name: string
  latestColor: string
  versionCount: number
}

export interface DiffResult {
  heatmapBase64: string
  diffPercentage: number
  width: number
  height: number
}

export interface UploadResponse {
  success: boolean
  version: ComponentVersion
}
