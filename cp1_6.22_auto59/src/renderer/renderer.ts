import type { MapGenerator } from '../game/mapGenerator';
import type { Player } from '../entities/player';
import type { Enemy } from '../entities/enemy';
import type { GameState, Particle, TrapEffect, DropItem, FogReveal, Item } from '../types';
import { Inventory } from '../systems/inventory';

const TILE_SIZE = 48;
const VIEW_RADIUS = 4;
const VIEW_SIZE = VIEW_RADIUS * 2 + 1;

const COLORS = {
  wall: '#4a5568',
  floor: '#e2e8f0',
  door: '#8b6914',
  trap: '#a0aec0',
  fog: '#1a202c',
  player: '#3182ce',
  playerHit: '#fc8181',
  enemy: '#e53e3e',
  enemyHit: '#feb2b2',
  chest: '#d69e2e',
  chestOpen: '#744210',
  hpBarBg: '#2d3748',
  hpBar: '#e53e3e',
  text: '#ffffff',
  uiBg: 'rgba(0, 0, 0, 0.5)',
  particle: '#ff4444',
  title: '#ffffff',
  gameOver: '#e53e3e',
  buttonHover: '#4a5568'
};

export interface InventoryUIState {
  open: boolean;
  hoveredIndex: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  public clear(): void {
    this.ctx.fillStyle = '#1a202c';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private getMapOffset(): { offsetX: number; offsetY: number } {
    const mapPixelWidth = VIEW_SIZE * TILE_SIZE;
    const mapPixelHeight = VIEW_SIZE * TILE_SIZE;
    return {
      offsetX: (this.width - mapPixelWidth) / 2,
      offsetY: (this.height - mapPixelHeight) / 2
    };
  }

  public renderStartScreen(currentTime: number): void {
    this.ctx.fillStyle = '#2d3748';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = COLORS.title;
    this.ctx.font = '30px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('地牢探险', this.width / 2, this.height / 2 - 40);

    const blink = Math.sin(currentTime / 500 * Math.PI) > 0;
    if (blink) {
      this.ctx.font = '18px monospace';
      this.ctx.fillStyle = '#a0aec0';
      this.ctx.fillText('按任意键开始', this.width / 2, this.height / 2 + 20);
    }
  }

  public renderGameOver(currentTime: number, startTime: number): void {
    const elapsed = currentTime - startTime;
    const alpha = Math.min(1, elapsed / 500);

    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = COLORS.gameOver;
    this.ctx.font = '32px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('你死了', this.width / 2, this.height / 2);
    this.ctx.globalAlpha = 1;
  }

  public renderMap(
    map: MapGenerator,
    playerX: number,
    playerY: number,
    fogReveals: FogReveal[],
    currentTime: number
  ): void {
    const { offsetX, offsetY } = this.getMapOffset();

    for (let vy = 0; vy < VIEW_SIZE; vy++) {
      for (let vx = 0; vx < VIEW_SIZE; vx++) {
        const mapX = playerX - VIEW_RADIUS + vx;
        const mapY = playerY - VIEW_RADIUS + vy;

        const screenX = offsetX + vx * TILE_SIZE;
        const screenY = offsetY + vy * TILE_SIZE;

        if (mapX < 0 || mapX >= map.width || mapY < 0 || mapY >= map.height) {
          this.ctx.fillStyle = COLORS.fog;
          this.ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
          continue;
        }

        const tile = map.tiles[mapY][mapX];
        const inView = Math.abs(mapX - playerX) <= VIEW_RADIUS && Math.abs(mapY - playerY) <= VIEW_RADIUS;
        tile.visible = inView;
        if (inView) tile.visited = true;

        let revealAlpha = 0;
        for (const reveal of fogReveals) {
          const dx = mapX - reveal.x;
          const dy = mapY - reveal.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const progress = Math.min(1, (currentTime - reveal.startTime) / reveal.duration);
          const revealRadius = reveal.radius * progress;
          if (dist <= revealRadius) {
            revealAlpha = Math.max(revealAlpha, 1 - dist / revealRadius);
          }
        }

        if (!tile.visited) {
          if (revealAlpha > 0) {
            this.renderTile(tile.type, screenX, screenY, tile);
            this.ctx.fillStyle = `rgba(26, 32, 44, ${1 - revealAlpha})`;
            this.ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
          } else {
            this.ctx.fillStyle = COLORS.fog;
            this.ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
          }
        } else if (!tile.visible) {
          this.renderTile(tile.type, screenX, screenY, tile);
          this.ctx.fillStyle = 'rgba(26, 32, 44, 0.6)';
          this.ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        } else {
          this.renderTile(tile.type, screenX, screenY, tile);
        }
      }
    }
  }

  private renderTile(type: string, x: number, y: number, tile: any): void {
    switch (type) {
      case 'wall':
        this.ctx.fillStyle = COLORS.wall;
        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        this.ctx.strokeStyle = '#2d3748';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        break;
      case 'floor':
        this.ctx.fillStyle = COLORS.floor;
        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        this.ctx.strokeStyle = '#cbd5e0';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        if (tile.hasChest) {
          this.ctx.fillStyle = tile.chestOpened ? COLORS.chestOpen : COLORS.chest;
          const chestSize = TILE_SIZE * 0.5;
          this.ctx.fillRect(
            x + (TILE_SIZE - chestSize) / 2,
            y + (TILE_SIZE - chestSize) / 2,
            chestSize,
            chestSize
          );
          this.ctx.strokeStyle = '#5a3e1b';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(
            x + (TILE_SIZE - chestSize) / 2,
            y + (TILE_SIZE - chestSize) / 2,
            chestSize,
            chestSize
          );
        }
        break;
      case 'door':
        this.ctx.fillStyle = COLORS.floor;
        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        this.ctx.fillStyle = COLORS.door;
        const doorPadding = TILE_SIZE * 0.15;
        this.ctx.fillRect(x + doorPadding, y + doorPadding, TILE_SIZE - doorPadding * 2, TILE_SIZE - doorPadding * 2);
        this.ctx.fillStyle = '#f6e05e';
        this.ctx.beginPath();
        this.ctx.arc(x + TILE_SIZE * 0.7, y + TILE_SIZE * 0.5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'trap':
        this.ctx.fillStyle = COLORS.floor;
        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        this.ctx.strokeStyle = COLORS.trap;
        this.ctx.lineWidth = 2;
        const trapPadding = TILE_SIZE * 0.25;
        this.ctx.strokeRect(x + trapPadding, y + trapPadding, TILE_SIZE - trapPadding * 2, TILE_SIZE - trapPadding * 2);
        break;
    }
  }

  public renderPlayer(player: Player, currentTime: number): void {
    const { offsetX, offsetY } = this.getMapOffset();
    const screenX = offsetX + VIEW_RADIUS * TILE_SIZE + TILE_SIZE / 2;
    const screenY = offsetY + VIEW_RADIUS * TILE_SIZE + TILE_SIZE / 2;

    const color = player.isHit ? COLORS.playerHit : COLORS.player;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, TILE_SIZE * 0.35, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#2b6cb0';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  public renderEnemies(
    enemies: Enemy[],
    playerX: number,
    playerY: number,
    map: MapGenerator,
    currentTime: number
  ): void {
    const { offsetX, offsetY } = this.getMapOffset();

    for (const enemy of enemies) {
      if (enemy.isDead()) continue;

      const dx = enemy.data.x - playerX;
      const dy = enemy.data.y - playerY;

      if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) continue;

      const tile = map.tiles[enemy.data.y]?.[enemy.data.x];
      if (!tile?.visited && !tile?.visible) continue;

      const screenX = offsetX + (VIEW_RADIUS + dx) * TILE_SIZE + TILE_SIZE / 2;
      const screenY = offsetY + (VIEW_RADIUS + dy) * TILE_SIZE + TILE_SIZE / 2;

      if (enemy.data.isDying) {
        const elapsed = currentTime - enemy.data.deathTime;
        const alpha = Math.max(0, 1 - elapsed / 500);
        this.ctx.globalAlpha = alpha;
      }

      let color = enemy.data.isHit ? COLORS.enemyHit : COLORS.enemy;

      if (enemy.data.type === 'skeleton') {
        color = enemy.data.isHit ? '#fed7d7' : '#e2e8f0';
      } else if (enemy.data.type === 'orc') {
        color = enemy.data.isHit ? '#9ae6b4' : '#38a169';
      }

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, TILE_SIZE * 0.35, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#1a202c';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      if (!enemy.data.isDying) {
        const hpPercent = enemy.data.hp / enemy.data.maxHp;
        const barWidth = TILE_SIZE * 0.6;
        const barHeight = 4;
        this.ctx.fillStyle = COLORS.hpBarBg;
        this.ctx.fillRect(screenX - barWidth / 2, screenY - TILE_SIZE * 0.4, barWidth, barHeight);
        this.ctx.fillStyle = COLORS.hpBar;
        this.ctx.fillRect(screenX - barWidth / 2, screenY - TILE_SIZE * 0.4, barWidth * hpPercent, barHeight);
      }

      this.ctx.globalAlpha = 1;
    }
  }

  public renderTrapEffects(effects: TrapEffect[], playerX: number, playerY: number, currentTime: number): void {
    const { offsetX, offsetY } = this.getMapOffset();

    for (const effect of effects) {
      const elapsed = currentTime - effect.time;
      if (elapsed > 300) continue;

      const dx = effect.x - playerX;
      const dy = effect.y - playerY;

      if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) continue;

      const screenX = offsetX + (VIEW_RADIUS + dx) * TILE_SIZE + TILE_SIZE / 2;
      const screenY = offsetY + (VIEW_RADIUS + dy) * TILE_SIZE + TILE_SIZE / 2;

      const alpha = 1 - elapsed / 300;
      const bounce = Math.sin(elapsed / 50) * 5;

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#e53e3e';
      this.ctx.font = 'bold 24px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('!', screenX, screenY - 10 + bounce);
      this.ctx.globalAlpha = 1;
    }
  }

  public renderDropItems(drops: DropItem[], playerX: number, playerY: number, currentTime: number): void {
    const { offsetX, offsetY } = this.getMapOffset();

    for (const drop of drops) {
      const elapsed = currentTime - drop.time;
      if (elapsed > 1500) continue;

      const dx = drop.x - playerX;
      const dy = drop.y - playerY;

      if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) continue;

      const screenX = offsetX + (VIEW_RADIUS + dx) * TILE_SIZE + TILE_SIZE / 2;
      const screenY = offsetY + (VIEW_RADIUS + dy) * TILE_SIZE + TILE_SIZE / 2;

      const blink = Math.sin(elapsed / 100) > 0;
      if (blink) {
        this.ctx.fillStyle = '#48bb78';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - TILE_SIZE * 0.4, 5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(drop.item.name, screenX, screenY - TILE_SIZE * 0.55);
      }
    }
  }

  public renderParticles(particles: Particle[], playerX: number, playerY: number): void {
    const { offsetX, offsetY } = this.getMapOffset();

    for (const p of particles) {
      if (p.life <= 0) continue;

      const alpha = p.life / p.maxLife;
      const dx = p.x - playerX;
      const dy = p.y - playerY;

      if (Math.abs(dx) > VIEW_RADIUS + 1 || Math.abs(dy) > VIEW_RADIUS + 1) continue;

      const screenX = offsetX + (VIEW_RADIUS + dx) * TILE_SIZE + TILE_SIZE / 2;
      const screenY = offsetY + (VIEW_RADIUS + dy) * TILE_SIZE + TILE_SIZE / 2;

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
  }

  public renderUI(player: Player, currentTime: number): void {
    this.ctx.fillStyle = COLORS.uiBg;
    this.ctx.fillRect(10, 10, 240, 70);

    this.ctx.fillStyle = COLORS.hpBarBg;
    this.ctx.fillRect(20, 20, 200, 16);

    const hpPercent = player.hp / player.maxHp;
    this.ctx.fillStyle = COLORS.hpBar;
    this.ctx.fillRect(20, 20, 200 * hpPercent, 16);

    this.ctx.fillStyle = COLORS.text;
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`HP: ${player.hp}/${player.maxHp}`, 20, 40);

    this.ctx.fillText(`攻击: ${player.attack}  防御: ${player.defense}`, 20, 56);

    const totalItems = player.inventory.getTotalCount();
    this.ctx.fillStyle = COLORS.uiBg;
    this.ctx.fillRect(this.width - 100, this.height - 30, 90, 20);
    this.ctx.fillStyle = COLORS.text;
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`背包: ${totalItems} (按I)`, this.width - 15, this.height - 26);
  }

  public renderInventoryPanel(
    player: Player,
    uiState: InventoryUIState,
    mouseX: number,
    mouseY: number,
    currentTime: number
  ): { hoveredIndex: number; clickedIndex: number } {
    const items = player.inventory.getAllItems();
    const panelWidth = 360;
    const panelHeight = Math.max(200, 100 + items.length * 50);
    const panelX = (this.width - panelWidth) / 2;
    const panelY = (this.height - panelHeight) / 2;

    this.ctx.fillStyle = '#00000080';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#2d3748';
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    this.ctx.strokeStyle = '#4a5568';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    this.ctx.fillStyle = COLORS.text;
    this.ctx.font = '20px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('背包 (按I关闭)', this.width / 2, panelY + 15);

    let hoveredIndex = -1;
    let clickedIndex = -1;

    const buttonWidth = 80;
    const buttonHeight = 32;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemY = panelY + 60 + i * 50;

      const isHovered =
        mouseX >= panelX + 20 &&
        mouseX <= panelX + panelWidth - 20 &&
        mouseY >= itemY &&
        mouseY <= itemY + 40;

      const buttonX = panelX + panelWidth - buttonWidth - 20;
      const buttonY = itemY + 4;
      const buttonHovered =
        mouseX >= buttonX &&
        mouseX <= buttonX + buttonWidth &&
        mouseY >= buttonY &&
        mouseY <= buttonY + buttonHeight;

      if (buttonHovered) {
        hoveredIndex = i;
      }

      if (isHovered || buttonHovered) {
        this.ctx.fillStyle = '#4a5568';
        this.ctx.fillRect(panelX + 15, itemY - 2, panelWidth - 30, 44);
      }

      this.ctx.fillStyle = COLORS.text;
      this.ctx.font = '14px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(`${item.name} x${item.count}`, panelX + 25, itemY + 5);
      this.ctx.fillStyle = '#a0aec0';
      this.ctx.font = '11px monospace';
      this.ctx.fillText(item.description, panelX + 25, itemY + 22);

      let scale = buttonHovered ? 1.1 : 1.0;
      const bw = buttonWidth * scale;
      const bh = buttonHeight * scale;
      const bx = buttonX + (buttonWidth - bw) / 2;
      const by = buttonY + (buttonHeight - bh) / 2;

      this.ctx.fillStyle = item.type === 'key' ? '#744210' : '#3182ce';
      this.ctx.fillRect(bx, by, bw, bh);
      this.ctx.strokeStyle = '#2b6cb0';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(bx, by, bw, bh);

      this.ctx.fillStyle = COLORS.text;
      this.ctx.font = '13px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('使用', bx + bw / 2, by + bh / 2);
    }

    if (items.length === 0) {
      this.ctx.fillStyle = '#a0aec0';
      this.ctx.font = '14px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('背包是空的', this.width / 2, panelY + panelHeight / 2);
    }

    return { hoveredIndex, clickedIndex };
  }

  public getInventoryItemAt(
    player: Player,
    mouseX: number,
    mouseY: number
  ): number {
    const items = player.inventory.getAllItems();
    const panelWidth = 360;
    const panelHeight = Math.max(200, 100 + items.length * 50);
    const panelX = (this.width - panelWidth) / 2;
    const panelY = (this.height - panelHeight) / 2;

    const buttonWidth = 80;
    const buttonHeight = 32;

    for (let i = 0; i < items.length; i++) {
      const itemY = panelY + 60 + i * 50;
      const buttonX = panelX + panelWidth - buttonWidth - 20;
      const buttonY = itemY + 4;

      if (
        mouseX >= buttonX &&
        mouseX <= buttonX + buttonWidth &&
        mouseY >= buttonY &&
        mouseY <= buttonY + buttonHeight
      ) {
        return i;
      }
    }
    return -1;
  }
}
