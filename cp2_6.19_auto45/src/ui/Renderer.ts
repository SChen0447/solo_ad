import { Unit, UNIT_STATS } from '../game/Unit';
import { GameState } from '../game/GameEngine';
import { FORMATION_NAMES, FormationType } from '../game/Formation';

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isSelecting: boolean;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private readonly MAP_BG = '#3a5f0b';
  private readonly GRID_COLOR = '#2e4f0a';
  private readonly GRID_SIZE = 50;
  private readonly PANEL_BG = 'rgba(0, 0, 0, 0.7)';
  private readonly SEL_BOX_COLOR = 'rgba(74, 158, 255, 0.3)';
  private readonly SEL_BOX_BORDER = 'rgba(74, 158, 255, 0.8)';
  private readonly LOG_PANEL_WIDTH = 250;
  private readonly RIGHT_PANEL_RATIO = 0.3;

  private animationTime = 0;
  private formationChangeTime = -1;
  private lastFormationType: FormationType | null = null;
  private lastKillCount = 0;
  private lastTime = 0;
  private killCountAnimTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public getMapWidth(): number {
    return this.canvas.width * (1 - this.RIGHT_PANEL_RATIO);
  }

  public getMapHeight(): number {
    return this.canvas.height;
  }

  public draw(
    state: GameState,
    selectionBox: SelectionBox | null,
    rightClickTarget: { x: number; y: number } | null
  ): void {
    const now = performance.now() / 1000;
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.animationTime = now;

    if (state.killCount !== this.lastKillCount) {
      this.killCountAnimTime = now;
      this.lastKillCount = state.killCount;
    }

    if (state.currentFormation !== this.lastFormationType) {
      this.formationChangeTime = now;
      this.lastFormationType = state.currentFormation;
    }

    const mapWidth = this.getMapWidth();
    const mapHeight = this.getMapHeight();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawMapBackground(mapWidth, mapHeight);
    this.drawEnemyPatrolPaths(state);
    this.drawMoveTarget(rightClickTarget);

    for (const enemy of state.enemyUnits) {
      this.drawUnit(enemy);
    }
    for (const unit of state.playerUnits) {
      this.drawUnit(unit);
    }

    for (const unit of state.playerUnits) {
      if (unit.isSelected && unit.isAlive()) {
        this.drawSelectionRing(unit);
      }
    }

    if (selectionBox && selectionBox.isSelecting) {
      this.drawSelectionBox(selectionBox);
    }

    this.drawLogPanel(state);
    this.drawRightPanel(state);
    this.drawTopBar(state, mapWidth);
  }

  private drawMapBackground(width: number, height: number): void {
    this.ctx.fillStyle = this.MAP_BG;
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
  }

  private drawEnemyPatrolPaths(state: GameState): void {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 4]);

    for (const enemy of state.enemyUnits) {
      const path = state.enemyPatrolPaths.get(enemy.id);
      if (!path || path.length < 2) continue;

      this.ctx.beginPath();
      this.ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        this.ctx.lineTo(path[i].x, path[i].y);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawMoveTarget(target: { x: number; y: number } | null): void {
    if (!target) return;

    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 6);
    const radius = 10 + pulse * 5;

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.4})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + pulse * 0.3})`;
    this.ctx.beginPath();
    this.ctx.arc(target.x, target.y, radius + 6, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawUnit(unit: Unit): void {
    if (!unit.isAlive()) return;

    const { x, y } = unit.position;

    this.ctx.save();
    this.ctx.translate(x, y);

    this.ctx.fillStyle = unit.color;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, unit.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = unit.team === 'player' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.rotate(unit.facingAngle);
    this.ctx.fillStyle = unit.team === 'player' ? '#ffffff' : '#ffaaaa';
    this.ctx.beginPath();
    const triSize = unit.radius * 0.7;
    this.ctx.moveTo(triSize, 0);
    this.ctx.lineTo(-triSize * 0.5, -triSize * 0.6);
    this.ctx.lineTo(-triSize * 0.5, triSize * 0.6);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();

    if (unit.hp < unit.maxHp) {
      this.drawHpBar(unit);
    }
  }

  private drawHpBar(unit: Unit): void {
    const barWidth = unit.radius * 2;
    const barHeight = 4;
    const x = unit.position.x - barWidth / 2;
    const y = unit.position.y - unit.radius - 10;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    const hpRatio = unit.hp / unit.maxHp;
    const hpColor = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#fbbf24' : '#ef4444';
    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
  }

  private drawSelectionRing(unit: Unit): void {
    const blink = 0.5 + 0.5 * Math.sin(this.animationTime * Math.PI * 3);
    const alpha = 0.2 + blink * 0.4;
    const radius = unit.radius + 6 + blink * 2;

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(unit.position.x, unit.position.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawSelectionBox(box: SelectionBox): void {
    const x = Math.min(box.startX, box.endX);
    const y = Math.min(box.startY, box.endY);
    const w = Math.abs(box.endX - box.startX);
    const h = Math.abs(box.endY - box.startY);

    const pulse = 0.85 + 0.15 * Math.sin(this.animationTime * 8);

    this.ctx.save();
    this.roundRect(x, y, w, h, 10);
    this.ctx.fillStyle = `rgba(74, 158, 255, ${0.3 * pulse})`;
    this.ctx.fill();
    this.ctx.strokeStyle = `rgba(74, 158, 255, ${0.9})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + w - radius, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.ctx.lineTo(x + w, y + h - radius);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.ctx.lineTo(x + radius, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  private drawLogPanel(state: GameState): void {
    const panelX = 10;
    const panelY = 60;
    const panelW = this.LOG_PANEL_WIDTH;
    const panelH = Math.min(400, this.canvas.height - 80);

    this.ctx.save();
    this.roundRect(panelX, panelY, panelW, panelH, 8);
    this.ctx.fillStyle = this.PANEL_BG;
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.fillText('战斗日志', panelX + 12, panelY + 24);

    this.ctx.font = '12px sans-serif';
    const lineHeight = 22;
    const startY = panelY + 48;
    const maxLines = Math.floor((panelH - 60) / lineHeight);

    for (let i = 0; i < Math.min(state.combatLogs.length, maxLines); i++) {
      const log = state.combatLogs[i];
      const y = startY + i * lineHeight;
      this.ctx.globalAlpha = log.opacity;
      this.ctx.fillStyle = '#e0e0e0';
      const timeStr = this.formatTime(log.timestamp);
      this.ctx.fillText(`[${timeStr}] ${log.message}`, panelX + 12, y);
    }
    this.ctx.globalAlpha = 1;
    this.ctx.restore();
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private drawRightPanel(state: GameState): void {
    const panelX = this.canvas.width * (1 - this.RIGHT_PANEL_RATIO);
    const panelW = this.canvas.width * this.RIGHT_PANEL_RATIO;
    const panelH = this.canvas.height;

    this.ctx.save();
    this.ctx.fillStyle = this.PANEL_BG;
    this.ctx.fillRect(panelX, 0, panelW, panelH);

    const padding = 15;
    let curY = padding;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.fillText('统计信息', panelX + padding, curY + 16);
    curY += 36;

    const timeAnimOffset = this.animationTime * 0.5;
    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#cccccc';
    this.ctx.fillText('游戏时间', panelX + padding, curY + 14);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.fillText(this.formatTime(state.elapsedTime), panelX + padding, curY + 38);
    curY += 60;

    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#cccccc';
    this.ctx.fillText('击杀数', panelX + padding, curY + 14);

    const killAnimProgress = Math.min(1, (this.animationTime - this.killCountAnimTime) / 0.5);
    const killOffsetY = killAnimProgress < 1 ? -(1 - killAnimProgress) * 10 : 0;
    const killAlpha = killAnimProgress < 1 ? 0.5 + killAnimProgress * 0.5 : 1;
    this.ctx.save();
    this.ctx.globalAlpha = killAlpha;
    this.ctx.fillStyle = '#ef4444';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.fillText(state.killCount.toString(), panelX + padding, curY + 38 + killOffsetY);
    this.ctx.restore();
    curY += 60;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.fillText(`已选单位 (${state.selectedUnits.length})`, panelX + padding, curY + 16);
    curY += 36;

    this.drawUnitList(state, panelX + padding, curY, panelW - padding * 2);

    this.ctx.restore();
  }

  private drawUnitList(state: GameState, x: number, y: number, width: number): void {
    const iconSize = 30;
    const gap = 10;
    const cols = Math.max(1, Math.floor((width + gap) / (iconSize + gap)));

    for (let i = 0; i < state.selectedUnits.length; i++) {
      const unit = state.selectedUnits[i];
      if (!unit.isAlive()) continue;

      const col = i % cols;
      const row = Math.floor(i / cols);
      const ix = x + col * (iconSize + gap);
      const iy = y + row * (iconSize + gap + 18);

      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.fillRect(ix, iy, iconSize, iconSize);

      this.ctx.fillStyle = unit.color;
      this.ctx.beginPath();
      this.ctx.arc(ix + iconSize / 2, iy + iconSize / 2, iconSize / 2 - 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(unit.displayName, ix + iconSize / 2, iy + iconSize + 12);
      this.ctx.textAlign = 'left';
      this.ctx.restore();
    }
  }

  private drawTopBar(state: GameState, mapWidth: number): void {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, mapWidth, 44);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '18px sans-serif';
    this.ctx.fillText(`已选: ${state.selectedUnits.length} 单位`, 20, 28);

    const formationText = FORMATION_NAMES[state.currentFormation];
    const formAnimElapsed = this.formationChangeTime >= 0 ? this.animationTime - this.formationChangeTime : 999;
    let scale = 1;
    if (formAnimElapsed < 0.3) {
      const t = formAnimElapsed / 0.3;
      scale = 1 + Math.sin(t * Math.PI) * 0.3;
    }

    this.ctx.font = `bold ${16 * scale}px sans-serif`;
    this.ctx.fillStyle = '#4ade80';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(formationText, mapWidth / 2, 28);
    this.ctx.textAlign = 'left';

    this.ctx.restore();
  }
}
