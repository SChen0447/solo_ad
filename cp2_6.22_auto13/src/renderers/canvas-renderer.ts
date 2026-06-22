import type { RenderData, Room, Enemy, Player, Corridor, Decoration } from '../types';

const CORRIDOR_COLOR = '#2A2A40';
const PATROL_PATH_COLOR = '#888';
const PATROL_DOT_COLOR = '#AAA';
const STATUS_BG_COLOR = 'rgba(45, 45, 45, 0.9)';
const TEXT_COLOR = '#E0E0E0';
const FPS_COLOR = '#9CA3AF';
const PLAYER_INNER = '#3B82F6';
const PLAYER_OUTER = '#1D4ED8';
const ENEMY_CENTER = '#EF4444';
const ENEMY_EDGE = '#B91C1C';
const GLOW_COLOR = 'rgba(255, 255, 255, 0.1)';
const HIT_COLOR = '#EF4444';
const WALL_SHADOW_INNER = 'rgba(0, 0, 0, 0.5)';
const WALL_SHADOW_MID = 'rgba(0, 0, 0, 0.2)';
const CORRIDOR_EDGE_COLOR = 'rgba(60, 60, 80, 0.6)';
const BRICK_LINE_COLOR = 'rgba(50, 50, 70, 0.3)';
const PILLAR_COLOR = '#4A4A5A';
const PILLAR_HIGHLIGHT = '#5A5A6A';
const RUBBLE_COLOR = '#3A3A4A';
const RUBBLE_HIGHLIGHT = '#4A4A5A';
const CHEST_COLOR = '#8B6914';
const CHEST_HIGHLIGHT = '#A67C1A';
const CHEST_LOCK_COLOR = '#C0C0C0';

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

    this.drawDecorations(data.dungeon.rooms);

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
    for (const corridor of corridors) {
      for (let i = 0; i < corridor.path.length - 1; i++) {
        const p1 = corridor.path[i];
        const p2 = corridor.path[i + 1];

        const isVertical = Math.abs(p1.x - p2.x) < 1;
        const minX = Math.min(p1.x, p2.x) - 10;
        const maxX = Math.max(p1.x, p2.x) + 10;
        const minY = Math.min(p1.y, p2.y) - 10;
        const maxY = Math.max(p1.y, p2.y) + 10;
        const segW = maxX - minX;
        const segH = maxY - minY;

        const grad = this.ctx.createLinearGradient(
          minX, minY,
          isVertical ? minX + segW : minX,
          isVertical ? minY : minY + segH
        );
        grad.addColorStop(0, 'rgba(0,0,0,0.2)');
        grad.addColorStop(0.15, CORRIDOR_COLOR);
        grad.addColorStop(0.85, CORRIDOR_COLOR);
        grad.addColorStop(1, 'rgba(0,0,0,0.2)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(minX, minY, segW, segH);

        this.drawBrickPattern(minX, minY, segW, segH, isVertical);

        this.ctx.save();
        this.ctx.strokeStyle = CORRIDOR_EDGE_COLOR;
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([6, 4]);

        if (isVertical) {
          this.ctx.beginPath();
          this.ctx.moveTo(minX, minY);
          this.ctx.lineTo(minX, maxY);
          this.ctx.stroke();
          this.ctx.beginPath();
          this.ctx.moveTo(maxX, minY);
          this.ctx.lineTo(maxX, maxY);
          this.ctx.stroke();
        } else {
          this.ctx.beginPath();
          this.ctx.moveTo(minX, minY);
          this.ctx.lineTo(maxX, minY);
          this.ctx.stroke();
          this.ctx.beginPath();
          this.ctx.moveTo(minX, maxY);
          this.ctx.lineTo(maxX, maxY);
          this.ctx.stroke();
        }

        this.ctx.restore();
      }
    }
  }

  private drawBrickPattern(x: number, y: number, w: number, h: number, isVertical: boolean): void {
    this.ctx.save();
    this.ctx.strokeStyle = BRICK_LINE_COLOR;
    this.ctx.lineWidth = 0.5;
    this.ctx.setLineDash([]);

    const brickLen = 12;
    const brickH = 8;

    if (isVertical) {
      let row = 0;
      for (let by = y; by < y + h; by += brickH) {
        const offset = (row % 2) * (brickLen / 2);
        for (let bx = x + offset; bx < x + w; bx += brickLen) {
          this.ctx.strokeRect(bx, by, brickLen, brickH);
        }
        row++;
      }
    } else {
      let col = 0;
      for (let bx = x; bx < x + w; bx += brickLen) {
        const offset = (col % 2) * (brickH / 2);
        for (let by = y + offset; by < y + h; by += brickH) {
          this.ctx.strokeRect(bx, by, brickLen, brickH);
        }
        col++;
      }
    }

    this.ctx.restore();
  }

  private drawRooms(rooms: Room[], player: Player): void {
    for (const room of rooms) {
      this.ctx.fillStyle = room.floorColor;
      this.ctx.fillRect(room.x, room.y, room.width, room.height);

      this.drawWallInnerShadow(room);

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

  private drawWallInnerShadow(room: Room): void {
    const w = room.width;
    const h = room.height;
    const x = room.x;
    const y = room.y;
    const border = 6;

    this.ctx.save();

    this.ctx.strokeStyle = room.wallColor;
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(x, y, w, h);

    const topGrad = this.ctx.createLinearGradient(x, y, x, y + border);
    topGrad.addColorStop(0, WALL_SHADOW_INNER);
    topGrad.addColorStop(1, 'transparent');
    this.ctx.fillStyle = topGrad;
    this.ctx.fillRect(x, y, w, border);

    const bottomGrad = this.ctx.createLinearGradient(x, y + h, x, y + h - border);
    bottomGrad.addColorStop(0, WALL_SHADOW_INNER);
    bottomGrad.addColorStop(1, 'transparent');
    this.ctx.fillStyle = bottomGrad;
    this.ctx.fillRect(x, y + h - border, w, border);

    const leftGrad = this.ctx.createLinearGradient(x, y, x + border, y);
    leftGrad.addColorStop(0, WALL_SHADOW_INNER);
    leftGrad.addColorStop(1, 'transparent');
    this.ctx.fillStyle = leftGrad;
    this.ctx.fillRect(x, y, border, h);

    const rightGrad = this.ctx.createLinearGradient(x + w, y, x + w - border, y);
    rightGrad.addColorStop(0, WALL_SHADOW_INNER);
    rightGrad.addColorStop(1, 'transparent');
    this.ctx.fillStyle = rightGrad;
    this.ctx.fillRect(x + w - border, y, border, h);

    const mid = 12;
    const topMid = this.ctx.createLinearGradient(x, y, x, y + mid);
    topMid.addColorStop(0, WALL_SHADOW_MID);
    topMid.addColorStop(1, 'transparent');
    this.ctx.fillStyle = topMid;
    this.ctx.fillRect(x, y, w, mid);

    const leftMid = this.ctx.createLinearGradient(x, y, x + mid, y);
    leftMid.addColorStop(0, WALL_SHADOW_MID);
    leftMid.addColorStop(1, 'transparent');
    this.ctx.fillStyle = leftMid;
    this.ctx.fillRect(x, y, mid, h);

    this.ctx.restore();
  }

  private drawDecorations(rooms: Room[]): void {
    for (const room of rooms) {
      for (const deco of room.decorations) {
        switch (deco.type) {
          case 'pillar':
            this.drawPillar(deco);
            break;
          case 'rubble':
            this.drawRubble(deco);
            break;
          case 'chest':
            this.drawChest(deco);
            break;
        }
      }
    }
  }

  private drawPillar(deco: Decoration): void {
    const { x, y, size } = deco;
    const r = size;

    const grad = this.ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.3, 0,
      x, y, r
    );
    grad.addColorStop(0, PILLAR_HIGHLIGHT);
    grad.addColorStop(1, PILLAR_COLOR);

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this.ctx.beginPath();
    this.ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawRubble(deco: Decoration): void {
    const { x, y, size } = deco;
    const count = 3 + Math.floor(size / 4);

    for (let i = 0; i < count; i++) {
      const ox = (i % 2 === 0 ? -1 : 1) * size * 0.3 + (i * 1.5 - count);
      const oy = (i < 2 ? -1 : 1) * size * 0.2;
      const rs = size * (0.3 + (i % 3) * 0.15);

      const grad = this.ctx.createRadialGradient(
        x + ox - rs * 0.2, y + oy - rs * 0.2, 0,
        x + ox, y + oy, rs
      );
      grad.addColorStop(0, RUBBLE_HIGHLIGHT);
      grad.addColorStop(1, RUBBLE_COLOR);

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(x + ox, y + oy - rs);
      this.ctx.lineTo(x + ox + rs, y + oy);
      this.ctx.lineTo(x + ox, y + oy + rs * 0.6);
      this.ctx.lineTo(x + ox - rs, y + oy);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawChest(deco: Decoration): void {
    const { x, y, size } = deco;
    const hw = size * 1.2;
    const hh = size * 0.7;

    const bodyGrad = this.ctx.createLinearGradient(x - hw, y, x + hw, y);
    bodyGrad.addColorStop(0, CHEST_COLOR);
    bodyGrad.addColorStop(0.5, CHEST_HIGHLIGHT);
    bodyGrad.addColorStop(1, CHEST_COLOR);

    this.ctx.fillStyle = bodyGrad;
    this.ctx.fillRect(x - hw, y - hh * 0.4, hw * 2, hh);

    this.ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - hw, y - hh * 0.4, hw * 2, hh);

    const lidGrad = this.ctx.createLinearGradient(x - hw, y - hh, x + hw, y - hh);
    lidGrad.addColorStop(0, CHEST_HIGHLIGHT);
    lidGrad.addColorStop(0.5, '#B8922A');
    lidGrad.addColorStop(1, CHEST_HIGHLIGHT);

    this.ctx.fillStyle = lidGrad;
    this.ctx.beginPath();
    this.ctx.moveTo(x - hw, y - hh * 0.4);
    this.ctx.lineTo(x - hw, y - hh * 0.8);
    this.ctx.quadraticCurveTo(x, y - hh * 1.3, x + hw, y - hh * 0.8);
    this.ctx.lineTo(x + hw, y - hh * 0.4);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    this.ctx.lineWidth = 0.8;
    this.ctx.beginPath();
    this.ctx.moveTo(x - hw, y - hh * 0.4);
    this.ctx.lineTo(x - hw, y - hh * 0.8);
    this.ctx.quadraticCurveTo(x, y - hh * 1.3, x + hw, y - hh * 0.8);
    this.ctx.lineTo(x + hw, y - hh * 0.4);
    this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.fillStyle = CHEST_LOCK_COLOR;
    this.ctx.fillRect(x - 2, y - hh * 0.5, 4, 4);
  }

  private drawPatrolPaths(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      if (enemy.patrolPath.length < 2) continue;

      this.ctx.save();
      this.ctx.strokeStyle = PATROL_PATH_COLOR;
      this.ctx.globalAlpha = 0.4;
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([6, 6]);

      this.ctx.beginPath();
      this.ctx.moveTo(enemy.patrolPath[0].x, enemy.patrolPath[0].y);
      for (let i = 1; i < enemy.patrolPath.length; i++) {
        this.ctx.lineTo(enemy.patrolPath[i].x, enemy.patrolPath[i].y);
      }
      this.ctx.lineTo(enemy.patrolPath[0].x, enemy.patrolPath[0].y);
      this.ctx.stroke();
      this.ctx.restore();

      for (let i = 0; i < enemy.patrolPath.length; i++) {
        const pt = enemy.patrolPath[i];
        const isActive = i === enemy.currentPathIndex && !enemy.isWaiting;

        this.ctx.save();
        this.ctx.globalAlpha = isActive ? 0.8 : 0.5;
        this.ctx.fillStyle = isActive ? '#FFD700' : PATROL_DOT_COLOR;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, isActive ? 4 : 3, 0, Math.PI * 2);
        this.ctx.fill();

        if (isActive) {
          this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
          this.ctx.stroke();
        }
        this.ctx.restore();
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
