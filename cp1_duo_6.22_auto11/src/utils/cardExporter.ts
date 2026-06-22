import { saveCard, ensureMaxRecords } from './indexedDB';
import { CardRecord, SubtitleStyle } from '@/types';

export function getShadowValue(level: string): string {
  switch (level) {
    case 'none':
      return 'none';
    case 'light':
      return '1px 1px 3px rgba(0,0,0,0.5)';
    case 'medium':
      return '2px 2px 6px rgba(0,0,0,0.7)';
    case 'heavy':
      return '3px 3px 10px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)';
    default:
      return 'none';
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }

    let currentLine = '';
    const chars = Array.from(paragraph);

    for (const char of chars) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

export async function exportCard(
  croppedImageUrl: string,
  subtitleText: string,
  subtitleStyle: SubtitleStyle,
  templateName: string | null,
  exportFormat: 'png' | 'jpg'
): Promise<CardRecord> {
  const targetWidth = 1920;
  const targetHeight = 1080;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = targetWidth;
  exportCanvas.height = targetHeight;
  const ctx = exportCanvas.getContext('2d')!;

  const img = await loadImage(croppedImageUrl);

  const imgRatio = img.width / img.height;
  const canvasRatio = targetWidth / targetHeight;

  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;

  if (imgRatio > canvasRatio) {
    drawHeight = targetHeight;
    drawWidth = drawHeight * imgRatio;
    drawX = (targetWidth - drawWidth) / 2;
    drawY = 0;
  } else {
    drawWidth = targetWidth;
    drawHeight = drawWidth / imgRatio;
    drawX = 0;
    drawY = (targetHeight - drawHeight) / 2;
  }

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  const subtitleAreaY = targetHeight * 0.8;
  const subtitleAreaHeight = targetHeight * 0.2;

  const gradient = ctx.createLinearGradient(0, subtitleAreaY, 0, targetHeight);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.5)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, subtitleAreaY, targetWidth, subtitleAreaHeight);

  const baseFontSize = 48;
  const fontFamily = subtitleStyle.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  ctx.font = `bold ${baseFontSize}px ${fontFamily}`;
  ctx.fillStyle = subtitleStyle.fontColor;
  ctx.textBaseline = 'middle';

  switch (subtitleStyle.shadowLevel) {
    case 'light':
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      break;
    case 'medium':
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      break;
    case 'heavy':
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      break;
    case 'none':
    default:
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      break;
  }

  const padding = 80;
  const textMaxWidth = targetWidth - padding * 2;
  const lines = subtitleText ? wrapText(ctx, subtitleText, textMaxWidth) : [''];
  const lineHeight = baseFontSize * 1.5;
  const totalTextHeight = lines.length * lineHeight;
  const startY = subtitleAreaY + subtitleAreaHeight / 2 - totalTextHeight / 2 + lineHeight / 2;

  switch (subtitleStyle.textAlign) {
    case 'left':
      ctx.textAlign = 'left';
      break;
    case 'right':
      ctx.textAlign = 'right';
      break;
    case 'center':
    default:
      ctx.textAlign = 'center';
      break;
  }

  let xPos = targetWidth / 2;
  if (subtitleStyle.textAlign === 'left') {
    xPos = padding;
  } else if (subtitleStyle.textAlign === 'right') {
    xPos = targetWidth - padding;
  }

  lines.forEach((line, i) => {
    ctx.fillText(line, xPos, startY + i * lineHeight);
  });

  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
  const quality = exportFormat === 'jpg' ? 0.92 : undefined;
  const dataUrl = exportCanvas.toDataURL(mimeType, quality);

  const link = document.createElement('a');
  link.download = `movie-card-${Date.now()}.${exportFormat}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  await ensureMaxRecords(49);
  const record: CardRecord = {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl: croppedImageUrl,
    croppedImageUrl,
    subtitleText,
    subtitleStyle,
    templateName: templateName || '',
    exportFormat,
    createdAt: Date.now(),
    thumbnailUrl: dataUrl,
  };
  await saveCard(record);

  return record;
}
