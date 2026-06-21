import { Player, Bullet, Obstacle, Pickup, Particle, SkillEffect, SkillType, PickupType, Team } from './entities';
import { aabbCollide } from './renderer';
import { soundManager } from './sound';

export class Game {
  gridCols: number = 3;
  gridRows: number = 3;
  
  players: Player[] = [];
  bullets: Bullet[] = [];
  obstacles: Obstacle[] = [];
  pickups: Pickup[] = [];
  particles: Particle[] = [];
  skillEffects: SkillEffect[] = [];
  
  pickupTimer: number = 0;
  pickupInterval: number = 8000;
  
  gameOver: boolean = false;
  winner: 'red' | 'blue' | 'draw' | null = null;
  
  private cellSize: number = 100;
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;

  constructor() {
    this.init();
  }

  init(): void {
    this.players = [];
    this.bullets = [];
    this.obstacles = [];
    this.pickups = [];
    this.particles = [];
    this.skillEffects = [];
    this.pickupTimer = 0;
    this.gameOver = false;
    this.winner = null;
    
    const bluePlayer = new Player(0, 1, 'blue');
    bluePlayer.direction = 0;
    this.players.push(bluePlayer);
    
    const redPlayer = new Player(2, 1, 'red');
    redPlayer.direction = Math.PI;
    this.players.push(redPlayer);
    
    this.generateObstacles();
  }

  setGridParams(cellSize: number, offsetX: number, offsetY: number): void {
    this.cellSize = cellSize;
    this.gridOffsetX = offsetX;
    this.gridOffsetY = offsetY;
  }

  private generateObstacles(): void {
    const obstaclePositions: [number, number][] = [
      [1, 0],
      [1, 2]
    ];
    
    for (const [gx, gy] of obstaclePositions) {
      this.obstacles.push(new Obstacle(gx, gy));
    }
  }

  update(deltaTime: number): void {
    if (this.gameOver) return;
    
    for (const player of this.players) {
      player.update(deltaTime);
    }
    
    this.updateBullets(deltaTime);
    this.updateSkillEffects(deltaTime);
    this.updateObstacles(deltaTime);
    this.updatePickups(deltaTime);
    this.updateParticles(deltaTime);
    this.updatePickupSpawn(deltaTime);
    
    this.checkCollisions();
    this.checkGameOver();
  }

  private updateBullets(deltaTime: number): void {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      bullet.update(deltaTime);
      
      const gridX = Math.floor((bullet.x - this.gridOffsetX) / this.cellSize);
      const gridY = Math.floor((bullet.y - this.gridOffsetY) / this.cellSize);
      
      if (gridX < 0 || gridX >= this.gridCols || gridY < 0 || gridY >= this.gridRows) {
        bullet.active = false;
      }
    }
    
    this.bullets = this.bullets.filter(b => b.active);
  }

  private updateSkillEffects(deltaTime: number): void {
    for (const effect of this.skillEffects) {
      effect.update(deltaTime);
    }
    
    this.skillEffects = this.skillEffects.filter(e => e.active);
  }

  private updateObstacles(deltaTime: number): void {
    for (const obstacle of this.obstacles) {
      if (obstacle.destroyed) {
        for (const debris of obstacle.debris) {
          debris.update(deltaTime, 400);
        }
        obstacle.debris = obstacle.debris.filter(d => d.life > 0);
      }
    }
  }

  private updatePickups(deltaTime: number): void {
    for (const pickup of this.pickups) {
      pickup.update(deltaTime);
      
      if (pickup.collected) {
        for (const particle of pickup.pickupEffect) {
          particle.update(deltaTime, 500);
        }
        pickup.pickupEffect = pickup.pickupEffect.filter(p => p.life > 0);
      }
    }
    
    this.pickups = this.pickups.filter(p => !p.collected || p.pickupEffect.length > 0);
  }

  private updateParticles(deltaTime: number): void {
    for (const particle of this.particles) {
      particle.update(deltaTime, 300);
    }
    
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updatePickupSpawn(deltaTime: number): void {
    this.pickupTimer += deltaTime;
    
    if (this.pickupTimer >= this.pickupInterval) {
      this.pickupTimer = 0;
      this.spawnPickup();
    }
  }

  private spawnPickup(): void {
    const availableCells: [number, number][] = [];
    
    for (let x = 0; x < this.gridCols; x++) {
      for (let y = 0; y < this.gridRows; y++) {
        let occupied = false;
        
        for (const player of this.players) {
          if (player.gridX === x && player.gridY === y && !player.isDead) {
            occupied = true;
            break;
          }
        }
        
        if (!occupied) {
          for (const obstacle of this.obstacles) {
            if (obstacle.gridX === x && obstacle.gridY === y && !obstacle.destroyed) {
              occupied = true;
              break;
            }
          }
        }
        
        if (!occupied) {
          for (const pickup of this.pickups) {
            if (!pickup.collected && pickup.gridX === x && pickup.gridY === y) {
              occupied = true;
              break;
            }
          }
        }
        
        if (!occupied) {
          availableCells.push([x, y]);
        }
      }
    }
    
    if (availableCells.length > 0) {
      const [gx, gy] = availableCells[Math.floor(Math.random() * availableCells.length)];
      const type: PickupType = Math.random() < 0.5 ? 'health' : 'energy';
      this.pickups.push(new Pickup(gx, gy, type));
    }
  }

  private checkCollisions(): void {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      
      const bulletAABB = bullet.getAABB();
      
      for (const player of this.players) {
        if (player.isDead || player.team === bullet.team) continue;
        
        const playerAABB = player.getAABB(this.cellSize, this.gridOffsetX, this.gridOffsetY);
        
        if (aabbCollide(bulletAABB, playerAABB)) {
          bullet.active = false;
          player.takeDamage(bullet.damage);
          
          const px = this.gridOffsetX + (player.gridX + 0.5) * this.cellSize;
          const py = this.gridOffsetY + (player.gridY + 0.5) * this.cellSize;
          this.spawnHitParticles(px, py, player.team === 'red' ? '#e53e3e' : '#3182ce');
          
          soundManager.playHit();
          
          if (player.isDead) {
            soundManager.playDeath();
          }
          
          break;
        }
      }
      
      if (!bullet.active) continue;
      
      for (const obstacle of this.obstacles) {
        if (obstacle.destroyed) continue;
        
        const obstacleAABB = obstacle.getAABB(this.cellSize, this.gridOffsetX, this.gridOffsetY);
        
        if (aabbCollide(bulletAABB, obstacleAABB)) {
          bullet.active = false;
          const destroyed = obstacle.takeDamage(bullet.damage);
          
          const ox = this.gridOffsetX + (obstacle.gridX + 0.5) * this.cellSize;
          const oy = this.gridOffsetY + (obstacle.gridY + 0.5) * this.cellSize;
          
          if (destroyed) {
            this.spawnDebris(obstacle);
            soundManager.playShake();
          } else {
            this.spawnHitParticles(ox, oy, '#6b4d44');
          }
          
          break;
        }
      }
    }
    
    for (const effect of this.skillEffects) {
      if (!effect.active) continue;
      
      const effectCenterX = this.gridOffsetX + (effect.gridX + 0.5) * this.cellSize;
      const effectCenterY = this.gridOffsetY + (effect.gridY + 0.5) * this.cellSize;
      const effectRadius = effect.radius * this.cellSize;
      
      for (const player of this.players) {
        if (player.isDead || player.team === effect.team) continue;
        
        const px = this.gridOffsetX + (player.gridX + 0.5) * this.cellSize;
        const py = this.gridOffsetY + (player.gridY + 0.5) * this.cellSize;
        
        const dist = Math.sqrt((px - effectCenterX) ** 2 + (py - effectCenterY) ** 2);
        
        if (dist <= effectRadius) {
          if (effect.type === 'emp') {
            player.stun(1500);
          } else if (effect.type === 'flame') {
            player.applyBurn(3000);
          }
        }
      }
    }
    
    for (const player of this.players) {
      if (player.isDead) continue;
      
      for (const pickup of this.pickups) {
        if (pickup.collected) continue;
        
        if (player.gridX === pickup.gridX && player.gridY === pickup.gridY) {
          pickup.collected = true;
          
          if (pickup.type === 'health') {
            player.heal(player.maxHealth * 0.15);
          } else {
            player.restoreEnergy(player.maxEnergy * 0.15);
          }
          
          const px = this.gridOffsetX + (pickup.gridX + 0.5) * this.cellSize;
          const py = this.gridOffsetY + (pickup.gridY + 0.5) * this.cellSize;
          this.spawnPickupEffect(pickup, px, py);
          
          soundManager.playPickup();
        }
      }
    }
  }

  private spawnHitParticles(x: number, y: number, color: string): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        3 + Math.random() * 3
      ));
    }
  }

  private spawnDebris(obstacle: Obstacle): void {
    const ox = this.gridOffsetX + (obstacle.gridX + 0.5) * this.cellSize;
    const oy = this.gridOffsetY + (obstacle.gridY + 0.5) * this.cellSize;
    
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      const size = 6 + Math.random() * 8;
      
      const debris = new Particle(
        ox + (Math.random() - 0.5) * 20,
        oy + (Math.random() - 0.5) * 20,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 2,
        '#6b4d44',
        size
      );
      obstacle.debris.push(debris);
    }
  }

  private spawnPickupEffect(pickup: Pickup, x: number, y: number): void {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1.5;
      const particle = new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 2,
        '#ffd700',
        5
      );
      pickup.pickupEffect.push(particle);
    }
  }

  movePlayer(team: Team, direction: 'up' | 'down' | 'left' | 'right'): boolean {
    const player = this.players.find(p => p.team === team);
    if (!player || !player.canMove()) return false;
    
    let newX = player.gridX;
    let newY = player.gridY;
    
    switch (direction) {
      case 'up':
        newY = Math.max(0, player.gridY - 1);
        player.direction = -Math.PI / 2;
        break;
      case 'down':
        newY = Math.min(this.gridRows - 1, player.gridY + 1);
        player.direction = Math.PI / 2;
        break;
      case 'left':
        newX = Math.max(0, player.gridX - 1);
        player.direction = Math.PI;
        break;
      case 'right':
        newX = Math.min(this.gridCols - 1, player.gridX + 1);
        player.direction = 0;
        break;
    }
    
    if (newX === player.gridX && newY === player.gridY) return false;
    
    for (const obstacle of this.obstacles) {
      if (!obstacle.destroyed && obstacle.gridX === newX && obstacle.gridY === newY) {
        return false;
      }
    }
    
    for (const other of this.players) {
      if (other.team !== team && !other.isDead && other.gridX === newX && other.gridY === newY) {
        return false;
      }
    }
    
    player.gridX = newX;
    player.gridY = newY;
    player.moveCooldown = player.moveCooldownMax;
    
    return true;
  }

  playerShoot(team: Team): boolean {
    const player = this.players.find(p => p.team === team);
    if (!player || !player.canShoot()) return false;
    
    const px = this.gridOffsetX + (player.gridX + 0.5) * this.cellSize;
    const py = this.gridOffsetY + (player.gridY + 0.5) * this.cellSize;
    
    const bullet = new Bullet(px, py, player.direction, team, this.cellSize);
    this.bullets.push(bullet);
    
    player.shoot();
    soundManager.playShoot();
    
    return true;
  }

  playerUseSkill(team: Team): boolean {
    const player = this.players.find(p => p.team === team);
    if (!player || !player.canUseSkill()) return false;
    
    const skillType: SkillType = team === 'blue' ? 'emp' : 'flame';
    
    let targetX = player.gridX;
    let targetY = player.gridY;
    
    if (skillType === 'emp') {
      const dx = Math.round(Math.cos(player.direction));
      const dy = Math.round(Math.sin(player.direction));
      targetX = Math.max(0, Math.min(this.gridCols - 1, player.gridX + dx));
      targetY = Math.max(0, Math.min(this.gridRows - 1, player.gridY + dy));
    }
    
    const effect = new SkillEffect(skillType, targetX, targetY, team);
    this.skillEffects.push(effect);
    
    player.useSkill();
    soundManager.playSkill();
    
    return true;
  }

  private checkGameOver(): void {
    const redPlayer = this.players.find(p => p.team === 'red');
    const bluePlayer = this.players.find(p => p.team === 'blue');
    
    const redDead = redPlayer?.isDead ?? true;
    const blueDead = bluePlayer?.isDead ?? true;
    
    if (redDead && blueDead) {
      this.gameOver = true;
      this.winner = 'draw';
    } else if (redDead) {
      this.gameOver = true;
      this.winner = 'blue';
    } else if (blueDead) {
      this.gameOver = true;
      this.winner = 'red';
    }
  }

  getShakeIntensity(): { amount: number; duration: number } {
    let maxShake = { amount: 0, duration: 0 };
    
    for (const player of this.players) {
      if (player.health < player.maxHealth * 0.3 && !player.isDead) {
        maxShake = { amount: 3, duration: 100 };
      }
    }
    
    for (const obstacle of this.obstacles) {
      if (obstacle.destroyed && obstacle.debris.length > 8) {
        maxShake = { amount: 5, duration: 300 };
      }
    }
    
    return maxShake;
  }
}
