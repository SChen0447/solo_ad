import type { Annotation, AnimationState, DrawingState, Rect, ViewState } from './types';
import { easeOut, lerp, normalizeRect } from './utils';

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const ZOOM_ANIMATION_DURATION = 250;
const FADE_IN_DURATION = 400;
const PULSE_DURATION = 800;
const SHRINK_OUT_DURATION = 300;
const SCROLLBAR_SIZE = 8;
const SCROLLBAR_MARGIN = 20;

interface ZoomAnimation {
  startScale: number;
  endScale: number;
  startOffsetX: number;
  startOffsetY: number;
  endOffsetX: number;
  endOffsetY: number;
  startTime: number;
  duration: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewState: ViewState = { scale: 1, offsetX: 0, offsetY: 0 };
  private targetViewState: ViewState = { scale: 1, offsetX: 0, offsetY: 0 };
  private annotations: Annotation[] = [];
  private image: HTMLImageElement | null = null;
  private imageWidth = 0;
  private imageHeight = 0;
  private animationId: number | null = null;
  private zoomAnimation: ZoomAnimation | null = null;
  private animationStates: Map<string, AnimationState> = new Map();
  private drawingState: DrawingState = { isDrawing: false };
  private hoveringAnnotationId: string | null = null;
  private devicePixelRatio = 1;
  private canvasWidth = 0;
  private canvasHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.devicePixelRatio = Math.max(window.devicePixelRatio || 1, 1);
  }

  setImage(image: HTMLImageElement): void {
    this.image = image;
    this.imageWidth = image.naturalWidth;
    this.imageHeight = image.naturalHeight;
    this.fitToScreen();
  }

  getViewState(): ViewState {
    return { ...this.viewState };
  }

  setAnnotations(annotations: Annotation[]): void {
    this.annotations = annotations;
    this.requestRender();
  }

  setDrawingState(state: DrawingState): void {
    this.drawingState = state;
    this.requestRender();
  }

  setHoveringAnnotation(id: string | null): void {
    this.hoveringAnnotationId = id;
    this.requestRender();
  }

  addAnimationState(state: AnimationState): void {
    this.animationStates.set(state.id, { ...state });
    this.requestRender();
  }

  removeAnimationState(id: string): void {
    this.animationStates.delete(id);
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.canvas.width = Math.floor(width * this.devicePixelRatio);
    this.canvas.height = Math.floor(height * this.devicePixelRatio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
    this.requestRender();
  }

  fitToScreen(): void {
    if (!this.imageWidth || !this.imageHeight || !this.canvasWidth || !this.canvasHeight) return;

    const scaleX = this.canvasWidth / this.imageWidth;
    const scaleY = this.canvasHeight / this.imageHeight;
    const scale = Math.min(scaleX, scaleY) * 0.95;

    this.viewState = { scale, offsetX: 0, offsetY: 0 };
    this.targetViewState = { scale, offsetX: 0, offsetY: 0 };
    this.zoomAnimation = null;
    this.requestRender();
  }

  pan(deltaX: number, deltaY: number): void {
    this.targetViewState.offsetX += deltaX;
    this.targetViewState.offsetY += deltaY;
    this.zoomAnimation = null;
    this.requestRender();
  }

  zoomAt(
    canvasX: number,
    canvasY: number,
    zoomFactor: number,
    animate = true
  ): void {
    if (!this.imageWidth || !this.imageHeight) return;

    const currentScale = this.zoomAnimation ? this.zoomAnimation.endScale : this.viewState.scale;
    const currentOffsetX = this.zoomAnimation ? this.zoomAnimation.endOffsetX : this.viewState.offsetX;
    const currentOffsetY = this.zoomAnimation ? this.zoomAnimation.endOffsetY : this.viewState.offsetY;

    let newScale = currentScale * zoomFactor;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    const actualFactor = newScale / currentScale;

    const imageDisplayWidth = this.imageWidth * currentScale;
    const imageDisplayHeight = this.imageHeight * currentScale;
    const imageLeft = (this.canvasWidth - imageDisplayWidth) / 2 + currentOffsetX;
    const imageTop = (this.canvasHeight - imageDisplayHeight) / 2 + currentOffsetY;

    const imageRelX = (canvasX - imageLeft) / currentScale;
    const imageRelY = (canvasY - imageTop) / currentScale;

    const newImageDisplayWidth = this.imageWidth * newScale;
    const newImageDisplayHeight = this.imageHeight * newScale;
    const newImageLeft = canvasX - imageRelX * newScale;
    const newImageTop = canvasY - imageRelY * newScale;

    const newOffsetX = newImageLeft - (this.canvasWidth - newImageDisplayWidth) / 2;
    const newOffsetY = newImageTop - (this.canvasHeight - newImageDisplayHeight) / 2;

    if (animate) {
      this.zoomAnimation = {
        startScale: currentScale,
        endScale: newScale,
        startOffsetX: currentOffsetX,
        startOffsetY: currentOffsetY,
        endOffsetX: newOffsetX,
        endOffsetY: newOffsetY,
        startTime: performance.now(),
        duration: ZOOM_ANIMATION_DURATION,
      };
    } else {
      this.viewState.scale = newScale;
      this.viewState.offsetX = newOffsetX;
      this.viewState.offsetY = newOffsetY;
      this.targetViewState.scale = newScale;
      this.targetViewState.offsetX = newOffsetX;
      this.targetViewState.offsetY = newOffsetY;
      this.zoomAnimation = null;
    }

    this.requestRender();
  }

  setScale(scale: number, animate = true): void {
    if (!this.canvasWidth || !this.canvasHeight) return;
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    this.zoomAt(this.canvasWidth / 2, this.canvasHeight / 2, clampedScale / this.viewState.scale, animate);
  }

  getScale(): number {
    return this.viewState.scale;
  }

  requestRender(): void {
    if (this.animationId !== null) return;
    this.animationId = requestAnimationFrame(() => this.render());
  }

  private render(): void {
    this.animationId = null;

    const now = performance.now();

    if (this.zoomAnimation) {
      const elapsed = now - this.zoomAnimation.startTime;
      const progress = Math.min(elapsed / this.zoomAnimation.duration, 1);
      const eased = easeOut(progress);

      this.viewState.scale = lerp(this.zoomAnimation.startScale, this.zoomAnimation.endScale, eased);
      this.viewState.offsetX = lerp(this.zoomAnimation.startOffsetX, this.zoomAnimation.endOffsetX, eased);
      this.viewState.offsetY = lerp(this.zoomAnimation.startOffsetY, this.zoomAnimation.endOffsetY, eased);

      if (progress < 1) {
        this.requestRender();
      } else {
        this.viewState.scale = this.zoomAnimation.endScale;
        this.viewState.offsetX = this.zoomAnimation.endOffsetX;
        this.viewState.offsetY = this.zoomAnimation.endOffsetY;
        this.zoomAnimation = null;
      }
    } else {
      this.viewState.offsetX = this.targetViewState.offsetX;
      this.viewState.offsetY = this.targetViewState.offsetY;
      this.viewState.scale = this.targetViewState.scale;
    }

    for (const [id, anim] of this.animationStates) {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      this.animationStates.set(id, { ...anim, progress });
      if (progress < 1) {
        this.requestRender();
      }
    }

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (this.image && this.imageWidth > 0 && this.imageHeight > 0) {
      this.drawImage();
      this.drawAnnotations();
      this.drawDrawingRect();
      this.drawScrollbars();
    }
  }

  private drawImage(): void {
    if (!this.image) return;

    const { scale, offsetX, offsetY } = this.viewState;
    const imageDisplayWidth = this.imageWidth * scale;
    const imageDisplayHeight = this.imageHeight * scale;
    const imageLeft = (this.canvasWidth - imageDisplayWidth) / 2 + offsetX;
    const imageTop = (this.canvasHeight - imageDisplayHeight) / 2 + offsetY;

    this.ctx.save();
    this.ctx.imageSmoothingEnabled = scale < 1;
    this.ctx.imageSmoothingQuality = scale < 1 ? 'high' : 'medium';
    this.ctx.drawImage(this.image, imageLeft, imageTop, imageDisplayWidth, imageDisplayHeight);
    this.ctx.restore();
  }

  private drawAnnotations(): void {
    const { scale, offsetX, offsetY } = this.viewState;
    const imageDisplayWidth = this.imageWidth * scale;
    const imageDisplayHeight = this.imageHeight * scale;
    const imageLeft = (this.canvasWidth - imageDisplayWidth) / 2 + offsetX;
    const imageTop = (this.canvasHeight - imageDisplayHeight) / 2 + offsetY;

    const now = performance.now();

    for (let i = 0; i < this.annotations.length; i++) {
      const ann = this.annotations[i];
      const animState = this.animationStates.get(ann.id);

      let alpha = 1;
      let scaleFactor = 1;
      let pulseIntensity = 0;

      if (animState) {
        const progress = animState.progress ?? 0;
        const eased = easeOut(progress);

        if (animState.type === 'fadeIn') {
          alpha = eased;
        } else if (animState.type === 'pulse') {
          const t = progress;
          pulseIntensity = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
          alpha = 1;
        } else if (animState.type === 'shrinkOut') {
          alpha = 1 - eased;
          scaleFactor = 1 - eased * 0.8;
        }
      }

      if (alpha <= 0.01) continue;

      let x = imageLeft + ann.x_ratio * imageDisplayWidth;
      let y = imageTop + ann.y_ratio * imageDisplayHeight;
      let w = ann.width_ratio * imageDisplayWidth;
      let h = ann.height_ratio * imageDisplayHeight;

      if (scaleFactor !== 1) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        x = cx - (w / 2) * scaleFactor;
        y = cy - (h / 2) * scaleFactor;
        w *= scaleFactor;
        h *= scaleFactor;
      }

      const isHovering = this.hoveringAnnotationId === ann.id;
      this.drawAnnotationRect(x, y, w, h, alpha, pulseIntensity, isHovering, i + 1);

      if (ann.comment && scaleFactor === 1) {
        this.drawCommentCard(x, y, w, ann.comment, alpha);
      }

      if (isHovering && scaleFactor === 1) {
        this.drawDeleteButton(x + w, y, alpha);
      }
    }
  }

  private drawAnnotationRect(
    x: number,
    y: number,
    w: number,
    h: number,
    alpha: number,
    pulseIntensity: number,
    isHovering: boolean,
    index: number
  ): void {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    this.ctx.fillStyle = `rgba(212, 175, 55, ${0.08 + pulseIntensity * 0.12})`;
    this.ctx.fillRect(x, y, w, h);

    const baseLineWidth = Math.max(2, 2 / Math.max(this.viewState.scale, 1));
    const pulseWidth = baseLineWidth + pulseIntensity * 2;
    this.ctx.lineWidth = isHovering ? pulseWidth + 1 : pulseWidth;
    this.ctx.strokeStyle = isHovering
      ? `rgba(255, 215, 0, ${0.95 + pulseIntensity * 0.05})`
      : `rgba(212, 175, 55, ${0.85 + pulseIntensity * 0.15})`;

    if (pulseIntensity > 0) {
      this.ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
      this.ctx.shadowBlur = 8 + pulseIntensity * 12;
    }

    this.ctx.strokeRect(x, y, w, h);
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#d4af37';
    const badgeSize = Math.max(18, 22 / Math.max(this.viewState.scale, 1));
    const badgeFont = Math.max(11, 13 / Math.max(this.viewState.scale, 1));
    this.ctx.font = `bold ${badgeFont}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const badgeX = x - badgeSize / 2 + 4;
    const badgeY = y - badgeSize / 2 - 2;
    this.ctx.beginPath();
    const radius = badgeSize / 2;
    this.ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, radius);
    this.ctx.fill();
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillText(String(index), badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 1);

    this.ctx.restore();
  }

  private drawCommentCard(
    x: number,
    y: number,
    w: number,
    comment: string,
    alpha: number
  ): void {
    const lines = comment.split('\n');
    const font = Math.max(11, 13 / Math.max(this.viewState.scale, 1));
    const lineHeight = font * 1.4;
    const padding = Math.max(6, 8 / Math.max(this.viewState.scale, 1));
    const cornerRadius = Math.max(4, 6 / Math.max(this.viewState.scale, 1));

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.font = `${font}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

    let maxWidth = 0;
    for (const line of lines) {
      const textWidth = this.ctx.measureText(line).width;
      maxWidth = Math.max(maxWidth, textWidth);
    }

    const cardWidth = Math.max(maxWidth + padding * 2, Math.max(w, 80 / Math.max(this.viewState.scale, 1)));
    const cardHeight = lines.length * lineHeight + padding * 2;
    const cardX = x;
    const cardY = y - cardHeight - Math.max(6, 10 / Math.max(this.viewState.scale, 1));

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.ctx.beginPath();
    this.ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cornerRadius);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
    this.ctx.lineWidth = Math.max(0.5, 1 / Math.max(this.viewState.scale, 1));
    this.ctx.stroke();

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(lines[i], cardX + padding, cardY + padding + i * lineHeight);
    }

    this.ctx.restore();
  }

  private drawDeleteButton(x: number, y: number, alpha: number): void {
    const size = Math.max(20, 24 / Math.max(this.viewState.scale, 1));
    const padding = Math.max(2, 4 / Math.max(this.viewState.scale, 1));
    const btnX = x - size / 2;
    const btnY = y - size / 2;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    this.ctx.fillStyle = 'rgba(220, 53, 69, 0.95)';
    this.ctx.beginPath();
    this.ctx.roundRect(btnX, btnY, size, size, size / 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = Math.max(1.5, 2 / Math.max(this.viewState.scale, 1));
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(btnX + padding + 2, btnY + padding + 2);
    this.ctx.lineTo(btnX + size - padding - 2, btnY + size - padding - 2);
    this.ctx.moveTo(btnX + size - padding - 2, btnY + padding + 2);
    this.ctx.lineTo(btnX + padding + 2, btnY + size - padding - 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawDrawingRect(): void {
    if (!this.drawingState.isDrawing) return;

    const rect = normalizeRect(
      this.drawingState.startX,
      this.drawingState.startY,
      this.drawingState.currentX,
      this.drawingState.currentY
    );

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    this.ctx.setLineDash([6, 4]);
    this.ctx.lineDashOffset = -performance.now() / 30;
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    this.ctx.setLineDash([]);

    this.ctx.restore();
    this.requestRender();
  }

  private drawScrollbars(): void {
    if (!this.imageWidth || !this.imageHeight) return;

    const { scale, offsetX, offsetY } = this.viewState;
    const imageDisplayWidth = this.imageWidth * scale;
    const imageDisplayHeight = this.imageHeight * scale;
    const imageLeft = (this.canvasWidth - imageDisplayWidth) / 2 + offsetX;
    const imageTop = (this.canvasHeight - imageDisplayHeight) / 2 + offsetY;

    const needsHorizontal = imageDisplayWidth > this.canvasWidth * 1.01;
    const needsVertical = imageDisplayHeight > this.canvasHeight * 1.01;

    if (!needsHorizontal && !needsVertical) return;

    const trackWidth = this.canvasWidth - SCROLLBAR_MARGIN * 2 - (needsVertical ? SCROLLBAR_SIZE + 4 : 0);
    const trackHeight = this.canvasHeight - SCROLLBAR_MARGIN * 2 - (needsHorizontal ? SCROLLBAR_SIZE + 4 : 0);
    const trackLeft = SCROLLBAR_MARGIN;
    const trackTop = SCROLLBAR_MARGIN;

    if (needsHorizontal) {
      const visibleRatio = Math.min(1, this.canvasWidth / imageDisplayWidth);
      const thumbWidth = Math.max(40, trackWidth * visibleRatio);
      const maxOffset = this.canvasWidth / 2 - (imageLeft + imageDisplayWidth / 2);
      const maxRange = (imageDisplayWidth - this.canvasWidth) / 2;
      const scrollProgress = maxRange > 0 ? (maxOffset + maxRange) / (maxRange * 2) : 0;
      const thumbLeft = trackLeft + (trackWidth - thumbWidth) * Math.max(0, Math.min(1, scrollProgress));
      const thumbTop = this.canvasHeight - SCROLLBAR_MARGIN - SCROLLBAR_SIZE;

      this.ctx.save();
      const gradient = this.ctx.createLinearGradient(thumbLeft, thumbTop, thumbLeft + thumbWidth, thumbTop);
      gradient.addColorStop(0, 'rgba(212, 175, 55, 0)');
      gradient.addColorStop(0.1, 'rgba(212, 175, 55, 0.5)');
      gradient.addColorStop(0.9, 'rgba(212, 175, 55, 0.5)');
      gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.roundRect(thumbLeft, thumbTop, thumbWidth, SCROLLBAR_SIZE, SCROLLBAR_SIZE / 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    if (needsVertical) {
      const visibleRatio = Math.min(1, this.canvasHeight / imageDisplayHeight);
      const thumbHeight = Math.max(40, trackHeight * visibleRatio);
      const maxOffset = this.canvasHeight / 2 - (imageTop + imageDisplayHeight / 2);
      const maxRange = (imageDisplayHeight - this.canvasHeight) / 2;
      const scrollProgress = maxRange > 0 ? (maxOffset + maxRange) / (maxRange * 2) : 0;
      const thumbTop = trackTop + (trackHeight - thumbHeight) * Math.max(0, Math.min(1, scrollProgress));
      const thumbLeft = this.canvasWidth - SCROLLBAR_MARGIN - SCROLLBAR_SIZE;

      this.ctx.save();
      const gradient = this.ctx.createLinearGradient(thumbLeft, thumbTop, thumbLeft, thumbTop + thumbHeight);
      gradient.addColorStop(0, 'rgba(212, 175, 55, 0)');
      gradient.addColorStop(0.1, 'rgba(212, 175, 55, 0.5)');
      gradient.addColorStop(0.9, 'rgba(212, 175, 55, 0.5)');
      gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.roundRect(thumbLeft, thumbTop, SCROLLBAR_SIZE, thumbHeight, SCROLLBAR_SIZE / 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  getDeleteButtonRect(annotation: Annotation): Rect | null {
    if (this.hoveringAnnotationId !== annotation.id) return null;

    const { scale, offsetX, offsetY } = this.viewState;
    const imageDisplayWidth = this.imageWidth * scale;
    const imageDisplayHeight = this.imageHeight * scale;
    const imageLeft = (this.canvasWidth - imageDisplayWidth) / 2 + offsetX;
    const imageTop = (this.canvasHeight - imageDisplayHeight) / 2 + offsetY;

    const x = imageLeft + annotation.x_ratio * imageDisplayWidth;
    const y = imageTop + annotation.y_ratio * imageDisplayHeight;
    const w = annotation.width_ratio * imageDisplayWidth;

    const size = Math.max(20, 24 / Math.max(scale, 1));
    return {
      x: x + w - size / 2,
      y: y - size / 2,
      width: size,
      height: size,
    };
  }

  cleanup(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.image = null;
  }
}

export { MIN_SCALE, MAX_SCALE, FADE_IN_DURATION, PULSE_DURATION, SHRINK_OUT_DURATION };
