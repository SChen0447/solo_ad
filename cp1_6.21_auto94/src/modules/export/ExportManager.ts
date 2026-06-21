import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';

export class ExportManager {
  public static async exportAsPNG(canvas: HTMLCanvasElement, filename?: string): Promise<void> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const name = filename || `texture_${uuidv4().slice(0, 8)}.png`;
          saveAs(blob, name);
        }
        resolve();
      }, 'image/png');
    });
  }

  public static async copyToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) return false;

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        return true;
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        const text = dataUrl;
        
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        const success = document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        return success;
      }
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      return false;
    }
  }

  public static async exportAsZIP(
    sourceCanvas: HTMLCanvasElement,
    textureCanvas: HTMLCanvasElement,
    previewCanvas: HTMLCanvasElement
  ): Promise<void> {
    const zip = new JSZip();
    const timestamp = new Date().toISOString().slice(0, 10);
    const id = uuidv4().slice(0, 8);

    const sourceBlob = await this.canvasToBlob(sourceCanvas);
    const textureBlob = await this.canvasToBlob(textureCanvas);
    const previewBlob = await this.canvasToBlob(previewCanvas);

    if (sourceBlob) {
      zip.file(`source_16x16_${timestamp}_${id}.png`, sourceBlob);
    }
    if (textureBlob) {
      zip.file(`texture_128x128_${timestamp}_${id}.png`, textureBlob);
    }
    if (previewBlob) {
      zip.file(`preview_tiled_${timestamp}_${id}.png`, previewBlob);
    }

    const metadata = {
      generatedAt: new Date().toISOString(),
      sourceSize: { width: sourceCanvas.width, height: sourceCanvas.height },
      textureSize: { width: textureCanvas.width, height: textureCanvas.height },
      previewSize: { width: previewCanvas.width, height: previewCanvas.height },
      version: '1.0.0',
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `texture_package_${timestamp}_${id}.zip`);
  }

  private static canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
  }

  public static async downloadDataURL(dataUrl: string, filename: string): Promise<void> {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public static canvasToDataURL(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png');
  }
}
