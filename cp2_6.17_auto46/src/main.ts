import { ShipState, createShip, updateShip, drawShip, fireLaser, getLaserHitPoint } from './ship';
import { Mineral, generateMinerals, updateMineral, drawMineral, collectMineral, isMineralAnimDone, createMineral } from './mineral';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

interface UpgradeState {
  engineLevel: number;
  shieldLevel: number;
  laserLevel: number;
  upgrading: string | null;
  upgradeProgress: number;
}

interface ScoreAnim {
  scale: number;
  target: number;
  velocity: number;
}

const CANVAS_W = 800;
const CANVAS_H = 600;
const MAX_MINERALS = 50;
const MAX_LEVEL = 5;
const UPGRADE_DURATION = 0.3;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let ship: ShipState;
let minerals: Mineral[];
let stars: Star[];
let keys: Set<string>;
let score: number;
let totalCollected: number;
let upgrade: UpgradeState;
let scoreAnim: ScoreAnim;
let collectedAnim: ScoreAnim;
let lastTime: number;
let bgGradient: CanvasGradient;

function init(): void {
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  ship = createShip(CANVAS_W, CANVAS_H);
  minerals = generateMinerals(MAX_MINERALS, CANVAS_W, CANVAS_H);
  stars = generateStars(100);
  keys = new Set();
  score = 0;
  totalCollected = 0;
  upgrade = { engineLevel: 1, shieldLevel: 1, laserLevel: 1, upgrading: null, upgradeProgress: 0 };
  scoreAnim = { scale: 1, target: 1, velocity: 0 };
  collectedAnim = { scale: 1, target: 1, velocity: 0 };
  lastTime = performance.now();

  bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bgGradient.addColorStop(0, '#0b0b2b');
  bgGradient.addColorStop(1, '#1a1a3e');

  setupInput();
  requestAnimationFrame(gameLoop);
}

function generateStars(count: number): Star[] {
  const result: Star[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      size: 0.5 + Math.random() * 1.5,
      baseAlpha: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 2,
    });
  }
  return result;
}

function setupInput(): void {
  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.toLowerCase());
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    ship.mouseX = (e.clientX - rect.left) * scaleX;
    ship.mouseY = (e.clientY - rect.top) * scaleY;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      ship.mouseDown = true;
    }
  });
  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      ship.mouseDown = false;
    }
  });
  canvas.addEventListener('mouseleave', () => {
    ship.mouseDown = false;
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    handleUpgradeClick(mx, my);
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleUpgradeClick(mx: number, my: number): void {
  const panelX = 10;
  const panelY = 80;
  const btnW = 160;
  const btnH = 28;
  const startY = panelY + 50;

  const items = [
    { key: 'engine', level: upgrade.engineLevel, y: startY },
    { key: 'shield', level: upgrade.shieldLevel, y: startY + 70 },
    { key: 'laser', level: upgrade.laserLevel, y: startY + 140 },
  ];

  for (const item of items) {
    const bx = panelX + 20;
    const by = item.y + 20;
    if (mx >= bx && mx <= bx + btnW && my >= by && my <= by + btnH) {
      if (item.level < MAX_LEVEL && upgrade.upgrading === null) {
        upgrade.upgrading = item.key;
        upgrade.upgradeProgress = 0;
      }
    }
  }
}

function gameLoop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

function update(dt: number): void {
  ship.engineLevel = upgrade.engineLevel;
  ship.shieldLevel = upgrade.shieldLevel;
  ship.laserLevel = upgrade.laserLevel;

  updateShip(ship, dt, keys, CANVAS_W, CANVAS_H);

  if (upgrade.upgrading !== null) {
    upgrade.upgradeProgress += dt / UPGRADE_DURATION;
    if (upgrade.upgradeProgress >= 1) {
      upgrade.upgradeProgress = 0;
      if (upgrade.upgrading === 'engine' && upgrade.engineLevel < MAX_LEVEL) {
        upgrade.engineLevel++;
      } else if (upgrade.upgrading === 'shield' && upgrade.shieldLevel < MAX_LEVEL) {
        upgrade.shieldLevel++;
      } else if (upgrade.upgrading === 'laser' && upgrade.laserLevel < MAX_LEVEL) {
        upgrade.laserLevel++;
      }
      upgrade.upgrading = null;
    }
  }

  const hitPoint = getLaserHitPoint(ship);
  if (hitPoint) {
    for (const mineral of minerals) {
      if (!mineral.alive) continue;
      const dx = mineral.x - hitPoint.x;
      const dy = mineral.y - hitPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hitPoint.radius + 10) {
        const gained = collectMineral(mineral);
        if (gained > 0) {
          score += gained;
          totalCollected++;
          scoreAnim.scale = 1.2;
          scoreAnim.target = 1;
          collectedAnim.scale = 1.2;
          collectedAnim.target = 1;
        }
      }
    }
  }

  for (const mineral of minerals) {
    updateMineral(mineral, dt);
  }

  minerals = minerals.filter(m => m.alive || !isMineralAnimDone(m));

  while (minerals.filter(m => m.alive).length < MAX_MINERALS) {
    minerals.push(createMineral(CANVAS_W, CANVAS_H, minerals.filter(m => m.alive)));
  }

  for (const star of stars) {
    star.phase += star.speed * dt;
  }

  updateScoreAnim(scoreAnim, dt);
  updateScoreAnim(collectedAnim, dt);
}

function updateScoreAnim(anim: ScoreAnim, dt: number): void {
  if (Math.abs(anim.scale - anim.target) > 0.01) {
    const diff = anim.target - anim.scale;
    anim.velocity += diff * 120 * dt;
    anim.velocity *= 0.85;
    anim.scale += anim.velocity * dt;
  } else {
    anim.scale = anim.target;
    anim.velocity = 0;
  }
}

function draw(): void {
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawStars();

  for (const mineral of minerals) {
    drawMineral(ctx, mineral);
  }

  drawShip(ctx, ship);

  drawUpgradePanel();
  drawHUD();
}

function drawStars(): void {
  for (const star of stars) {
    const alpha = star.baseAlpha * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(star.phase)));
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }
}

function drawUpgradePanel(): void {
  const panelX = 10;
  const panelY = 80;
  const panelW = 200;
  const panelH = 280;

  ctx.fillStyle = 'rgba(20,20,40,0.75)';
  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 10);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,229,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 4;
  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 10);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('升级面板', panelX + panelW / 2, panelY + 24);

  const startY = panelY + 50;
  drawUpgradeItem(panelX + 20, startY, '引擎', upgrade.engineLevel, '速度 +15%', upgrade.upgrading === 'engine' ? upgrade.upgradeProgress : -1);
  drawUpgradeItem(panelX + 20, startY + 70, '护盾', upgrade.shieldLevel, '减伤提升', upgrade.upgrading === 'shield' ? upgrade.upgradeProgress : -1);
  drawUpgradeItem(panelX + 20, startY + 140, '激光', upgrade.laserLevel, '范围 +15%', upgrade.upgrading === 'laser' ? upgrade.upgradeProgress : -1);
}

function drawUpgradeItem(x: number, y: number, name: string, level: number, desc: string, progress: number): void {
  const w = 160;
  ctx.fillStyle = '#c0c0e0';
  ctx.font = '13px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${name} Lv.${level}`, x, y);

  ctx.fillStyle = 'rgba(0,229,255,0.5)';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.fillText(desc, x, y + 14);

  for (let i = 0; i < MAX_LEVEL; i++) {
    const dotX = x + i * 18;
    const dotY = y + 4;
    ctx.beginPath();
    ctx.arc(dotX + 110, dotY, 4, 0, Math.PI * 2);
    if (i < level) {
      ctx.fillStyle = '#00e5ff';
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(0,229,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  const btnY = y + 20;
  const btnH = 28;
  const isMaxed = level >= MAX_LEVEL;
  const isUpgrading = progress >= 0;

  if (isUpgrading && !isMaxed) {
    ctx.fillStyle = 'rgba(0,229,255,0.15)';
    drawRoundedRect(ctx, x, btnY, w, btnH, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,229,255,0.35)';
    drawRoundedRect(ctx, x, btnY, w * progress, btnH, 5);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,229,255,0.6)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, btnY, w, btnH, 5);
    ctx.stroke();

    ctx.fillStyle = '#00e5ff';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('升级中...', x + w / 2, btnY + 18);
  } else if (isMaxed) {
    ctx.fillStyle = 'rgba(0,229,255,0.05)';
    drawRoundedRect(ctx, x, btnY, w, btnH, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,229,255,0.2)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, btnY, w, btnH, 5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,229,255,0.4)';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('已满级', x + w / 2, btnY + 18);
  } else {
    ctx.fillStyle = 'rgba(0,229,255,0.08)';
    drawRoundedRect(ctx, x, btnY, w, btnH, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,229,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 4;
    drawRoundedRect(ctx, x, btnY, w, btnH, 5);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00e5ff';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击升级', x + w / 2, btnY + 18);
  }
}

function drawHUD(): void {
  const hudX = CANVAS_W - 180;
  const hudY = 16;

  ctx.fillStyle = 'rgba(20,20,40,0.6)';
  drawRoundedRect(ctx, hudX - 10, hudY - 8, 180, 80, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,229,255,0.3)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, hudX - 10, hudY - 8, 180, 80, 8);
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,229,255,0.6)';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.fillText('得分', hudX + 155, hudY + 8);

  ctx.save();
  ctx.translate(hudX + 155, hudY + 26);
  ctx.scale(scoreAnim.scale, scoreAnim.scale);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(String(score), 0, 0);
  ctx.restore();

  ctx.fillStyle = 'rgba(0,229,255,0.6)';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('采集数', hudX + 80, hudY + 44);

  ctx.save();
  ctx.translate(hudX + 80, hudY + 60);
  ctx.scale(collectedAnim.scale, collectedAnim.scale);
  ctx.fillStyle = '#c0c0e0';
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(String(totalCollected), 0, 0);
  ctx.restore();

  const totalLevel = upgrade.engineLevel + upgrade.shieldLevel + upgrade.laserLevel;
  const maxTotal = MAX_LEVEL * 3;
  ctx.fillStyle = 'rgba(0,229,255,0.6)';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('飞船等级', hudX + 155, hudY + 44);
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.fillText(`${totalLevel}/${maxTotal}`, hudX + 155, hudY + 60);
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

init();
