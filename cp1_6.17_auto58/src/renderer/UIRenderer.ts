import { AI_STATE, TILE } from '../types';
import type { GameState } from '../types';
import type { LoudestSource } from '../audio/SpatialAudioEngine';

export class UIRenderer {
  private ctx: CanvasRenderingContext2D;
  private gameWidth: number;
  private gameHeight: number;
  private lastDirectionUpdate = 0;
  private directionUpdateInterval = 100;

  constructor(canvas: HTMLCanvasElement, gameWidth = 800, gameHeight = 600) {
    this.ctx = canvas.getContext('2d')!;
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    canvas.width = gameWidth;
    canvas.height = gameHeight;
  }

  render(state: GameState, loudest: LoudestSource | null, now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);

    this.renderMinimap(state);
    this.renderPlayerStatus(state);
    this.renderDoorHint(state);

    if (now - this.lastDirectionUpdate > this.directionUpdateInterval) {
      this.lastDirectionUpdate = now;
    }
    this.renderAudioIndicator(state, loudest);
  }

  private renderMinimap(state: GameState): void {
    if (!state.map) return;
    const ctx = this.ctx;
    const size = 200;
    const margin = 15;
    const mapSize = state.map.size;
    const tileSize = size / mapSize;
    const x = margin;
    const y = margin;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);

    for (let my = 0; my < mapSize; my++) {
      for (let mx = 0; mx < mapSize; mx++) {
        const tile = state.map.grid[my][mx];
        const explored = state.explored[my][mx];
        if (!explored) continue;

        const px = x + mx * tileSize;
        const py = y + my * tileSize;

        if (tile === TILE.WALL) {
          ctx.fillStyle = '#4a4a6a';
        } else if (tile === TILE.DOOR) {
          ctx.fillStyle = '#8a6a4a';
        } else if (tile === TILE.GOAL) {
          ctx.fillStyle = '#ff00ff';
        } else {
          ctx.fillStyle = '#2a2a3a';
        }
        ctx.fillRect(px, py, tileSize, tileSize);
      }
    }

    for (const [, pos] of state.lastKnownAIPositions) {
      const ex = x + pos.x * tileSize;
      const ey = y + pos.y * tileSize;
      ctx.fillStyle = '#ff4466';
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const px = x + state.player.x * tileSize;
    const py = y + state.player.y * tileSize;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(
      px + Math.cos(state.player.facing) * 8,
      py + Math.sin(state.player.facing) * 8
    );
    ctx.stroke();
  }

  private renderPlayerStatus(state: GameState): void {
    const ctx = this.ctx;
    const barWidth = 180;
    const barHeight = 14;
    const x = this.gameWidth - barWidth - 15;
    const y = 15;
    const spacing = 22;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 10, y - 10, barWidth + 20, spacing * 3 + 20);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 10, y - 10, barWidth + 20, spacing * 3 + 20);

    this.renderStatusBar(ctx, x, y, barWidth, barHeight, state.player.health, 100, '#ff4466', 'HP');
    this.renderStatusBar(ctx, x, y + spacing, barWidth, barHeight, state.player.stamina, 100, '#44ff66', 'ST');
    this.renderStatusBar(ctx, x, y + spacing * 2, barWidth, barHeight, state.player.exposure, 100, '#ffaa00', 'EXP');
  }

  private renderStatusBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    value: number,
    max: number,
    color: string,
    label: string
  ): void {
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, h);

    const ratio = Math.max(0, Math.min(1, value / max));
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * ratio, h);

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#fff';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${label} ${Math.floor(value)}/${max}`, x + 4, y + h / 2);
  }

  private renderDoorHint(state: GameState): void {
    if (!state.nearestDoor) return;
    const ctx = this.ctx;
    const cx = this.gameWidth / 2;
    const cy = this.gameHeight / 2 + 40;

    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const stateText = state.nearestDoor.open ? '关闭' : '打开';
    ctx.fillText(`[E] ${stateText}门`, cx, cy);
  }

  private renderAudioIndicator(state: GameState, loudest: LoudestSource | null): void {
    const ctx = this.ctx;
    const size = 80;
    const margin = 20;
    const cx = margin + size / 2;
    const cy = this.gameHeight - margin - size / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(angle) * size / 2,
        cy + Math.sin(angle) * size / 2
      );
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 4, 0, Math.PI * 2);
    ctx.stroke();

    if (loudest && loudest.volume > 0.05) {
      const dx = loudest.x - state.player.x;
      const dy = loudest.y - state.player.y;
      const angle = Math.atan2(dy, dx);

      let color = '#ffff00';
      if (loudest.state === AI_STATE.CHASE || loudest.state === AI_STATE.ALERT) {
        color = '#ff4444';
      } else if (loudest.state === 'vent') {
        color = '#00aaaa';
      } else if (loudest.state === 'door') {
        color = '#aa8844';
      }

      const arrowLen = size / 2 * Math.min(1, loudest.volume * 1.5);
      const ax = cx + Math.cos(angle) * arrowLen;
      const ay = cy + Math.sin(angle) * arrowLen;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      const headSize = 6;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - Math.cos(angle - 0.4) * headSize,
        ay - Math.sin(angle - 0.4) * headSize
      );
      ctx.lineTo(
        ax - Math.cos(angle + 0.4) * headSize,
        ay - Math.sin(angle + 0.4) * headSize
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
