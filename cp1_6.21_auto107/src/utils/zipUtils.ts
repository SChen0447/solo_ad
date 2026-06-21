import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { ImageItem } from './watermark';

export function downloadSingleImage(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

export async function downloadAllAsZip(
  images: ImageItem[],
  outputFilename: string = 'watermarked-images.zip'
): Promise<void> {
  const zip = new JSZip();

  for (const img of images) {
    if (img.processedBlob) {
      const ext = img.name.includes('.') ? img.name.split('.').pop() : 'png';
      const baseName = img.name.replace(/\.[^/.]+$/, '');
      zip.file(`${baseName}_watermarked.${ext}`, img.processedBlob);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, outputFilename);
}
