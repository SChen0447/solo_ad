type RGB = [number, number, number]

interface ColorBucket {
  colors: RGB[]
  min: RGB
  max: RGB
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0'))
      .join('')
  )
}

function hexToRgb(hex: string): RGB {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function getAverageColor(colors: RGB[]): RGB {
  if (colors.length === 0) return [128, 128, 128]
  const sum = colors.reduce(
    (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
    [0, 0, 0] as RGB
  )
  return [Math.round(sum[0] / colors.length), Math.round(sum[1] / colors.length), Math.round(sum[2] / colors.length)]
}

function getBucketRange(bucket: ColorBucket): { channel: number; range: number } {
  const ranges = [
    bucket.max[0] - bucket.min[0],
    bucket.max[1] - bucket.min[1],
    bucket.max[2] - bucket.min[2],
  ]
  const channel = ranges.indexOf(Math.max(...ranges))
  return { channel, range: ranges[channel] }
}

function medianCut(colors: RGB[], targetColors: number): RGB[] {
  if (colors.length === 0) return Array.from({ length: targetColors }, () => [128, 128, 128] as RGB)

  let buckets: ColorBucket[] = [
    {
      colors,
      min: [
        Math.min(...colors.map((c) => c[0])),
        Math.min(...colors.map((c) => c[1])),
        Math.min(...colors.map((c) => c[2])),
      ],
      max: [
        Math.max(...colors.map((c) => c[0])),
        Math.max(...colors.map((c) => c[1])),
        Math.max(...colors.map((c) => c[2])),
      ],
    },
  ]

  while (buckets.length < targetColors) {
    let bestIdx = -1
    let bestRange = -1
    for (let i = 0; i < buckets.length; i++) {
      const { range } = getBucketRange(buckets[i])
      if (range > bestRange && buckets[i].colors.length > 1) {
        bestRange = range
        bestIdx = i
      }
    }

    if (bestIdx === -1) break

    const bucket = buckets[bestIdx]
    const { channel } = getBucketRange(bucket)
    const sorted = [...bucket.colors].sort((a, b) => a[channel] - b[channel])
    const mid = Math.floor(sorted.length / 2)

    const leftColors = sorted.slice(0, mid)
    const rightColors = sorted.slice(mid)

    const makeBucket = (cols: RGB[]): ColorBucket => ({
      colors: cols,
      min: [
        Math.min(...cols.map((c) => c[0])),
        Math.min(...cols.map((c) => c[1])),
        Math.min(...cols.map((c) => c[2])),
      ],
      max: [
        Math.max(...cols.map((c) => c[0])),
        Math.max(...cols.map((c) => c[1])),
        Math.max(...cols.map((c) => c[2])),
      ],
    })

    buckets.splice(bestIdx, 1, makeBucket(leftColors), makeBucket(rightColors))
  }

  while (buckets.length < targetColors) {
    buckets.push({ colors: [[128, 128, 128]], min: [128, 128, 128], max: [128, 128, 128] })
  }

  return buckets.map((b) => getAverageColor(b.colors)).slice(0, targetColors)
}

function colorDistance(a: RGB, b: RGB): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
}

function findNearestPaletteColor(color: RGB, palette: RGB[]): RGB {
  let minDist = Infinity
  let nearest = palette[0]
  for (const p of palette) {
    const d = colorDistance(color, p)
    if (d < minDist) {
      minDist = d
      nearest = p
    }
  }
  return nearest
}

export function pixelateImage(
  img: HTMLImageElement,
  gridSize: 16 | 32
): { pixelGrid: string[][]; palette: string[] } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const size = Math.min(img.width, img.height)
  const sx = (img.width - size) / 2
  const sy = (img.height - size) / 2

  canvas.width = gridSize
  canvas.height = gridSize
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(img, sx, sy, size, size, 0, 0, gridSize, gridSize)

  const imageData = ctx.getImageData(0, 0, gridSize, gridSize)
  const data = imageData.data

  const rawColors: RGB[] = []
  const gridColors: RGB[][] = []

  for (let y = 0; y < gridSize; y++) {
    const row: RGB[] = []
    for (let x = 0; x < gridSize; x++) {
      const idx = (y * gridSize + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      row.push([r, g, b])
      rawColors.push([r, g, b])
    }
    gridColors.push(row)
  }

  const paletteRGB = medianCut(rawColors, 16)
  const paletteHex = paletteRGB.map((c) => rgbToHex(c[0], c[1], c[2]))

  const pixelGrid = gridColors.map((row) =>
    row.map((color) => {
      const nearest = findNearestPaletteColor(color, paletteRGB)
      return rgbToHex(nearest[0], nearest[1], nearest[2])
    })
  )

  return { pixelGrid, palette: paletteHex }
}

export function renderPixelArtToCanvas(
  pixelGrid: string[][],
  outputSize: number,
  palette: string[],
  _gridSize: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')!

  const rows = pixelGrid.length
  const cols = pixelGrid.length > 0 ? pixelGrid[0].length : 0
  if (rows === 0 || cols === 0) return canvas

  const cellW = outputSize / cols
  const cellH = outputSize / rows

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const color = pixelGrid[y][x]
      ctx.fillStyle = color
      ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
    }
  }

  ctx.strokeStyle = 'rgba(51, 51, 51, 0.6)'
  ctx.lineWidth = 0.5
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * cellH)
    ctx.lineTo(outputSize, y * cellH)
    ctx.stroke()
  }
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath()
    ctx.moveTo(x * cellW, 0)
    ctx.lineTo(x * cellW, outputSize)
    ctx.stroke()
  }

  void palette
  void _gridSize

  return canvas
}

export { rgbToHex, hexToRgb, colorDistance, findNearestPaletteColor }
export type { RGB }
