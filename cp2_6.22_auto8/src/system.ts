import { Weapon, EnergyGun, MissileLauncher, Shotgun, ProjectileData } from './weapons';

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  color: string;
  flashTimer: number;
  dead: boolean;
  fragments: EnemyFragment[];
  fragmentTimer: number;
}

export interface EnemyFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
}

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
}

export interface RenderData {
  projectiles: ProjectileData[];
  enemies: Enemy[];
  explosionParticles: ExplosionParticle[];
  mechaX: number;
  mechaY: number;
  mechaAngle: number;
  currentWeaponIndex: number;
  weapons: Weapon[];
  switchAnimProgress: number;
}

const MAX_PROJECTILES = 50;
const MAX_ENEMIES = 20;
const ENEMY_SPAWN_INTERVAL = 2;
const COLLISION_RADIUS = 25;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export class WeaponSystem {
  weapons: Weapon[];
  currentWeaponIndex: number = 0;
  projectiles: ProjectileData[] = [];
  enemies: Enemy[] = [];
  explosionParticles: ExplosionParticle[] = [];
  mechaX: number = CANVAS_WIDTH / 2;
  mechaY: number = CANVAS_HEIGHT - 60;
  mechaAngle: number = 0;
  enemySpawnTimer: number = 0;
  switchAnimProgress: number = 1;
  switchAnimTimer: number = 0;

  constructor() {
    this.weapons = [
      new EnergyGun(),
      new MissileLauncher(),
      new Shotgun(),
    ];
  }

  get currentWeapon(): Weapon {
    return this.weapons[this.currentWeaponIndex];
  }

  switchWeapon(index: number): void {
    if (index < 0 || index >= this.weapons.length) return;
    if (index === this.currentWeaponIndex) return;
    this.currentWeaponIndex = index;
    this.weapons.forEach(w => w.resetSwitchDelay());
    this.switchAnimProgress = 0;
    this.switchAnimTimer = 0.2;
  }

  fire(targetX: number, targetY: number): void {
    const muzzleOffset = 20;
    const muzzleX = this.mechaX + Math.cos(this.mechaAngle) * muzzleOffset;
    const muzzleY = this.mechaY + Math.sin(this.mechaAngle) * muzzleOffset;
    const newProjectiles = this.currentWeapon.fire(muzzleX, muzzleY, targetX, targetY);
    this.projectiles.push(...newProjectiles);
    if (this.projectiles.length > MAX_PROJECTILES) {
      this.projectiles = this.projectiles.slice(-MAX_PROJECTILES);
    }
  }

  updateMechaAngle(mouseX: number, mouseY: number): void {
    this.mechaAngle = Math.atan2(mouseY - this.mechaY, mouseX - this.mechaX);
  }

  update(dt: number): void {
    this.weapons.forEach(w => w.update(dt));

    if (this.switchAnimTimer > 0) {
      this.switchAnimTimer -= dt;
      const t = 1 - this.switchAnimTimer / 0.2;
      this.switchAnimProgress = this.easeOut(t);
      if (this.switchAnimTimer <= 0) {
        this.switchAnimProgress = 1;
      }
    }

    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateExplosionParticles(dt);
    this.spawnEnemies(dt);
    this.checkCollisions();
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime += dt;

      if (p.type === 'beam') {
        if (p.lifetime >= p.maxLifetime) {
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'missile') {
        const gravity = 200;
        p.vy += gravity * dt;
      }

      if (p.type === 'pellet') {
        const dist = Math.sqrt(
          (p.x - p.startX) ** 2 + (p.y - p.startY) ** 2
        );
        if (dist >= 600) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (
        p.lifetime >= p.maxLifetime ||
        p.x < -50 || p.x > CANVAS_WIDTH + 50 ||
        p.y < -50 || p.y > CANVAS_HEIGHT + 50
      ) {
        if (p.type === 'missile') {
          this.createExplosion(p.x, p.y);
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.flashTimer > 0) {
        e.flashTimer -= dt;
      }

      if (e.dead) {
        e.fragmentTimer -= dt;
        for (let j = e.fragments.length - 1; j >= 0; j--) {
          const f = e.fragments[j];
          f.lifetime += dt;
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.vy += 300 * dt;
          if (f.lifetime >= f.maxLifetime) {
            e.fragments.splice(j, 1);
          }
        }
        if (e.fragmentTimer <= 0) {
          this.enemies.splice(i, 1);
        }
        continue;
      }

      e.x -= e.speed * dt;

      if (e.x + e.width < 0) {
        this.enemies.splice(i, 1);
      }
    }
  }

  private updateExplosionParticles(dt: number): void {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.lifetime += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      if (p.lifetime >= p.maxLifetime) {
        this.explosionParticles.splice(i, 1);
      }
    }
  }

  private spawnEnemies(dt: number): void {
    this.enemySpawnTimer += dt;
    if (this.enemySpawnTimer >= ENEMY_SPAWN_INTERVAL) {
      this.enemySpawnTimer -= ENEMY_SPAWN_INTERVAL;
      const activeEnemies = this.enemies.filter(e => !e.dead).length;
      if (activeEnemies >= MAX_ENEMIES) return;
      const count = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        if (this.enemies.filter(e => !e.dead).length >= MAX_ENEMIES) break;
        const speed = 60 + Math.random() * 60;
        const hp = 30 + Math.random() * 40;
        const greenVal = Math.floor(0xcc + Math.random() * (0xff - 0xcc));
        const color = `#00${greenVal.toString(16).padStart(2, '0')}00`;
        this.enemies.push({
          x: CANVAS_WIDTH + Math.random() * 100,
          y: 50 + Math.random() * (CANVAS_HEIGHT - 150),
          width: 40,
          height: 60,
          hp,
          maxHp: hp,
          speed,
          color,
          flashTimer: 0,
          dead: false,
          fragments: [],
          fragmentTimer: 0,
        });
      }
    }
  }

  private checkCollisions(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.type === 'beam') {
        const angle = Math.atan2(
          this.mechaY - p.startY,
          this.mechaX - p.startX
        );
        const beamAngle = angle + Math.PI;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const ecx = e.x + e.width / 2;
          const ecy = e.y + e.height / 2;
          const dx = ecx - p.startX;
          const dy = ecy - p.startY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angleToEnemy = Math.atan2(dy, dx);
          let angleDiff = angleToEnemy - beamAngle;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
          if (Math.abs(angleDiff) < 0.1 && dist < 800) {
            const perpDist = Math.abs(Math.sin(angleDiff) * dist);
            if (perpDist < COLLISION_RADIUS) {
              this.damageEnemy(e, p.damage);
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
        continue;
      }

      for (const e of this.enemies) {
        if (e.dead) continue;
        const ecx = e.x + e.width / 2;
        const ecy = e.y + e.height / 2;
        const dx = p.x - ecx;
        const dy = p.y - ecy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < COLLISION_RADIUS) {
          this.damageEnemy(e, p.damage);
          if (p.type === 'missile') {
            this.createExplosion(p.x, p.y);
          }
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    enemy.hp -= damage;
    enemy.flashTimer = 0.2;
    if (enemy.hp <= 0) {
      enemy.dead = true;
      enemy.fragmentTimer = 0.5;
      enemy.fragments = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
        const speed = 100 + Math.random() * 200;
        const size = 5 + Math.random() * 10;
        enemy.fragments.push({
          x: enemy.x + enemy.width / 2,
          y: enemy.y + enemy.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 50,
          size,
          color: enemy.color,
          lifetime: 0,
          maxLifetime: 0.5,
        });
      }
    }
  }

  private createExplosion(x: number, y: number): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
      const speed = 50 + Math.random() * 100;
      const size = 5 + Math.random() * 10;
      const r = 0xff;
      const g = Math.floor(0x33 + Math.random() * (0x66 - 0x33));
      const color = `#${r.toString(16)}${g.toString(16).padStart(2, '0')}00`;
      this.explosionParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color,
        lifetime: 0,
        maxLifetime: 0.8,
      });
    }
  }

  getRenderData(): RenderData {
    return {
      projectiles: [...this.projectiles],
      enemies: [...this.enemies],
      explosionParticles: [...this.explosionParticles],
      mechaX: this.mechaX,
      mechaY: this.mechaY,
      mechaAngle: this.mechaAngle,
      currentWeaponIndex: this.currentWeaponIndex,
      weapons: this.weapons,
      switchAnimProgress: this.switchAnimProgress,
    };
  }
}
