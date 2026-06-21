import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  COLORS,
  CELL_SIZE,
  GRID_SIZE,
  MINIMAP_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  MAX_SCAN_CHARGES
} from './Defines';
import type { PlayerState, ScanEvent } from './PlayerController';
import type { PlacedItem } from './ItemManager';

export interface GameStats {
  seekerSteps: number;
  hiderSteps: number;
  itemPlaceCount: number;
  scanCount: number;
  captureTime: number | null;
  winner: 'seeker' | 'hider';
}

export class UIManager {
  private scene: Phaser.Scene;
  private timerText: Phaser.GameObjects.Text | null = null;
  private scanChargesContainer: Phaser.GameObjects.Container | null = null;
  private itemCooldownBar: Phaser.GameObjects.Graphics | null = null;
  private signalText: Phaser.GameObjects.Text | null = null;
  private gameOverPanel: Phaser.GameObjects.Container | null = null;
  private minimapGraphics: Phaser.GameObjects.Graphics | null = null;
  private separatorLine: Phaser.GameObjects.Graphics | null = null;
  private fadeOverlay: Phaser.GameObjects.Graphics | null = null;
  private seekerViewLabel: Phaser.GameObjects.Text | null = null;

  private signalVisible: boolean = false;
  private signalTimer: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createUI(
    seekerViewX: number,
    seekerViewY: number,
    seekerViewW: number,
    seekerViewH: number,
    minimapX: number,
    minimapY: number
  ): void {
    this.createSeparator(seekerViewX + seekerViewW, seekerViewY, seekerViewH);
    this.createTimer();
    this.createScanChargesUI(seekerViewX, seekerViewY + seekerViewH - 40);
    this.createItemCooldownUI(minimapX, minimapY - 35);
    this.createSignalText();
    this.createMinimap(minimapX, minimapY);
    this.createSeekerViewLabel(seekerViewX, seekerViewY);
    this.createMinimapLabel(minimapX, minimapY);
    this.createFadeOverlay();
  }

  private createSeparator(x: number, y: number, height: number): void {
    this.separatorLine = this.scene.add.graphics();
    this.separatorLine.lineStyle(2, 0x667eea, 0.5);
    this.separatorLine.beginPath();
    this.separatorLine.moveTo(x, y);
    this.separatorLine.lineTo(x, y + height);
    this.separatorLine.strokePath();
    this.separatorLine.setDepth(100);
  }

  private createTimer(): void {
    this.timerText = this.scene.add.text(GAME_WIDTH / 2, 20, '03:00', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: COLORS.TEXT,
      fontStyle: 'bold'
    });
    this.timerText.setOrigin(0.5);
    this.timerText.setDepth(200);
    this.timerText.setShadow(2, 2, 'rgba(0,0,0,0.5)', 2);
  }

  private createScanChargesUI(x: number, y: number): void {
    this.scanChargesContainer = this.scene.add.container(x + 10, y);
    this.scanChargesContainer.setDepth(150);

    const label = this.scene.add.text(0, 0, '扫描 [E]:', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: COLORS.TEXT
    });
    this.scanChargesContainer.add(label);

    for (let i = 0; i < MAX_SCAN_CHARGES; i++) {
      const dot = this.scene.add.circle(80 + i * 20, 8, 7, 0x667eea);
      dot.setName(`charge-${i}`);
      this.scanChargesContainer.add(dot);
    }

    const hint = this.scene.add.text(0, 20, '方向键移动', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888'
    });
    this.scanChargesContainer.add(hint);
  }

  private createItemCooldownUI(x: number, y: number): void {
    const label = this.scene.add.text(x, y, '伪装 [空格]:', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: COLORS.TEXT
    });
    label.setDepth(150);

    this.itemCooldownBar = this.scene.add.graphics();
    this.itemCooldownBar.setDepth(150);
    this.itemCooldownBar.x = x + 85;
    this.itemCooldownBar.y = y + 2;
    this.updateItemCooldownBar(1, true);
  }

  private createSignalText(): void {
    this.signalText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, '信号捕获！', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ff5252',
      fontStyle: 'bold'
    });
    this.signalText.setOrigin(0.5);
    this.signalText.setAlpha(0);
    this.signalText.setDepth(200);
  }

  private createMinimap(x: number, y: number): void {
    const bg = this.scene.add.rectangle(
      x + MINIMAP_SIZE / 2,
      y + MINIMAP_SIZE / 2,
      MINIMAP_SIZE + 4,
      MINIMAP_SIZE + 4,
      0x1a1a2e
    );
    bg.setStrokeStyle(2, 0x667eea, 0.8);
    bg.setDepth(100);

    this.minimapGraphics = this.scene.add.graphics();
    this.minimapGraphics.setDepth(101);
    this.minimapGraphics.x = x + 2;
    this.minimapGraphics.y = y + 2;

    this.minimapGraphics.fillStyle(0x2a2a4a);
    this.minimapGraphics.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  }

  private createSeekerViewLabel(x: number, y: number): void {
    this.seekerViewLabel = this.scene.add.text(x + 10, y + 10, '搜寻者视野', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: COLORS.TEXT,
      fontStyle: 'bold'
    });
    this.seekerViewLabel.setDepth(100);
  }

  private createMinimapLabel(x: number, y: number): void {
    const label = this.scene.add.text(x, y + MINIMAP_SIZE + 8, '躲藏者小地图', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: COLORS.TEXT,
      fontStyle: 'bold'
    });
    label.setDepth(100);

    const hint = this.scene.add.text(x, y + MINIMAP_SIZE + 26, 'WASD移动', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#888'
    });
    hint.setDepth(100);
  }

  private createFadeOverlay(): void {
    this.fadeOverlay = this.scene.add.graphics();
    this.fadeOverlay.fillStyle(0x1a1a2e, 1);
    this.fadeOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.fadeOverlay.setDepth(1000);

    this.scene.tweens.add({
      targets: this.fadeOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        if (this.fadeOverlay) {
          this.fadeOverlay.setVisible(false);
        }
      }
    });
  }

  updateTimer(remainingMs: number): void {
    if (!this.timerText) return;
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.timerText.setText(timeStr);

    if (totalSeconds <= 30) {
      this.timerText.setColor('#ff5252');
    } else {
      this.timerText.setColor(COLORS.TEXT);
    }
  }

  updateScanCharges(charges: number, cooldownPercent: number): void {
    if (!this.scanChargesContainer) return;

    for (let i = 0; i < MAX_SCAN_CHARGES; i++) {
      const dot = this.scanChargesContainer.getByName(`charge-${i}`) as Phaser.GameObjects.Arc;
      if (dot) {
        if (i < charges) {
          dot.setFillStyle(0x667eea);
          dot.setAlpha(1);
        } else if (i === charges && charges < MAX_SCAN_CHARGES) {
          dot.setFillStyle(0x667eea);
          dot.setAlpha(0.3 + cooldownPercent * 0.7);
        } else {
          dot.setFillStyle(0x333355);
          dot.setAlpha(0.5);
        }
      }
    }
  }

  updateItemCooldownBar(cooldownPercent: number, isReady: boolean): void {
    if (!this.itemCooldownBar) return;

    this.itemCooldownBar.clear();

    const barWidth = 60;
    const barHeight = 14;

    this.itemCooldownBar.fillStyle(0x333355);
    this.itemCooldownBar.fillRect(0, 0, barWidth, barHeight);

    if (isReady) {
      this.itemCooldownBar.fillGradientStyle(0x667eea, 0x764ba2, 0x667eea, 0x764ba2);
      this.itemCooldownBar.fillRect(0, 0, barWidth, barHeight);
    } else {
      const fillWidth = barWidth * cooldownPercent;
      const gray = Math.floor(80 + cooldownPercent * 60);
      this.itemCooldownBar.fillStyle(Phaser.Display.Color.GetColor(gray, gray, gray));
      this.itemCooldownBar.fillRect(0, 0, fillWidth, barHeight);
    }

    this.itemCooldownBar.lineStyle(1, 0x667eea, 0.6);
    this.itemCooldownBar.strokeRect(0, 0, barWidth, barHeight);
  }

  showSignalText(): void {
    if (!this.signalText) return;
    this.signalVisible = true;
    this.signalTimer = 1500;

    this.scene.tweens.add({
      targets: this.signalText,
      alpha: 1,
      duration: 200,
      ease: 'Power2.easeOut'
    });
  }

  update(delta: number): void {
    if (this.signalVisible && this.signalText) {
      this.signalTimer -= delta;
      if (this.signalTimer <= 0) {
        this.signalVisible = false;
        this.scene.tweens.add({
          targets: this.signalText,
          alpha: 0,
          duration: 300,
          ease: 'Power2.easeIn'
        });
      }
    }
  }

  updateMinimap(
    hiderX: number,
    hiderY: number,
    seekerX: number,
    seekerY: number,
    items: PlacedItem[]
  ): void {
    if (!this.minimapGraphics) return;

    this.minimapGraphics.clear();

    this.minimapGraphics.fillStyle(0x2a2a4a);
    this.minimapGraphics.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    const cellW = MINIMAP_SIZE / GRID_SIZE;
    const cellH = MINIMAP_SIZE / GRID_SIZE;

    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const isLight = (gx + gy) % 2 === 0;
        if (isLight) {
          this.minimapGraphics.fillStyle(0x3a3a5a);
          this.minimapGraphics.fillRect(gx * cellW, gy * cellH, cellW, cellH);
        }
      }
    }

    for (const item of items) {
      const px = item.gridX * cellW + cellW / 2;
      const py = item.gridY * cellH + cellH / 2;
      this.minimapGraphics.fillStyle(0x4caf50);
      this.minimapGraphics.fillCircle(px, py, cellW * 0.3);
    }

    const seekerPx = seekerX * cellW + cellW / 2;
    const seekerPy = seekerY * cellH + cellH / 2;
    this.minimapGraphics.fillStyle(0xf44336);
    this.minimapGraphics.fillCircle(seekerPx, seekerPy, cellW * 0.35);

    const hiderPx = hiderX * cellW + cellW / 2;
    const hiderPy = hiderY * cellH + cellH / 2;
    this.minimapGraphics.fillStyle(0x2196f3);
    this.minimapGraphics.fillCircle(hiderPx, hiderPy, cellW * 0.35);
  }

  showGameOver(stats: GameStats, onRestart: () => void): void {
    if (this.gameOverPanel) {
      this.gameOverPanel.destroy();
    }

    const panel = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    panel.setDepth(500);
    panel.setAlpha(0);
    this.gameOverPanel = panel;

    const panelW = 400;
    const panelH = 320;

    const bg = this.scene.add.rectangle(0, 0, panelW, panelH, 0x1a1a2e);
    bg.setStrokeStyle(3, 0x667eea, 0.8);
    panel.add(bg);

    const titleText = stats.winner === 'seeker' ? '搜寻者获胜！' : '躲藏者获胜！';
    const titleColor = stats.winner === 'seeker' ? '#ff5252' : '#00e5ff';
    const title = this.scene.add.text(0, -panelH / 2 + 35, titleText, {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: titleColor,
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    panel.add(title);

    const statsY = -60;
    const lineHeight = 28;
    const statsLines = [
      `搜寻者步数: ${stats.seekerSteps}`,
      `躲藏者步数: ${stats.hiderSteps}`,
      `放置道具次数: ${stats.itemPlaceCount}`,
      `扫描次数: ${stats.scanCount}`,
      stats.captureTime !== null
        ? `捕获用时: ${(stats.captureTime / 1000).toFixed(1)}秒`
        : `结果: 时间耗尽`
    ];

    statsLines.forEach((line, i) => {
      const text = this.scene.add.text(-panelW / 2 + 40, statsY + i * lineHeight, line, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: COLORS.TEXT
      });
      panel.add(text);
    });

    const btnW = 160;
    const btnH = 45;
    const btnY = panelH / 2 - 50;

    const btnBg = this.scene.add.rectangle(0, btnY, btnW, btnH, 0x667eea);
    btnBg.setInteractive({ useHandCursor: true });
    panel.add(btnBg);

    const btnText = this.scene.add.text(0, btnY, '重新开始', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    btnText.setOrigin(0.5);
    panel.add(btnText);

    btnBg.on('pointerover', () => {
      this.scene.tweens.add({
        targets: btnBg,
        y: btnY - 3,
        scaleY: 1.05,
        duration: 150,
        ease: 'Power2.easeOut'
      });
    });

    btnBg.on('pointerout', () => {
      this.scene.tweens.add({
        targets: btnBg,
        y: btnY,
        scaleY: 1,
        duration: 150,
        ease: 'Power2.easeOut'
      });
    });

    btnBg.on('pointerdown', () => {
      this.fadeOut(() => {
        onRestart();
        this.fadeIn();
      });
    });

    this.scene.tweens.add({
      targets: panel,
      alpha: 1,
      duration: 400,
      ease: 'Power2.easeOut'
    });
  }

  hideGameOver(): void {
    if (this.gameOverPanel) {
      this.gameOverPanel.destroy();
      this.gameOverPanel = null;
    }
  }

  private fadeOut(callback: () => void): void {
    if (!this.fadeOverlay) return;

    this.fadeOverlay.setVisible(true);
    this.fadeOverlay.setAlpha(0);

    this.scene.tweens.add({
      targets: this.fadeOverlay,
      alpha: 1,
      duration: 300,
      ease: 'Power2.easeInOut',
      onComplete: callback
    });
  }

  private fadeIn(): void {
    if (!this.fadeOverlay) return;

    this.fadeOverlay.setAlpha(1);
    this.fadeOverlay.setVisible(true);

    this.scene.tweens.add({
      targets: this.fadeOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        if (this.fadeOverlay) {
          this.fadeOverlay.setVisible(false);
        }
      }
    });
  }

  destroy(): void {
    this.hideGameOver();
    if (this.fadeOverlay) {
      this.fadeOverlay.destroy();
    }
  }
}
