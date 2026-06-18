import {
  CELL_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  PLAYER_RADIUS,
  GUARD_SIZE,
  GUARD_SIGHT_RADIUS,
  GUARD_SIGHT_ANGLE,
  TIME_LIMIT,
  Vec2,
  Guard,
  Pulse,
  Coin,
  GameState,
  AbilityType,
  Ability,
} from '../game/types';
import { WorldModel } from '../game/WorldModel';
import { SoundWaveSystem } from '../game/SoundWaveSystem';
import { GuardAI } from '../game/GuardAI';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: WorldModel;
  private soundWave: SoundWaveSystem;
  private guardAI: GuardAI;
  private wallNoiseCache: HTMLCanvasElement | null = null;
  private backgroundParticles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
  }> = [];
  private particleSystemTime: number = 0;
  private coinBobTime: number = 0;
  private failFadeAmount: number = 0;
  private exitPulseTime: number = 0;

  constructor(canvas: HTMLCanvasElement, world: WorldModel, soundWave: SoundWaveSystem, guardAI: GuardAI) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.world = world;
    this.soundWave = soundWave;
    this.guardAI = guardAI;
    this.generateWallNoise();
    this.initBackgroundParticles();
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  private generateWallNoise(): void {
    this.wallNoiseCache = document.createElement('canvas');
    this.wallNoiseCache.width = 64;
    this.wallNoiseCache.height = 64;
    const ctx = this.wallNoiseCache.getContext('2d')!;
    const imgData = ctx.createImageData(64, 64);
    for (let i = 0; i < 64 * 64; i++) {
      const idx = i * 4;
      const noise = Math.random();
      const v = Math.floor(30 + noise * 25);
      imgData.data[idx] = v + 10;
      imgData.data[idx + 1] = v + 5;
      imgData.data[idx + 2] = v + 30;
      imgData.data[idx + 3] = 40 + Math.floor(noise * 30);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  private initBackgroundParticles(): void {
    for (let i = 0; i < 80; i++) {
      this.backgroundParticles.push({
        x: Math.random() * GRID_WIDTH * CELL_SIZE,
        y: Math.random() * GRID_HEIGHT * CELL_SIZE,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: Math.random() * 5,
        maxLife: 5 + Math.random() * 5,
        size: 1 + Math.random() * 2,
      });
    }
  }

  public render(
    gameState: GameState,
    delta: number,
    selectedAbility: AbilityType | null,
    hoveredAbility: number,
  ): void {
    this.particleSystemTime += delta;
    this.coinBobTime += delta;
    this.exitPulseTime += delta;

    this.updateBackgroundParticles(delta);
    this.updateCoinAnimations(delta);

    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const gameW = GRID_WIDTH * CELL_SIZE;
    const gameH = GRID_HEIGHT * CELL_SIZE;
    const offsetX = (canvasW - gameW) / 2;
    const offsetY = (canvasH - gameH) / 2;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(10, 11, 26, 0.3)';
    this.ctx.fillRect(0, 0, canvasW, canvasH);
    this.ctx.translate(offsetX, offsetY);

    this.drawBackground();
    this.drawMaze();
    this.drawExit();
    this.drawCoins();
    this.drawSoundWaves();
    this.drawGuards();
    this.drawPlayer();
    this.drawEntrance();

    this.ctx.restore();

    this.drawUI(gameState);

    if (gameState === 'ABILITY_SELECT') {
      this.drawAbilitySelectUI(hoveredAbility);
    }

    if (gameState === 'LEVEL_COMPLETE') {
      this.drawLevelComplete();
    }

    if (gameState === 'GAME_OVER') {
      this.failFadeAmount = Math.min(1, this.failFadeAmount + delta * 0.8);
      this.drawGameOver();
    } else {
      this.failFadeAmount = Math.max(0, this.failFadeAmount - delta * 0.5);
    }

    if (this.failFadeAmount > 0 && gameState !== 'GAME_OVER') {
      this.ctx.fillStyle = `rgba(0, 0, 0, ${this.failFadeAmount * 0.5})`;
      this.ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }

  private updateBackgroundParticles(delta: number): void {
    for (const p of this.backgroundParticles) {
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;

      if (
        p.life <= 0 ||
        p.x < 0 ||
        p.x > GRID_WIDTH * CELL_SIZE ||
        p.y < 0 ||
        p.y > GRID_HEIGHT * CELL_SIZE
      ) {
        p.x = Math.random() * GRID_WIDTH * CELL_SIZE;
        p.y = Math.random() * GRID_HEIGHT * CELL_SIZE;
        p.life = p.maxLife;
        p.vx = (Math.random() - 0.5) * 8;
        p.vy = (Math.random() - 0.5) * 8;
      }
    }
  }

  private updateCoinAnimations(delta: number): void {
    const coins = this.world.getCoins();
    for (const coin of coins) {
      if (coin.collected && coin.collectAnimation > 0) {
        coin.collectAnimation = Math.max(0, coin.collectAnimation - delta * 2);
      }
    }
  }

  private drawBackground(): void {
    const w = GRID_WIDTH * CELL_SIZE;
    const h = GRID_HEIGHT * CELL_SIZE;

    const grad = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, '#1C1B33');
    grad.addColorStop(1, '#0A0B1A');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    for (const p of this.backgroundParticles) {
      const alpha = (p.life / p.maxLife) * 0.4;
      this.ctx.fillStyle = `rgba(150, 140, 220, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();

    this.ctx.strokeStyle = 'rgba(60, 50, 100, 0.15)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * CELL_SIZE, 0);
      this.ctx.lineTo(x * CELL_SIZE, h);
      this.ctx.stroke();
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * CELL_SIZE);
      this.ctx.lineTo(w, y * CELL_SIZE);
      this.ctx.stroke();
    }
  }

  private drawMaze(): void {
    const grid = this.world.getGrid();

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === 'WALL') {
          this.drawWallCell(x, y);
        }
      }
    }
  }

  private drawWallCell(cx: number, cy: number): void {
    const x = cx * CELL_SIZE;
    const y = cy * CELL_SIZE;
    const w = CELL_SIZE;
    const h = CELL_SIZE;

    const progress = (cx + cy) / (GRID_WIDTH + GRID_HEIGHT);
    const r1 = 42, g1 = 30, b1 = 60;
    const r2 = 30, g2 = 42, b2 = 76;
    const r = Math.floor(r1 + (r2 - r1) * progress);
    const g = Math.floor(g1 + (g2 - g1) * progress);
    const b = Math.floor(b1 + (b2 - b1) * progress);

    this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    this.ctx.fillRect(x, y, w, h);

    this.ctx.fillStyle = `rgba(${r + 10}, ${g + 10}, ${b + 20}, 0.5)`;
    this.ctx.fillRect(x + 1, y + 1, w - 2, 2);
    this.ctx.fillRect(x + 1, y + 1, 2, h - 2);

    this.ctx.fillStyle = `rgba(${r - 15}, ${g - 15}, ${b - 10}, 0.4)`;
    this.ctx.fillRect(x + 1, y + h - 3, w - 2, 2);
    this.ctx.fillRect(x + w - 3, y + 1, 2, h - 2);

    if (this.wallNoiseCache) {
      const pattern = this.ctx.createPattern(this.wallNoiseCache, 'repeat');
      if (pattern) {
        this.ctx.fillStyle = pattern;
        this.ctx.fillRect(x, y, w, h);
      }
    }
  }

  private drawEntrance(): void {
    const pos = this.world.getEntrancePosition();
    const pulse = (Math.sin(this.particleSystemTime * 2) + 1) * 0.5;
    const alpha = 0.2 + pulse * 0.15;

    this.ctx.save();
    const glow = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, CELL_SIZE);
    glow.addColorStop(0, `rgba(100, 200, 150, ${alpha + 0.2})`);
    glow.addColorStop(1, `rgba(100, 200, 150, 0)`);
    this.ctx.fillStyle = glow;
    this.ctx.fillRect(pos.x - CELL_SIZE, pos.y - CELL_SIZE, CELL_SIZE * 2, CELL_SIZE * 2);

    this.ctx.fillStyle = `rgba(120, 230, 180, ${0.4 + pulse * 0.2})`;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, 10 + pulse * 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#4A8A6A';
    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('IN', pos.x, pos.y + 3);
    this.ctx.restore();
  }

  private drawExit(): void {
    const pos = this.world.getExitPosition();
    const intensity = this.world.getExitGlowIntensity();
    if (intensity <= 0) return;

    const pulse = (Math.sin(this.exitPulseTime * 3) + 1) * 0.5;
    const alpha = intensity * (0.3 + pulse * 0.3);

    this.ctx.save();
    const glowSize = CELL_SIZE * 2;
    const glow = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
    glow.addColorStop(0, `rgba(255, 215, 100, ${alpha + 0.2})`);
    glow.addColorStop(0.5, `rgba(255, 200, 80, ${alpha * 0.5})`);
    glow.addColorStop(1, `rgba(255, 200, 80, 0)`);
    this.ctx.fillStyle = glow;
    this.ctx.fillRect(pos.x - glowSize, pos.y - glowSize, glowSize * 2, glowSize * 2);

    this.ctx.strokeStyle = `rgba(255, 220, 130, ${alpha + 0.3})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, 12 + pulse * 4, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = `rgba(255, 230, 160, ${0.6 + pulse * 0.3})`;
    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('OUT', pos.x, pos.y + 3);
    this.ctx.restore();
  }

  private drawCoins(): void {
    const coins = this.world.getCoins();
    for (const coin of coins) {
      if (coin.collected) {
        if (coin.collectAnimation > 0) {
          const scale = 1 + (1 - coin.collectAnimation) * 1.5;
          const alpha = coin.collectAnimation;
          this.ctx.save();
          this.ctx.globalAlpha = alpha;
          this.ctx.translate(coin.position.x, coin.position.y - (1 - coin.collectAnimation) * 20);
          this.ctx.scale(scale, scale);
          this.drawCoinShape(0, 0);
          this.ctx.restore();
        }
        continue;
      }

      const bob = Math.sin(this.coinBobTime * 3 + coin.position.x * 0.1) * 2;
      const y = coin.position.y + bob;
      const shimmer = (Math.sin(this.coinBobTime * 5 + coin.position.y * 0.1) + 1) * 0.5;

      this.ctx.save();
      this.ctx.translate(coin.position.x, y);

      const glow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      glow.addColorStop(0, `rgba(255, 220, 100, ${0.3 + shimmer * 0.2})`);
      glow.addColorStop(1, 'rgba(255, 220, 100, 0)');
      this.ctx.fillStyle = glow;
      this.ctx.fillRect(-20, -20, 40, 40);

      this.drawCoinShape(0, 0);
      this.ctx.restore();
    }
  }

  private drawCoinShape(x: number, y: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);

    const grad = this.ctx.createRadialGradient(-2, -2, 0, 0, 0, 7);
    grad.addColorStop(0, '#FFF5C0');
    grad.addColorStop(0.5, '#FFD700');
    grad.addColorStop(1, '#B8860B');
    this.ctx.fillStyle = grad;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#DAA520';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFF8DC';
    this.ctx.beginPath();
    this.ctx.arc(-2, -2, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawSoundWaves(): void {
    const pulses = this.world.getPulses();

    for (const pulse of pulses) {
      for (const wave of pulse.waves) {
        const opacity = this.soundWave.getWaveOpacity(wave);
        if (opacity <= 0) continue;
        const expandedRadius = this.soundWave.getWaveExpandedRadius(wave);

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(100, 180, 255, ${opacity})`;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(wave.position.x, wave.position.y, expandedRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.strokeStyle = `rgba(150, 200, 255, ${opacity * 0.4})`;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(wave.position.x, wave.position.y, expandedRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }

      if (pulse.alive) {
        this.ctx.save();
        const pAlpha = 0.7 * pulse.intensity;

        this.ctx.strokeStyle = `rgba(120, 200, 255, ${pAlpha})`;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.arc(pulse.position.x, pulse.position.y, pulse.radius, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.fillStyle = `rgba(180, 220, 255, ${pAlpha * 0.6})`;
        this.ctx.beginPath();
        this.ctx.arc(pulse.position.x, pulse.position.y, 3, 0, Math.PI * 2);
        this.ctx.fill();

        const glow = this.ctx.createRadialGradient(
          pulse.position.x,
          pulse.position.y,
          0,
          pulse.position.x,
          pulse.position.y,
          15,
        );
        glow.addColorStop(0, `rgba(150, 210, 255, ${pAlpha * 0.5})`);
        glow.addColorStop(1, 'rgba(150, 210, 255, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.fillRect(
          pulse.position.x - 15,
          pulse.position.y - 15,
          30,
          30,
        );

        this.ctx.restore();
      }
    }
  }

  private drawGuards(): void {
    const guards = this.world.getGuards();
    const playerPos = this.world.getPlayerPosition();

    for (const guard of guards) {
      for (let i = guard.lastPositions.length - 1; i >= 0; i--) {
        const pos = guard.lastPositions[i];
        const alpha = (1 - i / guard.lastPositions.length) * 0.2;
        this.drawGuardShape(pos, guard.angle, alpha, false, guard);
      }

      const distToPlayer = Math.sqrt(
        Math.pow(guard.position.x - playerPos.x, 2) +
        Math.pow(guard.position.y - playerPos.y, 2),
      );
      const proximityWarn = distToPlayer < CELL_SIZE * 4;

      this.drawGuardShape(guard.position, guard.angle, 1, proximityWarn, guard);
      this.drawGuardVisionCone(guard);
      this.drawGuardAlertIndicator(guard);
    }
  }

  private drawGuardShape(pos: Vec2, angle: number, alpha: number, proximity: boolean, guard: Guard): void {
    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);
    this.ctx.rotate(angle);
    this.ctx.globalAlpha = alpha;

    const size = GUARD_SIZE;
    let fillColor = 'rgba(50, 50, 60, 0.85)';
    let strokeColor = 'rgba(100, 100, 120, 0.9)';

    if (guard.state === 'CHASE') {
      fillColor = 'rgba(100, 40, 40, 0.85)';
      strokeColor = 'rgba(200, 80, 80, 0.9)';
    } else if (guard.state === 'ALERT') {
      fillColor = 'rgba(90, 70, 40, 0.85)';
      strokeColor = 'rgba(200, 160, 80, 0.9)';
    }

    if (proximity && guard.state === 'PATROL') {
      strokeColor = 'rgba(180, 100, 100, 0.9)';
    }

    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(size * 0.6, 0);
    this.ctx.lineTo(-size * 0.4, -size * 0.45);
    this.ctx.lineTo(-size * 0.2, 0);
    this.ctx.lineTo(-size * 0.4, size * 0.45);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = guard.state === 'CHASE' ? 'rgba(255, 100, 100, 0.9)' : 'rgba(200, 200, 220, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(size * 0.2, 0, 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawGuardVisionCone(guard: Guard): void {
    if (guard.state === 'CHASE' || guard.state === 'ALERT') {
      this.ctx.save();
      this.ctx.translate(guard.position.x, guard.position.y);
      this.ctx.rotate(guard.angle);

      let color = 'rgba(255, 100, 100, 0.12)';
      if (guard.state === 'ALERT') {
        const blink = Math.sin(this.particleSystemTime * 15) > 0;
        color = blink ? 'rgba(255, 180, 80, 0.15)' : 'rgba(255, 180, 80, 0.08)';
      }

      const radius = GUARD_SIGHT_RADIUS;
      const halfAngle = GUARD_SIGHT_ANGLE / 2;

      const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(255, 100, 100, 0)');
      this.ctx.fillStyle = grad;

      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, radius, -halfAngle, halfAngle);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private drawGuardAlertIndicator(guard: Guard): void {
    if (guard.state !== 'ALERT' && guard.state !== 'CHASE') return;
    if (guard.state === 'ALERT' && guard.blinkCount === 0) return;

    this.ctx.save();
    const x = guard.position.x;
    const y = guard.position.y - GUARD_SIZE * 0.8;

    const visible = guard.state === 'CHASE' || guard.blinkCount === 1;
    if (!visible) {
      this.ctx.restore();
      return;
    }

    const bounce = Math.sin(this.particleSystemTime * 8) * 2;

    this.ctx.font = 'bold 14px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = guard.state === 'CHASE' ? '#FF4444' : '#FFAA00';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText('!', x, y + bounce);
    this.ctx.fillText('!', x, y + bounce);

    this.ctx.restore();
  }

  private drawPlayer(): void {
    const pos = this.world.getPlayerPosition();
    const isInvisible = this.world.isPlayerInvisible();
    const invisProgress = this.world.getInvisibilityProgress();
    const pulse = (Math.sin(this.particleSystemTime * 4) + 1) * 0.5;

    this.ctx.save();

    let baseAlpha = 1;
    if (isInvisible) {
      baseAlpha = 0.25 + invisProgress * 0.2;
    }

    this.ctx.globalAlpha = baseAlpha;

    const glowSize = 30 + pulse * 8;
    const glow = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
    glow.addColorStop(0, 'rgba(255, 240, 150, 0.5)');
    glow.addColorStop(0.4, 'rgba(255, 220, 100, 0.25)');
    glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
    this.ctx.fillStyle = glow;
    this.ctx.fillRect(pos.x - glowSize, pos.y - glowSize, glowSize * 2, glowSize * 2);

    const bodyGrad = this.ctx.createRadialGradient(
      pos.x - 2,
      pos.y - 2,
      0,
      pos.x,
      pos.y,
      PLAYER_RADIUS,
    );
    bodyGrad.addColorStop(0, '#FFFFFF');
    bodyGrad.addColorStop(0.4, '#FFF5A0');
    bodyGrad.addColorStop(1, '#FFD700');
    this.ctx.fillStyle = bodyGrad;

    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, PLAYER_RADIUS, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 220, 80, 0.8)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(pos.x - 2, pos.y - 2, 3, 0, Math.PI * 2);
    this.ctx.fill();

    if (isInvisible) {
      this.ctx.globalAlpha = 0.15 + Math.sin(this.particleSystemTime * 6) * 0.1;
      this.ctx.strokeStyle = 'rgba(180, 150, 255, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, PLAYER_RADIUS + 5 + pulse * 2, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawUI(gameState: GameState): void {
    if (gameState !== 'PLAYING' && gameState !== 'LEVEL_COMPLETE') return;

    const canvasW = this.canvas.width;
    const gameW = GRID_WIDTH * CELL_SIZE;
    const gameH = GRID_HEIGHT * CELL_SIZE;
    const offsetX = (canvasW - gameW) / 2;
    const topY = (this.canvas.height - gameH) / 2 - 50;

    const time = this.world.getTimeRemaining();
    const coins = this.world.getCollectedCoins();
    const totalCoins = this.world.getCoins().length;
    const levelId = this.world.getLevelId();

    this.drawGlassPanel(offsetX, topY, 180, 42);
    this.drawTimer(offsetX + 20, topY + 21, time);

    this.drawGlassPanel(offsetX + 200, topY, 120, 42);
    this.drawCoinCounter(offsetX + 220, topY + 21, coins, totalCoins);

    this.drawGlassPanel(offsetX + 340, topY, 100, 42);
    this.drawLevelIndicator(offsetX + 390, topY + 21, levelId);

    const abilityType = this.world.getAbilityType();
    if (abilityType) {
      this.drawAbilityIndicator(offsetX + gameW - 160, topY, abilityType);
    }
  }

  private drawGlassPanel(x: number, y: number, w: number, h: number): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(30, 25, 60, 0.6)';
    this.ctx.strokeStyle = 'rgba(120, 100, 180, 0.3)';
    this.ctx.lineWidth = 1;
    this.roundRect(x, y, w, h, 10);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private drawTimer(x: number, y: number, time: number): void {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    let color = '#E8E4F0';
    let blink = false;
    if (time <= 30) {
      color = '#FF5555';
      blink = Math.sin(this.particleSystemTime * 6) > 0;
    }

    this.ctx.save();
    this.ctx.font = '10px "Press Start 2P", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = time <= 30 && blink ? '#FF8888' : color;
    this.ctx.fillText('⏱ ' + timeStr, x, y);
    this.ctx.restore();
  }

  private drawCoinCounter(x: number, y: number, current: number, total: number): void {
    this.ctx.save();
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#B8860B';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.font = '10px "Press Start 2P", monospace';
    this.ctx.fillStyle = '#FFE880';
    this.ctx.fillText(`${current}/${total}`, x + 14, y);
    this.ctx.restore();
  }

  private drawLevelIndicator(x: number, y: number, level: number): void {
    this.ctx.save();
    this.ctx.font = '10px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#C8C0E0';
    this.ctx.fillText(`LV ${level}`, x, y);
    this.ctx.restore();
  }

  private drawAbilityIndicator(x: number, y: number, type: AbilityType): void {
    const used = this.world.isAbilityUsed();
    this.drawGlassPanel(x, y, 140, 42);

    this.ctx.save();
    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = used ? '#666' : '#88FFAA';
    const label = type === 'SONIC_BOOST' ? '🔊 SONIC' : type === 'INVISIBILITY_CLOAK' ? '👻 CLOAK' : '👟 BOOTS';
    const key = type === 'SONIC_BOOST' ? '' : ' [E]';
    this.ctx.fillText(label + (used ? ' ✓' : key), x + 15, y + 21);
    this.ctx.restore();
  }

  private drawAbilitySelectUI(hovered: number): void {
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const centerX = canvasW / 2;
    const centerY = canvasH / 2;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(10, 10, 25, 0.75)';
    this.ctx.fillRect(0, 0, canvasW, canvasH);

    const panelW = 560;
    const panelH = 360;
    const px = centerX - panelW / 2;
    const py = centerY - panelH / 2;

    this.ctx.fillStyle = 'rgba(40, 30, 80, 0.75)';
    this.ctx.strokeStyle = 'rgba(160, 130, 230, 0.4)';
    this.ctx.lineWidth = 2;
    this.roundRect(px, py, panelW, panelH, 30);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.font = '16px "Press Start 2P", monospace';
    this.ctx.fillStyle = '#E8D0A0';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('选择你的能力', centerX, py + 30);

    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.fillStyle = '#A898C8';
    this.ctx.fillText('点击卡片或按 1/2/3 选择', centerX, py + 65);

    const abilities: Ability[] = [
      { type: 'SONIC_BOOST', name: '声波强化', description: '脉冲速度+20%\n可反弹次数+1', icon: '🔊', used: false },
      { type: 'INVISIBILITY_CLOAK', name: '隐身披风', description: '按E触发3秒隐身\n守卫无法看见', icon: '👻', used: false },
      { type: 'AGILITY_BOOTS', name: '敏捷靴', description: '移动速度+30%\n全程生效', icon: '👟', used: false },
    ];

    const cardW = 150;
    const cardH = 200;
    const startX = centerX - (cardW * 3 + 40) / 2;
    const cardY = py + 100;

    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + 20);
      const isHovered = hovered === i;
      this.drawAbilityCard(cx, cardY, cardW, cardH, abilities[i], isHovered, i + 1);
    }

    this.ctx.restore();
  }

  private drawAbilityCard(x: number, y: number, w: number, h: number, ab: Ability, hovered: boolean, keyNum: number): void {
    const float = Math.sin(this.particleSystemTime * 2 + x * 0.01) * (hovered ? 6 : 3);
    const cy = y + float;

    this.ctx.save();
    const scale = hovered ? 1.05 : 1;
    this.ctx.translate(x + w / 2, cy + h / 2);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-(x + w / 2), -(cy + h / 2));

    this.ctx.fillStyle = hovered ? 'rgba(70, 55, 120, 0.85)' : 'rgba(50, 40, 90, 0.7)';
    this.ctx.strokeStyle = hovered ? 'rgba(200, 170, 255, 0.7)' : 'rgba(130, 100, 190, 0.35)';
    this.ctx.lineWidth = hovered ? 2.5 : 1.5;
    this.roundRect(x, cy, w, h, 18);
    this.ctx.fill();
    this.ctx.stroke();

    if (hovered) {
      const glow = this.ctx.createRadialGradient(x + w / 2, cy + h / 2, 0, x + w / 2, cy + h / 2, w * 0.7);
      glow.addColorStop(0, 'rgba(180, 140, 255, 0.15)');
      glow.addColorStop(1, 'rgba(180, 140, 255, 0)');
      this.ctx.fillStyle = glow;
      this.ctx.fillRect(x - 20, cy - 20, w + 40, h + 40);
    }

    this.ctx.font = '32px serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(ab.icon, x + w / 2, cy + 60);

    this.ctx.font = '9px "Press Start 2P", monospace';
    this.ctx.fillStyle = hovered ? '#FFE8A0' : '#D8C8F0';
    this.ctx.fillText(ab.name, x + w / 2, cy + 95);

    this.ctx.font = '7px "Press Start 2P", monospace';
    this.ctx.fillStyle = hovered ? '#C8B8E8' : '#9080B8';
    this.ctx.textAlign = 'center';
    const lines = ab.description.split('\n');
    for (let l = 0; l < lines.length; l++) {
      this.ctx.fillText(lines[l], x + w / 2, cy + 130 + l * 16);
    }

    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.fillStyle = hovered ? '#88FFAA' : '#70A088';
    this.ctx.fillText(`[${keyNum}]`, x + w / 2, cy + h - 20);

    this.ctx.restore();
  }

  private drawLevelComplete(): void {
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(20, 15, 40, 0.6)';
    this.ctx.fillRect(0, 0, canvasW, canvasH);

    this.ctx.font = '24px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.strokeStyle = '#8B6914';
    this.ctx.lineWidth = 3;
    const text = '✦ LEVEL CLEAR! ✦';
    this.ctx.strokeText(text, canvasW / 2, canvasH / 2 - 20);
    this.ctx.fillText(text, canvasW / 2, canvasH / 2 - 20);

    this.ctx.font = '10px "Press Start 2P", monospace';
    this.ctx.fillStyle = '#C8C0E0';
    this.ctx.fillText('按 ENTER 继续下一关', canvasW / 2, canvasH / 2 + 30);
    this.ctx.restore();
  }

  private drawGameOver(): void {
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    this.ctx.save();
    this.ctx.fillStyle = `rgba(10, 0, 0, ${this.failFadeAmount * 0.85})`;
    this.ctx.fillRect(0, 0, canvasW, canvasH);

    if (this.failFadeAmount > 0.6) {
      const alpha = (this.failFadeAmount - 0.6) / 0.4;
      this.ctx.globalAlpha = alpha;
      this.ctx.font = 'bold 120px serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      this.ctx.strokeStyle = '#660000';
      this.ctx.lineWidth = 8;
      this.ctx.strokeText('✕', canvasW / 2, canvasH / 2);

      this.ctx.fillStyle = '#CC2222';
      this.ctx.fillText('✕', canvasW / 2, canvasH / 2);

      this.ctx.font = '14px "Press Start 2P", monospace';
      this.ctx.fillStyle = '#FF8888';
      this.ctx.fillText('GAME OVER', canvasW / 2, canvasH / 2 + 90);

      this.ctx.font = '9px "Press Start 2P", monospace';
      this.ctx.fillStyle = '#CC8888';
      this.ctx.fillText('按 R 重新开始', canvasW / 2, canvasH / 2 + 120);
    }

    this.ctx.restore();
  }
}
