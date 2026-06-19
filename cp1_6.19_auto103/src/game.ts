import { Player, PlayerBullet } from './player';
import { EnemyBullet, Scout, Bomber, Elite, EnemyType, Enemy } from './enemy';
import { Asteroid, Particle, Pickup } from './asteroid';
import { ObjectPool } from './objectPool';
import { HUD, ShopManager, ShopItemData } from './ui';

enum GameState {
  MENU,
  PLAYING,
  PAUSED,
  SHOP,
  GAME_OVER
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private isMobile: boolean;
  private scale: number;

  private state: GameState;

  private player: Player;
  private hud: HUD;
  private shopManager: ShopManager;

  private playerBulletPool: ObjectPool<PlayerBullet>;
  private enemyBulletPool: ObjectPool<EnemyBullet>;
  private particlePool: ObjectPool<Particle>;
  private asteroidPool: ObjectPool<Asteroid>;
  private pickupPool: ObjectPool<Pickup>;
  private scoutPool: ObjectPool<Scout>;
  private bomberPool: ObjectPool<Bomber>;
  private elitePool: ObjectPool<Elite>;

  private wave: number;
  private coins: number;
  private totalKills: number;
  private waveKills: number;
  private waveTotalEnemies: number;
  private waveSpawnTimer: number;
  private waveSpawnInterval: number;
  private waveEnemiesSpawned: number;
  private betweenWaves: boolean;
  private betweenWaveTimer: number;

  private screenShake: number;
  private screenFlashEl: HTMLElement;
  private flashTimer: number;

  private stars: { x: number; y: number; size: number; speed: number; alpha: number }[];

  private lastTime: number;
  private animationId: number;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = 960;
    this.height = 600;
    this.isMobile = false;
    this.scale = 1;

    this.state = GameState.MENU;

    this.player = new Player(this.width, this.height);
    this.hud = new HUD(this.canvas);
    this.shopManager = new ShopManager();

    this.playerBulletPool = new ObjectPool<PlayerBullet>(() => new PlayerBullet(), 50, 200);
    this.enemyBulletPool = new ObjectPool<EnemyBullet>(() => new EnemyBullet(), 50, 300);
    this.particlePool = new ObjectPool<Particle>(() => new Particle(), 100, 500);
    this.asteroidPool = new ObjectPool<Asteroid>(() => new Asteroid(), 30, 100);
    this.pickupPool = new ObjectPool<Pickup>(() => new Pickup(), 30, 100);
    this.scoutPool = new ObjectPool<Scout>(() => new Scout(), 15, 50);
    this.bomberPool = new ObjectPool<Bomber>(() => new Bomber(), 8, 30);
    this.elitePool = new ObjectPool<Elite>(() => new Elite(), 5, 20);

    this.wave = 0;
    this.coins = 0;
    this.totalKills = 0;
    this.waveKills = 0;
    this.waveTotalEnemies = 0;
    this.waveSpawnTimer = 0;
    this.waveSpawnInterval = 1.5;
    this.waveEnemiesSpawned = 0;
    this.betweenWaves = false;
    this.betweenWaveTimer = 0;

    this.screenShake = 0;
    this.screenFlashEl = document.getElementById('screen-flash')!;
    this.flashTimer = 0;

    this.stars = [];

    this.lastTime = 0;
    this.animationId = 0;

    this.init();
  }

  private init(): void {
    this.resize();
    this.generateStars();
    this.setupEventListeners();
    this.setupShopCallbacks();

    const startScreen = document.getElementById('start-screen')!;
    const startBtn = document.getElementById('start-btn')!;
    const restartBtn = document.getElementById('restart-btn')!;
    const gameOverScreen = document.getElementById('game-over-screen')!;

    startBtn.addEventListener('click', () => {
      startScreen.classList.add('hidden');
      this.startGame();
    });

    restartBtn.addEventListener('click', () => {
      gameOverScreen.classList.remove('active');
      this.startGame();
    });

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private resize(): void {
    const container = document.getElementById('game-container')!;
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    this.isMobile = containerWidth < containerHeight;

    if (this.isMobile) {
      this.width = 540;
      this.height = 960;
    } else {
      this.width = 1280;
      this.height = 720;
    }

    this.scale = Math.min(containerWidth / this.width, containerHeight / this.height) * 0.95;
    
    const displayWidth = this.width * this.scale;
    const displayHeight = this.height * this.scale;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    this.hud.resize(this.width, this.height);
    this.generateStars();
  }

  private generateStars(): void {
    this.stars = [];
    const starCount = Math.floor((this.width * this.height) / 8000);
    
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 15 + 5,
        alpha: Math.random() * 0.5 + 0.3
      });
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      this.player.keys.add(e.key);

      if (e.key === '1') this.player.switchWeapon(0);
      if (e.key === '2') this.player.switchWeapon(1);

      if (e.key === ' ' || e.key === 'Escape') {
        if (this.state === GameState.PLAYING) {
          this.state = GameState.PAUSED;
        } else if (this.state === GameState.PAUSED) {
          this.state = GameState.PLAYING;
        }
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.player.keys.delete(e.key);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.player.mouseX = (e.clientX - rect.left) / this.scale;
      this.player.mouseY = (e.clientY - rect.top) / this.scale;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.player.mouseDown = true;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.player.mouseDown = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    let touchStartX = 0;
    let touchStartY = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.player.mouseX = (touch.clientX - rect.left) / this.scale;
        this.player.mouseY = (touch.clientY - rect.top) / this.scale;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }
      this.player.mouseDown = true;
      e.preventDefault();
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.player.mouseX = (touch.clientX - rect.left) / this.scale;
        this.player.mouseY = (touch.clientY - rect.top) / this.scale;
      }
      e.preventDefault();
    });

    this.canvas.addEventListener('touchend', () => {
      this.player.mouseDown = false;
    });
  }

  private setupShopCallbacks(): void {
    this.shopManager.setOnContinue(() => {
      this.startNextWave();
    });

    this.shopManager.setOnBuy((id: string) => {
      this.buyUpgrade(id);
    });
  }

  private startGame(): void {
    this.player = new Player(this.width, this.height);
    this.wave = 0;
    this.coins = 0;
    this.totalKills = 0;

    this.playerBulletPool.clear();
    this.enemyBulletPool.clear();
    this.particlePool.clear();
    this.asteroidPool.clear();
    this.pickupPool.clear();
    this.scoutPool.clear();
    this.bomberPool.clear();
    this.elitePool.clear();

    this.spawnInitialAsteroids();

    this.state = GameState.PLAYING;
    this.startNextWave();
  }

  private startNextWave(): void {
    this.wave++;
    this.waveKills = 0;
    this.waveEnemiesSpawned = 0;
    this.waveSpawnTimer = 1;
    this.betweenWaves = false;
    
    this.waveTotalEnemies = Math.floor(3 + this.wave * 2);
    this.waveSpawnInterval = Math.max(0.5, 2 - this.wave * 0.1);

    this.hud.setWave(this.wave);
    this.hud.setCoins(this.coins);
    this.hud.setKills(this.totalKills);

    this.state = GameState.PLAYING;
    this.shopManager.hide();
  }

  private endWave(): void {
    this.betweenWaves = true;
    this.betweenWaveTimer = 2;

    setTimeout(() => {
      if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
        this.openShop();
      }
    }, 1500);
  }

  private openShop(): void {
    this.state = GameState.SHOP;
    
    const items: ShopItemData[] = [
      {
        id: 'shield',
        name: '护盾核心',
        desc: '增加护盾上限 +30',
        level: this.player.shieldUpgradeLevel,
        maxLevel: 3,
        cost: this.player.getShieldCost(),
        canAfford: this.coins >= this.player.getShieldCost() && this.player.shieldUpgradeLevel < 3
      },
      {
        id: 'firerate',
        name: '速射炮',
        desc: '提升射速 20%',
        level: this.player.fireRateUpgradeLevel,
        maxLevel: 3,
        cost: this.player.getFireRateCost(),
        canAfford: this.coins >= this.player.getFireRateCost() && this.player.fireRateUpgradeLevel < 3
      },
      {
        id: 'nano',
        name: '纳米修复套件',
        desc: '缓慢恢复血量',
        level: this.player.nanoRegenLevel,
        maxLevel: 3,
        cost: this.player.getNanoRegenCost(),
        canAfford: this.coins >= this.player.getNanoRegenCost() && this.player.nanoRegenLevel < 3
      },
      {
        id: 'ammo',
        name: '弹药补给',
        desc: '补充散弹枪弹药',
        level: 0,
        maxLevel: 99,
        cost: 20,
        canAfford: this.coins >= 20
      },
      {
        id: 'heal',
        name: '紧急修复',
        desc: '恢复 30 点生命值',
        level: 0,
        maxLevel: 99,
        cost: 30,
        canAfford: this.coins >= 30 && this.player.health < this.player.maxHealth
      }
    ];

    this.shopManager.show(this.wave, this.coins, items);
  }

  private buyUpgrade(id: string): void {
    switch (id) {
      case 'shield':
        if (this.coins >= this.player.getShieldCost() && this.player.shieldUpgradeLevel < 3) {
          this.coins -= this.player.getShieldCost();
          this.player.upgradeShield();
        }
        break;
      case 'firerate':
        if (this.coins >= this.player.getFireRateCost() && this.player.fireRateUpgradeLevel < 3) {
          this.coins -= this.player.getFireRateCost();
          this.player.upgradeFireRate();
        }
        break;
      case 'nano':
        if (this.coins >= this.player.getNanoRegenCost() && this.player.nanoRegenLevel < 3) {
          this.coins -= this.player.getNanoRegenCost();
          this.player.upgradeNanoRegen();
        }
        break;
      case 'ammo':
        if (this.coins >= 20) {
          this.coins -= 20;
          this.player.addAmmo(15);
        }
        break;
      case 'heal':
        if (this.coins >= 30 && this.player.health < this.player.maxHealth) {
          this.coins -= 30;
          this.player.heal(30);
        }
        break;
    }

    this.shopManager.updateCoins(this.coins);
    this.hud.setCoins(this.coins);
    
    this.refreshShop();
  }

  private refreshShop(): void {
    const items: ShopItemData[] = [
      {
        id: 'shield',
        name: '护盾核心',
        desc: '增加护盾上限 +30',
        level: this.player.shieldUpgradeLevel,
        maxLevel: 3,
        cost: this.player.getShieldCost(),
        canAfford: this.coins >= this.player.getShieldCost() && this.player.shieldUpgradeLevel < 3
      },
      {
        id: 'firerate',
        name: '速射炮',
        desc: '提升射速 20%',
        level: this.player.fireRateUpgradeLevel,
        maxLevel: 3,
        cost: this.player.getFireRateCost(),
        canAfford: this.coins >= this.player.getFireRateCost() && this.player.fireRateUpgradeLevel < 3
      },
      {
        id: 'nano',
        name: '纳米修复套件',
        desc: '缓慢恢复血量',
        level: this.player.nanoRegenLevel,
        maxLevel: 3,
        cost: this.player.getNanoRegenCost(),
        canAfford: this.coins >= this.player.getNanoRegenCost() && this.player.nanoRegenLevel < 3
      },
      {
        id: 'ammo',
        name: '弹药补给',
        desc: '补充散弹枪弹药',
        level: 0,
        maxLevel: 99,
        cost: 20,
        canAfford: this.coins >= 20
      },
      {
        id: 'heal',
        name: '紧急修复',
        desc: '恢复 30 点生命值',
        level: 0,
        maxLevel: 99,
        cost: 30,
        canAfford: this.coins >= 30 && this.player.health < this.player.maxHealth
      }
    ];

    this.shopManager.show(this.wave, this.coins, items);
  }

  private spawnInitialAsteroids(): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const asteroid = this.asteroidPool.acquire();
      asteroid.initLarge(this.width, this.height);
      asteroid.x = Math.random() * this.width;
      asteroid.y = Math.random() * this.height;
    }
  }

  private spawnEnemy(): void {
    const roll = Math.random();
    let type: EnemyType;

    if (this.wave < 3) {
      type = EnemyType.SCOUT;
    } else if (this.wave < 5) {
      type = roll < 0.6 ? EnemyType.SCOUT : EnemyType.BOMBER;
    } else {
      if (roll < 0.45) type = EnemyType.SCOUT;
      else if (roll < 0.8) type = EnemyType.BOMBER;
      else type = EnemyType.ELITE;
    }

    const side = Math.floor(Math.random() * 4);
    let spawnX = 0, spawnY = 0;

    switch (side) {
      case 0:
        spawnX = Math.random() * this.width;
        spawnY = -50;
        break;
      case 1:
        spawnX = this.width + 50;
        spawnY = Math.random() * this.height;
        break;
      case 2:
        spawnX = Math.random() * this.width;
        spawnY = this.height + 50;
        break;
      case 3:
        spawnX = -50;
        spawnY = Math.random() * this.height;
        break;
    }

    if (type === EnemyType.SCOUT) {
      const enemy = this.scoutPool.acquire();
      enemy.x = spawnX;
      enemy.y = spawnY;
      enemy.health = enemy.maxHealth;
    } else if (type === EnemyType.BOMBER) {
      const enemy = this.bomberPool.acquire();
      enemy.x = spawnX;
      enemy.y = spawnY;
      enemy.health = enemy.maxHealth;
      enemy.setTargetY(100 + Math.random() * (this.height - 200));
    } else {
      const enemy = this.elitePool.acquire();
      enemy.x = spawnX;
      enemy.y = spawnY;
      enemy.health = enemy.maxHealth;
    }

    this.waveEnemiesSpawned++;
  }

  private playerShoot(): void {
    if (!this.player.tryShoot()) return;

    const bulletCount = this.player.getBulletCount();
    const spread = this.player.getBulletSpread();
    const baseAngle = this.player.angle;

    for (let i = 0; i < bulletCount; i++) {
      let angle = baseAngle;
      if (bulletCount > 1) {
        angle += (i - (bulletCount - 1) / 2) * spread;
      } else {
        angle += (Math.random() - 0.5) * spread;
      }

      const bullet = this.playerBulletPool.acquire();
      bullet.x = this.player.x + Math.cos(angle) * 24;
      bullet.y = this.player.y + Math.sin(angle) * 24;
      bullet.vx = Math.cos(angle) * this.player.getBulletSpeed();
      bullet.vy = Math.sin(angle) * this.player.getBulletSpeed();
      bullet.damage = this.player.getBulletDamage();
      bullet.color = this.player.getBulletColor();
      bullet.glowColor = this.player.getBulletGlowColor();
    }
  }

  private enemyShoot(enemy: Enemy): void {
    const angle = enemy.angle;
    const bulletCount = enemy instanceof Bomber ? 3 : enemy instanceof Elite ? 2 : 1;
    const spread = enemy instanceof Bomber ? 0.3 : enemy instanceof Elite ? 0.15 : 0;

    for (let i = 0; i < bulletCount; i++) {
      let bAngle = angle;
      if (bulletCount > 1) {
        bAngle += (i - (bulletCount - 1) / 2) * spread;
      }

      const bullet = this.enemyBulletPool.acquire();
      bullet.x = enemy.x + Math.cos(bAngle) * enemy.radius;
      bullet.y = enemy.y + Math.sin(bAngle) * enemy.radius;
      bullet.vx = Math.cos(bAngle) * 280;
      bullet.vy = Math.sin(bAngle) * 280;
      bullet.damage = enemy.damage;
    }
  }

  private createExplosion(x: number, y: number, count: number, color: string, speed: number = 200): void {
    for (let i = 0; i < count; i++) {
      const particle = this.particlePool.acquire();
      particle.x = x;
      particle.y = y;
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.3 + Math.random() * 0.7);
      particle.vx = Math.cos(angle) * spd;
      particle.vy = Math.sin(angle) * spd;
      particle.size = 2 + Math.random() * 4;
      particle.life = 0.3 + Math.random() * 0.5;
      particle.maxLife = particle.life;
      particle.color = color;
    }
  }

  private spawnPickup(x: number, y: number, type: 'coin' | 'shard' | 'ammo', value: number = 1): void {
    const pickup = this.pickupPool.acquire();
    pickup.x = x;
    pickup.y = y;
    pickup.vx = (Math.random() - 0.5) * 100;
    pickup.vy = (Math.random() - 0.5) * 100;
    pickup.type = type;
    pickup.value = value;
    pickup.life = 12;
  }

  private triggerScreenFlash(): void {
    this.flashTimer = 0.08;
    this.screenFlashEl.classList.add('hit');
  }

  private triggerScreenShake(amount: number): void {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  private gameOver(): void {
    this.state = GameState.GAME_OVER;

    document.getElementById('final-wave')!.textContent = String(this.wave);
    document.getElementById('final-kills')!.textContent = String(this.totalKills);
    document.getElementById('final-coins')!.textContent = String(this.coins);
    document.getElementById('game-over-screen')!.classList.add('active');
  }

  private update(dt: number): void {
    if (this.state !== GameState.PLAYING) return;

    this.updateStars(dt);
    this.player.update(dt, this.width, this.height);
    this.hud.update(dt, this.player);

    if (this.player.mouseDown) {
      this.playerShoot();
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.screenFlashEl.classList.remove('hit');
      }
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 30);
    }

    this.updatePlayerBullets(dt);
    this.updateEnemyBullets(dt);
    this.updateEnemies(dt);
    this.updateAsteroids(dt);
    this.updateParticles(dt);
    this.updatePickups(dt);
    this.checkCollisions();
    this.updateWaveLogic(dt);

    this.hud.setCoins(this.coins);
    this.hud.setKills(this.totalKills);
  }

  private updateStars(dt: number): void {
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }
  }

  private updatePlayerBullets(dt: number): void {
    const bullets = this.playerBulletPool.getActive();
    for (const bullet of bullets) {
      bullet.update(dt);
      if (bullet.isOffScreen(this.width, this.height)) {
        this.playerBulletPool.release(bullet);
      }
    }
  }

  private updateEnemyBullets(dt: number): void {
    const bullets = this.enemyBulletPool.getActive();
    for (const bullet of bullets) {
      bullet.update(dt);
      if (bullet.isOffScreen(this.width, this.height)) {
        this.enemyBulletPool.release(bullet);
      }
    }
  }

  private updateEnemies(dt: number): void {
    const scouts = this.scoutPool.getActive();
    for (const enemy of scouts) {
      enemy.update(dt, this.player.x, this.player.y, this.width, this.height);
      if (enemy.tryShoot()) {
        this.enemyShoot(enemy);
      }
      if (enemy.isOffScreen(this.width, this.height) && this.isEnemyFarAway(enemy)) {
        this.scoutPool.release(enemy);
      }
    }

    const bombers = this.bomberPool.getActive();
    for (const enemy of bombers) {
      enemy.update(dt, this.player.x, this.player.y, this.width, this.height);
      if (enemy.tryShoot()) {
        this.enemyShoot(enemy);
      }
    }

    const elites = this.elitePool.getActive();
    for (const enemy of elites) {
      enemy.update(dt, this.player.x, this.player.y, this.width, this.height);
      if (enemy.tryShoot()) {
        this.enemyShoot(enemy);
      }
    }
  }

  private isEnemyFarAway(enemy: Enemy): boolean {
    const dx = enemy.x - this.width / 2;
    const dy = enemy.y - this.height / 2;
    return Math.sqrt(dx * dx + dy * dy) > Math.max(this.width, this.height);
  }

  private updateAsteroids(dt: number): void {
    const asteroids = this.asteroidPool.getActive();
    for (const asteroid of asteroids) {
      asteroid.update(dt, this.width, this.height);
    }
  }

  private updateParticles(dt: number): void {
    const particles = this.particlePool.getActive();
    for (const particle of particles) {
      if (particle.update(dt)) {
        this.particlePool.release(particle);
      }
    }
  }

  private updatePickups(dt: number): void {
    const pickups = this.pickupPool.getActive();
    for (const pickup of pickups) {
      if (pickup.update(dt, this.player.x, this.player.y)) {
        this.pickupPool.release(pickup);
      }
    }
  }

  private updateWaveLogic(dt: number): void {
    if (this.betweenWaves) {
      return;
    }

    if (this.waveEnemiesSpawned < this.waveTotalEnemies) {
      this.waveSpawnTimer -= dt;
      if (this.waveSpawnTimer <= 0) {
        this.spawnEnemy();
        this.waveSpawnTimer = this.waveSpawnInterval * (0.7 + Math.random() * 0.6);
      }
    }

    const activeEnemies = this.scoutPool.activeCount + this.bomberPool.activeCount + this.elitePool.activeCount;
    if (this.waveEnemiesSpawned >= this.waveTotalEnemies && activeEnemies === 0 && !this.betweenWaves) {
      this.endWave();
    }
  }

  private checkCollisions(): void {
    this.checkPlayerBulletsVsEnemies();
    this.checkPlayerBulletsVsAsteroids();
    this.checkEnemyBulletsVsPlayer();
    this.checkEnemiesVsPlayer();
    this.checkAsteroidsVsPlayer();
    this.checkPickupsVsPlayer();
    this.checkEnemyBulletsVsAsteroids();
  }

  private checkPlayerBulletsVsEnemies(): void {
    const bullets = this.playerBulletPool.getActive();
    const scouts = this.scoutPool.getActive();
    const bombers = this.bomberPool.getActive();
    const elites = this.elitePool.getActive();

    const allEnemies: Enemy[] = [...scouts, ...bombers, ...elites];

    for (const bullet of bullets) {
      if (!bullet.active) continue;

      for (const enemy of allEnemies) {
        if (!enemy.active) continue;

        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bullet.radius + enemy.radius) {
          this.playerBulletPool.release(bullet);

          if (enemy.takeDamage(bullet.damage)) {
            this.onEnemyKilled(enemy);
          }
          break;
        }
      }
    }
  }

  private checkPlayerBulletsVsAsteroids(): void {
    const bullets = this.playerBulletPool.getActive();
    const asteroids = this.asteroidPool.getActive();

    for (const bullet of bullets) {
      if (!bullet.active) continue;

      for (const asteroid of asteroids) {
        if (!asteroid.active) continue;

        const dx = bullet.x - asteroid.x;
        const dy = bullet.y - asteroid.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bullet.radius + asteroid.radius * 0.85) {
          this.playerBulletPool.release(bullet);

          if (asteroid.takeDamage(bullet.damage)) {
            this.onAsteroidDestroyed(asteroid);
          }
          break;
        }
      }
    }
  }

  private checkEnemyBulletsVsPlayer(): void {
    const bullets = this.enemyBulletPool.getActive();

    for (const bullet of bullets) {
      if (!bullet.active) continue;

      const dx = bullet.x - this.player.x;
      const dy = bullet.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bullet.radius + this.player.radius * 0.8) {
        this.enemyBulletPool.release(bullet);

        if (this.player.takeDamage(bullet.damage)) {
          this.gameOver();
          this.createExplosion(this.player.x, this.player.y, 40, '#00ddff', 300);
          this.createExplosion(this.player.x, this.player.y, 20, '#ff4455', 200);
          this.triggerScreenShake(15);
        } else {
          this.triggerScreenFlash();
          this.triggerScreenShake(3);
        }
      }
    }
  }

  private checkEnemiesVsPlayer(): void {
    const scouts = this.scoutPool.getActive();
    const bombers = this.bomberPool.getActive();
    const elites = this.elitePool.getActive();
    const allEnemies: Enemy[] = [...scouts, ...bombers, ...elites];

    for (const enemy of allEnemies) {
      if (!enemy.active) continue;

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < enemy.radius + this.player.radius * 0.7) {
        if (this.player.takeDamage(enemy.damage * 0.5)) {
          this.gameOver();
          this.createExplosion(this.player.x, this.player.y, 40, '#00ddff', 300);
          this.triggerScreenShake(15);
        } else {
          this.triggerScreenFlash();
          this.triggerScreenShake(5);
        }

        if (enemy.takeDamage(20)) {
          this.onEnemyKilled(enemy);
        }

        const pushX = dx / dist * 200;
        const pushY = dy / dist * 200;
        this.player.vx -= pushX;
        this.player.vy -= pushY;
      }
    }
  }

  private checkAsteroidsVsPlayer(): void {
    const asteroids = this.asteroidPool.getActive();

    for (const asteroid of asteroids) {
      if (!asteroid.active) continue;

      const dx = asteroid.x - this.player.x;
      const dy = asteroid.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < asteroid.radius + this.player.radius * 0.7) {
        if (this.player.takeDamage(8 + asteroid.sizeClass * 5)) {
          this.gameOver();
          this.createExplosion(this.player.x, this.player.y, 40, '#00ddff', 300);
          this.triggerScreenShake(15);
        } else {
          this.triggerScreenFlash();
          this.triggerScreenShake(4);
        }

        const pushX = dx / dist * 250;
        const pushY = dy / dist * 250;
        this.player.vx -= pushX * 0.5;
        this.player.vy -= pushY * 0.5;

        asteroid.vx += pushX * 0.3;
        asteroid.vy += pushY * 0.3;
      }
    }
  }

  private checkPickupsVsPlayer(): void {
    const pickups = this.pickupPool.getActive();

    for (const pickup of pickups) {
      if (!pickup.active) continue;

      const dx = pickup.x - this.player.x;
      const dy = pickup.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pickup.radius + this.player.radius) {
        if (pickup.type === 'coin') {
          this.coins += pickup.value;
        } else if (pickup.type === 'shard') {
          this.player.heal(5);
        } else if (pickup.type === 'ammo') {
          this.player.addAmmo(5);
        }

        this.pickupPool.release(pickup);
        this.createExplosion(pickup.x, pickup.y, 8, pickup.type === 'coin' ? '#ffd700' : pickup.type === 'shard' ? '#00ddff' : '#ff8800', 100);
      }
    }
  }

  private checkEnemyBulletsVsAsteroids(): void {
    const bullets = this.enemyBulletPool.getActive();
    const asteroids = this.asteroidPool.getActive();

    for (const bullet of bullets) {
      if (!bullet.active) continue;

      for (const asteroid of asteroids) {
        if (!asteroid.active) continue;

        const dx = bullet.x - asteroid.x;
        const dy = bullet.y - asteroid.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bullet.radius + asteroid.radius * 0.8) {
          this.enemyBulletPool.release(bullet);
          break;
        }
      }
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.createExplosion(enemy.x, enemy.y, 25, '#ff6644', 220);
    this.createExplosion(enemy.x, enemy.y, 15, '#ffaa22', 150);
    this.triggerScreenShake(2 + enemy.radius * 0.05);

    this.coins += enemy.coinValue;
    this.totalKills++;
    this.waveKills++;

    this.spawnPickup(enemy.x, enemy.y, 'coin', Math.ceil(enemy.coinValue * 0.5));

    if (Math.random() < 0.15) {
      this.spawnPickup(enemy.x + (Math.random() - 0.5) * 20, enemy.y + (Math.random() - 0.5) * 20, 'shard');
    }

    if (enemy instanceof Scout) {
      this.scoutPool.release(enemy);
    } else if (enemy instanceof Bomber) {
      this.bomberPool.release(enemy);
    } else if (enemy instanceof Elite) {
      this.elitePool.release(enemy);
    }
  }

  private onAsteroidDestroyed(asteroid: Asteroid): void {
    this.createExplosion(asteroid.x, asteroid.y, 20, '#8a95a8', 180);
    this.createExplosion(asteroid.x, asteroid.y, 10, '#6a7588', 120);
    this.triggerScreenShake(2 + asteroid.sizeClass);

    const coinDrop = asteroid.getCoinDrop();
    for (let i = 0; i < Math.ceil(coinDrop / 3); i++) {
      this.spawnPickup(
        asteroid.x + (Math.random() - 0.5) * asteroid.radius,
        asteroid.y + (Math.random() - 0.5) * asteroid.radius,
        'coin',
        3
      );
    }

    if (Math.random() < asteroid.getShardChance()) {
      this.spawnPickup(asteroid.x, asteroid.y, 'shard');
    }

    if (asteroid.sizeClass > 0) {
      const pieces = asteroid.sizeClass === 2 ? 2 : 2;
      for (let i = 0; i < pieces; i++) {
        const newAsteroid = this.asteroidPool.acquire();
        if (asteroid.sizeClass === 2) {
          newAsteroid.initMedium(asteroid.x, asteroid.y);
        } else {
          newAsteroid.initSmall(asteroid.x, asteroid.y);
        }
      }
    }

    this.asteroidPool.release(asteroid);
  }

  private draw(): void {
    const ctx = this.ctx;

    ctx.save();

    let shakeX = 0, shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake * 2;
      shakeY = (Math.random() - 0.5) * this.screenShake * 2;
    }
    ctx.translate(shakeX, shakeY);

    this.drawBackground();
    this.drawAsteroids();
    this.drawPickups();
    this.drawEnemies();
    this.drawPlayerBullets();
    this.drawEnemyBullets();
    this.drawPlayer();
    this.drawParticles();

    ctx.restore();

    if (this.state === GameState.PLAYING || this.state === GameState.PAUSED || this.state === GameState.SHOP) {
      this.hud.draw(this.player);
    }

    if (this.state === GameState.PAUSED) {
      this.drawPauseOverlay();
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#12122a');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#aaccff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPlayer(): void {
    if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
      this.player.draw(this.ctx);
    }
  }

  private drawPlayerBullets(): void {
    const bullets = this.playerBulletPool.getActive();
    for (const bullet of bullets) {
      bullet.draw(this.ctx);
    }
  }

  private drawEnemyBullets(): void {
    const bullets = this.enemyBulletPool.getActive();
    for (const bullet of bullets) {
      bullet.draw(this.ctx);
    }
  }

  private drawEnemies(): void {
    const scouts = this.scoutPool.getActive();
    for (const enemy of scouts) {
      enemy.draw(this.ctx);
    }

    const bombers = this.bomberPool.getActive();
    for (const enemy of bombers) {
      enemy.draw(this.ctx);
    }

    const elites = this.elitePool.getActive();
    for (const enemy of elites) {
      enemy.draw(this.ctx);
    }
  }

  private drawAsteroids(): void {
    const asteroids = this.asteroidPool.getActive();
    for (const asteroid of asteroids) {
      asteroid.draw(this.ctx);
    }
  }

  private drawParticles(): void {
    const particles = this.particlePool.getActive();
    for (const particle of particles) {
      particle.draw(this.ctx);
    }
  }

  private drawPickups(): void {
    const pickups = this.pickupPool.getActive();
    for (const pickup of pickups) {
      pickup.draw(this.ctx);
    }
  }

  private drawPauseOverlay(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5, 5, 20, 0.7)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#7ec8ff';
    ctx.shadowColor = '#0088ff';
    ctx.shadowBlur = 15;
    ctx.font = `bold ${Math.floor(48 * this.scale)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暂停', this.width / 2, this.height / 2 - 20);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#8899bb';
    ctx.font = `${Math.floor(16 * this.scale)}px 'Courier New', monospace`;
    ctx.fillText('按 空格 或 ESC 继续', this.width / 2, this.height / 2 + 30);
  }

  private loop = (currentTime: number): void => {
    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(this.loop);
  };
}

window.addEventListener('load', () => {
  new Game();
});
