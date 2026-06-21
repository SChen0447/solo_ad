import Phaser from 'phaser';
import { Player } from './player';
import { EnemyPool, Enemy } from './enemy';
import { BulletPool, Bullet } from './bullet';
import { UIManager, UIState } from './ui';

class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemyPool!: EnemyPool;
  private bulletPool!: BulletPool;
  private uiManager!: UIManager;

  private tileLayer!: Phaser.GameObjects.Container;
  private bulletTimeFactor: number = 0.3;
  private prevBulletTimeActive: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0F0F1A');
    this.createBackgroundTiles();

    this.bulletPool = new BulletPool(this, 150);
    this.enemyPool = new EnemyPool(this, this.bulletPool, 50);
    this.player = new Player(this, width / 2, height / 2, this.bulletPool);
    this.uiManager = new UIManager(this);

    this.setupRestartKey();

    this.events.on('shutdown', this.shutdown, this);
    this.events.on('destroy', this.destroy, this);
  }

  private createBackgroundTiles(): void {
    const { width, height } = this.scale;
    const tileSize = 64;
    const cols = Math.ceil(width / tileSize) + 1;
    const rows = Math.ceil(height / tileSize) + 1;

    this.tileLayer = this.add.container(0, 0).setDepth(0);

    const textureKey = 'bg_tile';
    if (!this.textures.exists(textureKey)) {
      const tg = this.add.graphics();
      tg.fillStyle(0x1a1a2e, 1);
      tg.fillRect(0, 0, tileSize, tileSize);

      tg.lineStyle(1, 0x2a2a4a, 0.4);
      tg.strokeRect(0, 0, tileSize, tileSize);

      tg.fillStyle(0x2d2d4d, 0.3);
      for (let i = 0; i < 5; i++) {
        const px = Phaser.Math.Between(4, tileSize - 8);
        const py = Phaser.Math.Between(4, tileSize - 8);
        const ps = Phaser.Math.Between(2, 6);
        tg.fillRect(px, py, ps, ps);
      }

      tg.lineStyle(1, 0x4a90d9, 0.08);
      tg.lineBetween(0, 0, tileSize, tileSize);
      tg.lineBetween(tileSize, 0, 0, tileSize);

      tg.generateTexture(textureKey, tileSize, tileSize);
      tg.destroy();
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        const rotation = Phaser.Math.Between(0, 3) * Math.PI / 2;
        const tile = this.add.image(x + tileSize / 2, y + tileSize / 2, textureKey);
        tile.setRotation(rotation);
        tile.setAlpha(0.85 + Math.random() * 0.15);
        this.tileLayer.add(tile);
      }
    }

    const gridLines = this.add.graphics().setDepth(1);
    gridLines.lineStyle(1, 0x4a90d9, 0.05);
    for (let x = 0; x <= width; x += tileSize) {
      gridLines.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += tileSize) {
      gridLines.lineBetween(0, y, width, y);
    }

    this.add.particles(width / 2, height / 2, '__DEFAULT', {
      lifespan: 4000,
      speed: { min: 5, max: 15 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.3, end: 0 },
      quantity: 1,
      frequency: 80,
      blendMode: 'ADD',
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(0, 0, width, height),
        quantity: 1
      },
      tint: [0x4a90d9, 0x7c4dff]
    }).setDepth(5);
  }

  private performCollisions(): void {
    const activeBullets = this.bulletPool.getActiveBullets();
    const activeEnemies = this.enemyPool.getActiveEnemies();

    for (let bi = 0; bi < activeBullets.length; bi++) {
      const bullet = activeBullets[bi];
      if (!bullet.isActive) continue;

      if (bullet.owner === 'player') {
        for (let ei = 0; ei < activeEnemies.length; ei++) {
          const enemy = activeEnemies[ei];
          if (!enemy.isActive) continue;
          if (this.checkCircleCollision(bullet.x, bullet.y, 5, enemy.x, enemy.y, enemy.enemyType === 'elite' ? 20 : 16)) {
            this.handleBulletEnemyCollision(bullet, enemy);
            if (!bullet.isActive) break;
          }
        }
      } else {
        if (this.checkCircleCollision(
          bullet.x, bullet.y, 5,
          this.player.x, this.player.y, 16
        )) {
          this.handleBulletPlayerCollision(bullet);
        }
      }
    }

    const playerState = this.player.getState();
    if (!playerState.isInvincible && !playerState.isDashing) {
      for (let ei = 0; ei < activeEnemies.length; ei++) {
        const enemy = activeEnemies[ei];
        if (!enemy.isActive) continue;
        const r = (enemy.enemyType === 'elite' ? 20 : 16) + 14;
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        if (dx * dx + dy * dy < r * r) {
          this.handleEnemyPlayerCollision(enemy);
        }
      }
    }
  }

  private checkCircleCollision(
    x1: number, y1: number, r1: number,
    x2: number, y2: number, r2: number
  ): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const rr = r1 + r2;
    return dx * dx + dy * dy < rr * rr;
  }

  private handleBulletEnemyCollision(bullet: Bullet, enemy: Enemy): void {
    const damageDealt = enemy.takeDamage(bullet.damage, bullet.x, bullet.y);
    if (damageDealt > 0) {
      this.createHitEffect(bullet.x, bullet.y, 0x4a90d9);
    }
    bullet.deactivate();

    if (!enemy.isActive) {
      this.player.addScore(enemy.getScoreValue());
      this.uiManager.flashScore(enemy.getScoreValue());
    }
  }

  private handleBulletPlayerCollision(bullet: Bullet): void {
    this.player.takeDamage(bullet.damage);
    this.createHitEffect(bullet.x, bullet.y, 0xff1744);
    bullet.deactivate();
  }

  private handleEnemyPlayerCollision(enemy: Enemy): void {
    this.player.takeDamage(enemy.damage * 0.15);
  }

  private createHitEffect(x: number, y: number, color: number): void {
    const emitter = this.add.particles(x, y, '__DEFAULT', {
      lifespan: 200,
      speed: { min: 40, max: 100 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 6,
      blendMode: 'ADD',
      tint: [color, 0xffffff]
    }).setDepth(70);

    this.time.delayedCall(250, () => emitter.destroy());
  }

  private setupRestartKey(): void {
    this.input.keyboard!.on('keydown-R', () => {
      if (this.player.isGameOver) {
        this.restartGame();
      }
    });
  }

  private restartGame(): void {
    const { width, height } = this.scale;

    this.uiManager.hideGameOver();
    this.uiManager.hideBulletTimeEffects();

    this.bulletPool.clear();
    this.enemyPool.clear();

    this.player.reset(width / 2, height / 2);

    this.prevBulletTimeActive = false;
  }

  public update(time: number, delta: number): void {
    const state = this.player.getState();
    const bulletTimeNow = state.bulletTimeActive;

    if (bulletTimeNow && !this.prevBulletTimeActive) {
      this.bulletPool.applyBulletTime(this.bulletTimeFactor);
      this.enemyPool.applyBulletTime(this.bulletTimeFactor);
      this.uiManager.showBulletTimeEffects();
    }
    if (!bulletTimeNow && this.prevBulletTimeActive) {
      this.bulletPool.resetBulletTime();
      this.uiManager.hideBulletTimeEffects();
    }
    this.prevBulletTimeActive = bulletTimeNow;

    this.player.update(time, delta);
    this.enemyPool.update(time, delta, { x: state.x, y: state.y });
    this.bulletPool.update(time, delta);

    this.performCollisions();

    const uiState: UIState = {
      stamina: state.stamina,
      maxStamina: state.maxStamina,
      health: state.health,
      maxHealth: state.maxHealth,
      score: state.score,
      bulletTimeActive: state.bulletTimeActive,
      bulletTimeRemaining: state.bulletTimeRemaining,
      bulletTimeMaxDuration: state.bulletTimeMaxDuration,
      isGameOver: state.isGameOver
    };
    this.uiManager.update(uiState, time, delta);

    const activeEnemies = this.enemyPool.getActiveCount();
    const activeBullets = this.bulletPool.getActiveBullets().length;
    const perfText = this.children.getChildren().find(
      c => (c as Phaser.GameObjects.Text).text && (c as Phaser.GameObjects.Text).text.startsWith('FPS')
    ) as Phaser.GameObjects.Text | undefined;

    const fpsText = `FPS: ${Math.round(this.game.loop.actualFps)} | Enemies: ${activeEnemies} | Bullets: ${activeBullets}`;
    if (!perfText) {
      this.add.text(10, this.scale.height - 25, fpsText, {
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        color: '#4A90D9'
      }).setOrigin(0, 1).setDepth(999).setAlpha(0.7);
    } else {
      perfText.setText(fpsText);
    }
  }

  private shutdown(): void {
    this.uiManager.destroy();
    this.bulletPool.clear();
    this.enemyPool.clear();
  }

  private destroy(): void {
    this.shutdown();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0F0F1A',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
      fps: 60
    }
  },
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: 'high-performance',
    batchSize: 2048,
    maxTextures: 32
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  scene: [GameScene]
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

export default game;
