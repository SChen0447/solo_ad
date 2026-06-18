import {
  GameState,
  PlayerState,
  ElementType,
  ELEMENT_COLORS,
  ELEMENT_NAMES
} from './types';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const GRID_SIZE = 40;
const PANEL_WIDTH = 180;
const BREAKPOINT = 900;

export class UIManager {
  private ctx: CanvasRenderingContext2D;
  private animationFrame = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(state: GameState): void {
    this.animationFrame++;
    this.drawBackground();
    this.drawArenaGrid();
    this.drawPlayer(state.player);
    this.drawEnemies(state);
    this.drawFragments(state);
    this.drawFireballs(state);
    this.drawIceWalls(state);
    this.drawLightnings(state);
    this.drawExplosions(state);
    this.drawHealthBar(state.player);
    this.drawFormIndicator(state.player);
    this.drawSkillCooldown(state.player);

    const screenWidth = state.screenWidth || ARENA_WIDTH;

    if (screenWidth >= BREAKPOINT) {
      this.drawLeftPanel(state);
      this.drawRightPanel(state);
    } else {
      this.drawCollapsedButtons(state);
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(1, '#2d1b69');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  }

  private drawArenaGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#4a2a8a';
    ctx.lineWidth = 1;

    for (let x = 0; x <= ARENA_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ARENA_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= ARENA_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA_WIDTH, y);
      ctx.stroke();
    }
  }

  private drawPlayer(player: PlayerState): void {
    const ctx = this.ctx;
    const { x, y } = player.position;
    const color = ELEMENT_COLORS[player.currentForm];
    const isFlashing = player.currentForm === 'lightning' && Math.floor(this.animationFrame / 3) % 2 === 0;

    ctx.save();
    ctx.translate(x, y);

    const auraRadius = 18;
    ctx.save();
    ctx.rotate(player.auraRotation);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = auraRadius + (i % 2 === 0 ? 2 : -2);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = isFlashing ? '#ffffff' : color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    glowGradient.addColorStop(0, isFlashing ? '#ffffff' : color);
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isFlashing ? '#ffffff' : color;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(-4, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawEnemies(state: GameState): void {
    const ctx = this.ctx;
    const size = 25;

    for (const enemy of state.enemies) {
      const { x, y } = enemy.position;

      if (enemy.flashing && Math.floor(this.animationFrame / 4) % 2 === 0) {
        continue;
      }

      ctx.save();
      ctx.translate(x, y);

      const angle = Math.atan2(
        state.player.position.y - y,
        state.player.position.x - x
      );
      ctx.rotate(angle);

      let color = enemy.color;
      if (enemy.frozen) {
        color = '#87ceeb';
      }

      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(-size / 2, -size / 2);
      ctx.lineTo(-size / 3, 0);
      ctx.lineTo(-size / 2, size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (enemy.frozen) {
        ctx.fillStyle = 'rgba(135, 206, 235, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, size / 2 + 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawFragments(state: GameState): void {
    const ctx = this.ctx;
    const size = 6;

    for (const fragment of state.fragments) {
      const { x, y } = fragment.position;
      const pulse = 1 + Math.sin(this.animationFrame * 0.1) * 0.2;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.animationFrame * 0.02);

      ctx.fillStyle = fragment.color;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const r = size * pulse;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawFireballs(state: GameState): void {
    const ctx = this.ctx;

    for (const fireball of state.fireballs) {
      const { x, y } = fireball.position;

      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
      glowGradient.addColorStop(0, '#ff6347');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff6347';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawIceWalls(state: GameState): void {
    const ctx = this.ctx;

    for (const wall of state.iceWalls) {
      const { x, y } = wall.position;
      const alpha = wall.duration / wall.maxDuration;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(wall.angle);

      ctx.fillStyle = `rgba(0, 191, 255, ${0.5 * alpha})`;
      ctx.strokeStyle = `rgba(135, 206, 235, ${0.8 * alpha})`;
      ctx.lineWidth = 2;
      ctx.fillRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);
      ctx.strokeRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);

      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * alpha})`;
      for (let i = 0; i < 3; i++) {
        const px = -wall.width / 2 + (i + 1) * wall.width / 4;
        ctx.fillRect(px - 2, -wall.height / 2 + 2, 4, wall.height - 4);
      }

      ctx.restore();
    }
  }

  private drawLightnings(state: GameState): void {
    const ctx = this.ctx;

    for (const lightning of state.lightnings) {
      const alpha = lightning.duration / lightning.maxDuration;

      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(lightning.start.x, lightning.start.y);
      for (const seg of lightning.segments) {
        ctx.lineTo(seg.x, seg.y);
      }
      ctx.lineTo(lightning.end.x, lightning.end.y);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawExplosions(state: GameState): void {
    const ctx = this.ctx;

    for (const exp of state.explosions) {
      const { x, y } = exp.position;
      const progress = 1 - exp.duration / exp.maxDuration;
      const radius = exp.maxRadius * progress;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, '#ffff00');
      gradient.addColorStop(0.5, '#ff6347');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawHealthBar(player: PlayerState): void {
    const ctx = this.ctx;
    const barWidth = 200;
    const barHeight = 12;
    const x = 20;
    const y = 20;
    const healthPercent = player.health / player.maxHealth;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.roundRect(ctx, x - 2, y - 2, barWidth + 4, barHeight + 4, 4);
    ctx.fill();

    ctx.fillStyle = '#333333';
    this.roundRect(ctx, x, y, barWidth, barHeight, 3);
    ctx.fill();

    let healthColor: string;
    if (healthPercent > 0.6) {
      healthColor = '#00ff00';
    } else if (healthPercent > 0.3) {
      healthColor = '#ffff00';
    } else {
      healthColor = '#ff0000';
    }

    const fillWidth = barWidth * healthPercent;
    ctx.fillStyle = healthColor;
    this.roundRect(ctx, x, y, fillWidth, barHeight, 3);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${player.health}/${player.maxHealth}`, x + barWidth / 2, y + barHeight - 2);
  }

  private drawFormIndicator(player: PlayerState): void {
    const ctx = this.ctx;
    const centerX = ARENA_WIDTH / 2;
    const y = 15;
    const iconSize = 24;
    const barWidth = 80;
    const barHeight = 6;

    const bgX = centerX - iconSize / 2 - 10;
    const bgY = y - 5;
    const bgWidth = iconSize + barWidth + 25;
    const bgHeight = iconSize + 15;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.roundRect(ctx, bgX, bgY, bgWidth, bgHeight, 4);
    ctx.fill();

    const color = ELEMENT_COLORS[player.currentForm];
    ctx.save();
    ctx.translate(centerX, y + iconSize / 2);

    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ELEMENT_NAMES[player.currentForm], 0, 0);

    ctx.restore();

    const cooldownPercent = player.formCooldown / player.formCooldownMax;
    const cooldownX = centerX + iconSize / 2 + 8;
    const cooldownY = y + iconSize / 2 - barHeight / 2;

    ctx.fillStyle = '#333333';
    this.roundRect(ctx, cooldownX, cooldownY, barWidth, barHeight, 2);
    ctx.fill();

    if (cooldownPercent > 0) {
      ctx.fillStyle = color;
      this.roundRect(ctx, cooldownX, cooldownY, barWidth * (1 - cooldownPercent), barHeight, 2);
      ctx.fill();
    }
  }

  private drawSkillCooldown(player: PlayerState): void {
    const ctx = this.ctx;
    const centerX = ARENA_WIDTH / 2;
    const y = ARENA_HEIGHT - 50;
    const radius = 20;
    const color = ELEMENT_COLORS[player.currentForm];

    ctx.save();
    ctx.translate(centerX, y);

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    const cooldownPercent = player.skillCooldown / player.skillCooldownMax;
    if (cooldownPercent > 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cooldownPercent), false);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('J', 0, 0);

    ctx.fillStyle = '#cccccc';
    ctx.font = '10px Arial';
    ctx.fillText('技能', 0, radius + 18);

    ctx.restore();
  }

  private drawLeftPanel(state: GameState): void {
    const ctx = this.ctx;
    const x = 10;
    const y = 50;
    const width = PANEL_WIDTH;
    const height = 280;

    this.drawGlassPanel(x, y, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('元素形态', x + 15, y + 30);

    const forms: ElementType[] = ['fire', 'ice', 'lightning'];
    const formNames = ['火形态', '冰形态', '雷形态'];

    forms.forEach((form, index) => {
      const formY = y + 55 + index * 70;
      const color = ELEMENT_COLORS[form];
      const level = state.player.formLevels[form];
      const fragments = state.player.fragments[form];
      const progress = fragments / 5;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 25, formY + 12, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(ELEMENT_NAMES[form], x + 25, formY + 15);

      ctx.textAlign = 'left';
      ctx.font = '12px Arial';
      ctx.fillText(`${formNames} Lv.${level}`, x + 50, formY + 8);

      ctx.fillStyle = '#888888';
      ctx.fillRect(x + 50, formY + 18, width - 75, 8);

      ctx.fillStyle = color;
      ctx.fillRect(x + 50, formY + 18, (width - 75) * progress, 8);

      ctx.fillStyle = '#aaaaaa';
      ctx.font = '10px Arial';
      ctx.fillText(`碎片: ${fragments}/5`, x + 50, formY + 38);
    });

    const isReady = state.player.skillCooldown === 0;
    ctx.fillStyle = isReady ? '#00ff00' : '#ff6600';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`技能状态: ${isReady ? '就绪' : '冷却中'}`, x + 15, y + height - 20);
  }

  private drawRightPanel(state: GameState): void {
    const ctx = this.ctx;
    const x = ARENA_WIDTH - PANEL_WIDTH - 10;
    const y = 50;
    const width = PANEL_WIDTH;
    const height = 200;

    this.drawGlassPanel(x, y, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('战斗数据', x + 15, y + 30);

    const minutes = Math.floor(state.gameTime / 60);
    const seconds = Math.floor(state.gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const items = [
      { label: '游戏时间', value: timeStr, color: '#ffd700' },
      { label: '击杀数', value: state.kills.toString(), color: '#ff6347' },
      { label: '得分', value: state.score.toString(), color: '#00bfff' },
      { label: '当前精灵', value: state.enemies.length.toString(), color: '#98fb98' }
    ];

    items.forEach((item, index) => {
      const itemY = y + 65 + index * 35;

      ctx.fillStyle = '#cccccc';
      ctx.font = '12px Arial';
      ctx.fillText(item.label, x + 15, itemY);

      ctx.fillStyle = item.color;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(item.value, x + width - 15, itemY);
      ctx.textAlign = 'left';
    });
  }

  private drawCollapsedButtons(state: GameState): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.roundRect(ctx, 10, 50, 40, 40, 12);
    ctx.fill();
    this.drawGoldenBorder(ctx, 10, 50, 40, 40, 12);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('◀', 30, 78);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.roundRect(ctx, ARENA_WIDTH - 50, 50, 40, 40, 12);
    ctx.fill();
    this.drawGoldenBorder(ctx, ARENA_WIDTH - 50, 50, 40, 40, 12);

    ctx.fillStyle = '#ffd700';
    ctx.fillText('▶', ARENA_WIDTH - 30, 78);
  }

  private drawGlassPanel(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.fill();

    this.drawGoldenBorder(ctx, x, y, width, height, 12);

    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.clip();

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    ctx.restore();
  }

  private drawGoldenBorder(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(0.5, '#ff8c00');
    gradient.addColorStop(1, '#ffd700');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, width, height, radius);
    ctx.stroke();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  handleClick(x: number, y: number, state: GameState): void {
    if (state.screenWidth < BREAKPOINT) {
      if (x >= 10 && x <= 50 && y >= 50 && y <= 90) {
        state.leftPanelOpen = !state.leftPanelOpen;
      }
      if (x >= ARENA_WIDTH - 50 && x <= ARENA_WIDTH - 10 && y >= 50 && y <= 90) {
        state.rightPanelOpen = !state.rightPanelOpen;
      }
    }
  }
}
