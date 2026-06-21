export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface WatermarkConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  opacity: number;
  position: WatermarkPosition;
  rotation: number;
}

export interface ImageItem {
  id: string;
  file: File;
  url: string;
  name: string;
  width: number;
  height: number;
  processedBlob?: Blob;
}

const POSITION_OFFSETS: Record<WatermarkPosition, { x: number; y: number }> = {
  'top-left': { x: 0.05, y: 0.05 },
  'top-center': { x: 0.5, y: 0.05 },
  'top-right': { x: 0.95, y: 0.05 },
  'center-left': { x: 0.05, y: 0.5 },
  'center': { x: 0.5, y: 0.5 },
  'center-right': { x: 0.95, y: 0.5 },
  'bottom-left': { x: 0.05, y: 0.95 },
  'bottom-center': { x: 0.5, y: 0.95 },
  'bottom-right': { x: 0.95, y: 0.95 },
};

const POSITION_ALIGN: Record<WatermarkPosition, { align: CanvasTextAlign; baseline: CanvasTextBaseline }> = {
  'top-left': { align: 'left', baseline: 'top' },
  'top-center': { align: 'center', baseline: 'top' },
  'top-right': { align: 'right', baseline: 'top' },
  'center-left': { align: 'left', baseline: 'middle' },
  'center': { align: 'center', baseline: 'middle' },
  'center-right': { align: 'right', baseline: 'middle' },
  'bottom-left': { align: 'left', baseline: 'bottom' },
  'bottom-center': { align: 'center', baseline: 'bottom' },
  'bottom-right': { align: 'right', baseline: 'bottom' },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function drawWatermarkOnCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  config: WatermarkConfig
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (!config.text.trim()) return;

  const { r, g, b } = hexToRgb(config.color);
  const rgbaColor = `rgba(${r}, ${g}, ${b}, ${config.opacity})`;

  const scaleFontSize = Math.max(10, Math.min(100, (config.fontSize / 400) * canvas.width));

  ctx.save();
  ctx.font = `${scaleFontSize}px "${config.fontFamily}"`;
  ctx.fillStyle = rgbaColor;
  ctx.textAlign = POSITION_ALIGN[config.position].align;
  ctx.textBaseline = POSITION_ALIGN[config.position].baseline;

  const offset = POSITION_OFFSETS[config.position];
  const x = canvas.width * offset.x;
  const y = canvas.height * offset.y;

  ctx.translate(x, y);
  ctx.rotate((config.rotation * Math.PI) / 180);
  ctx.fillText(config.text, 0, 0);
  ctx.restore();
}

export async function renderWatermark(
  imageUrl: string,
  config: WatermarkConfig
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      drawWatermarkOnCanvas(canvas, image, config);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate blob'));
          }
        },
        'image/png',
        0.95
      );
    };
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = imageUrl;
  });
}
