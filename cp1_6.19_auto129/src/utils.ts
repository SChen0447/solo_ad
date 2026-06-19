import { Rect, Particle, COLORS } from './Types';

export function rectIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(clamp(x, 0, 255)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function interpolateColor(colorA: string, colorB: string, t: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const tt = clamp(t, 0, 1);
  return rgbToHex(
    lerp(a.r, b.r, tt),
    lerp(a.g, b.g, tt),
    lerp(a.b, b.b, tt)
  );
}

export function getMusicColor(frequency: number): string {
  const t = clamp(frequency, 0, 1);
  const cyanPurple = interpolateColor(COLORS.NEON_BLUE, COLORS.NEON_MAGENTA, t);
  const orangeRed = interpolateColor('#ff6633', COLORS.NEON_PINK, t);
  return interpolateColor(cyanPurple, orangeRed, Math.sin(t * Math.PI));
}

export function getBackgroundGradientColors(frequency: number): { top: string; bottom: string } {
  const t = clamp(frequency, 0, 1);
  return {
    top: interpolateColor(COLORS.BG_TOP_START, COLORS.BG_TOP_END, t),
    bottom: interpolateColor(COLORS.BG_BOTTOM_START, COLORS.BG_BOTTOM_END, t)
  };
}

export function updateParticle(p: Particle, dt: number, groundY: number): boolean {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vy += 0.05 * dt;
  if (p.y > groundY - p.size) {
    p.y = groundY - p.size;
    p.vy *= -0.3;
    p.vx *= 0.9;
  }
  p.life -= dt;
  p.alpha = clamp(p.life / p.maxLife, 0, 1);
  p.size *= (1 - 0.002 * dt);
  return p.life > 0 && p.size > 0.5;
}

export function spawnParticle(
  particles: Particle[],
  maxParticles: number,
  x: number,
  y: number,
  color: string,
  spread: number = 3,
  speed: number = 2
): void {
  if (particles.length >= maxParticles) return;
  const angle = Math.random() * Math.PI * 2;
  const spd = speed * (0.3 + Math.random() * 0.7);
  particles.push({
    x,
    y,
    vx: Math.cos(angle) * spd + (Math.random() - 0.5) * spread,
    vy: Math.sin(angle) * spd - Math.random() * speed * 1.5,
    life: 40 + Math.random() * 40,
    maxLife: 80,
    size: 2 + Math.random() * 4,
    color,
    alpha: 1
  });
}

export function spawnBackgroundParticles(
  particles: Particle[],
  maxParticles: number,
  canvasW: number,
  canvasH: number,
  frequency: number
): void {
  if (particles.length >= maxParticles) return;
  if (Math.random() > 0.4) return;
  const fromLeft = Math.random() > 0.5;
  const color = getMusicColor(frequency);
  particles.push({
    x: fromLeft ? -10 : canvasW + 10,
    y: Math.random() * canvasH * 0.9,
    vx: (fromLeft ? 1 : -1) * (0.5 + Math.random() * 1.2),
    vy: (Math.random() - 0.5) * 0.4,
    life: 300 + Math.random() * 200,
    maxLife: 500,
    size: 1.5 + Math.random() * 3,
    color,
    alpha: 0.6
  });
}

export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  const p = 0.3;
  const s = p / 4;
  return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function formatScore(score: number): string {
  return Math.floor(score).toString().padStart(7, '0');
}
