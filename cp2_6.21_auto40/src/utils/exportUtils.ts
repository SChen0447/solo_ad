import { CanvasElement, PaperSize, PAPER_MM, TextStyle } from '../types';

const DPI = 300;
const MM_PER_INCH = 25.4;

export function mmToPx(mm: number): number {
  return Math.round((mm * DPI) / MM_PER_INCH);
}

export async function exportToPNG(
  elements: CanvasElement[],
  paperSize: PaperSize
): Promise<Blob> {
  const paper = PAPER_MM[paperSize];
  const width = mmToPx(paper.width);
  const height = mmToPx(paper.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法获取Canvas上下文');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const scaleX = width / (paperSize === 'A5' ? 420 : paperSize === 'A6' ? 297 : 354);
  const scaleY = height / (paperSize === 'A5' ? 594 : paperSize === 'A6' ? 420 : 500);

  for (const el of elements) {
    ctx.save();

    const cx = (el.x + el.width / 2) * scaleX;
    const cy = (el.y + el.height / 2) * scaleY;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    const x = el.x * scaleX;
    const y = el.y * scaleY;
    const w = el.width * scaleX;
    const h = el.height * scaleY;
    const r = Math.min(el.style.borderRadius * Math.min(scaleX, scaleY), Math.min(w, h) / 2);

    ctx.beginPath();
    if (r > 0) {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.closePath();

    if (el.type !== 'line' && el.style.backgroundColor && el.style.backgroundColor !== 'transparent') {
      ctx.fillStyle = el.style.backgroundColor;
      ctx.fill();
    }

    if (el.style.borderWidth > 0 && el.style.borderColor) {
      ctx.strokeStyle = el.style.borderColor;
      ctx.lineWidth = el.style.borderWidth * Math.min(scaleX, scaleY);
      if (el.style.borderStyle === 'dashed') {
        ctx.setLineDash([8 * Math.min(scaleX, scaleY), 4 * Math.min(scaleX, scaleY)]);
      } else if (el.style.borderStyle === 'dotted') {
        ctx.setLineDash([2 * Math.min(scaleX, scaleY), 3 * Math.min(scaleX, scaleY)]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (el.type === 'text' || el.type === 'date') {
      const textStyle = el.style as TextStyle;
      const fontSize = textStyle.fontSize * Math.min(scaleX, scaleY);
      ctx.fillStyle = textStyle.fontColor;
      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textBaseline = 'top';
      const letterSpacing = textStyle.letterSpacing * Math.min(scaleX, scaleY);
      const lines = textStyle.content.split('\n');
      lines.forEach((line, i) => {
        if (letterSpacing !== 0) {
          let currentX = x + 8 * scaleX;
          for (const ch of line) {
            ctx.fillText(ch, currentX, y + 8 * scaleY + i * fontSize * 1.4);
            currentX += ctx.measureText(ch).width + letterSpacing;
          }
        } else {
          ctx.fillText(line, x + 8 * scaleX, y + 8 * scaleY + i * fontSize * 1.4);
        }
      });
    }

    if (el.type === 'line') {
      ctx.strokeStyle = el.style.borderColor;
      ctx.lineWidth = Math.max(h, 2 * Math.min(scaleX, scaleY));
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      if (el.style.borderStyle === 'dashed') {
        ctx.setLineDash([10 * Math.min(scaleX, scaleY), 6 * Math.min(scaleX, scaleY)]);
      } else if (el.style.borderStyle === 'dotted') {
        ctx.setLineDash([3 * Math.min(scaleX, scaleY), 4 * Math.min(scaleX, scaleY)]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PNG生成失败'));
      },
      'image/png',
      1.0
    );
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function generateThumbnail(
  elements: CanvasElement[],
  paperSize: PaperSize
): Promise<string> {
  const TW = 200;
  const TH = 280;

  const canvas = document.createElement('canvas');
  canvas.width = TW;
  canvas.height = TH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, TW, TH);

  const baseW = paperSize === 'A5' ? 420 : paperSize === 'A6' ? 297 : 354;
  const baseH = paperSize === 'A5' ? 594 : paperSize === 'A6' ? 420 : 500;
  const scale = Math.min(TW / baseW, TH / baseH);
  const offsetX = (TW - baseW * scale) / 2;
  const offsetY = (TH - baseH * scale) / 2;

  for (const el of elements) {
    ctx.save();
    const cx = offsetX + (el.x + el.width / 2) * scale;
    const cy = offsetY + (el.y + el.height / 2) * scale;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    const x = offsetX + el.x * scale;
    const y = offsetY + el.y * scale;
    const w = el.width * scale;
    const h = el.height * scale;
    const r = Math.min(el.style.borderRadius * scale, Math.min(w, h) / 2);

    ctx.beginPath();
    if (r > 0) {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.closePath();

    if (el.type !== 'line' && el.style.backgroundColor && el.style.backgroundColor !== 'transparent') {
      ctx.fillStyle = el.style.backgroundColor;
      ctx.fill();
    }
    if (el.style.borderWidth > 0 && el.style.borderColor) {
      ctx.strokeStyle = el.style.borderColor;
      ctx.lineWidth = Math.max(1, el.style.borderWidth * scale);
      ctx.stroke();
    }

    if ((el.type === 'text' || el.type === 'date') && w > 10 && h > 10) {
      const textStyle = el.style as TextStyle;
      ctx.fillStyle = textStyle.fontColor;
      const fontSize = Math.max(8, textStyle.fontSize * scale);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(textStyle.content.substring(0, 20), x + 4, y + 4);
    }

    ctx.restore();
  }

  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, TW - 1, TH - 1);

  return canvas.toDataURL('image/png');
}
