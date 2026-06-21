export interface LightSource {
  x: number;
  y: number;
  angle: number;
  spread: number;
  range: number;
  animTime: number;
  spawnAnim: number;
}

export interface ShadowBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  spawnAnim: number;
}

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  illuminated: boolean;
  broken: boolean;
  breakTimer: number;
  spawnAnim: number;
}

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Exit {
  x: number;
  y: number;
  width: number;
  height: number;
  animTime: number;
}

export interface ShadowRegion {
  points: { x: number; y: number }[];
}

export interface BrickFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotSpeed: number;
}

export interface LevelData {
  lightSources: Omit<LightSource, 'animTime' | 'spawnAnim'>[];
  shadowBlocks: Omit<ShadowBlock, 'vx' | 'vy' | 'spawnAnim'>[];
  bricks: Omit<Brick, 'illuminated' | 'broken' | 'breakTimer' | 'spawnAnim'>[];
  walls: Wall[];
  exits: Omit<Exit, 'animTime'>[];
}

export function createLightSource(x: number, y: number, angle: number, spread: number, range: number): LightSource {
  return { x, y, angle, spread, range, animTime: 0, spawnAnim: 0.2 };
}

export function createShadowBlock(x: number, y: number, width: number, height: number): ShadowBlock {
  return { x, y, width, height, vx: 0, vy: 0, spawnAnim: 0.2 };
}

export function createBrick(x: number, y: number, width: number, height: number): Brick {
  return { x, y, width, height, illuminated: false, broken: false, breakTimer: 0, spawnAnim: 0.2 };
}

export function createWall(x: number, y: number, width: number, height: number): Wall {
  return { x, y, width, height };
}

export function createExit(x: number, y: number, width: number, height: number): Exit {
  return { x, y, width, height, animTime: 0 };
}

export function updateLightSources(sources: LightSource[], dt: number): void {
  for (const s of sources) {
    s.animTime += dt;
    if (s.spawnAnim > 0) {
      s.spawnAnim = Math.max(0, s.spawnAnim - dt);
    }
  }
}

export function updateShadowBlocks(blocks: ShadowBlock[], _walls: Wall[], dt: number): void {
  for (const b of blocks) {
    if (b.spawnAnim > 0) {
      b.spawnAnim = Math.max(0, b.spawnAnim - dt);
    }
  }
}

export function updateBricks(bricks: Brick[], dt: number): void {
  for (const b of bricks) {
    if (b.spawnAnim > 0) {
      b.spawnAnim = Math.max(0, b.spawnAnim - dt);
    }
    if (b.broken && b.breakTimer > 0) {
      b.breakTimer -= dt;
    }
  }
}

function rayRectIntersect(
  ox: number, oy: number, dx: number, dy: number,
  rx: number, ry: number, rw: number, rh: number
): number | null {
  let tmin = -Infinity;
  let tmax = Infinity;

  if (dx !== 0) {
    const tx1 = (rx - ox) / dx;
    const tx2 = (rx + rw - ox) / dx;
    tmin = Math.max(tmin, Math.min(tx1, tx2));
    tmax = Math.min(tmax, Math.max(tx1, tx2));
  } else if (ox < rx || ox > rx + rw) {
    return null;
  }

  if (dy !== 0) {
    const ty1 = (ry - oy) / dy;
    const ty2 = (ry + rh - oy) / dy;
    tmin = Math.max(tmin, Math.min(ty1, ty2));
    tmax = Math.min(tmax, Math.max(ty1, ty2));
  } else if (oy < ry || oy > ry + rh) {
    return null;
  }

  if (tmax < tmin || tmax < 0) return null;
  return tmin > 0 ? tmin : tmax;
}

function getClosestOccluderAlongRay(
  ox: number, oy: number, dx: number, dy: number, maxDist: number,
  blocks: ShadowBlock[]
): { dist: number; block: ShadowBlock } | null {
  let closest: { dist: number; block: ShadowBlock } | null = null;

  for (const b of blocks) {
    const t = rayRectIntersect(ox, oy, dx, dy, b.x, b.y, b.width, b.height);
    if (t !== null && t > 0 && t <= maxDist) {
      if (closest === null || t < closest.dist) {
        closest = { dist: t, block: b };
      }
    }
  }
  return closest;
}

export function isRectInLightBeam(
  rx: number, ry: number, rw: number, rh: number,
  sources: LightSource[], blocks: ShadowBlock[]
): boolean {
  const samplePoints = [
    { x: rx + rw * 0.2, y: ry + rh * 0.2 },
    { x: rx + rw * 0.8, y: ry + rh * 0.2 },
    { x: rx + rw * 0.5, y: ry + rh * 0.5 },
    { x: rx + rw * 0.2, y: ry + rh * 0.8 },
    { x: rx + rw * 0.8, y: ry + rh * 0.8 },
  ];

  for (const src of sources) {
    for (const pt of samplePoints) {
      const dx = pt.x - src.x;
      const dy = pt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > src.range) continue;
      if (dist === 0) continue;

      const ndx = dx / dist;
      const ndy = dy / dist;
      const rayAngle = Math.atan2(ndy, ndx);
      let angleDiff = rayAngle - src.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= src.spread / 2) {
        const occ = getClosestOccluderAlongRay(src.x, src.y, ndx, ndy, dist, blocks);
        if (occ === null || occ.dist >= dist - 2) {
          return true;
        }
      }
    }
  }
  return false;
}

export function isPointInShadow(
  x: number, y: number,
  sources: LightSource[], blocks: ShadowBlock[]
): boolean {
  const regions = computeShadowRegions(sources, blocks);
  for (const r of regions) {
    if (pointInPolygon(x, y, r.points)) return true;
  }
  return false;
}

function pointInPolygon(x: number, y: number, pts: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getBlockCorners(b: ShadowBlock): { x: number; y: number }[] {
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.width, y: b.y },
    { x: b.x + b.width, y: b.y + b.height },
    { x: b.x, y: b.y + b.height },
  ];
}

export function computeShadowRegions(
  sources: LightSource[], blocks: ShadowBlock[]
): ShadowRegion[] {
  const regions: ShadowRegion[] = [];

  for (const src of sources) {
    for (const b of blocks) {
      const corners = getBlockCorners(b);
      const centerX = b.x + b.width / 2;
      const centerY = b.y + b.height / 2;
      const toBlockAngle = Math.atan2(centerY - src.y, centerX - src.x);
      const blockDist = Math.sqrt((centerX - src.x) ** 2 + (centerY - src.y) ** 2);

      let relAngle = toBlockAngle - src.angle;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;
      if (Math.abs(relAngle) > src.spread / 2 + 0.5) continue;
      if (blockDist > src.range + Math.max(b.width, b.height)) continue;

      let minIdx = -1;
      let maxIdx = -1;
      let minAngle = Infinity;
      let maxAngle = -Infinity;
      const cornerAngles: number[] = [];

      for (let i = 0; i < 4; i++) {
        const c = corners[i];
        const ang = Math.atan2(c.y - src.y, c.x - src.x);
        cornerAngles.push(ang);

        let rel = ang - src.angle;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;

        if (Math.abs(rel) <= src.spread / 2 + 0.4) {
          if (rel < minAngle) { minAngle = rel; minIdx = i; }
          if (rel > maxAngle) { maxAngle = rel; maxIdx = i; }
        }
      }

      if (minIdx === -1 || maxIdx === -1) continue;

      let c1 = corners[minIdx];
      let c2 = corners[maxIdx];

      {
        const ang1 = cornerAngles[minIdx];
        const ang2 = cornerAngles[maxIdx];
        let angDiff = ang2 - ang1;
        while (angDiff > Math.PI) angDiff -= Math.PI * 2;
        while (angDiff < -Math.PI) angDiff += Math.PI * 2;

        if (angDiff < 0) {
          const tmp = c1;
          c1 = c2;
          c2 = tmp;
        }
      }

      const d1x = c1.x - src.x;
      const d1y = c1.y - src.y;
      const d1 = Math.sqrt(d1x * d1x + d1y * d1y) || 0.001;
      const d2x = c2.x - src.x;
      const d2y = c2.y - src.y;
      const d2 = Math.sqrt(d2x * d2x + d2y * d2y) || 0.001;

      const maxShadowLen = src.range * 1.2;
      const blockSize = Math.max(b.width, b.height);
      const scaleFactor = Math.min(maxShadowLen / Math.max(d1, d2, 1), 3);
      const projLen = Math.max(blockSize * 1.5, scaleFactor * 100);

      const ext1 = {
        x: c1.x + (d1x / d1) * projLen,
        y: c1.y + (d1y / d1) * projLen
      };
      const ext2 = {
        x: c2.x + (d2x / d2) * projLen,
        y: c2.y + (d2y / d2) * projLen
      };

      const midPoints: { x: number; y: number }[] = [];
      const subCount = 3;
      for (let i = 1; i <= subCount; i++) {
        const t = i / (subCount + 1);
        const px = c1.x + (c2.x - c1.x) * t;
        const py = c1.y + (c2.y - c1.y) * t;
        const pdx = px - src.x;
        const pdy = py - src.y;
        const pd = Math.sqrt(pdx * pdx + pdy * pdy) || 0.001;
        midPoints.push({
          x: px + (pdx / pd) * projLen * (0.85 + t * 0.15),
          y: py + (pdy / pd) * projLen * (0.85 + t * 0.15)
        });
      }

      const points: { x: number; y: number }[] = [c1, c2, ext2, ...midPoints.reverse(), ext1];
      regions.push({ points });
    }
  }
  return regions;
}

export function renderLightSources(
  ctx: CanvasRenderingContext2D, sources: LightSource[], blocks: ShadowBlock[]
): void {
  for (const src of sources) {
    renderLightBeam(ctx, src, blocks);
  }

  for (const src of sources) {
    const pulse = 1 + Math.sin(src.animTime * 4) * 0.1;
    const radius = 14 * pulse;

    const glow = ctx.createRadialGradient(src.x, src.y, 2, src.x, src.y, radius * 3);
    glow.addColorStop(0, 'rgba(255, 240, 150, 0.9)');
    glow.addColorStop(0.3, 'rgba(255, 215, 0, 0.5)');
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(src.x, src.y, radius * 3, 0, Math.PI * 2);
    ctx.fill();

    const coreGrad = ctx.createRadialGradient(
      src.x - radius * 0.3, src.y - radius * 0.3, 0,
      src.x, src.y, radius
    );
    coreGrad.addColorStop(0, '#FFFFFF');
    coreGrad.addColorStop(0.5, '#FFEB80');
    coreGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(src.x, src.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(src.x, src.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function renderLightBeam(
  ctx: CanvasRenderingContext2D, src: LightSource, blocks: ShadowBlock[]
): void {
  const numRays = 60;
  const points: { x: number; y: number; dist: number }[] = [];

  for (let i = 0; i <= numRays; i++) {
    const t = i / numRays;
    const rayAngle = src.angle - src.spread / 2 + src.spread * t;
    const dx = Math.cos(rayAngle);
    const dy = Math.sin(rayAngle);

    const occ = getClosestOccluderAlongRay(src.x, src.y, dx, dy, src.range, blocks);
    const dist = occ ? Math.min(occ.dist, src.range) : src.range;

    points.push({
      x: src.x + dx * dist,
      y: src.y + dy * dist,
      dist
    });
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  for (const p of points) {
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();

  const beamGrad = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, src.range);
  beamGrad.addColorStop(0, 'rgba(255, 240, 150, 0.35)');
  beamGrad.addColorStop(0.4, 'rgba(255, 215, 0, 0.2)');
  beamGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = beamGrad;
  ctx.fill();

  ctx.clip();

  const flowLineCount = 16;
  const flowSpeed = 140;
  for (let i = 0; i < flowLineCount; i++) {
    const rayT = i / (flowLineCount - 1);
    const rayAng = src.angle - src.spread / 2 + src.spread * rayT;
    
    const rayDx = Math.cos(rayAng);
    const rayDy = Math.sin(rayAng);
    const rayOcc = getClosestOccluderAlongRay(src.x, src.y, rayDx, rayDy, src.range, blocks);
    const rayMaxDist = rayOcc ? Math.min(rayOcc.dist, src.range) : src.range;

    const lineLen = 50 + (i % 4) * 15;
    const cycleLen = rayMaxDist + lineLen;
    const phase = ((src.animTime * flowSpeed + i * (cycleLen / flowLineCount)) % cycleLen);
    const startDist = Math.max(0, phase - lineLen);
    const endDist = Math.min(rayMaxDist, phase);

    if (endDist <= startDist) continue;

    const startX = src.x + rayDx * startDist;
    const startY = src.y + rayDy * startDist;
    const endX = src.x + rayDx * endDist;
    const endY = src.y + rayDy * endDist;

    const midDist = (startDist + endDist) / 2;
    const fadeIn = Math.min(1, (phase - startDist) / 25);
    const fadeOut = Math.min(1, (rayMaxDist - phase + lineLen) / 25);
    const alpha = 0.18 + (i % 3) * 0.06;
    const finalAlpha = alpha * Math.min(fadeIn, fadeOut);

    const lineGrad = ctx.createLinearGradient(startX, startY, endX, endY);
    lineGrad.addColorStop(0, `rgba(255, 250, 200, 0)`);
    lineGrad.addColorStop(0.3, `rgba(255, 250, 200, ${finalAlpha * 0.7})`);
    lineGrad.addColorStop(0.5, `rgba(255, 255, 220, ${finalAlpha})`);
    lineGrad.addColorStop(0.7, `rgba(255, 250, 200, ${finalAlpha * 0.7})`);
    lineGrad.addColorStop(1, `rgba(255, 250, 200, 0)`);
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.8 + (midDist / src.range) * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  const particleCount = 8;
  for (let i = 0; i < particleCount; i++) {
    const rayT = (i + 0.5) / particleCount + Math.sin(src.animTime * 2 + i) * 0.02;
    const rayAng = src.angle - src.spread / 2 + src.spread * rayT;
    const rayDx = Math.cos(rayAng);
    const rayDy = Math.sin(rayAng);
    
    const rayOcc2 = getClosestOccluderAlongRay(src.x, src.y, rayDx, rayDy, src.range, blocks);
    const rayMaxDist2 = rayOcc2 ? Math.min(rayOcc2.dist, src.range) : src.range;

    const cycle = (src.animTime * 90 + i * 80) % (rayMaxDist2 + 40);
    const pDist = cycle;
    const alpha = Math.max(0, 1 - Math.abs(pDist - rayMaxDist2 / 2) / (rayMaxDist2 / 2)) * 0.5;

    if (pDist >= 0 && pDist <= rayMaxDist2) {
      const px = src.x + rayDx * pDist;
      const py = src.y + rayDy * pDist;
      const size = 2 + (pDist / rayMaxDist2) * 2;

      const glow = ctx.createRadialGradient(px, py, 0, px, py, size * 3);
      glow.addColorStop(0, `rgba(255, 255, 220, ${alpha})`);
      glow.addColorStop(1, 'rgba(255, 255, 200, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 240, ${alpha * 1.2})`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  for (const p of points) {
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function renderWalls(ctx: CanvasRenderingContext2D, walls: Wall[]): void {
  for (const w of walls) {
    const grad = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.height);
    grad.addColorStop(0, '#3A3A5A');
    grad.addColorStop(1, '#252538');
    ctx.fillStyle = grad;
    ctx.fillRect(w.x, w.y, w.width, w.height);

    ctx.strokeStyle = '#4A4A6A';
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.width - 1, w.height - 1);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let y = w.y + 8; y < w.y + w.height - 4; y += 16) {
      for (let x = w.x + 8; x < w.x + w.width - 4; x += 24) {
        ctx.fillRect(x, y, 3, 3);
      }
    }
  }
}

export function renderShadowBlocks(ctx: CanvasRenderingContext2D, blocks: ShadowBlock[]): void {
  for (const b of blocks) {
    let scaleX = 1, scaleY = 1;
    if (b.spawnAnim > 0) {
      const t = 1 - b.spawnAnim / 0.2;
      const ease = t * t * (3 - 2 * t);
      scaleX = 0.4 + 0.6 * ease;
      scaleY = 0.4 + 0.6 * ease;
    }

    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const dw = b.width * scaleX;
    const dh = b.height * scaleY;
    const dx = cx - dw / 2;
    const dy = cy - dh / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    const grad = ctx.createLinearGradient(dx, dy, dx + dw, dy + dh);
    grad.addColorStop(0, '#4A4A4A');
    grad.addColorStop(0.5, '#3A3A3A');
    grad.addColorStop(1, '#2A2A2A');
    ctx.fillStyle = grad;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.restore();

    ctx.strokeStyle = '#6A6A6A';
    ctx.lineWidth = 2;
    ctx.strokeRect(dx + 1, dy + 1, dw - 2, dh - 2);

    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dx + dw * 0.3, dy + 4);
    ctx.lineTo(dx + dw * 0.3, dy + dh - 4);
    ctx.moveTo(dx + dw * 0.7, dy + 4);
    ctx.lineTo(dx + dw * 0.7, dy + dh - 4);
    ctx.stroke();
  }
}

export function renderBricks(ctx: CanvasRenderingContext2D, bricks: Brick[]): void {
  for (const b of bricks) {
    if (b.broken) continue;

    let scaleX = 1, scaleY = 1;
    if (b.spawnAnim > 0) {
      const t = 1 - b.spawnAnim / 0.2;
      const ease = t * t * (3 - 2 * t);
      scaleX = 0.4 + 0.6 * ease;
      scaleY = 0.4 + 0.6 * ease;
    }

    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const dw = b.width * scaleX;
    const dh = b.height * scaleY;
    const dx = cx - dw / 2;
    const dy = cy - dh / 2;

    if (b.illuminated) {
      ctx.save();
      const heatPulse = 1 + Math.sin(performance.now() * 0.008) * 0.08;
      ctx.shadowColor = `rgba(255, ${140 + Math.sin(performance.now() * 0.01) * 30}, 60, ${0.5 * heatPulse})`;
      ctx.shadowBlur = 18 * heatPulse;
    }

    const grad = ctx.createLinearGradient(dx, dy, dx, dy + dh);
    if (b.illuminated) {
      grad.addColorStop(0, '#FFB366');
      grad.addColorStop(0.3, '#E89240');
      grad.addColorStop(0.7, '#D47828');
      grad.addColorStop(1, '#B86020');
    } else {
      grad.addColorStop(0, '#C8A882');
      grad.addColorStop(0.5, '#B09066');
      grad.addColorStop(1, '#907048');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(dx, dy, dw, dh);

    if (b.illuminated) {
      ctx.restore();

      const crackAlpha = 0.4 + Math.sin(performance.now() * 0.012) * 0.2;
      ctx.strokeStyle = `rgba(80, 30, 10, ${crackAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dx + dw * 0.2, dy + 2);
      ctx.lineTo(dx + dw * 0.35, dy + dh * 0.45);
      ctx.lineTo(dx + dw * 0.25, dy + dh * 0.8);
      ctx.lineTo(dx + dw * 0.5, dy + dh - 2);
      ctx.moveTo(dx + dw * 0.7, dy + 4);
      ctx.lineTo(dx + dw * 0.6, dy + dh * 0.5);
      ctx.lineTo(dx + dw * 0.8, dy + dh * 0.65);
      ctx.moveTo(dx + dw * 0.45, dy + dh * 0.3);
      ctx.lineTo(dx + dw * 0.55, dy + dh * 0.55);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const heatX = dx + dw * (0.2 + i * 0.3);
        const heatY = dy + dh * (0.3 + Math.sin(performance.now() * 0.006 + i) * 0.2);
        const heatGrad = ctx.createRadialGradient(heatX, heatY, 0, heatX, heatY, 8);
        heatGrad.addColorStop(0, 'rgba(255, 220, 150, 0.35)');
        heatGrad.addColorStop(1, 'rgba(255, 180, 100, 0)');
        ctx.fillStyle = heatGrad;
        ctx.beginPath();
        ctx.arc(heatX, heatY, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = b.illuminated ? 'rgba(255, 170, 80, 0.85)' : '#8A6848';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(dx + 0.75, dy + 0.75, dw - 1.5, dh - 1.5);

    ctx.strokeStyle = b.illuminated ? 'rgba(200, 100, 40, 0.5)' : 'rgba(120, 90, 60, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dx, dy + dh / 2);
    ctx.lineTo(dx + dw, dy + dh / 2);
    ctx.moveTo(dx + dw / 2, dy);
    ctx.lineTo(dx + dw / 2, dy + dh / 2);
    ctx.moveTo(dx + dw * 0.25, dy + dh / 2);
    ctx.lineTo(dx + dw * 0.25, dy + dh);
    ctx.moveTo(dx + dw * 0.75, dy + dh / 2);
    ctx.lineTo(dx + dw * 0.75, dy + dh);
    ctx.stroke();

    if (b.illuminated) {
      ctx.fillStyle = 'rgba(255, 255, 220, 0.4)';
      const shimmer = (Math.sin(performance.now() * 0.005) + 1) / 2;
      ctx.globalAlpha = 0.25 + shimmer * 0.35;
      ctx.fillRect(dx + 3, dy + 3, dw * 0.35, dh * 0.22);
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.7 + Math.sin(performance.now() * 0.008) * 0.3;
      ctx.fillText('⚠', cx, cy);
      ctx.globalAlpha = 1;
    }
  }
}

export function renderExit(ctx: CanvasRenderingContext2D, exits: Exit[]): void {
  for (const e of exits) {
    e.animTime += 0.016;
    const pulse = 0.8 + Math.sin(e.animTime * 3) * 0.2;

    ctx.save();
    const glow = ctx.createRadialGradient(
      e.x + e.width / 2, e.y + e.height / 2, 0,
      e.x + e.width / 2, e.y + e.height / 2, Math.max(e.width, e.height)
    );
    glow.addColorStop(0, `rgba(255, 215, 0, ${0.35 * pulse})`);
    glow.addColorStop(0.5, `rgba(150, 50, 200, ${0.2 * pulse})`);
    glow.addColorStop(1, 'rgba(74, 0, 128, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(e.x - e.width, e.y - e.height, e.width * 3, e.height * 3);
    ctx.restore();

    const frameGrad = ctx.createLinearGradient(e.x, e.y, e.x + e.width, e.y + e.height);
    frameGrad.addColorStop(0, '#FFD700');
    frameGrad.addColorStop(1, '#4A0080');
    ctx.fillStyle = frameGrad;
    ctx.fillRect(e.x - 4, e.y - 4, e.width + 8, 6);
    ctx.fillRect(e.x - 4, e.y + e.height - 2, e.width + 8, 6);
    ctx.fillRect(e.x - 4, e.y - 4, 6, e.height + 8);
    ctx.fillRect(e.x + e.width - 2, e.y - 4, 6, e.height + 8);

    const innerGrad = ctx.createLinearGradient(e.x, e.y, e.x, e.y + e.height);
    innerGrad.addColorStop(0, `rgba(255, 240, 180, ${0.3 + pulse * 0.2})`);
    innerGrad.addColorStop(0.5, `rgba(200, 120, 220, ${0.25 + pulse * 0.15})`);
    innerGrad.addColorStop(1, `rgba(74, 0, 128, ${0.2 + pulse * 0.1})`);
    ctx.fillStyle = innerGrad;
    ctx.fillRect(e.x, e.y, e.width, e.height);

    const doorGrad = ctx.createLinearGradient(e.x, e.y, e.x + e.width, e.y + e.height);
    doorGrad.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
    doorGrad.addColorStop(1, 'rgba(150, 50, 200, 0.5)');
    ctx.fillStyle = doorGrad;
    ctx.beginPath();
    const doorW = e.width * 0.6;
    const doorH = e.height * 0.75;
    const doorX = e.x + (e.width - doorW) / 2;
    const doorY = e.y + (e.height - doorH) / 2;
    ctx.moveTo(doorX, doorY + doorH);
    ctx.lineTo(doorX, doorY + doorW * 0.5);
    ctx.arc(doorX + doorW / 2, doorY + doorW * 0.5, doorW / 2, Math.PI, 0, false);
    ctx.lineTo(doorX + doorW, doorY + doorH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + pulse * 0.4})`;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('出口', e.x + e.width / 2, e.y + e.height / 2);
  }
}
