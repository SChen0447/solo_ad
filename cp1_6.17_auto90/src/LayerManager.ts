import type { Annotation, ExportData, Rect, ViewState } from './types';
import {
  canvasRectToImageRatios,
  generateId,
  clamp,
} from './utils';

type Listener = (annotations: Annotation[]) => void;

export class LayerManager {
  private annotations: Annotation[] = [];
  private listeners: Set<Listener> = new Set();

  constructor(initialAnnotations: Annotation[] = []) {
    this.annotations = [...initialAnnotations];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = [...this.annotations];
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  getAnnotations(): Annotation[] {
    return [...this.annotations];
  }

  getAnnotationById(id: string): Annotation | undefined {
    return this.annotations.find((a) => a.id === id);
  }

  getCount(): number {
    return this.annotations.length;
  }

  addAnnotationFromCanvasRect(
    rect: Rect,
    comment: string,
    viewState: ViewState,
    canvasWidth: number,
    canvasHeight: number,
    imageWidth: number,
    imageHeight: number
  ): Annotation {
    const ratios = canvasRectToImageRatios(
      rect,
      viewState,
      canvasWidth,
      canvasHeight,
      imageWidth,
      imageHeight
    );

    const minRatio = 0.001;
    if (ratios.width_ratio < minRatio || ratios.height_ratio < minRatio) {
      ratios.width_ratio = Math.max(ratios.width_ratio, minRatio);
      ratios.height_ratio = Math.max(ratios.height_ratio, minRatio);
    }

    const annotation: Annotation = {
      id: generateId(),
      x_ratio: clamp(ratios.x_ratio, 0, 1 - ratios.width_ratio),
      y_ratio: clamp(ratios.y_ratio, 0, 1 - ratios.height_ratio),
      width_ratio: clamp(ratios.width_ratio, 0, 1),
      height_ratio: clamp(ratios.height_ratio, 0, 1),
      comment,
      createdAt: Date.now(),
    };

    this.annotations.push(annotation);
    this.notify();
    return annotation;
  }

  addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt'>): Annotation {
    const newAnnotation: Annotation = {
      ...annotation,
      id: generateId(),
      createdAt: Date.now(),
    };
    this.annotations.push(newAnnotation);
    this.notify();
    return newAnnotation;
  }

  updateAnnotationComment(id: string, comment: string): boolean {
    const index = this.annotations.findIndex((a) => a.id === id);
    if (index === -1) return false;
    this.annotations[index] = {
      ...this.annotations[index],
      comment,
    };
    this.notify();
    return true;
  }

  removeAnnotation(id: string): boolean {
    const index = this.annotations.findIndex((a) => a.id === id);
    if (index === -1) return false;
    this.annotations.splice(index, 1);
    this.notify();
    return true;
  }

  clearAll(): void {
    this.annotations = [];
    this.notify();
  }

  getExportData(
    imageName: string,
    viewState: ViewState,
    canvasWidth: number,
    canvasHeight: number,
    imageWidth: number,
    imageHeight: number
  ): ExportData {
    const { scale, offsetX, offsetY } = viewState;
    const imageDisplayWidth = imageWidth * scale;
    const imageDisplayHeight = imageHeight * scale;
    const imageLeft = (canvasWidth - imageDisplayWidth) / 2 + offsetX;
    const imageTop = (canvasHeight - imageDisplayHeight) / 2 + offsetY;

    const viewCenterCanvasX = canvasWidth / 2;
    const viewCenterCanvasY = canvasHeight / 2;
    const viewCenterImageX = (viewCenterCanvasX - imageLeft) / scale;
    const viewCenterImageY = (viewCenterCanvasY - imageTop) / scale;

    return {
      imageName,
      viewCenterX_ratio: clamp(viewCenterImageX / imageWidth, 0, 1),
      viewCenterY_ratio: clamp(viewCenterImageY / imageHeight, 0, 1),
      zoomLevel: scale,
      annotations: this.getAnnotations(),
      exportedAt: Date.now(),
    };
  }

  serialize(): string {
    return JSON.stringify(this.annotations, null, 2);
  }

  deserialize(json: string): Annotation[] {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid annotation data format');
      }

      const validAnnotations: Annotation[] = [];
      for (const item of parsed) {
        if (this.isValidAnnotation(item)) {
          validAnnotations.push(item);
        }
      }

      this.annotations = validAnnotations;
      this.notify();
      return validAnnotations;
    } catch (error) {
      console.error('Failed to deserialize annotations:', error);
      return [];
    }
  }

  private isValidAnnotation(obj: unknown): obj is Annotation {
    if (!obj || typeof obj !== 'object') return false;
    const o = obj as Record<string, unknown>;
    return (
      typeof o.id === 'string' &&
      typeof o.x_ratio === 'number' &&
      typeof o.y_ratio === 'number' &&
      typeof o.width_ratio === 'number' &&
      typeof o.height_ratio === 'number' &&
      typeof o.comment === 'string' &&
      typeof o.createdAt === 'number' &&
      o.x_ratio >= 0 &&
      o.x_ratio <= 1 &&
      o.y_ratio >= 0 &&
      o.y_ratio <= 1 &&
      o.width_ratio >= 0 &&
      o.width_ratio <= 1 &&
      o.height_ratio >= 0 &&
      o.height_ratio <= 1
    );
  }

  findAnnotationAtPoint(
    canvasX: number,
    canvasY: number,
    viewState: ViewState,
    canvasWidth: number,
    canvasHeight: number,
    imageWidth: number,
    imageHeight: number,
    padding = 8
  ): Annotation | undefined {
    const { scale, offsetX, offsetY } = viewState;
    const imageDisplayWidth = imageWidth * scale;
    const imageDisplayHeight = imageHeight * scale;
    const imageLeft = (canvasWidth - imageDisplayWidth) / 2 + offsetX;
    const imageTop = (canvasHeight - imageDisplayHeight) / 2 + offsetY;

    for (let i = this.annotations.length - 1; i >= 0; i--) {
      const ann = this.annotations[i];
      const x = imageLeft + ann.x_ratio * imageDisplayWidth;
      const y = imageTop + ann.y_ratio * imageDisplayHeight;
      const w = ann.width_ratio * imageDisplayWidth;
      const h = ann.height_ratio * imageDisplayHeight;

      if (
        canvasX >= x - padding &&
        canvasX <= x + w + padding &&
        canvasY >= y - padding &&
        canvasY <= y + h + padding
      ) {
        return ann;
      }
    }
    return undefined;
  }
}
