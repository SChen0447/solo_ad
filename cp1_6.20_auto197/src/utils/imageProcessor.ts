import axios from 'axios'
import type { ExtractedColor, ExtractedFont, ComponentVersion } from '../types'

export async function extractImageFeatures(
  file: File,
  componentName: string
): Promise<ComponentVersion> {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('componentName', componentName)

  const response = await axios.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 2000
  })

  return response.data.version
}

export async function extractColorsAndFonts(
  imageUrl: string
): Promise<{ colors: ExtractedColor[]; fonts: ExtractedFont[] }> {
  const response = await axios.post('/api/extract', { imageUrl }, { timeout: 500 })
  return response.data
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 }
}

export function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
