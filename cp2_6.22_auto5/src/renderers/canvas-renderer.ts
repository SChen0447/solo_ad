import type { RenderData, Room, Corridor, Position } from '../types';

const FLOOR_COLOR = '#1A1A2E';
const CORRIDOR_COLOR = '#2A2A40';
const PATH_COLOR = '#555';
const STATUS_BAR_BG = 'rgba(45, 45, 45, 0.9)';
const TEXT_COLOR = '#E0E0E0';
const FPS_COLOR = '#9CA3AF';
const WALL_THICKNESS = 4;

class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  render(data: RenderData): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    this.drawCorridors(data.roomData.corridors);
    this.drawRooms(data);
    this.drawEnemyPaths(data.enemies);
    this.drawPlayer(data);
    this.drawEnemies(data);
    this.drawPlayerGlow(data);
    this.drawStatusBar(data);
    this.drawFPS(data.fps);
    this.drawTransition(data.transitionAlpha);
  }

  private drawBackground(): void {
    this.ctx.fillStyle = FLOOR_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawCorridors(corridors: Corridor[]): void {
    this.ctx.fillStyle = CORRIDOR_COLOR;
    const corridorWidth = 16;

    for (const corridor of corridors) {
      const dx = corridor.to.x - corridor.from.x;
      const dy = corridor.to.y - corridor.from.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        const x = Math.min(corridor.from.x, corridor.to.x);
        const width = Math.abs(dx);
        this.ctx.fillRect(x, corridor.from.y - corridorWidth / 2, width, corridorWidth);
      } else {
        const y = Math.min(corridor.from.y, corridor.to.y);
        const height = Math.abs(dy);
        this.ctx.fillRect(corridor.from.x - corridorWidth / 2, y, corridorWidth, height);
      }
    }
  }

  private drawRooms(data: RenderData): void {
    const { rooms } = data.roomData;
    const { currentRoomCoord, player } = data;

    for (const room of rooms) {
      this.ctx.fillStyle = FLOOR_COLOR;
      this.ctx.fillRect(room.x, room.y, room.width, room.height);

      this.ctx.fillStyle = room.wallColor;
      this.ctx.fillRect(room.x - WALL_THICKNESS, room.y - WALL_THICKNESS, room.width + WALL_THICKNESS * 2, WALL_THICKNESS);
      this.ctx.fillRect(room.x - WALL_THICKNESS, room.y + room.height, room.width + WALL_THICKNESS * 2, WALL_THICKNESS);
      this.ctx.fillRect(room.x - WALL_THICKNESS, room.y, WALL_THICKNESS, room.height);
      this.ctx.fillRect(room.x + room.width, room.y, WALL_THICKNESS, room.height);

      if (room.gridX === currentRoomCoord.x && room.gridY === currentRoomCoord.y) {
        this.drawRoomGlow(room, player);
      }
    }
  }

  private drawRoomGlow(room: Room, player: { x: number; y: number }): void {
    const gradient = this.ctx.createRadialGradient(
      player.x, player.y, 0,
      player.x, player.y, 150
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(room.x, room.y, room.width, room.height);
    this.ctx.clip();
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(room.x - 50, room.y - 50, room.width + 100, room.height + 100);
    this.ctx.restore();
  }

  private drawPlayerGlow(data: RenderData): void {
    const { player } = data;
    const gradient = this.ctx.createRadialGradient(
      player.x, player.y, 0,
      player.x, player.y, 30
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawEnemyPaths(enemies: RenderData['enemies']): void {
    this.ctx.save();
    this.ctx.strokeStyle = PATH_COLOR;
    this.ctx.globalAlpha = 0.5;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 8]);

    for (const enemy of enemies) {
      if (enemy.path.length < 2) continue;

      this.ctx.beginPath();
      this.ctx.moveTo(enemy.path[0].x, enemy.path[0].y);

      for (let i = 1; i < enemy.path.length; i++) {
        this.ctx.lineTo(enemy.path[i].x, enemy.path[i].y);
      }

      this.ctx.lineTo(enemy.path[0].x, enemy.path[0].y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawPlayer(data: RenderData): void {
    const { player, playerJitter } = data;
    const x = player.x + playerJitter.x;
    const y = player.y + playerJitter.y;

    if (player.isHit) {
      this.ctx.save();
      this.ctx.strokeStyle = '#EF4444';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(x, y, player.radius + 4, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    const gradient = this.ctx.createRadialGradient(
      x - 3, y - 3, 0,
      x, y, player.radius
    );
    gradient.addColorStop(0, '#3B82F6');
    gradient.addColorStop(1, '#1D4ED8');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, player.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#60A5FA';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawEnemies(data: RenderData): void {
    const { enemies, enemyJitters } = data;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const jitter = enemyJitters[i];
      this.drawDiamond(enemy, jitter);
    }
  }

  private drawDiamond(enemy: RenderData['enemies'][0], jitter: Position): void {
    const x = enemy.x + jitter.x;
    const y = enemy.y + jitter.y;
    const halfSize = enemy.size / 2;

    const gradient = this.ctx.createRadialGradient(
      x, y, 0,
      x, y, halfSize
    );
    gradient.addColorStop(0, '#EF4444');
    gradient.addColorStop(1, '#B91C1C');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - halfSize);
    this.ctx.lineTo(x + halfSize, y);
    this.ctx.lineTo(x, y + halfSize);
    this.ctx.lineTo(x - halfSize, y);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = '#F87171';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawStatusBar(data: RenderData): void {
    this.ctx.fillStyle = STATUS_BAR_BG;
    this.ctx.fillRect(0, 0, this.width, 50);

    this.ctx.fillStyle = TEXT_COLOR;
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.textBaseline = 'middle';

    this.ctx.textAlign = 'left';
    this.ctx.fillText(
      `Room [${data.currentRoomCoord.x},${data.currentRoomCoord.y}]`,
      20,
      25
    );

    this.ctx.textAlign = 'right';
    this.ctx.fillText(`M: ${data.enemyCount}`, this.width - 20, 25);
  }

  private drawFPS(fps: number): void {
    this.ctx.fillStyle = FPS_COLOR;
    this.ctx.font = '12px "Courier New", monospace';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(`FPS: ${fps}`, this.width - 10, this.height - 10);
  }

  private drawTransition(alpha: number): void {
    if (alpha <= 0) return;

    this.ctx.fillStyle = `rgba(26, 26, 46, ${alpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}

export default CanvasRenderer;
