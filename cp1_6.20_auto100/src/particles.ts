export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity?: number;
  type?: 'fire' | 'ice' | 'splash' | 'sparkle';
}

const MAX_PARTICLES = 100;
let particles: Particle[] = [];

export function spawnParticles(
  x: number,
  y: number,
  count: number = 6,
  options: Partial<Particle> = {}
): void {
  const colors = options.color
    ? [options.color]
    : ['#f4d03f', '#e74c3c', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#f1c40f'];

  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed + (options.vx ?? 0),
      vy: Math.sin(angle) * speed + (options.vy ?? 0),
      life: 1,
      maxLife: 0.5 + Math.random() * 0.3,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: options.gravity ?? 0.08,
      type: options.type ?? 'splash',
      ...options
    });
  }
}

export function spawnFireParticles(x: number, y: number, intensity: number): void {
  if (intensity <= 0) return;
  const count = Math.ceil(intensity * 3);
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    const spread = 25;
    particles.push({
      x: x + (Math.random() - 0.5) * spread,
      y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.8 - Math.random() * 1.6,
      life: 1,
      maxLife: 0.4 + Math.random() * 0.4,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.5 ? '#ff7043' : (Math.random() > 0.5 ? '#f4d03f' : '#e67e22'),
      gravity: -0.02,
      type: 'fire'
    });
  }
}

export function spawnIceParticles(x: number, y: number, intensity: number): void {
  if (intensity <= 0) return;
  const count = Math.ceil(intensity * 3);
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    const spread = 30;
    particles.push({
      x: x + (Math.random() - 0.5) * spread,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.2 + Math.random() * 0.8,
      life: 1,
      maxLife: 0.5 + Math.random() * 0.5,
      size: 2 + Math.random() * 2.5,
      color: Math.random() > 0.5 ? '#4a90d9' : (Math.random() > 0.5 ? '#85c1e9' : '#d6eaf8'),
      gravity: 0.03,
      type: 'ice'
    });
  }
}

export function updateParticles(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += (p.gravity ?? 0);
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt / (p.maxLife || 0.6);
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.color;

    if (p.type === 'ice') {
      drawCrystal(ctx, p.x, p.y, p.size);
    } else if (p.type === 'fire') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + 0.4 * p.life), 0, Math.PI * 2);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * p.life), 0, Math.PI * 2);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  const s = size;
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.7, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s * 0.7, y);
  ctx.closePath();
  ctx.shadowColor = '#4a90d9';
  ctx.shadowBlur = 6;
  ctx.fill();
}

export function clearParticles(): void {
  particles = [];
}

export function getParticleCount(): number {
  return particles.length;
}
