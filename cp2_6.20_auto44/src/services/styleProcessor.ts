import sharp from 'sharp';
import type { StyleParams, StyleType } from '../types';

interface ProcessResult {
  success: boolean;
  imageBuffer?: Buffer;
  error?: string;
}

const createWatercolorEffect = async (
  image: sharp.Sharp,
  intensity: number,
  contrast: number,
  detailLevel: number
): Promise<sharp.Sharp> => {
  const saturation = 1 - (intensity / 100) * 0.6;
  const blurAmount = 1 + (intensity / 100) * 3;
  const brightness = 1 + (contrast / 200);

  const original = await image.toBuffer();
  const base = sharp(original)
    .modulate({ saturation, brightness })
    .linear(1 + contrast / 100, -(contrast / 200) * 255);

  const blurred = sharp(original)
    .blur(blurAmount)
    .modulate({ saturation: saturation * 0.8, brightness: brightness * 1.1 });

  const [baseBuffer, blurredBuffer] = await Promise.all([
    base.toBuffer(),
    blurred.toBuffer()
  ]);

  const metadata = await sharp(original).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  const baseImg = sharp(baseBuffer);
  const blurredImg = sharp(blurredBuffer)
    .composite([{
      input: baseBuffer,
      blend: 'overlay',
      gravity: 'center'
    }]);

  const result = sharp(await blurredImg.toBuffer())
    .modulate({
      saturation: 0.9 + (detailLevel / 500),
      brightness: 1.05
    });

  return result;
};

const createOilEffect = async (
  image: sharp.Sharp,
  intensity: number,
  contrast: number,
  detailLevel: number
): Promise<sharp.Sharp> => {
  const medianSize = Math.round(1 + (intensity / 100) * 2);
  const saturationBoost = 1 + (intensity / 100) * 0.5;

  const result = image
    .linear(1 + contrast / 80, -(contrast / 160) * 255)
    .modulate({
      saturation: saturationBoost,
      brightness: 1.05 + (contrast / 400)
    })
    .median(medianSize)
    .modulate({
      saturation: 0.95 + (detailLevel / 300)
    });

  return result;
};

const createSketchEffect = async (
  image: sharp.Sharp,
  intensity: number,
  contrast: number,
  detailLevel: number
): Promise<sharp.Sharp> => {
  const originalBuffer = await image.toBuffer();
  const metadata = await sharp(originalBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  const grayscale = sharp(originalBuffer)
    .grayscale()
    .linear(1 + contrast / 80, -(contrast / 160) * 255)
    .normalise();

  const inverted = sharp(originalBuffer)
    .grayscale()
    .negate()
    .blur(1 + (intensity / 100) * 2);

  const [grayBuffer, invertedBuffer] = await Promise.all([
    grayscale.toBuffer(),
    inverted.toBuffer()
  ]);

  const sketch = sharp(grayBuffer)
    .composite([{
      input: invertedBuffer,
      blend: 'colour-dodge',
      gravity: 'center'
    }])
    .linear(1 + (intensity / 200), 0)
    .modulate({
      brightness: 1.1 + (detailLevel / 500)
    });

  return sketch;
};

const createPixelEffect = async (
  image: sharp.Sharp,
  intensity: number,
  contrast: number,
  detailLevel: number
): Promise<sharp.Sharp> => {
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  const pixelStep = Math.max(2, Math.round(20 - (detailLevel / 8)));
  const downscaleWidth = Math.round(width / pixelStep);
  const downscaleHeight = Math.round(height / pixelStep);

  const result = image
    .resize(downscaleWidth, downscaleHeight, {
      kernel: sharp.kernel.nearest
    })
    .resize(width, height, {
      kernel: sharp.kernel.nearest
    })
    .linear(1 + contrast / 100, -(contrast / 200) * 255)
    .modulate({
      saturation: 1 + (intensity / 200)
    });

  return result;
};

const createImpressionismEffect = async (
  image: sharp.Sharp,
  intensity: number,
  contrast: number,
  detailLevel: number
): Promise<sharp.Sharp> => {
  const originalBuffer = await image.toBuffer();

  const base = sharp(originalBuffer)
    .modulate({ saturation: 1.1 })
    .linear(1 + contrast / 100, -(contrast / 200) * 255);

  const brushSize = 1 + (intensity / 100) * 3;

  const layers = await Promise.all([
    base.clone().blur(brushSize * 0.5).modulate({ brightness: 1.1, saturation: 1.15 }).toBuffer(),
    base.clone().blur(brushSize).modulate({ brightness: 0.95, saturation: 1.05 }).toBuffer(),
    base.clone().blur(brushSize * 1.5).modulate({ brightness: 1.05, saturation: 1.25 }).toBuffer()
  ]);

  let result = sharp(layers[0])
    .composite([
      { input: layers[1], blend: 'soft-light', gravity: 'center' },
      { input: layers[2], blend: 'overlay', gravity: 'center' }
    ])
    .modulate({
      brightness: 1.05,
      saturation: 1.1 + (detailLevel / 500)
    });

  return result;
};

export const processImageWithStyle = async (
  imageBuffer: Buffer,
  params: StyleParams
): Promise<ProcessResult> => {
  try {
    const { style, intensity, contrast, detailLevel } = params;

    let image = sharp(imageBuffer);

    const styleProcessors: Record<StyleType, (img: sharp.Sharp, i: number, c: number, d: number) => Promise<sharp.Sharp>> = {
      watercolor: createWatercolorEffect,
      oil: createOilEffect,
      sketch: createSketchEffect,
      pixel: createPixelEffect,
      impressionism: createImpressionismEffect
    };

    const processor = styleProcessors[style];
    if (!processor) {
      return { success: false, error: 'Invalid style type' };
    }

    const processed = await processor(image, intensity, contrast, detailLevel);
    const resultBuffer = await processed.jpeg({ quality: 90 }).toBuffer();

    return { success: true, imageBuffer: resultBuffer };
  } catch (error) {
    console.error('Error processing image:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const bufferToBase64 = (buffer: Buffer): string => {
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
};
