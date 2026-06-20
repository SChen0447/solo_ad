export interface StyleParams {
  style: string
  intensity: number
  contrast: number
  detail: number
}

export interface StyleResponse {
  success: boolean
  image: string
}

export interface ShareResponse {
  success: boolean
  shareId: string
  shareUrl: string
}

export async function processStyle(
  imageFile: File,
  params: StyleParams
): Promise<StyleResponse> {
  const formData = new FormData()
  formData.append('image', imageFile)
  formData.append('style', params.style)
  formData.append('intensity', params.intensity.toString())
  formData.append('contrast', params.contrast.toString())
  formData.append('detail', params.detail.toString())

  const response = await fetch('/api/style', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to process image')
  }

  return response.json()
}

export async function shareImage(imageFile: File): Promise<ShareResponse> {
  const formData = new FormData()
  formData.append('image', imageFile)

  const response = await fetch('/api/share', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to create share link')
  }

  return response.json()
}

export function base64ToFile(base64: string, filename: string): File {
  const base64Data = base64.split(',')[1]
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: 'image/png' })
  return new File([blob], filename, { type: 'image/png' })
}
