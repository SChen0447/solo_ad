import type { RenderData, Room, Enemy, Player, Corridor } from '../types';

const CORRIDOR_COLOR = '#2A2A40';
const PATROL_PATH_COLOR = '#555';
const STATUS_BG_COLOR = 'rgba(45, 45, 45, 0.9)';
const TEXT_COLOR = '#E0E0E0';
const FPS_COLOR = '#9CA3AF';
const PLAYER_INNER = '#3B82F6';
const PLAYER_OUTER = '#1D4ED8';
const ENEMY_CENTER = '#EF4444';
const ENEMY_EDGE = '#B91C1C';
const GLOW_COLOR = 'rgba(255, 255, 255, 0.1)';
const HIT_COLOR = '#EF4444';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private frameCount: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  render(data: RenderData): void {
    this.frameCount++;
    const jitter = (this.frameCount % 2 === 0) ? 1 : 0;
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#1A1A2E';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.drawCorridors(data.dungeon.corridors);
    
    this.drawRooms(data.dungeon.rooms, data.player);
    
    this.drawPatrolPaths(data.enemies);
    
    this.drawEnemies(data.enemies, jitter);
    
    this.drawPlayer(data.player, jitter);
    
    this.drawStatusBar(data);
    
    this.drawFPS(data.fps);
    
    if (data.transitionAlpha > 0) {
      this.drawTransition(data.transitionAlpha);
    }
  }

  private drawCorridors(corridors: Corridor[]): void {
    this.ctx.fillStyle = CORRIDOR_COLOR;
    
    for (const corridor of corridors) {
      for (let i = 0; i < corridor.path.length - 1; i++) {
        const p1 = corridor.path[i];
        const p2 = corridor.path[i + 1];
        
        const minX = Math.min(p1.x, p2.x) - 10;
        const maxX = Math.max(p1.x, p2.x) + 10;
        const minY = Math.min(p1.y, p2.y) - 10;
        const maxY = Math.max(p1.y, p2.y) + 10;
        
        this.ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      }
    }
  }

  private drawRooms(rooms: Room[], player: Player): void {
    for (const room of rooms) {
      this.ctx.fillStyle = room.floorColor;
      this.ctx.fillRect(room.x, room.y, room.width, room.height);
      
      this.ctx.strokeStyle = room.wallColor;
      this.ctx.lineWidth = 4;
      this.ctx.strokeRect(room.x, room.y, room.width, room.height);
      
      const distToPlayer = this.getDistanceToPlayer(room, player);
      if (distToPlayer < 100) {
        const gradient = this.ctx.createRadialGradient(
          player.x, player.y, 0,
          player.x, player.y, 80
        );
        gradient.addColorStop(0, GLOW_COLOR);
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(room.x, room.y, room.width, room.height);
      }
    }
  }

  private getDistanceToPlayer(room: Room, player: Player): number {
    const roomCenterX = room.x + room.width / 2;
    const roomCenterY = room.y + room.height / 2;
    const dx = player.x - roomCenterX;
    const dy = player.y - roomCenterY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private drawPatrolPaths(enemies: Enemy[]): void {
    this.ctx.save();
    this.ctx.strokeStyle = PATROL_PATH_COLOR;
    this.ctx.globalAlpha = 0.5;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 8]);
    
    for (const enemy of enemies) {
      if (enemy.patrolPath.length < 2) continue;
      
      this.ctx.beginPath();
      this.ctx.moveTo(enemy.patrolPath[0].x, enemy.patrolPath[0].y);
      
      for (let i = 1; i < enemy.patrolPath.length; i++) {
        this.ctx.lineTo(enemy.patrolPath[i].x, enemy.patrolPath[i].y);
      }
      
      this.ctx.lineTo(enemy.patrolPath[0].x, enemy.patrolPath[0].y);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  private drawPlayer(player: Player, jitter: number): void {
    const x = player.x + jitter;
    const y = player.y;
    
    if (player.isHit) {
      this.ctx.save();
      this.ctx.strokeStyle = HIT_COLOR;
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
    gradient.addColorStop(0, PLAYER_INNER);
    gradient.addColorStop(1, PLAYER_OUTER);
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, player.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawEnemies(enemies: Enemy[], jitter: number): void {
    for (const enemy of enemies) {
      const x = enemy.x + jitter;
      const y = enemy.y;
      const size = enemy.size;
      
      const gradient = this.ctx.createRadialGradient(
        x, y, 0,
        x, y, size
      );
      gradient.addColorStop(0, ENEMY_CENTER);
      gradient.addColorStop(1, ENEMY_EDGE);
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - size);
      this.ctx.lineTo(x + size, y);
      this.ctx.lineTo(x, y + size);
      this.ctx.lineTo(x - size, y);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawStatusBar(data: RenderData): void {
    this.ctx.fillStyle = STATUS_BG_COLOR;
    this.ctx.fillRect(0, 0, this.width, 50);
    
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = TEXT_COLOR;
    this.ctx.textBaseline = 'middle';
    
    const currentRoom = data.dungeon.rooms.find(r => r.id === data.currentRoomId);
    if (currentRoom) {
      const roomText = `Room [${currentRoom.gridX},${currentRoom.gridY}]`;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(roomText, 20, 25);
    }
    
    const monsterText = `M: ${data.enemies.length}`;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(monsterText, this.width - 20, 25);
  }

  private drawFPS(fps: number): void {
    this.ctx.font = '12px "Courier New", monospace';
    this.ctx.fillStyle = FPS_COLOR;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(`FPS: ${fps.toFixed(0)}`, this.width - 10, this.height - 10);
  }

  private drawTransition(alpha: number): void {
    this.ctx.fillStyle = `rgba(26, 26, 46, ${alpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
