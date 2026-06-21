import html2canvas from 'html2canvas';

function addScaleBar(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  const scaleBarWidth = 120;
  const scaleBarHeight = 30;
  const padding = 16;
  const x = padding;
  const y = canvas.height - padding - scaleBarHeight;

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(x - 4, y - 4, scaleBarWidth + 8, scaleBarHeight + 8);
  ctx.strokeStyle = '#4a5568';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 4, y - 4, scaleBarWidth + 8, scaleBarHeight + 8);

  ctx.fillStyle = '#4a5568';
  ctx.fillRect(x, y + 4, 80, 3);
  ctx.fillRect(x, y, 1, 12);
  ctx.fillRect(x + 80, y, 1, 12);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#4a5568';
  ctx.textAlign = 'center';
  ctx.fillText('1 km', x + 40, y + 24);

  ctx.textAlign = 'left';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#718096';
  ctx.fillText('N ↑', x + 90, y + 16);
}

function addWatermark(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(102,126,234,0.5)';
  ctx.textAlign = 'right';
  ctx.fillText('Travel Footprint 🌍', canvasWidth - 16, 24);
}

export async function exportMapAsImage(container: HTMLElement): Promise<Blob> {
  const mapEl = container.querySelector('.leaflet-container') as HTMLElement;
  if (!mapEl) {
    throw new Error('Map container not found');
  }

  const targetWidth = 1200;
  const targetHeight = 800;

  const originalBg = mapEl.style.background;
  mapEl.style.background = '#f7fafc';

  const canvas = await html2canvas(mapEl, {
    width: targetWidth,
    height: targetHeight,
    scale: 1,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#f7fafc',
    logging: false,
  });

  mapEl.style.background = originalBg;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = targetWidth;
  exportCanvas.height = targetHeight;
  const ctx = exportCanvas.getContext('2d')!;

  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  addScaleBar(exportCanvas, ctx);
  addWatermark(ctx, targetWidth);

  return new Promise<Blob>((resolve, reject) => {
    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/png',
      1.0
    );
  });
}
