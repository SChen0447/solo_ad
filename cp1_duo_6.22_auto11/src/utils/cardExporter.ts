import html2canvas from 'html2canvas';
import { saveCard, ensureMaxRecords } from './indexedDB';
import { CardRecord, SubtitleStyle } from '@/types';

function getShadowValue(level: string): string {
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

export async function exportCard(
  previewElement: HTMLElement,
  croppedImageUrl: string,
  subtitleText: string,
  subtitleStyle: SubtitleStyle,
  templateName: string | null,
  exportFormat: 'png' | 'jpg'
): Promise<void> {
  const canvas = await html2canvas(previewElement, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    width: previewElement.offsetWidth,
    height: previewElement.offsetHeight,
  });

  const targetWidth = 1920;
  const targetHeight = 1080;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = targetWidth;
  exportCanvas.height = targetHeight;
  const ctx = exportCanvas.getContext('2d')!;

  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  const subtitleAreaY = targetHeight * 0.8;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, subtitleAreaY, targetWidth, targetHeight * 0.2);

  const scaledFontSize = subtitleStyle.fontSize * (targetWidth / previewElement.offsetWidth) * 1.2;
  ctx.font = `${scaledFontSize}px ${subtitleStyle.fontFamily.split(',')[0].trim()}`;
  ctx.fillStyle = subtitleStyle.fontColor;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = subtitleStyle.shadowLevel === 'none' ? 0 : subtitleStyle.shadowLevel === 'light' ? 3 : subtitleStyle.shadowLevel === 'medium' ? 6 : 12;
  ctx.shadowOffsetX = subtitleStyle.shadowLevel === 'none' ? 0 : 2;
  ctx.shadowOffsetY = subtitleStyle.shadowLevel === 'none' ? 0 : 2;

  const lines = subtitleText.split('\n');
  const lineHeight = scaledFontSize * 1.5;
  const totalTextHeight = lines.length * lineHeight;
  const startY = subtitleAreaY + (targetHeight * 0.2 - totalTextHeight) / 2 + scaledFontSize;

  ctx.textAlign = subtitleStyle.textAlign;
  let xPos = targetWidth / 2;
  const padding = 60;
  if (subtitleStyle.textAlign === 'left') {
    xPos = padding;
  } else if (subtitleStyle.textAlign === 'right') {
    xPos = targetWidth - padding;
  }

  lines.forEach((line, i) => {
    ctx.fillText(line, xPos, startY + i * lineHeight, targetWidth - padding * 2);
  });

  const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
  const quality = exportFormat === 'jpg' ? 0.92 : undefined;
  const dataUrl = exportCanvas.toDataURL(mimeType, quality);

  const link = document.createElement('a');
  link.download = `movie-card-${Date.now()}.${exportFormat}`;
  link.href = dataUrl;
  link.click();

  await ensureMaxRecords(50);
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

  window.dispatchEvent(new CustomEvent('card-exported', { detail: record }));

  return;
}

export { getShadowValue };
