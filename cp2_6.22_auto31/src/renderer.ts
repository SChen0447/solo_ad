import { Grid, TILE_SIZE, GRID_SIZE, MAP_WIDTH, MAP_HEIGHT } from './map';
import { Tower, Monster, Projectile, TowerType, TOWER_COLORS, PROJECTILE_COLORS, Particle } from './entity';

export interface RenderState {
  time: number;
  gold: number;
  goldBounceTimer: number;
  baseHp: number;
  maxBaseHp: number;
  wave: number;
  waveTimer: number;
  hoveredGrid: { gridX: number; gridY: number } | null;
  buildMenu: { visible: boolean; x: number; y: number; gridX: number; gridY: number; hoveredBtn: number };
  upgradePanel: { visible: boolean; x: number; y: number; towerId: number; hoveredBtn: boolean };
  buildingList: { id: number; type: TowerType; level: number }[];
  selectedBuildingId: number | null;
  canvasWidth: number;
  canvasHeight: number;
}

const PANEL_WIDTH = 240;

export function renderGame(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  towers: Map<number, Tower>,
  monsters: Map<number, Monster>,
  projectiles: Map<number, Projectile>,
  particles: Particle[],
  state: RenderState
): void {
  const fullWidth = state.canvasWidth;
  const fullHeight = state.canvasHeight;

  ctx.fillStyle = '#FFF8E7';
  ctx.fillRect(0, 0, fullWidth, fullHeight);

  drawMapArea(ctx, grid, state);
  drawSidePanel(ctx, state);
  drawTowers(ctx, towers, state);
  drawMonsters(ctx, monsters, state);
  drawProjectiles(ctx, projectiles);
  drawParticles(ctx, particles);
  drawGoldPanel(ctx, state);

  if (state.buildMenu.visible) {
    drawBuildMenu(ctx, state.buildMenu, state.time);
  }

  if (state.upgradePanel.visible) {
    const tower = towers.get(state.upgradePanel.towerId);
    if (tower) {
      drawUpgradePanel(ctx, state.upgradePanel, tower, state.gold);
    }
  }
}

function drawMapArea(ctx: CanvasRenderingContext2D, grid: Grid, state: RenderState): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.clip();

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      drawTile(ctx, grid, x, y, state.time);
    }
  }

  if (state.hoveredGrid) {
    const tile = grid.getTile(state.hoveredGrid.gridX, state.hoveredGrid.gridY);
    if (tile) {
      const px = state.hoveredGrid.gridX * TILE_SIZE;
      const py = state.hoveredGrid.gridY * TILE_SIZE;
      const isBuildable = grid.isBuildable(state.hoveredGrid.gridX, state.hoveredGrid.gridY);
      ctx.strokeStyle = isBuildable ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
  }

  ctx.restore();

  ctx.strokeStyle = '#3E2723';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
}

function drawTile(ctx: CanvasRenderingContext2D, grid: Grid, gx: number, gy: number, time: number): void {
  const tile = grid.tiles[gy][gx];
  const px = gx * TILE_SIZE;
  const py = gy * TILE_SIZE;

  switch (tile.type) {
    case 'grass':
      ctx.fillStyle = '#2D5A27';
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = '#3A7232';
      const seed1 = (gx * 7 + gy * 13) % 5;
      for (let i = 0; i < 3; i++) {
        const dotX = px + 8 + ((seed1 + i * 11) % 24);
        const dotY = py + 8 + ((seed1 * 3 + i * 7) % 24);
        ctx.fillRect(dotX, dotY, 2, 4);
      }
      break;

    case 'path':
    case 'spawn':
    case 'base':
      ctx.fillStyle = '#C4A882';
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = '#B89968';
      ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      break;
  }

  if (tile.type === 'spawn') {
    ctx.fillStyle = '#7F1D1D';
    ctx.beginPath();
    ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  if (tile.type === 'base') {
    const pulse = 1 + Math.sin(time * 2) * 0.05;
    ctx.save();
    ctx.translate(px + TILE_SIZE / 2, py + TILE_SIZE / 2);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(-14, -14, 28, 28);
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
  }

  if (tile.type === 'resource') {
    const depleted = tile.resourceDepleted;
    const baseColor = depleted ? '#6B7280' : '#FFD700';
    const scaleY = depleted ? 0.4 : 1.0;

    let pulse = 1.0;
    if (!depleted) {
      const pulsePhase = (time % 2) / 2;
      pulse = 1.0 + Math.sin(pulsePhase * Math.PI * 2) * 0.05 + 0.05;
    }

    const drawHeight = 14 * scaleY;

    ctx.save();
    ctx.translate(px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 8 + (1 - scaleY) * 7);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = depleted ? '#4B5563' : '#B8860B';
    ctx.beginPath();
    ctx.ellipse(0, 8, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.lineTo(-10, -8 + (1 - scaleY) * 12);
    ctx.lineTo(-6, -12 + (1 - scaleY) * 12);
    ctx.lineTo(0, -14 + (1 - scaleY) * 14);
    ctx.lineTo(6, -12 + (1 - scaleY) * 12);
    ctx.lineTo(10, -8 + (1 - scaleY) * 12);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fill();

    if (!depleted) {
      ctx.fillStyle = '#FFF8DC';
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(-4, -10);
      ctx.lineTo(0, -12);
      ctx.lineTo(4, -10);
      ctx.lineTo(4, -6);
      ctx.closePath();
      ctx.fill();

      const glowIntensity = 0.3 + Math.sin(pulsePhase * Math.PI * 2) * 0.2;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10 * glowIntensity;
      ctx.beginPath();
      ctx.arc(0, -5, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 200, ${glowIntensity})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}

function drawTowers(ctx: CanvasRenderingContext2D, towers: Map<number, Tower>, state: RenderState): void {
  for (const tower of towers.values()) {
    drawTower(ctx, tower, state);
  }
}

function drawTower(ctx: CanvasRenderingContext2D, tower: Tower, state: RenderState): void {
  const x = tower.x;
  const y = tower.y - tower.recoilOffset;
  const color = TOWER_COLORS[tower.type];
  const selected = state.selectedBuildingId === tower.id;
  const flashing = tower.upgradeFlashTimer > 0 && Math.floor(tower.upgradeFlashTimer * 12) % 2 === 0;
  const alpha = flashing ? 0.5 : 1;

  if (selected) {
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, tower.y, tower.stats.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (tower.pulseRingTimer > 0 && tower.type !== 'collector') {
    const pulseDuration = 0.15;
    const t = 1 - tower.pulseRingTimer / pulseDuration;
    const maxRadius = tower.stats.range * 0.3;
    const radius = maxRadius * t;
    const ringAlpha = 0.4 * (1 - t);
    const ringWidth = 4 + t * 6;

    ctx.strokeStyle = hexToRgba(color, ringAlpha);
    ctx.lineWidth = ringWidth;
    ctx.beginPath();
    ctx.arc(x, tower.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = hexToRgba(color, ringAlpha * 0.2);
    ctx.beginPath();
    ctx.arc(x, tower.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  if (tower.flashTimer > 0) {
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 10;
  }

  if (tower.type === 'arrow') {
    drawArrowTower(ctx, x, y, tower.level, color);
  } else if (tower.type === 'cannon') {
    drawCannonTower(ctx, x, y, tower.level, color);
  } else if (tower.type === 'magic') {
    drawMagicTower(ctx, x, y, tower.level, color, tower.particleAngle);
  } else if (tower.type === 'collector') {
    drawCollectorTower(ctx, x, y, color);
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  for (let i = 0; i < tower.level; i++) {
    ctx.fillText('★', x - 10 + i * 10, y - 22);
  }

  ctx.restore();
}

function drawArrowTower(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, color: string): void {
  const extraHeight = level >= 2 ? 10 : 0;
  const baseWidth = 18;
  const baseHeight = 16 + extraHeight;

  ctx.fillStyle = '#3E2723';
  ctx.fillRect(x - baseWidth / 2, y - baseHeight / 2 + 4, baseWidth, baseHeight);

  ctx.fillStyle = color;
  ctx.fillRect(x - baseWidth / 2 + 2, y - baseHeight / 2 + 6, baseWidth - 4, baseHeight - 4);

  if (level >= 3) {
    ctx.fillStyle = '#10B981';
    ctx.fillRect(x - baseWidth / 2 + 4, y - baseHeight / 2 + 8, baseWidth - 8, 4);
  }

  if (level >= 2) {
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.moveTo(x - 8, y - baseHeight / 2);
    ctx.lineTo(x, y - baseHeight / 2 - 8);
    ctx.lineTo(x + 8, y - baseHeight / 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCannonTower(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, color: string): void {
  const extraWidth = level >= 2 ? 10 : 0;
  const baseWidth = 20 + extraWidth;

  ctx.fillStyle = '#3E2723';
  ctx.beginPath();
  ctx.arc(x, y + 2, baseWidth / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y + 2, baseWidth / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  if (level >= 2) {
    const grad = ctx.createRadialGradient(x - 4, y, 0, x, y, baseWidth / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y + 2, baseWidth / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#1F2937';
  ctx.fillRect(x - 4, y - 14, 8, 12);
  ctx.fillStyle = '#374151';
  ctx.fillRect(x - 3, y - 13, 6, 10);
}

function drawMagicTower(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, color: string, particleAngle: number): void {
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(x - 12, y - 6, 24, 20);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  ctx.lineTo(x - 10, y - 4);
  ctx.lineTo(x + 10, y - 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#C4B5FD';
  ctx.beginPath();
  ctx.arc(x, y - 8, 3, 0, Math.PI * 2);
  ctx.fill();

  if (level >= 2) {
    const particleCount = 4 + level * 2;
    const radius = 40;
    for (let i = 0; i < particleCount; i++) {
      const angle = particleAngle + (i * Math.PI * 2) / particleCount;
      const px = x + Math.cos(angle) * radius;
      const py = y - 5 + Math.sin(angle) * radius * 0.6;
      const size = 2 + Math.sin(particleAngle * 2 + i) * 1;
      ctx.fillStyle = `rgba(168, 85, 247, ${0.7 + Math.sin(particleAngle * 3 + i) * 0.3})`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCollectorTower(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(x - 14, y - 4, 28, 18);

  ctx.fillStyle = color;
  ctx.fillRect(x - 12, y - 2, 24, 14);

  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 4);
  ctx.lineTo(x, y - 16);
  ctx.lineTo(x + 14, y - 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FCD34D';
  ctx.beginPath();
  ctx.arc(x - 4, y + 6, 2, 0, Math.PI * 2);
  ctx.arc(x + 4, y + 6, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawMonsters(ctx: CanvasRenderingContext2D, monsters: Map<number, Monster>, _state: RenderState): void {
  for (const monster of monsters.values()) {
    drawMonster(ctx, monster);
  }
}

function drawMonster(ctx: CanvasRenderingContext2D, monster: Monster): void {
  if (!monster.alive) return;

  const x = monster.x + monster.renderOffsetX;
  const y = monster.y + monster.renderOffsetY;
  const radius = 16;

  if (monster.knockbackTimer > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (monster.slowTimer > 0) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
  grad.addColorStop(0, '#7C2D12');
  grad.addColorStop(1, '#431407');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1C1917';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FCD34D';
  ctx.beginPath();
  ctx.arc(x - 5, y - 3, 3, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(x - 5, y - 3, 1.5, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 3, 1.5, 0, Math.PI * 2);
  ctx.fill();

  const hpPercent = monster.hp / monster.maxHp;
  const barWidth = 30;
  const barHeight = 4;
  const barX = x - barWidth / 2;
  const barY = y - radius - 10;

  ctx.fillStyle = '#D1D5DB';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = '#EF4444';
  ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
}

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Map<number, Projectile>): void {
  for (const p of projectiles.values()) {
    drawProjectile(ctx, p);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    if (!p.alive) continue;
    const alpha = p.getAlpha();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile): void {
  if (!p.alive) return;

  const color = PROJECTILE_COLORS[p.type];
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  if (p.type === 'arrow') {
    const dx = p.targetX - p.startX;
    const dy = p.targetY - p.startY;
    const angle = Math.atan2(dy, dx);
    const len = 12;
    const endX = p.x;
    const endY = p.y;
    const startX = p.x - Math.cos(angle) * len;
    const startY = p.y - Math.sin(angle) * len;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.type === 'cannon') {
    const arcY = p.getArcY();
    const actualY = p.y + arcY * 0.5;
    ctx.beginPath();
    ctx.arc(p.x, actualY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, actualY, 9, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.type === 'magic') {
    const target = { x: p.targetX, y: p.targetY };
    const midX = (p.startX + target.x) / 2;
    const midY = (p.startY + target.y) / 2;
    const perpX = -(target.y - p.startY) * 0.2;
    const perpY = (target.x - p.startX) * 0.2;
    const ctrlX = midX + perpX;
    const ctrlY = midY + perpY;

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p.startX, p.startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, p.x, p.y);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.startX + (p.x - p.startX) * 0.3, p.startY + (p.y - p.startY) * 0.3);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.fillStyle = '#E9D5FF';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGoldPanel(ctx: CanvasRenderingContext2D, state: RenderState): void {
  const panelX = MAP_WIDTH - 130;
  const panelY = 10;
  const panelW = 120;
  const panelH = 48;

  ctx.fillStyle = 'rgba(17, 24, 39, 0.85)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 16);
  ctx.fill();

  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 16);
  ctx.stroke();

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(panelX + 20, panelY + panelH / 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('$', panelX + 20, panelY + panelH / 2 + 4);

  let scaleY = 1;
  let scaleX = 1;
  let offsetY = 0;
  if (state.goldBounceTimer > 0) {
    const t = 1 - state.goldBounceTimer / 0.3;
    const easeOut = 1 - Math.pow(1 - t, 3);
    scaleX = 1 + easeOut * 0.3;
    scaleY = 1 + easeOut * 0.3;
    offsetY = -easeOut * 10;
  }

  ctx.save();
  ctx.translate(panelX + 50, panelY + panelH / 2 + offsetY);
  ctx.scale(scaleX, scaleY);
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(String(state.gold), 0, 7);
  ctx.restore();
}

function drawSidePanel(ctx: CanvasRenderingContext2D, state: RenderState): void {
  const panelX = MAP_WIDTH;
  const panelW = PANEL_WIDTH;
  const panelH = MAP_HEIGHT;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(panelX, 0, panelW, panelH);

  ctx.fillStyle = '#D97706';
  ctx.fillRect(panelX, 0, 2, panelH);

  let y = 20;
  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('基地状态', panelX + panelW / 2, y);
  y += 10;

  const barX = panelX + 15;
  const barW = panelW - 30;
  const barH = 20;
  y += 10;

  ctx.fillStyle = '#374151';
  roundRect(ctx, barX, y, barW, barH, 10);
  ctx.fill();

  const hpPercent = state.baseHp / state.maxBaseHp;
  ctx.fillStyle = '#EF4444';
  roundRect(ctx, barX, y, barW * Math.max(0, hpPercent), barH, 10);
  ctx.fill();

  ctx.strokeStyle = '#3E2723';
  ctx.lineWidth = 2;
  roundRect(ctx, barX, y, barW, barH, 10);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${state.baseHp}/${state.maxBaseHp} (${Math.round(hpPercent * 100)}%)`, panelX + panelW / 2, y + 14);
  y += barH + 20;

  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`当前波次: ${state.wave}`, panelX + 15, y);
  y += 20;

  const nextWaveIn = Math.max(0, 5 - state.waveTimer);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '12px Arial';
  ctx.fillText(`下一波: ${nextWaveIn.toFixed(1)}s`, panelX + 15, y);
  y += 30;

  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('已建造建筑', panelX + 15, y);
  y += 8;

  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX + 15, y);
  ctx.lineTo(panelX + panelW - 15, y);
  ctx.stroke();
  y += 8;

  if (state.buildingList.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = '12px Arial';
    ctx.fillText('（暂无建筑）', panelX + 15, y + 20);
  } else {
    for (const building of state.buildingList) {
      drawBuildingListItem(ctx, building, panelX + 15, y, panelW - 30, state.selectedBuildingId === building.id);
      y += 42;
      if (y > panelH - 20) break;
    }
  }
}

function drawBuildingListItem(
  ctx: CanvasRenderingContext2D,
  building: { id: number; type: TowerType; level: number },
  x: number,
  y: number,
  w: number,
  selected: boolean
): void {
  const h = 40;
  if (selected) {
    ctx.fillStyle = 'rgba(217, 119, 6, 0.2)';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
  }

  const color = TOWER_COLORS[building.type];
  ctx.fillStyle = color;
  roundRect(ctx, x + 4, y + 4, 32, 32, 6);
  ctx.fill();
  ctx.strokeStyle = '#3E2723';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 4, y + 4, 32, 32, 6);
  ctx.stroke();

  const names: Record<TowerType, string> = { arrow: '箭', cannon: '炮', magic: '法', collector: '采' };
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(names[building.type], x + 20, y + 25);

  ctx.fillStyle = '#F1F5F9';
  ctx.font = '13px Arial';
  ctx.textAlign = 'left';
  const typeNames: Record<TowerType, string> = { arrow: '箭塔', cannon: '炮塔', magic: '魔法塔', collector: '采集站' };
  ctx.fillText(typeNames[building.type], x + 44, y + 16);

  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('★'.repeat(building.level), x + 44, y + 32);
}

interface BuildMenu {
  visible: boolean;
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  hoveredBtn: number;
}

function drawBuildMenu(ctx: CanvasRenderingContext2D, menu: BuildMenu, time: number): void {
  const w = 200;
  const btnH = 40;
  const gap = 8;
  const padding = 8;
  const totalH = btnH * 4 + gap * 3 + padding * 2;

  let mx = menu.x;
  let my = menu.y;
  if (mx + w > MAP_WIDTH) mx = MAP_WIDTH - w - 5;
  if (my + totalH > MAP_HEIGHT) my = MAP_HEIGHT - totalH - 5;
  if (mx < 5) mx = 5;
  if (my < 5) my = 5;

  ctx.fillStyle = 'rgba(31, 41, 55, 0.98)';
  roundRect(ctx, mx, my, w, totalH, 12);
  ctx.fill();

  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 2;
  roundRect(ctx, mx, my, w, totalH, 12);
  ctx.stroke();

  const buttons: { type: TowerType; label: string; desc: string; color: string }[] = [
    { type: 'arrow', label: '箭塔', desc: '射速快 单体伤害', color: '#065F46' },
    { type: 'cannon', label: '炮塔', desc: '范围溅射 高伤害', color: '#991B1B' },
    { type: 'magic', label: '魔法塔', desc: '追踪伤害 减速', color: '#5B21B6' },
    { type: 'collector', label: '采集站', desc: '采集资源 获取金币', color: '#78350F' }
  ];

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const bx = mx + padding;
    const by = my + padding + i * (btnH + gap);
    const isHovered = menu.hoveredBtn === i;
    const offsetX = isHovered ? -4 + Math.sin(time * 5) * 0.5 : 0;
    const alpha = isHovered ? 0.3 : 0;

    if (isHovered) {
      ctx.fillStyle = `rgba(217, 119, 6, ${alpha + 0.2})`;
      roundRect(ctx, bx + offsetX, by, w - padding * 2, btnH, 8);
      ctx.fill();
    }

    ctx.fillStyle = btn.color;
    roundRect(ctx, bx + offsetX, by, btnH - 6, btnH - 6, 6);
    ctx.fill();
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 1;
    roundRect(ctx, bx + offsetX, by, btnH - 6, btnH - 6, 6);
    ctx.stroke();

    const icons: Record<TowerType, string> = { arrow: '箭', cannon: '炮', magic: '法', collector: '采' };
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(icons[btn.type], bx + offsetX + (btnH - 6) / 2, by + (btnH - 6) / 2 + 5);

    ctx.fillStyle = '#F1F5F9';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(btn.label, bx + offsetX + btnH + 4, by + 18);

    if (isHovered) {
      ctx.fillStyle = '#FCD34D';
      ctx.font = '11px Arial';
      ctx.fillText(btn.desc, bx + offsetX + btnH + 4, by + 32);
    } else {
      ctx.fillStyle = '#64748B';
      ctx.font = '11px Arial';
      ctx.fillText('悬停查看详情', bx + offsetX + btnH + 4, by + 32);
    }
  }
}

interface UpgradePanel {
  visible: boolean;
  x: number;
  y: number;
  towerId: number;
  hoveredBtn: boolean;
}

function drawUpgradePanel(ctx: CanvasRenderingContext2D, panel: UpgradePanel, tower: Tower, gold: number): void {
  const w = 220;
  const padding = 14;
  const h = 220;

  let px = panel.x;
  let py = panel.y;
  if (px + w > MAP_WIDTH) px = MAP_WIDTH - w - 5;
  if (py + h > MAP_HEIGHT) py = MAP_HEIGHT - h - 5;
  if (px < 5) px = 5;
  if (py < 5) py = 5;

  ctx.fillStyle = 'rgba(17, 24, 39, 0.98)';
  roundRect(ctx, px, py, w, h, 16);
  ctx.fill();

  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, w, h, 16);
  ctx.stroke();

  const names: Record<TowerType, string> = { arrow: '箭塔', cannon: '炮塔', magic: '魔法塔', collector: '采集站' };
  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(names[tower.type], px + padding, py + padding + 6);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('Lv.' + tower.level, px + w - padding, py + padding + 6);

  let y = py + padding + 26;
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + padding, y);
  ctx.lineTo(px + w - padding, y);
  ctx.stroke();
  y += 14;

  ctx.fillStyle = '#94A3B8';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('当前属性:', px + padding, y);
  y += 18;

  const s = tower.stats;
  if (tower.type !== 'collector') {
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '12px Arial';
    ctx.fillText(`伤害: ${s.damage}`, px + padding, y);
    y += 16;
    ctx.fillText(`射程: ${s.range}px`, px + padding, y);
    y += 16;
    ctx.fillText(`射速: ${s.fireRate.toFixed(1)}/秒`, px + padding, y);
    y += 16;
    if (s.splashRange) {
      ctx.fillText(`溅射: ${s.splashRange}px`, px + padding, y);
      y += 16;
    }
    if (s.slowDuration) {
      ctx.fillText(`减速: ${(s.slowAmount! * 100).toFixed(0)}% ${s.slowDuration}s`, px + padding, y);
      y += 16;
    }
  } else {
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '12px Arial';
    ctx.fillText('每3秒采集5金币', px + padding, y);
    y += 16;
  }

  y += 4;
  if (tower.canUpgrade()) {
    const nextStats = tower.getStatsForLevel(tower.level + 1);
    ctx.fillStyle = '#22C55E';
    ctx.font = '12px Arial';
    ctx.fillText(`下一级(Lv.${tower.level + 1}):`, px + padding, y);
    y += 16;
    if (tower.type !== 'collector') {
      const dmgUp = nextStats.damage - s.damage;
      const rateUp = nextStats.fireRate - s.fireRate;
      ctx.fillStyle = '#BBF7D0';
      ctx.fillText(`伤害: ${s.damage} → ${nextStats.damage} (+${dmgUp})`, px + padding, y);
      y += 16;
      if (rateUp !== 0) {
        ctx.fillText(`射速: ${s.fireRate.toFixed(1)} → ${nextStats.fireRate.toFixed(1)}`, px + padding, y);
        y += 16;
      }
      if (nextStats.splashRange && s.splashRange) {
        ctx.fillText(`溅射: ${s.splashRange} → ${nextStats.splashRange}`, px + padding, y);
        y += 16;
      }
      if (nextStats.slowDuration && s.slowDuration) {
        ctx.fillText(`减速: ${s.slowDuration}s → ${nextStats.slowDuration}s`, px + padding, y);
        y += 16;
      }
    }
  } else {
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('★ 已达最高等级 ★', px + padding, y);
    y += 20;
  }

  if (tower.canUpgrade()) {
    const cost = tower.getUpgradeCost();
    const canAfford = gold >= cost;
    const btnY = py + h - 46;
    const btnH = 34;
    const btnW = w - padding * 2;
    const isHovered = panel.hoveredBtn;

    ctx.fillStyle = isHovered
      ? (canAfford ? '#F59E0B' : '#6B7280')
      : (canAfford ? '#D97706' : '#4B5563');
    roundRect(ctx, px + padding, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.strokeStyle = canAfford ? '#FCD34D' : '#6B7280';
    ctx.lineWidth = 2;
    roundRect(ctx, px + padding, btnY, btnW, btnH, 8);
    ctx.stroke();

    ctx.fillStyle = canAfford ? '#111827' : '#9CA3AF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`升级 (${cost} 金币)`, px + w / 2, btnY + 22);
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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
