import {
  Room,
  Player,
  Enemy,
  Item,
  Position,
  TileType,
  EnemyType,
  ItemType,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  GRID_WIDTH,
  GRID_HEIGHT
} from '../types';

interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private backBuffer: HTMLCanvasElement;
  private backBufferCtx: CanvasRenderingContext2D;
  private dirtyRects: DirtyRect[] = [];
  private colors = {
    wall: '#2b2d42',
    floor: '#3a3d56',
    door: '#4a4e69',
    trap: '#9a031e',
    chest: '#f59e0b',
    player: '#ffffff',
    playerStunned: '#94a3b8',
    sentinel: '#ef4444',
    spider: '#a855f7',
    spiderLing: '#c084fc',
    attackBoost: '#f97316',
    speedBoost: '#22c55e',
    heal: '#ec4899',
    attackWarning: 'rgba(239, 68, 68, 0.4)'
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    this.backBuffer = document.createElement('canvas');
    this.backBuffer.width = MAP_WIDTH;
    this.backBuffer.height = MAP_HEIGHT;
    this.backBufferCtx = this.backBuffer.getContext('2d')!;
  }

  render(room: Room, player: Player, beatProgress: number): void {
    this.clearBackBuffer();
    this.renderMap(room);
    this.renderItems(room.items);
    this.renderEnemies(room.enemies);
    this.renderPlayer(player, beatProgress);
    this.renderAttackWarnings(room.enemies);
    this.swapBuffers();
  }

  private clearBackBuffer(): void {
    this.backBufferCtx.fillStyle = '#1a1a2e';
    this.backBufferCtx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  }

  private renderMap(room: Room): void {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = room.grid[y]?.[x] ?? TileType.FLOOR;
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        switch (tile) {
          case TileType.WALL:
            this.renderWall(px, py);
            break;
          case TileType.FLOOR:
            this.renderFloor(px, py);
            break;
          case TileType.DOOR:
            this.renderDoor(px, py, room.isCleared);
            break;
          case TileType.TRAP:
            this.renderTrap(px, py);
            break;
          case TileType.CHEST:
            this.renderChest(px, py);
            break;
        }
      }
    }
  }

  private renderWall(x: number, y: number): void {
    const ctx = this.backBufferCtx;
    
    ctx.fillStyle = this.colors.wall;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(x, y, TILE_SIZE, 2);
    ctx.fillRect(x, y, 2, TILE_SIZE);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
    ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
  }

  private renderFloor(x: number, y: number): void {
    const ctx = this.backBufferCtx;
    
    ctx.fillStyle = this.colors.floor;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < 2; i++) {
      const dotX = x + 8 + Math.random() * (TILE_SIZE - 16);
      const dotY = y + 8 + Math.random() * (TILE_SIZE - 16);
      ctx.fillRect(dotX, dotY, 2, 2);
    }
  }

  private renderDoor(x: number, y: number, isOpen: boolean): void {
    const ctx = this.backBufferCtx;
    
    ctx.fillStyle = this.colors.floor;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    if (isOpen) {
      ctx.fillStyle = this.colors.door;
      ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      
      ctx.strokeStyle = this.colors.door;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    }
  }

  private renderTrap(x: number, y: number): void {
    const ctx = this.backBufferCtx;
    
    this.renderFloor(x, y);
    
    ctx.fillStyle = this.colors.trap;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(x + TILE_SIZE / 2, y + 8);
    ctx.lineTo(x + TILE_SIZE - 8, y + TILE_SIZE / 2);
    ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 8);
    ctx.lineTo(x + 8, y + TILE_SIZE / 2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private renderChest(x: number, y: number): void {
    const ctx = this.backBufferCtx;
    
    this.renderFloor(x, y);
    
    ctx.fillStyle = this.colors.chest;
    ctx.fillRect(x + 8, y + 12, TILE_SIZE - 16, TILE_SIZE - 20);
    
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x + 8, y + 20, TILE_SIZE - 16, 4);
    
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x + TILE_SIZE / 2 - 3, y + 18, 6, 8);
  }

  private renderItems(items: Item[]): void {
    for (const item of items) {
      if (item.isPickedUp && item.pickupAnimationProgress >= 1) continue;
      
      const scale = item.isPickedUp ? 1 - item.pickupAnimationProgress : 1;
      this.renderItem(item, scale);
    }
  }

  private renderItem(item: Item, scale: number): void {
    const ctx = this.backBufferCtx;
    const centerX = item.position.x + TILE_SIZE / 2;
    const centerY = item.position.y + TILE_SIZE / 2;
    const size = (TILE_SIZE * 0.6) * scale;

    let color: string;
    switch (item.type) {
      case ItemType.ATTACK_BOOST:
        color = this.colors.attackBoost;
        break;
      case ItemType.SPEED_BOOST:
        color = this.colors.speedBoost;
        break;
      case ItemType.HEAL:
        color = this.colors.heal;
        break;
      default:
        color = '#ffffff';
    }

    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = centerX + Math.cos(angle) * (size / 2);
      const py = centerY + Math.sin(angle) * (size / 2);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = centerX + Math.cos(angle) * (size / 4);
      const py = centerY + Math.sin(angle) * (size / 4);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = item.type === ItemType.ATTACK_BOOST ? '⚔' : 
                 item.type === ItemType.SPEED_BOOST ? '⚡' : '❤';
    ctx.fillText(icon, centerX, centerY);
  }

  private renderEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      if (enemy.health <= 0) continue;
      this.renderEnemy(enemy);
    }
  }

  private renderEnemy(enemy: Enemy): void {
    const ctx = this.backBufferCtx;
    const x = enemy.position.x + TILE_SIZE / 2;
    const y = enemy.position.y + TILE_SIZE / 2;

    if (enemy.isFlashing) {
      ctx.shadowColor = enemy.flashColor;
      ctx.shadowBlur = 15;
    }

    switch (enemy.type) {
      case EnemyType.SENTINEL:
        this.renderSentinel(x, y, enemy);
        break;
      case EnemyType.SPIDER:
        this.renderSpider(x, y, enemy);
        break;
      case EnemyType.SPIDER_LING:
        this.renderSpiderLing(x, y, enemy);
        break;
    }

    ctx.shadowBlur = 0;

    this.renderEnemyHealthBar(enemy);
  }

  private renderSentinel(x: number, y: number, enemy: Enemy): void {
    const ctx = this.backBufferCtx;
    const size = TILE_SIZE * 0.7;
    const color = enemy.isFlashing ? '#ffffff' : this.colors.sentinel;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x - 6, y - 4, 3, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 6, y - 4, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 4, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, size / 2 + 4, -0.2, Math.PI + 0.2);
    ctx.stroke();
  }

  private renderSpider(x: number, y: number, enemy: Enemy): void {
    const ctx = this.backBufferCtx;
    const size = TILE_SIZE * 0.6;
    const color = enemy.isFlashing ? '#ffffff' : this.colors.spider;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i;
      const legLength = size * 0.8;
      const startX = x + Math.cos(angle) * (size * 0.2);
      const startY = y + Math.sin(angle) * (size * 0.2);
      const endX = x + Math.cos(angle) * legLength;
      const endY = y + Math.sin(angle) * legLength;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        x + Math.cos(angle - 0.3) * (size * 0.5),
        y + Math.sin(angle - 0.3) * (size * 0.5),
        endX,
        endY
      );
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y - size * 0.15, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x - 4, y - size * 0.18, 2, 0, Math.PI * 2);
    ctx.arc(x + 4, y - size * 0.18, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSpiderLing(x: number, y: number, enemy: Enemy): void {
    const ctx = this.backBufferCtx;
    const size = TILE_SIZE * 0.35;
    const color = enemy.isFlashing ? '#ffffff' : this.colors.spiderLing;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const legLength = size * 0.8;
      const endX = x + Math.cos(angle) * legLength;
      const endY = y + Math.sin(angle) * legLength;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 1, 0, Math.PI * 2);
    ctx.arc(x + 2, y - 2, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderEnemyHealthBar(enemy: Enemy): void {
    const ctx = this.backBufferCtx;
    const barWidth = TILE_SIZE * 0.8;
    const barHeight = 4;
    const x = enemy.position.x + (TILE_SIZE - barWidth) / 2;
    const y = enemy.position.y - 8;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, barWidth, barHeight);

    const healthPercent = enemy.health / enemy.maxHealth;
    const healthWidth = barWidth * healthPercent;

    let healthColor = '#22c55e';
    if (healthPercent < 0.3) {
      healthColor = '#ef4444';
    } else if (healthPercent < 0.6) {
      healthColor = '#f59e0b';
    }

    ctx.fillStyle = healthColor;
    ctx.fillRect(x, y, healthWidth, barHeight);
  }

  private renderAttackWarnings(enemies: Enemy[]): void {
    const ctx = this.backBufferCtx;

    for (const enemy of enemies) {
      if (enemy.type !== EnemyType.SENTINEL || !enemy.attackWarning) continue;

      const centerX = enemy.position.x + TILE_SIZE / 2;
      const centerY = enemy.position.y + TILE_SIZE / 2;

      ctx.fillStyle = this.colors.attackWarning;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private renderPlayer(player: Player, beatProgress: number): void {
    const ctx = this.backBufferCtx;
    const x = player.position.x + TILE_SIZE / 2;
    const y = player.position.y + TILE_SIZE / 2;
    const size = 16;

    const pulseScale = 1 + Math.sin(beatProgress * Math.PI * 2) * 0.1;
    const drawSize = size * pulseScale;

    if (player.isStunned) {
      ctx.globalAlpha = 0.6;
    }

    ctx.shadowColor = player.isStunned ? this.colors.playerStunned : this.colors.player;
    ctx.shadowBlur = 8;

    ctx.fillStyle = player.isStunned ? this.colors.playerStunned : this.colors.player;

    this.drawPixelCharacter(x, y, drawSize, player.facing);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    if (player.isStunned) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const starX = x + (i - 1) * 10;
        const starY = y - size - 15 + Math.sin(performance.now() / 200 + i) * 3;
        ctx.fillText('★', starX, starY);
      }
    }
  }

  private drawPixelCharacter(x: number, y: number, size: number, facing: string): void {
    const ctx = this.backBufferCtx;
    const half = size / 2;
    const pixelSize = size / 4;

    ctx.fillRect(x - pixelSize, y - half, pixelSize * 2, pixelSize * 2);

    ctx.fillRect(x - half, y - half + pixelSize * 2, size, pixelSize * 2);

    ctx.fillRect(x - half, y + pixelSize, pixelSize, pixelSize * 2);
    ctx.fillRect(x, y + pixelSize, pixelSize, pixelSize * 2);

    ctx.fillStyle = '#1a1a2e';
    let eyeOffset = 0;
    if (facing === 'left') eyeOffset = -2;
    if (facing === 'right') eyeOffset = 2;
    ctx.fillRect(x - pixelSize + eyeOffset, y - half + pixelSize / 2, 2, 2);
    ctx.fillRect(x + eyeOffset, y - half + pixelSize / 2, 2, 2);
  }

  private swapBuffers(): void {
    this.ctx.drawImage(this.backBuffer, 0, 0);
  }

  addDirtyRect(x: number, y: number, width: number, height: number): void {
    this.dirtyRects.push({ x, y, width, height });
  }

  clearDirtyRects(): void {
    this.dirtyRects = [];
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  destroy(): void {
    this.dirtyRects = [];
  }
}

export default MapRenderer;
