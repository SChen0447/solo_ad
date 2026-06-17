import { v4 as uuidv4 } from 'uuid';
import {
  Submarine,
  Enemy,
  Boss,
  Obstacle,
  Bullet,
  Particle,
  Collectible,
  BossProjectile,
  GameState,
  EnemyType,
  BossType,
  ObstacleType,
  BossAttackMode,
  STORY_FRAGMENTS,
} from './entities';
import { updateCollisions } from './collision';

export type GameStateListener = (state: GameState) => void;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private targetFPS: number = 60;
  private frameTime: number = 1000 / this.targetFPS;
  private listeners: GameStateListener[] = [];
  private lastRelicCount: number = 0;
  private lastBossRelic: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.state = this.createInitialState(canvas.width, canvas.height);
  }

  private createInitialState(width: number, height: number): GameState {
    return {
      submarine: new Submarine(width * 0.2, height * 0.5, uuidv4()),
      enemies: [],
      boss: null,
      bossProjectiles: [],
      obstacles: [],
      bullets: [],
      particles: [],
      collectibles: [],
      keys: {},
      time: 0,
      screenShake: 0,
      depth: 100,
      lastObstacleSpawn: 0,
      lastEnemySpawn: 0,
      lastBossSpawn: 0,
      gameOver: false,
      bossActive: false,
      storiesUnlocked: [],
      pendingStory: null,
      width,
      height,
      scrollOffset: 0,
    };
  }

  public addListener(listener: GameStateListener): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: GameStateListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.state.width = width;
    this.state.height = height;
  }

  public setKey(key: string, pressed: boolean): void {
    this.state.keys[key.toLowerCase()] = pressed;
  }

  public start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public reset(): void {
    this.state = this.createInitialState(this.canvas.width, this.canvas.height);
    this.lastRelicCount = 0;
    this.lastBossRelic = 0;
    this.notifyListeners();
  }

  public clearPendingStory(): void {
    this.state.pendingStory = null;
    this.notifyListeners();
  }

  private loop = (): void => {
    this.animationId = requestAnimationFrame(this.loop);
    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= this.frameTime) {
      this.lastTime = now - (delta % this.frameTime);
      this.update();
      this.render();
      this.notifyListeners();
    }
  };

  private spawnObstacle(): void {
    const types: ObstacleType[] = ['coral', 'shipwreck'];
    const type = types[Math.floor(Math.random() * types.length)];
    const y = type === 'coral'
      ? this.state.height - 60 - Math.random() * 80
      : 100 + Math.random() * (this.state.height - 250);
    const obstacle = new Obstacle(this.state.width + 80, y, type, uuidv4());
    this.state.obstacles.push(obstacle);
  }

  private spawnEnemy(): void {
    const types: EnemyType[] = ['lanternfish', 'lanternfish', 'eel'];
    const type = types[Math.floor(Math.random() * types.length)];
    const fromRight = Math.random() > 0.3;
    const x = fromRight ? this.state.width + 50 : -50;
    const y = 80 + Math.random() * (this.state.height - 160);
    const enemy = new Enemy(x, y, type, uuidv4());
    if (!fromRight) enemy.velocity.x = Math.abs(enemy.velocity.x);
    this.state.enemies.push(enemy);
  }

  private spawnBoss(): void {
    const types: BossType[] = ['octopus', 'seadragon'];
    const type = types[Math.floor(Math.random() * types.length)];
    const boss = new Boss(this.state.width + 150, this.state.height * 0.5, type, uuidv4());
    this.state.boss = boss;
    this.state.bossActive = true;
    this.state.enemies = this.state.enemies.slice(0, 2);
  }

  private fireBullet(): void {
    const sub = this.state.submarine;
    if (sub.shootCooldown > 0) return;
    sub.shootCooldown = 12;

    const bullet = new Bullet(
      sub.position.x + sub.facing * (sub.width / 2 + 5),
      sub.position.y,
      sub.facing * 10,
      0,
      uuidv4(),
    );
    this.state.bullets.push(bullet);

    for (let i = 0; i < 3; i++) {
      if (this.state.particles.length >= 300) break;
      this.state.particles.push(
        new Particle(
          sub.position.x + sub.facing * (sub.width / 2),
          sub.position.y + (Math.random() - 0.5) * 6,
          sub.facing * (1 + Math.random() * 2),
          (Math.random() - 0.5) * 1,
          12,
          2,
          'rgba(255, 200, 80, ALPHA)',
          'trail',
          uuidv4(),
        ),
      );
    }
  }

  private handleBossAttacks(): void {
    const boss = this.state.boss;
    if (!boss || !boss.active) return;
    const sub = this.state.submarine;

    if (boss.attackTimer <= 0) return;

    if (boss.currentAttack === BossAttackMode.InkBarrage && boss.attackTimer % 8 === 0) {
      for (let i = 0; i < 5; i++) {
        if (this.state.bossProjectiles.length >= 50) break;
        const angle = Math.atan2(
          sub.position.y - boss.position.y,
          sub.position.x - boss.position.x,
        ) + (i - 2) * 0.2;
        const speed = 2.5;
        this.state.bossProjectiles.push(
          new BossProjectile(
            boss.position.x,
            boss.position.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            uuidv4(),
            'ink',
          ),
        );
      }
      if (this.state.particles.length < 290) {
        for (let i = 0; i < 5; i++) {
          this.state.particles.push(
            new Particle(
              boss.position.x,
              boss.position.y,
              (Math.random() - 0.5) * 3,
              (Math.random() - 0.5) * 3,
              25,
              4,
              '',
              'ink',
              uuidv4(),
            ),
          );
        }
      }
    }

    if (boss.currentAttack === BossAttackMode.TentacleSlam) {
      for (const t of boss.tentacles) {
        if (t.slamTimer > 0) {
          t.slamTimer--;
          t.length = 150;
        } else if (boss.attackTimer === 55) {
          t.slamTimer = 30;
        } else {
          t.length = 80 + Math.sin(boss.animFrame * 0.05 + t.angle) * 20;
        }
      }
    }

    if (boss.currentAttack === BossAttackMode.VortexPull) {
      if (boss.attackTimer % 20 === 0 && this.state.bossProjectiles.length < 30) {
        this.state.bossProjectiles.push(
          new BossProjectile(
            boss.position.x,
            boss.position.y,
            0,
            0,
            uuidv4(),
            'vortex',
          ),
        );
      }
      const dx = boss.position.x - sub.position.x;
      const dy = boss.position.y - sub.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1 && dist < 500) {
        const pull = 0.15;
        sub.velocity.x += (dx / dist) * pull;
        sub.velocity.y += (dy / dist) * pull;
      }
    }
  }

  private update(): void {
    if (this.state.gameOver) return;

    const state = this.state;
    state.time++;
    state.scrollOffset += 1;

    const sub = state.submarine;
    const keys = state.keys;

    if (sub.shootCooldown > 0) sub.shootCooldown--;
    if (sub.invincible > 0) sub.invincible--;

    const accel = 0.35;
    const friction = 0.92;
    const maxSpeed = 4.5;

    if (keys['w'] || keys['arrowup']) sub.velocity.y -= accel;
    if (keys['s'] || keys['arrowdown']) sub.velocity.y += accel;
    if (keys['a'] || keys['arrowleft']) {
      sub.velocity.x -= accel;
      sub.facing = -1;
    }
    if (keys['d'] || keys['arrowright']) {
      sub.velocity.x += accel;
      sub.facing = 1;
    }
    if (keys[' ']) this.fireBullet();

    sub.velocity.x *= friction;
    sub.velocity.y *= friction;

    const speed = Math.sqrt(sub.velocity.x ** 2 + sub.velocity.y ** 2);
    if (speed > maxSpeed) {
      sub.velocity.x = (sub.velocity.x / speed) * maxSpeed;
      sub.velocity.y = (sub.velocity.y / speed) * maxSpeed;
    }

    sub.position.x += sub.velocity.x;
    sub.position.y += sub.velocity.y;

    const margin = 30;
    sub.position.x = Math.max(margin, Math.min(state.width - margin, sub.position.x));
    sub.position.y = Math.max(margin, Math.min(state.height - margin, sub.position.y));

    state.depth = Math.max(0, 1000 - Math.round((sub.position.y / state.height) * 1000));

    sub.oxygen -= 0.035;
    if (sub.position.y < state.height * 0.15) {
      sub.oxygen = Math.min(sub.maxOxygen, sub.oxygen + 0.5);
    }
    if (sub.oxygen <= 0) {
      sub.oxygen = 0;
      sub.health -= 0.3;
      if (sub.health <= 0) {
        state.gameOver = true;
      }
    }

    if (state.time - state.lastObstacleSpawn > 300) {
      state.lastObstacleSpawn = state.time;
      this.spawnObstacle();
    }

    if (!state.bossActive && state.time - state.lastEnemySpawn > 120) {
      state.lastEnemySpawn = state.time;
      if (state.enemies.length < 6) this.spawnEnemy();
    }

    if (!state.bossActive && state.time - state.lastBossSpawn > 1200 + Math.random() * 600) {
      state.lastBossSpawn = state.time;
      this.spawnBoss();
    }

    for (const enemy of state.enemies) {
      enemy.update(sub.position.x, sub.position.y);
      if (enemy.position.x < -100 || enemy.position.x > state.width + 100 ||
          enemy.position.y < -100 || enemy.position.y > state.height + 100) {
        enemy.active = false;
      }
    }
    state.enemies = state.enemies.filter((e) => e.active);

    if (state.boss) {
      state.boss.update(sub.position.x, sub.position.y, state.width, state.height);
      this.handleBossAttacks();
    }

    for (const proj of state.bossProjectiles) {
      proj.update();
    }

    for (const bullet of state.bullets) {
      bullet.update();
      if (bullet.position.x < -20 || bullet.position.x > state.width + 20 ||
          bullet.position.y < -20 || bullet.position.y > state.height + 20) {
        bullet.active = false;
      }
    }
    state.bullets = state.bullets.filter((b) => b.active);

    for (const obstacle of state.obstacles) {
      obstacle.update(state.time);
      obstacle.position.x -= 0.8;
      if (obstacle.position.x < -150) obstacle.active = false;
    }
    state.obstacles = state.obstacles.filter((o) => o.active);

    for (const c of state.collectibles) {
      c.update();
      if (c.position.y < -50 || c.position.x < -50 || c.position.x > state.width + 50) {
        c.active = false;
      }
    }
    state.collectibles = state.collectibles.filter((c) => c.active);

    for (const p of state.particles) {
      p.update();
    }
    state.particles = state.particles.filter((p) => p.active);

    if (state.particles.length > 300) {
      state.particles = state.particles.slice(-280);
    }

    updateCollisions(state);

    if (state.screenShake > 0) state.screenShake *= 0.85;
    if (state.screenShake < 0.1) state.screenShake = 0;

    if (sub.relics > this.lastRelicCount) {
      const newCount = sub.relics - this.lastRelicCount;
      for (let i = 0; i < newCount; i++) {
        const idx = (this.lastRelicCount + i) % STORY_FRAGMENTS.length;
        if (!state.storiesUnlocked.includes(STORY_FRAGMENTS[idx])) {
          state.storiesUnlocked.push(STORY_FRAGMENTS[idx]);
          state.pendingStory = STORY_FRAGMENTS[idx];
        }
      }
      this.lastRelicCount = sub.relics;
    }

    if (state.bossActive === false && state.boss === null && this.lastBossRelic !== sub.relics) {
      this.lastBossRelic = sub.relics;
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const state = this.state;
    const { width, height } = state;

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a1a3a');
    grad.addColorStop(0.3, '#0d2a5a');
    grad.addColorStop(0.6, '#1a1a4a');
    grad.addColorStop(1, '#2a0a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(60, 40, 100, 0.4)';
    const trenchOffset = state.scrollOffset * 0.1;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 300 - trenchOffset) % (width + 400)) - 200;
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + 100, height * 0.3);
      ctx.lineTo(x + 150, height * 0.5);
      ctx.lineTo(x + 220, height * 0.25);
      ctx.lineTo(x + 300, height);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(40, 80, 140, 0.3)';
    const midOffset = state.scrollOffset * 0.25;
    for (let i = 0; i < 8; i++) {
      const x = ((i * 180 - midOffset) % (width + 200)) - 100;
      ctx.fillRect(x, height * 0.6 + Math.sin(i) * 30, 100, height * 0.4);
    }

    if (state.time % 3 === 0 && state.particles.length < 290) {
      state.particles.push(
        new Particle(
          Math.random() * width,
          height + 10,
          (Math.random() - 0.5) * 0.3,
          -0.3 - Math.random() * 0.5,
          120 + Math.random() * 80,
          1 + Math.random() * 2.5,
          '',
          'bubble',
          uuidv4(),
        ),
      );
    }

    ctx.fillStyle = 'rgba(255, 255, 180, 0.4)';
    ctx.shadowColor = '#ffff88';
    ctx.shadowBlur = 4;
    const planktonOffset = state.scrollOffset * 0.5;
    for (let i = 0; i < 30; i++) {
      const x = ((i * 73 - planktonOffset) % (width + 100)) - 50;
      const y = (i * 47 + Math.sin(state.time * 0.02 + i) * 20) % height;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.shadowBlur = 0;

    if (state.submarine.position.y < height * 0.18) {
      const lightGrad = ctx.createRadialGradient(
        state.submarine.position.x,
        0,
        0,
        state.submarine.position.x,
        0,
        height * 0.25,
      );
      lightGrad.addColorStop(0, 'rgba(150, 200, 255, 0.25)');
      lightGrad.addColorStop(1, 'rgba(150, 200, 255, 0)');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, width, height * 0.25);
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const state = this.state;

    ctx.save();
    if (state.screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * state.screenShake,
        (Math.random() - 0.5) * state.screenShake,
      );
    }

    this.drawBackground();

    for (const obstacle of state.obstacles) {
      obstacle.draw(ctx, state.time);
    }

    for (const c of state.collectibles) {
      c.draw(ctx);
    }

    for (const enemy of state.enemies) {
      enemy.draw(ctx);
    }

    for (const proj of state.bossProjectiles) {
      proj.draw(ctx);
    }

    if (state.boss && state.boss.active) {
      state.boss.draw(ctx);
    }

    for (const bullet of state.bullets) {
      bullet.draw(ctx);
    }

    if (!state.gameOver) {
      state.submarine.draw(ctx, state.depth);
    }

    for (const p of state.particles) {
      p.draw(ctx);
    }

    if (state.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, state.width, state.height);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 48px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      ctx.fillText('GAME OVER', state.width / 2, state.height / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillText('按 R 键重新开始', state.width / 2, state.height / 2 + 30);
    }

    ctx.restore();
  }
}
