export function generateColorPaletteSVG(colors: string[]): string {
  const width = 240
  const height = 60
  const blockWidth = width / colors.length

  let rects = ''
  colors.forEach((color, i) => {
    rects += `<rect x="${i * blockWidth}" y="0" width="${blockWidth}" height="${height}" fill="${color}" />`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${rects}
</svg>`
}

export function triggerDownload(data: string, filename: string, type: 'svg' | 'png') {
  const mimeType = type === 'svg' ? 'image/svg+xml' : 'image/png'
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
