import { CardData, ELEMENT_COLORS, RARITY_COLORS, RARITY_GLOW, ELEMENT_SYMBOLS, Position } from './types';

export class Card {
  data: CardData;
  x: number = 0;
  y: number = 0;
  targetX: number = 0;
  targetY: number = 0;
  width: number = 100;
  height: number = 140;
  isHovered: boolean = false;
  isDragging: boolean = false;
  dragOffset: Position = { x: 0, y: 0 };
  flipProgress: number = 0;
  isFlipping: boolean = false;
  isFlipped: boolean = false;
  hoverFloat: number = 0;
  rotation: number = 0;
  targetRotation: number = 0;
  scale: number = 1;

  constructor(data: CardData) {
    this.data = data;
  }

  update(deltaTime: number) {
    this.x += (this.targetX - this.x) * 10 * deltaTime;
    this.y += (this.targetY - this.y) * 10 * deltaTime;
    this.rotation += (this.targetRotation - this.rotation) * 8 * deltaTime;

    const targetFloat = this.isHovered && !this.isDragging ? -5 : 0;
    this.hoverFloat += (targetFloat - this.hoverFloat) * 8 * deltaTime;

    if (this.isFlipping) {
      this.flipProgress += deltaTime * 2.5;
      if (this.flipProgress >= 1) {
        this.flipProgress = 1;
        this.isFlipping = false;
        this.isFlipped = !this.isFlipped;
      }
    } else if (this.flipProgress > 0) {
      this.flipProgress = 0;
    }
  }

  startFlip() {
    if (!this.isFlipping) {
      this.isFlipping = true;
      this.flipProgress = 0;
    }
  }

  containsPoint(px: number, py: number): boolean {
    const drawY = this.y + this.hoverFloat;
    return (
      px >= this.x - this.width / 2 &&
      px <= this.x + this.width / 2 &&
      py >= drawY - this.height / 2 &&
      py <= drawY + this.height / 2
    );
  }

  startDrag(mouseX: number, mouseY: number) {
    this.isDragging = true;
    this.dragOffset = {
      x: mouseX - this.x,
      y: mouseY - this.y
    };
  }

  onDrag(mouseX: number, mouseY: number) {
    if (this.isDragging) {
      this.x = mouseX - this.dragOffset.x;
      this.y = mouseY - this.dragOffset.y;
    }
  }

  endDrag() {
    this.isDragging = false;
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    const drawY = this.y + this.hoverFloat;
    const flipAngle = this.flipProgress * Math.PI;
    const actualFlip = this.isFlipped ? Math.PI : 0;
    const totalFlip = actualFlip + (this.isFlipping ? flipAngle : 0);
    const scaleX = Math.cos(totalFlip);

    ctx.translate(this.x, drawY);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(scaleX * this.scale, this.scale);

    if (Math.abs(scaleX) > 0.01) {
      if (scaleX > 0) {
        this.renderFront(ctx);
      } else {
        this.renderBack(ctx);
      }
    }

    ctx.restore();
  }

  private renderFront(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;
    const radius = 12;

    if (this.isHovered) {
      ctx.shadowColor = RARITY_GLOW[this.data.rarity];
      ctx.shadowBlur = 20;
    }

    const gradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    gradient.addColorStop(0, '#2a2a4a');
    gradient.addColorStop(1, '#1a1a3a');
    ctx.fillStyle = gradient;
    this.roundRect(ctx, -w / 2, -h / 2, w, h, radius);
    ctx.fill();

    ctx.strokeStyle = RARITY_COLORS[this.data.rarity];
    ctx.lineWidth = 3;
    this.roundRect(ctx, -w / 2, -h / 2, w, h, radius);
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = ELEMENT_COLORS[this.data.element];
    ctx.beginPath();
    ctx.arc(0, -h / 2 + 35, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = ELEMENT_COLORS[this.data.element];
    ctx.shadowBlur = 15;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ELEMENT_SYMBOLS[this.data.element], 0, -h / 2 + 35);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Microsoft YaHei';
    ctx.fillText(this.data.name, 0, 5);

    if (!this.data.is_spell) {
      ctx.fillStyle = '#ff6666';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`⚔ ${this.data.attack}`, -w / 2 + 20, h / 2 - 20);

      ctx.fillStyle = '#66ff66';
      ctx.fillText(`❤ ${this.data.health}`, w / 2 - 20, h / 2 - 20);
    } else {
      ctx.fillStyle = '#66aaff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('法术', 0, h / 2 - 40);
    }

    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    const cx = -w / 2 + 15;
    const cy = -h / 2 + 18;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const x = cx + Math.cos(angle) * 10;
      const y = cy + Math.sin(angle) * 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(this.data.cost.toString(), cx, cy);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px Microsoft YaHei';
    ctx.fillText(this.data.description, 0, 30);
  }

  private renderBack(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;
    const radius = 12;

    const gradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    gradient.addColorStop(0, '#3a3a5a');
    gradient.addColorStop(1, '#2a2a4a');
    ctx.fillStyle = gradient;
    this.roundRect(ctx, -w / 2, -h / 2, w, h, radius);
    ctx.fill();

    ctx.strokeStyle = RARITY_COLORS[this.data.rarity];
    ctx.lineWidth = 3;
    this.roundRect(ctx, -w / 2, -h / 2, w, h, radius);
    ctx.stroke();

    const glowGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 50);
    glowGradient.addColorStop(0, ELEMENT_COLORS[this.data.element]);
    glowGradient.addColorStop(0.5, ELEMENT_COLORS[this.data.element] + '88');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ELEMENT_SYMBOLS[this.data.element], 0, 0);

    ctx.strokeStyle = RARITY_COLORS[this.data.rarity];
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + Date.now() * 0.001;
      const x1 = Math.cos(angle) * 25;
      const y1 = Math.sin(angle) * 25;
      const x2 = Math.cos(angle) * 40;
      const y2 = Math.sin(angle) * 40;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
