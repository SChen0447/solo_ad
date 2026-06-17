import type { CanvasElement, CanvasView, DrawingElement, ImageElement, TextElement } from './types';

export type Resolution = '1920x1080' | '1080x1920';

export interface ExportOptions {
  resolution: Resolution;
  onProgress?: (progress: number) => void;
}

const RESOLUTIONS: Record<Resolution, { width: number; height: number }> = {
  '1920x1080': { width: 1920, height: 1080 },
  '1080x1920': { width: 1080, height: 1920 },
};

export async function exportWallpaper(
  elements: CanvasElement[],
  view: CanvasView,
  options: ExportOptions
): Promise<void> {
  const { resolution, onProgress } = options;
  const { width: targetW, height: targetH } = RESOLUTIONS[resolution];

  const reportProgress = (p: number) => {
    onProgress?.(p);
  };

  await new Promise((r) => setTimeout(r, 100));
  reportProgress(0.1);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建Canvas上下文');

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, targetW, targetH);

  reportProgress(0.3);

  if (elements.length === 0) {
    reportProgress(1);
    await downloadCanvas(canvas);
    return;
  }

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of sorted) {
    const corners = getRotatedCorners(el);
    for (const c of corners) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x > maxX) maxX = c.x;
      if (c.y > maxY) maxY = c.y;
    }
  }

  const padding = 80;
  const contentW = maxX - minX + padding * 2;
  const contentH = maxY - minY + padding * 2;
  const scale = Math.min(targetW / contentW, targetH / contentH);
  const offsetX = (targetW - contentW * scale) / 2 - minX * scale + padding * scale;
  const offsetY = (targetH - contentH * scale) / 2 - minY * scale + padding * scale;

  reportProgress(0.5);

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  for (let i = 0; i < sorted.length; i++) {
    const el = sorted[i];
    ctx.save();

    const centerX = (el.x + el.width / 2) * scale + offsetX;
    const centerY = (el.y + el.height / 2) * scale + offsetY;
    ctx.translate(centerX, centerY);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    if (el.type === 'image') {
      try {
        const img = await loadImage((el as ImageElement).src);
        ctx.drawImage(
          img,
          el.x * scale + offsetX,
          el.y * scale + offsetY,
          el.width * scale,
          el.height * scale
        );
      } catch (e) {
        console.warn('图片加载失败', e);
      }
    } else if (el.type === 'text') {
      const textEl = el as TextElement;
      const px = textEl.x * scale + offsetX;
      const py = textEl.y * scale + offsetY;
      const pw = textEl.width * scale;
      const ph = textEl.height * scale;

      ctx.fillStyle = 'rgba(20,20,30,0.6)';
      roundRect(ctx, px, py, pw, ph, 8 * scale);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1 * scale;
      roundRect(ctx, px, py, pw, ph, 8 * scale);
      ctx.stroke();

      const fontStyle = textEl.fontStyle === 'italic' ? 'italic ' : '';
      const fontWeight = textEl.fontWeight === 'bold' ? 'bold ' : '';
      const fontSize = textEl.fontSize * scale;
      ctx.font = `${fontStyle}${fontWeight}${fontSize}px PingFang SC, -apple-system, sans-serif`;
      ctx.fillStyle = '#e0e0e0';
      ctx.textBaseline = 'top';

      const lines = textEl.content.split('\n');
      const lineHeight = fontSize * 1.4;
      const textX = px + 12 * scale;
      let textY = py + 10 * scale;
      for (const line of lines) {
        ctx.fillText(line, textX, textY);
        textY += lineHeight;
      }
    } else if (el.type === 'drawing') {
      const drawEl = el as DrawingElement;
      ctx.strokeStyle = drawEl.strokeColor;
      ctx.lineWidth = drawEl.strokeWidth * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (drawEl.points.length > 1) {
        ctx.beginPath();
        const first = drawEl.points[0];
        ctx.moveTo(
          (drawEl.x + first.x) * scale + offsetX,
          (drawEl.y + first.y) * scale + offsetY
        );
        for (let j = 1; j < drawEl.points.length; j++) {
          const p = drawEl.points[j];
          ctx.lineTo(
            (drawEl.x + p.x) * scale + offsetX,
            (drawEl.y + p.y) * scale + offsetY
          );
        }
        ctx.stroke();
      }
    }

    ctx.restore();
    reportProgress(0.5 + (0.4 * (i + 1)) / sorted.length);
  }

  reportProgress(0.95);
  await downloadCanvas(canvas);
  reportProgress(1);
}

function downloadCanvas(canvas: HTMLCanvasElement): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `灵感画布_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setTimeout(resolve, 100);
    }, 'image/png');
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getRotatedCorners(el: CanvasElement) {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rad = (el.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    { x: el.x, y: el.y },
    { x: el.x + el.width, y: el.y },
    { x: el.x + el.width, y: el.y + el.height },
    { x: el.x, y: el.y + el.height },
  ];
  return corners.map((p) => ({
    x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
    y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
  }));
}
