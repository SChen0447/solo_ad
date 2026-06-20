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

async function addNoise(width: number, height: number, intensity: number): Promise<Buffer> {
  const size = width * height * 3;
  const buffer = Buffer.alloc(size);
  const baseR = 245;
  const baseG = 242;
  const baseB = 235;

  for (let i = 0; i < size; i += 3) {
    const noise1 = (Math.random() - 0.5) * intensity * 2;
    const noise2 = (Math.random() - 0.5) * intensity * 2;
    const noise3 = (Math.random() - 0.5) * intensity * 2;
    buffer[i] = clamp(baseR + noise1, 0, 255);
    buffer[i + 1] = clamp(baseG + noise2, 0, 255);
    buffer[i + 2] = clamp(baseB + noise3, 0, 255);
  }

  return buffer;
}

export async function applyWatercolor(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const saturation = 1 - (intensity / 100) * 0.5;
  const blurLevel = 1 + (intensity / 100) * 3;
  const contrastLevel = 1 + (contrast / 100) * 0.5;

  const base = sharp(buffer);

  const blurred = await base
    .clone()
    .modulate({ saturation, brightness: 1.05 })
    .blur(blurLevel)
    .toBuffer();

  const sharpLayer = await applyContrast(
    sharp(buffer).modulate({ saturation: saturation * 1.2 }),
    contrastLevel
  ).toBuffer();

  const result = await applyContrast(
    sharp(blurred)
      .composite([
        {
          input: sharpLayer,
          blend: 'overlay',
          gravity: 'center'
        }
      ])
      .modulate({ saturation }),
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
  const contrastLevel = 1 + (contrast / 100) + (intensity / 200);
  const blurLevel = 0.5 + (intensity / 100) * 2;
  const saturation = 1 + (intensity / 100) * 0.3;

  const base = sharp(buffer);

  const texture = await applyContrast(
    base
      .clone()
      .modulate({ saturation })
      .blur(blurLevel),
    contrastLevel
  ).toBuffer();

  const edges = await base
    .clone()
    .modulate({ saturation: 0 })
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      scale: 1
    })
    .modulate({ brightness: 0.3 })
    .toBuffer();

  const result = await applyContrast(
    sharp(texture)
      .composite([
        {
          input: edges,
          blend: 'soft-light',
          gravity: 'center'
        }
      ])
      .modulate({ saturation }),
    contrastLevel
  ).toBuffer();

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

  const gray = await base
    .clone()
    .modulate({ saturation: 0 })
    .toBuffer();

  const inverted = await sharp(gray)
    .negate()
    .blur(2 + (intensity / 100) * 6)
    .toBuffer();

  const sketch = await applyContrast(
    sharp(gray)
      .composite([
        {
          input: inverted,
          blend: 'colour-dodge',
          gravity: 'center'
        }
      ])
      .modulate({ brightness: 1.1 }),
    1 + (contrast / 100)
  ).toBuffer();

  const noiseIntensity = 3 + (intensity / 100) * 5;
  const paperNoiseData = await addNoise(width, height, noiseIntensity);

  const paperBuffer = await sharp(paperNoiseData, { raw: { width, height, channels: 3 } })
    .modulate({ brightness: 0.98 })
    .toBuffer();

  const result = await applyContrast(
    sharp(paperBuffer, { raw: { width, height, channels: 3 } })
      .composite([
        {
          input: sketch,
          blend: 'multiply',
          gravity: 'center'
        }
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

  const pixelSize = Math.max(2, Math.round(10 - (detail / 100) * 8 + (intensity / 100) * 5));
  const smallWidth = Math.max(32, Math.floor(width / pixelSize));
  const smallHeight = Math.max(32, Math.floor(height / pixelSize));

  const pixelated = await applyContrast(
    base
      .clone()
      .resize(smallWidth, smallHeight, { kernel: 'nearest' })
      .modulate({
        saturation: 1 + (intensity / 100) * 0.5
      }),
    1 + (contrast / 100) * 0.6
  ).toBuffer();

  const result = await sharp(pixelated)
    .resize(width, height, { kernel: 'nearest' })
    .toBuffer();

  return result;
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

  const contrastLevel = 1 + (contrast / 100) * 0.4;
  const saturation = 1 + (intensity / 100) * 0.4;

  const blur1 = await applyContrast(
    base
      .clone()
      .modulate({ saturation })
      .blur(1 + (intensity / 100) * 2),
    contrastLevel
  ).toBuffer();

  const blur2 = await applyContrast(
    base
      .clone()
      .modulate({ saturation: saturation * 1.1, brightness: 1.05 })
      .blur(3 + (intensity / 100) * 2),
    contrastLevel * 1.1
  ).toBuffer();

  const step1 = await sharp(blur1)
    .composite([
      {
        input: blur2,
        blend: 'screen',
        gravity: 'center'
      }
    ])
    .toBuffer();

  const brightLayer = await applyContrast(
    sharp(buffer)
      .modulate({
        saturation: saturation * 1.3,
        brightness: 1.1
      })
      .blur(0.5),
    contrastLevel * 1.2
  ).toBuffer();

  const result = await applyContrast(
    sharp(step1)
      .composite([
        {
          input: brightLayer,
          blend: 'soft-light',
          gravity: 'center'
        }
      ])
      .modulate({ saturation }),
    contrastLevel
  ).toBuffer();

  return result;
}

export async function processStyle(
  buffer: Buffer,
  params: StyleParams
): Promise<Buffer> {
  const intensity = clamp(params.intensity, 0, 100);
  const contrast = clamp(params.contrast, -50, 50);
  const detail = clamp(params.detail, 50, 150);

  let result: Buffer;

  switch (params.style) {
    case 'watercolor':
      result = await applyWatercolor(buffer, intensity, contrast, detail);
      break;
    case 'oil':
      result = await applyOil(buffer, intensity, contrast, detail);
      break;
    case 'sketch':
      result = await applySketch(buffer, intensity, contrast, detail);
      break;
    case 'pixel':
      result = await applyPixelArt(buffer, intensity, contrast, detail);
      break;
    case 'impressionism':
      result = await applyImpressionism(buffer, intensity, contrast, detail);
      break;
    default:
      result = buffer;
  }

  return result;
}
