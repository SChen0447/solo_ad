import Phaser from 'phaser';
import { submitScore, getLeaderboard, LeaderboardEntry } from '../api/leaderboard';

export class GameOverScene extends Phaser.Scene {
  private score = 0;
  private crystals = 0;
  private distance = 0;
  private nicknameInput!: HTMLInputElement;
  private inputContainer!: HTMLDivElement;
  private leaderboardData: LeaderboardEntry[] = [];
  private leaderboardContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { score: number; crystals: number; distance: number }): void {
    this.score = data.score || 0;
    this.crystals = data.crystals || 0;
    this.distance = data.distance || 0;

    const { width, height } = this.scale;

    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.drawBackground(width, height);

    this.createGameOverTitle(width, height);

    this.createStatsPanel(width, height);

    this.createNicknameInput(width, height);

    this.createSubmitButton(width, height);

    this.createRestartButton(width, height);

    this.createLeaderboard(width, height);

    this.createRestartHint(width, height);
  }

  private drawBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0a0a, 0x1a0a0a, 0x0d0505, 0x0d0505, 1);
    bg.fillRect(0, 0, w, h);

    if (this.textures.exists('lavaTile')) {
      this.add.tileSprite(w / 2, h / 2, w, h, 'lavaTile').setAlpha(0.3).setDepth(0);
    }
  }

  private createGameOverTitle(w: number, h: number): void {
    const title = this.add.text(w / 2, h * 0.08, 'Game Over', {
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      color: '#FF4500',
      stroke: '#8B0000',
      strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 6, fill: true },
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      y: h * 0.12,
      duration: 600,
      ease: 'Back.easeOut',
    });
  }

  private createStatsPanel(w: number, h: number): void {
    const panelY = h * 0.26;
    const panelW = 280;
    const panelH = 80;

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.4);
    panel.fillRoundedRect(w / 2 - panelW / 2, panelY - panelH / 2, panelW, panelH, 10);
    panel.lineStyle(1, 0xff6b35, 0.4);
    panel.strokeRoundedRect(w / 2 - panelW / 2, panelY - panelH / 2, panelW, panelH, 10);
    panel.setDepth(10);

    const statStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '16px',
      fontFamily: 'Courier New, monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    };

    this.add.text(w / 2 - 120, panelY - 24, '得分: ' + this.score, statStyle).setDepth(10);
    this.add.text(w / 2 - 120, panelY, '水晶: ' + this.crystals, statStyle).setDepth(10);
    this.add.text(w / 2 - 120, panelY + 24, '距离: ' + this.distance + 'm', statStyle).setDepth(10);
  }

  private createNicknameInput(w: number, h: number): void {
    const inputY = h * 0.48;

    const label = this.add.text(w / 2, inputY - 22, '输入昵称', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#cc8844',
    }).setOrigin(0.5).setDepth(10);

    this.inputContainer = document.createElement('div');
    this.inputContainer.style.cssText = `
      position: absolute;
      left: 50%;
      top: ${inputY}px;
      transform: translate(-50%, -50%);
      z-index: 100;
    `;

    this.nicknameInput = document.createElement('input');
    this.nicknameInput.type = 'text';
    this.nicknameInput.maxLength = 16;
    this.nicknameInput.placeholder = '你的昵称';
    this.nicknameInput.style.cssText = `
      width: 200px;
      padding: 8px 14px;
      font-size: 16px;
      font-family: 'Courier New', monospace;
      background: rgba(20, 8, 4, 0.85);
      color: #ffffff;
      border: 1px solid #e67e22;
      border-radius: 8px;
      outline: none;
      text-align: center;
    `;

    this.inputContainer.appendChild(this.nicknameInput);
    document.body.appendChild(this.inputContainer);
  }

  private createSubmitButton(w: number, h: number): void {
    const btnY = h * 0.60;
    const btnW = 140;
    const btnH = 40;

    const btnBg = this.add.graphics();
    this.drawSubmitBg(btnBg, btnW, btnH, false);

    const btnText = this.add.text(0, 0, '提交成绩', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    const btn = this.add.container(w / 2, btnY, [btnBg, btnText]);
    btn.setSize(btnW, btnH);
    btn.setDepth(10);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      this.tweens.add({ targets: btn, scaleX: 1.1, scaleY: 1.1, duration: 150, ease: 'Back.easeOut' });
      this.drawSubmitBg(btnBg, btnW, btnH, true);
    });

    btn.on('pointerout', () => {
      this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 150 });
      this.drawSubmitBg(btnBg, btnW, btnH, false);
    });

    btn.on('pointerdown', () => {
      this.submitScore();
    });
  }

  private drawSubmitBg(gfx: Phaser.GameObjects.Graphics, w: number, h: number, glow: boolean): void {
    gfx.clear();
    const hw = w / 2;
    const hh = h / 2;

    if (glow) {
      gfx.fillStyle(0xff8c00, 0.3);
      gfx.fillRoundedRect(-hw - 3, -hh - 3, w + 6, h + 6, 10);
    }

    gfx.fillGradientStyle(0xe67e22, 0xf39c12, 0xe67e22, 0xf39c12, 1);
    gfx.fillRoundedRect(-hw, -hh, w, h, 8);
    gfx.lineStyle(1, 0xffd700, glow ? 0.9 : 0.4);
    gfx.strokeRoundedRect(-hw, -hh, w, h, 8);
  }

  private createRestartButton(w: number, h: number): void {
    const btnY = h * 0.60;
    const btnW = 140;
    const btnH = 40;

    const btnBg = this.add.graphics();
    this.drawRestartBg(btnBg, btnW, btnH, false);

    const btnText = this.add.text(0, 0, '再来一局', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    const btn = this.add.container(w / 2 + 160, btnY, [btnBg, btnText]);
    btn.setSize(btnW, btnH);
    btn.setDepth(10);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      this.tweens.add({ targets: btn, scaleX: 1.1, scaleY: 1.1, duration: 150, ease: 'Back.easeOut' });
      this.drawRestartBg(btnBg, btnW, btnH, true);
    });

    btn.on('pointerout', () => {
      this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 150 });
      this.drawRestartBg(btnBg, btnW, btnH, false);
    });

    btn.on('pointerdown', () => {
      this.cleanup();
      this.scene.start('GameScene');
    });
  }

  private drawRestartBg(gfx: Phaser.GameObjects.Graphics, w: number, h: number, glow: boolean): void {
    gfx.clear();
    const hw = w / 2;
    const hh = h / 2;

    if (glow) {
      gfx.fillStyle(0x00ff88, 0.3);
      gfx.fillRoundedRect(-hw - 3, -hh - 3, w + 6, h + 6, 10);
    }

    gfx.fillGradientStyle(0x27ae60, 0x2ecc71, 0x27ae60, 0x2ecc71, 1);
    gfx.fillRoundedRect(-hw, -hh, w, h, 8);
    gfx.lineStyle(1, 0x7fff7f, glow ? 0.9 : 0.4);
    gfx.strokeRoundedRect(-hw, -hh, w, h, 8);
  }

  private async submitScore(): Promise<void> {
    const nickname = this.nicknameInput.value.trim();
    if (!nickname) {
      this.nicknameInput.style.borderColor = '#ff0000';
      this.nicknameInput.placeholder = '请输入昵称!';
      return;
    }

    this.nicknameInput.disabled = true;

    await submitScore(nickname, this.score);

    this.inputContainer.style.display = 'none';

    const lb = await getLeaderboard();
    this.leaderboardData = lb;
    this.renderLeaderboard();
  }

  private createLeaderboard(w: number, h: number): void {
    this.leaderboardContainer = this.add.container(w / 2, h * 0.68);
    this.leaderboardContainer.setDepth(10);

    const title = this.add.text(0, -10, '排行榜 TOP 10', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
    }).setOrigin(0.5);

    this.leaderboardContainer.add(title);
  }

  private renderLeaderboard(): void {
    this.leaderboardContainer.removeAll(true);

    const title = this.add.text(0, -10, '排行榜 TOP 10', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
    }).setOrigin(0.5);
    this.leaderboardContainer.add(title);

    const entries = this.leaderboardData.slice(0, 10);
    const rowStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '13px',
      fontFamily: 'Courier New, monospace',
      color: '#dddddd',
    };

    entries.forEach((entry, i) => {
      const y = 12 + i * 22;
      const isMe = entry.nickname === this.nicknameInput?.value.trim() && entry.score === this.score;

      const row = this.add.text(0, y, '', {
        ...rowStyle,
        color: isMe ? '#FFD700' : '#dddddd',
      }).setOrigin(0.5);

      const arrow = entry.rankChange === 'up' ? ' ▲' : entry.rankChange === 'down' ? ' ▼' : '';
      row.setText(`#${i + 1}  ${entry.nickname}  ${entry.score}${arrow}`);
      this.leaderboardContainer.add(row);
    });

    this.leaderboardContainer.setAlpha(0);
    this.tweens.add({
      targets: this.leaderboardContainer,
      alpha: 1,
      duration: 600,
      ease: 'Quad.easeInOut',
    });
  }

  private createRestartHint(w: number, h: number): void {
    const hint = this.add.text(w / 2, h * 0.95, '按空格键快速重来', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#886644',
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: hint,
      alpha: 0.4,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      this.cleanup();
      this.scene.start('GameScene');
    });
  }

  private cleanup(): void {
    if (this.inputContainer && this.inputContainer.parentNode) {
      this.inputContainer.parentNode.removeChild(this.inputContainer);
    }
  }

  shutdown(): void {
    this.cleanup();
  }
}
