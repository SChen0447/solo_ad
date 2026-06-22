import { PlayerController, PLAYER_CONFIG } from '../player/PlayerController';
import { getEnemyDecision, EnemyData, EnemyDecision, LevelData, EnemySpawn } from '../services/api';

export interface EnemyRenderData extends EnemyData {
  config: {
    moveSpeed: number;
    width: number;
    height: number;
    color: string;
  };
  knockbackVelocity: number;
  hitFlashTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface AttackEffect {
  x: number;
  y: number;
  angle: number;
  life: number;
  maxLife: number;
  facingRight: boolean;
}

export type CombatEventType = 'hit' | 'hurt' | 'kill';

export interface CombatEvent {
  id: number;
  type: CombatEventType;
  message: string;
  timestamp: number;
}

interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  currentLevel: number;
  currentWave: number;
  waveTimer: number;
  waveSpawned: boolean;
  comboCount: number;
  comboTimer: number;
  comboScale: number;
  slowMotion: boolean;
  slowMotionTimer: number;
  screenFlash: number;
  victoryTimer: number;
  showVictory: boolean;
  levelComplete: boolean;
  gameOver: boolean;
}

const ENEMY_CONFIGS = {
  grunt: {
    width: 40,
    height: 56,
    color: '#6c5ce7',
    moveSpeed: 100,
    maxHealth: 50
  },
  elite: {
    width: 56,
    height: 72,
    color: '#e17055',
    moveSpeed: 80,
    maxHealth: 150
  }
};

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: PlayerController;
  private enemies: EnemyRenderData[] = [];
  private particles: Particle[] = [];
  private attackEffects: AttackEffect[] = [];
  private combatEvents: CombatEvent[] = [];
  private eventIdCounter = 0;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private frameTime: number = 1000 / 60;
  private accumulator: number = 0;
  private levelData: LevelData | null = null;
  private pendingDecisions: Promise<Record<string, EnemyDecision>> | null = null;

  private gameState: GameState = {
    isRunning: false,
    isPaused: false,
    currentLevel: 1,
    currentWave: 0,
    waveTimer: 0,
    waveSpawned: false,
    comboCount: 0,
    comboTimer: 0,
    comboScale: 1,
    slowMotion: false,
    slowMotionTimer: 0,
    screenFlash: 0,
    victoryTimer: 0,
    showVictory: false,
    levelComplete: false,
    gameOver: false
  };

  private onCombatEventCallback: ((events: CombatEvent[]) => void) | null = null;
  private onStateChangeCallback: ((state: {
    playerHealth: number;
    playerMaxHealth: number;
    comboCount: number;
    comboScale: number;
    showVictory: boolean;
    levelComplete: boolean;
    gameOver: boolean;
    currentWave: number;
    totalWaves: number;
  }) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = new PlayerController();

    this.player.setOnAttackCallback((event) => {
      this.handlePlayerAttack(event);
    });
  }

  public setLevelData(levelData: LevelData): void {
    this.levelData = levelData;
    this.gameState.currentWave = 0;
    this.gameState.waveTimer = 0;
    this.gameState.waveSpawned = false;
    this.gameState.levelComplete = false;
    this.enemies = [];
    this.player.reset();
  }

  public start(): void {
    this.gameState.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    this.gameState.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public reset(): void {
    this.enemies = [];
    this.particles = [];
    this.attackEffects = [];
    this.combatEvents = [];
    this.player.reset();
    this.gameState = {
      isRunning: this.gameState.isRunning,
      isPaused: false,
      currentLevel: 1,
      currentWave: 0,
      waveTimer: 0,
      waveSpawned: false,
      comboCount: 0,
      comboTimer: 0,
      comboScale: 1,
      slowMotion: false,
      slowMotionTimer: 0,
      screenFlash: 0,
      victoryTimer: 0,
      showVictory: false,
      levelComplete: false,
      gameOver: false
    };
  }

  private gameLoop = (): void => {
    if (!this.gameState.isRunning) return;

    const now = performance.now();
    let deltaTime = now - this.lastTime;
    this.lastTime = now;

    if (deltaTime > 100) deltaTime = 100;

    const timeScale = this.gameState.slowMotion ? 0.3 : 1;
    const scaledDelta = deltaTime * timeScale;

    this.accumulator += scaledDelta;

    while (this.accumulator >= this.frameTime) {
      this.update(this.frameTime);
      this.accumulator -= this.frameTime;
    }

    this.render();
    this.notifyStateChange();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    if (this.gameState.isPaused || this.gameState.gameOver) return;

    if (this.gameState.showVictory) {
      this.gameState.victoryTimer -= deltaTime;
      if (this.gameState.victoryTimer <= 0) {
        this.gameState.showVictory = false;
        this.gameState.levelComplete = true;
      }
      return;
    }

    if (this.gameState.slowMotion) {
      this.gameState.slowMotionTimer -= deltaTime;
      if (this.gameState.slowMotionTimer <= 0) {
        this.gameState.slowMotion = false;
      }
    }

    if (this.gameState.screenFlash > 0) {
      this.gameState.screenFlash -= deltaTime;
    }

    if (this.gameState.comboTimer > 0) {
      this.gameState.comboTimer -= deltaTime;
      if (this.gameState.comboTimer <= 0) {
        this.gameState.comboCount = 0;
      }
    }

    if (this.gameState.comboScale > 1) {
      this.gameState.comboScale = Math.max(1, this.gameState.comboScale - deltaTime / 300);
    }

    this.player.update(deltaTime);

    this.updateEnemies(deltaTime);

    this.updateWaveSystem(deltaTime);

    this.updateParticles(deltaTime);

    this.updateAttackEffects(deltaTime);

    this.checkPlayerEnemyCollisions();

    this.checkVictoryCondition();

    if (this.player.getState().health <= 0) {
      this.gameState.gameOver = true;
    }

    this.requestAIDecisions(deltaTime);
  }

  private updateEnemies(deltaTime: number): void {
    for (const enemy of this.enemies) {
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= deltaTime;
      }

      if (Math.abs(enemy.knockbackVelocity) > 0) {
        enemy.x += (enemy.knockbackVelocity * deltaTime) / 1000;
        enemy.knockbackVelocity *= 0.9;
        if (Math.abs(enemy.knockbackVelocity) < 1) {
          enemy.knockbackVelocity = 0;
        }
      }

      enemy.x = Math.max(0, Math.min(PLAYER_CONFIG.canvasWidth - enemy.config.width, enemy.x));
    }
  }

  private updateWaveSystem(deltaTime: number): void {
    if (!this.levelData) return;

    if (!this.gameState.waveSpawned) {
      this.gameState.waveTimer += deltaTime;

      const currentWaveData = this.levelData.waves[this.gameState.currentWave];
      if (currentWaveData && this.gameState.waveTimer >= currentWaveData.delay) {
        this.spawnWave(currentWaveData.enemies);
        this.gameState.waveSpawned = true;
        this.gameState.waveTimer = 0;
      }
    } else if (this.enemies.length === 0) {
      this.gameState.waveTimer += deltaTime;

      if (this.gameState.waveTimer >= this.levelData.waveInterval) {
        this.gameState.currentWave++;
        if (this.gameState.currentWave >= this.levelData.waves.length) {
          this.triggerVictory();
        } else {
          this.gameState.waveSpawned = false;
          this.gameState.waveTimer = 0;
        }
      }
    }
  }

  private spawnWave(enemySpawns: EnemySpawn[]): void {
    for (const spawn of enemySpawns) {
      const config = ENEMY_CONFIGS[spawn.type];
      const enemy: EnemyRenderData = {
        id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: spawn.type,
        x: spawn.x,
        y: PLAYER_CONFIG.groundY - config.height,
        health: config.maxHealth,
        maxHealth: config.maxHealth,
        state: 'patrol',
        lastAttackTime: 0,
        lastSkillTime: 0,
        config: {
          moveSpeed: config.moveSpeed,
          width: config.width,
          height: config.height,
          color: config.color
        },
        knockbackVelocity: 0,
        hitFlashTimer: 0
      };
      this.enemies.push(enemy);
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += (p.vx * deltaTime) / 1000;
      p.y += (p.vy * deltaTime) / 1000;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateAttackEffects(deltaTime: number): void {
    for (let i = this.attackEffects.length - 1; i >= 0; i--) {
      const effect = this.attackEffects[i];
      effect.life -= deltaTime;

      if (effect.life <= 0) {
        this.attackEffects.splice(i, 1);
      }
    }
  }

  private handlePlayerAttack(event: {
    damage: number;
    knockback: number;
    isThirdHit: boolean;
    hitbox: { x: number; y: number; width: number; height: number };
  }): void {
    const playerState = this.player.getState();

    const effectX = playerState.facingRight
      ? playerState.x + PLAYER_CONFIG.width
      : playerState.x;

    this.attackEffects.push({
      x: effectX,
      y: playerState.y + PLAYER_CONFIG.height / 2,
      angle: playerState.facingRight ? 0 : Math.PI,
      life: 150,
      maxLife: 150,
      facingRight: playerState.facingRight
    });

    let hitElite = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (this.checkCollision(
        event.hitbox.x, event.hitbox.y,
        event.hitbox.width, event.hitbox.height,
        enemy.x, enemy.y,
        enemy.config.width, enemy.config.height
      )) {
        enemy.health -= event.damage;
        enemy.hitFlashTimer = 100;
        enemy.knockbackVelocity = playerState.facingRight ? event.knockback : -event.knockback;

        this.spawnHitParticles(
          enemy.x + enemy.config.width / 2,
          enemy.y + enemy.config.height / 2
        );

        this.addCombatEvent('hit', `Hit ${enemy.type} for ${event.damage} damage!`);

        this.gameState.comboCount++;
        this.gameState.comboTimer = 5000;
        if (this.gameState.comboCount > 10) {
          this.gameState.comboScale = 1.2;
        }

        if (event.isThirdHit && enemy.type === 'elite') {
          hitElite = true;
        }

        if (enemy.health <= 0) {
          this.addCombatEvent('kill', `Killed ${enemy.type}!`);
          this.enemies.splice(i, 1);
        }
      }
    }

    if (hitElite) {
      this.gameState.slowMotion = true;
      this.gameState.slowMotionTimer = 500;
      this.gameState.screenFlash = 800;
    }
  }

  private checkCollision(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return x1 < x2 + w2 &&
      x1 + w1 > x2 &&
      y1 < y2 + h2 &&
      y1 + h1 > y2;
  }

  private spawnHitParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 100 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 300,
        maxLife: 300,
        size: 4,
        color: '#fbbf24'
      });
    }
  }

  private checkPlayerEnemyCollisions(): void {
    const playerState = this.player.getState();

    for (const enemy of this.enemies) {
      if (this.checkCollision(
        playerState.x, playerState.y,
        PLAYER_CONFIG.width, PLAYER_CONFIG.height,
        enemy.x, enemy.y,
        enemy.config.width, enemy.config.height
      )) {
        if (enemy.state === 'attack') {
          const now = performance.now();
          const attackInterval = enemy.type === 'grunt' ? 2000 : 1500;
          if (now - enemy.lastAttackTime >= attackInterval) {
            const damage = enemy.type === 'grunt' ? 8 : 12;
            this.player.takeDamage(damage);
            this.addCombatEvent('hurt', `Took ${damage} damage from ${enemy.type}!`);
            enemy.lastAttackTime = now;
          }
        }
      }
    }
  }

  private checkVictoryCondition(): void {
    if (!this.levelData) return;

    if (this.enemies.length === 0 &&
      this.gameState.waveSpawned &&
      this.gameState.currentWave >= this.levelData.waves.length - 1) {
      this.triggerVictory();
    }
  }

  private triggerVictory(): void {
    if (!this.gameState.showVictory) {
      this.gameState.showVictory = true;
      this.gameState.victoryTimer = 3000;
    }
  }

  private async requestAIDecisions(deltaTime: number): Promise<void> {
    if (this.pendingDecisions || this.enemies.length === 0) return;

    const playerState = this.player.getState();
    const currentTime = performance.now();

    const playerStateForAI = {
      x: playerState.x,
      y: playerState.y,
      health: playerState.health,
      maxHealth: playerState.maxHealth,
      isAttacking: playerState.isAttacking,
      facingRight: playerState.facingRight
    };

    this.aiRequestTime = currentTime;
    this.pendingDecisions = getEnemyDecision(
      playerStateForAI,
      this.enemies,
      deltaTime,
      currentTime
    );

    try {
      const decisions = await this.pendingDecisions;

      for (const enemy of this.enemies) {
        const decision = decisions[enemy.id];
        if (decision) {
          enemy.state = decision.newState;

          if (decision.moveDirection !== 0) {
            enemy.x += (decision.moveDirection * enemy.config.moveSpeed * deltaTime) / 1000;
          }

          if (decision.attackIntent) {
            enemy.lastAttackTime = performance.now();
          }

          if (decision.skillIntent) {
            enemy.lastSkillTime = performance.now();
            if (decision.skillRadius > 0) {
              const dist = Math.abs(enemy.x - playerState.x);
              if (dist <= decision.skillRadius && !playerState.isInvincible) {
                this.player.takeDamage(decision.skillDamage);
                this.addCombatEvent('hurt', `Took ${decision.skillDamage} AOE damage from ${enemy.type}!`);
              }
            }
          }
        }
      }
    } catch (e) {
      // Silent fail for AI decisions
    } finally {
      this.pendingDecisions = null;
    }
  }

  private addCombatEvent(type: CombatEventType, message: string): void {
    const event: CombatEvent = {
      id: this.eventIdCounter++,
      type,
      message,
      timestamp: performance.now()
    };

    this.combatEvents.unshift(event);
    if (this.combatEvents.length > 20) {
      this.combatEvents.pop();
    }

    if (this.onCombatEventCallback) {
      this.onCombatEventCallback([...this.combatEvents]);
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    this.renderTerrain();
    this.renderAttackEffects();
    this.renderEnemies();
    this.renderPlayer();
    this.renderParticles();
    this.renderScreenFlash();
    this.renderVictory();
  }

  private renderTerrain(): void {
    const ctx = this.ctx;
    const groundY = PLAYER_CONFIG.groundY;
    const groundHeight = 40;

    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, groundY, PLAYER_CONFIG.canvasWidth, groundHeight);

    ctx.fillStyle = '#3a3a3a';
    for (let i = 0; i < 50; i++) {
      const x = (i * 13 + 5) % PLAYER_CONFIG.canvasWidth;
      const y = groundY + ((i * 7) % groundHeight);
      const size = 2 + (i % 4);
      ctx.fillRect(x, y, size, size);
    }
  }

  private renderPlayer(): void {
    const ctx = this.ctx;
    const state = this.player.getState();

    ctx.save();

    if (state.hitFlashTimer > 0) {
      ctx.fillStyle = state.hitFlashColor === 'white' ? '#ffffff' : '#ff0000';
    } else if (state.isInvincible && Math.floor(performance.now() / 100) % 2 === 0) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = PLAYER_CONFIG.playerColor;
    } else {
      ctx.fillStyle = PLAYER_CONFIG.playerColor;
    }

    if (state.isAttacking) {
      ctx.save();
      const centerX = state.x + PLAYER_CONFIG.width / 2;
      const centerY = state.y + PLAYER_CONFIG.height / 2;
      ctx.translate(centerX, centerY);
      const rotation = (state.facingRight ? 1 : -1) * (state.attackRotation * Math.PI / 8);
      ctx.rotate(rotation);
      ctx.fillRect(-PLAYER_CONFIG.width / 2, -PLAYER_CONFIG.height / 2, PLAYER_CONFIG.width, PLAYER_CONFIG.height);
      ctx.restore();
    } else {
      ctx.fillRect(state.x, state.y, PLAYER_CONFIG.width, PLAYER_CONFIG.height);
    }

    ctx.fillStyle = '#ffffff';
    const eyeX = state.facingRight ? state.x + PLAYER_CONFIG.width - 12 : state.x + 8;
    ctx.fillRect(eyeX, state.y + 16, 4, 4);

    ctx.restore();
  }

  private renderEnemies(): void {
    const ctx = this.ctx;

    for (const enemy of this.enemies) {
      ctx.save();

      if (enemy.hitFlashTimer > 0) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = enemy.config.color;
      }

      ctx.fillRect(enemy.x, enemy.y, enemy.config.width, enemy.config.height);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(enemy.x + 8, enemy.y + 12, 4, 4);
      ctx.fillRect(enemy.x + enemy.config.width - 12, enemy.y + 12, 4, 4);

      const healthBarWidth = enemy.config.width;
      const healthBarHeight = 4;
      const healthPercent = enemy.health / enemy.maxHealth;

      ctx.fillStyle = '#333333';
      ctx.fillRect(enemy.x, enemy.y - 8, healthBarWidth, healthBarHeight);

      ctx.fillStyle = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(enemy.x, enemy.y - 8, healthBarWidth * healthPercent, healthBarHeight);

      if (enemy.state === 'attack') {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.x - 2, enemy.y - 2, enemy.config.width + 4, enemy.config.height + 4);
      }

      ctx.restore();
    }
  }

  private renderAttackEffects(): void {
    const ctx = this.ctx;

    for (const effect of this.attackEffects) {
      const alpha = effect.life / effect.maxLife;
      const scale = 1 + (1 - alpha) * 0.5;

      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate(effect.angle);
      ctx.globalAlpha = alpha * 0.6;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 60 * scale, -Math.PI / 3, Math.PI / 3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private renderScreenFlash(): void {
    if (this.gameState.screenFlash <= 0) return;

    const ctx = this.ctx;
    const alpha = Math.min(0.2, this.gameState.screenFlash / 800 * 0.2);

    const gradient = ctx.createRadialGradient(
      PLAYER_CONFIG.canvasWidth / 2, PLAYER_CONFIG.canvasHeight / 2, 0,
      PLAYER_CONFIG.canvasWidth / 2, PLAYER_CONFIG.canvasHeight / 2, 400
    );
    gradient.addColorStop(0, `rgba(255, 0, 0, 0)`);
    gradient.addColorStop(1, `rgba(255, 0, 0, ${alpha})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, PLAYER_CONFIG.canvasWidth, PLAYER_CONFIG.canvasHeight);
  }

  private renderVictory(): void {
    if (!this.gameState.showVictory) return;

    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, PLAYER_CONFIG.canvasWidth, PLAYER_CONFIG.canvasHeight);

    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeText('VICTORY', PLAYER_CONFIG.canvasWidth / 2, PLAYER_CONFIG.canvasHeight / 2);

    ctx.fillStyle = '#ffd700';
    ctx.fillText('VICTORY', PLAYER_CONFIG.canvasWidth / 2, PLAYER_CONFIG.canvasHeight / 2);
  }

  private notifyStateChange(): void {
    if (!this.onStateChangeCallback) return;

    const playerState = this.player.getState();
    this.onStateChangeCallback({
      playerHealth: playerState.health,
      playerMaxHealth: playerState.maxHealth,
      comboCount: this.gameState.comboCount,
      comboScale: this.gameState.comboScale,
      showVictory: this.gameState.showVictory,
      levelComplete: this.gameState.levelComplete,
      gameOver: this.gameState.gameOver,
      currentWave: this.gameState.currentWave + 1,
      totalWaves: this.levelData?.waves.length || 0
    });
  }

  public setOnCombatEventCallback(callback: (events: CombatEvent[]) => void): void {
    this.onCombatEventCallback = callback;
  }

  public setOnStateChangeCallback(callback: (state: {
    playerHealth: number;
    playerMaxHealth: number;
    comboCount: number;
    comboScale: number;
    showVictory: boolean;
    levelComplete: boolean;
    gameOver: boolean;
    currentWave: number;
    totalWaves: number;
  }) => void): void {
    this.onStateChangeCallback = callback;
  }

  public getCombatEvents(): CombatEvent[] {
    return [...this.combatEvents];
  }

  public getPlayerHealth(): { current: number; max: number } {
    const state = this.player.getState();
    return { current: state.health, max: state.maxHealth };
  }

  public destroy(): void {
    this.stop();
    this.player.destroy();
  }
}
