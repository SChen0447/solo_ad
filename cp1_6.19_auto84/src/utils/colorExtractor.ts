import { getPaletteSync } from 'colorthief'

export function extractColors(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Color extraction timed out'))
    }, 2000)

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const maxSize = 400
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            clearTimeout(timeoutId)
            reject(new Error('Canvas not available'))
            return
          }

          let { width, height } = img
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width)
              width = maxSize
            } else {
              width = Math.round((width * maxSize) / height)
              height = maxSize
            }
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          const palette = getPaletteSync(canvas, { colorCount: 5, quality: 5 })
          const colors = palette
            .slice(0, 5)
            .map((c) => c.hex())

          clearTimeout(timeoutId)
          resolve(colors)
        } catch (err) {
          clearTimeout(timeoutId)
          reject(err)
        }
      }
      img.onerror = () => {
        clearTimeout(timeoutId)
        reject(new Error('Image load failed'))
      }
      img.src = e.target?.result as string
    }
    reader.onerror = () => {
      clearTimeout(timeoutId)
      reject(new Error('File read failed'))
    }
    reader.readAsDataURL(file)
  })
}
