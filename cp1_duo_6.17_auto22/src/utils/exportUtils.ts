import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { IconConfig } from '@/types';
import { renderIconSVG } from './svgRenderer';

export async function exportAsSVG(icon: IconConfig): Promise<void> {
  const svgContent = renderIconSVG(icon, 100, true);
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, `${icon.name}.svg`);
}

export function svgToPng(svgString: string, size: number, bgColor?: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context not available'));
        return;
      }

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
      }

      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PNG conversion failed'));
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}

export async function exportAsPNG(icon: IconConfig, size: 128 | 256 | 512, bgColor?: string): Promise<void> {
  const svgString = renderIconSVG(icon, size);
  const blob = await svgToPng(svgString, size, bgColor);
  saveAs(blob, `${icon.name}-${size}.png`);
}

export async function exportCollectionAsZIP(icons: IconConfig[]): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('icons');
  if (!folder) throw new Error('Failed to create ZIP folder');

  const manifest = {
    exportedAt: new Date().toISOString(),
    count: icons.length,
    icons: icons.map(({ id, name, shape, strokeWidth, strokeColor, fillType }) => ({
      id, name, shape, strokeWidth, strokeColor, fillType
    }))
  };

  for (const icon of icons) {
    const svgContent = renderIconSVG(icon, 100, true);
    folder.file(`${icon.name}.svg`, svgContent);
  }

  folder.file('manifest.json', JSON.stringify(manifest, null, 2));

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `icon-collection-${Date.now()}.zip`);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
