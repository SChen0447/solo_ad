import { Terrain, isPassable, CELL_SIZE, GRID_SIZE, SoulFragment, GameMap } from './map';

export interface Player {
  gridX: number;
  gridY: number;
  renderX: number;
  renderY: number;
  bodyColor: string;
  hatColor: string;
  size: number;
  moveCooldown: number;
  moveInterval: number;
  fragments: number;
  invincible: boolean;
  invincibleTimer: number;
  flashTimer: number;
  flashActive: boolean;
  bounceOffset: number;
  bounceTimer: number;
  swayAngle: number;
  swayTimer: number;
  currentTerrain: Terrain;
  hitEffect: { active: boolean; timer: number; maxRadius: number };
  direction: 'up' | 'down' | 'left' | 'right';
}

export function createPlayer(startX: number, startY: number): Player {
  return {
    gridX: startX,
    gridY: startY,
    renderX: startX * CELL_SIZE,
    renderY: startY * CELL_SIZE,
    bodyColor: '#f4a261',
    hatColor: '#e76f51',
    size: 24,
    moveCooldown: 0,
    moveInterval: 150,
    fragments: 0,
    invincible: false,
    invincibleTimer: 0,
    flashTimer: 0,
    flashActive: false,
    bounceOffset: 0,
    bounceTimer: 0,
    swayAngle: 0,
    swayTimer: 0,
    currentTerrain: Terrain.Clearing,
    hitEffect: { active: false, timer: 0, maxRadius: 20 },
    direction: 'down',
  };
}

export function updatePlayer(
  player: Player,
  dt: number,
  keys: Set<string>,
  grid: Terrain[][],
  fragments: SoulFragment[],
  onFragmentCollected?: () => void
): void {
  player.moveCooldown -= dt;
  if (player.moveCooldown <= 0) {
    let dx = 0;
    let dy = 0;
    if (keys.has('w') || keys.has('W')) { dy = -1; player.direction = 'up'; }
    else if (keys.has('s') || keys.has('S')) { dy = 1; player.direction = 'down'; }
    else if (keys.has('a') || keys.has('A')) { dx = -1; player.direction = 'left'; }
    else if (keys.has('d') || keys.has('D')) { dx = 1; player.direction = 'right'; }

    if (dx !== 0 || dy !== 0) {
      const newX = player.gridX + dx;
      const newY = player.gridY + dy;

      if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
        const targetTerrain = grid[newY][newX];
        if (isPassable(targetTerrain)) {
          player.gridX = newX;
          player.gridY = newY;
          player.currentTerrain = targetTerrain;

          if (targetTerrain === Terrain.Stone) {
            player.bounceTimer = 200;
          }
          if (targetTerrain === Terrain.Clearing) {
            player.swayTimer = 300;
          }

          for (const frag of fragments) {
            if (!frag.collected && frag.x === newX && frag.y === newY) {
              frag.collected = true;
              player.fragments++;
              if (onFragmentCollected) onFragmentCollected();
            }
          }
        } else {
          player.flashActive = true;
          player.flashTimer = 100;
        }
      }
      player.moveCooldown = player.moveInterval;
    }
  }

  const targetRenderX = player.gridX * CELL_SIZE;
  const targetRenderY = player.gridY * CELL_SIZE;
  const lerpSpeed = 0.15;
  player.renderX += (targetRenderX - player.renderX) * lerpSpeed;
  player.renderY += (targetRenderY - player.renderY) * lerpSpeed;

  if (player.flashActive) {
    player.flashTimer -= dt;
    if (player.flashTimer <= 0) {
      player.flashActive = false;
    }
  }

  if (player.bounceTimer > 0) {
    player.bounceTimer -= dt;
    const progress = player.bounceTimer / 200;
    player.bounceOffset = Math.sin(progress * Math.PI) * 3;
  } else {
    player.bounceOffset = 0;
  }

  if (player.swayTimer > 0) {
    player.swayTimer -= dt;
    const progress = player.swayTimer / 300;
    player.swayAngle = Math.sin(progress * Math.PI * 2) * 5 * (Math.PI / 180);
  } else {
    player.swayAngle = 0;
  }

  if (player.invincible) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
    }
  }

  if (player.hitEffect.active) {
    player.hitEffect.timer -= dt;
    if (player.hitEffect.timer <= 0) {
      player.hitEffect.active = false;
    }
  }
}

export function hitPlayer(player: Player): boolean {
  if (player.invincible || player.fragments <= 0) return false;
  player.fragments--;
  player.invincible = true;
  player.invincibleTimer = 500;
  player.hitEffect.active = true;
  player.hitEffect.timer = 300;
  return true;
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, time: number): void {
  const cx = player.renderX + CELL_SIZE / 2;
  const cy = player.renderY + CELL_SIZE / 2 - player.bounceOffset;
  const halfSize = player.size / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(player.swayAngle);

  if (player.invincible && Math.floor(time / 80) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  ctx.fillStyle = player.bodyColor;
  ctx.fillRect(-halfSize / 2, -2, halfSize, halfSize + 2);

  ctx.fillStyle = '#e9c46a';
  ctx.fillRect(-halfSize / 2 - 2, 4, 3, halfSize - 4);
  ctx.fillRect(halfSize / 2 - 1, 4, 3, halfSize - 4);

  ctx.fillStyle = player.hatColor;
  ctx.fillRect(-halfSize / 2 - 2, -6, halfSize + 4, 5);
  ctx.fillRect(-halfSize / 2 + 1, -10, halfSize - 2, 5);

  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(-4, -3, 2, 2);
  ctx.fillRect(2, -3, 2, 2);

  ctx.restore();

  if (player.flashActive) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(player.gridX * CELL_SIZE, player.gridY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.restore();
  }

  if (player.hitEffect.active) {
    const progress = 1 - player.hitEffect.timer / 300;
    const radius = progress * player.hitEffect.maxRadius;
    ctx.save();
    ctx.globalAlpha = 0.6 * (1 - progress);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
