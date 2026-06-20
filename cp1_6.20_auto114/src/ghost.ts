import { CELL_SIZE, GRID_SIZE, Terrain, isPassable } from './map';

export interface Ghost {
  gridX: number;
  gridY: number;
  renderX: number;
  renderY: number;
  size: number;
  moveTimer: number;
  moveInterval: number;
  deviationAngle: number;
  floatPhase: number;
}

export function createGhosts(grid: Terrain[][], playerX: number, playerY: number, count: number = 3): Ghost[] {
  const ghosts: Ghost[] = [];
  const passableCells: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (isPassable(grid[y][x]) && (Math.abs(x - playerX) + Math.abs(y - playerY)) > 4) {
        passableCells.push({ x, y });
      }
    }
  }

  for (let i = 0; i < count && passableCells.length > 0; i++) {
    const idx = Math.floor(Math.random() * passableCells.length);
    const cell = passableCells.splice(idx, 1)[0];
    ghosts.push({
      gridX: cell.x,
      gridY: cell.y,
      renderX: cell.x * CELL_SIZE,
      renderY: cell.y * CELL_SIZE,
      size: 20,
      moveTimer: 0,
      moveInterval: 500,
      deviationAngle: 15 * (Math.PI / 180),
      floatPhase: Math.random() * Math.PI * 2,
    });
  }

  return ghosts;
}

export function updateGhosts(
  ghosts: Ghost[],
  dt: number,
  playerX: number,
  playerY: number,
  grid: Terrain[][]
): void {
  for (const ghost of ghosts) {
    ghost.moveTimer += dt;
    ghost.floatPhase += dt * 0.003;

    if (ghost.moveTimer >= ghost.moveInterval) {
      ghost.moveTimer = 0;

      let dx = playerX - ghost.gridX;
      let dy = playerY - ghost.gridY;

      if (Math.random() < 0.3) {
        const angle = Math.atan2(dy, dx);
        const deviation = (Math.random() - 0.5) * 2 * ghost.deviationAngle;
        const newAngle = angle + deviation;
        dx = Math.round(Math.cos(newAngle));
        dy = Math.round(Math.sin(newAngle));
      } else {
        if (Math.abs(dx) >= Math.abs(dy)) {
          dy = 0;
          dx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
        } else {
          dx = 0;
          dy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
        }
      }

      const newX = ghost.gridX + dx;
      const newY = ghost.gridY + dy;

      if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
        if (isPassable(grid[newY][newX])) {
          ghost.gridX = newX;
          ghost.gridY = newY;
        }
      }
    }

    const targetRenderX = ghost.gridX * CELL_SIZE;
    const targetRenderY = ghost.gridY * CELL_SIZE;
    const lerpSpeed = 0.1;
    ghost.renderX += (targetRenderX - ghost.renderX) * lerpSpeed;
    ghost.renderY += (targetRenderY - ghost.renderY) * lerpSpeed;
  }
}

export function checkGhostCollision(
  ghosts: Ghost[],
  playerGridX: number,
  playerGridY: number
): boolean {
  for (const ghost of ghosts) {
    if (ghost.gridX === playerGridX && ghost.gridY === playerGridY) {
      return true;
    }
  }
  return false;
}

export function drawGhosts(ctx: CanvasRenderingContext2D, ghosts: Ghost[], time: number): void {
  for (const ghost of ghosts) {
    const cx = ghost.renderX + CELL_SIZE / 2;
    const cy = ghost.renderY + CELL_SIZE / 2 + Math.sin(ghost.floatPhase) * 2;
    const halfSize = ghost.size / 2;

    ctx.save();

    const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, halfSize + 12);
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    glowGradient.addColorStop(0.5, 'rgba(200, 200, 255, 0.06)');
    glowGradient.addColorStop(1, 'rgba(200, 200, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, halfSize + 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.3 + 0.1 * Math.sin(time * 0.002 + ghost.floatPhase);
    ctx.fillStyle = '#ffffff';

    ctx.beginPath();
    ctx.arc(cx, cy - 3, halfSize * 0.7, Math.PI, 0);
    ctx.lineTo(cx + halfSize * 0.7, cy + halfSize * 0.4);

    const waveCount = 3;
    const waveWidth = (halfSize * 1.4) / waveCount;
    for (let i = 0; i < waveCount; i++) {
      const wx = cx + halfSize * 0.7 - i * waveWidth;
      const wy = cy + halfSize * 0.4 + (i % 2 === 0 ? 3 : 0);
      ctx.lineTo(wx - waveWidth, wy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 3, cy - 4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
