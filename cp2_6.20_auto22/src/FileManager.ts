import { v4 as uuidv4 } from 'uuid';
import type { ImageElementData } from './CanvasCore';

export type DragHandle = 'nw' | 'ne' | 'sw' | 'se' | 'move';

export interface DragState {
  imageId: string;
  handle: DragHandle;
  startX: number;
  startY: number;
  startImageX: number;
  startImageY: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
}

export interface ImageEditState {
  imageId: string | null;
}

type ImagesListener = (images: ImageElementData[]) => void;
type EditListener = (state: ImageEditState) => void;

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const DEFAULT_WIDTH = 200;

export class FileManager {
  private images: ImageElementData[] = [];
  private dragState: DragState | null = null;
  private editState: ImageEditState = { imageId: null };
  private imagesListeners: Set<ImagesListener> = new Set();
  private editListeners: Set<EditListener> = new Set();
  private addImageCallback: ((img: ImageElementData) => void) | null = null;
  private updateImageCallback: ((id: string, updates: Partial<ImageElementData>) => void) | null = null;

  setAddImageCallback(cb: (img: ImageElementData) => void) {
    this.addImageCallback = cb;
  }

  setUpdateImageCallback(cb: (id: string, updates: Partial<ImageElementData>) => void) {
    this.updateImageCallback = cb;
  }

  onImagesChange(listener: ImagesListener): () => void {
    this.imagesListeners.add(listener);
    listener(this.getImages());
    return () => this.imagesListeners.delete(listener);
  }

  onEditChange(listener: EditListener): () => void {
    this.editListeners.add(listener);
    listener(this.getEditState());
    return () => this.editListeners.delete(listener);
  }

  getImages(): ImageElementData[] {
    return [...this.images];
  }

  getEditState(): ImageEditState {
    return { ...this.editState };
  }

  getDragState(): DragState | null {
    return this.dragState;
  }

  private notifyImages() {
    const snapshot = this.getImages();
    this.imagesListeners.forEach(l => l(snapshot));
  }

  private notifyEdit() {
    const snapshot = this.getEditState();
    this.editListeners.forEach(l => l(snapshot));
  }

  async handleFiles(files: FileList | File[], centerX: number = 0, centerY: number = 0): Promise<void> {
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    for (const file of fileArray) {
      if (!ACCEPTED_TYPES.includes(file.type)) continue;
      await this.processFile(file, centerX, centerY);
    }
  }

  private processFile(file: File, centerX: number, centerY: number): Promise<void> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          const width = Math.min(DEFAULT_WIDTH, img.width);
          const height = width / aspectRatio;

          const newImage: ImageElementData = {
            id: uuidv4(),
            src,
            x: centerX - width / 2,
            y: centerY - height / 2,
            width,
            height,
            caption: '',
            createdAt: Date.now()
          };

          this.images.push(newImage);
          if (this.addImageCallback) {
            this.addImageCallback(newImage);
          }
          this.notifyImages();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(file);
    });
  }

  handleDragOver(e: DragEvent): boolean {
    if (!e.dataTransfer) return false;
    const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file');
    return hasFiles;
  }

  handleDrop(e: DragEvent, centerX: number, centerY: number): Promise<void> {
    e.preventDefault();
    if (!e.dataTransfer?.files) return Promise.resolve();
    return this.handleFiles(e.dataTransfer.files, centerX, centerY);
  }

  startDrag(imageId: string, handle: DragHandle, mouseX: number, mouseY: number) {
    const image = this.images.find(i => i.id === imageId);
    if (!image) return;

    this.dragState = {
      imageId,
      handle,
      startX: mouseX,
      startY: mouseY,
      startImageX: image.x,
      startImageY: image.y,
      startWidth: image.width,
      startHeight: image.height,
      aspectRatio: image.width / image.height
    };
  }

  updateDrag(mouseX: number, mouseY: number) {
    if (!this.dragState) return;

    const { imageId, handle, startX, startY, startImageX, startImageY, startWidth, startHeight, aspectRatio } = this.dragState;
    const dx = mouseX - startX;
    const dy = mouseY - startY;

    let x = startImageX;
    let y = startImageY;
    let width = startWidth;
    let height = startHeight;

    if (handle === 'move') {
      x = startImageX + dx;
      y = startImageY + dy;
    } else {
      const centerX = startImageX + startWidth / 2;
      const centerY = startImageY + startHeight / 2;

      const handleStartX = handle.includes('w') ? startImageX : startImageX + startWidth;
      const handleStartY = handle.includes('n') ? startImageY : startImageY + startHeight;

      const newHandleX = handleStartX + dx;
      const newHandleY = handleStartY + dy;

      const distFromCenter = Math.hypot(newHandleX - centerX, newHandleY - centerY);
      const origDistFromCenter = Math.hypot(handleStartX - centerX, handleStartY - centerY);

      let scaleFactor = origDistFromCenter > 0 ? distFromCenter / origDistFromCenter : 1;

      const newWidth = Math.max(40, startWidth * scaleFactor);
      const newHeight = Math.max(40, newWidth / aspectRatio);

      x = centerX - newWidth / 2;
      y = centerY - newHeight / 2;
      width = newWidth;
      height = newHeight;
    }

    const updates: Partial<ImageElementData> = { x, y, width, height };
    const idx = this.images.findIndex(i => i.id === imageId);
    if (idx !== -1) {
      this.images[idx] = { ...this.images[idx], ...updates };
      if (this.updateImageCallback) {
        this.updateImageCallback(imageId, updates);
      }
      this.notifyImages();
    }
  }

  endDrag() {
    this.dragState = null;
  }

  hitTestImage(x: number, y: number): { imageId: string; handle: DragHandle | null } | null {
    const handleSize = 12;
    for (let i = this.images.length - 1; i >= 0; i--) {
      const img = this.images[i];
      if (x >= img.x - handleSize / 2 && x <= img.x + img.width + handleSize / 2 &&
          y >= img.y - handleSize / 2 && y <= img.y + img.height + handleSize / 2) {

        const left = Math.abs(x - img.x) < handleSize;
        const right = Math.abs(x - (img.x + img.width)) < handleSize;
        const top = Math.abs(y - img.y) < handleSize;
        const bottom = Math.abs(y - (img.y + img.height)) < handleSize;

        if (top && left) return { imageId: img.id, handle: 'nw' };
        if (top && right) return { imageId: img.id, handle: 'ne' };
        if (bottom && left) return { imageId: img.id, handle: 'sw' };
        if (bottom && right) return { imageId: img.id, handle: 'se' };
        if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
          return { imageId: img.id, handle: 'move' };
        }
      }
    }
    return null;
  }

  startEdit(imageId: string) {
    this.editState = { imageId };
    this.notifyEdit();
  }

  endEdit() {
    this.editState = { imageId: null };
    this.notifyEdit();
  }

  updateCaption(imageId: string, caption: string) {
    const idx = this.images.findIndex(i => i.id === imageId);
    if (idx !== -1) {
      this.images[idx].caption = caption;
      if (this.updateImageCallback) {
        this.updateImageCallback(imageId, { caption });
      }
      this.notifyImages();
    }
  }

  destroy() {
    this.imagesListeners.clear();
    this.editListeners.clear();
  }
}
