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
  pressedBtn: string | null;
  pressedAnim: number;
}

interface ScoreAnim {
  scale: number;
  time: number;
  duration: number;
  playing: boolean;
}

const CANVAS_W = 800;
const CANVAS_H = 600;
const MAX_MINERALS = 50;
const MAX_LEVEL = 5;
const UPGRADE_DURATION = 0.3;
const HUD_ANIM_DURATION = 0.2;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let ship: ShipState;
let minerals: Mineral[];
let stars: Star[];
let keys: Set<string>;
let score: number;
let prevTotalLevel: number;
let totalCollected: number;
let upgrade: UpgradeState;
let scoreAnim: ScoreAnim;
let collectedAnim: ScoreAnim;
let levelAnim: ScoreAnim;
let lastTime: number;
let bgGradient: CanvasGradient;

function init(): void {
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  ship = createShip(CANVAS_W, CANVAS_H);
  const avoidStart = [{ x: ship.x, y: ship.y, minDist: 120 }];
  minerals = generateMinerals(MAX_MINERALS, CANVAS_W, CANVAS_H, avoidStart);
  stars = generateStars(100);
  keys = new Set();
  score = 0;
  totalCollected = 0;
  prevTotalLevel = 3;
  upgrade = {
    engineLevel: 1,
    shieldLevel: 1,
    laserLevel: 1,
    upgrading: null,
    upgradeProgress: 0,
    pressedBtn: null,
    pressedAnim: 0,
  };
  scoreAnim = { scale: 1, time: 0, duration: HUD_ANIM_DURATION, playing: false };
  collectedAnim = { scale: 1, time: 0, duration: HUD_ANIM_DURATION, playing: false };
  levelAnim = { scale: 1, time: 0, duration: HUD_ANIM_DURATION, playing: false };
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
      if (item.level < MAX_LEVEL && upgrade.upgrading === null && upgrade.pressedBtn === null) {
        upgrade.upgrading = item.key;
        upgrade.upgradeProgress = 0;
        upgrade.pressedBtn = item.key;
        upgrade.pressedAnim = 0.1;
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

  if (upgrade.pressedAnim > 0) {
    upgrade.pressedAnim -= dt;
    if (upgrade.pressedAnim <= 0) {
      upgrade.pressedAnim = 0;
      upgrade.pressedBtn = null;
    }
  }

  const prevTotal = upgrade.engineLevel + upgrade.shieldLevel + upgrade.laserLevel;
  if (upgrade.upgrading !== null) {
    upgrade.upgradeProgress += dt / UPGRADE_DURATION;
    if (upgrade.upgradeProgress >= 1) {
      upgrade.upgradeProgress = 1;
      if (upgrade.upgrading === 'engine' && upgrade.engineLevel < MAX_LEVEL) {
        upgrade.engineLevel++;
      } else if (upgrade.upgrading === 'shield' && upgrade.shieldLevel < MAX_LEVEL) {
        upgrade.shieldLevel++;
      } else if (upgrade.upgrading === 'laser' && upgrade.laserLevel < MAX_LEVEL) {
        upgrade.laserLevel++;
      }
      const newTotal = upgrade.engineLevel + upgrade.shieldLevel + upgrade.laserLevel;
      if (newTotal !== prevTotal) {
        triggerHudAnim(levelAnim);
      }
      upgrade.upgrading = null;
      upgrade.upgradeProgress = 0;
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
          triggerHudAnim(scoreAnim);
          triggerHudAnim(collectedAnim);
        }
      }
    }
  }

  for (const mineral of minerals) {
    updateMineral(mineral, dt);
  }

  minerals = minerals.filter(m => m.alive || !isMineralAnimDone(m));

  while (minerals.filter(m => m.alive).length < MAX_MINERALS) {
    const aliveMinerals = minerals.filter(m => m.alive);
    const avoidForNew = [
      { x: ship.x, y: ship.y, minDist: 100 },
    ];
    minerals.push(createMineral(CANVAS_W, CANVAS_H, aliveMinerals, avoidForNew));
  }

  for (const star of stars) {
    star.phase += star.speed * dt;
  }

  updateHudAnim(scoreAnim, dt);
  updateHudAnim(collectedAnim, dt);
  updateHudAnim(levelAnim, dt);
}

function triggerHudAnim(anim: ScoreAnim): void {
  anim.playing = true;
  anim.time = 0;
  anim.scale = 1;
}

function updateHudAnim(anim: ScoreAnim, dt: number): void {
  if (!anim.playing) return;
  anim.time += dt;
  const t = Math.min(anim.time / anim.duration, 1);
  if (t < 0.5) {
    anim.scale = 1 + (1.2 - 1) * (t * 2);
  } else {
    anim.scale = 1.2 - (1.2 - 1) * ((t - 0.5) * 2);
  }
  if (t >= 1) {
    anim.playing = false;
    anim.time = 0;
    anim.scale = 1;
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
  drawUpgradeItem(panelX + 20, startY, '引擎', upgrade.engineLevel, '速度 +15%', upgrade.upgrading === 'engine' ? upgrade.upgradeProgress : -1, upgrade.pressedBtn === 'engine' ? 1 - upgrade.pressedAnim * 1 : 1);
  drawUpgradeItem(panelX + 20, startY + 70, '护盾', upgrade.shieldLevel, '减伤提升', upgrade.upgrading === 'shield' ? upgrade.upgradeProgress : -1, upgrade.pressedBtn === 'shield' ? 1 - upgrade.pressedAnim * 1 : 1);
  drawUpgradeItem(panelX + 20, startY + 140, '激光', upgrade.laserLevel, '范围 +15%', upgrade.upgrading === 'laser' ? upgrade.upgradeProgress : -1, upgrade.pressedBtn === 'laser' ? 1 - upgrade.pressedAnim * 1 : 1);
}

function drawUpgradeItem(x: number, y: number, name: string, level: number, desc: string, progress: number, btnScale: number = 1): void {
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

  const cx = x + w / 2;
  const cy = btnY + btnH / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(btnScale, btnScale);
  ctx.translate(-cx, -cy);

  if (isUpgrading && !isMaxed) {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    ctx.fillStyle = 'rgba(0,229,255,0.1)';
    drawRoundedRect(ctx, x, btnY, w, btnH, 5);
    ctx.fill();

    const fillW = Math.max(2, w * clampedProgress);
    const grad = ctx.createLinearGradient(x, btnY, x + w, btnY);
    grad.addColorStop(0, 'rgba(0,229,255,0.45)');
    grad.addColorStop(1, 'rgba(0,229,255,0.25)');
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, x, btnY, fillW, btnH, 5);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,229,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 4;
    drawRoundedRect(ctx, x, btnY, w, btnH, 5);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const percentText = `${Math.floor(clampedProgress * 100)}%`;
    ctx.fillText(percentText, x + w / 2, btnY + 18);
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

  ctx.restore();
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

  ctx.save();
  ctx.translate(hudX + 155, hudY + 60);
  ctx.scale(levelAnim.scale, levelAnim.scale);
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${totalLevel}/${maxTotal}`, 0, 0);
  ctx.restore();
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
