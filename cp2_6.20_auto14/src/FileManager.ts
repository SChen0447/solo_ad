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
  private imageStartRatio: number = 1;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private editingImageId: string | null = null;
  private canvas: HTMLCanvasElement;
  private eventHandlersBound: boolean = false;

  constructor(canvasCore: CanvasCore, userId: string) {
    this.canvasCore = canvasCore;
    this.userId = userId;
    this.canvas = (canvasCore as any).canvas as HTMLCanvasElement;
    this.bindInterceptingEvents();
    this.bindCanvasEvents();
  }

  private bindInterceptingEvents(): void {
    this.canvas.addEventListener('mousedown', this.interceptMouseDown, true);
    this.canvas.addEventListener('mousemove', this.interceptMouseMove, true);
    this.canvas.addEventListener('mouseup', this.interceptMouseUp, true);
    this.canvas.addEventListener('mouseleave', this.interceptMouseUp, true);
    this.eventHandlersBound = true;
  }

  private interceptMouseDown = (e: MouseEvent): void => {
    const point = this.canvasCore.screenToWorld(e.clientX, e.clientY);

    const resizeHit = this.canvasCore.getResizeHandleAtPoint(point);
    if (resizeHit) {
      e.stopImmediatePropagation();
      this.isResizing = true;
      this.resizeHandle = resizeHit.handle;
      this.selectedImageId = resizeHit.imageId;
      this.dragStart = point;
      const img = this.canvasCore.getImages().find(i => i.id === resizeHit.imageId);
      if (img) {
        this.imageStartPos = { x: img.x, y: img.y };
        this.imageStartSize = { width: img.width, height: img.height };
        this.imageStartRatio = img.width / img.height;
      }
      this.updateCursor();
      return;
    }

    const image = this.canvasCore.getImageAtPoint(point);
    if (image) {
      e.stopImmediatePropagation();
      this.isDragging = true;
      this.selectedImageId = image.id;
      this.dragStart = point;
      this.imageStartPos = { x: image.x, y: image.y };
      this.canvas.style.cursor = 'move';
      return;
    }

    this.selectedImageId = null;
    this.canvas.style.cursor = this.canvasCore.getTool() === 'brush' ? 'crosshair' : 'default';
  };

  private interceptMouseMove = (e: MouseEvent): void => {
    const point = this.canvasCore.screenToWorld(e.clientX, e.clientY);

    if (this.isResizing && this.selectedImageId && this.resizeHandle && this.imageStartPos && this.imageStartSize && this.dragStart) {
      e.stopImmediatePropagation();
      const dx = point.x - this.dragStart.x;
      const dy = point.y - this.dragStart.y;
      const ratio = this.imageStartRatio;

      let newWidth = this.imageStartSize.width;
      let newHeight = this.imageStartSize.height;
      let newX = this.imageStartPos.x;
      let newY = this.imageStartPos.y;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      let scaleFactor = 1;

      switch (this.resizeHandle) {
        case 'se':
          scaleFactor = absDx > absDy ? 1 + dx / this.imageStartSize.width : 1 + dy / this.imageStartSize.height;
          break;
        case 'ne':
          scaleFactor = absDx > absDy ? 1 + dx / this.imageStartSize.width : 1 - dy / this.imageStartSize.height;
          break;
        case 'sw':
          scaleFactor = absDx > absDy ? 1 - dx / this.imageStartSize.width : 1 + dy / this.imageStartSize.height;
          break;
        case 'nw':
          scaleFactor = absDx > absDy ? 1 - dx / this.imageStartSize.width : 1 - dy / this.imageStartSize.height;
          break;
      }

      scaleFactor = Math.max(0.2, scaleFactor);
      newWidth = Math.max(50, this.imageStartSize.width * scaleFactor);
      newHeight = newWidth / ratio;

      switch (this.resizeHandle) {
        case 'se':
          newX = this.imageStartPos.x;
          newY = this.imageStartPos.y;
          break;
        case 'ne':
          newX = this.imageStartPos.x;
          newY = this.imageStartPos.y + (this.imageStartSize.height - newHeight);
          break;
        case 'sw':
          newX = this.imageStartPos.x + (this.imageStartSize.width - newWidth);
          newY = this.imageStartPos.y;
          break;
        case 'nw':
          newX = this.imageStartPos.x + (this.imageStartSize.width - newWidth);
          newY = this.imageStartPos.y + (this.imageStartSize.height - newHeight);
          break;
      }

      this.canvasCore.updateImage(this.selectedImageId, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
      return;
    }

    if (this.isDragging && this.selectedImageId && this.dragStart && this.imageStartPos) {
      e.stopImmediatePropagation();
      const dx = point.x - this.dragStart.x;
      const dy = point.y - this.dragStart.y;
      this.canvasCore.updateImage(this.selectedImageId, {
        x: this.imageStartPos.x + dx,
        y: this.imageStartPos.y + dy,
      });
      return;
    }

    if (!this.isDragging && !this.isResizing) {
      const handleHit = this.canvasCore.getResizeHandleAtPoint(point);
      if (handleHit) {
        const cursors: Record<string, string> = {
          nw: 'nwse-resize',
          ne: 'nesw-resize',
          sw: 'nesw-resize',
          se: 'nwse-resize',
        };
        this.canvas.style.cursor = cursors[handleHit.handle] || 'pointer';
      } else if (this.canvasCore.getImageAtPoint(point)) {
        this.canvas.style.cursor = 'move';
      } else {
        this.updateCursor();
      }
    }
  };

  private interceptMouseUp = (e: MouseEvent): void => {
    if (this.isDragging || this.isResizing) {
      e.stopImmediatePropagation();
      this.isDragging = false;
      this.isResizing = false;
      this.resizeHandle = null;
      this.dragStart = null;
      this.imageStartPos = null;
      this.imageStartSize = null;
      this.updateCursor();
    }
  };

  private updateCursor(): void {
    const tool = this.canvasCore.getTool();
    if ((this.canvasCore as any).isSpacePressed) {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = tool === 'brush' ? 'crosshair' : tool === 'pan' ? 'grab' : 'default';
    }
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);
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
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  public updateImageLabel(imageId: string, label: string): void {
    this.canvasCore.updateImage(imageId, { label });
    const updated = this.canvasCore.getImages().find(i => i.id === imageId);
    this.emit('image-updated', updated);
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
    if (this.eventHandlersBound) {
      this.canvas.removeEventListener('mousedown', this.interceptMouseDown, true);
      this.canvas.removeEventListener('mousemove', this.interceptMouseMove, true);
      this.canvas.removeEventListener('mouseup', this.interceptMouseUp, true);
      this.canvas.removeEventListener('mouseleave', this.interceptMouseUp, true);
    }
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    this.listeners.clear();
  }
}
