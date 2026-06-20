import type { BackgroundConfig, TextElement, DecorationElement, CardElement } from '../types';

interface DragState {
  isDragging: boolean;
  elementId: string | null;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
}

interface ResizeState {
  isResizing: boolean;
  elementId: string | null;
  startScale: number;
  startDistance: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private background: BackgroundConfig = { type: 'solid', color: '#F5F5DC' };
  private elements: CardElement[] = [];
  private selectedElementId: string | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private needsRender: boolean = true;
  private dragState: DragState = {
    isDragging: false,
    elementId: null,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
  };
  private resizeState: ResizeState = {
    isResizing: false,
    elementId: null,
    startScale: 1,
    startDistance: 0,
  };
  private onSelectChange?: (elementId: string | null) => void;
  private onElementsChange?: (elements: CardElement[]) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.startRenderLoop();
  }

  setOnSelectChange(callback: (elementId: string | null) => void): void {
    this.onSelectChange = callback;
  }

  setOnElementsChange(callback: (elements: CardElement[]) => void): void {
    this.onElementsChange = callback;
  }

  setBackground(config: BackgroundConfig): void {
    this.background = config;
    if (config.type === 'image' && config.imageUrl) {
      this.loadBackgroundImage(config.imageUrl);
    } else {
      this.backgroundImage = null;
    }
    this.markDirty();
  }

  private loadBackgroundImage(url: string): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.backgroundImage = img;
      this.markDirty();
    };
    img.onerror = () => {
      console.error('Failed to load background image');
    };
    img.src = url;
  }

  addElement(element: CardElement): void {
    this.elements.push(element);
    this.markDirty();
    this.notifyElementsChange();
  }

  updateElement(id: string, updates: Partial<CardElement>): void {
    const index = this.elements.findIndex(el => el.id === id);
    if (index !== -1) {
      this.elements[index] = { ...this.elements[index], ...updates } as CardElement;
      this.markDirty();
      this.notifyElementsChange();
    }
  }

  deleteElement(id: string): void {
    this.elements = this.elements.filter(el => el.id !== id);
    if (this.selectedElementId === id) {
      this.selectedElementId = null;
      this.notifySelectChange();
    }
    this.markDirty();
    this.notifyElementsChange();
  }

  getElements(): CardElement[] {
    return [...this.elements];
  }

  getBackground(): BackgroundConfig {
    return { ...this.background };
  }

  getSelectedElementId(): string | null {
    return this.selectedElementId;
  }

  setSelectedElementId(id: string | null): void {
    this.selectedElementId = id;
    this.notifySelectChange();
    this.markDirty();
  }

  getElementAtPosition(x: number, y: number): CardElement | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const element = this.elements[i];
      if (this.isPointInElement(x, y, element)) {
        return element;
      }
    }
    return null;
  }

  private isPointInElement(x: number, y: number, element: CardElement): boolean {
    const bounds = this.getElementBounds(element);
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  }

  private getElementBounds(element: CardElement): { left: number; right: number; top: number; bottom: number } {
    if (element.type === 'text') {
      const textEl = element as TextElement;
      this.ctx.font = `${textEl.fontSize}px ${textEl.fontFamily}`;
      const metrics = this.ctx.measureText(textEl.content);
      const width = metrics.width;
      const height = textEl.fontSize;
      const scale = 1;
      return {
        left: textEl.x - width / 2 * scale - 10,
        right: textEl.x + width / 2 * scale + 10,
        top: textEl.y - height / 2 * scale - 10,
        bottom: textEl.y + height / 2 * scale + 10,
      };
    } else {
      const decEl = element as DecorationElement;
      const baseSize = 50 * decEl.scale;
      return {
        left: decEl.x - baseSize,
        right: decEl.x + baseSize,
        top: decEl.y - baseSize,
        bottom: decEl.y + baseSize,
      };
    }
  }

  startDrag(x: number, y: number): void {
    const element = this.getElementAtPosition(x, y);
    if (element) {
      this.dragState = {
        isDragging: true,
        elementId: element.id,
        offsetX: x - element.x,
        offsetY: y - element.y,
        startX: x,
        startY: y,
      };
      this.selectedElementId = element.id;
      this.notifySelectChange();
      this.markDirty();
    }
  }

  updateDrag(x: number, y: number): void {
    if (this.dragState.isDragging && this.dragState.elementId) {
      const element = this.elements.find(el => el.id === this.dragState.elementId);
      if (element) {
        const newX = Math.max(0, Math.min(800, x - this.dragState.offsetX));
        const newY = Math.max(0, Math.min(600, y - this.dragState.offsetY));
        this.updateElement(element.id, { x: newX, y: newY } as Partial<CardElement>);
      }
    }
  }

  endDrag(): void {
    this.dragState.isDragging = false;
    this.dragState.elementId = null;
  }

  startResize(x: number, y: number): void {
    if (this.selectedElementId) {
      const element = this.elements.find(el => el.id === this.selectedElementId);
      if (element && element.type === 'decoration') {
        const decEl = element as DecorationElement;
        this.resizeState = {
          isResizing: true,
          elementId: element.id,
          startScale: decEl.scale,
          startDistance: Math.sqrt(Math.pow(x - decEl.x, 2) + Math.pow(y - decEl.y, 2)),
        };
      }
    }
  }

  updateResize(x: number, y: number): void {
    if (this.resizeState.isResizing && this.resizeState.elementId) {
      const element = this.elements.find(el => el.id === this.resizeState.elementId);
      if (element && element.type === 'decoration') {
        const decEl = element as DecorationElement;
        const currentDistance = Math.sqrt(Math.pow(x - decEl.x, 2) + Math.pow(y - decEl.y, 2));
        const scaleChange = currentDistance / this.resizeState.startDistance;
        const newScale = Math.max(0.5, Math.min(2, this.resizeState.startScale * scaleChange));
        this.updateElement(element.id, { scale: newScale } as Partial<CardElement>);
      }
    }
  }

  endResize(): void {
    this.resizeState.isResizing = false;
    this.resizeState.elementId = null;
  }

  private markDirty(): void {
    this.needsRender = true;
  }

  private startRenderLoop(): void {
    const render = (timestamp: number) => {
      if (timestamp - this.lastFrameTime >= 33) {
        if (this.needsRender) {
          this.render();
          this.needsRender = false;
        }
        this.lastFrameTime = timestamp;
      }
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderBackground();
    this.elements.forEach(element => this.renderElement(element));
    if (this.selectedElementId) {
      const element = this.elements.find(el => el.id === this.selectedElementId);
      if (element) {
        this.renderSelection(element);
      }
    }
  }

  private renderBackground(): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    if (this.background.type === 'solid') {
      ctx.fillStyle = this.background.color || '#F5F5DC';
      ctx.fillRect(0, 0, width, height);
    } else if (this.background.type === 'gradient' && this.background.gradient) {
      const gradient = this.background.gradient;
      let canvasGradient: CanvasGradient;
      
      if (gradient.type === 'linear') {
        const angle = (gradient.angle || 0) * Math.PI / 180;
        const x1 = width / 2 - Math.cos(angle) * width;
        const y1 = height / 2 - Math.sin(angle) * height;
        const x2 = width / 2 + Math.cos(angle) * width;
        const y2 = height / 2 + Math.sin(angle) * height;
        canvasGradient = ctx.createLinearGradient(x1, y1, x2, y2);
      } else {
        canvasGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
      }
      
      gradient.colors.forEach((color, index) => {
        canvasGradient.addColorStop(index / (gradient.colors.length - 1), color);
      });
      
      ctx.fillStyle = canvasGradient;
      ctx.fillRect(0, 0, width, height);
    } else if (this.background.type === 'image' && this.backgroundImage) {
      const img = this.backgroundImage;
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      
      let drawWidth: number;
      let drawHeight: number;
      let offsetX: number;
      let offsetY: number;
      
      if (imgRatio > canvasRatio) {
        drawHeight = height;
        drawWidth = height * imgRatio;
        offsetX = (width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = width;
        drawHeight = width / imgRatio;
        offsetX = 0;
        offsetY = (height - drawHeight) / 2;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = '#F5F5DC';
      ctx.fillRect(0, 0, width, height);
    }
  }

  private renderElement(element: CardElement): void {
    if (element.type === 'text') {
      this.renderText(element as TextElement);
    } else {
      this.renderDecoration(element as DecorationElement);
    }
  }

  private renderText(element: TextElement): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate(element.rotation * Math.PI / 180);
    
    ctx.font = `${element.fontSize}px ${element.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (element.shadowBlur > 0) {
      ctx.shadowColor = element.shadowColor;
      ctx.shadowBlur = element.shadowBlur;
    }
    
    if (element.strokeWidth > 0) {
      ctx.strokeStyle = element.strokeColor;
      ctx.lineWidth = element.strokeWidth;
      ctx.strokeText(element.content, 0, 0);
    }
    
    ctx.fillStyle = element.color;
    ctx.fillText(element.content, 0, 0);
    
    ctx.restore();
  }

  private renderDecoration(element: DecorationElement): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate(element.rotation * Math.PI / 180);
    ctx.scale(element.scale, element.scale);
    
    ctx.fillStyle = element.color;
    
    switch (element.shape) {
      case 'star':
        this.drawStar(ctx, 0, 0, 5, 30, 15);
        break;
      case 'heart':
        this.drawHeart(ctx, 0, 0, 25);
        break;
      case 'flower':
        this.drawFlower(ctx, 0, 0, 30);
        break;
      case 'balloon':
        this.drawBalloon(ctx, 0, 0, 25);
        break;
      case 'confetti':
        this.drawConfetti(ctx, 0, 0, 30);
        break;
    }
    
    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot: number;
    let x: number;
    let y: number;
    let i: number;

    ctx.beginPath();
    rot = Math.PI / 2 * 3;
    x = cx;
    y = cy;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + size * 0.6);
    ctx.bezierCurveTo(
      x, y + topCurveHeight,
      x - size / 2, y,
      x - size / 2, y + topCurveHeight
    );
    ctx.bezierCurveTo(
      x - size / 2, y + (size + topCurveHeight) / 2,
      x, y + size,
      x, y + size
    );
    ctx.bezierCurveTo(
      x, y + size,
      x + size / 2, y + (size + topCurveHeight) / 2,
      x + size / 2, y + topCurveHeight
    );
    ctx.bezierCurveTo(
      x + size / 2, y,
      x, y + topCurveHeight,
      x, y + size * 0.6
    );
    ctx.closePath();
    ctx.fill();
  }

  private drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const petalCount = 6;
    const petalLength = size * 0.8;
    const petalWidth = size * 0.4;
    
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, -petalLength / 2, petalWidth, petalLength / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
  }

  private drawBalloon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.8, size, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x - size * 0.15, y + size * 0.95);
    ctx.lineTo(x + size * 0.15, y + size * 0.95);
    ctx.lineTo(x, y + size * 1.1);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x, y + size * 1.1);
    ctx.quadraticCurveTo(x + size * 0.3, y + size * 1.5, x, y + size * 1.8);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawConfetti(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const dist = size * 0.5;
      ctx.save();
      ctx.translate(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
      ctx.rotate(angle + Math.PI / 4);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(-size * 0.15, -size * 0.3, size * 0.3, size * 0.6);
      ctx.restore();
    }
  }

  private renderSelection(element: CardElement): void {
    const bounds = this.getElementBounds(element);
    const ctx = this.ctx;
    
    ctx.save();
    ctx.strokeStyle = '#667EEA';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.bottom);
    
    const handleSize = 8;
    ctx.setLineDash([]);
    ctx.fillStyle = '#667EEA';
    
    const handles = [
      { x: bounds.left, y: bounds.top },
      { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.bottom },
      { x: bounds.right, y: bounds.bottom },
      { x: bounds.left, y: (bounds.top + bounds.bottom) / 2 },
      { x: bounds.right, y: (bounds.top + bounds.bottom) / 2 },
      { x: (bounds.left + bounds.right) / 2, y: bounds.top },
      { x: (bounds.left + bounds.right) / 2, y: bounds.bottom },
    ];
    
    handles.forEach(handle => {
      ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    });
    
    ctx.restore();
  }

  private notifySelectChange(): void {
    if (this.onSelectChange) {
      this.onSelectChange(this.selectedElementId);
    }
  }

  private notifyElementsChange(): void {
    if (this.onElementsChange) {
      this.onElementsChange([...this.elements]);
    }
  }

  getCanvasDataURL(): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      return this.canvas.toDataURL('image/png');
    }
    
    const oldSelectedId = this.selectedElementId;
    this.selectedElementId = null;
    this.render();
    
    tempCtx.drawImage(this.canvas, 0, 0);
    
    this.selectedElementId = oldSelectedId;
    this.markDirty();
    
    return tempCanvas.toDataURL('image/png');
  }

  destroy(): void {
    this.stopRenderLoop();
  }
}
