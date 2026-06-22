import {
  Plant, Enemy, Projectile, Particle, UpgradeParticle,
  GRID_COLS, PLANT_LEVELS, PROJECTILE_DURATION, SUNLIGHT_AUTO_INTERVAL,
  SUNLIGHT_AUTO_AMOUNT, SUNLIGHT_KILL_REWARD, HIT_FLASH_DURATION,
  HIT_OPACITY_DURATION, DEATH_PARTICLE_COUNT, DEATH_PARTICLE_DURATION,
  UPGRADE_PARTICLE_COUNT, UPGRADE_PARTICLE_DURATION, SHIELD_COOLDOWN,
  MAX_LEAKS, TOTAL_WAVES, WAVE_INTERVAL, WAVE_TRANSITION_DURATION,
} from './types';
import { EnemyWaveManager } from './EnemyWaveManager';
import { useGameStore, genId } from './PlayerState';

export class GameEngine {
  private waveManager = new EnemyWaveManager();
  private animFrameId: number | null = null;
  private running = false;

  start(): void {
    if (this.running) return;
    this.running = true;
    const store = useGameStore.getState();
    store.startGame();
    this.waveManager.initWave(1, performance.now() / 1000);
    store.updateState({
      waveEnemiesTotal: this.waveManager.getTotalEnemies(),
    });
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now() / 1000;
    const store = useGameStore.getState();
    const lastTime = store.lastFrameTime || now;
    const dt = Math.min(now - lastTime, 0.1);

    this.update(dt, now);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, now: number): void {
    const store = useGameStore.getState();
    const { phase, cellSize } = store;

    if (phase === 'idle' || phase === 'gameOver' || phase === 'victory') {
      store.updateState({ lastFrameTime: now });
      return;
    }

    if (phase === 'waveTransition') {
      const elapsed = now - store.waveTransitionStart;
      if (elapsed >= WAVE_TRANSITION_DURATION) {
        store.updateState({ phase: 'playing', lastFrameTime: now });
        this.waveManager.initWave(store.wave, now);
        store.updateState({ waveEnemiesTotal: this.waveManager.getTotalEnemies() });
        return;
      }
      store.updateState({ lastFrameTime: now });
      return;
    }

    this.updateSunlight(store, now);
    this.spawnEnemies(store, now, cellSize);
    this.updateEnemies(store, dt, now, cellSize);
    this.updatePlantAttacks(store, now, cellSize);
    this.updateProjectiles(store, now, cellSize);
    this.updateEnemyEffects(store, now);
    this.updateShields(store, now);
    this.checkDeadEnemies(store, now, cellSize);
    this.checkLeaks(store, cellSize);
    this.updateParticles(store, now);
    this.updateUpgradeParticles(store, now);
    this.checkWaveProgress(store, now);
    this.cleanup(store, now);
    this.checkGameEnd(store);

    store.updateState({ lastFrameTime: now });
  }

  private updateSunlight(store: ReturnType<typeof useGameStore.getState>, now: number): void {
    if (now - store.lastSunlightTime >= SUNLIGHT_AUTO_INTERVAL) {
      store.addSunlight(SUNLIGHT_AUTO_AMOUNT);
      store.updateState({ lastSunlightTime: now });
    }
  }

  private spawnEnemies(store: ReturnType<typeof useGameStore.getState>, now: number, cellSize: number): void {
    const enemy = this.waveManager.trySpawn(now, cellSize);
    if (enemy) {
      store.addEnemy(enemy);
      store.updateState({ waveEnemiesSpawned: this.waveManager.getSpawnedCount() });
    }
  }

  private updateEnemies(store: ReturnType<typeof useGameStore.getState>, dt: number, _now: number, _cellSize: number): void {
    const enemies = store.enemies;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const newX = enemy.x - enemy.speed * dt;
      store.moveEnemy(enemy.id, newX);
    }
  }

  private updatePlantAttacks(store: ReturnType<typeof useGameStore.getState>, now: number, cellSize: number): void {
    const { plants, enemies } = store;
    for (const plant of plants) {
      if (plant.upgrading) continue;
      if (now - plant.lastAttackTime < plant.attackSpeed) continue;

      const px = plant.gridX * cellSize + cellSize / 2;
      const py = plant.gridY * cellSize + cellSize / 2;
      const rangePixels = plant.range * cellSize;

      let nearestEnemy: Enemy | null = null;
      let nearestDist = Infinity;

      for (const enemy of enemies) {
        if (enemy.dead) continue;
        const dx = enemy.x - px;
        const dy = enemy.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= rangePixels && dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy) {
        const proj: Projectile = {
          id: genId(),
          startX: px,
          startY: py,
          targetX: nearestEnemy.x,
          targetY: nearestEnemy.y,
          startTime: now,
          duration: PROJECTILE_DURATION,
          damage: plant.attackPower,
          targetId: nearestEnemy.id,
          hit: false,
        };
        store.addProjectile(proj);
        store.updateState({
          plants: store.plants.map(p =>
            p.id === plant.id ? { ...p, lastAttackTime: now } : p
          ),
        });
      }
    }
  }

  private updateProjectiles(store: ReturnType<typeof useGameStore.getState>, now: number, _cellSize: number): void {
    const { projectiles, enemies } = store;
    for (const proj of projectiles) {
      if (proj.hit) continue;
      const elapsed = now - proj.startTime;
      if (elapsed >= proj.duration) {
        const target = enemies.find(e => e.id === proj.targetId);
        if (target && !target.dead) {
          if (target.shieldActive && target.variant === 'shield') {
            store.setEnemyShield(target.id, false);
            store.setEnemyFlash(target.id, now);
          } else {
            store.damageEnemy(target.id, proj.damage);
            store.setEnemyFlash(target.id, now);
          }
        }
        store.updateState({
          projectiles: store.projectiles.map(p =>
            p.id === proj.id ? { ...p, hit: true } : p
          ),
        });
      }
    }
  }

  private updateEnemyEffects(store: ReturnType<typeof useGameStore.getState>, now: number): void {
    const { enemies } = store;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      if (enemy.hitFlashTime > 0 && now - enemy.hitFlashTime > HIT_FLASH_DURATION + HIT_OPACITY_DURATION) {
        store.setEnemyOpacity(enemy.id, 1);
      } else if (enemy.hitFlashTime > 0 && now - enemy.hitFlashTime > HIT_FLASH_DURATION) {
        store.setEnemyOpacity(enemy.id, 0.6);
      }
    }
  }

  private updateShields(store: ReturnType<typeof useGameStore.getState>, now: number): void {
    const { enemies } = store;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.variant !== 'shield') continue;
      if (!enemy.shieldActive && now - enemy.lastShieldTime >= SHIELD_COOLDOWN) {
        store.setEnemyShield(enemy.id, true);
      }
    }
  }

  private checkDeadEnemies(store: ReturnType<typeof useGameStore.getState>, now: number, cellSize: number): void {
    const { enemies } = store;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      if (enemy.hp <= 0) {
        store.setEnemyDead(enemy.id, now);
        store.addKill();
        store.addSunlight(SUNLIGHT_KILL_REWARD);
        const particles = this.createDeathParticles(enemy, now, cellSize);
        store.addParticles(particles);
      }
    }
  }

  private createDeathParticles(enemy: Enemy, now: number, _cellSize: number): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / DEATH_PARTICLE_COUNT + Math.random() * 0.5;
      const speed = 40 + Math.random() * 60;
      particles.push({
        id: genId(),
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        createdAt: now,
        duration: DEATH_PARTICLE_DURATION,
        color: enemy.variant === 'shield' ? '#60a5fa' : enemy.variant === 'fast' ? '#fbbf24' : '#ef4444',
        size: 4 + Math.random() * 4,
      });
    }
    return particles;
  }

  private checkLeaks(store: ReturnType<typeof useGameStore.getState>, _cellSize: number): void {
    const { enemies } = store;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      if (enemy.x < -_cellSize) {
        store.removeEnemy(enemy.id);
        store.addLeak();
      }
    }
  }

  private updateParticles(store: ReturnType<typeof useGameStore.getState>, now: number): void {
    const { particles } = store;
    const updated = particles.map(p => {
      const elapsed = now - p.createdAt;
      const t = elapsed / p.duration;
      if (t >= 1) return p;
      return {
        ...p,
        x: p.x + p.vx * 0.016,
        y: p.y + p.vy * 0.016,
      };
    });
    store.updateState({ particles: updated });
  }

  private updateUpgradeParticles(store: ReturnType<typeof useGameStore.getState>, now: number): void {
    const { upgradeParticles } = store;
    const updated = upgradeParticles.map(p => {
      const elapsed = now - p.createdAt;
      const t = elapsed / p.duration;
      if (t >= 1) return p;
      return {
        ...p,
        x: p.x + p.vx * 0.016,
        y: p.y + p.vy * 0.016,
      };
    });
    store.updateState({ upgradeParticles: updated });
  }

  createUpgradeParticles(plant: Plant, cellSize: number): void {
    const store = useGameStore.getState();
    const now = performance.now() / 1000;
    const px = plant.gridX * cellSize + cellSize / 2;
    const py = plant.gridY * cellSize + cellSize / 2;
    const particles: UpgradeParticle[] = [];
    for (let i = 0; i < UPGRADE_PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / UPGRADE_PARTICLE_COUNT;
      const speed = 50 + Math.random() * 40;
      particles.push({
        id: genId(),
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        createdAt: now,
        duration: UPGRADE_PARTICLE_DURATION,
        color: '#ffd700',
        size: 3 + Math.random() * 3,
      });
    }
    store.addUpgradeParticles(particles);
  }

  private checkWaveProgress(store: ReturnType<typeof useGameStore.getState>, now: number): void {
    const { wave, enemies, phase } = store;
    if (phase !== 'playing') return;

    const allSpawned = this.waveManager.isWaveComplete();
    const allEnemiesGone = enemies.every(e => e.dead) || enemies.length === 0;

    if (allSpawned && allEnemiesGone) {
      if (wave >= TOTAL_WAVES) {
        store.updateState({ phase: 'victory' });
      } else {
        store.nextWave();
      }
    }
  }

  private cleanup(store: ReturnType<typeof useGameStore.getState>, _now: number): void {
    store.cleanupEntities();
  }

  private checkGameEnd(store: ReturnType<typeof useGameStore.getState>): void {
    if (store.leaks >= MAX_LEAKS) {
      store.updateState({ phase: 'gameOver' });
    }
  }

  getScore(store: ReturnType<typeof useGameStore.getState>): number {
    return store.kills * 100 + store.sunlight * 10 + store.wave * 200;
  }
}
