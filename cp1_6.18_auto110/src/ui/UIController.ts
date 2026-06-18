import { EntityManager, PuppetType, Puppet, Monster, PATH_WAYPOINTS } from '../EntityManager';

interface ButtonDef {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sublabel: string;
  action: () => boolean;
  hover: boolean;
  press: number;
}

export class UIController {
  private ctx: CanvasRenderingContext2D;
  private em: EntityManager;
  private shopButtons: ButtonDef[] = [];
  private hoverButton: ButtonDef | null = null;
  private shopAnim: number = 0;

  constructor(ctx: CanvasRenderingContext2D, em: EntityManager) {
    this.ctx = ctx;
    this.em = em;
    this.initShopButtons();
  }

  private initShopButtons() {
    this.shopButtons = [
      {
        x: 960, y: 520, w: 130, h: 44,
        label: '攻击强化',
        sublabel: '',
        action: () => this.em.buyAttackUpgrade(),
        hover: false,
        press: 0,
      },
      {
        x: 1105, y: 520, w: 130, h: 44,
        label: '冷却缩减',
        sublabel: '',
        action: () => this.em.buyCooldownUpgrade(),
        hover: false,
        press: 0,
      },
      {
        x: 1032, y: 575, w: 130, h: 44,
        label: '召唤栏位',
        sublabel: '',
        action: () => this.em.buySummonSlot(),
        hover: false,
        press: 0,
      },
    ];
  }

  updateShopPrices() {
    this.shopButtons[0].sublabel = `${50 + this.em.attackUpgradeLevel * 30}G`;
    this.shopButtons[1].sublabel = `${60 + this.em.cooldownUpgradeLevel * 35}G`;
    this.shopButtons[2].sublabel = `${80 + (this.em.puppeteer.summonSlots - 5) * 50}G`;
  }

  handleClick(mx: number, my: number): boolean {
    if (this.em.shopOpen) {
      for (const btn of this.shopButtons) {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          btn.press = 0.2;
          const result = btn.action();
          if (result) this.updateShopPrices();
          return true;
        }
      }
    }
    const shopToggleX = 1200, shopToggleY = 660, shopToggleW = 60, shopToggleH = 40;
    if (mx >= shopToggleX && mx <= shopToggleX + shopToggleW && my >= shopToggleY && my <= shopToggleY + shopToggleH) {
      this.em.shopOpen = !this.em.shopOpen;
      return true;
    }
    return false;
  }

  handleMouseMove(mx: number, my: number) {
    this.hoverButton = null;
    for (const btn of this.shopButtons) {
      btn.hover = mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
      if (btn.hover) this.hoverButton = btn;
    }
  }

  update(dt: number) {
    for (const btn of this.shopButtons) {
      if (btn.press > 0) btn.press -= dt;
    }
    if (this.em.shopOpen) {
      this.shopAnim = Math.min(1, this.shopAnim + dt * 5);
    } else {
      this.shopAnim = Math.max(0, this.shopAnim - dt * 5);
    }
  }

  render() {
    this.renderBottomBar();
    this.renderTopRight();
    this.renderPuppetTypeIndicator();
    this.renderPath();
    if (this.shopAnim > 0) this.renderShop();
    if (this.em.gameOver) this.renderGameOver();
  }

  private renderBottomBar() {
    const ctx = this.ctx;
    const barY = 650;
    const barH = 70;

    ctx.fillStyle = 'rgba(10, 8, 18, 0.9)';
    ctx.fillRect(0, barY, 1280, barH);

    const grad = ctx.createLinearGradient(0, barY, 0, barY + 2);
    grad.addColorStop(0, '#6a4faa');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, barY, 1280, 2);

    this.drawHeart(20, barY + 20, 16);
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ff6688';
    ctx.fillText(`${this.em.puppeteer.hp} / ${this.em.puppeteer.maxHp}`, 44, barY + 27);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`💰 ${this.em.gold}`, 200, barY + 28);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#aaaadd';
    ctx.fillText(`第 ${this.em.wave} 波`, 380, barY + 27);

    if (!this.em.waveActive && this.em.nextWaveTimer > 0) {
      ctx.fillStyle = '#88aaff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`下一波: ${Math.ceil(this.em.nextWaveTimer)}s`, 500, barY + 27);
    } else if (this.em.waveActive) {
      ctx.fillStyle = '#ff8866';
      ctx.font = '16px sans-serif';
      ctx.fillText(`怪物: ${this.em.monsters.filter(m => m.alive).length}`, 500, barY + 27);
    }

    const puppetCount = this.em.puppets.filter(p => p.alive).length;
    ctx.fillStyle = '#aabbdd';
    ctx.font = '16px sans-serif';
    ctx.fillText(`傀儡: ${puppetCount} / ${this.em.puppeteer.summonSlots}`, 660, barY + 27);

    this.drawShopToggleButton(1200, barY + 15, 60, 40);
  }

  private drawHeart(x: number, y: number, size: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#ff4466';
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y - size * 0.3, x - size, y - size * 0.3, x - size, y + size * 0.1);
    ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size, x, y + size);
    ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.6, x + size, y + size * 0.1);
    ctx.bezierCurveTo(x + size, y - size * 0.3, x, y - size * 0.3, x, y + size * 0.3);
    ctx.fill();
    ctx.restore();
  }

  private renderTopRight() {
    const ctx = this.ctx;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffdd44';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.em.gold}`, 1260, 30);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#aa9944';
    ctx.fillText('金币', 1260, 48);
    ctx.textAlign = 'left';
  }

  private renderPuppetTypeIndicator() {
    const ctx = this.ctx;
    const types = [PuppetType.Melee, PuppetType.Ranged, PuppetType.Healer];
    const labels = ['1: 近战', '2: 远程', '3: 治疗'];
    const colors = ['#4a9eff', '#ff9944', '#44ff88'];
    const startX = 20;
    const y = 30;

    for (let i = 0; i < types.length; i++) {
      const selected = this.em.puppeteer.selectedType === types[i];
      const x = startX + i * 100;

      if (selected) {
        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffdd44';
        ctx.shadowBlur = 8;
        this.roundRect(x - 4, y - 16, 90, 28, 6);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = selected ? colors[i] : '#666688';
      ctx.font = selected ? 'bold 16px sans-serif' : '14px sans-serif';
      ctx.fillText(labels[i], x, y);
    }
  }

  private renderPath() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(80, 50, 120, 0.3)';
    ctx.lineWidth = 40;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
    for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
      ctx.lineTo(PATH_WAYPOINTS[i].x, PATH_WAYPOINTS[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(120, 80, 170, 0.15)';
    ctx.lineWidth = 50;
    ctx.beginPath();
    ctx.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
    for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
      ctx.lineTo(PATH_WAYPOINTS[i].x, PATH_WAYPOINTS[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private renderShop() {
    const ctx = this.ctx;
    const alpha = this.shopAnim;
    ctx.save();
    ctx.globalAlpha = alpha;

    const shopX = 940, shopY = 470, shopW = 320, shopH = 180;
    ctx.fillStyle = 'rgba(15, 10, 30, 0.95)';
    this.roundRect(shopX, shopY, shopW, shopH, 12);
    ctx.fill();

    ctx.strokeStyle = '#8a6fcc';
    ctx.lineWidth = 2;
    this.roundRect(shopX, shopY, shopW, shopH, 12);
    ctx.stroke();

    ctx.fillStyle = '#ccbbff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('🔮 商店', shopX + 15, shopY + 28);

    for (const btn of this.shopButtons) {
      const scale = btn.press > 0 ? 0.95 : (btn.hover ? 1.03 : 1);
      const cx = btn.x + btn.w / 2;
      const cy = btn.y + btn.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      const canAfford = this.em.gold >= parseInt(btn.sublabel);
      ctx.fillStyle = btn.hover
        ? (canAfford ? 'rgba(100, 70, 180, 0.6)' : 'rgba(80, 40, 40, 0.5)')
        : 'rgba(40, 25, 70, 0.7)';
      this.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.strokeStyle = canAfford ? '#ccaa44' : '#664444';
      ctx.lineWidth = 1.5;
      this.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.stroke();

      if (btn.hover && canAfford) {
        ctx.shadowColor = '#ffdd44';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth = 1;
        this.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = canAfford ? '#ddddff' : '#888888';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + 18);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = canAfford ? '#ffdd44' : '#886666';
      ctx.fillText(btn.sublabel, btn.x + btn.w / 2, btn.y + 35);
      ctx.textAlign = 'left';

      ctx.restore();
    }

    ctx.restore();
  }

  private drawShopToggleButton(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    const hover = false;
    ctx.fillStyle = this.em.shopOpen ? 'rgba(100, 70, 180, 0.5)' : 'rgba(60, 40, 100, 0.5)';
    this.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#8a6fcc';
    ctx.lineWidth = 1.5;
    this.roundRect(x, y, w, h, 8);
    ctx.stroke();
    ctx.fillStyle = '#ccbbff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.em.shopOpen ? '关闭' : '商店', x + w / 2, y + h / 2 + 5);
    ctx.textAlign = 'left';
  }

  renderHealthBar(x: number, y: number, w: number, h: number, hp: number, maxHp: number, showShake: boolean = false) {
    const ctx = this.ctx;
    const ratio = Math.max(0, hp / maxHp);
    const shakeX = showShake ? (Math.random() - 0.5) * 2 : 0;
    const shakeY = showShake && ratio < 0.3 ? (Math.random() - 0.5) * 1.5 : 0;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(x + shakeX - 1, y + shakeY - 1, w + 2, h + 2, 3);
    ctx.fill();

    if (ratio > 0) {
      const grad = ctx.createLinearGradient(x, y, x + w * ratio, y);
      if (ratio > 0.5) {
        grad.addColorStop(0, '#44ff66');
        grad.addColorStop(1, '#88ff44');
      } else if (ratio > 0.25) {
        grad.addColorStop(0, '#ffaa22');
        grad.addColorStop(1, '#ffdd44');
      } else {
        grad.addColorStop(0, '#ff2222');
        grad.addColorStop(1, '#ff6644');
      }
      ctx.fillStyle = grad;
      this.roundRect(x + shakeX, y + shakeY, w * ratio, h, 2);
      ctx.fill();
    }
  }

  renderPuppetLevel(p: Puppet) {
    const ctx = this.ctx;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ffdd44';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv${p.level}`, p.x, p.y - p.size - 16);
    ctx.textAlign = 'left';
  }

  private renderGameOver() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 1280, 720);

    ctx.fillStyle = '#ff4466';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', 640, 320);

    ctx.fillStyle = '#ccbbff';
    ctx.font = '24px sans-serif';
    ctx.fillText(`坚持到了第 ${this.em.wave} 波`, 640, 370);

    ctx.fillStyle = '#ffdd44';
    ctx.font = '20px sans-serif';
    ctx.fillText('点击重新开始', 640, 420);
    ctx.textAlign = 'left';
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx;
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
