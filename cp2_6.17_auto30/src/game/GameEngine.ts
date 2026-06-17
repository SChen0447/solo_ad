import { Player, Bullet, BulletConfig } from './Player';
import { EnemyWave, WaveType } from './EnemyWave';

export interface Star {
  x: number;
  y: number;
  radius: number;
  brightness: number;
  speed: number;
}

export interface GameStats {
  score: number;
  enemiesDestroyed: number;
  lives: number;
  gameOver: boolean;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  player: Player;
  bullets: Bullet[] = [];
  waves: EnemyWave[] = [];
  stars: Star[] = [];
  bulletConfig: BulletConfig;
  score: number = 0;
  enemiesDestroyed: number = 0;
  gameOver: boolean = false;
  running: boolean = false;
  lastTime: number = 0;
  animationId: number = 0;
  waveIndex: number = 0;
  waveSpawnTimer: number = 0;
  waveSpawnInterval: number = 5000;
  waveTypes: WaveType[] = ['line', 'v', 'diamond'];
  onStatsChange?: (stats: GameStats) => void;
  mouseX: number;
  mouseY: number;

  constructor(canvas: HTMLCanvasElement, bulletConfig: BulletConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.bulletConfig = bulletConfig;
    this.player = new Player(this.width / 2, this.height - 80);
    this.mouseX = this.width / 2;
    this.mouseY = this.height - 80;
    this.initStars();
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.5,
        speed: 0.5
      });
    }
  }

  setBulletConfig(config: BulletConfig) {
    this.bulletConfig = config;
  }

  setMousePosition(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  reset() {
    this.stop();
    this.player = new Player(this.width / 2, this.height - 80);
    this.bullets = [];
    this.waves = [];
    this.score = 0;
    this.enemiesDestroyed = 0;
    this.gameOver = false;
    this.waveIndex = 0;
    this.waveSpawnTimer = 0;
    this.initStars();
    this.emitStats();
  }

  emitStats() {
    if (this.onStatsChange) {
      this.onStatsChange({
        score: this.score,
        enemiesDestroyed: this.enemiesDestroyed,
        lives: this.player.lives,
        gameOver: this.gameOver
      });
    }
  }

  loop = () => {
    if (!this.running) return;
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 32);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    this.animationId = requestAnimationFrame(this.loop);
  };

  update(deltaTime: number) {
    if (this.gameOver) return;

    for (const star of this.stars) {
      star.y += star.speed * (deltaTime / 16);
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }

    this.player.setTarget(this.mouseX, this.mouseY);
    this.player.update(deltaTime, this.width, this.height);

    if (this.player.canShoot()) {
      const newBullets = this.player.shoot(this.bulletConfig);
      this.bullets.push(...newBullets);
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * (deltaTime / 16);
      b.y += b.vy * (deltaTime / 16);
      if (b.x < -10 || b.x > this.width + 10 || b.y < -10 || b.y > this.height + 10) {
        this.bullets.splice(i, 1);
      }
    }

    this.waveSpawnTimer += deltaTime;
    if (this.waveSpawnTimer >= this.waveSpawnInterval || this.waves.length === 0) {
      this.waveSpawnTimer = 0;
      const waveType = this.waveTypes[this.waveIndex % this.waveTypes.length];
      this.waves.push(new EnemyWave(waveType, this.width));
      this.waveIndex++;
    }

    for (const wave of this.waves) {
      wave.update(deltaTime, this.height);
    }

    this.waves = this.waves.filter(w => !w.isCompletelyOffScreen(this.height));

    this.checkCollisions();

    if (!this.player.isAlive()) {
      this.gameOver = true;
      this.emitStats();
    }
  }

  checkCollisions() {
    for (const wave of this.waves) {
      for (let ei = 0; ei < wave.enemies.length; ei++) {
        const enemy = wave.enemies[ei];
        if (!enemy.alive || !enemy.spawned) continue;

        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
          const bullet = this.bullets[bi];
          const dx = bullet.x - enemy.x;
          const dy = bullet.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < enemy.size / 2 + bullet.radius) {
            this.bullets.splice(bi, 1);
            if (wave.hitEnemy(ei)) {
              this.score += 100;
              this.enemiesDestroyed++;
              this.emitStats();
            }
            break;
          }
        }

        if (enemy.alive && !this.player.losingLife) {
          const dx = this.player.x - enemy.x;
          const dy = this.player.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < enemy.size / 2 + this.player.size / 2 - 5) {
            if (this.player.hit()) {
              this.emitStats();
            }
          }
        }
      }
    }
  }

  draw() {
    const ctx = this.ctx;

    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      ctx.save();
      ctx.globalAlpha = star.brightness;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const wave of this.waves) {
      wave.draw(ctx);
    }

    for (const bullet of this.bullets) {
      this.drawBullet(ctx, bullet);
    }

    this.player.draw(ctx);

    this.drawHUD(ctx);
  }

  drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet) {
    ctx.save();
    ctx.fillStyle = bullet.color;
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 8;
    ctx.translate(bullet.x, bullet.y);

    switch (bullet.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, bullet.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'star':
        this.drawStar(ctx, 0, 0, 5, bullet.radius * 2.5, bullet.radius);
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -bullet.radius * 2);
        ctx.lineTo(bullet.radius * 1.5, 0);
        ctx.lineTo(0, bullet.radius * 2);
        ctx.lineTo(-bullet.radius * 1.5, 0);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  drawHUD(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = '18px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 4;

    const scoreText = `分数: ${this.score}`;
    ctx.strokeText(scoreText, 15, 15);
    ctx.fillText(scoreText, 15, 15);

    ctx.shadowBlur = 0;
    for (let i = 0; i < this.player.maxLives; i++) {
      const x = 15 + i * 24;
      const y = 45;
      const active = i < this.player.lives;
      this.drawHeart(ctx, x, y, 16, active ? '#ff3366' : '#444444');
    }

    ctx.restore();
  }

  drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = color !== '#444444' ? 4 : 0;
    const s = size / 2;
    ctx.beginPath();
    ctx.moveTo(x + s, y + s * 0.3);
    ctx.bezierCurveTo(x + s, y, x, y, x, y + s * 0.3);
    ctx.bezierCurveTo(x, y + s * 0.7, x + s, y + s, x + s, y + s * 1.2);
    ctx.bezierCurveTo(x + s, y + s, x + s * 2, y + s * 0.7, x + s * 2, y + s * 0.3);
    ctx.bezierCurveTo(x + s * 2, y, x + s, y, x + s, y + s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
