import sharp from 'sharp'

interface StyleOptions {
  imageBuffer: Buffer
  style: string
  intensity: number
  contrast: number
  detail: number
}

export async function styleProcessor(options: StyleOptions): Promise<Buffer> {
  const { imageBuffer, style, intensity, contrast, detail } = options
  const intensityFactor = intensity / 100
  const detailFactor = detail / 100

  let pipeline = sharp(imageBuffer)

  if (contrast !== 0) {
    pipeline = pipeline.linear(
      1 + contrast / 100,
      -(contrast / 100) * 128
    )
  }

  switch (style) {
    case 'watercolor':
      return applyWatercolor(pipeline, intensityFactor, detailFactor)
    case 'oil':
      return applyOil(pipeline, intensityFactor, detailFactor)
    case 'sketch':
      return applySketch(pipeline, intensityFactor, detailFactor)
    case 'pixel':
      return applyPixel(pipeline, intensityFactor, detailFactor)
    case 'impressionism':
      return applyImpressionism(pipeline, intensityFactor, detailFactor)
    default:
      return pipeline.png().toBuffer()
  }
}

async function applyWatercolor(
  pipeline: sharp.Sharp,
  intensity: number,
  detail: number
): Promise<Buffer> {
  const metadata = await pipeline.metadata()
  const width = metadata.width || 800
  const height = metadata.height || 600

  const blurred = await sharp(await pipeline.clone().png().toBuffer())
    .blur(2 + 3 * intensity)
    .png()
    .toBuffer()

  const saturated = await sharp(blurred)
    .modulate({
      saturation: 1.2 - 0.5 * intensity,
      brightness: 1.05
    })
    .png()
    .toBuffer()

  const paperTexture = await createPaperTexture(width, height)

  const result = await sharp(saturated)
    .composite([
      {
        input: paperTexture,
        blend: 'overlay',
        gravity: 'center'
      }
    ])
    .modulate({
      brightness: 1.02,
      saturation: 0.9 + 0.1 * (1 - intensity)
    })
    .sharpen(detail * 0.5)
    .png()
    .toBuffer()

  return result
}

async function applyOil(
  pipeline: sharp.Sharp,
  intensity: number,
  detail: number
): Promise<Buffer> {
  const result = await pipeline
    .modulate({
      saturation: 1.2 + 0.3 * intensity,
      brightness: 1.05
    })
    .blur(0.5 + 1 * intensity)
    .sharpen(detail)
    .linear(1.1 + 0.2 * intensity, -10 - 10 * intensity)
    .png()
    .toBuffer()

  const metadata = await sharp(result).metadata()
  const width = metadata.width || 800
  const height = metadata.height || 600
  const brushTexture = await createBrushTexture(width, height)

  const final = await sharp(result)
    .composite([
      {
        input: brushTexture,
        blend: 'soft-light',
        gravity: 'center'
      }
    ])
    .png()
    .toBuffer()

  return final
}

async function applySketch(
  pipeline: sharp.Sharp,
  intensity: number,
  detail: number
): Promise<Buffer> {
  const grayscale = await pipeline
    .grayscale()
    .modulate({ brightness: 1.1 })
    .png()
    .toBuffer()

  const edges = await sharp(grayscale)
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      scale: detail
    })
    .negate()
    .modulate({ brightness: 0.9 + 0.1 * (1 - intensity) })
    .png()
    .toBuffer()

  const metadata = await sharp(edges).metadata()
  const width = metadata.width || 800
  const height = metadata.height || 600
  const paperTexture = await createPaperTexture(width, height)

  const result = await sharp(edges)
    .composite([
      {
        input: paperTexture,
        blend: 'multiply',
        gravity: 'center'
      }
    ])
    .modulate({
      brightness: 0.95 + 0.05 * intensity
    })
    .linear(1.1, -12.8)
    .png()
    .toBuffer()

  return result
}

async function applyPixel(
  pipeline: sharp.Sharp,
  intensity: number,
  detail: number
): Promise<Buffer> {
  const metadata = await pipeline.metadata()
  const width = metadata.width || 800
  const height = metadata.height || 600

  const pixelSize = Math.max(2, Math.floor((1 - intensity * 0.7) * 20))

  const smallWidth = Math.floor(width / pixelSize)
  const smallHeight = Math.floor(height / pixelSize)

  const pixelated = await pipeline
    .resize(smallWidth, smallHeight, {
      kernel: sharp.kernel.nearest
    })
    .resize(width, height, {
      kernel: sharp.kernel.nearest
    })
    .sharpen(detail * 0.3)
    .modulate({
      saturation: 1.1 + 0.2 * intensity
    })
    .png()
    .toBuffer()

  return pixelated
}

async function applyImpressionism(
  pipeline: sharp.Sharp,
  intensity: number,
  detail: number
): Promise<Buffer> {
  const metadata = await pipeline.metadata()
  const width = metadata.width || 800
  const height = metadata.height || 600

  const blurred1 = await sharp(await pipeline.clone().png().toBuffer())
    .blur(1 + 2 * intensity)
    .png()
    .toBuffer()

  const blurred2 = await sharp(await pipeline.clone().png().toBuffer())
    .blur(3 + 3 * intensity)
    .png()
    .toBuffer()

  const combined = await sharp(blurred1)
    .composite([
      {
        input: blurred2,
        blend: 'screen',
        gravity: 'center'
      }
    ])
    .modulate({
      saturation: 1.15 + 0.2 * intensity,
      brightness: 1.05
    })
    .sharpen(detail * 0.8)
    .png()
    .toBuffer()

  const brushTexture = await createBrushTexture(width, height)

  const result = await sharp(combined)
    .composite([
      {
        input: brushTexture,
        blend: 'overlay',
        gravity: 'center'
      }
    ])
    .png()
    .toBuffer()

  return result
}

async function createPaperTexture(width: number, height: number): Promise<Buffer> {
  const textureSize = 256
  const rawData = Buffer.alloc(textureSize * textureSize * 4)

  for (let i = 0; i < textureSize * textureSize; i++) {
    const idx = i * 4
    const noise = 230 + Math.floor(Math.random() * 25)
    rawData[idx] = noise
    rawData[idx + 1] = noise - 5
    rawData[idx + 2] = noise - 10
    rawData[idx + 3] = 40
  }

  const texture = await sharp(rawData, {
    raw: { width: textureSize, height: textureSize, channels: 4 }
  })
    .resize(width, height, { fit: 'fill' })
    .blur(0.5)
    .png()
    .toBuffer()

  return texture
}

async function createBrushTexture(width: number, height: number): Promise<Buffer> {
  const textureSize = 512
  const rawData = Buffer.alloc(textureSize * textureSize * 4)

  for (let y = 0; y < textureSize; y++) {
    for (let x = 0; x < textureSize; x++) {
      const idx = (y * textureSize + x) * 4
      const wave = Math.sin(x * 0.05) * Math.cos(y * 0.03) * 30
      const noise = (Math.random() - 0.5) * 20
      const value = Math.floor(128 + wave + noise)
      rawData[idx] = value
      rawData[idx + 1] = value
      rawData[idx + 2] = value
      rawData[idx + 3] = 30
    }
  }

  const texture = await sharp(rawData, {
    raw: { width: textureSize, height: textureSize, channels: 4 }
  })
    .resize(width, height, { fit: 'fill' })
    .blur(1)
    .png()
    .toBuffer()

  return texture
}
