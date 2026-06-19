import { Player } from './player';

export interface ShopItemData {
  id: string;
  name: string;
  desc: string;
  level: number;
  maxLevel: number;
  cost: number;
  canAfford: boolean;
}

export class HUD {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private scale: number;

  private healthDisplay: number;
  private shieldDisplay: number;
  private healthTarget: number;
  private shieldTarget: number;
  private healthAnimSpeed: number;
  private shieldAnimSpeed: number;

  private wave: number;
  private coins: number;
  private kills: number;

  private wavePopupTimer: number;
  private wavePopupText: string;
  private wavePopupAlpha: number;

  private isMobile: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.scale = 1;

    this.healthDisplay = 100;
    this.shieldDisplay = 50;
    this.healthTarget = 100;
    this.shieldTarget = 50;
    this.healthAnimSpeed = 8;
    this.shieldAnimSpeed = 6;

    this.wave = 1;
    this.coins = 0;
    this.kills = 0;

    this.wavePopupTimer = 0;
    this.wavePopupText = '';
    this.wavePopupAlpha = 0;

    this.isMobile = this.checkMobile();
  }

  private checkMobile(): boolean {
    return window.innerWidth < window.innerHeight || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.isMobile = this.checkMobile();
    this.scale = Math.min(width / 1920, height / 1080);
    if (this.scale < 0.5) this.scale = 0.5;
    if (this.scale > 1.5) this.scale = 1.5;
  }

  update(dt: number, player: Player): void {
    this.healthTarget = player.health;
    this.shieldTarget = player.shield;

    if (this.healthDisplay > this.healthTarget) {
      this.healthDisplay = Math.max(this.healthTarget, this.healthDisplay - this.healthAnimSpeed * dt * 30);
    } else {
      this.healthDisplay = Math.min(this.healthTarget, this.healthDisplay + this.healthAnimSpeed * dt * 20);
    }

    if (this.shieldDisplay > this.shieldTarget) {
      this.shieldDisplay = Math.max(this.shieldTarget, this.shieldDisplay - this.shieldAnimSpeed * dt * 25);
    } else {
      this.shieldDisplay = Math.min(this.shieldTarget, this.shieldDisplay + this.shieldAnimSpeed * dt * 15);
    }

    if (this.wavePopupTimer > 0) {
      this.wavePopupTimer -= dt;
      if (this.wavePopupTimer > 1.5) {
        this.wavePopupAlpha = Math.min(1, this.wavePopupAlpha + dt * 3);
      } else {
        this.wavePopupAlpha = Math.max(0, this.wavePopupAlpha - dt * 2);
      }
    }
  }

  setWave(wave: number): void {
    this.wave = wave;
    this.showWavePopup(`第 ${wave} 波`);
  }

  setCoins(coins: number): void {
    this.coins = coins;
  }

  setKills(kills: number): void {
    this.kills = kills;
  }

  showWavePopup(text: string): void {
    this.wavePopupText = text;
    this.wavePopupTimer = 3;
    this.wavePopupAlpha = 0;
  }

  draw(player: Player): void {
    const ctx = this.ctx;
    const s = this.scale;

    ctx.save();

    this.drawHealthBar(ctx, s);
    this.drawShieldBar(ctx, s);
    this.drawWaveInfo(ctx, s);
    this.drawCoins(ctx, s);
    this.drawWeaponInfo(ctx, s, player);
    this.drawWavePopup(ctx, s);
    this.drawCrosshair(ctx, s, player);

    ctx.restore();
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D, s: number): void {
    const x = 20 * s;
    const y = 20 * s;
    const width = 220 * s;
    const height = 22 * s;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.strokeStyle = '#3a5a8a';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 4 * s);
    ctx.fill();
    ctx.stroke();

    const healthPercent = this.healthDisplay / 100;
    const displayWidth = Math.max(0, width * healthPercent - 4 * s);

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    if (healthPercent > 0.5) {
      gradient.addColorStop(0, '#44ff66');
      gradient.addColorStop(1, '#22aa44');
    } else if (healthPercent > 0.25) {
      gradient.addColorStop(0, '#ffcc33');
      gradient.addColorStop(1, '#cc8811');
    } else {
      gradient.addColorStop(0, '#ff4455');
      gradient.addColorStop(1, '#cc2233');
    }

    ctx.fillStyle = gradient;
    ctx.shadowColor = healthPercent > 0.5 ? '#00ff44' : healthPercent > 0.25 ? '#ffaa00' : '#ff2244';
    ctx.shadowBlur = 6 * s;
    if (displayWidth > 0) {
      ctx.fillRect(x + 2 * s, y + 2 * s, displayWidth, height - 4 * s);
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(12 * s)}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`HP: ${Math.ceil(this.healthDisplay)}/100`, x + 8 * s, y + height / 2);

    ctx.fillStyle = '#7799bb';
    ctx.font = `${Math.floor(10 * s)}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('生命值', x, y - 6 * s);
  }

  private drawShieldBar(ctx: CanvasRenderingContext2D, s: number): void {
    const x = 20 * s;
    const y = 52 * s;
    const width = 220 * s;
    const height = 18 * s;

    ctx.fillStyle = 'rgba(10, 20, 40, 0.85)';
    ctx.strokeStyle = '#2a6aaa';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 4 * s);
    ctx.fill();
    ctx.stroke();

    const shieldPercent = Math.max(0, this.shieldDisplay / 50);
    const displayWidth = Math.max(0, width * shieldPercent - 4 * s);

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#00ddff');
    gradient.addColorStop(1, '#0088cc');

    ctx.fillStyle = gradient;
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur = 8 * s;
    if (displayWidth > 0) {
      ctx.fillRect(x + 2 * s, y + 2 * s, displayWidth, height - 4 * s);
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#aaddff';
    ctx.font = `bold ${Math.floor(11 * s)}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`护盾: ${Math.ceil(this.shieldDisplay)}`, x + 8 * s, y + height / 2);

    ctx.fillStyle = '#6688aa';
    ctx.font = `${Math.floor(9 * s)}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('护盾值', x, y - 5 * s);
  }

  private drawWaveInfo(ctx: CanvasRenderingContext2D, s: number): void {
    const x = this.width - 20 * s;
    const y = 20 * s;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.strokeStyle = '#5a3a8a';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.roundRect(x - 160 * s, y, 160 * s, 50 * s, 4 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cc99ff';
    ctx.font = `bold ${Math.floor(18 * s)}px 'Courier New', monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#aa66ff';
    ctx.shadowBlur = 6 * s;
    ctx.fillText(`第 ${this.wave} 波`, x - 12 * s, y + 6 * s);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#8899bb';
    ctx.font = `${Math.floor(11 * s)}px 'Courier New', monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`击杀: ${this.kills}`, x - 12 * s, y + 28 * s);
  }

  private drawCoins(ctx: CanvasRenderingContext2D, s: number): void {
    const x = this.width - 20 * s;
    const y = 80 * s;

    ctx.fillStyle = 'rgba(30, 25, 10, 0.85)';
    ctx.strokeStyle = '#aa8822';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.roundRect(x - 160 * s, y, 160 * s, 36 * s, 4 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 6 * s;
    ctx.font = `bold ${Math.floor(16 * s)}px 'Courier New', monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`★ ${this.coins}`, x - 12 * s, y + 18 * s);
    ctx.shadowBlur = 0;
  }

  private drawWeaponInfo(ctx: CanvasRenderingContext2D, s: number, player: Player): void {
    const weapon = player.weapons[player.currentWeapon];
    const centerX = this.width / 2;
    const y = this.height - 30 * s;

    const boxWidth = 280 * s;
    const boxHeight = 50 * s;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.strokeStyle = '#3a6a9a';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.roundRect(centerX - boxWidth / 2, y - boxHeight, boxWidth, boxHeight, 6 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = weapon.color;
    ctx.shadowColor = weapon.glowColor;
    ctx.shadowBlur = 8 * s;
    ctx.font = `bold ${Math.floor(14 * s)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(weapon.name, centerX, y - boxHeight + 8 * s);
    ctx.shadowBlur = 0;

    const ammoText = weapon.maxAmmo === 999 ? '∞' : `${weapon.ammo}/${weapon.maxAmmo}`;
    ctx.fillStyle = '#aaccff';
    ctx.font = `bold ${Math.floor(16 * s)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`弹药: ${ammoText}`, centerX, y - boxHeight + 26 * s);

    const spacing = 50 * s;
    for (let i = 0; i < player.weapons.length; i++) {
      const wx = centerX - (player.weapons.length - 1) * spacing / 2 + i * spacing;
      const wy = y - boxHeight - 8 * s;
      const isActive = i === player.currentWeapon;

      ctx.fillStyle = isActive ? player.weapons[i].color : 'rgba(60, 80, 120, 0.5)';
      ctx.strokeStyle = isActive ? player.weapons[i].color : '#3a5a8a';
      ctx.lineWidth = isActive ? 2 * s : 1 * s;
      if (isActive) {
        ctx.shadowColor = player.weapons[i].glowColor;
        ctx.shadowBlur = 6 * s;
      }
      ctx.beginPath();
      ctx.arc(wx, wy, 10 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(10 * s)}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, wx, wy);
    }
  }

  private drawWavePopup(ctx: CanvasRenderingContext2D, s: number): void {
    if (this.wavePopupAlpha <= 0) return;

    ctx.globalAlpha = this.wavePopupAlpha;

    const centerX = this.width / 2;
    const centerY = this.height / 2 - 50 * s;

    ctx.fillStyle = '#00ddff';
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = 20 * s;
    ctx.font = `bold ${Math.floor(48 * s)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.wavePopupText, centerX, centerY);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#8899bb';
    ctx.font = `${Math.floor(16 * s)}px 'Courier New', monospace`;
    ctx.fillText('准备战斗！', centerX, centerY + 50 * s);

    ctx.globalAlpha = 1;
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D, s: number, player: Player): void {
    const mx = player.mouseX;
    const my = player.mouseY;

    ctx.strokeStyle = 'rgba(0, 220, 255, 0.7)';
    ctx.lineWidth = 2 * s;
    ctx.shadowColor = '#00ddff';
    ctx.shadowBlur = 6 * s;

    const size = 14 * s;
    const gap = 6 * s;

    ctx.beginPath();
    ctx.moveTo(mx - size, my);
    ctx.lineTo(mx - gap, my);
    ctx.moveTo(mx + gap, my);
    ctx.lineTo(mx + size, my);
    ctx.moveTo(mx, my - size);
    ctx.lineTo(mx, my - gap);
    ctx.moveTo(mx, my + gap);
    ctx.lineTo(mx, my + size);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(mx, my, 2 * s, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 220, 255, 0.8)';
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}

export class ShopManager {
  private overlay: HTMLElement;
  private coinsElement: HTMLElement;
  private waveElement: HTMLElement;
  private itemsContainer: HTMLElement;
  private continueBtn: HTMLElement;

  private onContinue: (() => void) | null;
  private onBuy: ((id: string) => void) | null;

  constructor() {
    this.overlay = document.getElementById('shop-overlay')!;
    this.coinsElement = document.getElementById('shop-coins')!;
    this.waveElement = document.getElementById('shop-wave')!;
    this.itemsContainer = document.getElementById('shop-items')!;
    this.continueBtn = document.getElementById('continue-btn')!;

    this.onContinue = null;
    this.onBuy = null;

    this.continueBtn.addEventListener('click', () => {
      if (this.onContinue) {
        this.onContinue();
      }
    });
  }

  setOnContinue(callback: () => void): void {
    this.onContinue = callback;
  }

  setOnBuy(callback: (id: string) => void): void {
    this.onBuy = callback;
  }

  show(wave: number, coins: number, items: ShopItemData[]): void {
    this.waveElement.textContent = String(wave);
    this.coinsElement.textContent = String(coins);
    this.renderItems(items, coins);
    this.overlay.classList.add('active');
  }

  hide(): void {
    this.overlay.classList.remove('active');
  }

  updateCoins(coins: number): void {
    this.coinsElement.textContent = String(coins);
  }

  private renderItems(items: ShopItemData[], coins: number): void {
    this.itemsContainer.innerHTML = '';

    for (const item of items) {
      const div = document.createElement('div');
      div.className = 'shop-item';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'shop-item-info';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'shop-item-name';
      nameDiv.textContent = item.name;

      const descDiv = document.createElement('div');
      descDiv.className = 'shop-item-desc';
      descDiv.textContent = item.desc;

      const levelDiv = document.createElement('div');
      levelDiv.className = 'shop-item-level';
      for (let i = 0; i < item.maxLevel; i++) {
        const dot = document.createElement('div');
        dot.className = 'level-dot' + (i < item.level ? ' active' : '');
        levelDiv.appendChild(dot);
      }

      infoDiv.appendChild(nameDiv);
      infoDiv.appendChild(descDiv);
      infoDiv.appendChild(levelDiv);

      const buyBtn = document.createElement('button');
      buyBtn.className = 'shop-item-buy';
      
      if (item.level >= item.maxLevel) {
        buyBtn.textContent = '已满级';
        buyBtn.classList.add('maxed');
        buyBtn.disabled = true;
      } else {
        buyBtn.textContent = `${item.cost} ★`;
        buyBtn.disabled = !item.canAfford || coins < item.cost;
        buyBtn.addEventListener('click', () => {
          if (this.onBuy) {
            this.onBuy(item.id);
          }
        });
      }

      div.appendChild(infoDiv);
      div.appendChild(buyBtn);
      this.itemsContainer.appendChild(div);
    }
  }
}
