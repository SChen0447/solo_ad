import { TowerType, TOWER_CONFIGS, Point } from '../config';
import { Tower, TowerSlot } from '../units/Tower';

export interface UIButton {
  x: number;
  y: number;
  width: number;
  height: number;
  hovered: boolean;
  pressed: boolean;
  flashTime: number;
}

export interface Toast {
  message: string;
  timer: number;
  maxTime: number;
  color: string;
  y: number;
}

export interface ShopItem {
  type: TowerType;
  button: UIButton;
}

export class UIManager {
  private canvasWidth: number;
  private canvasHeight: number;
  scale: number;

  gold: number;
  wave: number;
  wallHP: number;
  wallMaxHP: number;

  toasts: Toast[];
  hoveredTower: Tower | null;
  selectedTower: Tower | null;
  longPressTimer: number;
  longPressTarget: Tower | null;
  showShop: boolean;
  shopSlot: TowerSlot | null;
  shopItems: ShopItem[];
  showUpgradePanel: boolean;
  upgradePanelTower: Tower | null;
  upgradeButton: UIButton;
  closeButton: UIButton;
  mouseX: number;
  mouseY: number;
  waveAnnouncement: string;
  announcementTimer: number;
  screenShake: number;

  newlyAcquiredTowers: Set<TowerType>;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.scale = 1;

    this.gold = 200;
    this.wave = 0;
    this.wallHP = 500;
    this.wallMaxHP = 500;

    this.toasts = [];
    this.hoveredTower = null;
    this.selectedTower = null;
    this.longPressTimer = 0;
    this.longPressTarget = null;
    this.showShop = false;
    this.shopSlot = null;
    this.shopItems = [];
    this.showUpgradePanel = false;
    this.upgradePanelTower = null;
    this.upgradeButton = { x: 0, y: 0, width: 0, height: 0, hovered: false, pressed: false, flashTime: 0 };
    this.closeButton = { x: 0, y: 0, width: 0, height: 0, hovered: false, pressed: false, flashTime: 0 };
    this.mouseX = 0;
    this.mouseY = 0;
    this.waveAnnouncement = '';
    this.announcementTimer = 0;
    this.screenShake = 0;

    this.newlyAcquiredTowers = new Set();
    this.initShopItems();
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.scale = Math.min(width / 1920, height / 1080);
  }

  private initShopItems(): void {
    const types: TowerType[] = ['archer', 'catapult', 'magic'];
    this.shopItems = types.map((type, i) => ({
      type,
      button: {
        x: 0,
        y: 0,
        width: 100,
        height: 120,
        hovered: false,
        pressed: false,
        flashTime: 0
      }
    }));
  }

  addToast(message: string, color: string = '#FFD700'): void {
    this.toasts.push({
      message,
      timer: 2500,
      maxTime: 2500,
      color,
      y: this.canvasHeight - 140
    });
  }

  setWaveAnnouncement(text: string): void {
    this.waveAnnouncement = text;
    this.announcementTimer = 4000;
  }

  addScreenShake(amount: number): void {
    this.screenShake = Math.min(this.screenShake + amount, 20);
  }

  update(dt: number): void {
    this.toasts = this.toasts.filter(t => {
      t.timer -= dt;
      t.y -= dt * 0.03;
      return t.timer > 0;
    });

    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
    }

    if (this.screenShake > 0) {
      this.screenShake -= dt * 0.03;
      if (this.screenShake < 0) this.screenShake = 0;
    }

    if (this.longPressTarget && this.longPressTimer > 0) {
      this.longPressTimer -= dt;
      if (this.longPressTimer <= 0) {
        this.showUpgradePanel = true;
        this.upgradePanelTower = this.longPressTarget;
        this.selectedTower = this.longPressTarget;
        this.longPressTarget = null;
      }
    }

    for (const item of this.shopItems) {
      if (item.button.flashTime > 0) item.button.flashTime -= dt;
    }
    if (this.upgradeButton.flashTime > 0) this.upgradeButton.flashTime -= dt;
    if (this.closeButton.flashTime > 0) this.closeButton.flashTime -= dt;
  }

  handleMouseMove(x: number, y: number, towers: Tower[], slots: TowerSlot[]): void {
    this.mouseX = x;
    this.mouseY = y;

    this.hoveredTower = null;
    for (const tower of towers) {
      if (tower.containsPoint(x, y)) {
        this.hoveredTower = tower;
        break;
      }
    }

    for (const item of this.shopItems) {
      item.button.hovered = this.showShop && this.pointInRect(x, y, item.button);
    }

    if (this.showUpgradePanel) {
      this.upgradeButton.hovered = this.pointInRect(x, y, this.upgradeButton);
      this.closeButton.hovered = this.pointInRect(x, y, this.closeButton);
    }
  }

  handleMouseDown(x: number, y: number, towers: Tower[], slots: TowerSlot[]): { action: string; data?: any } | null {
    this.mouseX = x;
    this.mouseY = y;

    if (this.showUpgradePanel) {
      if (this.pointInRect(x, y, this.upgradeButton)) {
        this.upgradeButton.pressed = true;
        return { action: 'none' };
      }
      if (this.pointInRect(x, y, this.closeButton)) {
        this.closeButton.pressed = true;
        return { action: 'none' };
      }
    }

    if (this.showShop) {
      for (const item of this.shopItems) {
        if (this.pointInRect(x, y, item.button)) {
          item.button.pressed = true;
          return { action: 'none' };
        }
      }
      if (!this.pointInShopArea(x, y)) {
        this.showShop = false;
        this.shopSlot = null;
      }
      return { action: 'none' };
    }

    for (const tower of towers) {
      if (tower.containsPoint(x, y)) {
        this.selectedTower = tower;
        this.longPressTarget = tower;
        this.longPressTimer = 500;
        return { action: 'selectTower', data: tower };
      }
    }

    for (const slot of slots) {
      if (!slot.tower && this.pointInSlot(x, y, slot)) {
        this.showShop = true;
        this.shopSlot = slot;
        return { action: 'openShop', data: slot };
      }
    }

    this.selectedTower = null;
    return null;
  }

  handleMouseUp(x: number, y: number): { action: string; data?: any } | null {
    let result: { action: string; data?: any } | null = null;

    if (this.longPressTarget && this.longPressTimer > 0) {
      this.longPressTarget = null;
      this.longPressTimer = 0;
    }

    if (this.showUpgradePanel) {
      if (this.upgradeButton.pressed && this.pointInRect(x, y, this.upgradeButton)) {
        result = { action: 'upgradeTower', data: this.upgradePanelTower };
      }
      if (this.closeButton.pressed && this.pointInRect(x, y, this.closeButton)) {
        this.showUpgradePanel = false;
        this.upgradePanelTower = null;
        result = { action: 'none' };
      }
      this.upgradeButton.pressed = false;
      this.closeButton.pressed = false;
      if (result) return result;
    }

    if (this.showShop) {
      for (const item of this.shopItems) {
        if (item.button.pressed && this.pointInRect(x, y, item.button)) {
          result = { action: 'buyTower', data: { type: item.type, slot: this.shopSlot } };
          item.button.pressed = false;
          return result;
        }
        item.button.pressed = false;
      }
    }

    return null;
  }

  private pointInRect(px: number, py: number, btn: UIButton): boolean {
    return px >= btn.x && px <= btn.x + btn.width && py >= btn.y && py <= btn.y + btn.height;
  }

  private pointInSlot(px: number, py: number, slot: TowerSlot): boolean {
    const dx = px - slot.x;
    const dy = py - slot.y;
    return dx * dx + dy * dy <= 35 * 35;
  }

  private pointInShopArea(px: number, py: number): boolean {
    if (!this.shopSlot) return false;
    const panelW = 340;
    const panelH = 180;
    const panelX = this.shopSlot.x - panelW / 2;
    const panelY = this.shopSlot.y - panelH - 30;
    return px >= panelX && px <= panelX + panelW && py >= panelY && py <= panelY + panelH;
  }

  markTowerNewlyAcquired(type: TowerType): void {
    this.newlyAcquiredTowers.add(type);
    setTimeout(() => this.newlyAcquiredTowers.delete(type), 3000);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    if (this.screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.screenShake,
        (Math.random() - 0.5) * this.screenShake
      );
    }

    this.drawTopBar(ctx);
    this.drawBottomBar(ctx);
    this.drawWaveAnnouncement(ctx);

    if (this.showShop && this.shopSlot) {
      this.drawShop(ctx);
    }

    if (this.showUpgradePanel && this.upgradePanelTower) {
      this.drawUpgradePanel(ctx);
    }

    this.drawToasts(ctx);

    ctx.restore();
  }

  private drawTopBar(ctx: CanvasRenderingContext2D): void {
    const barH = 70;
    const barY = 10;

    ctx.save();
    ctx.fillStyle = 'rgba(139, 69, 19, 0.85)';
    this.drawScrollRect(ctx, 20, barY, this.canvasWidth - 40, barH, 15);
    ctx.fill();

    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 3;
    this.drawScrollRect(ctx, 20, barY, this.canvasWidth - 40, barH, 15);
    ctx.stroke();

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${28 * this.scale}px Georgia`;
    ctx.textBaseline = 'middle';

    ctx.fillText(`💰 ${this.gold}`, 50, barY + barH / 2);

    ctx.fillStyle = '#DEB887';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${this.wave} 波`, this.canvasWidth / 2, barY + barH / 2);

    ctx.textAlign = 'right';
    const hpX = this.canvasWidth - 50;
    const hpBarW = 200;
    const hpBarH = 24;
    const hpBarX = hpX - hpBarW;
    const hpBarY = barY + (barH - hpBarH) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

    const hpPercent = Math.max(0, this.wallHP / this.wallMaxHP);
    const hpColor = hpPercent > 0.6 ? '#22C55E' : hpPercent > 0.3 ? '#EAB308' : '#EF4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPercent, hpBarH);

    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 2;
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${16 * this.scale}px Georgia`;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(this.wallHP)}/${this.wallMaxHP}`, hpBarX + hpBarW / 2, hpBarY + hpBarH / 2);

    ctx.restore();
  }

  private drawBottomBar(ctx: CanvasRenderingContext2D): void {
    const barH = 110;
    const barY = this.canvasHeight - barH - 10;

    ctx.save();
    ctx.fillStyle = 'rgba(139, 69, 19, 0.85)';
    this.drawScrollRect(ctx, 20, barY, this.canvasWidth - 40, barH, 15);
    ctx.fill();

    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 3;
    this.drawScrollRect(ctx, 20, barY, this.canvasWidth - 40, barH, 15);
    ctx.stroke();

    const types: TowerType[] = ['archer', 'catapult', 'magic'];
    const names = ['弓箭手', '投石机', '魔法塔'];
    const spacing = 130;
    const totalW = spacing * types.length;
    const startX = (this.canvasWidth - totalW) / 2 + spacing / 2;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const config = TOWER_CONFIGS[type];
      const cx = startX + i * spacing;
      const cy = barY + barH / 2;
      const isNew = this.newlyAcquiredTowers.has(type);

      if (isNew) {
        ctx.save();
        const pulse = Math.sin(Date.now() / 150) * 0.4 + 0.6;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20 * pulse;
        ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(cx - 45, cy - 45, 90, 90, 10) : ctx.rect(cx - 45, cy - 45, 90, 90);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(222, 184, 135, 0.3)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cx - 40, cy - 40, 80, 80, 8);
      } else {
        ctx.rect(cx - 40, cy - 40, 80, 80);
      }
      ctx.fill();

      ctx.fillStyle = config.color;
      if (type === 'archer') {
        ctx.beginPath();
        ctx.arc(cx, cy - 5, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5C4033';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx + 10, cy - 5, 12, -Math.PI / 2.5, Math.PI / 2.5);
        ctx.stroke();
      } else if (type === 'catapult') {
        ctx.fillRect(cx - 20, cy, 40, 15);
        ctx.fillStyle = '#3D2914';
        ctx.beginPath();
        ctx.arc(cx - 12, cy + 18, 6, 0, Math.PI * 2);
        ctx.arc(cx + 12, cy + 18, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = config.color;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.8);
        ctx.fillRect(-3, -25, 6, 30);
        ctx.restore();
      } else {
        ctx.fillStyle = '#4A3728';
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy + 20);
        ctx.lineTo(cx - 11, cy - 15);
        ctx.lineTo(cx + 11, cy - 15);
        ctx.lineTo(cx + 15, cy + 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.moveTo(cx - 13, cy - 15);
        ctx.lineTo(cx, cy - 35);
        ctx.lineTo(cx + 13, cy - 15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#BA55D3';
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = this.gold >= config.cost ? '#FFD700' : '#888';
      ctx.font = `bold ${14 * this.scale}px Georgia`;
      ctx.textAlign = 'center';
      ctx.fillText(`${config.cost}💰`, cx, cy + 42);

      ctx.fillStyle = '#DEB887';
      ctx.font = `${12 * this.scale}px Georgia`;
      ctx.fillText(names[i], cx, cy - 50);
    }

    ctx.restore();
  }

  private drawWaveAnnouncement(ctx: CanvasRenderingContext2D): void {
    if (this.announcementTimer <= 0 || !this.waveAnnouncement) return;

    const alpha = Math.min(1, this.announcementTimer / 500);
    const scrollX = this.canvasWidth - ((Date.now() / 20) % (this.canvasWidth + 500));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(139, 0, 0, 0.9)';
    ctx.fillRect(0, 90, this.canvasWidth, 45);

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${22 * this.scale}px Georgia`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.waveAnnouncement, scrollX, 112);
    ctx.restore();
  }

  private drawShop(ctx: CanvasRenderingContext2D): void {
    if (!this.shopSlot) return;

    const panelW = 340;
    const panelH = 180;
    const panelX = this.shopSlot.x - panelW / 2;
    const panelY = this.shopSlot.y - panelH - 30;

    ctx.save();
    ctx.fillStyle = 'rgba(139, 69, 19, 0.95)';
    if (ctx.roundRect) {
      ctx.roundRect(panelX, panelY, panelW, panelH, 12);
      ctx.fill();
    } else {
      ctx.fillRect(panelX, panelY, panelW, panelH);
    }

    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 3;
    if (ctx.roundRect) {
      ctx.roundRect(panelX, panelY, panelW, panelH, 12);
      ctx.stroke();
    } else {
      ctx.strokeRect(panelX, panelY, panelW, panelH);
    }

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${18 * this.scale}px Georgia`;
    ctx.textAlign = 'center';
    ctx.fillText('选择防御单位', panelX + panelW / 2, panelY + 28);

    const types: TowerType[] = ['archer', 'catapult', 'magic'];
    const names = ['弓箭手', '投石机', '魔法塔'];
    const spacing = 105;
    const startX = panelX + (panelW - spacing * 3) / 2 + spacing / 2;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const config = TOWER_CONFIGS[type];
      const cx = startX + i * spacing;
      const cy = panelY + panelH / 2 + 10;
      const btn = this.shopItems[i].button;
      btn.x = cx - 45;
      btn.y = cy - 55;
      btn.width = 90;
      btn.height = 110;

      let scaleVal = 1;
      if (btn.hovered) scaleVal = 1.05;
      if (btn.pressed) scaleVal = 0.95;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scaleVal, scaleVal);

      if (btn.hovered) {
        ctx.shadowColor = 'rgba(222, 184, 135, 0.8)';
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = this.gold >= config.cost ? 'rgba(222, 184, 135, 0.4)' : 'rgba(100, 100, 100, 0.4)';
      if (ctx.roundRect) {
        ctx.roundRect(-40, -45, 80, 75, 8);
        ctx.fill();
      } else {
        ctx.fillRect(-40, -45, 80, 75);
      }

      ctx.fillStyle = config.color;
      if (type === 'archer') {
        ctx.beginPath();
        ctx.arc(0, -10, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'catapult') {
        ctx.fillRect(-15, 0, 30, 12);
      } else {
        ctx.beginPath();
        ctx.arc(0, -5, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = this.gold >= config.cost ? '#FFD700' : '#888';
      ctx.font = `bold ${14 * this.scale}px Georgia`;
      ctx.textAlign = 'center';
      ctx.fillText(`${config.cost}💰`, 0, 32);

      ctx.fillStyle = '#DEB887';
      ctx.font = `${11 * this.scale}px Georgia`;
      ctx.fillText(names[i], 0, -52);

      ctx.restore();
    }

    ctx.restore();
  }

  private drawUpgradePanel(ctx: CanvasRenderingContext2D): void {
    if (!this.upgradePanelTower) return;

    const tower = this.upgradePanelTower;
    const panelW = 300;
    const panelH = 220;
    const panelX = tower.x - panelW / 2;
    const panelY = tower.y - panelH - 40;

    ctx.save();
    ctx.fillStyle = 'rgba(139, 69, 19, 0.95)';
    if (ctx.roundRect) {
      ctx.roundRect(panelX, panelY, panelW, panelH, 12);
      ctx.fill();
    } else {
      ctx.fillRect(panelX, panelY, panelW, panelH);
    }

    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 3;
    if (ctx.roundRect) {
      ctx.roundRect(panelX, panelY, panelW, panelH, 12);
      ctx.stroke();
    } else {
      ctx.strokeRect(panelX, panelY, panelW, panelH);
    }

    const names: Record<TowerType, string> = { archer: '弓箭手', catapult: '投石机', magic: '魔法塔' };

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${20 * this.scale}px Georgia`;
    ctx.textAlign = 'center';
    ctx.fillText(`${names[tower.type]} Lv.${tower.level}`, panelX + panelW / 2, panelY + 35);

    ctx.fillStyle = '#DEB887';
    ctx.font = `${14 * this.scale}px Georgia`;
    ctx.textAlign = 'left';
    ctx.fillText(`攻击力: ${tower.damage}`, panelX + 30, panelY + 70);
    ctx.fillText(`射程: ${tower.range}`, panelX + 30, panelY + 95);
    ctx.fillText(`攻速: ${(1000 / tower.fireRate).toFixed(1)}/秒`, panelX + 30, panelY + 120);

    const upgradeCost = tower.getUpgradeCost();
    this.upgradeButton.x = panelX + 30;
    this.upgradeButton.y = panelY + 145;
    this.upgradeButton.width = 150;
    this.upgradeButton.height = 45;

    let upScale = 1;
    if (this.upgradeButton.hovered) upScale = 1.03;
    if (this.upgradeButton.pressed) upScale = 0.95;

    ctx.save();
    ctx.translate(this.upgradeButton.x + this.upgradeButton.width / 2, this.upgradeButton.y + this.upgradeButton.height / 2);
    ctx.scale(upScale, upScale);

    const canUpgrade = tower.level < tower.maxLevel && this.gold >= upgradeCost;
    ctx.fillStyle = canUpgrade ? '#228B22' : '#666';
    if (ctx.roundRect) {
      ctx.roundRect(-this.upgradeButton.width / 2, -this.upgradeButton.height / 2, this.upgradeButton.width, this.upgradeButton.height, 8);
      ctx.fill();
    } else {
      ctx.fillRect(-this.upgradeButton.width / 2, -this.upgradeButton.height / 2, this.upgradeButton.width, this.upgradeButton.height);
    }

    if (this.upgradeButton.hovered && canUpgrade) {
      ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${15 * this.scale}px Georgia`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (tower.level >= tower.maxLevel) {
      ctx.fillText('已满级', 0, 0);
    } else {
      ctx.fillText(`升级 ${upgradeCost}💰`, 0, 0);
    }
    ctx.restore();

    this.closeButton.x = panelX + panelW - 50;
    this.closeButton.y = panelY + 145;
    this.closeButton.width = 35;
    this.closeButton.height = 45;

    let closeScale = 1;
    if (this.closeButton.hovered) closeScale = 1.1;
    if (this.closeButton.pressed) closeScale = 0.9;

    ctx.save();
    ctx.translate(this.closeButton.x + this.closeButton.width / 2, this.closeButton.y + this.closeButton.height / 2);
    ctx.scale(closeScale, closeScale);
    ctx.fillStyle = '#8B0000';
    if (ctx.roundRect) {
      ctx.roundRect(-this.closeButton.width / 2, -this.closeButton.height / 2, this.closeButton.width, this.closeButton.height, 8);
      ctx.fill();
    } else {
      ctx.fillRect(-this.closeButton.width / 2, -this.closeButton.height / 2, this.closeButton.width, this.closeButton.height);
    }
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${20 * this.scale}px Georgia`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×', 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private drawToasts(ctx: CanvasRenderingContext2D): void {
    for (const toast of this.toasts) {
      const alpha = Math.min(1, toast.timer / 500);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      const text = toast.message;
      ctx.font = `bold ${16 * this.scale}px Georgia`;
      const tw = ctx.measureText(text).width + 40;
      const tx = (this.canvasWidth - tw) / 2;
      const ty = toast.y;
      if (ctx.roundRect) {
        ctx.roundRect(tx, ty, tw, 36, 8);
        ctx.fill();
      } else {
        ctx.fillRect(tx, ty, tw, 36);
      }
      ctx.fillStyle = toast.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, this.canvasWidth / 2, ty + 18);
      ctx.restore();
    }
  }

  private drawScrollRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }
}
