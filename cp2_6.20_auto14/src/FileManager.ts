import { v4 as uuidv4 } from 'uuid';
import type { CanvasCore, ImageItem, Point } from './CanvasCore';

type EventHandler = (...args: any[]) => void;

export class FileManager {
  private canvasCore: CanvasCore;
  private userId: string;
  private selectedImageId: string | null = null;
  private isDragging: boolean = false;
  private isResizing: boolean = false;
  private resizeHandle: string | null = null;
  private dragStart: Point | null = null;
  private imageStartPos: Point | null = null;
  private imageStartSize: { width: number; height: number } | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private editingImageId: string | null = null;

  constructor(canvasCore: CanvasCore, userId: string) {
    this.canvasCore = canvasCore;
    this.userId = userId;
    this.bindCanvasEvents();
  }

  private bindCanvasEvents(): void {
    const canvas = (this.canvasCore as any).canvas as HTMLCanvasElement;
    canvas.addEventListener('dblclick', this.handleDoubleClick);
  }

  private handleDoubleClick = (e: MouseEvent): void => {
    const point = this.canvasCore.screenToWorld(e.clientX, e.clientY);
    const image = this.canvasCore.getImageAtPoint(point);
    if (image) {
      this.editingImageId = image.id;
      this.emit('edit-image', image);
    }
  };

  public handleFile(file: File, dropPoint?: Point): Promise<ImageItem> {
    return new Promise((resolve, reject) => {
      if (!file.type.match(/image\/(png|jpeg|jpg|svg\+xml)/)) {
        reject(new Error('不支持的文件类型'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxSize = 300;

          if (width > height && width > maxSize) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width / height) * maxSize;
            height = maxSize;
          }

          const imageItem: ImageItem = {
            id: uuidv4(),
            x: dropPoint ? dropPoint.x - width / 2 : 100 + Math.random() * 200,
            y: dropPoint ? dropPoint.y - height / 2 : 100 + Math.random() * 200,
            width,
            height,
            image: img,
            label: '',
            userId: this.userId,
          };

          this.canvasCore.addImage(imageItem);
          this.emit('image-added', imageItem);
          resolve(imageItem);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  public handleDrop(e: DragEvent): void {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const point = this.canvasCore.screenToWorld(e.clientX, e.clientY);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const offset = { x: (i % 3) * 30, y: Math.floor(i / 3) * 30 };
      this.handleFile(file, { x: point.x + offset.x, y: point.y + offset.y });
    }
  }

  public handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  }

  public handleMouseDown(e: MouseEvent): boolean {
    const point = this.canvasCore.screenToWorld(e.clientX, e.clientY);

    const resizeHit = this.canvasCore.getResizeHandleAtPoint(point);
    if (resizeHit) {
      this.isResizing = true;
      this.resizeHandle = resizeHit.handle;
      this.selectedImageId = resizeHit.imageId;
      this.dragStart = point;
      const img = this.canvasCore.getImages().find(i => i.id === resizeHit.imageId);
      if (img) {
        this.imageStartPos = { x: img.x, y: img.y };
        this.imageStartSize = { width: img.width, height: img.height };
      }
      return true;
    }

    const image = this.canvasCore.getImageAtPoint(point);
    if (image) {
      this.isDragging = true;
      this.selectedImageId = image.id;
      this.dragStart = point;
      this.imageStartPos = { x: image.x, y: image.y };
      return true;
    }

    this.selectedImageId = null;
    return false;
  }

  public handleMouseMove(e: MouseEvent): boolean {
    if (!this.selectedImageId) return false;

    const point = this.canvasCore.screenToWorld(e.clientX, e.clientY);

    if (this.isDragging && this.dragStart && this.imageStartPos) {
      const dx = point.x - this.dragStart.x;
      const dy = point.y - this.dragStart.y;
      this.canvasCore.updateImage(this.selectedImageId, {
        x: this.imageStartPos.x + dx,
        y: this.imageStartPos.y + dy,
      });
      return true;
    }

    if (this.isResizing && this.resizeHandle && this.imageStartPos && this.imageStartSize && this.dragStart) {
      const dx = point.x - this.dragStart.x;
      const dy = point.y - this.dragStart.y;
      const aspectRatio = this.imageStartSize.width / this.imageStartSize.height;

      let newWidth = this.imageStartSize.width;
      let newHeight = this.imageStartSize.height;
      let newX = this.imageStartPos.x;
      let newY = this.imageStartPos.y;

      if (this.resizeHandle.includes('e')) {
        newWidth = Math.max(50, this.imageStartSize.width + dx);
        newHeight = newWidth / aspectRatio;
      } else if (this.resizeHandle.includes('w')) {
        newWidth = Math.max(50, this.imageStartSize.width - dx);
        newHeight = newWidth / aspectRatio;
        newX = this.imageStartPos.x + (this.imageStartSize.width - newWidth);
      }

      if (this.resizeHandle.includes('s')) {
        newHeight = Math.max(50, this.imageStartSize.height + dy);
        newWidth = newHeight * aspectRatio;
      } else if (this.resizeHandle.includes('n')) {
        newHeight = Math.max(50, this.imageStartSize.height - dy);
        newWidth = newHeight * aspectRatio;
        newY = this.imageStartPos.y + (this.imageStartSize.height - newHeight);
      }

      this.canvasCore.updateImage(this.selectedImageId, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
      return true;
    }

    return false;
  }

  public handleMouseUp(): boolean {
    if (this.isDragging || this.isResizing) {
      this.isDragging = false;
      this.isResizing = false;
      this.resizeHandle = null;
      this.dragStart = null;
      this.imageStartPos = null;
      this.imageStartSize = null;
      return true;
    }
    return false;
  }

  public updateImageLabel(imageId: string, label: string): void {
    this.canvasCore.updateImage(imageId, { label });
    this.emit('image-updated', this.canvasCore.getImages().find(i => i.id === imageId));
  }

  public getSelectedImageId(): string | null {
    return this.selectedImageId;
  }

  public getEditingImageId(): string | null {
    return this.editingImageId;
  }

  public setEditingImageId(id: string | null): void {
    this.editingImageId = id;
  }

  public on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  private emit(event: string, ...args: any[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(...args);
      }
    }
  }

  public destroy(): void {
    const canvas = (this.canvasCore as any).canvas as HTMLCanvasElement;
    canvas.removeEventListener('dblclick', this.handleDoubleClick);
    this.listeners.clear();
  }
}
