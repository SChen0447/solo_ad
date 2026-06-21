import { CanvasElement, PaperSize, PAPER_SIZES, PAPER_MM, TextStyle } from '../types';

const DPI = 300;
const SCREEN_DPI = 96;
const DPI_SCALE = DPI / SCREEN_DPI;

export async function exportToPNG(
  elements: CanvasElement[],
  paperSize: PaperSize
): Promise<Blob> {
  const paper = PAPER_MM[paperSize];
  const widthPx = Math.round((paper.width / 25.4) * DPI);
  const heightPx = Math.round((paper.height / 25.4) * DPI);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法获取Canvas上下文');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, widthPx, heightPx);

  const workspaceW = PAPER_SIZES[paperSize].width;
  const workspaceH = PAPER_SIZES[paperSize].height;
  const scaleX = widthPx / workspaceW;
  const scaleY = heightPx / workspaceH;
  const scale = Math.min(scaleX, scaleY);

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
      ctx.lineWidth = el.style.borderWidth * scale;
      if (el.style.borderStyle === 'dashed') {
        ctx.setLineDash([8 * scale, 4 * scale]);
      } else if (el.style.borderStyle === 'dotted') {
        ctx.setLineDash([2 * scale, 3 * scale]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (el.type === 'text' || el.type === 'date') {
      const textStyle = el.style as TextStyle;
      const fontSize = textStyle.fontSize * scale;
      ctx.fillStyle = textStyle.fontColor;
      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textBaseline = 'top';
      const letterSpacing = textStyle.letterSpacing * scale;
      const lines = textStyle.content.split('\n');
      lines.forEach((line, i) => {
        if (letterSpacing !== 0) {
          let curX = x + 8 * scaleX;
          for (const ch of line) {
            ctx.fillText(ch, curX, y + 8 * scaleY + i * fontSize * 1.4);
            curX += ctx.measureText(ch).width + letterSpacing;
          }
        } else {
          ctx.fillText(line, x + 8 * scaleX, y + 8 * scaleY + i * fontSize * 1.4);
        }
      });
    }

    if (el.type === 'line') {
      ctx.strokeStyle = el.style.borderColor;
      ctx.lineWidth = Math.max(el.height * scaleY, 2 * scale);
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      if (el.style.borderStyle === 'dashed') {
        ctx.setLineDash([10 * scale, 6 * scale]);
      } else if (el.style.borderStyle === 'dotted') {
        ctx.setLineDash([3 * scale, 4 * scale]);
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

  const workspaceW = PAPER_SIZES[paperSize].width;
  const workspaceH = PAPER_SIZES[paperSize].height;
  const thumbScale = Math.min(TW / workspaceW, TH / workspaceH);
  const offsetX = (TW - workspaceW * thumbScale) / 2;
  const offsetY = (TH - workspaceH * thumbScale) / 2;

  for (const el of elements) {
    ctx.save();
    const cx = offsetX + (el.x + el.width / 2) * thumbScale;
    const cy = offsetY + (el.y + el.height / 2) * thumbScale;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    const x = offsetX + el.x * thumbScale;
    const y = offsetY + el.y * thumbScale;
    const w = el.width * thumbScale;
    const h = el.height * thumbScale;
    const r = Math.min(el.style.borderRadius * thumbScale, Math.min(w, h) / 2);

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
      ctx.lineWidth = Math.max(1, el.style.borderWidth * thumbScale);
      ctx.stroke();
    }

    if ((el.type === 'text' || el.type === 'date') && w > 10 && h > 10) {
      const textStyle = el.style as TextStyle;
      ctx.fillStyle = textStyle.fontColor;
      const fontSize = Math.max(8, textStyle.fontSize * thumbScale);
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
