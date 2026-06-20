import sharp from 'sharp';
import type { StyleParams, StyleType } from '../types';

interface ProcessResult {
  success: boolean;
  imageBuffer?: Buffer;
  error?: string;
}

async function createWatercolorEffect(
  imageBuffer: Buffer,
  intensity: number,
  contrast: number,
  detailLevel: number
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width || 800;
  const h = meta.height || 600;

  const normalised = await sharp(imageBuffer)
    .normalise()
    .toBuffer();

  const satReduction = 1 - (intensity / 100) * 0.55;
  const blurSigma = 0.3 + (intensity / 100) * 4;

  const baseLayer = await sharp(normalised)
    .modulate({ saturation: satReduction, brightness: 1.02 + contrast / 300 })
    .linear(1 + contrast / 150, -(contrast / 300) * 128)
    .toBuffer();

  const wetLayer = await sharp(normalised)
    .blur(blurSigma)
    .modulate({ saturation: satReduction * 0.85, brightness: 1.08 + contrast / 400 })
    .toBuffer();

  const edgeLayer = await sharp(normalised)
    .grayscale()
    .convolve({
      width: 3, height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      scale: 1, offset: 0
    })
    .threshold(30)
    .negate()
    .blur(0.3)
    .toBuffer();

  const blended = await sharp(wetLayer)
    .composite([
      { input: baseLayer, blend: 'overlay' },
      { input: edgeLayer, blend: 'multiply' }
    ])
    .toBuffer();

  const finalDetail = 0.8 + (detailLevel / 300);
  const result = await sharp(blended)
    .modulate({ saturation: 0.85 * finalDetail, brightness: 1.03 })
    .linear(1.05, -12)
    .sharpen({ sigma: 0.3 + (detailLevel / 200) })
    .jpeg({ quality: 92 })
    .toBuffer();

  return result;
}

async function createOilEffect(
  imageBuffer: Buffer,
  intensity: number,
  contrast: number,
  detailLevel: number
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width || 800;
  const h = meta.height || 600;

  const medianR = Math.max(1, Math.round(1 + (intensity / 100) * 4));
  const satBoost = 1 + (intensity / 100) * 0.6;
  const contrastMul = 1 + contrast / 80;
  const contrastSub = -(contrast / 160) * 128;

  const base = await sharp(imageBuffer)
    .modulate({ saturation: satBoost, brightness: 1.0 + contrast / 400 })
    .linear(contrastMul, contrastSub)
    .median(medianR)
    .toBuffer();

  const detail = await sharp(imageBuffer)
    .sharpen({ sigma: 1.5 })
    .linear(1.5, -64)
    .blur(0.5)
    .toBuffer();

  const textureOverlay = await sharp({
    create: {
      width: w, height: h, channels: 3,
      background: { r: 128, g: 128, b: 128 }
    }
  })
    .noise({ type: 'gaussian', mean: 128, sigma: 20 + intensity * 0.3 })
    .blur(1.5)
    .toBuffer();

  const blended = await sharp(base)
    .composite([
      { input: detail, blend: 'soft-light' },
      { input: textureOverlay, blend: 'soft-light' }
    ])
    .toBuffer();

  const finalSat = 0.9 + (detailLevel / 250);
  const result = await sharp(blended)
    .modulate({ saturation: finalSat, brightness: 1.02 })
    .sharpen({ sigma: 0.2 + (detailLevel / 300) })
    .jpeg({ quality: 92 })
    .toBuffer();

  return result;
}

async function createSketchEffect(
  imageBuffer: Buffer,
  intensity: number,
  contrast: number,
  detailLevel: number
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width || 800;
  const h = meta.height || 600;

  const grayBase = await sharp(imageBuffer)
    .grayscale()
    .normalise()
    .toBuffer();

  const contrastMul = 1 + contrast / 60;
  const contrastSub = -(contrast / 120) * 128;

  const contrasted = await sharp(grayBase)
    .linear(contrastMul, contrastSub)
    .toBuffer();

  const edgeSobelX = await sharp(contrasted)
    .convolve({
      width: 3, height: 3,
      kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
      scale: 1, offset: 128
    })
    .toBuffer();

  const edgeSobelY = await sharp(contrasted)
    .convolve({
      width: 3, height: 3,
      kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
      scale: 1, offset: 128
    })
    .toBuffer();

  const edgeXData = await sharp(edgeSobelX).raw().toBuffer();
  const edgeYData = await sharp(edgeSobelY).raw().toBuffer();
  const magnitude = Buffer.alloc(edgeXData.length);

  for (let i = 0; i < edgeXData.length; i++) {
    const xVal = edgeXData[i] - 128;
    const yVal = edgeYData[i] - 128;
    magnitude[i] = Math.min(255, Math.max(0, 255 - Math.round(Math.sqrt(xVal * xVal + yVal * yVal) * (0.5 + intensity / 100))));
  }

  const edgeResult = await sharp(magnitude, {
    raw: { width: w, height: h, channels: 1 }
  }).toBuffer();

  const paperTexture = await sharp({
    create: {
      width: w, height: h, channels: 1,
      background: { r: 245, g: 245, b: 245 }
    }
  })
    .noise({ type: 'gaussian', mean: 240, sigma: 8 })
    .toBuffer();

  const sketchOnPaper = await sharp(edgeResult, {
    raw: { width: w, height: h, channels: 1 }
  })
    .composite([
      { input: paperTexture, blend: 'multiply' }
    ])
    .toBuffer();

  const detailAdjust = 0.8 + (detailLevel / 250);
  const result = await sharp(sketchOnPaper, {
    raw: { width: w, height: h, channels: 1 }
  })
    .linear(detailAdjust, -(detailAdjust - 1) * 128)
    .modulate({ brightness: 1.0 + contrast / 500 })
    .jpeg({ quality: 92 })
    .toBuffer();

  return result;
}

async function createPixelEffect(
  imageBuffer: Buffer,
  intensity: number,
  contrast: number,
  detailLevel: number
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width || 800;
  const h = meta.height || 600;

  const pixelSize = Math.max(2, Math.round(4 + (100 - intensity) * 0.2 + (150 - detailLevel) * 0.06));
  const smallW = Math.max(2, Math.round(w / pixelSize));
  const smallH = Math.max(2, Math.round(h / pixelSize));

  const contrastMul = 1 + contrast / 100;
  const contrastSub = -(contrast / 200) * 128;

  const downsampled = await sharp(imageBuffer)
    .resize(smallW, smallH, { kernel: 'nearest' })
    .modulate({ saturation: 1.1 + (intensity / 300) })
    .linear(contrastMul, contrastSub)
    .toBuffer();

  const result = await sharp(downsampled)
    .resize(w, h, { kernel: 'nearest' })
    .jpeg({ quality: 95 })
    .toBuffer();

  return result;
}

async function createImpressionismEffect(
  imageBuffer: Buffer,
  intensity: number,
  contrast: number,
  detailLevel: number
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width || 800;
  const h = meta.height || 600;

  const brushSize = 1 + (intensity / 100) * 4;
  const contrastMul = 1 + contrast / 100;
  const contrastSub = -(contrast / 200) * 128;

  const base = await sharp(imageBuffer)
    .modulate({ saturation: 1.2, brightness: 1.02 })
    .linear(contrastMul, contrastSub)
    .toBuffer();

  const layer1 = await sharp(base)
    .blur(brushSize * 0.3)
    .modulate({ saturation: 1.3, brightness: 1.08 })
    .sharpen({ sigma: 0.8 })
    .toBuffer();

  const layer2 = await sharp(base)
    .blur(brushSize * 0.7)
    .modulate({ saturation: 1.1, brightness: 0.98 })
    .toBuffer();

  const layer3 = await sharp(base)
    .blur(brushSize * 1.2)
    .modulate({ saturation: 1.4, brightness: 1.04 })
    .toBuffer();

  const layer4 = await sharp(base)
    .blur(brushSize * 2.0)
    .modulate({ saturation: 0.9, brightness: 1.1 })
    .toBuffer();

  const colorJitter = await sharp({
    create: {
      width: w, height: h, channels: 3,
      background: { r: 128, g: 128, b: 128 }
    }
  })
    .noise({ type: 'gaussian', mean: 128, sigma: 10 + intensity * 0.15 })
    .blur(2)
    .toBuffer();

  const blended = await sharp(layer1)
    .composite([
      { input: layer2, blend: 'soft-light' },
      { input: layer3, blend: 'overlay' },
      { input: layer4, blend: 'color-dodge' },
      { input: colorJitter, blend: 'soft-light' }
    ])
    .toBuffer();

  const finalSat = 1.0 + (detailLevel / 300);
  const result = await sharp(blended)
    .modulate({ saturation: finalSat, brightness: 1.02 })
    .sharpen({ sigma: 0.4 + (detailLevel / 400) })
    .jpeg({ quality: 92 })
    .toBuffer();

  return result;
}

export const processImageWithStyle = async (
  imageBuffer: Buffer,
  params: StyleParams
): Promise<ProcessResult> => {
  try {
    const { style, intensity, contrast, detailLevel } = params;

    const styleProcessors: Record<StyleType, (buf: Buffer, i: number, c: number, d: number) => Promise<Buffer>> = {
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

    const resultBuffer = await processor(imageBuffer, intensity, contrast, detailLevel);

    return { success: true, imageBuffer: resultBuffer };
  } catch (error) {
    console.error('Error processing image:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const bufferToBase64 = (buffer: Buffer): string => {
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
};
