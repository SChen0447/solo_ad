import { DungeonData, Monster, Treasure, Position } from './backendClient';
import { Player } from './player';

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface RenderState {
  dungeon: DungeonData;
  player: Player;
  monsters: Monster[];
  treasures: Treasure[];
  elapsedTime: number;
  isInCombat: boolean;
  targetMonster: Monster | null;
  gameOver: boolean;
  victory: boolean;
  exitBlinkPhase: number;
  lowHealthBlinkPhase: number;
  warningBorderActive: boolean;
  particles: Particle[];
  bleedingMonsters: Map<string, number>;
  collectingTreasureId: string | null;
}

const COLORS = {
  background: '#1a1a2e',
  wall: '#3a3a3a',
  wallHighlight: '#4a4a4a',
  wallShadow: '#2a2a2a',
  floor: '#aaaaaa',
  floorDark: '#9a9a9a',
  entrance: '#2ed573',
  entranceGlow: '#7bed9f',
  exit: '#ffa502',
  exitGlow: '#ffda79',
  player: '#3742fa',
  playerLight: '#5352ed',
  playerDark: '#2f3542',
  playerFlash: '#ffffff',
  monster: '#ff4757',
  monsterDark: '#c44569',
  monsterLight: '#ff6b7a',
  treasure: '#ffa502',
  treasureGlow: '#ffda79',
  healthBarBg: '#2f3542',
  healthBarFill: '#ff4757',
  healthBarText: '#ffffff',
  combatIndicator: '#ff4757',
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridSize: number = 10;
  private cellSize: number = 60;
  private pixelSize: number = 2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.updateCanvasSize();
  }

  public updateCanvasSize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const size = Math.min(container.clientWidth, 600);
      this.canvas.width = size;
      this.canvas.height = size;
      this.cellSize = size / this.gridSize;
      this.pixelSize = Math.max(1, this.cellSize / 8);
    }
  }

  public render(state: RenderState, currentTime: number): void {
    const startTime = performance.now();
    
    this.ctx.imageSmoothingEnabled = false;
    
    this.clear();
    this.drawDungeon(state.dungeon, state.exitBlinkPhase);
    this.drawTreasures(state.treasures, state.collectingTreasureId, currentTime);
    this.drawMonsters(state.monsters, state.bleedingMonsters, currentTime);
    this.drawPlayer(state.player, currentTime);
    this.drawParticles(state.particles);
    this.drawCombatIndicator(state.targetMonster);
    
    const renderTime = performance.now() - startTime;
    if (renderTime > 20) {
      console.warn(`渲染耗时过长: ${renderTime.toFixed(2)}ms`);
    }
  }

  private clear(): void {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawDungeon(dungeon: DungeonData, exitBlinkPhase: number): void {
    const grid = dungeon.grid;
    
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        const px = x * this.cellSize;
        const py = y * this.cellSize;
        
        if (cell === 'wall') {
          this.drawWall(px, py);
        } else if (cell === 'floor') {
          this.drawFloor(px, py);
        } else if (cell === 'entrance') {
          this.drawFloor(px, py);
          this.drawEntrance(px, py);
        } else if (cell === 'exit') {
          this.drawFloor(px, py);
          this.drawExit(px, py, exitBlinkPhase);
        }
      }
    }
  }

  private drawWall(px: number, py: number): void {
    this.ctx.fillStyle = COLORS.wall;
    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
    
    for (let iy = 0; iy < this.cellSize; iy += this.pixelSize * 2) {
      for (let ix = 0; ix < this.cellSize; ix += this.pixelSize * 2) {
        const isHighlight = (Math.floor(ix / (this.pixelSize * 2)) + Math.floor(iy / (this.pixelSize * 2))) % 2 === 0;
        this.ctx.fillStyle = isHighlight ? COLORS.wallHighlight : COLORS.wallShadow;
        this.ctx.fillRect(px + ix, py + iy, this.pixelSize * 2, this.pixelSize * 2);
      }
    }
  }

  private drawFloor(px: number, py: number): void {
    this.ctx.fillStyle = COLORS.floor;
    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
    
    for (let iy = 0; iy < this.cellSize; iy += this.pixelSize * 2) {
      for (let ix = 0; ix < this.cellSize; ix += this.pixelSize * 2) {
        const isDark = (Math.floor(ix / (this.pixelSize * 2)) + Math.floor(iy / (this.pixelSize * 2))) % 2 === 0;
        this.ctx.fillStyle = isDark ? COLORS.floorDark : COLORS.floor;
        this.ctx.fillRect(px + ix, py + iy, this.pixelSize * 2, this.pixelSize * 2);
      }
    }
  }

  private drawEntrance(px: number, py: number): void {
    const padding = this.cellSize * 0.2;
    this.ctx.fillStyle = COLORS.entrance;
    this.ctx.fillRect(px + padding, py + padding, this.cellSize - padding * 2, this.cellSize - padding * 2);
    
    this.ctx.shadowColor = COLORS.entranceGlow;
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = COLORS.entranceGlow;
    this.ctx.fillRect(
      px + this.cellSize * 0.35,
      py + this.cellSize * 0.35,
      this.cellSize * 0.3,
      this.cellSize * 0.3
    );
    this.ctx.shadowBlur = 0;
  }

  private drawExit(px: number, py: number, blinkPhase: number): void {
    const padding = this.cellSize * 0.15;
    const size = this.cellSize - padding * 2;
    const pulse = 0.7 + 0.3 * Math.sin(blinkPhase * Math.PI * 2);
    
    this.ctx.shadowColor = COLORS.exitGlow;
    this.ctx.shadowBlur = 15 * pulse;
    
    this.ctx.fillStyle = COLORS.exit;
    this.ctx.fillRect(px + padding, py + padding, size, size);
    
    this.ctx.fillStyle = COLORS.exitGlow;
    const innerPadding = padding * 1.5;
    this.ctx.fillRect(
      px + innerPadding,
      py + innerPadding,
      this.cellSize - innerPadding * 2,
      this.cellSize - innerPadding * 2
    );
    
    this.ctx.shadowBlur = 0;
  }

  private drawTreasures(treasures: Treasure[], collectingId: string | null, currentTime: number): void {
    for (const treasure of treasures) {
      if (treasure.collected) continue;
      
      const px = treasure.position.x * this.cellSize;
      const py = treasure.position.y * this.cellSize;
      const isCollecting = treasure.id === collectingId;
      
      this.drawTreasure(px, py, isCollecting, currentTime);
    }
  }

  private drawTreasure(px: number, py: number, isCollecting: boolean, currentTime: number): void {
    let scale = 1;
    let alpha = 1;
    
    if (isCollecting) {
      const collectProgress = Math.min(1, (currentTime % 1000) / 300);
      scale = 1 + Math.sin(collectProgress * Math.PI) * 0.5;
      alpha = 1 - collectProgress;
    }
    
    const centerX = px + this.cellSize / 2;
    const centerY = py + this.cellSize / 2;
    const size = this.cellSize * 0.5 * scale;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    
    this.ctx.shadowColor = COLORS.treasureGlow;
    this.ctx.shadowBlur = 10;
    
    this.ctx.fillStyle = COLORS.treasure;
    this.ctx.fillRect(centerX - size / 2, centerY - size / 3, size, size * 0.7);
    
    this.ctx.fillStyle = COLORS.treasureGlow;
    this.ctx.fillRect(centerX - size / 2, centerY - size / 3, size, size * 0.2);
    
    this.ctx.fillStyle = '#8b4513';
    this.ctx.fillRect(centerX - size * 0.1, centerY - size * 0.1, size * 0.2, size * 0.2);
    
    this.ctx.shadowBlur = 0;
    this.ctx.restore();
  }

  private drawMonsters(monsters: Monster[], bleedingMonsters: Map<string, number>, currentTime: number): void {
    for (const monster of monsters) {
      if (monster.hp <= 0) continue;
      
      const px = monster.position.x * this.cellSize;
      const py = monster.position.y * this.cellSize;
      const isBleeding = bleedingMonsters.has(monster.id);
      const bleedProgress = isBleeding ? (bleedingMonsters.get(monster.id) || 0) / 300 : 0;
      
      this.drawMonster(px, py, monster, bleedProgress, currentTime);
    }
  }

  private drawMonster(px: number, py: number, monster: Monster, bleedProgress: number, currentTime: number): void {
    const centerX = px + this.cellSize / 2;
    const centerY = py + this.cellSize / 2;
    const size = this.cellSize * 0.6;
    
    const shakeX = bleedProgress > 0 ? Math.sin(bleedProgress * Math.PI * 10) * 3 : 0;
    const shakeY = bleedProgress > 0 ? Math.cos(bleedProgress * Math.PI * 10) * 3 : 0;
    
    this.ctx.save();
    this.ctx.translate(shakeX, shakeY);
    
    this.ctx.fillStyle = COLORS.monster;
    this.drawPixelCharacter(centerX, centerY - size * 0.1, size, COLORS.monster, COLORS.monsterDark, COLORS.monsterLight);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(centerX - size * 0.25, centerY - size * 0.15, size * 0.15, size * 0.15);
    this.ctx.fillRect(centerX + size * 0.1, centerY - size * 0.15, size * 0.15, size * 0.15);
    
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(centerX - size * 0.2, centerY - size * 0.1, size * 0.08, size * 0.08);
    this.ctx.fillRect(centerX + size * 0.12, centerY - size * 0.1, size * 0.08, size * 0.08);
    
    if (bleedProgress > 0) {
      this.ctx.globalAlpha = 1 - bleedProgress;
      this.ctx.fillStyle = '#ff0000';
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const dist = size * 0.4 * bleedProgress;
        const bx = centerX + Math.cos(angle) * dist;
        const by = centerY + Math.sin(angle) * dist;
        this.ctx.fillRect(bx - 2, by - 2, 4, 4);
      }
    }
    
    this.ctx.restore();
    
    this.drawHealthBar(centerX, py + size * 0.7, monster.hp, monster.maxHp);
  }

  private drawPixelCharacter(
    cx: number,
    cy: number,
    size: number,
    color: string,
    darkColor: string,
    lightColor: string
  ): void {
    const ps = size / 4;
    
    this.ctx.fillStyle = darkColor;
    this.ctx.fillRect(cx - ps * 1.5, cy - ps * 1.5, ps * 3, ps);
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(cx - ps * 1.5, cy - ps * 0.5, ps * 3, ps * 2);
    
    this.ctx.fillStyle = lightColor;
    this.ctx.fillRect(cx - ps, cy - ps * 0.5, ps, ps);
    this.ctx.fillRect(cx + ps * 0.5, cy, ps, ps);
    
    this.ctx.fillStyle = darkColor;
    this.ctx.fillRect(cx - ps * 1.5, cy + ps * 1.5, ps, ps);
    this.ctx.fillRect(cx + ps * 0.5, cy + ps * 1.5, ps, ps);
  }

  private drawHealthBar(cx: number, py: number, hp: number, maxHp: number): void {
    const barWidth = this.cellSize * 0.7;
    const barHeight = 6;
    const px = cx - barWidth / 2;
    
    this.ctx.fillStyle = COLORS.healthBarBg;
    this.ctx.fillRect(px, py, barWidth, barHeight);
    
    const hpPercent = hp / maxHp;
    this.ctx.fillStyle = COLORS.healthBarFill;
    this.ctx.fillRect(px, py, barWidth * hpPercent, barHeight);
    
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(px, py, barWidth, barHeight);
  }

  private drawPlayer(player: Player, currentTime: number): void {
    const pos = player.getInterpolatedPosition(currentTime);
    const px = pos.x * this.cellSize;
    const py = pos.y * this.cellSize;
    const isFlashing = player.isAttackFlashing(currentTime);
    
    this.drawPlayerCharacter(px, py, isFlashing);
  }

  private drawPlayerCharacter(px: number, py: number, isFlashing: boolean): void {
    const centerX = px + this.cellSize / 2;
    const centerY = py + this.cellSize / 2;
    const size = this.cellSize * 0.6;
    
    const mainColor = isFlashing ? COLORS.playerFlash : COLORS.player;
    const darkColor = isFlashing ? '#cccccc' : COLORS.playerDark;
    const lightColor = isFlashing ? '#ffffff' : COLORS.playerLight;
    
    if (isFlashing) {
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 15;
    }
    
    this.drawPixelCharacter(centerX, centerY, size, mainColor, darkColor, lightColor);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(centerX - size * 0.25, centerY - size * 0.1, size * 0.15, size * 0.15);
    this.ctx.fillRect(centerX + size * 0.1, centerY - size * 0.1, size * 0.15, size * 0.15);
    
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(centerX - size * 0.2, centerY - size * 0.05, size * 0.08, size * 0.08);
    this.ctx.fillRect(centerX + size * 0.12, centerY - size * 0.05, size * 0.08, size * 0.08);
    
    this.ctx.shadowBlur = 0;
  }

  private drawCombatIndicator(targetMonster: Monster | null): void {
    if (!targetMonster) return;
    
    const px = targetMonster.position.x * this.cellSize;
    const py = targetMonster.position.y * this.cellSize;
    const time = Date.now() / 200;
    const pulse = 0.8 + 0.2 * Math.sin(time);
    
    this.ctx.strokeStyle = COLORS.combatIndicator;
    this.ctx.lineWidth = 3 * pulse;
    this.ctx.shadowColor = COLORS.combatIndicator;
    this.ctx.shadowBlur = 10;
    
    const padding = this.cellSize * 0.1;
    this.ctx.strokeRect(
      px + padding,
      py + padding,
      this.cellSize - padding * 2,
      this.cellSize - padding * 2
    );
    
    this.ctx.shadowBlur = 0;
  }

  private drawParticles(particles: Particle[]): void {
    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      const px = particle.x * this.cellSize;
      const py = particle.y * this.cellSize;
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.fillRect(
        px - particle.size / 2,
        py - particle.size / 2,
        particle.size,
        particle.size
      );
      this.ctx.restore();
    }
  }

  public createDeathParticles(position: Position): Particle[] {
    const particles: Particle[] = [];
    const colors = ['#ff4757', '#ff6b7a', '#c44569', '#ffffff', '#ffda79'];
    
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 0.02 + Math.random() * 0.02;
      
      particles.push({
        id: `particle_${Date.now()}_${i}`,
        x: position.x + 0.5,
        y: position.y + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500,
        maxLife: 500,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 4,
      });
    }
    
    return particles;
  }

  public updateParticles(particles: Particle[], deltaTime: number): Particle[] {
    return particles
      .map((p) => ({
        ...p,
        x: p.x + p.vx * deltaTime * 60,
        y: p.y + p.vy * deltaTime * 60,
        vy: p.vy + 0.0005 * deltaTime,
        life: p.life - deltaTime,
      }))
      .filter((p) => p.life > 0);
  }
}

export default Renderer;
