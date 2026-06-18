import { InputParser, type GameAction, type DeployParams, type UpgradeParams, type MoveParams, type SellParams } from './InputParser';
import { EntityManager, type Tower, type Enemy, type Bullet } from './EntityManager';
import { AISystem } from './AISystem';

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
}

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  timestamp: number;
}

export class GameEngine {
  private entityManager: EntityManager;
  private aiSystem: AISystem;
  private state: GameState;
  private notifications: Notification[] = [];
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private gridCellSize: number = 40;
  private gridCols: number = 0;
  private gridRows: number = 0;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private notificationIdCounter: number = 0;
  private onStateChange?: (state: GameState) => void;
  private onNotification?: (notification: Notification) => void;
  private onRender?: () => void;

  constructor(
    entityManager: EntityManager,
    aiSystem: AISystem
  ) {
    this.entityManager = entityManager;
    this.aiSystem = aiSystem;
    this.state = {
      gold: 100,
      lives: 20,
      wave: 0,
      isPlaying: false,
      isPaused: false,
      isGameOver: false
    };
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.gridCols = Math.floor(width / this.gridCellSize);
    this.gridRows = Math.floor(height / this.gridCellSize);
    this.aiSystem.setGridDimensions(width, height, this.gridCellSize);
  }

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  setOnNotification(callback: (notification: Notification) => void): void {
    this.onNotification = callback;
  }

  setOnRender(callback: () => void): void {
    this.onRender = callback;
  }

  getState(): GameState {
    return { ...this.state };
  }

  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  getAISystem(): AISystem {
    return this.aiSystem;
  }

  getGridCellSize(): number {
    return this.gridCellSize;
  }

  getGridCols(): number {
    return this.gridCols;
  }

  getGridRows(): number {
    return this.gridRows;
  }

  getCanvasWidth(): number {
    return this.canvasWidth;
  }

  getCanvasHeight(): number {
    return this.canvasHeight;
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  start(): void {
    if (this.animationFrameId !== null) return;
    this.state.isPlaying = true;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
    this.notifyStateChange();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.state.isPlaying = false;
    this.notifyStateChange();
  }

  private gameLoop = (currentTime: number): void => {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (!this.state.isPaused && !this.state.isGameOver) {
      this.update(deltaTime, currentTime);
    }

    if (this.onRender) {
      this.onRender();
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number, currentTime: number): void {
    this.aiSystem.update(deltaTime, currentTime);
    this.updateTowers(currentTime);
    this.updateBullets(deltaTime);
    this.updateParticles(deltaTime);
    this.checkEnemiesReachedEnd();
    this.cleanupNotifications(currentTime);
    this.updateWaveState();
  }

  private updateTowers(currentTime: number): void {
    for (const tower of this.entityManager.towers.values()) {
      if (currentTime - tower.lastAttackTime >= tower.attackInterval) {
        const target = this.findTarget(tower);
        if (target) {
          this.fireTower(tower, target);
          tower.lastAttackTime = currentTime;
        }
      }
    }
  }

  private findTarget(tower: Tower): Enemy | null {
    const towerX = (tower.gridX + 0.5) * this.gridCellSize;
    const towerY = (tower.gridY + 0.5) * this.gridCellSize;
    let closestEnemy: Enemy | null = null;
    let closestProgress = -1;

    for (const enemy of this.entityManager.enemies.values()) {
      const dx = enemy.x - towerX;
      const dy = enemy.y - towerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= tower.range) {
        const progress = enemy.pathIndex * 1000 + (1000 - distance);
        if (progress > closestProgress) {
          closestProgress = progress;
          closestEnemy = enemy;
        }
      }
    }

    return closestEnemy;
  }

  private fireTower(tower: Tower, target: Enemy): void {
    const towerX = (tower.gridX + 0.5) * this.gridCellSize;
    const towerY = (tower.gridY + 0.5) * this.gridCellSize;

    this.entityManager.createBullet(
      towerX,
      towerY,
      target.id,
      tower.damage,
      tower.type,
      tower.splashRadius,
      tower.slowFactor,
      tower.slowDuration
    );
  }

  private updateBullets(deltaTime: number): void {
    const bulletsToRemove: string[] = [];

    for (const bullet of this.entityManager.bullets.values()) {
      const target = this.entityManager.enemies.get(bullet.targetId);

      if (!target) {
        bulletsToRemove.push(bullet.id);
        continue;
      }

      const dx = target.x - bullet.x;
      const dy = target.y - bullet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        this.handleBulletHit(bullet, target);
        bulletsToRemove.push(bullet.id);
      } else {
        const speed = bullet.speed * deltaTime;
        const moveX = (dx / distance) * speed;
        const moveY = (dy / distance) * speed;
        bullet.x += moveX;
        bullet.y += moveY;
      }
    }

    for (const id of bulletsToRemove) {
      this.entityManager.removeBullet(id);
    }
  }

  private handleBulletHit(bullet: Bullet, target: Enemy): void {
    if (bullet.splashRadius && bullet.splashRadius > 0) {
      this.applySplashDamage(bullet, target);
    } else {
      this.damageEnemy(target, bullet.damage);
    }

    if (bullet.slowFactor !== undefined && bullet.slowDuration !== undefined) {
      this.applySlowEffect(target, bullet.slowFactor, bullet.slowDuration);
    }
  }

  private applySplashDamage(bullet: Bullet, primaryTarget: Enemy): void {
    for (const enemy of this.entityManager.enemies.values()) {
      const dx = enemy.x - primaryTarget.x;
      const dy = enemy.y - primaryTarget.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= (bullet.splashRadius || 0)) {
        const damageFactor = 1 - (distance / (bullet.splashRadius || 1)) * 0.5;
        this.damageEnemy(enemy, bullet.damage * damageFactor);
      }
    }

    this.entityManager.createExplosion(
      primaryTarget.x,
      primaryTarget.y,
      '#ff6b35',
      20
    );
  }

  private applySlowEffect(enemy: Enemy, slowFactor: number, duration: number): void {
    enemy.slowFactor = slowFactor;
    enemy.slowTimer = duration;
    enemy.speed = enemy.baseSpeed * slowFactor;
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    enemy.health -= damage;

    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy): void {
    const config = this.entityManager.getEnemyConfig(enemy.type);
    this.state.gold += enemy.reward;
    this.entityManager.createExplosion(enemy.x, enemy.y, config.color, 15);
    this.entityManager.removeEnemy(enemy.id);
    this.notifyStateChange();
  }

  private updateParticles(deltaTime: number): void {
    const particlesToRemove: string[] = [];

    for (const particle of this.entityManager.particles.values()) {
      particle.life -= deltaTime;
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vx *= 0.98;
      particle.vy *= 0.98;

      if (particle.life <= 0) {
        particlesToRemove.push(particle.id);
      }
    }

    for (const id of particlesToRemove) {
      this.entityManager.removeParticle(id);
    }
  }

  private checkEnemiesReachedEnd(): void {
    const enemiesToRemove: string[] = [];

    for (const enemy of this.entityManager.enemies.values()) {
      if (this.aiSystem.isEnemyAtEnd(enemy)) {
        enemiesToRemove.push(enemy.id);
        this.state.lives--;

        if (this.state.lives <= 0) {
          this.state.lives = 0;
          this.state.isGameOver = true;
          this.addNotification('Game Over! You lost all lives.', 'error');
        }
      }
    }

    for (const id of enemiesToRemove) {
      this.entityManager.removeEnemy(id);
    }

    if (enemiesToRemove.length > 0) {
      this.notifyStateChange();
    }
  }

  private updateWaveState(): void {
    const currentWave = this.aiSystem.getCurrentWave();
    if (currentWave !== this.state.wave) {
      this.state.wave = currentWave;
      this.notifyStateChange();
    }
  }

  executeAction(action: GameAction): void {
    if (this.state.isGameOver && action.type !== 'help' && action.type !== 'status') {
      this.addNotification('Game Over! Restart to play again.', 'error');
      return;
    }

    try {
      switch (action.type) {
        case 'deploy':
          this.handleDeploy(action.params);
          break;
        case 'upgrade':
          this.handleUpgrade(action.params);
          break;
        case 'move':
          this.handleMove(action.params);
          break;
        case 'sell':
          this.handleSell(action.params);
          break;
        case 'startWave':
          this.handleStartWave();
          break;
        case 'help':
          this.handleHelp();
          break;
        case 'status':
          this.handleStatus();
          break;
        default:
          this.addNotification('Unknown action', 'error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.addNotification(message, 'error');
    }
  }

  private handleDeploy(params: DeployParams): void {
    const { towerType, x, y } = params;

    if (x < 0 || x >= this.gridCols || y < 0 || y >= this.gridRows) {
      throw new Error(`Position (${x}, ${y}) is out of bounds. Grid size: ${this.gridCols}x${this.gridRows}`);
    }

    if (this.isOnPath(x, y)) {
      throw new Error(`Cannot build on the path at (${x}, ${y})`);
    }

    const existingTower = this.entityManager.getTowerAt(x, y);
    if (existingTower) {
      throw new Error(`Tower already exists at (${x}, ${y})`);
    }

    const config = this.entityManager.getTowerBaseConfig(towerType);
    if (this.state.gold < config.cost) {
      throw new Error(`Not enough gold! Need ${config.cost}, have ${this.state.gold}`);
    }

    this.state.gold -= config.cost;
    this.entityManager.createTower(towerType, x, y);
    this.addNotification(`${towerType} tower deployed at (${x}, ${y})`, 'success');
    this.notifyStateChange();
  }

  private isOnPath(gridX: number, gridY: number): boolean {
    const path = this.aiSystem.getPath();
    const cellSize = this.gridCellSize;

    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];

      if (!p1 || !p2) continue;

      const minX = Math.min(p1.x, p2.x) / cellSize;
      const maxX = Math.max(p1.x, p2.x) / cellSize;
      const minY = Math.min(p1.y, p2.y) / cellSize;
      const maxY = Math.max(p1.y, p2.y) / cellSize;

      if (gridX >= Math.floor(minX) && gridX <= Math.floor(maxX) &&
          gridY >= Math.floor(minY) && gridY <= Math.floor(maxY)) {
        return true;
      }
    }

    return false;
  }

  private handleUpgrade(params: UpgradeParams): void {
    const { x, y } = params;
    const tower = this.entityManager.getTowerAt(x, y);

    if (!tower) {
      throw new Error(`No tower at (${x}, ${y})`);
    }

    if (tower.level >= 5) {
      throw new Error('Tower is already at maximum level!');
    }

    const cost = this.entityManager.getUpgradeCost(tower.type, tower.level);
    if (this.state.gold < cost) {
      throw new Error(`Not enough gold! Need ${cost}, have ${this.state.gold}`);
    }

    this.state.gold -= cost;
    this.entityManager.upgradeTower(tower);
    this.addNotification(`Tower upgraded to level ${tower.level}`, 'success');
    this.notifyStateChange();
  }

  private handleMove(params: MoveParams): void {
    const { x1, y1, x2, y2 } = params;

    const tower = this.entityManager.getTowerAt(x1, y1);
    if (!tower) {
      throw new Error(`No tower at (${x1}, ${y1})`);
    }

    if (x2 < 0 || x2 >= this.gridCols || y2 < 0 || y2 >= this.gridRows) {
      throw new Error(`Target position (${x2}, ${y2}) is out of bounds`);
    }

    if (this.isOnPath(x2, y2)) {
      throw new Error(`Cannot move to path at (${x2}, ${y2})`);
    }

    const existingTower = this.entityManager.getTowerAt(x2, y2);
    if (existingTower) {
      throw new Error(`Tower already exists at (${x2}, ${y2})`);
    }

    tower.gridX = x2;
    tower.gridY = y2;
    this.addNotification(`Tower moved to (${x2}, ${y2})`, 'success');
  }

  private handleSell(params: SellParams): void {
    const { x, y } = params;
    const tower = this.entityManager.getTowerAt(x, y);

    if (!tower) {
      throw new Error(`No tower at (${x}, ${y})`);
    }

    const sellValue = this.entityManager.getSellValue(tower);
    this.state.gold += sellValue;
    this.entityManager.removeTower(tower.id);
    this.addNotification(`Tower sold for ${sellValue} gold`, 'success');
    this.notifyStateChange();
  }

  private handleStartWave(): void {
    if (this.aiSystem.isWaveInProgress()) {
      throw new Error('Wave already in progress!');
    }

    const started = this.aiSystem.startNextWave();
    if (started) {
      this.addNotification(`Wave ${this.aiSystem.getCurrentWave()} started!`, 'info');
      this.state.wave = this.aiSystem.getCurrentWave();
      this.notifyStateChange();
    }
  }

  private handleHelp(): void {
    const parser = new InputParser();
    const helpText = parser.getHelpText();
    this.addNotification(helpText, 'info');
  }

  private handleStatus(): void {
    const waveInfo = this.aiSystem.isWaveInProgress()
      ? `Wave ${this.state.wave} in progress`
      : `Waiting for wave ${this.state.wave + 1}`;
    const enemyCount = this.entityManager.enemies.size;
    const towerCount = this.entityManager.towers.size;

    const status = `Gold: ${this.state.gold} | Lives: ${this.state.lives} | ${waveInfo} | Enemies: ${enemyCount} | Towers: ${towerCount}`;
    this.addNotification(status, 'info');
  }

  addNotification(message: string, type: NotificationType): void {
    const notification: Notification = {
      id: ++this.notificationIdCounter,
      message,
      type,
      timestamp: performance.now()
    };
    this.notifications.push(notification);

    if (this.onNotification) {
      this.onNotification(notification);
    }
  }

  private cleanupNotifications(currentTime: number): void {
    this.notifications = this.notifications.filter(
      n => currentTime - n.timestamp < 2000
    );
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  resetGame(): void {
    this.entityManager.clearAll();
    this.aiSystem.reset();
    this.state = {
      gold: 100,
      lives: 20,
      wave: 0,
      isPlaying: true,
      isPaused: false,
      isGameOver: false
    };
    this.notifications = [];
    this.notifyStateChange();
    this.addNotification('Game reset!', 'info');
  }

  togglePause(): void {
    this.state.isPaused = !this.state.isPaused;
    this.addNotification(
      this.state.isPaused ? 'Game paused' : 'Game resumed',
      'info'
    );
    this.notifyStateChange();
  }
}
