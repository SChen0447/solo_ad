import type { GameEngine, GameState } from '../game/GameEngine';
import { Formation } from '../game/Formation';
import type { Unit, Position } from '../game/Unit';

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameEngine: GameEngine;
  private animationTime: number = 0;
  private selectionRect: SelectionRect;
  private formationAnimScale: number = 1;
  private formationAnimTime: number = 0;
  private lastKillCount: number = 0;
  private killCountAnimTime: number = 0;
  private killCountDisplay: number = 0;
  private lastGameTime: number = 0;
  private gameTimeAnimTime: number = 0;

  private readonly BG_COLOR = '#1a1a2e';
  private readonly MAP_BG_COLOR = '#3a5f0b';
  private readonly GRID_COLOR = '#2e4f0a';
  private readonly GRID_SIZE = 40;

  constructor(canvas: HTMLCanvasElement, gameEngine: GameEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameEngine = gameEngine;
    this.selectionRect = { startX: 0, startY: 0, endX: 0, endY: 0, active: false };
  }

  public setSelectionRect(rect: SelectionRect): void {
    this.selectionRect = { ...rect };
  }

  public triggerFormationAnimation(): void {
    this.formationAnimTime = 0;
  }

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;

    if (this.formationAnimTime < 0.3) {
      this.formationAnimTime += deltaTime;
      const t = Math.min(this.formationAnimTime / 0.3, 1);
      this.formationAnimScale = this.bounceScale(t);
    } else {
      this.formationAnimScale = 1;
    }

    const state = this.gameEngine.getState();
    if (state.killCount !== this.lastKillCount) {
      this.killCountAnimTime = 0;
      this.lastKillCount = state.killCount;
    }
    if (this.killCountAnimTime < 0.5) {
      this.killCountAnimTime += deltaTime;
      const t = Math.min(this.killCountAnimTime / 0.5, 1);
      this.killCountDisplay = Math.floor(state.killCount * easeOutCubic(t));
    } else {
      this.killCountDisplay = state.killCount;
    }

    if (Math.floor(state.gameTime) !== Math.floor(this.lastGameTime)) {
      this.gameTimeAnimTime = 0;
    }
    this.gameTimeAnimTime += deltaTime;
    this.lastGameTime = state.gameTime;
  }

  private bounceScale(t: number): number {
    if (t < 0.5) {
      return 1 + 0.3 * Math.sin(t * Math.PI);
    } else {
      return 1 + 0.3 * Math.sin((1 - t) * Math.PI * 2) * (1 - t) * 2;
    }
  }

  public draw(): void {
    const state = this.gameEngine.getState();
    const mapWidth = this.canvas.width * 0.7;
    const mapHeight = this.canvas.height;
    const panelWidth = this.canvas.width * 0.3;

    this.ctx.fillStyle = this.BG_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawMap(mapWidth, mapHeight, state);
    this.drawTopBar(mapWidth, state);
    this.drawRightPanel(mapWidth, 0, panelWidth, mapHeight, state);
    this.drawCombatLog(state);

    if (this.selectionRect.active) {
      this.drawSelectionRectangle();
    }
  }

  private drawMap(width: number, height: number, state: GameState): void {
    this.ctx.fillStyle = this.MAP_BG_COLOR;
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = this.GRID_COLOR;
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += this.GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= height; y += this.GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    for (const enemy of state.enemyUnits) {
      this.drawPatrolPath(enemy);
    }

    if (state.moveTarget && state.selectedUnits.length > 0) {
      this.drawMoveTarget(state.moveTarget);
    }

    for (const unit of state.playerUnits) {
      if (unit.isSelected) {
        this.drawSelectionRing(unit);
      }
    }

    for (const unit of state.enemyUnits) {
      this.drawUnit(unit);
    }
    for (const unit of state.playerUnits) {
      this.drawUnit(unit);
    }
  }

  private drawPatrolPath(enemy: Unit): void {
    if (enemy.patrolPath.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 4]);

    this.ctx.beginPath();
    this.ctx.moveTo(enemy.patrolPath[0].x, enemy.patrolPath[0].y);
    for (let i = 1; i < enemy.patrolPath.length; i++) {
      this.ctx.lineTo(enemy.patrolPath[i].x, enemy.patrolPath[i].y);
    }
    this.ctx.lineTo(enemy.patrolPath[0].x, enemy.patrolPath[0].y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawMoveTarget(target: Position): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 4);
    const radius = 15 + pulse * 5;

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(target.x, target.y, radius - 5, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawSelectionRing(unit: Unit): void {
    const freq = 1.5;
    const alpha = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(this.animationTime * Math.PI * 2 * freq));
    const radius = unit.radius + 6;

    this.ctx.save();
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.beginPath();
    this.ctx.arc(unit.position.x, unit.position.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawMoveArrow(unit: Unit): void {
    if (!unit.isMoving) return;

    const { x, y } = unit.position;
    const arrowSize = 8;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(unit.facingAngle);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.beginPath();
    this.ctx.moveTo(unit.radius + 4 + arrowSize, 0);
    this.ctx.lineTo(unit.radius + 4, -arrowSize / 2);
    this.ctx.lineTo(unit.radius + 4, arrowSize / 2);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawUnit(unit: Unit): void {
    if (unit.isDead()) return;

    const bounceY = unit.isBouncing ? -unit.bounceOffset : 0;
    const { x, y } = unit.position;
    const drawY = y + bounceY;
    const radius = unit.radius;

    let bodyColor = '';
    if (unit.team === 'player') {
      switch (unit.type) {
        case 'infantry':
          bodyColor = '#4a9eff';
          break;
        case 'archer':
          bodyColor = '#4aff6a';
          break;
        case 'cavalry':
          bodyColor = '#ff4a4a';
          break;
      }
    } else {
      bodyColor = '#e74c3c';
    }

    this.drawMoveArrow(unit);

    this.ctx.save();

    this.ctx.fillStyle = bodyColor;
    this.ctx.beginPath();
    this.ctx.arc(x, drawY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.translate(x, drawY);
    this.ctx.rotate(unit.facingAngle);

    this.ctx.fillStyle = unit.team === 'player' ? '#ffffff' : '#ffcccc';
    this.ctx.beginPath();
    this.ctx.moveTo(radius - 2, 0);
    this.ctx.lineTo(radius - 12, -6);
    this.ctx.lineTo(radius - 12, 6);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();

    this.drawHealthBar(unit, bounceY);
  }

  private drawHealthBar(unit: Unit, bounceY: number = 0): void {
    const barWidth = unit.radius * 2;
    const barHeight = 4;
    const x = unit.position.x - barWidth / 2;
    const y = unit.position.y + bounceY - unit.radius - 10;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    const hpRatio = unit.hp / unit.maxHp;
    let hpColor = '#4caf50';
    if (hpRatio < 0.3) {
      hpColor = '#f44336';
    } else if (hpRatio < 0.6) {
      hpColor = '#ff9800';
    }

    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
  }

  private drawSelectionRectangle(): void {
    const { startX, startY, endX, endY } = this.selectionRect;
    const left = Math.min(startX, endX);
    const right = Math.max(startX, endX);
    const top = Math.min(startY, endY);
    const bottom = Math.max(startY, endY);
    const width = right - left;
    const height = bottom - top;

    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 6);
    const alpha = 0.15 + pulse * 0.1;

    this.ctx.save();

    this.ctx.fillStyle = `rgba(74, 158, 255, ${alpha})`;
    this.roundRect(left, top, width, height, 10);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)';
    this.ctx.lineWidth = 2;
    this.roundRect(left, top, width, height, 10);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  private drawTopBar(mapWidth: number, state: GameState): void {
    this.ctx.save();

    const gradient = this.ctx.createLinearGradient(0, 0, 0, 50);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, mapWidth, 50);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '18px "Segoe UI", sans-serif';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`选中单位: ${state.selectedUnits.length}`, 20, 12);

    const formationName = Formation.getFormationName(state.currentFormation);
    this.ctx.save();
    this.ctx.translate(mapWidth / 2, 25);
    this.ctx.scale(this.formationAnimScale, this.formationAnimScale);
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(formationName, 0, 0);
    this.ctx.restore();

    this.ctx.restore();
  }

  private drawRightPanel(x: number, y: number, width: number, height: number, state: GameState): void {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.roundRectPath(x + 10, y + 10, width - 20, height - 20, 12);
    this.ctx.fill();

    const statsY = y + 30;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('战斗统计', x + 30, statsY);

    const timeStr = this.formatTime(Math.floor(state.gameTime));
    this.ctx.fillStyle = '#cccccc';
    this.ctx.font = '14px "Segoe UI", sans-serif';
    this.ctx.fillText(`游戏时间: ${timeStr}`, x + 30, statsY + 30);

    const killYOffset = 55;
    const killDisplay = this.killCountDisplay;
    const killPulse = this.killCountAnimTime < 0.3 ? 1 + 0.2 * Math.sin(this.killCountAnimTime * Math.PI * 10) : 1;

    this.ctx.save();
    this.ctx.translate(x + 30, statsY + killYOffset + 10);
    this.ctx.scale(killPulse, killPulse);
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`杀敌数: ${killDisplay}`, 0, 0);
    this.ctx.restore();

    const listTitleY = statsY + 100;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
    this.ctx.fillText('选中单位', x + 30, listTitleY);

    this.drawSelectedUnitsList(x + 30, listTitleY + 30, width - 60, height - listTitleY - 60, state.selectedUnits);

    this.ctx.restore();
  }

  private drawSelectedUnitsList(x: number, y: number, width: number, _maxHeight: number, units: Unit[]): void {
    if (units.length === 0) {
      this.ctx.fillStyle = '#666666';
      this.ctx.font = '13px "Segoe UI", sans-serif';
      this.ctx.fillText('暂无选中单位', x, y);
      return;
    }

    const iconSize = 30;
    const spacing = 8;
    const padding = 5;
    const rowHeight = iconSize + padding * 2;

    let currentY = y;

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (unit.isDead()) continue;

      const bgY = currentY + padding / 2;

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      this.roundRectPath(x - 5, bgY, width + 10, iconSize + padding, 6);
      this.ctx.fill();

      let iconColor = '#4a9eff';
      switch (unit.type) {
        case 'infantry':
          iconColor = '#4a9eff';
          break;
        case 'archer':
          iconColor = '#4aff6a';
          break;
        case 'cavalry':
          iconColor = '#ff4a4a';
          break;
      }

      this.ctx.fillStyle = iconColor;
      this.roundRectPath(x, currentY + padding, iconSize, iconSize, 4);
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.font = 'bold 12px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const typeLabel = unit.type === 'infantry' ? '步' : unit.type === 'archer' ? '弓' : '骑';
      this.ctx.fillText(typeLabel, x + iconSize / 2, currentY + padding + iconSize / 2);

      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '13px "Segoe UI", sans-serif';
      this.ctx.fillText(unit.name, x + iconSize + spacing, currentY + padding + 2);

      this.ctx.fillStyle = '#888888';
      this.ctx.font = '11px "Segoe UI", sans-serif';
      const typeName = unit.type === 'infantry' ? '步兵' : unit.type === 'archer' ? '弓箭手' : '骑兵';
      this.ctx.fillText(typeName, x + iconSize + spacing, currentY + padding + 16);

      const hpBarWidth = 60;
      const hpBarHeight = 6;
      const hpBarX = x + iconSize + spacing;
      const hpBarY = currentY + padding + iconSize - 8;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.roundRectPath(hpBarX, hpBarY, hpBarWidth, hpBarHeight, 3);
      this.ctx.fill();

      const hpRatio = unit.hp / unit.maxHp;
      if (hpRatio > 0) {
        const gradient = this.ctx.createLinearGradient(hpBarX, 0, hpBarX + hpBarWidth * hpRatio, 0);
        if (hpRatio < 0.3) {
          gradient.addColorStop(0, '#f44336');
          gradient.addColorStop(1, '#ff7043');
        } else if (hpRatio < 0.6) {
          gradient.addColorStop(0, '#ff9800');
          gradient.addColorStop(1, '#ffb74d');
        } else {
          gradient.addColorStop(0, '#66bb6a');
          gradient.addColorStop(1, '#a5d6a7');
        }
        this.ctx.fillStyle = gradient;
        this.roundRectPath(hpBarX, hpBarY, hpBarWidth * hpRatio, hpBarHeight, 3);
        this.ctx.fill();
      }

      currentY += rowHeight;
    }
  }

  private drawCombatLog(state: GameState): void {
    const panelX = 20;
    const panelY = this.canvas.height - 320;
    const panelWidth = 280;
    const panelHeight = 280;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.roundRectPath(panelX, panelY, panelWidth, panelHeight, 8);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 14px "Segoe UI", sans-serif';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('战斗日志', panelX + 15, panelY + 12);

    const logs = state.combatLogs;
    const logStartY = panelY + 40;
    const lineHeight = 22;
    const maxLines = Math.floor((panelHeight - 50) / lineHeight);

    const startIdx = Math.max(0, logs.length - maxLines);
    const visibleLogs = logs.slice(startIdx);

    for (let i = 0; i < visibleLogs.length; i++) {
      const log = visibleLogs[i];
      const y = logStartY + i * lineHeight;

      this.ctx.globalAlpha = log.opacity;
      this.ctx.fillStyle = '#dddddd';
      this.ctx.font = '12px "Segoe UI", sans-serif';
      this.ctx.fillText(log.message, panelX + 15, y);
    }

    this.ctx.restore();
  }

  private roundRectPath(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
