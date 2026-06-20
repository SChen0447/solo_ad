import sharp from 'sharp';

export type StyleType = 'watercolor' | 'oil' | 'sketch' | 'pixel' | 'impressionism';

export interface StyleParams {
  style: StyleType;
  intensity: number;
  contrast: number;
  detail: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyContrast(sharpInstance: sharp.Sharp, contrastLevel: number): sharp.Sharp {
  const multiplier = contrastLevel;
  const offset = -(128 * (multiplier - 1));
  return sharpInstance.linear(multiplier, offset);
}

function generatePaperNoise(width: number, height: number, noiseLevel: number): Buffer {
  const size = width * height * 3;
  const buffer = Buffer.alloc(size);
  const baseR = 245;
  const baseG = 242;
  const baseB = 235;
  const halfNoise = noiseLevel;

  for (let i = 0; i < size; i += 3) {
    const n1 = (Math.random() - 0.5) * halfNoise * 2;
    const n2 = (Math.random() - 0.5) * halfNoise * 2;
    const n3 = (Math.random() - 0.5) * halfNoise * 2;
    buffer[i] = clamp(baseR + n1, 0, 255);
    buffer[i + 1] = clamp(baseG + n2, 0, 255);
    buffer[i + 2] = clamp(baseB + n3, 0, 255);
  }

  return buffer;
}

export async function applyWatercolor(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const saturation = 1 - (intensity / 100) * 0.55;
  const blurRadius = 0.8 + (intensity / 100) * 3.5;
  const contrastLevel = 1 + (contrast / 100) * 0.5;

  const base = sharp(buffer);
  const metadata = await base.metadata();
  const origWidth = metadata.width || 800;
  const origHeight = metadata.height || 600;
  const detailWidth = Math.ceil(origWidth * (0.7 + (detail / 100) * 0.5));
  const detailHeight = Math.ceil(origHeight * (0.7 + (detail / 100) * 0.5));
  const detailOpacity = Math.round((0.55 + (detail / 100) * 0.35) * 255);

  const colorSpread = await base
    .clone()
    .modulate({ saturation: saturation * 0.85, brightness: 1.08 })
    .blur(blurRadius * 1.4)
    .toBuffer();

  const detailLayerRaw = await base
    .clone()
    .resize(detailWidth, detailHeight)
    .modulate({ saturation: saturation * 1.15, brightness: 1.02 })
    .blur(blurRadius * 0.5)
    .toBuffer();

  const detailLayer = await sharp(detailLayerRaw)
    .ensureAlpha(detailOpacity)
    .resize(origWidth, origHeight)
    .toBuffer();

  const result = await applyContrast(
    sharp(colorSpread)
      .composite([
        {
          input: detailLayer,
          blend: 'overlay',
          gravity: 'center'
        } as any
      ])
      .modulate({
        saturation,
        brightness: 1.03
      }),
    contrastLevel
  ).toBuffer();

  return result;
}

export async function applyOil(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const contrastLevel = 1 + (contrast / 100) * 0.6 + (intensity / 200) * 0.5;
  const textureBlur = 0.5 + (intensity / 100) * 2.5;
  const saturation = 1 + (intensity / 100) * 0.35;
  const detailFactor = 0.4 + (detail / 100) * 0.5;
  const highlightOpacity = Math.round((0.25 + (intensity / 100) * 0.25) * 255);
  const edgeOpacity = Math.round(detailFactor * 255);

  const base = sharp(buffer);

  const baseTexture = await applyContrast(
    base
      .clone()
      .modulate({ saturation })
      .blur(textureBlur),
    contrastLevel
  ).toBuffer();

  const edgeLayerRaw = await base
    .clone()
    .modulate({ saturation: 0 })
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      scale: 1
    })
    .modulate({ brightness: 0.25 })
    .toBuffer();

  const edgeLayer = await sharp(edgeLayerRaw)
    .ensureAlpha(edgeOpacity)
    .toBuffer();

  const highlightStrokesRaw = await applyContrast(
    base
      .clone()
      .modulate({ saturation: saturation * 1.2, brightness: 1.1 })
      .blur(textureBlur * 0.4),
    contrastLevel * 1.1
  ).toBuffer();

  const highlightStrokes = await sharp(highlightStrokesRaw)
    .ensureAlpha(highlightOpacity)
    .toBuffer();

  const withEdges = await sharp(baseTexture)
    .composite([
      {
        input: edgeLayer,
        blend: 'soft-light',
        gravity: 'center'
      } as any
    ])
    .toBuffer();

  const result = await sharp(withEdges)
    .composite([
      {
        input: highlightStrokes,
        blend: 'hard-light',
        gravity: 'center'
      } as any
    ])
    .modulate({ saturation, brightness: 1.02 })
    .toBuffer();

  return result;
}

export async function applySketch(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const base = sharp(buffer);
  const metadata = await base.metadata();
  const { width = 800, height = 600 } = metadata;

  const blurAmount = 1.5 + (intensity / 100) * 7;
  const contrastAmount = 1 + (contrast / 100) * 0.8;
  const edgeStrength = 0.5 + (detail / 100) * 0.5;
  const edgeOpacity = Math.round(edgeStrength * 255);

  const grayBase = await base
    .clone()
    .modulate({ saturation: 0, brightness: 1.02 })
    .toBuffer();

  const invertedBlur = await sharp(grayBase)
    .negate()
    .blur(blurAmount)
    .toBuffer();

  const linesRaw = await sharp(grayBase)
    .composite([
      {
        input: invertedBlur,
        blend: 'colour-dodge',
        gravity: 'center'
      } as any
    ])
    .modulate({ brightness: 1.12 })
    .toBuffer();

  const lineArt = await applyContrast(
    sharp(linesRaw),
    contrastAmount * (0.9 + (intensity / 100) * 0.5)
  ).toBuffer();

  const sobelX = await sharp(grayBase)
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
      scale: 1
    })
    .modulate({ brightness: 0.15 })
    .toBuffer();

  const sobelY = await sharp(grayBase)
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
      scale: 1
    })
    .modulate({ brightness: 0.15 })
    .toBuffer();

  const edgesXY = await sharp(sobelX)
    .composite([
      {
        input: sobelY,
        blend: 'screen',
        gravity: 'center'
      } as any
    ])
    .toBuffer();

  const edgesWithAlpha = await sharp(edgesXY)
    .ensureAlpha(edgeOpacity)
    .toBuffer();

  const fullLines = await sharp(lineArt)
    .composite([
      {
        input: edgesWithAlpha,
        blend: 'multiply',
        gravity: 'center'
      } as any
    ])
    .toBuffer();

  const paperNoise = generatePaperNoise(
    width,
    height,
    3 + (intensity / 100) * 8
  );

  const paper = await sharp(paperNoise, { raw: { width, height, channels: 3 } })
    .modulate({ brightness: 0.98 })
    .toBuffer();

  const result = await applyContrast(
    sharp(paper, { raw: { width, height, channels: 3 } })
      .composite([
        {
          input: fullLines,
          blend: 'multiply',
          gravity: 'center'
        } as any
      ]),
    1 + (contrast / 200)
  ).toBuffer();

  return result;
}

export async function applyPixelArt(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const base = sharp(buffer);
  const metadata = await base.metadata();
  const { width = 800, height = 600 } = metadata;

  const pixelBlockSize = Math.max(
    2,
    Math.round(10 - (detail / 100) * 8 + (intensity / 100) * 6)
  );
  const smallWidth = Math.max(32, Math.floor(width / pixelBlockSize));
  const smallHeight = Math.max(32, Math.floor(height / pixelBlockSize));
  const pixelContrast = 1 + (contrast / 100) * 0.7;
  const pixelSat = 1 + (intensity / 100) * 0.55;

  const paletteQuantized = await applyContrast(
    base
      .clone()
      .resize(smallWidth, smallHeight, { kernel: 'nearest' })
      .modulate({
        saturation: pixelSat,
        brightness: 1.03
      }),
    pixelContrast
  ).toBuffer();

  const pixelated = await sharp(paletteQuantized)
    .resize(width, height, { kernel: 'nearest' })
    .toBuffer();

  if (intensity > 60) {
    const outlineOpacity = Math.round(((intensity - 60) / 100) * 255);

    const outlineRaw = await sharp(paletteQuantized)
      .modulate({ saturation: 0 })
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
        scale: 1
      })
      .modulate({ brightness: 0.12 })
      .resize(width, height, { kernel: 'nearest' })
      .toBuffer();

    const outline = await sharp(outlineRaw)
      .ensureAlpha(outlineOpacity)
      .toBuffer();

    const withOutline = await sharp(pixelated)
      .composite([
        {
          input: outline,
          blend: 'multiply',
          gravity: 'center'
        } as any
      ])
      .toBuffer();

    return withOutline;
  }

  return pixelated;
}

export async function applyImpressionism(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const base = sharp(buffer);
  const metadata = await base.metadata();
  const { width = 800, height = 600 } = metadata;

  const contrastLevel = 1 + (contrast / 100) * 0.5;
  const saturation = 1 + (intensity / 100) * 0.45;
  const strokeSmoothness = 1 + (intensity / 100) * 2.5;
  const detailBlend = 0.4 + (detail / 100) * 0.4;
  const b2Opacity = Math.round((0.55 + (intensity / 100) * 0.25) * 255);
  const b3Opacity = Math.round((0.35 + (intensity / 100) * 0.25) * 255);
  const b4Opacity = Math.round(detailBlend * 255);

  const shortBrush1 = await applyContrast(
    base
      .clone()
      .modulate({ saturation: saturation * 1.0, brightness: 1.05 })
      .blur(strokeSmoothness * 1.1),
    contrastLevel * 1.05
  ).toBuffer();

  const shortBrush2Raw = await applyContrast(
    base
      .clone()
      .resize(Math.ceil(width * 0.85), Math.ceil(height * 0.85))
      .modulate({ saturation: saturation * 1.15, brightness: 1.08 })
      .blur(strokeSmoothness * 1.8)
      .resize(width, height),
    contrastLevel * 1.1
  ).toBuffer();

  const shortBrush2 = await sharp(shortBrush2Raw)
    .ensureAlpha(b2Opacity)
    .toBuffer();

  const dappledLightRaw = await applyContrast(
    base
      .clone()
      .resize(Math.ceil(width * 0.7), Math.ceil(height * 0.7))
      .modulate({ saturation: saturation * 1.25, brightness: 1.12 })
      .blur(strokeSmoothness * 2.8)
      .resize(width, height),
    contrastLevel * 1.15
  ).toBuffer();

  const dappledLight = await sharp(dappledLightRaw)
    .ensureAlpha(b3Opacity)
    .toBuffer();

  const layer12 = await sharp(shortBrush1)
    .composite([
      {
        input: shortBrush2,
        blend: 'overlay',
        gravity: 'center'
      } as any
    ])
    .toBuffer();

  const layer123 = await sharp(layer12)
    .composite([
      {
        input: dappledLight,
        blend: 'screen',
        gravity: 'center'
      } as any
    ])
    .toBuffer();

  const detailPreserveRaw = await applyContrast(
    base
      .clone()
      .modulate({
        saturation: saturation * 0.9,
        brightness: 1.02
      })
      .blur(strokeSmoothness * 0.4),
    contrastLevel * 0.95
  ).toBuffer();

  const detailPreserve = await sharp(detailPreserveRaw)
    .ensureAlpha(b4Opacity)
    .toBuffer();

  const result = await sharp(layer123)
    .composite([
      {
        input: detailPreserve,
        blend: 'soft-light',
        gravity: 'center'
      } as any
    ])
    .modulate({ saturation, brightness: 1.02 })
    .toBuffer();

  return result;
}

export async function processStyle(
  buffer: Buffer,
  params: StyleParams
): Promise<Buffer> {
  const intensity = clamp(params.intensity, 0, 100);
  const contrast = clamp(params.contrast, -50, 50);
  const detail = clamp(params.detail, 50, 150);

  let sourceBuffer = buffer;
  const testImg = sharp(buffer);
  const meta = await testImg.metadata();
  const maxDim = 1400;

  if ((meta.width || 0) > maxDim || (meta.height || 0) > maxDim) {
    sourceBuffer = await testImg
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
  }

  let result: Buffer;

  switch (params.style) {
    case 'watercolor':
      result = await applyWatercolor(sourceBuffer, intensity, contrast, detail);
      break;
    case 'oil':
      result = await applyOil(sourceBuffer, intensity, contrast, detail);
      break;
    case 'sketch':
      result = await applySketch(sourceBuffer, intensity, contrast, detail);
      break;
    case 'pixel':
      result = await applyPixelArt(sourceBuffer, intensity, contrast, detail);
      break;
    case 'impressionism':
      result = await applyImpressionism(sourceBuffer, intensity, contrast, detail);
      break;
    default:
      result = sourceBuffer;
  }

  return result;
}
