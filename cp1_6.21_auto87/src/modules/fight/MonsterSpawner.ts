import Phaser from 'phaser';
import { v4 as uuidv4 } from 'uuid';

export type MonsterType = 'melee' | 'ranged';

export interface MonsterConfig {
  type: MonsterType;
  hp: number;
  speed: number;
  damage: number;
  attackRange: number;
  color: number;
  projectileSpeed: number;
  scoreValue: number;
}

const MELEE_CONFIG: MonsterConfig = {
  type: 'melee',
  hp: 30,
  speed: 80,
  damage: 10,
  attackRange: 60,
  color: 0xaa2222,
  projectileSpeed: 0,
  scoreValue: 50,
};

const RANGED_CONFIG: MonsterConfig = {
  type: 'ranged',
  hp: 20,
  speed: 50,
  damage: 8,
  attackRange: 160,
  color: 0x7722aa,
  projectileSpeed: 300,
  scoreValue: 100,
};

interface MonsterEntity {
  id: string;
  sprite: Phaser.GameObjects.Rectangle;
  type: MonsterType;
  config: MonsterConfig;
  hp: number;
  maxHp: number;
  attackCooldown: number;
  isAlive: boolean;
  animFrame: number;
  animTimer: number;
}

interface Projectile {
  sprite: Phaser.GameObjects.Rectangle;
  velocity: Phaser.Math.Vector2;
  damage: number;
  active: boolean;
}

export class MonsterSpawner {
  private scene: Phaser.Scene;
  private monsters: MonsterEntity[] = [];
  private projectiles: Projectile[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 5000;
  private difficultyMultiplier: number = 1;
  private gameTime: number = 0;
  private playerRef: { x: number; y: number } | null = null;

  public readonly onMonsterKilled = new Phaser.Events.EventEmitter();
  public readonly onMonsterHit = new Phaser.Events.EventEmitter();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setPlayerRef(ref: { x: number; y: number }): void {
    this.playerRef = ref;
  }

  update(delta: number): void {
    this.gameTime += delta;
    this.difficultyMultiplier = 1 + Math.floor(this.gameTime / 30000) * 0.2;

    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnWave();
    }

    this.updateMonsters(delta);
    this.updateProjectiles(delta);
    this.cullExcess();
  }

  private spawnWave(): void {
    const count = Phaser.Math.Between(1, 2);
    for (let i = 0; i < count; i++) {
      this.spawnMonster('melee');
    }
    for (let i = 0; i < count; i++) {
      if (Math.random() < 0.4) {
        this.spawnMonster('ranged');
      }
    }
  }

  private spawnMonster(type: MonsterType): void {
    if (this.monsters.filter(m => m.isAlive).length >= 20) return;

    const config = type === 'melee' ? { ...MELEE_CONFIG } : { ...RANGED_CONFIG };
    config.hp = Math.floor(config.hp * this.difficultyMultiplier);
    config.speed = Math.floor(config.speed * (1 + (this.difficultyMultiplier - 1) * 0.3));

    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side === -1 ? -30 : this.scene.scale.width + 30;
    const y = 520;

    const sprite = this.scene.add.rectangle(x, y, 28, 28, config.color);
    sprite.setOrigin(0.5);
    sprite.setDepth(5);

    const id = uuidv4();
    const entity: MonsterEntity = {
      id,
      sprite,
      type,
      config,
      hp: config.hp,
      maxHp: config.hp,
      attackCooldown: 0,
      isAlive: true,
      animFrame: 0,
      animTimer: 0,
    };

    this.monsters.push(entity);
    this.scene.tweens.add({
      targets: sprite,
      y: y - 4,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private updateMonsters(delta: number): void {
    if (!this.playerRef) return;

    const maxAnimFps = this.getMonsterAnimFps();

    for (const m of this.monsters) {
      if (!m.isAlive) continue;

      m.animTimer += delta;
      if (m.animTimer >= 1000 / maxAnimFps) {
        m.animTimer = 0;
        m.animFrame = (m.animFrame + 1) % 4;
        const bobY = m.animFrame % 2 === 0 ? 0 : -2;
        m.sprite.y += bobY * 0.3;
      }

      const dx = this.playerRef.x - m.sprite.x;
      const dy = this.playerRef.y - m.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (m.type === 'melee') {
        if (dist > m.config.attackRange) {
          const angle = Math.atan2(dy, dx);
          m.sprite.x += Math.cos(angle) * m.config.speed * (delta / 1000);
          m.sprite.y += Math.sin(angle) * m.config.speed * (delta / 1000);
        } else {
          m.attackCooldown -= delta;
          if (m.attackCooldown <= 0) {
            m.attackCooldown = 1200;
            this.onMonsterHit.emit('hit', {
              monsterId: m.id,
              damage: m.config.damage,
              type: 'melee',
            });
          }
        }
      } else if (m.type === 'ranged') {
        if (dist < 120) {
          const angle = Math.atan2(dy, dx);
          m.sprite.x -= Math.cos(angle) * m.config.speed * (delta / 1000);
        } else if (dist > 200) {
          const angle = Math.atan2(dy, dx);
          m.sprite.x += Math.cos(angle) * m.config.speed * 0.5 * (delta / 1000);
        }

        m.attackCooldown -= delta;
        if (m.attackCooldown <= 0) {
          m.attackCooldown = 2000;
          this.fireProjectile(m);
        }
      }

      m.sprite.setScale(dx < 0 ? -1 : 1, 1);
    }
  }

  private fireProjectile(m: MonsterEntity): void {
    if (!this.playerRef) return;

    const proj = this.scene.add.rectangle(m.sprite.x, m.sprite.y - 8, 8, 8, 0xcc44ff);
    proj.setDepth(6);

    const dx = this.playerRef.x - m.sprite.x;
    const dy = this.playerRef.y - m.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const vx = (dx / dist) * m.config.projectileSpeed;
    const vy = (dy / dist) * m.config.projectileSpeed;

    this.projectiles.push({
      sprite: proj,
      velocity: new Phaser.Math.Vector2(vx, vy),
      damage: m.config.damage,
      active: true,
    });
  }

  private updateProjectiles(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      p.sprite.x += p.velocity.x * (delta / 1000);
      p.sprite.y += p.velocity.y * (delta / 1000);

      if (p.sprite.x < -50 || p.sprite.x > this.scene.scale.width + 50 ||
          p.sprite.y < -50 || p.sprite.y > this.scene.scale.height + 50) {
        p.sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      if (this.playerRef) {
        const dx = p.sprite.x - this.playerRef.x;
        const dy = p.sprite.y - this.playerRef.y;
        if (Math.sqrt(dx * dx + dy * dy) < 24) {
          this.onMonsterHit.emit('hit', {
            monsterId: '',
            damage: p.damage,
            type: 'ranged',
          });
          p.sprite.destroy();
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  damageMonster(id: string, damage: number): boolean {
    const m = this.monsters.find(mon => mon.id === id && mon.isAlive);
    if (!m) return false;

    m.hp -= damage;

    this.scene.tweens.add({
      targets: m.sprite,
      alpha: 0.4,
      duration: 60,
      yoyo: true,
    });

    if (m.hp <= 0) {
      this.killMonster(m);
      return true;
    }
    return false;
  }

  private killMonster(m: MonsterEntity): void {
    m.isAlive = false;

    this.scene.tweens.add({
      targets: m.sprite,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        m.sprite.destroy();
      },
    });

    this.showScorePopup(m.sprite.x, m.sprite.y, m.config.scoreValue);

    this.onMonsterKilled.emit('killed', {
      id: m.id,
      type: m.type,
      score: m.config.scoreValue,
      x: m.sprite.x,
      y: m.sprite.y,
    });
  }

  private showScorePopup(x: number, y: number, score: number): void {
    const text = this.scene.add.text(x, y - 20, `+${score}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(20);

    this.scene.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      duration: 1500,
      ease: 'Power1',
      onComplete: () => {
        text.destroy();
      },
    });
  }

  private cullExcess(): void {
    const aliveCount = this.monsters.filter(m => m.isAlive).length;
    if (aliveCount > 15) {
      const spawnRate = this.spawnInterval;
      this.spawnInterval = Math.max(3000, spawnRate * 0.9);
    }
  }

  getMonsterAnimFps(): number {
    const aliveCount = this.monsters.filter(m => m.isAlive).length;
    return aliveCount > 15 ? 15 : 30;
  }

  shouldReduceParticles(): boolean {
    return this.monsters.filter(m => m.isAlive).length > 15;
  }

  getAliveMonsters(): MonsterEntity[] {
    return this.monsters.filter(m => m.isAlive);
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  getMonsterAt(x: number, y: number, range: number): MonsterEntity | null {
    let closest: MonsterEntity | null = null;
    let closestDist = range;
    for (const m of this.monsters) {
      if (!m.isAlive) continue;
      const dx = m.sprite.x - x;
      const dy = m.sprite.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = m;
      }
    }
    return closest;
  }

  getMonstersInRange(x: number, y: number, range: number): MonsterEntity[] {
    return this.monsters.filter(m => {
      if (!m.isAlive) return false;
      const dx = m.sprite.x - x;
      const dy = m.sprite.y - y;
      return Math.sqrt(dx * dx + dy * dy) < range;
    });
  }

  destroy(): void {
    for (const m of this.monsters) {
      if (m.sprite && m.sprite.active) m.sprite.destroy();
    }
    for (const p of this.projectiles) {
      if (p.sprite && p.sprite.active) p.sprite.destroy();
    }
    this.monsters = [];
    this.projectiles = [];
  }
}
