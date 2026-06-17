export interface OreType {
  color: string;
  glowColor: string;
  score: number;
  isFuel: boolean;
  name: string;
}

export const ORE_TYPES: OreType[] = [
  { color: '#ffd54f', glowColor: '#fff59d', score: 10, isFuel: true, name: '燃料矿' },
  { color: '#81c784', glowColor: '#c8e6c9', score: 50, isFuel: false, name: '翡翠矿' },
  { color: '#64b5f6', glowColor: '#bbdefb', score: 80, isFuel: false, name: '蓝晶矿' },
  { color: '#ba68c8', glowColor: '#e1bee7', score: 120, isFuel: false, name: '紫晶矿' },
  { color: '#ef5350', glowColor: '#ffcdd2', score: 200, isFuel: false, name: '红钻矿' },
];

export interface Planet {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  ringColor: string;
  ores: Ore[];
  rotation: number;
  rotationSpeed: number;
}

export interface Ore {
  id: number;
  planetId: number;
  angle: number;
  orbitRadius: number;
  type: OreType;
  size: number;
  hp: number;
  maxHp: number;
  collected: boolean;
}

export interface FlyingOre {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  controlX: number;
  controlY: number;
  progress: number;
  type: OreType;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

export interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  vertices: { r: number; angle: number }[];
}

export interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  hp: number;
  maxHp: number;
  shootCooldown: number;
}

export interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

let planetIdCounter = 0;
let oreIdCounter = 0;
let flyingOreIdCounter = 0;

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function createPlanet(width: number, height: number, existingPlanets: Planet[]): Planet {
  const margin = 150;
  let x = 0;
  let y = 0;
  let valid = false;
  let attempts = 0;

  while (!valid && attempts < 50) {
    x = randomRange(margin, width - margin);
    y = randomRange(margin, height - margin);
    valid = true;
    for (const p of existingPlanets) {
      const dx = x - p.x;
      const dy = y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < 220) {
        valid = false;
        break;
      }
    }
    attempts++;
  }

  const hue = Math.floor(randomRange(0, 360));
  const planetColors = [
    { color: `hsl(${hue}, 60%, 45%)`, ring: `hsl(${hue}, 70%, 70%)` },
    { color: `hsl(${(hue + 60) % 360}, 55%, 50%)`, ring: `hsl(${(hue + 60) % 360}, 65%, 72%)` },
  ];
  const colorSet = planetColors[Math.floor(Math.random() * planetColors.length)];

  const radius = randomRange(35, 55);
  const ores: Ore[] = [];
  const oreCount = Math.floor(randomRange(3, 7));

  for (let i = 0; i < oreCount; i++) {
    const isFuel = Math.random() < 0.2;
    let type: OreType;
    if (isFuel) {
      type = ORE_TYPES[0];
    } else {
      const roll = Math.random();
      if (roll < 0.5) type = ORE_TYPES[1];
      else if (roll < 0.8) type = ORE_TYPES[2];
      else if (roll < 0.95) type = ORE_TYPES[3];
      else type = ORE_TYPES[4];
    }

    ores.push({
      id: oreIdCounter++,
      planetId: planetIdCounter,
      angle: randomRange(0, Math.PI * 2),
      orbitRadius: radius + randomRange(25, 40),
      type,
      size: type.isFuel ? 10 : 8 + (ORE_TYPES.indexOf(type) * 0.8),
      hp: type.isFuel ? 2 : 1 + ORE_TYPES.indexOf(type),
      maxHp: type.isFuel ? 2 : 1 + ORE_TYPES.indexOf(type),
      collected: false,
    });
  }

  const planet: Planet = {
    id: planetIdCounter++,
    x,
    y,
    radius,
    color: colorSet.color,
    ringColor: colorSet.ring,
    ores,
    rotation: randomRange(0, Math.PI * 2),
    rotationSpeed: randomRange(-0.2, 0.2),
  };

  return planet;
}

export function createFlyingOre(
  ore: Ore,
  planetX: number,
  planetY: number,
  targetX: number,
  targetY: number
): FlyingOre {
  const startX = planetX + Math.cos(ore.angle) * ore.orbitRadius;
  const startY = planetY + Math.sin(ore.angle) * ore.orbitRadius;
  const midX = (startX + targetX) / 2;
  const midY = (startY + targetY) / 2;
  const dx = targetX - startX;
  const dy = targetY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / dist;
  const ny = dx / dist;
  const arcHeight = Math.min(dist * 0.4, 120);

  return {
    id: flyingOreIdCounter++,
    x: startX,
    y: startY,
    startX,
    startY,
    targetX,
    targetY,
    controlX: midX + nx * arcHeight,
    controlY: midY + ny * arcHeight,
    progress: 0,
    type: ore.type,
    size: ore.size,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: randomRange(-6, 6),
  };
}

export function createAsteroid(width: number, height: number): Asteroid {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  switch (side) {
    case 0: x = randomRange(0, width); y = -40; break;
    case 1: x = width + 40; y = randomRange(0, height); break;
    case 2: x = randomRange(0, width); y = height + 40; break;
    default: x = -40; y = randomRange(0, height);
  }

  const targetX = randomRange(width * 0.2, width * 0.8);
  const targetY = randomRange(height * 0.2, height * 0.8);
  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = randomRange(40, 80);

  const vertexCount = Math.floor(randomRange(7, 11));
  const vertices: { r: number; angle: number }[] = [];
  for (let i = 0; i < vertexCount; i++) {
    vertices.push({
      r: randomRange(0.7, 1.0),
      angle: (Math.PI * 2 * i) / vertexCount + randomRange(-0.15, 0.15),
    });
  }

  return {
    x,
    y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    radius: randomRange(18, 35),
    rotation: randomRange(0, Math.PI * 2),
    rotationSpeed: randomRange(-1.5, 1.5),
    vertices,
  };
}

export function createEnemy(width: number, height: number): Enemy {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  switch (side) {
    case 0: x = randomRange(0, width); y = -50; break;
    case 1: x = width + 50; y = randomRange(0, height); break;
    case 2: x = randomRange(0, width); y = height + 50; break;
    default: x = -50; y = randomRange(0, height);
  }

  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 18,
    angle: 0,
    hp: 3,
    maxHp: 3,
    shootCooldown: randomRange(1.5, 3),
  };
}

export function createEnemyBullet(enemy: Enemy, targetX: number, targetY: number): EnemyBullet {
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = 180;
  return {
    x: enemy.x,
    y: enemy.y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    radius: 5,
  };
}

export function updatePlanets(planets: Planet[], dt: number): void {
  for (const p of planets) {
    p.rotation += p.rotationSpeed * dt;
  }
}

export function updateFlyingOres(ores: FlyingOre[], dt: number): { collected: FlyingOre[] } {
  const collected: FlyingOre[] = [];
  for (let i = ores.length - 1; i >= 0; i--) {
    const o = ores[i];
    o.progress += dt * 2.2;
    o.rotation += o.rotationSpeed * dt;
    if (o.progress >= 1) {
      collected.push(o);
      ores.splice(i, 1);
    } else {
      const t = o.progress;
      const tt = 1 - t;
      o.x = tt * tt * o.startX + 2 * tt * t * o.controlX + t * t * o.targetX;
      o.y = tt * tt * o.startY + 2 * tt * t * o.controlY + t * t * o.targetY;
    }
  }
  return { collected };
}

export function updateAsteroids(asteroids: Asteroid[], width: number, height: number, dt: number): void {
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rotation += a.rotationSpeed * dt;
    if (a.x < -100 || a.x > width + 100 || a.y < -100 || a.y > height + 100) {
      asteroids.splice(i, 1);
    }
  }
}

export function updateEnemies(
  enemies: Enemy[],
  bullets: EnemyBullet[],
  shipX: number,
  shipY: number,
  width: number,
  height: number,
  dt: number
): { newBullets: EnemyBullet[] } {
  const newBullets: EnemyBullet[] = [];
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dx = shipX - e.x;
    const dy = shipY - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    e.angle = Math.atan2(dy, dx);

    let targetDist = 250;
    let moveX = 0;
    let moveY = 0;
    if (dist > targetDist + 30) {
      moveX = (dx / dist);
      moveY = (dy / dist);
    } else if (dist < targetDist - 30) {
      moveX = -(dx / dist);
      moveY = -(dy / dist);
    } else {
      moveX = -dy / dist;
      moveY = dx / dist;
    }

    const speed = 60;
    e.x += moveX * speed * dt;
    e.y += moveY * speed * dt;

    e.x = Math.max(30, Math.min(width - 30, e.x));
    e.y = Math.max(30, Math.min(height - 30, e.y));

    e.shootCooldown -= dt;
    if (e.shootCooldown <= 0 && dist < 400) {
      newBullets.push(createEnemyBullet(e, shipX, shipY));
      e.shootCooldown = randomRange(2, 3.5);
    }

    if (e.hp <= 0) {
      enemies.splice(i, 1);
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < -20 || b.x > width + 20 || b.y < -20 || b.y > height + 20) {
      bullets.splice(i, 1);
    }
  }

  for (const b of newBullets) bullets.push(b);
  return { newBullets };
}

export function renderPlanet(ctx: CanvasRenderingContext2D, p: Planet): void {
  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.shadowBlur = 40;
  ctx.shadowColor = p.color;
  const gradient = ctx.createRadialGradient(0, 0, p.radius * 0.2, 0, 0, p.radius);
  gradient.addColorStop(0, lightenColor(p.color, 30));
  gradient.addColorStop(1, p.color);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = `${p.ringColor}44`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius + 30 + i * 8, (p.radius + 30 + i * 8) * 0.35, p.rotation + i * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = `${darkenColor(p.color, 20)}55`;
  ctx.beginPath();
  ctx.arc(-p.radius * 0.25, -p.radius * 0.2, p.radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(p.radius * 0.2, p.radius * 0.15, p.radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  for (const ore of p.ores) {
    if (ore.collected) continue;
    const ox = p.x + Math.cos(ore.angle + p.rotation) * ore.orbitRadius;
    const oy = p.y + Math.sin(ore.angle + p.rotation) * ore.orbitRadius;
    renderOre(ctx, ox, oy, ore);
  }
}

function renderOre(ctx: CanvasRenderingContext2D, x: number, y: number, ore: Ore): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Date.now() * 0.001 + ore.id);

  ctx.shadowBlur = 18;
  ctx.shadowColor = ore.type.glowColor;
  ctx.fillStyle = ore.type.color;

  const sides = ore.type.isFuel ? 6 : 4 + ORE_TYPES.indexOf(ore.type);
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides;
    const r = ore.size * (i % 2 === 0 ? 1 : 0.8);
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  if (ore.hp < ore.maxHp) {
    const pct = ore.hp / ore.maxHp;
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, ore.size + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.stroke();
  }

  if (ore.type.isFuel) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#fff';
    ctx.font = `${ore.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.rotate(-(Date.now() * 0.001 + ore.id));
    ctx.fillText('⛽', 0, 1);
  }

  ctx.restore();
}

export function renderFlyingOre(ctx: CanvasRenderingContext2D, o: FlyingOre): void {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation);

  ctx.shadowBlur = 25;
  ctx.shadowColor = o.type.glowColor;
  ctx.fillStyle = o.type.color;
  ctx.globalAlpha = 0.9;

  const sides = o.type.isFuel ? 6 : 4 + ORE_TYPES.indexOf(o.type);
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides;
    const r = o.size * (i % 2 === 0 ? 1 : 0.8);
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(0, 0, o.size * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = o.type.glowColor;
  ctx.globalAlpha = 0.4;
  ctx.fill();

  ctx.restore();
}

export function renderAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid): void {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rotation);

  ctx.fillStyle = '#5d4037';
  ctx.strokeStyle = '#8d6e63';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#3e2723';

  ctx.beginPath();
  for (let i = 0; i < a.vertices.length; i++) {
    const v = a.vertices[i];
    const px = Math.cos(v.angle) * a.radius * v.r;
    const py = Math.sin(v.angle) * a.radius * v.r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.arc(-a.radius * 0.2, -a.radius * 0.1, a.radius * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(a.radius * 0.25, a.radius * 0.2, a.radius * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function renderEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);

  ctx.shadowBlur = 15;
  ctx.shadowColor = '#ef5350';
  ctx.fillStyle = '#c62828';
  ctx.strokeStyle = '#ff8a80';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(e.radius, 0);
  ctx.lineTo(-e.radius * 0.8, -e.radius * 0.9);
  ctx.lineTo(-e.radius * 0.4, 0);
  ctx.lineTo(-e.radius * 0.8, e.radius * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffcdd2';
  ctx.beginPath();
  ctx.arc(0, 0, e.radius * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (e.hp < e.maxHp) {
    const barW = 40;
    const barH = 5;
    const x = e.x - barW / 2;
    const y = e.y - e.radius - 15;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#ef5350';
    ctx.fillRect(x, y, barW * (e.hp / e.maxHp), barH);
  }
}

export function renderEnemyBullet(ctx: CanvasRenderingContext2D, b: EnemyBullet): void {
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ff5252';
  ctx.fillStyle = '#ff1744';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8a80';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function lightenColor(color: string, amount: number): string {
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      return `hsl(${match[1]}, ${match[2]}%, ${Math.min(100, parseInt(match[3]) + amount)}%)`;
    }
  }
  if (color.startsWith('#')) {
    const { h, s, l } = hexToHsl(color);
    return `hsl(${h}, ${s}%, ${Math.min(100, l + amount)}%)`;
  }
  return color;
}

function darkenColor(color: string, amount: number): string {
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      return `hsl(${match[1]}, ${match[2]}%, ${Math.max(0, parseInt(match[3]) - amount)}%)`;
    }
  }
  if (color.startsWith('#')) {
    const { h, s, l } = hexToHsl(color);
    return `hsl(${h}, ${s}%, ${Math.max(0, l - amount)}%)`;
  }
  return color;
}
