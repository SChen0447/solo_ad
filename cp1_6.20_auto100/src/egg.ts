import { spawnFireParticles, spawnIceParticles } from './particles.js';

export const EGG_LONG_AXIS = 100;
export const EGG_SHORT_AXIS = 80;

const COLOR_COLD = [74, 144, 217];
const COLOR_WARM = [230, 126, 34];

interface Crack {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  branches: { x: number; y: number; angle: number; length: number; width: number }[];
}

export interface EggState {
  temperature: number;
  humidity: number;
  targetTemperature: number;
  targetHumidity: number;
  displayColor: [number, number, number];
  targetColor: [number, number, number];
  cracks: Crack[];
  crackDensity: number;
  targetCrackDensity: number;
}

export function createEggState(initialTemp: number = 35, initialHum: number = 60): EggState {
  const color = tempToColor(initialTemp);
  return {
    temperature: initialTemp,
    humidity: initialHum,
    targetTemperature: initialTemp,
    targetHumidity: initialHum,
    displayColor: [...color] as [number, number, number],
    targetColor: [...color] as [number, number, number],
    cracks: generateCracks(25, 0.6),
    crackDensity: 0.6,
    targetCrackDensity: 0.6
  };
}

export function updateEggParams(state: EggState, dt: number): void {
  const easeSpeed = 1 / 0.2;
  const lerpFactor = 1 - Math.exp(-easeSpeed * dt);

  state.temperature += (state.targetTemperature - state.temperature) * lerpFactor;
  state.humidity += (state.targetHumidity - state.humidity) * lerpFactor;

  const targetColor = tempToColor(state.temperature);
  for (let i = 0; i < 3; i++) {
    state.displayColor[i] += (targetColor[i] - state.displayColor[i]) * lerpFactor;
  }

  state.targetCrackDensity = calcCrackDensity(state.temperature, state.humidity);
  const prevDensity = state.crackDensity;
  state.crackDensity += (state.targetCrackDensity - state.crackDensity) * lerpFactor;

  if (Math.abs(state.crackDensity - prevDensity) > 0.02) {
    const desiredCount = Math.floor(20 + state.crackDensity * 40);
    if (state.cracks.length < desiredCount) {
      const toAdd = desiredCount - state.cracks.length;
      for (let i = 0; i < toAdd; i++) {
        state.cracks.push(generateSingleCrack(state.crackDensity));
      }
    }
  }
}

export function drawEgg(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: EggState,
  time: number
): void {
  const rx = EGG_LONG_AXIS / 2;
  const ry = EGG_SHORT_AXIS / 2;

  const warmIntensity = clamp((state.temperature - 35) / 5, 0, 1);
  const coldIntensity = clamp((35 - state.temperature) / 5, 0, 1);

  if (warmIntensity > 0.05) {
    spawnFireParticles(cx, cy + ry + 15, warmIntensity * 0.4);
  }
  if (coldIntensity > 0.05) {
    spawnIceParticles(cx, cy - ry - 10, coldIntensity * 0.4);
  }

  ctx.save();

  drawShellShadow(ctx, cx, cy, rx, ry);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  drawShellGradient(ctx, cx, cy, rx, ry, state.displayColor);

  const shineAlpha = 0.15 + warmIntensity * 0.15;
  drawShellShine(ctx, cx, cy, rx, ry, shineAlpha);

  const humidityEffect = clamp((state.humidity - 60) / 20, -0.3, 0.3);
  const crackAlpha = clamp(0.4 + state.crackDensity * 0.3 + humidityEffect * 0.2, 0.3, 0.75);
  drawCracks(ctx, state.cracks, cx, cy, crackAlpha, state.crackDensity);

  drawShellHighlight(ctx, cx, cy, rx, ry);

  ctx.restore();
  ctx.restore();
}

function drawShellShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + 6, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.filter = 'blur(8px)';
  ctx.fill();
  ctx.restore();
}

function drawShellGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: [number, number, number]
): void {
  const c1 = rgbString(color, 1);
  const c2 = rgbString(
    [Math.max(0, color[0] - 40), Math.max(0, color[1] - 40), Math.max(0, color[2] - 40)],
    1
  );
  const c3 = rgbString(
    [Math.min(255, color[0] + 30), Math.min(255, color[1] + 30), Math.min(255, color[2] + 30)],
    1
  );

  const grad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  grad.addColorStop(0, c3);
  grad.addColorStop(0.4, c1);
  grad.addColorStop(1, c2);

  ctx.fillStyle = grad;
  ctx.fillRect(cx - rx - 5, cy - ry - 5, rx * 2 + 10, ry * 2 + 10);

  const radial = ctx.createRadialGradient(
    cx - rx * 0.3,
    cy - ry * 0.5,
    0,
    cx,
    cy,
    rx * 1.2
  );
  radial.addColorStop(0, 'rgba(255,255,255,0.15)');
  radial.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = radial;
  ctx.fillRect(cx - rx - 5, cy - ry - 5, rx * 2 + 10, ry * 2 + 10);
}

function drawShellShine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha: number
): void {
  const shine = ctx.createRadialGradient(
    cx - rx * 0.35,
    cy - ry * 0.45,
    0,
    cx - rx * 0.35,
    cy - ry * 0.45,
    rx * 0.6
  );
  shine.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = shine;
  ctx.fillRect(cx - rx - 5, cy - ry - 5, rx * 2 + 10, ry * 2 + 10);
}

function drawShellHighlight(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 0.5, ry - 0.5, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawCracks(
  ctx: CanvasRenderingContext2D,
  cracks: Crack[],
  cx: number,
  cy: number,
  alpha: number,
  density: number
): void {
  if (cracks.length === 0) return;
  ctx.save();
  ctx.strokeStyle = `rgba(58, 42, 26, ${alpha})`;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const visibleCount = Math.ceil(cracks.length * clamp(0.4 + density * 0.8, 0.5, 1));

  for (let i = 0; i < visibleCount && i < cracks.length; i++) {
    const crack = cracks[i];
    const x = cx + crack.x;
    const y = cy + crack.y;
    const ex = x + Math.cos(crack.angle) * crack.length;
    const ey = y + Math.sin(crack.angle) * crack.length;

    ctx.lineWidth = crack.width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    for (const b of crack.branches) {
      const bx = x + Math.cos(crack.angle) * crack.length * b.x + Math.cos(crack.angle + Math.PI / 2) * crack.length * b.y;
      const by = y + Math.sin(crack.angle) * crack.length * b.x + Math.sin(crack.angle + Math.PI / 2) * crack.length * b.y;
      const bex = bx + Math.cos(b.angle) * b.length;
      const bey = by + Math.sin(b.angle) * b.length;

      ctx.lineWidth = b.width;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bex, bey);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function generateCracks(count: number, density: number): Crack[] {
  const cracks: Crack[] = [];
  for (let i = 0; i < count; i++) {
    cracks.push(generateSingleCrack(density));
  }
  return cracks;
}

function generateSingleCrack(density: number): Crack {
  const phi = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * 0.85;
  const x = Math.cos(phi) * r * (EGG_LONG_AXIS / 2 - 4);
  const y = Math.sin(phi) * r * (EGG_SHORT_AXIS / 2 - 4);

  const angle = Math.random() * Math.PI * 2;
  const length = 8 + Math.random() * 22 * (0.6 + density * 0.6);
  const width = 0.5 + Math.random() * 1.5;

  const branchCount = Math.floor(Math.random() * 3);
  const branches: Crack['branches'] = [];
  for (let i = 0; i < branchCount; i++) {
    branches.push({
      x: 0.2 + Math.random() * 0.6,
      y: 0,
      angle: angle + (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.9),
      length: length * (0.2 + Math.random() * 0.4),
      width: Math.max(0.3, width * (0.4 + Math.random() * 0.4))
    });
  }

  return { x, y, angle, length, width, branches };
}

function calcCrackDensity(temp: number, hum: number): number {
  const tempFactor = clamp(Math.abs(temp - 35) / 5, 0, 1);
  const humFactor = clamp(Math.abs(hum - 60) / 20, 0, 1);
  return clamp(0.3 + tempFactor * 0.7 + humFactor * 0.3, 0.2, 1);
}

function tempToColor(temp: number): [number, number, number] {
  const t = clamp((temp - 30) / 10, 0, 1);
  const r = COLOR_COLD[0] + (COLOR_WARM[0] - COLOR_COLD[0]) * t;
  const g = COLOR_COLD[1] + (COLOR_WARM[1] - COLOR_COLD[1]) * t;
  const b = COLOR_COLD[2] + (COLOR_WARM[2] - COLOR_COLD[2]) * t;
  return [r, g, b];
}

function rgbString(c: [number, number, number], a: number = 1): string {
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
