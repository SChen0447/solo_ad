import { StarMap } from './starMap';
import { FleetControl, Ship } from './fleetControl';
import { InvasionSystem } from './invasionSystem';

interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  hovered: boolean;
  active: boolean;
  onClick: () => void;
}

export class UIPanel {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private starMap: StarMap;
  private fleetControl: FleetControl;
  private invasionSystem: InvasionSystem;

  private readonly PANEL_WIDTH = 240;
  private readonly CONTROL_BAR_HEIGHT = 60;
  private readonly MINIMAP_SIZE = 120;
  private readonly MINIMAP_PADDING = 16;

  private buttons: Button[] = [];

  constructor(canvas: HTMLCanvasElement, starMap: StarMap, fleetControl: FleetControl, invasionSystem: InvasionSystem) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.starMap = starMap;
    this.fleetControl = fleetControl;
    this.invasionSystem = invasionSystem;
    this.initButtons();
    this.bindEvents();
  }

  private initButtons(): void {
    const btnW = 120;
    const btnH = 36;
    const spacing = 16;
    const startY = this.canvas.height - this.CONTROL_BAR_HEIGHT + (this.CONTROL_BAR_HEIGHT - btnH) / 2;
    let startX = (this.canvas.width - this.PANEL_WIDTH - this.MINIMAP_SIZE - this.MINIMAP_PADDING * 2 - (btnW * 3 + spacing * 2)) / 2 + this.PANEL_WIDTH;

    this.buttons = [
      {
        x: startX,
        y: startY,
        w: btnW,
        h: btnH,
        label: '全选舰队',
        hovered: false,
        active: false,
        onClick: () => this.fleetControl.selectAll()
      },
      {
        x: startX + btnW + spacing,
        y: startY,
        w: btnW,
        h: btnH,
        label: '防御模式',
        hovered: false,
        active: false,
        onClick: () => {
          this.fleetControl.toggleDefensiveMode();
          this.buttons[1].active = this.fleetControl.defensiveMode;
        }
      },
      {
        x: startX + (btnW + spacing) * 2,
        y: startY,
        w: btnW,
        h: btnH,
        label: '撤退休整',
        hovered: false,
        active: false,
        onClick: () => this.fleetControl.retreatAll()
      }
    ];
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('click', this.onClick.bind(this));
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const btn of this.buttons) {
      btn.hovered = mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
    }
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const btn of this.buttons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        btn.onClick();
      }
    }
  }

  public resize(): void {
    this.initButtons();
  }

  public render(): void {
    this.renderInfoPanel();
    this.renderControlBar();
    this.renderMinimap();
  }

  private drawGlassPanel(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(26, 10, 46, 0.7)';
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  private renderInfoPanel(): void {
    const ctx = this.ctx;
    const padding = 12;
    const panelH = this.canvas.height - this.CONTROL_BAR_HEIGHT - padding * 2;
    const x = padding;
    const y = padding;

    this.drawGlassPanel(x, y, this.PANEL_WIDTH, panelH);

    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('舰队信息', x + padding, y + padding + 12);

    const selected = this.fleetControl.getSelectedShips();
    const friendly = this.fleetControl.getFriendlyShips();
    const displayList = selected.length > 0 ? selected : friendly;

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "Courier New", monospace';

    let avgArmor = 0, avgAttack = 0;
    for (const s of displayList) {
      avgArmor += s.armor;
      avgAttack += s.attack;
    }
    if (displayList.length > 0) {
      avgArmor /= displayList.length;
      avgAttack /= displayList.length;
    }

    let infoY = y + padding + 36;
    const lineH = 20;
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`选中数量: ${selected.length} / ${friendly.length}`, x + padding, infoY);
    infoY += lineH;
    ctx.fillText(`平均护甲: ${avgArmor.toFixed(1)}`, x + padding, infoY);
    infoY += lineH;
    ctx.fillText(`平均攻击: ${avgAttack.toFixed(1)}`, x + padding, infoY);
    infoY += lineH;

    ctx.fillStyle = '#ff6666';
    const enemyCount = this.fleetControl.getEnemyShips().length;
    ctx.fillText(`敌方数量: ${enemyCount}`, x + padding, infoY);
    infoY += lineH;

    ctx.fillStyle = '#ffd700';
    ctx.fillText(`下波入侵: ${Math.ceil(this.invasionSystem.nextWaveCountdown)}秒`, x + padding, infoY);
    infoY += lineH;
    ctx.fillText(`第 ${this.invasionSystem.waveNumber} 波`, x + padding, infoY);
    infoY += 8;

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x + padding, infoY);
    ctx.lineTo(x + this.PANEL_WIDTH - padding, infoY);
    ctx.stroke();
    infoY += 12;

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillText(selected.length > 0 ? '选中飞船' : '我方舰队', x + padding, infoY);
    infoY += 18;

    const avatarSize = 32;
    const avatarGap = 6;
    const perRow = Math.floor((this.PANEL_WIDTH - padding * 2) / (avatarSize + avatarGap));
    let listToShow = displayList.slice(0, 60);
    for (let i = 0; i < listToShow.length; i++) {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const ax = x + padding + col * (avatarSize + avatarGap);
      const ay = infoY + row * (avatarSize + avatarGap);
      if (ay + avatarSize > y + panelH - padding) break;
      this.renderShipAvatar(listToShow[i], ax, ay, avatarSize);
    }

    ctx.restore();
  }

  private renderShipAvatar(ship: Ship, x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = ship.selected ? 'rgba(100, 200, 255, 0.3)' : 'rgba(255, 215, 0, 0.1)';
    ctx.strokeStyle = ship.selected ? 'rgba(100, 200, 255, 0.8)' : 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.roundRect(ctx, x, y, size, size, 4);
    ctx.fill();
    ctx.stroke();

    const cx = x + size / 2;
    const cy = y + size / 2;
    const s = size * 0.3;
    ctx.fillStyle = ship.isEnemy ? '#ff4444' : '#44aaff';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + s, cy);
    ctx.lineTo(cx - s * 0.7, cy - s * 0.7);
    ctx.lineTo(cx - s * 0.4, cy);
    ctx.lineTo(cx - s * 0.7, cy + s * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const barW = size - 6;
    const barH = 3;
    const barY = y + size - 5;
    const hp = ship.health / ship.maxHealth;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x + 3, barY, barW, barH);
    ctx.fillStyle = ship.isEnemy ? '#ff4444' : '#44ff44';
    ctx.fillRect(x + 3, barY, barW * hp, barH);

    ctx.restore();
  }

  private renderControlBar(): void {
    const ctx = this.ctx;
    const y = this.canvas.height - this.CONTROL_BAR_HEIGHT;

    this.drawGlassPanel(0, y, this.canvas.width, this.CONTROL_BAR_HEIGHT);

    for (const btn of this.buttons) {
      this.renderButton(btn);
    }

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px "Courier New", monospace';
    ctx.fillText('左键框选 | 右键移动 | Alt+左键拖动画布 | 滚轮缩放', 16, y + this.CONTROL_BAR_HEIGHT / 2 + 4);
    ctx.restore();
  }

  private renderButton(btn: Button): void {
    const ctx = this.ctx;
    ctx.save();

    if (btn.hovered) {
      ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
      ctx.shadowBlur = 12;
    }

    let bgColor = btn.active ? 'rgba(255, 215, 0, 0.25)' : 'rgba(26, 10, 46, 0.8)';
    if (btn.hovered && !btn.active) bgColor = 'rgba(255, 215, 0, 0.15)';

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = btn.hovered || btn.active ? 'rgba(255, 215, 0, 0.7)' : 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = btn.hovered || btn.active ? '#ffd700' : '#ffffff';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.restore();
  }

  private renderMinimap(): void {
    const ctx = this.ctx;
    const x = this.canvas.width - this.MINIMAP_SIZE - this.MINIMAP_PADDING;
    const y = this.MINIMAP_PADDING;
    const size = this.MINIMAP_SIZE;

    this.drawGlassPanel(x, y, size, size);

    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 6);
    ctx.clip();

    ctx.fillStyle = '#0d0520';
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    const scaleX = (size - 4) / this.starMap.worldWidth;
    const scaleY = (size - 4) / this.starMap.worldHeight;
    const scale = Math.min(scaleX, scaleY);
    const offX = x + 2 + ((size - 4) - this.starMap.worldWidth * scale) / 2;
    const offY = y + 2 + ((size - 4) - this.starMap.worldHeight * scale) / 2;

    const ships = this.fleetControl.ships;
    for (const ship of ships) {
      const mx = offX + ship.x * scale;
      const my = offY + ship.y * scale;
      ctx.fillStyle = ship.isEnemy ? '#ff4444' : (ship.selected ? '#66ffff' : '#44aaff');
      ctx.fillRect(mx - 1, my - 1, 3, 3);
    }

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 1;
    const vx = offX + this.starMap.camera.x * scale;
    const vy = offY + this.starMap.camera.y * scale;
    const vw = (this.canvas.width / this.starMap.camera.scale) * scale;
    const vh = (this.canvas.height / this.starMap.camera.scale) * scale;
    ctx.strokeRect(vx, vy, vw, vh);

    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText('星图', x + 8, y + 16);
    ctx.restore();
  }
}
