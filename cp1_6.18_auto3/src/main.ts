import { ParticleSystem } from './particles';
import { UIManager } from './ui';
import { Ship } from './ship';
import {
  Planet,
  FlyingOre,
  Asteroid,
  Enemy,
  EnemyBullet,
  createPlanet,
  createFlyingOre,
  createAsteroid,
  createEnemy,
  updatePlanets,
  updateFlyingOres,
  updateAsteroids,
  updateEnemies,
  renderPlanet,
  renderFlyingOre,
  renderAsteroid,
  renderEnemy,
  renderEnemyBullet,
} from './planet';

interface GameState {
  running: boolean;
  planets: Planet[];
  flyingOres: FlyingOre[];
  asteroids: Asteroid[];
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  asteroidTimer: number;
  enemyTimer: number;
  difficulty: number;
  fuelDrainRate: number;
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private ensureCtx(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      this.enabled = false;
      return null;
    }
  }

  play(type: 'laser' | 'collect' | 'hit' | 'explosion' | 'fuel'): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'laser':
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      case 'collect':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'fuel':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.08);
        osc.frequency.setValueAtTime(784, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'explosion':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
    }
  }
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private particles!: ParticleSystem;
  private ui!: UIManager;
  private ship!: Ship;
  private audio: AudioManager = new AudioManager();

  private keys: Record<string, boolean> = {};
  private state!: GameState;
  private lastTime: number = 0;
  private rafId: number = 0;
  private started: boolean = false;

  private startScreen!: HTMLElement;
  private startBtn!: HTMLElement;
  private gameOverScreen!: HTMLElement;
  private restartBtn!: HTMLElement;
  private finalScoreEl!: HTMLElement;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.startScreen = document.getElementById('start-screen')!;
    this.startBtn = document.getElementById('start-btn')!;
    this.gameOverScreen = document.getElementById('game-over')!;
    this.restartBtn = document.getElementById('restart-btn')!;
    this.finalScoreEl = document.getElementById('final-score')!;

    this.resize();
    this.bindEvents();
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.particles) this.particles.resize(w, h);
    if (this.ui) this.ui.resize(w, h);
    if (this.ship) this.ship.resize(w, h);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    const mobileBtns = document.querySelectorAll<HTMLElement>('.control-btn');
    mobileBtns.forEach((btn) => {
      const key = btn.dataset.key;
      if (!key) return;
      const handleStart = (e: Event) => {
        e.preventDefault();
        this.keys[key] = true;
      };
      const handleEnd = (e: Event) => {
        e.preventDefault();
        this.keys[key] = false;
      };
      btn.addEventListener('touchstart', handleStart, { passive: false });
      btn.addEventListener('touchend', handleEnd, { passive: false });
      btn.addEventListener('touchcancel', handleEnd, { passive: false });
      btn.addEventListener('mousedown', handleStart);
      btn.addEventListener('mouseup', handleEnd);
      btn.addEventListener('mouseleave', handleEnd);
    });

    this.startBtn.addEventListener('click', () => this.startGame());
    this.restartBtn.addEventListener('click', () => this.startGame());
  }

  private initGame(): void {
    this.particles = new ParticleSystem(this.width, this.height);
    this.ui = new UIManager(this.width, this.height);
    this.ship = new Ship(this.width / 2, this.height / 2, this.width, this.height);

    const planets: Planet[] = [];
    const planetCount = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < planetCount; i++) {
      planets.push(createPlanet(this.width, this.height, planets));
    }

    this.state = {
      running: true,
      planets,
      flyingOres: [],
      asteroids: [],
      enemies: [],
      enemyBullets: [],
      asteroidTimer: 2.5,
      enemyTimer: 12,
      difficulty: 1,
      fuelDrainRate: 1.2,
    };
  }

  private startGame(): void {
    this.initGame();
    this.startScreen.style.display = 'none';
    this.gameOverScreen.style.display = 'none';
    if (!this.started) {
      this.started = true;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  private gameOver(): void {
    this.state.running = false;
    this.finalScoreEl.textContent = this.ui.getScore().toString();
    this.gameOverScreen.style.display = 'flex';
    this.audio.play('explosion');
    this.particles.spawnExplosion(this.ship.x, this.ship.y, '#42a5f5', 40);
  }

  private spawnContent(dt: number): void {
    this.state.difficulty += dt * 0.015;

    this.state.asteroidTimer -= dt;
    if (this.state.asteroidTimer <= 0) {
      this.state.asteroids.push(createAsteroid(this.width, this.height));
      if (this.state.difficulty > 1.5 && Math.random() < 0.4) {
        this.state.asteroids.push(createAsteroid(this.width, this.height));
      }
      this.state.asteroidTimer = Math.max(0.8, 3.5 - this.state.difficulty * 0.4);
    }

    this.state.enemyTimer -= dt;
    if (this.state.enemyTimer <= 0 && this.state.enemies.length < 3) {
      this.state.enemies.push(createEnemy(this.width, this.height));
      this.state.enemyTimer = Math.max(8, 18 - this.state.difficulty * 1.5);
    }
  }

  private handleShipDamage(reason: string): void {
    const lives = this.ui.getLives() - 1;
    this.ui.setLives(lives);
    this.ship.setInvincible(1.8);
    this.audio.play('hit');
    this.particles.spawnExplosion(this.ship.x, this.ship.y, '#ef5350', 25);

    if (lives <= 0) {
      this.gameOver();
      return;
    }

    if (reason === 'asteroid' || reason === 'planet') {
      this.ship.bounce(
        this.ship.x - this.width / 2,
        this.ship.y - this.height / 2
      );
    }
  }

  private update(dt: number): void {
    if (!this.state.running) {
      this.particles.update(dt);
      return;
    }

    const fuelAvailable = !this.ui.isFuelEmpty();
    this.ui.consumeFuel(this.state.fuelDrainRate * dt);

    if (this.ui.isFuelEmpty()) {
      if (this.state.running && Math.random() < dt * 0.5) {
        this.handleShipDamage('fuel');
      }
    }

    this.ship.update(dt, this.keys, fuelAvailable, (x, y, angle) => {
      this.particles.spawnTrail(x, y, angle);
    });

    if (this.keys['Space']) {
      const before = this.ship.lasers.length;
      this.ship.shoot();
      if (this.ship.lasers.length > before) this.audio.play('laser');
    }

    updatePlanets(this.state.planets, dt);

    const flyingResult = updateFlyingOres(this.state.flyingOres, dt);
    for (const o of flyingResult.collected) {
      if (o.type.isFuel) {
        this.ui.addFuel(25);
        this.audio.play('fuel');
      } else {
        this.ui.addScore(this.ship.x, this.ship.y - 30, o.type.score, o.type.color);
        this.audio.play('collect');
      }
      this.particles.spawnCollect(this.ship.x, this.ship.y, o.type.color);
    }

    updateAsteroids(this.state.asteroids, this.width, this.height, dt);

    updateEnemies(
      this.state.enemies,
      this.state.enemyBullets,
      this.ship.x,
      this.ship.y,
      this.width,
      this.height,
      dt
    );

    this.spawnContent(dt);

    const hits = this.ship.checkLaserHits(this.state.planets, this.state.asteroids, this.state.enemies);
    for (const { laser, result } of hits) {
      if (result.hitOre && result.hitPlanet) {
        const ore = result.hitOre;
        ore.hp -= 1;
        const ox = result.hitPlanet.x + Math.cos(ore.angle + result.hitPlanet.rotation) * ore.orbitRadius;
        const oy = result.hitPlanet.y + Math.sin(ore.angle + result.hitPlanet.rotation) * ore.orbitRadius;
        this.particles.spawnExplosion(ox, oy, ore.type.color, 6);
        if (ore.hp <= 0) {
          ore.collected = true;
          this.state.flyingOres.push(createFlyingOre(ore, result.hitPlanet.x, result.hitPlanet.y, this.ship.x, this.ship.y));
        }
      } else if (result.hitAsteroid) {
        const a = result.hitAsteroid;
        const idx = this.state.asteroids.indexOf(a);
        if (idx >= 0) {
          a.radius -= 8;
          if (a.radius < 10) {
            this.state.asteroids.splice(idx, 1);
            this.particles.spawnExplosion(a.x, a.y, '#8d6e63', 18);
            this.audio.play('explosion');
            this.ui.addScore(a.x, a.y - 10, 30, '#8d6e63');
          } else {
            this.particles.spawnExplosion(laser.x, laser.y, '#a1887f', 6);
          }
        }
      } else if (result.hitEnemy) {
        const e = result.hitEnemy;
        e.hp -= 1;
        this.particles.spawnExplosion(laser.x, laser.y, '#ef5350', 8);
        if (e.hp <= 0) {
          const idx = this.state.enemies.indexOf(e);
          if (idx >= 0) this.state.enemies.splice(idx, 1);
          this.particles.spawnExplosion(e.x, e.y, '#ef5350', 25);
          this.audio.play('explosion');
          this.ui.addScore(e.x, e.y - 10, 150, '#ef5350');
        }
      }
    }

    const collision = this.ship.checkCollisions(
      this.state.planets,
      this.state.asteroids,
      this.state.enemies,
      this.state.enemyBullets
    );
    if (collision) {
      if (collision.hitAsteroid) {
        const idx = this.state.asteroids.indexOf(collision.hitAsteroid);
        if (idx >= 0) {
          const a = collision.hitAsteroid;
          this.ship.bounce(this.ship.x - a.x, this.ship.y - a.y);
        }
        this.handleShipDamage('asteroid');
      } else if (collision.hitPlanet) {
        const p = collision.hitPlanet;
        this.ship.bounce(this.ship.x - p.x, this.ship.y - p.y);
        this.handleShipDamage('planet');
      } else if (collision.hitEnemy) {
        this.handleShipDamage('enemy');
      } else if (collision.hitBullet) {
        this.handleShipDamage('bullet');
      }
    }

    let totalActiveOres = 0;
    for (const p of this.state.planets) {
      for (const ore of p.ores) {
        if (!ore.collected) totalActiveOres++;
      }
    }
    if (totalActiveOres < 5 && this.state.planets.length < 7) {
      if (Math.random() < dt * 0.15) {
        this.state.planets.push(createPlanet(this.width, this.height, this.state.planets));
      }
    }

    this.ui.update(dt);
    this.particles.update(dt);
  }

  private render(): void {
    const ctx = this.ctx;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#050818');
    bgGrad.addColorStop(0.5, '#0a0e27');
    bgGrad.addColorStop(1, '#121845');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    this.particles.render(ctx);

    for (const p of this.state.planets) {
      renderPlanet(ctx, p);
    }

    for (const a of this.state.asteroids) {
      renderAsteroid(ctx, a);
    }

    for (const o of this.state.flyingOres) {
      renderFlyingOre(ctx, o);
    }

    for (const b of this.state.enemyBullets) {
      renderEnemyBullet(ctx, b);
    }

    for (const e of this.state.enemies) {
      renderEnemy(ctx, e);
    }

    this.ship.render(ctx);

    this.ui.render(ctx);
  }

  private loop = (time: number): void => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new Game();
  } catch (err) {
    console.error('Game failed to initialize:', err);
  }
});
