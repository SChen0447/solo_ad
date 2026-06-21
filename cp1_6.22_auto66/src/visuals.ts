// visuals.ts - 纯绘制工具模块
// 被 ui.ts 调用，提供所有绘制函数
// 无外部数据依赖，仅接收绘制参数

export interface KeyButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  pressed: boolean;
}

export interface ReelState {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  speed: number;
}

export function drawWoodTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number = 42
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#3e2723');
  gradient.addColorStop(0.5, '#5d4037');
  gradient.addColorStop(1, '#4e342e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const rand = mulberry32(seed);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#2d1810';
  ctx.lineWidth = 1;

  for (let i = 0; i < 180; i++) {
    const y = rand() * height;
    const x1 = rand() * width;
    const x2 = x1 + (rand() - 0.3) * 120;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y + (rand() - 0.5) * 4);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#6d4c41';
  for (let i = 0; i < 100; i++) {
    const y = rand() * height;
    const x1 = rand() * width;
    const x2 = x1 + (rand() - 0.2) * 60;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.3,
    width / 2, height / 2, Math.max(width, height) * 0.75
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawRecorderBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 8;

  const r = 16;
  roundRect(ctx, x, y, w, h, r);
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
  bodyGrad.addColorStop(0, '#fff8e1');
  bodyGrad.addColorStop(0.4, '#fdf5e6');
  bodyGrad.addColorStop(1, '#f5e6c8');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawHandDrawnBorder(ctx, x, y, w, h, r);
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.06;
  const noiseRand = mulberry32(99);
  for (let i = 0; i < 200; i++) {
    const px = x + noiseRand() * w;
    const py = y + noiseRand() * h;
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(px, py, 1, 1);
  }
  ctx.restore();

  ctx.restore();
}

export function drawMetalButton(
  ctx: CanvasRenderingContext2D,
  btn: KeyButton,
  radius: number = 6
): void {
  ctx.save();

  const offsetY = btn.pressed ? 3 : 0;
  const btnX = btn.x;
  const btnY = btn.y + offsetY;

  if (!btn.pressed) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
  }

  roundRect(ctx, btnX, btnY, btn.width, btn.height, radius);

  const cx = btnX + btn.width / 2;
  const cy = btnY + btn.height / 2;
  const grad = ctx.createRadialGradient(
    cx - btn.width * 0.25, cy - btn.height * 0.25, 2,
    cx, cy, Math.max(btn.width, btn.height) * 0.7
  );

  if (btn.pressed) {
    grad.addColorStop(0, '#4a5568');
    grad.addColorStop(1, '#2d3748');
  } else {
    grad.addColorStop(0, '#cfd8dc');
    grad.addColorStop(0.5, '#b0bec5');
    grad.addColorStop(1, '#607d8b');
  }
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = btn.pressed ? '#1a202c' : '#455a64';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  roundRect(ctx, btnX, btnY, btn.width, btn.height, radius);
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = btn.pressed ? 0.1 : 0.45;
  const highlight = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btn.height * 0.6);
  highlight.addColorStop(0, '#ffffff');
  highlight.addColorStop(1, 'rgba(255,255,255,0)');
  roundRect(ctx, btnX + 2, btnY + 2, btn.width - 4, btn.height * 0.45, radius - 2);
  ctx.fillStyle = highlight;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = btn.pressed ? '#1a202c' : '#263238';
  ctx.font = `bold ${Math.min(btn.width, btn.height) * 0.45}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.label, cx, cy + 1);

  ctx.restore();
}

export function drawTapeReel(
  ctx: CanvasRenderingContext2D,
  reel: ReelState
): void {
  ctx.save();
  ctx.translate(reel.x, reel.y);

  const shadowGrad = ctx.createRadialGradient(2, 4, reel.radius * 0.3, 2, 4, reel.radius * 1.15);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.35)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(2, 4, reel.radius * 1.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(reel.rotation);

  const discGrad = ctx.createRadialGradient(
    -reel.radius * 0.2, -reel.radius * 0.2, reel.radius * 0.1,
    0, 0, reel.radius
  );
  discGrad.addColorStop(0, '#5d4037');
  discGrad.addColorStop(0.6, '#3e2723');
  discGrad.addColorStop(1, '#1b1b1b');

  ctx.beginPath();
  ctx.arc(0, 0, reel.radius, 0, Math.PI * 2);
  ctx.fillStyle = discGrad;
  ctx.fill();

  const stripeCount = Math.max(8, Math.floor(12 + Math.abs(reel.speed) * 6));
  const stripeWidth = Math.max(1.5, 2 + Math.abs(reel.speed));
  ctx.fillStyle = 'rgba(255, 235, 180, 0.18)';
  for (let i = 0; i < stripeCount; i++) {
    const angle = (i / stripeCount) * Math.PI * 2;
    ctx.save();
    ctx.rotate(angle);
    ctx.fillRect(-stripeWidth / 2, -reel.radius * 0.92, stripeWidth, reel.radius * 0.6);
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(120, 80, 40, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, reel.radius * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, reel.radius * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = '#2d1810';
  ctx.beginPath();
  ctx.arc(0, 0, reel.radius * 0.28, 0, Math.PI * 2);
  ctx.fill();

  const hubGrad = ctx.createRadialGradient(
    -reel.radius * 0.06, -reel.radius * 0.06, 1,
    0, 0, reel.radius * 0.2
  );
  hubGrad.addColorStop(0, '#fff176');
  hubGrad.addColorStop(0.5, '#ffd54f');
  hubGrad.addColorStop(1, '#ff8f00');
  ctx.fillStyle = hubGrad;
  ctx.beginPath();
  ctx.arc(0, 0, reel.radius * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, reel.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export function drawTapeBetweenReels(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  rightX: number,
  y: number,
  tapeWidth: number = 6
): void {
  ctx.save();

  const tapeGrad = ctx.createLinearGradient(0, y - tapeWidth / 2, 0, y + tapeWidth / 2);
  tapeGrad.addColorStop(0, '#3d2817');
  tapeGrad.addColorStop(0.5, '#5d4037');
  tapeGrad.addColorStop(1, '#2d1810');

  ctx.fillStyle = tapeGrad;
  ctx.fillRect(leftX, y - tapeWidth / 2, rightX - leftX, tapeWidth);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, y);
  ctx.lineTo(rightX, y);
  ctx.stroke();

  ctx.restore();
}

export function drawIndicatorLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  on: boolean,
  blink: boolean = false
): void {
  ctx.save();

  ctx.fillStyle = '#2d1810';
  ctx.beginPath();
  ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
  ctx.fill();

  const isLit = on && (!blink || Math.floor(Date.now() / 500) % 2 === 0);

  if (isLit) {
    const glowGrad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 3);
    glowGrad.addColorStop(0, color + 'cc');
    glowGrad.addColorStop(1, color + '00');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const lightGrad = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, 1,
    x, y, radius
  );
  if (isLit) {
    lightGrad.addColorStop(0, '#ffffff');
    lightGrad.addColorStop(0.3, color);
    lightGrad.addColorStop(1, darkenColor(color, 0.4));
  } else {
    lightGrad.addColorStop(0, '#555');
    lightGrad.addColorStop(1, '#222');
  }

  ctx.fillStyle = lightGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export function drawWaveformDisplay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  waveform: Uint8Array,
  playPosition: number,
  mode: 'scroll' | 'scan' | 'record' | 'static'
): void {
  ctx.save();

  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = '#fff8e1';
  ctx.fill();

  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 4);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, 4);
  ctx.clip();

  const padX = 6;
  const padY = 6;
  const innerX = x + padX;
  const innerY = y + padY;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  ctx.strokeStyle = 'rgba(78, 52, 46, 0.1)';
  ctx.lineWidth = 1;
  const midY = innerY + innerH / 2;
  ctx.beginPath();
  ctx.moveTo(innerX, midY);
  ctx.lineTo(innerX + innerW, midY);
  ctx.stroke();

  if (waveform.length === 0) {
    ctx.restore();
    ctx.restore();
    return;
  }

  if (mode === 'record') {
    drawRecordWaveform(ctx, innerX, innerY, innerW, innerH, waveform);
  } else if (mode === 'scroll') {
    drawScrollWaveform(ctx, innerX, innerY, innerW, innerH, waveform, playPosition);
  } else if (mode === 'scan') {
    drawScanWaveform(ctx, innerX, innerY, innerW, innerH, waveform, playPosition);
  } else {
    drawStaticWaveform(ctx, innerX, innerY, innerW, innerH, waveform, playPosition);
  }

  ctx.restore();
  ctx.restore();
}

function drawRecordWaveform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  waveform: Uint8Array
): void {
  const samples = Math.min(waveform.length, Math.floor(w));
  if (samples === 0) return;

  const midY = y + h / 2;
  const step = waveform.length / samples;

  ctx.beginPath();
  ctx.strokeStyle = '#ecc94b';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (let i = 0; i < samples; i++) {
    const idx = Math.floor(i * step);
    const val = waveform[idx] ?? 128;
    const amp = ((val - 128) / 128) * (h * 0.45);
    const px = x + (i / samples) * w;
    const py = midY - amp;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.fillStyle = '#ecc94b';
  const dotStep = Math.max(1, Math.floor(samples / 40));
  for (let i = 0; i < samples; i += dotStep) {
    const idx = Math.floor(i * step);
    const val = waveform[idx] ?? 128;
    const amp = ((val - 128) / 128) * (h * 0.45);
    const px = x + (i / samples) * w;
    const py = midY - amp;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawScrollWaveform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  waveform: Uint8Array,
  playPosition: number
): void {
  const barCount = 84;
  const barWidth = w / barCount;
  const midY = y + h / 2;
  const totalSamples = waveform.length;

  for (let i = 0; i < barCount; i++) {
    const progress = i / barCount;
    const sampleIdx = Math.floor((playPosition + progress * 0.6) * totalSamples) % totalSamples;
    const val = waveform[sampleIdx] ?? 128;
    const amp = Math.abs((val - 128) / 128);
    const barH = Math.max(1, amp * h * 0.85);

    const bx = x + i * barWidth;
    const by = midY - barH / 2;

    ctx.fillStyle = i < barCount * 0.4 ? '#ecc94b' : 'rgba(236, 201, 75, 0.55)';
    ctx.fillRect(bx + 0.5, by, Math.max(1, barWidth - 1.5), barH);
  }

  ctx.strokeStyle = '#e53935';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.35, y);
  ctx.lineTo(x + w * 0.35, y + h);
  ctx.stroke();
}

function drawScanWaveform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  waveform: Uint8Array,
  playPosition: number
): void {
  const samples = Math.floor(w * 0.6);
  const midY = y + h / 2;

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(236, 201, 75, 0.65)';
  ctx.lineWidth = 1.2;

  for (let i = 0; i < samples; i++) {
    const t = (Date.now() / 80 + i * 3) % waveform.length;
    const idx = Math.floor(t) % waveform.length;
    const val = waveform[idx] ?? 128;
    const freqMod = Math.sin(i * 0.15 + Date.now() / 100) * 0.4 + 0.6;
    const amp = ((val - 128) / 128) * (h * 0.4) * freqMod;
    const px = x + (i / samples) * w;
    const py = midY - amp;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.fillStyle = 'rgba(236, 201, 75, 0.8)';
  const scanX = x + (Math.sin(Date.now() / 120) * 0.5 + 0.5) * w;
  ctx.fillRect(scanX - 1.5, y, 3, h);
}

function drawStaticWaveform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  waveform: Uint8Array,
  playPosition: number
): void {
  const samples = Math.min(waveform.length, Math.floor(w * 0.8));
  if (samples === 0) return;

  const midY = y + h / 2;
  const step = waveform.length / samples;

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(236, 201, 75, 0.5)';
  ctx.lineWidth = 1;

  for (let i = 0; i < samples; i++) {
    const idx = Math.floor(i * step);
    const val = waveform[idx] ?? 128;
    const amp = ((val - 128) / 128) * (h * 0.4);
    const px = x + (i / samples) * w;
    const py = midY - amp;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  const posX = x + playPosition * w;
  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(posX, y);
  ctx.lineTo(posX, y + h);
  ctx.stroke();
  ctx.setLineDash([]);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawHandDrawnBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const jitter = 0.8;
  const rand = mulberry32(77);

  const points: [number, number][] = [];
  const steps = 100;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let px: number, py: number;

    if (t < 0.25) {
      const lt = t * 4;
      px = x + r + (w - 2 * r) * lt + (rand() - 0.5) * jitter;
      py = y + (rand() - 0.5) * jitter;
      if (lt < 0.05) { px = x + r * (1 - lt / 0.05) + (lt / 0.05) * (x + r); py = y + r * (lt / 0.05); }
    } else if (t < 0.5) {
      const lt = (t - 0.25) * 4;
      px = x + w + (rand() - 0.5) * jitter;
      py = y + r + (h - 2 * r) * lt + (rand() - 0.5) * jitter;
      if (lt < 0.05) { px = x + w - r * (1 - lt / 0.05); py = y + r * (1 - lt / 0.05) + (lt / 0.05) * (y + r); }
    } else if (t < 0.75) {
      const lt = (t - 0.5) * 4;
      px = x + w - r - (w - 2 * r) * lt + (rand() - 0.5) * jitter;
      py = y + h + (rand() - 0.5) * jitter;
      if (lt < 0.05) { px = x + w - r * (1 - lt / 0.05); py = y + h - r * (lt / 0.05); }
    } else {
      const lt = (t - 0.75) * 4;
      px = x + (rand() - 0.5) * jitter;
      py = y + h - r - (h - 2 * r) * lt + (rand() - 0.5) * jitter;
      if (lt < 0.05) { px = x + r * (lt / 0.05); py = y + h - r * (1 - lt / 0.05) + (lt / 0.05) * (y + h - r); }
    }
    points.push([px, py]);
  }

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.max(0, Math.floor(r * (1 - amount)));
  const dg = Math.max(0, Math.floor(g * (1 - amount)));
  const db = Math.max(0, Math.floor(b * (1 - amount)));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}
