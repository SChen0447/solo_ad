import { AI_STATE, TILE } from '../types';
import type { AIAgent, GameState, MapData, Player } from '../types';

const COLORS = {
  BG: '#0a0a1a',
  WALL: '#2a2a4a',
  FLOOR: '#1a1a2a',
  FLOOR_CARPET: '#1e1a2e',
  PLAYER: '#00ff88',
  AI: '#ff4466',
  AI_ALERT: '#ffaa00',
  DOOR_CLOSED: '#6a4a3a',
  DOOR_OPEN: '#3a3a4a',
  VENT: '#00aaaa',
  GOAL: '#ff00ff',
  START: '#00ffaa',
  NEON_CYAN: '#00ffff',
};

export class MapRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private tileSize: number;
  private gameWidth: number;
  private gameHeight: number;

  constructor(canvas: HTMLCanvasElement, gameWidth = 800, gameHeight = 600) {
    this.ctx = canvas.getContext('2d')!;
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.width = gameWidth;
    this.height = gameHeight;
    this.tileSize = 8;
    canvas.width = gameWidth;
    canvas.height = gameHeight;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(state: GameState): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);

    if (!state.map) return;

    const { map, player, ais, explored } = state;
    this.tileSize = this.gameWidth / map.size * 2;

    const offsetX = this.gameWidth / 2 - player.x * this.tileSize;
    const offsetY = this.gameHeight / 2 - player.y * this.tileSize;

    ctx.save();

    this.renderMap(map, explored, offsetX, offsetY, player);
    this.renderVents(map, offsetX, offsetY);
    this.renderDoors(map, offsetX, offsetY);
    this.renderAIs(ais, offsetX, offsetY);
    this.renderPlayer(player, offsetX, offsetY);

    ctx.restore();

    this.renderNeonBorder();
    this.renderAlertPulse(state);
  }

  private renderMap(
    map: MapData,
    explored: boolean[][],
    offsetX: number,
    offsetY: number,
    player: Player
  ): void {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const viewRange = this.gameWidth / ts / 2 + 5;
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);

    for (let y = Math.max(0, py - viewRange); y < Math.min(map.size, py + viewRange); y++) {
      for (let x = Math.max(0, px - viewRange); x < Math.min(map.size, px + viewRange); x++) {
        const tile = map.grid[y][x];
        const screenX = x * ts + offsetX;
        const screenY = y * ts + offsetY;

        if (screenX + ts < 0 || screenX > this.gameWidth ||
            screenY + ts < 0 || screenY > this.gameHeight) continue;

        if (!explored[y][x]) {
          ctx.fillStyle = '#050510';
          ctx.fillRect(screenX, screenY, ts, ts);
          continue;
        }

        if (tile === TILE.WALL) {
          ctx.fillStyle = COLORS.WALL;
          ctx.fillRect(screenX, screenY, ts, ts);
          ctx.fillStyle = '#3a3a5a';
          ctx.fillRect(screenX, screenY, ts, 1);
          ctx.fillRect(screenX, screenY, 1, ts);
        } else {
          const isCarpet = map.floorType[y][x] === 1;
          ctx.fillStyle = isCarpet ? COLORS.FLOOR_CARPET : COLORS.FLOOR;
          ctx.fillRect(screenX, screenY, ts, ts);

          if ((x + y) % 8 === 0) {
            ctx.fillStyle = isCarpet ? '#221e32' : '#1e1e2e';
            ctx.fillRect(screenX, screenY, 1, ts);
          }

          if (tile === TILE.START) {
            ctx.fillStyle = COLORS.START;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(screenX + 1, screenY + 1, ts - 2, ts - 2);
            ctx.globalAlpha = 1;
          } else if (tile === TILE.GOAL) {
            ctx.fillStyle = COLORS.GOAL;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(screenX + 1, screenY + 1, ts - 2, ts - 2);
            ctx.globalAlpha = 1;
          }
        }
      }
    }
  }

  private renderVents(map: MapData, offsetX: number, offsetY: number): void {
    const ctx = this.ctx;
    const ts = this.tileSize;
    for (const vent of map.vents) {
      const sx = vent.x * ts + offsetX;
      const sy = vent.y * ts + offsetY;
      ctx.fillStyle = COLORS.VENT;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(sx + ts * 0.2, sy + ts * 0.2, ts * 0.6, ts * 0.6);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = COLORS.VENT;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + ts * 0.2, sy + ts * 0.2, ts * 0.6, ts * 0.6);
    }
  }

  private renderDoors(map: MapData, offsetX: number, offsetY: number): void {
    const ctx = this.ctx;
    const ts = this.tileSize;
    for (const door of map.doors) {
      const sx = door.x * ts + offsetX;
      const sy = door.y * ts + offsetY;
      const prog = door.animProgress;

      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);

      const isHorizontal = (
        map.grid[door.y]?.[door.x - 1] === TILE.WALL &&
        map.grid[door.y]?.[door.x + 1] === TILE.WALL
      );

      ctx.fillStyle = door.open ? COLORS.DOOR_OPEN : COLORS.DOOR_CLOSED;
      if (isHorizontal) {
        const doorHeight = ts * 0.8;
        const doorWidth = ts * (1 - prog) * 0.9;
        ctx.fillRect(sx + 1, sy + (ts - doorHeight) / 2, doorWidth, doorHeight);
      } else {
        const doorWidth = ts * 0.8;
        const doorHeight = ts * (1 - prog) * 0.9;
        ctx.fillRect(sx + (ts - doorWidth) / 2, sy + 1, doorWidth, doorHeight);
      }

      ctx.strokeStyle = COLORS.NEON_CYAN;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx + 1, sy + 1, ts - 2, ts - 2);
      ctx.globalAlpha = 1;
    }
  }

  private renderAIs(ais: AIAgent[], offsetX: number, offsetY: number): void {
    const ctx = this.ctx;
    const ts = this.tileSize;
    for (const ai of ais) {
      const ix = ai.x;
      const iy = ai.y;
      const px = ix * ts + offsetX;
      const py = iy * ts + offsetY;

      ctx.fillStyle = ai.state === AI_STATE.CHASE ? COLORS.AI_ALERT : COLORS.AI;
      ctx.beginPath();
      ctx.arc(px, py, ts * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = ai.state === AI_STATE.CHASE ? '#ffcc00' : '#ff6688';
      ctx.lineWidth = 1;
      ctx.stroke();

      const dx = Math.cos(ai.facing) * ts * 0.7;
      const dy = Math.sin(ai.facing) * ts * 0.7;
      ctx.strokeStyle = ai.state === AI_STATE.CHASE ? '#ffcc00' : '#ff88aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + dx, py + dy);
      ctx.stroke();

      if (ai.state === AI_STATE.CHASE || ai.state === AI_STATE.ALERT) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(px, py, ts * 8, ai.facing - Math.PI / 4, ai.facing + Math.PI / 4);
        ctx.lineTo(px, py);
        ctx.closePath();
        ctx.fill();
      }

      if (ai.showAlert > 0) {
        ctx.globalAlpha = ai.showAlert;
        ctx.fillStyle = '#ffff00';
        ctx.font = `bold ${ts * 1.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', px, py - ts * 1.5);
        ctx.globalAlpha = 1;
      }
    }
  }

  private renderPlayer(player: Player, offsetX: number, offsetY: number): void {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const px = player.x * ts + offsetX;
    const py = player.y * ts + offsetY;

    ctx.shadowColor = COLORS.PLAYER;
    ctx.shadowBlur = 8;
    ctx.fillStyle = COLORS.PLAYER;
    ctx.beginPath();
    ctx.arc(px, py, ts * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const dx = Math.cos(player.facing) * ts * 0.8;
    const dy = Math.sin(player.facing) * ts * 0.8;
    ctx.strokeStyle = '#88ffcc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + dx, py + dy);
    ctx.stroke();
  }

  private renderNeonBorder(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 8;
    ctx.strokeRect(2, 2, this.gameWidth - 4, this.gameHeight - 4);
    ctx.shadowBlur = 0;
  }

  private renderAlertPulse(state: GameState): void {
    if (!state.isAlertActive) return;
    const ctx = this.ctx;
    const pulse = (Math.sin(state.alertPulse) + 1) / 2;
    ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + pulse * 0.5})`;
    ctx.lineWidth = 4 + pulse * 6;
    ctx.strokeRect(0, 0, this.gameWidth, this.gameHeight);
  }
}
