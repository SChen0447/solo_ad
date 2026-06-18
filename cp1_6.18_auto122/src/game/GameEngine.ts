import {
  Tower,
  Enemy,
  Projectile,
  Particle,
  Position,
  GameState,
  WaveConfig,
  TowerType,
  MAX_PARTICLES,
  MAX_WAVES,
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
} from './types';
import { EnemyAI } from './EnemyAI';
import { Tower as TowerClass } from './Tower';
import { audioManager } from '../utils/audioManager';
import { useGameStore } from '../store/gameStore';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private enemyAI: EnemyAI;
  private towerClasses: Map<string, TowerClass> = new Map();
  private animationId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private waveConfig: WaveConfig | null = null;
  private spawnTimer: number = 0;
  private enemiesSpawned: number = 0;
  private screenShakeOffset: Position = { x: 0, y: 0 };
  private fireworks: Particle[] = [];
  private fireworkTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.enemyAI = new EnemyAI(canvas.width, canvas.height);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public reset(): void {
    this.stop();
    this.towerClasses.clear();
    this.waveConfig = null;
    this.spawnTimer = 0;
    this.enemiesSpawned = 0;
    this.fireworks = [];
    this.fireworkTimer = 0;
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.update(deltaTime, currentTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number, currentTime: number): void {
    const state = useGameStore.getState();

    if (state.gameState === 'preparing') {
      state.updatePrepTime(deltaTime);
    }

    if (state.gameState === 'playing') {
      if (!this.waveConfig || state.enemies.length === 0 && this.enemiesSpawned >= (this.waveConfig?.enemyCount || 0)) {
        this.startNextWave();
      }

      if (this.waveConfig && this.enemiesSpawned < this.waveConfig.enemyCount) {
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.waveConfig.spawnInterval) {
          this.spawnTimer = 0;
          this.spawnEnemy();
        }
      }

      this.updateEnemies(deltaTime);
      this.updateTowers(currentTime);
      this.updateProjectiles(deltaTime);
      this.updateParticles(deltaTime);
      this.checkWaveComplete();
    }

    if (state.gameState === 'victory') {
      this.updateFireworks(deltaTime);
      this.updateParticles(deltaTime);
    }

    state.updateComboTimer(deltaTime);
    state.updateScreenShake(deltaTime);
    state.updateAnimations(deltaTime);
    this.updateScreenShakeOffset();
  }

  private startNextWave(): void {
    const state = useGameStore.getState();

    if (state.currentWave > MAX_WAVES) {
      state.setGameState('victory');
      audioManager.playVictory();
      return;
    }

    this.waveConfig = this.enemyAI.generateWaveConfig(state.currentWave);
    this.enemiesSpawned = 0;
    this.spawnTimer = 0;
    state.updateWaveProgress(0, this.waveConfig.enemyCount);
    audioManager.playWaveStart();
  }

  private spawnEnemy(): void {
    const state = useGameStore.getState();
    if (!this.waveConfig) return;

    if (state.enemies.length >= 40) return;

    const enemyType = this.enemyAI.selectEnemyType(this.waveConfig);
    const enemy = this.enemyAI.createEnemy(enemyType, state.currentWave);
    state.addEnemy(enemy);
    this.enemiesSpawned++;
    state.incrementSpawned();
  }

  private updateEnemies(deltaTime: number): void {
    const state = useGameStore.getState();
    const enemiesToRemove: string[] = [];

    for (const enemy of state.enemies) {
      const result = this.enemyAI.updateEnemy(enemy, deltaTime);

      if (result.reachedEnd) {
        enemiesToRemove.push(enemy.id);
        state.takeDamage(enemy.damage);
        audioManager.playDamage();
      } else if (enemy.health <= 0) {
        enemiesToRemove.push(enemy.id);
        state.removeEnemy(enemy.id, true, { ...enemy.position });
        this.createExplosion(enemy.position, 15);
        audioManager.playExplosion();
        audioManager.playGold();
      }
    }

    for (const id of enemiesToRemove) {
      if (state.enemies.find((e) => e.id === id)?.health !== undefined) {
        const enemy = state.enemies.find((e) => e.id === id);
        if (enemy && enemy.health > 0) {
          state.removeEnemy(id, false);
        }
      }
    }
  }

  private updateTowers(currentTime: number): void {
    const state = useGameStore.getState();

    for (const tower of state.towers) {
      let towerClass = this.towerClasses.get(tower.id);
      if (!towerClass) {
        towerClass = new TowerClass(
          tower.type,
          tower.gridX,
          tower.gridY,
          tower.position,
          tower.level
        );
        this.towerClasses.set(tower.id, towerClass);
      }

      const target = towerClass.findTarget(state.enemies);
      if (target && towerClass.canFire(currentTime)) {
        const projectile = towerClass.fire(target, currentTime);
        if (projectile) {
          state.addProjectile(projectile);

          if (tower.type === 'laser') audioManager.playLaser();
          else if (tower.type === 'rocket') audioManager.playRocket();
          else if (tower.type === 'electromagnetic') audioManager.playElectromagnetic();
        }
      }

      const updatedTower = towerClass.getTowerData();
      if (tower.angle !== updatedTower.angle) {
        state.towers.find((t) => t.id === tower.id)!.angle = updatedTower.angle;
      }
    }
  }

  private updateProjectiles(deltaTime: number): void {
    const state = useGameStore.getState();
    const projectilesToRemove: string[] = [];

    for (const projectile of state.projectiles) {
      if (!projectile.isActive) {
        projectilesToRemove.push(projectile.id);
        continue;
      }

      const target = state.enemies.find((e) => e.id === projectile.targetId);
      if (target) {
        projectile.targetPosition = { ...target.position };
      }

      const dx = projectile.targetPosition.x - projectile.position.x;
      const dy = projectile.targetPosition.y - projectile.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        projectilesToRemove.push(projectile.id);

        if (projectile.type === 'rocket') {
          this.handleRocketImpact(projectile);
        } else if (projectile.type === 'electromagnetic') {
          this.handleElectromagneticImpact(projectile);
        } else {
          if (target) {
            state.damageEnemy(target.id, projectile.damage);
            this.createHitEffect(projectile.position, projectile.color);
          }
        }
      } else {
        const moveX = (dx / distance) * projectile.speed * (deltaTime / 16);
        const moveY = (dy / distance) * projectile.speed * (deltaTime / 16);
        projectile.position.x += moveX;
        projectile.position.y += moveY;
      }
    }

    for (const id of projectilesToRemove) {
      state.removeProjectile(id);
    }
  }

  private handleRocketImpact(projectile: Projectile): void {
    const state = useGameStore.getState();
    const explosionRadius = 60;

    for (const enemy of state.enemies) {
      const dx = enemy.position.x - projectile.position.x;
      const dy = enemy.position.y - projectile.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= explosionRadius) {
        const damageMultiplier = 1 - distance / explosionRadius;
        const damage = Math.floor(projectile.damage * damageMultiplier);
        state.damageEnemy(enemy.id, damage);
      }
    }

    this.createExplosion(projectile.position, 20);
    audioManager.playExplosion();
  }

  private handleElectromagneticImpact(projectile: Projectile): void {
    const state = useGameStore.getState();
    const chainCount = 3;
    const chainRange = 80;

    let currentTarget = state.enemies.find((e) => e.id === projectile.targetId);
    if (!currentTarget) return;

    const hitTargets: Set<string> = new Set();
    let currentDamage = projectile.damage;

    for (let i = 0; i < chainCount && currentTarget; i++) {
      state.damageEnemy(currentTarget.id, currentDamage);
      hitTargets.add(currentTarget.id);
      this.createArcEffect(projectile.position, currentTarget.position, projectile.color);

      let nextTarget: Enemy | null = null;
      let minDistance = Infinity;

      for (const enemy of state.enemies) {
        if (hitTargets.has(enemy.id)) continue;

        const dx = enemy.position.x - currentTarget.position.x;
        const dy = enemy.position.y - currentTarget.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= chainRange && distance < minDistance) {
          minDistance = distance;
          nextTarget = enemy;
        }
      }

      if (nextTarget) {
        this.createArcEffect(currentTarget.position, nextTarget.position, projectile.color);
      }

      currentTarget = nextTarget;
      currentDamage = Math.floor(currentDamage * 0.7);
    }

    this.createHitEffect(projectile.position, projectile.color);
  }

  private updateParticles(deltaTime: number): void {
    const state = useGameStore.getState();

    state.particles = state.particles
      .map((p) => ({
        ...p,
        position: {
          x: p.position.x + p.velocity.x * (deltaTime / 16),
          y: p.position.y + p.velocity.y * (deltaTime / 16),
        },
        velocity: {
          x: p.velocity.x * 0.98,
          y: p.velocity.y * 0.98 + 0.1,
        },
        life: p.life - deltaTime,
      }))
      .filter((p) => p.life > 0);
  }

  private updateFireworks(deltaTime: number): void {
    this.fireworkTimer += deltaTime;
    if (this.fireworkTimer >= 500) {
      this.fireworkTimer = 0;
      this.spawnFirework();
    }

    this.fireworks = this.fireworks
      .map((p) => ({
        ...p,
        position: {
          x: p.position.x + p.velocity.x * (deltaTime / 16),
          y: p.position.y + p.velocity.y * (deltaTime / 16),
        },
        velocity: {
          x: p.velocity.x * 0.98,
          y: p.velocity.y * 0.98 + 0.05,
        },
        life: p.life - deltaTime,
      }))
      .filter((p) => p.life > 0);
  }

  private spawnFirework(): void {
    const state = useGameStore.getState();
    const x = Math.random() * this.canvas.width;
    const y = this.canvas.height + 50;

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffeaa7', '#dfe6e9', '#a29bfe', '#fd79a8'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2 + Math.random() * 3;

      const particle: Particle = {
        id: generateId(),
        position: { x, y: this.canvas.height * 0.3 + Math.random() * this.canvas.height * 0.4 },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        color,
        size: 3 + Math.random() * 2,
        life: 1000 + Math.random() * 500,
        maxLife: 1500,
      };

      this.fireworks.push(particle);
      state.addParticle(particle);
    }
  }

  private updateScreenShakeOffset(): void {
    const state = useGameStore.getState();
    if (state.screenShake.duration > 0) {
      const intensity = state.screenShake.intensity;
      this.screenShakeOffset.x = (Math.random() - 0.5) * intensity * 2;
      this.screenShakeOffset.y = (Math.random() - 0.5) * intensity * 2;
    } else {
      this.screenShakeOffset = { x: 0, y: 0 };
    }
  }

  private createExplosion(position: Position, count: number): void {
    const state = useGameStore.getState();
    const colors = ['#ff6b6b', '#ffa502', '#ff4757', '#ffd700', '#fff'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;

      const particle: Particle = {
        id: generateId(),
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
        life: 500 + Math.random() * 500,
        maxLife: 1000,
      };

      state.addParticle(particle);
    }
  }

  private createHitEffect(position: Position, color: string): void {
    const state = useGameStore.getState();

    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;

      const particle: Particle = {
        id: generateId(),
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        color,
        size: 2 + Math.random() * 2,
        life: 300 + Math.random() * 200,
        maxLife: 500,
      };

      state.addParticle(particle);
    }
  }

  private createArcEffect(from: Position, to: Position, color: string): void {
    const state = useGameStore.getState();
    const segments = 8;

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * 20;

      const particle: Particle = {
        id: generateId(),
        position: { x, y },
        velocity: { x: 0, y: 0 },
        color,
        size: 3,
        life: 200,
        maxLife: 200,
      };

      state.addParticle(particle);
    }
  }

  private checkWaveComplete(): void {
    const state = useGameStore.getState();

    if (
      this.waveConfig &&
      this.enemiesSpawned >= this.waveConfig.enemyCount &&
      state.enemies.length === 0
    ) {
      if (state.currentWave >= MAX_WAVES) {
        state.setGameState('victory');
        audioManager.playVictory();
      } else {
        state.nextWave();
        this.waveConfig = null;
        this.enemyAI.generateMultiplePaths(5);
      }
    }
  }

  private render(): void {
    const state = useGameStore.getState();

    this.ctx.save();
    this.ctx.translate(this.screenShakeOffset.x, this.screenShakeOffset.y);

    this.ctx.fillStyle = '#0a0e27';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();
    this.drawPaths();

    for (const tower of state.towers) {
      this.drawTower(tower);
    }

    if (state.selectedTower) {
      const tower = state.towers.find((t) => t.id === state.selectedTower);
      if (tower) {
        this.drawTowerRange(tower);
      }
    }

    if (state.hoveredCell && !state.grid[state.hoveredCell.y]?.[state.hoveredCell.x]?.isOccupied) {
      this.drawHoverCell(state.hoveredCell.x, state.hoveredCell.y);
    }

    for (const enemy of state.enemies) {
      this.drawEnemy(enemy);
    }

    for (const projectile of state.projectiles) {
      this.drawProjectile(projectile);
    }

    for (const particle of state.particles) {
      this.drawParticle(particle);
    }

    for (const ft of state.floatingTexts) {
      this.drawFloatingText(ft);
    }

    if (state.selectedCell) {
      this.drawSelectedCell(state.selectedCell.x, state.selectedCell.y);
    }

    this.ctx.restore();
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(79, 195, 247, 0.1)';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= GRID_COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * CELL_SIZE, 0);
      this.ctx.lineTo(x * CELL_SIZE, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= GRID_ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * CELL_SIZE);
      this.ctx.lineTo(this.canvas.width, y * CELL_SIZE);
      this.ctx.stroke();
    }
  }

  private drawPaths(): void {
    const paths = this.enemyAI['paths'];
    if (!paths) return;

    for (const path of paths) {
      this.ctx.strokeStyle = 'rgba(79, 195, 247, 0.05)';
      this.ctx.lineWidth = 20;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();
      this.ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        this.ctx.lineTo(path[i].x, path[i].y);
      }
      this.ctx.stroke();
    }
  }

  private drawTower(tower: Tower): void {
    const { x, y } = tower.position;
    const color = this.getTowerColor(tower.type);

    this.ctx.save();
    this.ctx.translate(x, y);

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.save();
    this.ctx.rotate(tower.angle);

    this.ctx.fillStyle = color;
    if (tower.type === 'laser') {
      this.ctx.fillRect(0, -3, 25, 6);
    } else if (tower.type === 'rocket') {
      this.ctx.fillRect(0, -5, 20, 10);
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(15, -3, 5, 6);
    } else {
      this.ctx.fillRect(0, -4, 18, 8);
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(18, 0, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();

    for (let i = 0; i < tower.level; i++) {
      this.ctx.fillStyle = '#ffd700';
      this.ctx.beginPath();
      this.ctx.arc(-12 + i * 8, -18, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawTowerRange(tower: Tower): void {
    this.ctx.strokeStyle = this.getTowerColor(tower.type) + '40';
    this.ctx.fillStyle = this.getTowerColor(tower.type) + '10';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(tower.position.x, tower.position.y, tower.range, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
  }

  private drawHoverCell(gridX: number, gridY: number): void {
    const x = gridX * CELL_SIZE;
    const y = gridY * CELL_SIZE;

    this.ctx.fillStyle = 'rgba(79, 195, 247, 0.2)';
    this.ctx.strokeStyle = '#4fc3f7';
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    this.ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  private drawSelectedCell(gridX: number, gridY: number): void {
    const x = gridX * CELL_SIZE;
    const y = gridY * CELL_SIZE;

    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  private drawEnemy(enemy: Enemy): void {
    const { x, y } = enemy.position;
    const size = enemy.type === 'heavy' ? 22 : enemy.type === 'elite' ? 18 : 14;
    const color = this.getEnemyColor(enemy.type);

    this.ctx.save();
    this.ctx.translate(x, y);

    this.ctx.fillStyle = color;

    if (enemy.type === 'scout') {
      this.ctx.beginPath();
      this.ctx.moveTo(-size, 0);
      this.ctx.lineTo(size * 0.5, -size * 0.7);
      this.ctx.lineTo(size * 0.5, size * 0.7);
      this.ctx.closePath();
      this.ctx.fill();
    } else if (enemy.type === 'heavy') {
      this.ctx.fillRect(-size * 0.8, -size * 0.6, size * 1.6, size * 1.2);
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(-size, 0);
      this.ctx.lineTo(0, -size);
      this.ctx.lineTo(size, 0);
      this.ctx.lineTo(0, size);
      this.ctx.closePath();
      this.ctx.fill();

      if (enemy.hasShield && enemy.shieldHealth > 0) {
        this.ctx.strokeStyle = '#7c4dff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size + 5, 0, Math.PI * 2);
        this.ctx.stroke();

        const shieldPercent = enemy.shieldHealth / enemy.maxShieldHealth;
        this.ctx.fillStyle = '#7c4dff';
        this.ctx.fillRect(-size, -size - 12, size * 2 * shieldPercent, 4);
      }
    }

    this.ctx.restore();

    const healthPercent = enemy.health / enemy.maxHealth;
    const barWidth = size * 2;
    const barHeight = 4;
    const barY = y - size - 8;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);

    const gradient = this.ctx.createLinearGradient(
      x - barWidth / 2,
      barY,
      x + barWidth / 2,
      barY
    );
    gradient.addColorStop(0, '#66bb6a');
    gradient.addColorStop(1, '#81c784');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
  }

  private drawProjectile(projectile: Projectile): void {
    const { x, y } = projectile.position;

    if (projectile.type === 'laser') {
      this.ctx.strokeStyle = projectile.color;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = projectile.color;
      this.ctx.shadowBlur = 10;

      const dx = projectile.targetPosition.x - x;
      const dy = projectile.targetPosition.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const length = Math.min(30, dist);
      const nx = dx / dist;
      const ny = dy / dist;

      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + nx * length, y + ny * length);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    } else if (projectile.type === 'rocket') {
      this.ctx.fillStyle = projectile.color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffa502';
      this.ctx.beginPath();
      this.ctx.arc(x - 5, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = projectile.color;
      this.ctx.shadowColor = projectile.color;
      this.ctx.shadowBlur = 15;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  private drawParticle(particle: