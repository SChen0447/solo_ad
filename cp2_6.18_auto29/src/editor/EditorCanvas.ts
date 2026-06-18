import type { CharacterConfig } from '@/store/GameStore';

const PIXEL_SIZE = 8;
const GRID_SIZE = 20;
const CANVAS_SIZE = PIXEL_SIZE * GRID_SIZE;
const SKIN_COLOR = '#f5c6a0';
const EYE_COLOR = '#1a1a2e';

function drawPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
}

function drawPixels(ctx: CanvasRenderingContext2D, pixels: [number, number, string][]) {
  for (const [x, y, color] of pixels) {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      drawPixel(ctx, x, y, color);
    }
  }
}

function drawHead(ctx: CanvasRenderingContext2D, hatColor: string, hairStyle: number) {
  const hatPixels: [number, number, string][] = [];
  for (let x = 6; x <= 13; x++) {
    hatPixels.push([x, 0, hatColor]);
    hatPixels.push([x, 1, hatColor]);
  }
  for (let x = 5; x <= 14; x++) {
    hatPixels.push([x, 2, hatColor]);
  }
  drawPixels(ctx, hatPixels);

  const hairPatterns: [number, number][][] = [
    [[7, 3], [12, 3], [6, 4], [13, 4]],
    [[6, 2], [8, 2], [10, 2], [12, 2], [6, 3], [13, 3], [6, 4], [13, 4]],
    [[6, 3], [13, 3], [5, 4], [14, 4], [5, 5], [14, 5], [5, 6], [14, 6]],
    [[9, 0], [9, 1], [9, 2], [8, 3], [10, 3], [6, 4], [13, 4]],
    [[14, 3], [14, 4], [14, 5], [14, 6], [14, 7], [13, 7], [6, 3], [13, 3]],
  ];
  const hair = hairPatterns[hairStyle % 5];
  const hairPixels = hair.map(([x, y]) => [x, y, hatColor] as [number, number, string]);
  drawPixels(ctx, hairPixels);

  const facePixels: [number, number, string][] = [];
  for (let x = 7; x <= 12; x++) {
    for (let y = 3; y <= 6; y++) {
      facePixels.push([x, y, SKIN_COLOR]);
    }
  }
  drawPixels(ctx, facePixels);

  drawPixel(ctx, 8, 4, EYE_COLOR);
  drawPixel(ctx, 11, 4, EYE_COLOR);
  drawPixel(ctx, 9, 6, EYE_COLOR);
  drawPixel(ctx, 10, 6, EYE_COLOR);
}

function drawBody(ctx: CanvasRenderingContext2D, shirtColor: string, armorStyle: number) {
  const bodyPixels: [number, number, string][] = [];
  for (let x = 6; x <= 13; x++) {
    for (let y = 7; y <= 13; y++) {
      bodyPixels.push([x, y, shirtColor]);
    }
  }
  drawPixels(ctx, bodyPixels);

  const armorColors = ['#8b8b8b', '#c0c0c0', '#a0a0a0', '#4a4a4a'];
  const armorPatterns: [number, number][][] = [
    [],
    [[7, 8], [8, 8], [11, 8], [12, 8], [7, 9], [12, 9], [7, 10], [8, 10], [11, 10], [12, 10], [7, 11], [12, 11], [7, 12], [12, 12]],
    [[7, 8], [9, 8], [10, 8], [12, 8], [7, 9], [8, 9], [11, 9], [12, 9], [7, 10], [12, 10], [7, 11], [8, 11], [11, 11], [12, 11], [7, 12], [9, 12], [10, 12], [12, 12]],
    [[5, 7], [5, 8], [5, 9], [5, 10], [14, 7], [14, 8], [14, 9], [14, 10], [6, 13], [7, 13], [12, 13], [13, 13]],
  ];
  const ac = armorColors[armorStyle % 4];
  const armorPixels = (armorPatterns[armorStyle % 4]).map(([x, y]) => [x, y, ac] as [number, number, string]);
  drawPixels(ctx, armorPixels);

  const armPixels: [number, number, string][] = [];
  for (let y = 7; y <= 11; y++) {
    armPixels.push([5, y, SKIN_COLOR]);
    armPixels.push([14, y, SKIN_COLOR]);
  }
  drawPixels(ctx, armPixels);
}

function drawLegs(ctx: CanvasRenderingContext2D, pantsColor: string, shoeStyle: number) {
  const legPixels: [number, number, string][] = [];
  for (let x = 7; x <= 9; x++) {
    for (let y = 14; y <= 17; y++) {
      legPixels.push([x, y, pantsColor]);
    }
  }
  for (let x = 10; x <= 12; x++) {
    for (let y = 14; y <= 17; y++) {
      legPixels.push([x, y, pantsColor]);
    }
  }
  drawPixels(ctx, legPixels);

  const shoeColors = ['#5a3825', '#333333', '#8b4513', '#666666'];
  const shoePatterns: [number, number][][] = [
    [[7, 18], [8, 18], [9, 18], [7, 19], [8, 19], [9, 19], [10, 18], [11, 18], [12, 18], [10, 19], [11, 19], [12, 19]],
    [[6, 18], [7, 18], [8, 18], [9, 18], [6, 19], [7, 19], [8, 19], [9, 19], [10, 18], [11, 18], [12, 18], [13, 18], [10, 19], [11, 19], [12, 19], [13, 19]],
    [[8, 18], [9, 18], [8, 19], [9, 19], [10, 18], [11, 18], [10, 19], [11, 19]],
    [[6, 17], [7, 17], [8, 17], [9, 17], [10, 17], [11, 17], [12, 17], [13, 17], [6, 18], [13, 18], [6, 19], [13, 19]],
  ];
  const sc = shoeColors[shoeStyle % 4];
  const shoePixels = (shoePatterns[shoeStyle % 4]).map(([x, y]) => [x, y, sc] as [number, number, string]);
  drawPixels(ctx, shoePixels);
}

function drawWeapon(ctx: CanvasRenderingContext2D, weapon: string) {
  if (weapon === 'sword') {
    const blade: [number, number, string][] = [];
    for (let y = 4; y <= 10; y++) blade.push([16, y, '#d0d0d0']);
    blade.push([17, 5, '#d0d0d0']);
    blade.push([15, 5, '#d0d0d0']);
    blade.push([15, 11, '#8b4513']);
    blade.push([16, 11, '#8b4513']);
    blade.push([17, 11, '#8b4513']);
    blade.push([16, 12, '#5a3825']);
    drawPixels(ctx, blade);
  } else if (weapon === 'bow') {
    const bow: [number, number, string][] = [];
    for (let y = 4; y <= 12; y++) bow.push([16, y, '#8b4513']);
    bow.push([17, 5, '#8b4513']);
    bow.push([17, 11, '#8b4513']);
    bow.push([15, 4, '#8b4513']);
    bow.push([15, 12, '#8b4513']);
    for (let y = 5; y <= 11; y++) bow.push([15, y, '#e0e0e0']);
    drawPixels(ctx, bow);
  } else if (weapon === 'staff') {
    const staff: [number, number, string][] = [];
    for (let y = 3; y <= 13; y++) staff.push([16, y, '#8b4513']);
    staff.push([15, 2, '#ffcc00']);
    staff.push([16, 2, '#ffcc00']);
    staff.push([17, 2, '#ffcc00']);
    staff.push([16, 1, '#ffaa00']);
    staff.push([15, 3, '#ffaa00']);
    staff.push([17, 3, '#ffaa00']);
    drawPixels(ctx, staff);
  }
}

export class EditorCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pulseTimer: number = 0;
  private rafId: number | null = null;
  private lastChar: CharacterConfig | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  triggerPulse(): void {
    this.pulseTimer = 0.3;
    if (this.rafId === null) {
      this.startLoop();
    }
  }

  private startLoop(): void {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.pulseTimer = Math.max(0, this.pulseTimer - dt);
      if (this.lastChar) {
        this.drawFrame(this.lastChar, this.pulseTimer);
      }
      if (this.pulseTimer > 0) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private drawFrame(character: CharacterConfig, pulse: number): void {
    const t = 1 - pulse / 0.3;
    const scaleT = 1 + Math.sin(t * Math.PI) * 0.08;
    const flash = Math.sin(t * Math.PI) * 0.5;

    this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    this.ctx.fillStyle = '#16213e';
    this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    this.ctx.strokeStyle = '#ffffff10';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * PIXEL_SIZE, 0);
      this.ctx.lineTo(i * PIXEL_SIZE, CANVAS_SIZE);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * PIXEL_SIZE);
      this.ctx.lineTo(CANVAS_SIZE, i * PIXEL_SIZE);
      this.ctx.stroke();
    }

    this.ctx.save();
    this.ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    this.ctx.scale(scaleT, scaleT);
    this.ctx.translate(-CANVAS_SIZE / 2, -CANVAS_SIZE / 2);

    drawHead(this.ctx, character.head.hatColor, character.head.hairStyle);
    drawBody(this.ctx, character.body.shirtColor, character.body.armorStyle);
    drawLegs(this.ctx, character.legs.pantsColor, character.legs.shoeStyle);
    drawWeapon(this.ctx, character.weapon);

    if (flash > 0) {
      this.ctx.globalCompositeOperation = 'source-atop';
      this.ctx.fillStyle = `rgba(255,255,255,${flash})`;
      this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
    this.ctx.restore();

    if (pulse > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = pulse;
      this.ctx.strokeStyle = '#e94560';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      this.ctx.restore();
    }
  }

  render(character: CharacterConfig): void {
    this.lastChar = character;
    if (this.pulseTimer <= 0) {
      this.drawFrame(character, 0);
    }
  }

  get size(): number {
    return CANVAS_SIZE;
  }
}

export { CANVAS_SIZE as EDITOR_CANVAS_SIZE };
