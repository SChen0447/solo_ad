import { MosaicBlock, rgbToHex, LockedColor } from '../store'
import { quantizeWithLockedColors, RGBColor } from './quantize'

export function generateMosaicBlocks(
  imageData: ImageData,
  pixelSize: number,
  colorLevels: number,
  lockedColors: LockedColor[] = []
): MosaicBlock[] {
  const { width, height, data } = imageData
  const blocks: MosaicBlock[] = []

  const cols = Math.ceil(width / pixelSize)
  const rows = Math.ceil(height / pixelSize)

  const lockedRGB: RGBColor[] = lockedColors.map(lc => ({ r: lc.r, g: lc.g, b: lc.b }))

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const startX = col * pixelSize
      const startY = row * pixelSize
      const endX = Math.min(startX + pixelSize, width)
      const endY = Math.min(startY + pixelSize, height)

      let totalR = 0
      let totalG = 0
      let totalB = 0
      let count = 0

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * width + x) * 4
          totalR += data[idx]
          totalG += data[idx + 1]
          totalB += data[idx + 2]
          count++
        }
      }

      const avgColor = {
        r: Math.round(totalR / count),
        g: Math.round(totalG / count),
        b: Math.round(totalB / count),
      }

      const quantizedColor = quantizeWithLockedColors(avgColor, colorLevels, lockedRGB)

      blocks.push({
        x: startX,
        y: startY,
        width: endX - startX,
        height: endY - startY,
        color: quantizedColor,
        row,
        col,
      })
    }
  }

  return blocks
}

export function generateSVG(
  blocks: MosaicBlock[],
  width: number,
  height: number
): string {
  const svgParts: string[] = []

  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`)

  for (const block of blocks) {
    const hex = rgbToHex(block.color.r, block.color.g, block.color.b)
    svgParts.push(
      `<rect x="${block.x}" y="${block.y}" width="${block.width}" height="${block.height}" fill="${hex}" shape-rendering="crispEdges"/>`
    )
  }

  svgParts.push('</svg>')

  return svgParts.join('')
}
