import { Player, GameStats, GamePhase, Rating, MAP_WIDTH, MAP_HEIGHT, PERFECT_WINDOW } from '../types';

interface UIState {
  player: Player;
  stats: GameStats;
  beatProgress: number;
  phase: GamePhase;
  transitionProgress: number;
  isTransitioning: boolean;
  timeUntilNextBeat: number;
}

export class UIOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastBeatTime: number = 0;
  private beatPulseActive: boolean = false;
  private beatPulseProgress: number = 0;
  private colors = {
    text: '#f1f5f9',
    healthLow: '#ef4444',
    healthHigh: '#22c55e',
    healthMid: '#f59e0b',
    beatStart: '#e94560',
    beatEnd: '#0f3460',
    beatPerfect: '#10b981',
    beatWarning: '#f59e0b',
    overlayBg: 'rgba(26, 26, 46, 0.95)'
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  render(state: UIState): void {
    this.clear();

    if (state.phase === GamePhase.PLAYING || state.phase === GamePhase.PAUSED) {
      this.renderHealthBar(state.player);
      this.renderScoreAndRating(state.stats);
      this.renderBeatIndicator(state.beatProgress, state.timeUntilNextBeat);
      this.renderPauseButton();
    }

    if (state.isTransitioning) {
      this.renderTransitionOverlay(state.transitionProgress);
    }

    if (state.phase === GamePhase.PAUSED) {
      this.renderPauseMenu();
    }

    if (state.phase === GamePhase.GAME_OVER) {
      this.renderGameOver(state.stats);
    }

    if (state.phase === GamePhase.LEVEL_COMPLETE) {
      this.renderLevelComplete(state.stats);
    }
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  }

  private renderHealthBar(player: Player): void {
    const ctx = this.ctx;
    const barWidth = 200;
    const barHeight = 16;
    const x = 20;
    const y = 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 4, y - 4, barWidth + 8, barHeight + 32);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 16, y + 8, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(x + 16, y + 8, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 12, y + 5, 8, 8);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x + 14, y + 6, 2, 2);
    ctx.fillRect(x + 18, y + 6, 2, 2);

    const barX = x + 40;
    const barY = y + 4;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const healthPercent = player.health / player.maxHealth;
    const healthWidth = barWidth * healthPercent;

    const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    if (healthPercent > 0.6) {
      gradient.addColorStop(0, this.colors.healthHigh);
      gradient.addColorStop(1, '#16a34a');
    } else if (healthPercent > 0.3) {
      gradient.addColorStop(0, this.colors.healthMid);
      gradient.addColorStop(1, '#d97706');
    } else {
      gradient.addColorStop(0, this.colors.healthLow);
      gradient.addColorStop(1, '#dc2626');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, healthWidth, barHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = this.colors.text;
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.ceil(player.health)} / ${player.maxHealth}`, barX + 5, barY + 12);

    ctx.fillStyle = 'rgba(241, 245, 249, 0.7)';
    ctx.font = '11px Arial';
    ctx.fillText(`⚔ ${player.attack}  ⚡ ${player.speed}`, x, barY + barHeight + 14);
  }

  private renderScoreAndRating(stats: GameStats): void {
    const ctx = this.ctx;
    const x = MAP_WIDTH - 20;
    const y = 24;

    ctx.textAlign = 'right';

    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`得分: ${stats.score}`, x, y);

    ctx.font = '12px Arial';
    ctx.fillText(`击杀: ${stats.kills}`, x, y + 20);
    ctx.fillText(`完美: ${stats.perfectHits}`, x, y + 38);

    if (stats.rating) {
      const ratingColors: Record<Rating, string> = {
        [Rating.S]: '#fbbf24',
        [Rating.A]: '#22c55e',
        [Rating.B]: '#3b82f6',
        [Rating.C]: '#6b7280'
      };

      ctx.fillStyle = ratingColors[stats.rating];
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`评级: ${stats.rating}`, x, y + 66);
    }
  }

  private renderBeatIndicator(beatProgress: number, timeUntilNextBeat: number): void {
    const ctx = this.ctx;
    const centerX = MAP_WIDTH / 2;
    const centerY = MAP_HEIGHT - 80;
    const size = 120;

    if (timeUntilNextBeat <= PERFECT_WINDOW) {
      this.beatPulseActive = true;
      this.beatPulseProgress = 0;
    }

    if (this.beatPulseActive) {
      this.beatPulseProgress += 0.05;
      if (this.beatPulseProgress >= 1) {
        this.beatPulseActive = false;
      }
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
    ctx.fill();

    const pulseScale = 0.5 + beatProgress * 0.5;
    const pulseSize = (size / 2) * pulseScale;

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, pulseSize
    );

    if (this.beatPulseActive) {
      const pulseAlpha = 1 - this.beatPulseProgress;
      gradient.addColorStop(0, `rgba(245, 158, 11, ${pulseAlpha})`);
      gradient.addColorStop(0.5, `rgba(16, 185, 129, ${pulseAlpha * 0.8})`);
      gradient.addColorStop(1, `rgba(15, 52, 96, ${pulseAlpha * 0.5})`);
    } else {
      gradient.addColorStop(0, this.colors.beatStart);
      gradient.addColorStop(0.5, 'rgba(15, 52, 96, 0.8)');
      gradient.addColorStop(1, this.colors.beatEnd);
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
    ctx.stroke();

    const perfectIndicatorSize = size / 2 + 5;
    ctx.strokeStyle = this.beatPulseActive ? this.colors.beatPerfect : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, perfectIndicatorSize, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (timeUntilNextBeat <= PERFECT_WINDOW) {
      ctx.fillStyle = this.colors.beatPerfect;
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PERFECT!', centerX, centerY + 5);
    } else if (timeUntilNextBeat <= PERFECT_WINDOW * 2) {
      ctx.fillStyle = this.colors.beatWarning;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('准备...', centerX, centerY + 5);
    } else {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.6)';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('节拍', centerX, centerY + 5);
    }

    ctx.fillStyle = 'rgba(241, 245, 249, 0.5)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('WASD移动  空格攻击', centerX, centerY + size / 2 + 25);
  }

  private renderPauseButton(): void {
    const ctx = this.ctx;
    const x = MAP_WIDTH / 2 - 30;
    const y = 20;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x, y, 60, 28);

    ctx.fillStyle = this.colors.text;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⏸ 暂停', x + 30, y + 19);
  }

  private renderTransitionOverlay(progress: number): void {
    const ctx = this.ctx;

    const blurAmount = Math.sin(progress * Math.PI) * 8;
    const brightness = 0.3 + Math.sin(progress * Math.PI) * 0.7;

    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.8})`;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    if (blurAmount > 0.5) {
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.fillStyle = `rgba(26, 26, 46, ${brightness * 0.5})`;
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      ctx.filter = 'none';
    }

    if (progress > 0.3 && progress < 0.7) {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('进入下一个房间...', MAP_WIDTH / 2, MAP_HEIGHT / 2);
    }
  }

  private renderPauseMenu(): void {
    const ctx = this.ctx;

    ctx.fillStyle = this.colors.overlayBg;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏暂停', MAP_WIDTH / 2, MAP_HEIGHT / 2 - 40);

    ctx.font = '20px Arial';
    ctx.fillText('按 ESC 继续游戏', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 20);
    ctx.fillText('按 R 重新开始', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 55);
  }

  private renderGameOver(stats: GameStats): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', MAP_WIDTH / 2, MAP_HEIGHT / 2 - 60);

    ctx.fillStyle = this.colors.text;
    ctx.font = '24px Arial';
    ctx.fillText(`最终得分: ${stats.score}', MAP_WIDTH / 2, MAP_HEIGHT / 2);

    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
    ctx.fillText(`击杀数: ${stats.kills}  完美攻击: ${stats.perfectHits}', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 40);

    ctx.fillText('按 R 重新开始', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 80);
  }

  private renderLevelComplete(stats: GameStats): void {
    const ctx = this.ctx;
    const ratingColors: Record<Rating, string> = {
      [Rating.S]: '#fbbf24',
      [Rating.A]: '#22c55e',
      [Rating.B]: '#3b82f6',
      [Rating.C]: '#6b7280'
    };

    ctx.fillStyle = 'rgba(15, 52, 96, 0.9)';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('关卡完成!', MAP_WIDTH / 2, MAP_HEIGHT / 2 - 80);

    ctx.fillStyle = ratingColors[stats.rating];
    ctx.font = 'bold 80px Arial';
    ctx.fillText(stats.rating, MAP_WIDTH / 2, MAP_HEIGHT / 2);

    ctx.fillStyle = this.colors.text;
    ctx.font = '24px Arial';
    ctx.fillText(`得分: ${stats.score}', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 60);

    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
    const levelTime = ((performance.now() - stats.levelStartTime) / 1000;
    ctx.fillText(
      `用时: ${levelTime.toFixed(1)}秒  击杀: ${stats.kills}  完美: ${stats.perfectHits}`,
      MAP_WIDTH / 2,
      MAP_HEIGHT / 2 + 95
    );

    ctx.fillText('按 R 进入下一关', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 130);
  }

  renderMenu(onStart: () => void): void {
    const ctx = this.ctx;

    const gradient = ctx.createRadialGradient(
      MAP_WIDTH / 2, MAP_HEIGHT / 2, 0,
      MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH / 2
    );
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎵 节奏地牢', MAP_WIDTH / 2, MAP_HEIGHT / 2 - 100);

    ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
    ctx.font = '20px Arial';
    ctx.fillText('跟随节拍，征服地牢', MAP_WIDTH / 2, MAP_HEIGHT / 2 - 50);

    ctx.fillStyle = 'rgba(241, 245, 249, 0.6)';
    ctx.font = '16px Arial';
    ctx.fillText('🎮 WASD 移动', MAP_WIDTH / 2, MAP_HEIGHT / 2);
    ctx.fillText('⚔ 空格键 攻击', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 30);
    ctx.fillText('⏸ ESC 暂停', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 60);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.font = '14px Arial';
    ctx.fillText('⚠ 脱拍会受到伤害！', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 100);

    const buttonX = MAP_WIDTH / 2 - 100;
    const buttonY = MAP_HEIGHT / 2 + 140;
    const buttonWidth = 200;
    const buttonHeight = 50;

    ctx.fillStyle = '#e94560';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('开始游戏', MAP_WIDTH / 2, buttonY + 33);

    this.canvas.onclick = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= buttonX && x <= buttonX + buttonWidth &&
          y >= buttonY && y <= buttonY + buttonHeight) {
        onStart();
        this.canvas.onclick = null;
      }
    };
  }

  destroy(): void {
    this.canvas.onclick = null;
  }
}

export default UIOverlay;
