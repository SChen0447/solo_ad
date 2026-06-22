import {
  ProjectileData,
  WeaponType,
  Weapon
} from './weapons';
import {
  EnemyData,
  ParticleData,
  ShardData,
  WeaponAnimState,
  SystemState,
  HitEffectData,
  MuzzleFlashData
} from './system';

function lerpColor(color1: string, color2: string, t: number): string {
  const parseHex = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  };
  const c1 = parseHex(color1);
  const c2 = parseHex(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#1A1A2E');
  gradient.addColorStop(1, '#16213E');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawMech(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  turretAngle: number
): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#0F3460';
  ctx.fill();
  ctx.strokeStyle = '#16537E';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#16213E';
  ctx.fill();

  ctx.rotate(turretAngle);

  ctx.fillStyle = '#0F3460';
  ctx.strokeStyle = '#16537E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-15, -5, 30, 10, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1A5276';
  ctx.fillRect(10, -3, 30, 6);
  ctx.strokeStyle = '#2E86AB';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, -3, 30, 6);

  ctx.beginPath();
  ctx.arc(40, 0, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#00FFAA';
  ctx.shadowColor = '#00FFAA';
  ctx.shadowBlur = 10;
  ctx.fill();

  ctx.restore();
}

function drawAimLine(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): void {
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(toX, toY, 8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 255, 170, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX - 12, toY);
  ctx.lineTo(toX - 4, toY);
  ctx.moveTo(toX + 4, toY);
  ctx.lineTo(toX + 12, toY);
  ctx.moveTo(toX, toY - 12);
  ctx.lineTo(toX, toY - 4);
  ctx.moveTo(toX, toY + 4);
  ctx.lineTo(toX, toY + 12);
  ctx.strokeStyle = 'rgba(0, 255, 170, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawEnergyBeam(ctx: CanvasRenderingContext2D, proj: ProjectileData): void {
  const alpha = proj.life / proj.maxLife;
  ctx.save();

  const endX = proj.startX + Math.cos(proj.angle) * 1200;
  const endY = proj.startY + Math.sin(proj.angle) * 1200;

  ctx.globalAlpha = alpha * 0.3;
  ctx.strokeStyle = '#00AAFF';
  ctx.lineWidth = 12;
  ctx.shadowColor = '#00AAFF';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(proj.startX, proj.startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = '#00CCFF';
  ctx.lineWidth = 7;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(proj.startX, proj.startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(proj.startX, proj.startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.restore();
}

function drawMissile(ctx: CanvasRenderingContext2D, proj: ProjectileData): void {
  ctx.save();
  ctx.translate(proj.x, proj.y);
  ctx.rotate(proj.angle);

  ctx.fillStyle = '#FF4444';
  ctx.strokeStyle = '#CC0000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-8, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFAA00';
  ctx.shadowColor = '#FF6600';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(-8, -3);
  ctx.lineTo(-18 - Math.random() * 6, 0);
  ctx.lineTo(-8, 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFF00';
  ctx.shadowColor = '#FFFF00';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(-12, 0, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPellet(ctx: CanvasRenderingContext2D, proj: ProjectileData): void {
  ctx.save();
  ctx.translate(proj.x, proj.y);
  ctx.rotate(proj.angle);

  const alpha = Math.max(0, 1 - proj.traveled / proj.maxDistance);

  ctx.fillStyle = '#FF3333';
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur = 8;
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFAAAA';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: ProjectileData[]): void {
  for (const proj of projectiles) {
    switch (proj.effectType) {
      case 'beam':
        drawEnergyBeam(ctx, proj);
        break;
      case 'missile':
        drawMissile(ctx, proj);
        break;
      case 'pellet':
        drawPellet(ctx, proj);
        break;
    }
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: EnemyData): void {
  ctx.save();

  if (enemy.flashTime > 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 15;
  } else {
    ctx.fillStyle = enemy.color;
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 5;
  }

  ctx.beginPath();
  ctx.roundRect(enemy.x, enemy.y, enemy.width, enemy.height, 4);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = enemy.flashTime > 0 ? '#FFFFFF' : '#006600';
  ctx.lineWidth = 2;
  ctx.stroke();

  const barW = enemy.width;
  const barH = 5;
  const barX = enemy.x;
  const barY = enemy.y - 10;
  const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);

  ctx.fillStyle = '#333333';
  ctx.fillRect(barX, barY, barW, barH);

  const hpColor = hpRatio > 0.5 ? '#33FF33' : hpRatio > 0.25 ? '#FFCC00' : '#FF3333';
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = enemy.flashTime > 0 ? '#FFFFFF' : '#003300';
  ctx.fillRect(enemy.x + 8, enemy.y + 15, 8, 8);
  ctx.fillRect(enemy.x + enemy.width - 16, enemy.y + 15, 8, 8);

  ctx.fillStyle = enemy.flashTime > 0 ? '#FFFFFF' : '#004400';
  ctx.fillRect(enemy.x + 10, enemy.y + 38, enemy.width - 20, 10);

  ctx.restore();
}

function drawEnemies(ctx: CanvasRenderingContext2D, enemies: EnemyData[], w: number, h: number): void {
  for (const enemy of enemies) {
    if (enemy.x + enemy.width < -50 || enemy.x > w + 50) continue;
    if (enemy.y + enemy.height < -50 || enemy.y > h + 50) continue;
    drawEnemy(ctx, enemy);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: ParticleData[]): void {
  for (const p of particles) {
    const t = 1 - p.life / p.maxLife;
    const alpha = p.life / p.maxLife;
    const color = lerpColor(p.color, p.colorEnd, t);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    const size = p.size * (1 - t * 0.3);
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawShards(ctx: CanvasRenderingContext2D, shards: ShardData[]): void {
  for (const s of shards) {
    const alpha = s.life / s.maxLife;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 5;
    ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
    ctx.restore();
  }
}

function getWeaponColor(type: WeaponType): string {
  switch (type) {
    case 'energy': return '#00AAFF';
    case 'missile': return '#FF6600';
    case 'shotgun': return '#FF3333';
    default: {
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck || '#FFFFFF';
    }
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function drawHitEffects(ctx: CanvasRenderingContext2D, hitEffects: HitEffectData[]): void {
  const now = performance.now();
  for (const h of hitEffects) {
    const elapsed = (now - h.startTime) / 1000;
    const progress = Math.min(elapsed / h.maxLife, 1);
    const easedProgress = easeOutCubic(progress);
    const alpha = 1 - progress;
    const radius = 10 + easedProgress * 45;
    const color = getWeaponColor(h.weaponType);

    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 * (1 - progress * 0.6);
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(h.x, h.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(h.x, h.y, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawMuzzleFlashes(ctx: CanvasRenderingContext2D, flashes: MuzzleFlashData[]): void {
  const now = performance.now();
  for (const f of flashes) {
    const elapsed = (now - f.startTime) / 1000;
    const progress = Math.min(elapsed / f.maxLife, 1);
    const alpha = 1 - progress;
    const color = getWeaponColor(f.weaponType);

    let baseSize: number;
    switch (f.weaponType) {
      case 'energy': baseSize = 18; break;
      case 'missile': baseSize = 25; break;
      case 'shotgun': baseSize = 30; break;
      default: baseSize = 20;
    }
    const size = baseSize * (1 - progress * 0.5);

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 1.2, -size * 0.4);
    ctx.lineTo(size * 1.5, 0);
    ctx.lineTo(size * 1.2, size * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(size * 0.3, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

const WEAPON_UI_PANEL_X = 15;
const WEAPON_UI_PANEL_Y = 485;
const WEAPON_UI_PANEL_W = 300;
const WEAPON_UI_PANEL_H = 100;
const WEAPON_ITEM_W = 80;
const WEAPON_ITEM_H = 60;
const WEAPON_ITEM_GAP = 10;

export function getWeaponPanelRects() {
  const items: Record<WeaponType, { x: number; y: number; w: number; h: number }> = {
    energy:  { x: WEAPON_UI_PANEL_X + 15, y: WEAPON_UI_PANEL_Y + 20, w: WEAPON_ITEM_W, h: WEAPON_ITEM_H },
    missile: { x: WEAPON_UI_PANEL_X + 15 + WEAPON_ITEM_W + WEAPON_ITEM_GAP, y: WEAPON_UI_PANEL_Y + 20, w: WEAPON_ITEM_W, h: WEAPON_ITEM_H },
    shotgun: { x: WEAPON_UI_PANEL_X + 15 + (WEAPON_ITEM_W + WEAPON_ITEM_GAP) * 2, y: WEAPON_UI_PANEL_Y + 20, w: WEAPON_ITEM_W, h: WEAPON_ITEM_H }
  };
  return items;
}

function drawWeaponIcon(
  ctx: CanvasRenderingContext2D,
  type: WeaponType,
  cx: number,
  cy: number
): void {
  ctx.save();
  switch (type) {
    case 'energy':
      ctx.strokeStyle = '#00CCFF';
      ctx.fillStyle = '#0066AA';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy + 5);
      ctx.lineTo(cx + 5, cy + 5);
      ctx.lineTo(cx + 5, cy - 5);
      ctx.lineTo(cx + 18, cy - 5);
      ctx.lineTo(cx + 18, cy + 5);
      ctx.lineTo(cx + 22, cy);
      ctx.lineTo(cx + 18, cy - 5);
      ctx.stroke();
      ctx.fillStyle = '#00AAFF';
      ctx.shadowColor = '#00AAFF';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(cx + 22, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'missile':
      ctx.fillStyle = '#FF4444';
      ctx.strokeStyle = '#CC0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 20, cy);
      ctx.lineTo(cx - 5, cy - 10);
      ctx.lineTo(cx - 5, cy + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFAA00';
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 6);
      ctx.lineTo(cx - 18, cy);
      ctx.lineTo(cx - 5, cy + 6);
      ctx.closePath();
      ctx.fill();
      break;

    case 'shotgun':
      ctx.fillStyle = '#8B4513';
      ctx.strokeStyle = '#5D2906';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - 18, cy - 3, 28, 8, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#444444';
      ctx.strokeStyle = '#222222';
      ctx.fillRect(cx + 10, cy - 5, 12, 12);
      ctx.strokeRect(cx + 10, cy - 5, 12, 12);
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(cx + 22, cy - 3, 1.5, 0, Math.PI * 2);
      ctx.arc(cx + 22, cy + 3, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}

function drawWeaponPanel(
  ctx: CanvasRenderingContext2D,
  currentWeapon: WeaponType,
  weapons: Record<WeaponType, Weapon>,
  weaponAnims: Record<WeaponType, WeaponAnimState>
): void {
  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(WEAPON_UI_PANEL_X, WEAPON_UI_PANEL_Y, WEAPON_UI_PANEL_W, WEAPON_UI_PANEL_H, 12);
  ctx.fill();
  ctx.shadowBlur = 0;

  const rects = getWeaponPanelRects();
  const weaponTypes: WeaponType[] = ['energy', 'missile', 'shotgun'];
  const keyLabels = ['1', '2', '3'];

  for (let i = 0; i < weaponTypes.length; i++) {
    const type = weaponTypes[i];
    const rect = rects[type];
    const anim = weaponAnims[type];
    const isSelected = type === currentWeapon;

    const scale = anim.scale;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    if (anim.isHovered && !isSelected) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
      ctx.fill();
    }

    if (isSelected) {
      ctx.shadowColor = '#00FFAA';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#00FFAA';
      ctx.lineWidth = 2;
    } else {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#4A4A6A';
      ctx.lineWidth = 1.5;
    }

    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;

    drawWeaponIcon(ctx, type, cx, cy - 8);

    ctx.fillStyle = isSelected ? '#00FFAA' : '#AAAAAA';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`[${keyLabels[i]}]`, cx, rect.y + 14);

    const weapon = weapons[type];
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = isSelected ? '#00FFAA' : '#CCCCCC';
    const ammoText = weapon.ammo === Infinity ? '∞' : `${weapon.ammo}`;
    ctx.fillText(ammoText, cx, rect.y + rect.h - 8);

    ctx.restore();
  }

  ctx.restore();
}

function drawTopHUD(
  ctx: CanvasRenderingContext2D,
  currentWeapon: WeaponType,
  weapons: Record<WeaponType, Weapon>,
  canvasWidth: number
): void {
  const weapon = weapons[currentWeapon];
  const cx = canvasWidth / 2;

  ctx.save();
  ctx.textAlign = 'center';

  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#00FFAA';
  ctx.shadowColor = '#00FFAA';
  ctx.shadowBlur = 5;

  const ammoText = weapon.ammo === Infinity ? '弹药: ∞' : `弹药: ${weapon.ammo}/${weapon.maxAmmo}`;
  ctx.fillText(ammoText, cx, 35);

  const cooldown = Math.max(0, weapon.currentCooldown);
  if (cooldown > 0) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#FFAA00';
    ctx.shadowColor = '#FFAA00';
    ctx.fillText(`冷却: ${cooldown.toFixed(2)}s`, cx, 58);
  } else if (weapon.currentSwitchDelay > 0) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#FF6666';
    ctx.shadowColor = '#FF6666';
    ctx.fillText('切换中...', cx, 58);
  }

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#888888';
  ctx.shadowBlur = 0;
  ctx.fillText(weapon.name, cx, 78);

  ctx.restore();
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: SystemState,
  shakeX: number = 0,
  shakeY: number = 0
): void {
  const {
    projectiles,
    enemies,
    particles,
    shards,
    hitEffects,
    muzzleFlashes,
    currentWeapon,
    weapons,
    weaponAnims,
    mechX,
    mechY,
    turretAngle,
    mouseX,
    mouseY,
    canvasWidth,
    canvasHeight
  } = state;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground(ctx, canvasWidth, canvasHeight);
  drawAimLine(ctx, mechX, mechY, mouseX, mouseY);
  drawEnemies(ctx, enemies, canvasWidth, canvasHeight);
  drawProjectiles(ctx, projectiles);
  drawParticles(ctx, particles);
  drawShards(ctx, shards);
  drawHitEffects(ctx, hitEffects);
  drawMech(ctx, mechX, mechY, turretAngle);
  drawMuzzleFlashes(ctx, muzzleFlashes);

  ctx.restore();

  drawTopHUD(ctx, currentWeapon, weapons, canvasWidth);
  drawWeaponPanel(ctx, currentWeapon, weapons, weaponAnims);
}
