import { Creature, Position, ELEMENT_COLORS, ELEMENT_GLOW, CardData } from './types';
import { EffectManager } from './effect';

export interface GridCell {
  x: number;
  y: number;
  creature: Creature | null;
  highlighted: boolean;
  highlightType: 'valid' | 'invalid' | 'attack' | null;
}

export class GameBoard {
  rows: number = 6;
  cols: number = 8;
  cellSize: number = 64;
  offsetX: number = 0;
  offsetY: number = 0;
  grid: GridCell[][] = [];
  creatures: Creature[] = [];
  effectManager: EffectManager;
  selectedCreature: Creature | null = null;
  playerHalfRows: number = 3;

  constructor(effectManager: EffectManager, centerX: number, centerY: number) {
    this.effectManager = effectManager;
    this.offsetX = centerX - (this.cols * this.cellSize) / 2;
    this.offsetY = centerY - (this.rows * this.cellSize) / 2;
    this.initGrid();
  }

  private initGrid() {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x] = {
          x,
          y,
          creature: null,
          highlighted: false,
          highlightType: null
        };
      }
    }
  }

  update(deltaTime: number) {
    for (const creature of this.creatures) {
      if (creature.shakeTime > 0) {
        creature.shakeTime -= deltaTime;
        if (creature.shakeTime <= 0) {
          creature.shakeOffset = { x: 0, y: 0 };
        } else {
          creature.shakeOffset.x = (Math.random() - 0.5) * 4;
          creature.shakeOffset.y = (Math.random() - 0.5) * 4;
        }
      }
    }
  }

  getCellAt(screenX: number, screenY: number): GridCell | null {
    const gridX = Math.floor((screenX - this.offsetX) / this.cellSize);
    const gridY = Math.floor((screenY - this.offsetY) / this.cellSize);

    if (gridX >= 0 && gridX < this.cols && gridY >= 0 && gridY < this.rows) {
      return this.grid[gridY][gridX];
    }
    return null;
  }

  getCellCenter(gridX: number, gridY: number): Position {
    return {
      x: this.offsetX + gridX * this.cellSize + this.cellSize / 2,
      y: this.offsetY + gridY * this.cellSize + this.cellSize / 2
    };
  }

  isPlayerHalf(gridY: number): boolean {
    return gridY >= this.rows - this.playerHalfRows;
  }

  isEnemyHalf(gridY: number): boolean {
    return gridY < this.playerHalfRows;
  }

  canPlaceCreature(gridX: number, gridY: number, owner: 'player' | 'enemy'): boolean {
    const cell = this.grid[gridY]?.[gridX];
    if (!cell || cell.creature) return false;

    if (owner === 'player') {
      return this.isPlayerHalf(gridY);
    } else {
      return this.isEnemyHalf(gridY);
    }
  }

  placeCreature(card: CardData, gridX: number, gridY: number, owner: 'player' | 'enemy'): Creature | null {
    if (!this.canPlaceCreature(gridX, gridY, owner) || card.is_spell) return null;

    const creature: Creature = {
      id: `creature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cardId: card.id,
      element: card.element,
      attack: card.attack,
      health: card.health,
      maxHealth: card.health,
      position: { x: gridX, y: gridY },
      owner,
      hasActed: true,
      shakeOffset: { x: 0, y: 0 },
      shakeTime: 0
    };

    this.grid[gridY][gridX].creature = creature;
    this.creatures.push(creature);

    const center = this.getCellCenter(gridX, gridY);
    this.effectManager.spawnParticles(center.x, center.y, ELEMENT_COLORS[card.element], 15);

    return creature;
  }

  getAttackableTargets(attacker: Creature): GridCell[] {
    const targets: GridCell[] = [];
    const { x, y } = attacker.position;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          const cell = this.grid[ny][nx];
          if (cell.creature && cell.creature.owner !== attacker.owner) {
            targets.push(cell);
          }
        }
      }
    }

    return targets;
  }

  async attack(attacker: Creature, target: Creature): Promise<boolean> {
    if (attacker.hasActed) return false;

    const fromCenter = this.getCellCenter(attacker.position.x, attacker.position.y);
    const toCenter = this.getCellCenter(target.position.x, target.position.y);

    await this.effectManager.createBeam(
      fromCenter.x, fromCenter.y,
      toCenter.x, toCenter.y,
      ELEMENT_COLORS[attacker.element],
      0.3
    );

    target.health -= attacker.attack;
    target.shakeTime = 0.2;
    attacker.hasActed = true;

    this.effectManager.spawnParticles(toCenter.x, toCenter.y, '#ffffff', 8);

    if (target.health <= 0) {
      this.removeCreature(target);
    }

    return true;
  }

  removeCreature(creature: Creature) {
    const cell = this.grid[creature.position.y][creature.position.x];
    if (cell) {
      cell.creature = null;
    }
    const index = this.creatures.indexOf(creature);
    if (index > -1) {
      this.creatures.splice(index, 1);
    }

    const center = this.getCellCenter(creature.position.x, creature.position.y);
    this.effectManager.spawnParticles(center.x, center.y, ELEMENT_COLORS[creature.element], 25);
  }

  highlightValidMoves(owner: 'player' | 'enemy') {
    this.clearHighlights();
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.canPlaceCreature(x, y, owner)) {
          this.grid[y][x].highlighted = true;
          this.grid[y][x].highlightType = 'valid';
        }
      }
    }
  }

  highlightAttackTargets(creature: Creature) {
    this.clearHighlights();
    const targets = this.getAttackableTargets(creature);
    for (const cell of targets) {
      cell.highlighted = true;
      cell.highlightType = 'attack';
    }
  }

  clearHighlights() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x].highlighted = false;
        this.grid[y][x].highlightType = null;
      }
    }
    this.selectedCreature = null;
  }

  resetCreatureActions() {
    for (const creature of this.creatures) {
      creature.hasActed = false;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    this.renderGrid(ctx);
    this.renderCreatures(ctx);
  }

  private renderGrid(ctx: CanvasRenderingContext2D) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const px = this.offsetX + x * this.cellSize;
        const py = this.offsetY + y * this.cellSize;

        let baseColor = (x + y) % 2 === 0 ? '#1a1a2e' : '#16213e';
        
        if (this.isPlayerHalf(y)) {
          baseColor = (x + y) % 2 === 0 ? '#1a2a4e' : '#16315e';
        }
        if (this.isEnemyHalf(y)) {
          baseColor = (x + y) % 2 === 0 ? '#2e1a2e' : '#3e162a';
        }

        ctx.fillStyle = baseColor;
        ctx.fillRect(px, py, this.cellSize, this.cellSize);

        if (this.grid[y][x].highlighted) {
          let highlightColor = 'rgba(100, 255, 100, 0.3)';
          if (this.grid[y][x].highlightType === 'attack') {
            highlightColor = 'rgba(255, 100, 100, 0.4)';
          } else if (this.grid[y][x].highlightType === 'invalid') {
            highlightColor = 'rgba(255, 100, 100, 0.3)';
          }
          ctx.fillStyle = highlightColor;
          ctx.fillRect(px, py, this.cellSize, this.cellSize);
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, this.cellSize, this.cellSize);
      }
    }
  }

  private renderCreatures(ctx: CanvasRenderingContext2D) {
    for (const creature of this.creatures) {
      const center = this.getCellCenter(creature.position.x, creature.position.y);
      const drawX = center.x + creature.shakeOffset.x;
      const drawY = center.y + creature.shakeOffset.y;

      const pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
      const glowGradient = ctx.createRadialGradient(drawX, drawY, 5, drawX, drawY, 35 * pulseScale);
      glowGradient.addColorStop(0, ELEMENT_GLOW[creature.element]);
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(drawX, drawY, 35 * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      const baseGradient = ctx.createRadialGradient(drawX, drawY + 5, 0, drawX, drawY + 5, 25);
      baseGradient.addColorStop(0, ELEMENT_COLORS[creature.element]);
      baseGradient.addColorStop(0.7, ELEMENT_COLORS[creature.element] + '88');
      baseGradient.addColorStop(1, ELEMENT_COLORS[creature.element] + '33');
      ctx.fillStyle = baseGradient;
      ctx.beginPath();
      ctx.ellipse(drawX, drawY + 15, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ELEMENT_COLORS[creature.element];
      ctx.beginPath();
      ctx.arc(drawX, drawY, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const symbols: Record<string, string> = {
        fire: '🔥',
        water: '💧',
        earth: '🌍',
        wind: '💨',
        light: '✨',
        dark: '🌙'
      };
      ctx.fillText(symbols[creature.element] || '●', drawX, drawY);

      ctx.fillStyle = '#ff6666';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`⚔${creature.attack}`, drawX - 18, drawY - 20);

      ctx.fillStyle = creature.health > creature.maxHealth * 0.3 ? '#66ff66' : '#ff6666';
      ctx.fillText(`❤${creature.health}`, drawX + 18, drawY - 20);

      if (creature.hasActed && creature.owner === 'player') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(drawX, drawY, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      if (this.selectedCreature === creature) {
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(drawX, drawY, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}
