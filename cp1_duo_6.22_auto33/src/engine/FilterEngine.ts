import { FilterParams, ImageItem } from '@/types';
import { eventBus } from '@/utils/EventBus';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export class FilterEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private processingQueue: Map<string, HTMLImageElement> = new Map();
  private isProcessing = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const existing = this.processingQueue.get(src);
      if (existing) {
        resolve(existing);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.processingQueue.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  private applyColorMatrix(
    imageData: ImageData,
    params: FilterParams
  ): ImageData {
    const { data } = imageData;
    const { brightness, contrast, hueRotate, saturation } = params;

    const brightnessValue = (brightness / 100) * 255;
    const contrastFactor = (contrast + 100) / 100;
    const saturationFactor = saturation / 100;
    const hueRad = (hueRotate * Math.PI) / 180;

    const cos = Math.cos(hueRad);
    const sin = Math.sin(hueRad);

    const hueMatrix = [
      0.213 + cos * 0.787 - sin * 0.213,
      0.715 - cos * 0.715 - sin * 0.715,
      0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143,
      0.715 + cos * 0.285 + sin * 0.140,
      0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787,
      0.715 - cos * 0.715 + sin * 0.715,
      0.072 + cos * 0.928 + sin * 0.072,
    ];

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      const hr =
        hueMatrix[0] * r + hueMatrix[1] * g + hueMatrix[2] * b;
      const hg =
        hueMatrix[3] * r + hueMatrix[4] * g + hueMatrix[5] * b;
      const hb =
        hueMatrix[6] * r + hueMatrix[7] * g + hueMatrix[8] * b;

      const gray = 0.299 * hr + 0.587 * hg + 0.114 * hb;
      const sr = gray + saturationFactor * (hr - gray);
      const sg = gray + saturationFactor * (hg - gray);
      const sb = gray + saturationFactor * (hb - gray);

      const cr = ((sr - 128) * contrastFactor + 128);
      const cg = ((sg - 128) * contrastFactor + 128);
      const cb = ((sb - 128) * contrastFactor + 128);

      data[i] = Math.max(0, Math.min(255, cr + brightnessValue));
      data[i + 1] = Math.max(0, Math.min(255, cg + brightnessValue));
      data[i + 2] = Math.max(0, Math.min(255, cb + brightnessValue));
    }

    return imageData;
  }

  private rotateCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    rotation: number
  ): void {
    if (rotation === 0) return;

    const { width, height } = canvas;
    const isVertical = rotation === 90 || rotation === 270;
    const newWidth = isVertical ? height : width;
    const newHeight = isVertical ? width : height;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCtx.save();
    tempCtx.translate(newWidth / 2, newHeight / 2);
    tempCtx.rotate((rotation * Math.PI) / 180);
    tempCtx.drawImage(canvas, -width / 2, -height / 2);
    tempCtx.restore();

    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.drawImage(tempCanvas, 0, 0);
  }

  async processImage(
    imageItem: ImageItem,
    params: FilterParams,
    forPreview: boolean = false
  ): Promise<string> {
    const startTime = performance.now();
    
    const img = await this.loadImage(imageItem.url);
    const targetCanvas = forPreview ? this.offscreenCanvas : this.canvas;
    const targetCtx = forPreview ? this.offscreenCtx : this.ctx;

    targetCanvas.width = img.naturalWidth;
    targetCanvas.height = img.naturalHeight;

    targetCtx.drawImage(img, 0, 0);

    this.rotateCanvas(targetCanvas, targetCtx, imageItem.rotation);

    const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    const processedData = this.applyColorMatrix(imageData, params);
    targetCtx.putImageData(processedData, 0, 0);

    const dataUrl = targetCanvas.toDataURL('image/jpeg', 0.92);
    
    const duration = performance.now() - startTime;
    if (duration > 200) {
      console.warn(`Image processing took ${duration.toFixed(0)}ms, exceeding 200ms limit`);
    }

    return dataUrl;
  }

  async processImageForPreview(
    imageItem: ImageItem,
    params: FilterParams
  ): Promise<string> {
    return this.processImage(imageItem, params, true);
  }

  async batchProcess(
    images: ImageItem[],
    params: FilterParams
  ): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const blobs: Blob[] = [];
    const names: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      eventBus.emit('BATCH_PROGRESS', {
        current: i,
        total: images.length,
        imageId: image.id,
      });

      try {
        const dataUrl = await this.processImage(image, params, false);
        const blob = this.dataURLToBlob(dataUrl);
        blobs.push(blob);
        names.push(`${image.name.replace(/\.[^/.]+$/, '')}_filtered.jpg`);
      } catch (error) {
        console.error(`Failed to process image ${image.name}:`, error);
      }

      eventBus.emit('BATCH_PROGRESS', {
        current: i + 1,
        total: images.length,
        imageId: image.id,
      });

      await new Promise(requestAnimationFrame);
    }

    this.isProcessing = false;
    eventBus.emit('BATCH_COMPLETE', { blobs, names });
    this.downloadZip(blobs, names);
  }

  private dataURLToBlob(dataURL: string): Blob {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  }

  private async downloadZip(blobs: Blob[], names: string[]): Promise<void> {
    const zip = new JSZip();
    
    blobs.forEach((blob, index) => {
      zip.file(names[index], blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `filtered_images_${Date.now()}.zip`);
  }

  generateThumbnail(params: FilterParams, size: number = 80): string {
    this.offscreenCanvas.width = size;
    this.offscreenCanvas.height = size;
    
    const gradient = this.offscreenCtx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, this.getColorFromParams(params, 0));
    gradient.addColorStop(0.5, this.getColorFromParams(params, 0.5));
    gradient.addColorStop(1, this.getColorFromParams(params, 1));
    
    this.offscreenCtx.fillStyle = gradient;
    this.offscreenCtx.fillRect(0, 0, size, size);

    const imageData = this.offscreenCtx.getImageData(0, 0, size, size);
    const processedData = this.applyColorMatrix(imageData, params);
    this.offscreenCtx.putImageData(processedData, 0, 0);

    return this.offscreenCanvas.toDataURL('image/jpeg', 0.8);
  }

  private getColorFromParams(params: FilterParams, position: number): string {
    const baseHue = (params.hueRotate + position * 120) % 360;
    const sat = Math.max(20, params.saturation * 0.6);
    const light = 50 + params.brightness * 0.3;
    return `hsl(${baseHue}, ${sat}%, ${light}%)`;
  }

  clearCache(): void {
    this.processingQueue.clear();
  }
}

export const filterEngine = new FilterEngine();
