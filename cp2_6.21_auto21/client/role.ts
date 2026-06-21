import { RoleType, ROLE_COLORS, ROLE_NAMES } from './resources.js';

export interface PixelRoleData {
  id: string;
  role: RoleType;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  direction: number;
  animFrame: number;
  moving: boolean;
  moveSpeed: number;
  isSelf: boolean;
  lastFrameSwitchTime: number;
}

export class PixelRole {
  data: PixelRoleData;
  private spriteCache: Map<string, HTMLCanvasElement> = new Map();

  constructor(
    id: string,
    role: RoleType,
    name: string,
    x: number,
    y: number,
    isSelf: boolean = false
  ) {
    this.data = {
      id,
      role,
      name,
      x,
      y,
      targetX: x,
      targetY: y,
      direction: 0,
      animFrame: 0,
      moving: false,
      moveSpeed: 150,
      isSelf,
      lastFrameSwitchTime: 0,
    };
  }

  setTarget(tx: number, ty: number) {
    this.data.targetX = tx;
    this.data.targetY = ty;
    this.data.moving = true;
    const dx = tx - this.data.x;
    const dy = ty - this.data.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.data.direction = dx > 0 ? 2 : 1;
    } else {
      this.data.direction = dy > 0 ? 0 : 3;
    }
  }

  update(dt: number) {
    if (!this.data.moving) return;
    const dx = this.data.targetX - this.data.x;
    const dy = this.data.targetY - this.data.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) {
      this.data.x = this.data.targetX;
      this.data.y = this.data.targetY;
      this.data.moving = false;
      this.data.animFrame = 0;
      return;
    }
    const step = this.data.moveSpeed * dt;
    this.data.x += (dx / dist) * step;
    this.data.y += (dy / dist) * step;
  }

  updateAnimation(timestamp: number) {
    if (!this.data.moving) {
      this.data.animFrame = 0;
      this.data.lastFrameSwitchTime = 0;
      return;
    }
    if (this.data.lastFrameSwitchTime === 0) {
      this.data.lastFrameSwitchTime = timestamp;
    }
    if (timestamp - this.data.lastFrameSwitchTime >= 100) {
      this.data.lastFrameSwitchTime = timestamp;
      this.data.animFrame = (this.data.animFrame + 1) % 4;
    }
  }

  draw(ctx: CanvasRenderingContext2D, displayScale: number = 3) {
    const { x, y, role, direction, animFrame, moving, isSelf, name } = this.data;
    const px = Math.floor(x);
    const py = Math.floor(y);
    const frame = moving ? animFrame : 0;
    const sprite = this.getSpriteCanvas(role, direction, frame);
    const drawW = 16 * displayScale;
    const drawH = 16 * displayScale;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, px - drawW / 2, py - drawH, drawW, drawH);

    if (isSelf) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py - drawH / 2, drawW / 2 + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    this.drawNameTag(ctx, px, py - drawH - 4, name, ROLE_COLORS[role]);
  }

  private getSpriteCanvas(role: RoleType, direction: number, frame: number): HTMLCanvasElement {
    const key = `${role}_${direction}_${frame}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const sctx = c.getContext('2d')!;
    sctx.imageSmoothingEnabled = false;
    this.paint16x16Sprite(sctx, role, direction, frame);
    this.spriteCache.set(key, c);
    return c;
  }

  private paint16x16Sprite(
    ctx: CanvasRenderingContext2D,
    role: RoleType,
    direction: number,
    frame: number
  ) {
    const skin = '#F4C28A';
    const skinShade = '#D4A76A';
    const eyeColor = '#111111';
    const mouthColor = '#CC6644';
    const bootColor = '#5D3A1A';
    const hairColors: Record<RoleType, string> = { farmer: '#6B3410', chef: '#5D4037', merchant: '#1A237E' };
    const bodyColors: Record<RoleType, string> = { farmer: '#4CAF50', chef: '#FF9800', merchant: '#2196F3' };
    const bodyDark: Record<RoleType, string> = { farmer: '#388E3C', chef: '#E65100', merchant: '#1565C0' };
    const hair = hairColors[role];
    const body = bodyColors[role];
    const bodyDk = bodyDark[role];

    const px = (x: number, y: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
    const rect = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

    if (role === 'farmer') {
      rect(4, 0, 8, 1, '#A0522D');
      rect(3, 1, 10, 1, '#8B4513');
      rect(4, 2, 8, 1, '#6B3410');
    } else if (role === 'chef') {
      rect(5, 0, 6, 1, '#FFFFFF');
      rect(4, 1, 8, 1, '#EEEEEE');
      rect(5, 1, 6, 1, '#FFFFFF');
      rect(4, 2, 8, 1, '#DDDDDD');
    } else {
      rect(4, 0, 8, 1, '#1976D2');
      rect(4, 1, 8, 1, '#2196F3');
      rect(5, 2, 6, 1, '#1976D2');
    }

    rect(4, 3, 8, 1, hair);
    if (direction === 1) {
      rect(3, 3, 1, 2, hair);
      px(12, 3, skinShade);
    } else if (direction === 2) {
      px(3, 3, skinShade);
      rect(12, 3, 1, 2, hair);
    } else if (direction === 3) {
      rect(3, 3, 1, 2, hair);
      rect(12, 3, 1, 2, hair);
    } else {
      px(3, 3, skinShade);
      px(12, 3, skinShade);
    }

    rect(4, 4, 8, 4, skin);
    if (direction === 3) {
      rect(5, 5, 6, 2, hair);
      px(5, 7, skinShade);
      px(10, 7, skinShade);
    } else {
      if (direction === 0) {
        px(5, 5, eyeColor); px(6, 5, eyeColor);
        px(9, 5, eyeColor); px(10, 5, eyeColor);
        px(7, 7, mouthColor); px(8, 7, mouthColor);
      } else if (direction === 1) {
        px(5, 5, eyeColor); px(6, 5, eyeColor);
        px(7, 7, mouthColor);
      } else {
        px(9, 5, eyeColor); px(10, 5, eyeColor);
        px(8, 7, mouthColor);
      }
      px(4, 4, skinShade);
      px(11, 4, skinShade);
    }

    rect(5, 8, 6, 1, skinShade);

    rect(3, 9, 10, 1, bodyDk);
    rect(3, 10, 10, 2, body);
    rect(4, 10, 8, 1, bodyDk);

    if (direction === 1) {
      rect(2, 9, 1, 3, skin);
      rect(13, 10, 1, 2, skinShade);
    } else if (direction === 2) {
      rect(2, 10, 1, 2, skinShade);
      rect(13, 9, 1, 3, skin);
    } else {
      rect(2, 9, 1, 3, skin);
      rect(13, 9, 1, 3, skin);
    }

    const walk = frame % 4;
    if (walk === 0 || walk === 2) {
      rect(4, 13, 3, 2, bodyDk);
      rect(9, 13, 3, 2, bodyDk);
      rect(4, 15, 3, 1, bootColor);
      rect(9, 15, 3, 1, bootColor);
    } else if (walk === 1) {
      rect(3, 13, 3, 2, bodyDk);
      rect(10, 13, 3, 2, bodyDk);
      rect(3, 15, 3, 1, bootColor);
      rect(10, 15, 3, 1, bootColor);
    } else {
      rect(5, 13, 3, 2, bodyDk);
      rect(8, 13, 3, 2, bodyDk);
      rect(5, 15, 3, 1, bootColor);
      rect(8, 15, 3, 1, bootColor);
    }

    if (role === 'farmer') {
      px(7, 10, '#8B4513'); px(8, 10, '#8B4513');
    } else if (role === 'chef') {
      rect(5, 9, 6, 1, '#FFFFFF');
      px(7, 10, '#FFFFFF'); px(8, 10, '#FFFFFF');
    } else {
      px(7, 10, '#FFD700'); px(8, 10, '#FFD700');
    }
  }

  private drawNameTag(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, color: string) {
    ctx.save();
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    const textW = ctx.measureText(name).width;
    const padX = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x - textW / 2 - padX, y - 8, textW + padX * 2, 14);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - textW / 2 - padX + 0.5, y - 8 + 0.5, textW + padX * 2 - 1, 14 - 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(name, x, y + 2);
    ctx.restore();
  }
}

export function getRoleSpawnPosition(role: RoleType): { x: number; y: number } {
  switch (role) {
    case 'farmer':
      return { x: 140, y: 430 };
    case 'chef':
      return { x: 400, y: 430 };
    case 'merchant':
      return { x: 660, y: 430 };
  }
}

export function drawRolePreview(ctx: CanvasRenderingContext2D, role: RoleType, canvasWidth: number, canvasHeight: number) {
  const scale = Math.floor(canvasWidth / 24);
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2 + 4 * scale;

  const tempRole = new PixelRole('_preview', role, '', 0, 0, false);
  const spriteCanvas = tempRole.getSpriteCanvas(role, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spriteCanvas, cx - 8 * scale, cy - 16 * scale, 16 * scale, 16 * scale);
  ctx.restore();
}
