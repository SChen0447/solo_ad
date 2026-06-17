export type MineralType = 'red' | 'blue' | 'gold';

export interface FxParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  type: 'particle' | 'star';
}

export interface RippleFx {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Mineral {
  x: number;
  y: number;
  type: MineralType;
  score: number;
  glowPhase: number;
  alive: boolean;
  collectAnim: number;
  fxParticles: FxParticle[];
  ripples: RippleFx[];
}

const MINERAL_CONFIG: Record<MineralType, { score: number; r: number; g: number; b: number; glowColor: string }> = {
  red: { score: 10, r: 255, g: 68, b: 102, glowColor: 'rgba(255,68,102,0.3)' },
  blue: { score: 15, r: 68, g: 170, b: 255, glowColor: 'rgba(68,170,255,0.3)' },
  gold: { score: 25, r: 255, g: 204, b: 0, glowColor: 'rgba(255,204,0,0.3)' },
};

export function createMineral(canvasW: number, canvasH: number, existingMinerals: Mineral[]): Mineral {
  const typeRoll = Math.random();
  const type: MineralType = typeRoll < 0.45 ? 'red' : typeRoll < 0.78 ? 'blue' : 'gold';
  const cfg = MINERAL_CONFIG[type];

  let x: number;
  let y: number;
  let attempts = 0;
  do {
    x = 40 + Math.random() * (canvasW - 80);
    y = 40 + Math.random() * (canvasH - 80);
    attempts++;
  } while (attempts < 20 && existingMinerals.some(m => {
    const ddx = m.x - x;
    const ddy = m.y - y;
    return Math.sqrt(ddx * ddx + ddy * ddy) < 50;
  }));

  return {
    x,
    y,
    type,
    score: cfg.score,
    glowPhase: Math.random() * Math.PI * 2,
    alive: true,
    collectAnim: 0,
    fxParticles: [],
    ripples: [],
  };
}

export function generateMinerals(count: number, canvasW: number, canvasH: number): Mineral[] {
  const minerals: Mineral[] = [];
  for (let i = 0; i < count; i++) {
    minerals.push(createMineral(canvasW, canvasH, minerals));
  }
  return minerals;
}

export function updateMineral(mineral: Mineral, dt: number): void {
  mineral.glowPhase += dt * 2;

  if (!mineral.alive) {
    mineral.collectAnim += dt;

    for (let i = mineral.fxParticles.length - 1; i >= 0; i--) {
      const p = mineral.fxParticles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt;
      p.rotation += p.rotSpeed * dt;
      if (p.life <= 0) mineral.fxParticles.splice(i, 1);
    }

    for (let i = mineral.ripples.length - 1; i >= 0; i--) {
      const rp = mineral.ripples[i];
      rp.life -= dt;
      rp.radius += dt * 80;
      rp.alpha = Math.max(0, rp.life / rp.maxLife);
      if (rp.life <= 0) mineral.ripples.splice(i, 1);
    }
  }
}

export function collectMineral(mineral: Mineral): number {
  if (!mineral.alive) return 0;
  mineral.alive = false;
  mineral.collectAnim = 0;
  const cfg = MINERAL_CONFIG[mineral.type];

  if (mineral.type === 'red') {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.3;
      const spd = 2 + Math.random() * 2;
      mineral.fxParticles.push({
        x: mineral.x,
        y: mineral.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.8,
        maxLife: 0.8,
        r: cfg.r,
        g: cfg.g,
        b: cfg.b,
        size: 3,
        rotation: 0,
        rotSpeed: 0,
        type: 'particle',
      });
    }
  } else if (mineral.type === 'blue') {
    mineral.ripples.push({
      x: mineral.x,
      y: mineral.y,
      radius: 5,
      maxRadius: 40,
      alpha: 1,
      life: 0.8,
      maxLife: 0.8,
    });
    mineral.ripples.push({
      x: mineral.x,
      y: mineral.y,
      radius: 2,
      maxRadius: 25,
      alpha: 0.7,
      life: 0.6,
      maxLife: 0.6,
    });
  } else if (mineral.type === 'gold') {
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.5;
      const spd = 3 + Math.random() * 2;
      mineral.fxParticles.push({
        x: mineral.x,
        y: mineral.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1.0,
        maxLife: 1.0,
        r: 255,
        g: 220,
        b: 50,
        size: 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: 4 + Math.random() * 4,
        type: 'star',
      });
    }
  }

  return mineral.score;
}

export function drawMineral(ctx: CanvasRenderingContext2D, mineral: Mineral): void {
  if (mineral.alive) {
    drawAliveMineral(ctx, mineral);
  } else {
    drawDeadMineralFx(ctx, mineral);
  }
}

function drawAliveMineral(ctx: CanvasRenderingContext2D, mineral: Mineral): void {
  const cfg = MINERAL_CONFIG[mineral.type];
  const glowIntensity = 0.3 + Math.sin(mineral.glowPhase) * 0.15;

  ctx.save();
  ctx.translate(mineral.x, mineral.y);

  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fillStyle = cfg.glowColor.replace('0.3', String(glowIntensity));
  ctx.shadowColor = `rgba(${cfg.r},${cfg.g},${cfg.b},${glowIntensity})`;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  if (mineral.type === 'red') {
    drawCrystal(ctx, cfg);
  } else if (mineral.type === 'blue') {
    drawIceCrystal(ctx, cfg);
  } else {
    drawGoldNugget(ctx, cfg);
  }

  ctx.restore();
}

function drawCrystal(ctx: CanvasRenderingContext2D, cfg: { r: number; g: number; b: number }): void {
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(6, -3);
  ctx.lineTo(6, 4);
  ctx.lineTo(0, 10);
  ctx.lineTo(-6, 4);
  ctx.lineTo(-6, -3);
  ctx.closePath();
  ctx.fillStyle = `rgba(${cfg.r},${cfg.g},${cfg.b},0.7)`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${cfg.r},${cfg.g},${cfg.b},1)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-2, -7);
  ctx.lineTo(2, -7);
  ctx.lineTo(1, 0);
  ctx.lineTo(-1, 0);
  ctx.closePath();
  ctx.fillStyle = `rgba(255,255,255,0.3)`;
  ctx.fill();
}

function drawIceCrystal(ctx: CanvasRenderingContext2D, cfg: { r: number; g: number; b: number }): void {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
    ctx.strokeStyle = `rgba(${cfg.r},${cfg.g},${cfg.b},0.9)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    const branchAngle1 = a + 0.5;
    const branchAngle2 = a - 0.5;
    const bx = Math.cos(a) * 6;
    const by = Math.sin(a) * 6;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(branchAngle1) * 3, by + Math.sin(branchAngle1) * 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(branchAngle2) * 3, by + Math.sin(branchAngle2) * 3);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${cfg.r},${cfg.g},${cfg.b},0.8)`;
  ctx.fill();
}

function drawGoldNugget(ctx: CanvasRenderingContext2D, cfg: { r: number; g: number; b: number }): void {
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(8, -3);
  ctx.lineTo(6, 6);
  ctx.lineTo(-4, 7);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fillStyle = `rgba(${cfg.r},${cfg.g},${cfg.b},0.75)`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${cfg.r},${cfg.g},${cfg.b},1)`;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.lineTo(1, -5);
  ctx.lineTo(3, -1);
  ctx.lineTo(-1, 1);
  ctx.closePath();
  ctx.fillStyle = `rgba(255,255,200,0.4)`;
  ctx.fill();
}

function drawDeadMineralFx(ctx: CanvasRenderingContext2D, mineral: Mineral): void {
  for (const rp of mineral.ripples) {
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
    const cfg = MINERAL_CONFIG[mineral.type];
    ctx.strokeStyle = `rgba(${cfg.r},${cfg.g},${cfg.b},${rp.alpha * 0.6})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const p of mineral.fxParticles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.type === 'star') {
      drawStar(ctx, 0, 0, p.size, p.size * 0.4, 5, `rgba(${p.r},${p.g},${p.b},${alpha})`);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number, color: string): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function isMineralAnimDone(mineral: Mineral): boolean {
  return !mineral.alive && mineral.fxParticles.length === 0 && mineral.ripples.length === 0;
}
