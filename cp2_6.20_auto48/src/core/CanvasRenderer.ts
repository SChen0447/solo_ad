import type { CardElementUnion, TextElement, DecorationElement, CardElement, BackgroundType } from '@/types';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private bgImage: HTMLImageElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private drawGradientBackground(colors: [string, string]): void {
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawSolidBackground(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  loadImageBackground(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.bgImage = img;
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  private drawImageBackground(): void {
    if (this.bgImage) {
      const canvasRatio = this.width / this.height;
      const imgRatio = this.bgImage.width / this.bgImage.height;
      let drawW: number, drawH: number, drawX: number, drawY: number;

      if (imgRatio > canvasRatio) {
        drawH = this.height;
        drawW = this.height * imgRatio;
        drawX = (this.width - drawW) / 2;
        drawY = 0;
      } else {
        drawW = this.width;
        drawH = this.width / imgRatio;
        drawX = 0;
        drawY = (this.height - drawH) / 2;
      }

      this.ctx.drawImage(this.bgImage, drawX, drawY, drawW, drawH);
    }
  }

  drawBackground(background: string, backgroundType: BackgroundType): void {
    if (backgroundType === 'image' && this.bgImage) {
      this.drawImageBackground();
    } else if (background.includes(',')) {
      const parts = background.split(',');
      if (parts.length >= 2) {
        this.drawGradientBackground([parts[0].trim(), parts[1].trim()]);
      }
    } else {
      this.drawSolidBackground(background);
    }
  }

  drawText(element: TextElement): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.scale(element.scale, element.scale);

    ctx.font = `${element.fontSize}px ${element.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (element.shadowBlur > 0) {
      ctx.shadowBlur = element.shadowBlur;
      ctx.shadowColor = element.shadowColor;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    if (element.strokeWidth > 0) {
      ctx.strokeStyle = element.strokeColor;
      ctx.lineWidth = element.strokeWidth;
      ctx.lineJoin = 'round';
      ctx.strokeText(element.text, 0, 0);
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = element.color;
    ctx.fillText(element.text, 0, 0);

    ctx.restore();
  }

  drawDecoration(element: DecorationElement): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.scale(element.scale, element.scale);

    switch (element.shape) {
      case 'flower':
        this.drawFlower(ctx);
        break;
      case 'star':
        this.drawStar(ctx);
        break;
      case 'heart':
        this.drawHeart(ctx);
        break;
    }

    ctx.restore();
  }

  private drawFlower(ctx: CanvasRenderingContext2D): void {
    const petalCount = 5;
    const petalLength = 22;
    const petalWidth = 10;
    const centerRadius = 8;

    for (let i = 0; i < petalCount; i++) {
      const angle = (i * 2 * Math.PI) / petalCount;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, -petalLength * 0.7, petalWidth, petalLength, 0, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(0, -petalLength * 0.7, 2, 0, -petalLength * 0.7, petalLength);
      gradient.addColorStop(0, '#FFB7C5');
      gradient.addColorStop(1, '#FF69B4');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
    const centerGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, centerRadius);
    centerGrad.addColorStop(0, '#FFE44D');
    centerGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = centerGrad;
    ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D): void {
    const outerRadius = 25;
    const innerRadius = 10;
    const points = 5;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(0, 0, innerRadius * 0.5, 0, 0, outerRadius);
    gradient.addColorStop(0, '#FFF7AE');
    gradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawHeart(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(0, 5, -5, -5, -18, -5);
    ctx.bezierCurveTo(-32, -5, -32, 12, -32, 12);
    ctx.bezierCurveTo(-32, 22, -20, 32, 0, 42);
    ctx.bezierCurveTo(20, 32, 32, 22, 32, 12);
    ctx.bezierCurveTo(32, 12, 32, -5, 18, -5);
    ctx.bezierCurveTo(5, -5, 0, 5, 0, 8);
    ctx.closePath();

    const gradient = ctx.createRadialGradient(0, 10, 3, 0, 10, 30);
    gradient.addColorStop(0, '#FF6B8A');
    gradient.addColorStop(1, '#E8364F');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#C62828';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawSelectionBox(element: CardElement): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate((element.rotation * Math.PI) / 180);

    const bbox = this.getElementBBox(element);
    const pad = 6;

    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bbox.x - pad, bbox.y - pad, bbox.width + pad * 2, bbox.height + pad * 2);
    ctx.setLineDash([]);

    const handleSize = 8;
    const corners = [
      [bbox.x - pad, bbox.y - pad],
      [bbox.x + bbox.width + pad, bbox.y - pad],
      [bbox.x - pad, bbox.y + bbox.height + pad],
      [bbox.x + bbox.width + pad, bbox.y + bbox.height + pad],
    ];

    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 1.5;
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    });

    ctx.restore();
  }

  getElementBBox(element: CardElement): { x: number; y: number; width: number; height: number } {
    if (element.type === 'text') {
      const textEl = element as TextElement;
      this.ctx.font = `${textEl.fontSize}px ${textEl.fontFamily}`;
      const metrics = this.ctx.measureText(textEl.text);
      const width = metrics.width;
      const height = textEl.fontSize;
      return { x: -width / 2, y: -height / 2, width, height };
    }
    const size = 50;
    return { x: -size, y: -size, width: size * 2, height: size * 2 };
  }

  hitTest(x: number, y: number, element: CardElement): boolean {
    const dx = x - element.x;
    const dy = y - element.y;
    const angle = -(element.rotation * Math.PI) / 180;
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle);

    const bbox = this.getElementBBox(element);
    const pad = 8;
    return (
      rx >= bbox.x - pad &&
      rx <= bbox.x + bbox.width + pad &&
      ry >= bbox.y - pad &&
      ry <= bbox.y + bbox.height + pad
    );
  }

  render(
    elements: CardElementUnion[],
    background: string,
    backgroundType: BackgroundType,
    selectedElementId: string | null
  ): void {
    this.clear();
    this.drawBackground(background, backgroundType);

    for (const el of elements) {
      if (el.type === 'text') {
        this.drawText(el as TextElement);
      } else {
        this.drawDecoration(el as DecorationElement);
      }
    }

    if (selectedElementId) {
      const selected = elements.find((el) => el.id === selectedElementId);
      if (selected) {
        this.drawSelectionBox(selected);
      }
    }
  }

  getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }
}
