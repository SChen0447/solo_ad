import { Pet, PetAttributes } from './pet';

const LCD_GREEN = '#9BBC0F';
const LCD_GREEN_DARK = '#8B9F0A';
const BAR_WIDTH = 56;
const BAR_HEIGHT = 12;
const BAR_GAP = 20;
const BAR_X = 10;
const BAR_Y_START = 40;
const PET_SCALE = 6;
const PET_SPRITE_SIZE = 32;
const PET_DISPLAY_SIZE = PET_SPRITE_SIZE * PET_SCALE;
const CANVAS_W = 320;
const CANVAS_H = 288;

const ATTR_LABELS: { key: keyof PetAttributes; label: string }[] = [
  { key: 'hunger', label: '饱食' },
  { key: 'happiness', label: '快乐' },
  { key: 'energy', label: '精力' },
  { key: 'health', label: '健康' }
];

function lerpColor(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function valueToColor(value: number): string {
  const t = value / 100;
  const r = Math.round(lerpColor(220, 50, t));
  const g = Math.round(lerpColor(50, 200, t));
  const b = 50;
  return `rgb(${r},${g},${b})`;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private spriteCanvas: HTMLCanvasElement;
  private spriteCtx: CanvasRenderingContext2D;
  private displayAttrs: PetAttributes;
  private targetAttrs: PetAttributes;
  private animTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.spriteCanvas = document.createElement('canvas');
    this.spriteCanvas.width = PET_SPRITE_SIZE;
    this.spriteCanvas.height = PET_SPRITE_SIZE;
    this.spriteCtx = this.spriteCanvas.getContext('2d')!;
    this.displayAttrs = { hunger: 70, happiness: 70, energy: 70, health: 70 };
    this.targetAttrs = { hunger: 70, happiness: 70, energy: 70, health: 70 };
  }

  updateAttributes(attrs: PetAttributes): void {
    this.targetAttrs = { ...attrs };
  }

  render(pet: Pet, now: number): void {
    this.animTime = now;
    this.updateDisplayAttrs();
    this.clearScreen();
    this.drawAttributeBars();
    this.drawPetArea(pet, now);
    this.drawNotifications(pet, now);
  }

  private updateDisplayAttrs(): void {
    const speed = 0.1;
    (Object.keys(this.displayAttrs) as (keyof PetAttributes)[]).forEach(key => {
      const diff = this.targetAttrs[key] - this.displayAttrs[key];
      if (Math.abs(diff) < 0.5) {
        this.displayAttrs[key] = this.targetAttrs[key];
      } else {
        this.displayAttrs[key] += diff * speed;
      }
    });
  }

  private clearScreen(): void {
    this.ctx.fillStyle = LCD_GREEN;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.ctx.fillStyle = LCD_GREEN_DARK;
    for (let y = 0; y < CANVAS_H; y += 2) {
      this.ctx.fillRect(0, y, CANVAS_W, 1);
    }
  }

  private drawAttributeBars(): void {
    const font = '8px "Press Start 2P", monospace';
    this.ctx.font = font;
    this.ctx.textBaseline = 'top';

    ATTR_LABELS.forEach(({ key, label }, i) => {
      const y = BAR_Y_START + i * (BAR_HEIGHT + BAR_GAP + 12);
      const value = this.displayAttrs[key];

      this.ctx.fillStyle = '#306230';
      this.ctx.fillText(label, BAR_X, y - 2);

      const barY = y + 12;
      this.ctx.fillStyle = '#306230';
      this.ctx.fillRect(BAR_X, barY, BAR_WIDTH, BAR_HEIGHT);

      this.ctx.fillStyle = '#0F380F';
      this.ctx.fillRect(BAR_X + 1, barY + 1, BAR_WIDTH - 2, BAR_HEIGHT - 2);

      const fillW = Math.max(0, (value / 100) * (BAR_WIDTH - 2));
      this.ctx.fillStyle = valueToColor(value);
      this.ctx.fillRect(BAR_X + 1, barY + 1, fillW, BAR_HEIGHT - 2);

      this.ctx.fillStyle = '#306230';
      this.ctx.fillText(Math.round(value).toString(), BAR_X + BAR_WIDTH + 4, barY + 2);
    });
  }

  private drawPetArea(pet: Pet, now: number): void {
    const petAreaX = 85;
    const petAreaY = 20;
    const petAreaW = CANVAS_W - petAreaX - 10;
    const petAreaH = CANVAS_H - 40;

    this.ctx.strokeStyle = '#306230';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(petAreaX, petAreaY, petAreaW, petAreaH);

    this.spriteCtx.clearRect(0, 0, PET_SPRITE_SIZE, PET_SPRITE_SIZE);

    const action = pet.getAnimationAction();
    this.drawPetSprite(action, now);

    const petCenterX = petAreaX + petAreaW / 2 - PET_DISPLAY_SIZE / 2;
    const petCenterY = petAreaY + petAreaH / 2 - PET_DISPLAY_SIZE / 2 + 10;

    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.globalAlpha = pet.fadeOpacity;
    this.ctx.drawImage(
      this.spriteCanvas,
      petCenterX, petCenterY,
      PET_DISPLAY_SIZE, PET_DISPLAY_SIZE
    );
    this.ctx.restore();
  }

  private drawPetSprite(action: string, now: number): void {
    const s = this.spriteCtx;
    const t = now / 1000;
    const bounce = action === 'jumping' ? Math.abs(Math.sin(t * 4)) * 3 : 0;
    const yOff = action === 'weak' ? 2 : -bounce;

    const isSick = action === 'weak';
    const bodyColor = isSick ? '#C0CA33' : '#8BC34A';
    const bodyDark = isSick ? '#9E9D24' : '#689F38';
    const bodyLight = isSick ? '#DCE775' : '#AED581';

    this.drawPixelEllipse(s, 16, 14 + yOff, 9, 10, bodyColor);
    this.drawPixelEllipse(s, 16, 13 + yOff, 8, 8, bodyLight);

    this.drawPixelEllipse(s, 16, 6 + yOff, 7, 5, bodyColor);
    this.drawPixelEllipse(s, 15, 5 + yOff, 5, 3, bodyLight);

    if (action === 'jumping') {
      s.fillStyle = '#222';
      s.fillRect(11, 7 + yOff, 3, 3);
      s.fillRect(18, 7 + yOff, 3, 3);
      s.fillStyle = '#FFF';
      s.fillRect(12, 7 + yOff, 1, 1);
      s.fillRect(19, 7 + yOff, 1, 1);

      s.fillStyle = '#F48FB1';
      s.fillRect(9, 10 + yOff, 2, 1);
      s.fillRect(21, 10 + yOff, 2, 1);

      s.fillStyle = '#222';
      s.fillRect(14, 11 + yOff, 4, 1);

      s.fillStyle = bodyColor;
      s.fillRect(6, 14 + yOff, 2, 2);
      s.fillRect(24, 14 + yOff, 2, 2);

      this.drawPixelEllipse(s, 10, 22 + yOff, 3, 2, bodyDark);
      this.drawPixelEllipse(s, 22, 22 + yOff, 3, 2, bodyDark);
    } else if (action === 'yawning') {
      s.fillStyle = '#222';
      s.fillRect(12, 8 + yOff, 2, 1);
      s.fillRect(18, 8 + yOff, 2, 1);

      s.fillStyle = '#F48FB1';
      s.fillRect(9, 10 + yOff, 2, 1);
      s.fillRect(21, 10 + yOff, 2, 1);

      s.fillStyle = '#795548';
      s.fillRect(14, 10 + yOff, 4, 3);
      s.fillStyle = '#D32F2F';
      s.fillRect(15, 11 + yOff, 2, 1);

      this.drawPixelEllipse(s, 10, 22 + yOff + 2, 3, 2, bodyDark);
      this.drawPixelEllipse(s, 22, 22 + yOff + 2, 3, 2, bodyDark);

      s.fillStyle = '#FFF';
      s.fillRect(25, 4 + yOff, 1, 3);
      s.fillRect(24, 5 + yOff, 3, 1);
      s.fillRect(25, 3 + yOff, 1, 1);
    } else if (action === 'weak') {
      s.fillStyle = '#222';
      s.fillRect(12, 8 + yOff, 2, 1);
      s.fillRect(18, 8 + yOff, 2, 1);

      s.fillStyle = '#F48FB1';
      s.fillRect(9, 10 + yOff, 2, 1);
      s.fillRect(21, 10 + yOff, 2, 1);

      s.fillStyle = '#555';
      s.fillRect(14, 12 + yOff, 4, 1);
      s.fillRect(14, 11 + yOff, 1, 1);

      this.drawPixelEllipse(s, 10, 22 + yOff + 1, 3, 2, bodyDark);
      this.drawPixelEllipse(s, 22, 22 + yOff + 1, 3, 2, bodyDark);

      s.fillStyle = '#42A5F5';
      s.fillRect(24, 6 + yOff + Math.floor(Math.sin(t * 2)), 1, 2);
      s.fillRect(23, 7 + yOff + Math.floor(Math.sin(t * 2)), 2, 1);
    } else {
      s.fillStyle = '#222';
      s.fillRect(11, 7 + yOff, 3, 3);
      s.fillRect(18, 7 + yOff, 3, 3);
      s.fillStyle = '#FFF';
      s.fillRect(12, 7 + yOff, 1, 1);
      s.fillRect(19, 7 + yOff, 1, 1);

      s.fillStyle = '#F48FB1';
      s.fillRect(9, 10 + yOff, 2, 1);
      s.fillRect(21, 10 + yOff, 2, 1);

      s.fillStyle = '#222';
      s.fillRect(15, 11 + yOff, 2, 1);

      this.drawPixelEllipse(s, 10, 22 + yOff, 3, 2, bodyDark);
      this.drawPixelEllipse(s, 22, 22 + yOff, 3, 2, bodyDark);

      s.fillStyle = bodyColor;
      s.fillRect(8, 16 + yOff, 2, 2);
      s.fillRect(22, 16 + yOff, 2, 2);
    }
  }

  private drawPixelEllipse(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    rx: number, ry: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
          ctx.fillRect(Math.floor(cx + dx), Math.floor(cy + dy), 1, 1);
        }
      }
    }
  }

  private drawNotifications(pet: Pet, now: number): void {
    const petAreaX = 85;
    const petAreaW = CANVAS_W - petAreaX - 10;
    const bubbleX = petAreaX + petAreaW / 2;

    pet.notifications.forEach((notif) => {
      const elapsed = now - notif.startTime;
      if (elapsed > notif.duration + 500) return;

      let opacity = 1;
      if (elapsed < 200) {
        opacity = elapsed / 200;
      } else if (elapsed > notif.duration) {
        opacity = 1 - (elapsed - notif.duration) / 500;
      }
      opacity = Math.max(0, Math.min(1, opacity));

      let bounceY = 0;
      if (elapsed < 300) {
        const t2 = elapsed / 300;
        bounceY = -Math.abs(Math.sin(t2 * Math.PI * 2)) * 6 * (1 - t2);
      }

      const baseY = 55 + bounceY;
      const text = notif.text;

      this.ctx.save();
      this.ctx.globalAlpha = opacity;
      this.ctx.font = '8px "Press Start 2P", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const metrics = this.ctx.measureText(text);
      const tw = metrics.width + 12;
      const th = 18;

      this.ctx.fillStyle = '#FFF';
      this.roundRect(bubbleX - tw / 2, baseY - th / 2, tw, th, 4);
      this.ctx.fill();

      this.ctx.strokeStyle = '#306230';
      this.ctx.lineWidth = 1;
      this.roundRect(bubbleX - tw / 2, baseY - th / 2, tw, th, 4);
      this.ctx.stroke();

      this.ctx.fillStyle = '#306230';
      this.ctx.fillText(text, bubbleX, baseY);

      this.ctx.beginPath();
      this.ctx.moveTo(bubbleX - 4, baseY + th / 2);
      this.ctx.lineTo(bubbleX, baseY + th / 2 + 6);
      this.ctx.lineTo(bubbleX + 4, baseY + th / 2);
      this.ctx.fillStyle = '#FFF';
      this.ctx.fill();
      this.ctx.strokeStyle = '#306230';
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  private roundRect(
    x: number, y: number,
    w: number, h: number,
    r: number
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.arcTo(x + w, y, x + w, y + r, r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.arcTo(x, y + h, x, y + h - r, r);
    this.ctx.lineTo(x, y + r);
    this.ctx.arcTo(x, y, x + r, y, r);
    this.ctx.closePath();
  }
}

