import { eventBus, GameEvents } from '../core/EventBus';
import { PhysicsEngine, Vec2, Wall, CreatureData } from '../engine/PhysicsEngine';
import { PingEndData, KeyMoveData } from '../input/InputHandler';
import { ReflectAudioData, PingAudioData } from '../engine/AudioEngine';

export interface Player {
  position: Vec2;
  velocity: Vec2;
  radius: number;
  energy: number;
  maxEnergy: number;
  walkPhase: number;
  facing: 'left' | 'right';
  invincibleUntil: number;
}

export interface Collectible {
  id: string;
  position: Vec2;
  collected: boolean;
  collecting: boolean;
  collectProgress: number;
  pulsePhase: number;
}

export interface Creature {
  id: string;
  position: Vec2;
  baseRadius: number;
  radius: number;
  state: 'idle' | 'angered' | 'disappearing';
  angerProgress: number;
  wanderDirection: Vec2;
  wanderTimer: number;
  disappearTimer: number;
}

export interface Door {
  position: Vec2;
  width: number;
  height: number;
  isOpen: boolean;
  openProgress: number;
}

export interface Coral {
  position: Vec2;
  color: string;
  particles: Particle[];
}

export interface Bubble {
  position: Vec2;
  radius: number;
  speed: number;
  wobble: number;
  opacity: number;
}

export interface Particle {
  position: Vec2;
  velocity: Vec2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface GameState {
  player: Player;
  collectibles: Collectible[];
  requiredCollectibles: number;
  collectedCount: number;
  creatures: Creature[];
  door: Door;
  level: number;
  doorUnlocked: boolean;
  corals: Coral[];
  bubbles: Bubble[];
  particles: Particle[];
  hurtFlashUntil: number;
  screenHurtIntensity: number;
}

const PLAYER_SPEED = 180;
const PLAYER_RADIUS = 18;
const COLLECTIBLE_PICKUP_RANGE = 35;
const CREATURE_DANGER_RADIUS = 28;
const INVINCIBLE_DURATION = 1500;
const CORAL_COUNT = 8;
const BUBBLE_COUNT = 15;
const CREATURE_COUNT = 3;

export class GameManager {
  private state: GameState;
  private physics: PhysicsEngine;
  private worldWidth: number;
  private worldHeight: number;
  private initialized: boolean = false;

  constructor(worldWidth: number, worldHeight: number, physics: PhysicsEngine) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.physics = physics;

    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        position: { x: 150, y: this.worldHeight / 2 },
        velocity: { x: 0, y: 0 },
        radius: PLAYER_RADIUS,
        energy: 3,
        maxEnergy: 3,
        walkPhase: 0,
        facing: 'right',
        invincibleUntil: 0
      },
      collectibles: [],
      requiredCollectibles: 6,
      collectedCount: 0,
      creatures: [],
      door: {
        position: { x: this.worldWidth - 120, y: this.worldHeight / 2 - 60 },
        width: 80,
        height: 120,
        isOpen: false,
        openProgress: 0
      },
      level: 1,
      doorUnlocked: false,
      corals: [],
      bubbles: [],
      particles: [],
      hurtFlashUntil: 0,
      screenHurtIntensity: 0
    };
  }

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.generateLevel();
    this.registerEvents();
  }

  private generateLevel(): void {
    this.generateWalls();
    this.generateCollectibles();
    this.generateCreatures();
    this.generateCorals();
    this.generateBubbles();

    eventBus.emit(GameEvents.LEVEL_START, { level: this.state.level });
  }

  private generateWalls(): void {
    const walls: Omit<Wall, 'id'>[] = [];
    const margin = 40;

    const segments = 5;
    const segHeight = (this.worldHeight - margin * 2) / segments;

    for (let i = 0; i <= segments; i++) {
      const y = margin + i * segHeight;
      if (i === 0 || i === segments) continue;

      if (Math.random() < 0.6) {
        const startX = margin + Math.random() * 100;
        const endX = startX + 150 + Math.random() * (this.worldWidth / 3);
        walls.push({
          x1: Math.min(startX, this.worldWidth - margin - 100),
          y1: y,
          x2: Math.min(endX, this.worldWidth - margin),
          y2: y + (Math.random() - 0.5) * 40
        });
      }
    }

    for (let i = 0; i < 3; i++) {
      const x = this.worldWidth * (0.25 + i * 0.2);
      const topY = margin + Math.random() * 100;
      const bottomY = topY + 80 + Math.random() * 120;
      walls.push({
        x1: x,
        y1: topY,
        x2: x + (Math.random() - 0.5) * 30,
        y2: Math.min(bottomY, this.worldHeight - margin - 100)
      });
    }

    this.physics.setWalls(walls);
  }

  private generateCollectibles(): void {
    const count = 6 + Math.floor(Math.random() * 2);
    this.state.collectibles = [];
    this.state.collectedCount = 0;

    for (let i = 0; i < count; i++) {
      let pos: Vec2;
      let attempts = 0;
      do {
        pos = {
          x: 200 + Math.random() * (this.worldWidth - 400),
          y: 80 + Math.random() * (this.worldHeight - 160)
        };
        attempts++;
      } while (this.isPositionNearWall(pos, 60) && attempts < 50);

      this.state.collectibles.push({
        id: `collect_${i}`,
        position: pos,
        collected: false,
        collecting: false,
        collectProgress: 0,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  private generateCreatures(): void {
    this.state.creatures = [];
    for (let i = 0; i < CREATURE_COUNT; i++) {
      let pos: Vec2;
      let attempts = 0;
      do {
        pos = {
          x: 300 + Math.random() * (this.worldWidth - 500),
          y: 100 + Math.random() * (this.worldHeight - 200)
        };
        attempts++;
      } while (this.isPositionNearWall(pos, 80) && attempts < 50);

      this.state.creatures.push({
        id: `creature_${i}`,
        position: pos,
        baseRadius: 22,
        radius: 22,
        state: 'idle',
        angerProgress: 0,
        wanderDirection: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2
        },
        wanderTimer: 0,
        disappearTimer: 0
      });
    }
  }

  private generateCorals(): void {
    this.state.corals = [];
    const colors = ['#6B5B95', '#8B5CF6', '#7C3AED', '#4A90D9', '#FF9F43'];
    for (let i = 0; i < CORAL_COUNT; i++) {
      let pos: Vec2;
      let attempts = 0;
      do {
        pos = {
          x: 80 + Math.random() * (this.worldWidth - 160),
          y: this.worldHeight - 60 - Math.random() * 80
        };
        attempts++;
      } while (attempts < 20);

      this.state.corals.push({
        position: pos,
        color: colors[Math.floor(Math.random() * colors.length)],
        particles: []
      });
    }
  }

  private generateBubbles(): void {
    this.state.bubbles = [];
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      this.state.bubbles.push({
        position: {
          x: Math.random() * this.worldWidth,
          y: Math.random() * this.worldHeight
        },
        radius: 3 + Math.random() * 8,
        speed: 15 + Math.random() * 35,
        wobble: Math.random() * Math.PI * 2,
        opacity: 0.1 + Math.random() * 0.3
      });
    }
  }

  private isPositionNearWall(pos: Vec2, minDist: number): boolean {
    const collision = this.physics.checkCircleWallsCollision(pos.x, pos.y, minDist);
    return collision.collided;
  }

  private registerEvents(): void {
    eventBus.on(GameEvents.INPUT_PING_END, (data) => this.handlePingEnd(data as PingEndData));
    eventBus.on(GameEvents.INPUT_KEY_MOVE, (data) => this.handleKeyMove(data as KeyMoveData));
    eventBus.on(GameEvents.PING_REFLECT, (data) => this.handlePingReflect(data as { point: { distance: number; intensity: number } }));
    eventBus.on(GameEvents.CREATURE_HIT, (data) => this.handleCreatureHit(data as { creatureId: string; position: Vec2 }));
  }

  private handlePingEnd(data: PingEndData): void {
    const origin = { ...this.state.player.position };
    const ping = this.physics.emitPing(origin, data.duration);

    if (ping) {
      const normalizedDuration = Math.min(Math.max(data.duration / 1000, 0.05), 1.0);
      const speedFactor = 1 - normalizedDuration * 0.7;
      const audioData: PingAudioData = {
        duration: data.duration,
        frequency: 400 + speedFactor * 400,
        speed: speedFactor
      };
      eventBus.emit(GameEvents.AUDIO_PLAY_PING, audioData);
    }
  }

  private handleKeyMove(data: KeyMoveData): void {
    const player = this.state.player;

    let vx = data.horizontal;
    let vy = data.vertical;

    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      vx /= len;
      vy /= len;
      player.facing = vx < 0 ? 'left' : vx > 0 ? 'right' : player.facing;
    }

    player.velocity.x = vx;
    player.velocity.y = vy;
  }

  private handlePingReflect(data: { point: { distance: number; intensity: number } }): void {
    const audioData: ReflectAudioData = {
      distance: data.point.distance,
      intensity: data.point.intensity
    };
    eventBus.emit(GameEvents.AUDIO_PLAY_REFLECT, audioData);
  }

  private handleCreatureHit(data: { creatureId: string; position: Vec2 }): void {
    const creature = this.state.creatures.find(c => c.id === data.creatureId);
    if (!creature || creature.state === 'angered') return;

    creature.state = 'angered';
    creature.angerProgress = 0;
    eventBus.emit(GameEvents.AUDIO_PLAY_SCREAM);
  }

  public update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    const now = performance.now();

    this.updatePlayer(dt, now);
    this.updateCollectibles(dt, now);
    this.updateCreatures(dt, now);
    this.updateDoor(dt);
    this.updateBubbles(dt);
    this.updateCorals(dt, now);
    this.updateParticles(dt);

    if (this.state.screenHurtIntensity > 0) {
      this.state.screenHurtIntensity = Math.max(0, this.state.screenHurtIntensity - dt * 2);
    }

    const creatureData: CreatureData[] = this.state.creatures
      .filter(c => c.state !== 'disappearing')
      .map(c => ({
        id: c.id,
        position: c.position,
        radius: c.radius
      }));

    this.physics.update(deltaTime, creatureData);
  }

  private updatePlayer(dt: number, now: number): void {
    const player = this.state.player;
    const vx = player.velocity.x * PLAYER_SPEED * dt;
    const vy = player.velocity.y * PLAYER_SPEED * dt;

    if (vx !== 0 || vy !== 0) {
      player.walkPhase += dt * 8;
    }

    let newX = player.position.x + vx;
    let newY = player.position.y + vy;

    const collisionX = this.physics.checkCircleWallsCollision(newX, player.position.y, player.radius);
    if (!collisionX.collided) {
      player.position.x = newX;
    } else {
      player.position.x += collisionX.normal.x * collisionX.overlap;
    }

    const collisionY = this.physics.checkCircleWallsCollision(player.position.x, newY, player.radius);
    if (!collisionY.collided) {
      player.position.y = newY;
    } else {
      player.position.y += collisionY.normal.y * collisionY.overlap;
    }

    player.position.x = Math.max(player.radius, Math.min(this.worldWidth - player.radius, player.position.x));
    player.position.y = Math.max(player.radius, Math.min(this.worldHeight - player.radius, player.position.y));

    eventBus.emit(GameEvents.PLAYER_MOVE, { position: player.position });
  }

  private updateCollectibles(dt: number, _now: number): void {
    for (const collectible of this.state.collectibles) {
      collectible.pulsePhase += dt * 3;

      if (collectible.collected) continue;

      const dx = this.state.player.position.x - collectible.position.x;
      const dy = this.state.player.position.y - collectible.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!collectible.collecting && dist < COLLECTIBLE_PICKUP_RANGE) {
        collectible.collecting = true;
        collectible.collectProgress = 0;
      }

      if (collectible.collecting) {
        collectible.collectProgress += dt * 3;
        const t = Math.min(collectible.collectProgress, 1);

        const pullX = dx * t;
        const pullY = dy * t;
        collectible.position.x += pullX * dt * 5;
        collectible.position.y += pullY * dt * 5;

        this.spawnParticle(collectible.position, '#FFD700', 2 + Math.random() * 2);

        if (collectible.collectProgress >= 1) {
          collectible.collected = true;
          this.state.collectedCount++;
          eventBus.emit(GameEvents.COLLECTIBLE_PICKUP, { id: collectible.id, count: this.state.collectedCount });
          eventBus.emit(GameEvents.COLLECTIBLE_PROGRESS, {
            current: this.state.collectedCount,
            total: this.state.requiredCollectibles
          });
          eventBus.emit(GameEvents.AUDIO_PLAY_COLLECT);

          for (let i = 0; i < 15; i++) {
            this.spawnParticle(collectible.position, '#FFD700', 3 + Math.random() * 3);
          }

          if (this.state.collectedCount >= this.state.requiredCollectibles) {
            this.state.doorUnlocked = true;
            eventBus.emit(GameEvents.AUDIO_PLAY_DOOR);
          }
        }
      }
    }
  }

  private updateCreatures(dt: number, now: number): void {
    for (const creature of this.state.creatures) {
      switch (creature.state) {
        case 'idle':
          creature.wanderTimer -= dt;
          if (creature.wanderTimer <= 0) {
            creature.wanderTimer = 2 + Math.random() * 4;
            creature.wanderDirection = {
              x: (Math.random() - 0.5) * 2,
              y: (Math.random() - 0.5) * 2
            };
            const len = Math.sqrt(
              creature.wanderDirection.x ** 2 + creature.wanderDirection.y ** 2
            );
            if (len > 0) {
              creature.wanderDirection.x /= len;
              creature.wanderDirection.y /= len;
            }
          }

          const wanderSpeed = 15;
          const newX = creature.position.x + creature.wanderDirection.x * wanderSpeed * dt;
          const newY = creature.position.y + creature.wanderDirection.y * wanderSpeed * dt;

          if (!this.isPositionNearWall({ x: newX, y: creature.position.y }, creature.baseRadius + 5)) {
            creature.position.x = newX;
          } else {
            creature.wanderDirection.x *= -1;
          }
          if (!this.isPositionNearWall({ x: creature.position.x, y: newY }, creature.baseRadius + 5)) {
            creature.position.y = newY;
          } else {
            creature.wanderDirection.y *= -1;
          }

          creature.position.x = Math.max(80, Math.min(this.worldWidth - 80, creature.position.x));
          creature.position.y = Math.max(80, Math.min(this.worldHeight - 80, creature.position.y));
          break;

        case 'angered':
          creature.angerProgress += dt;
          creature.radius = creature.baseRadius * (1 + creature.angerProgress * 0.8);

          const pdX = this.state.player.position.x - creature.position.x;
          const pdY = this.state.player.position.y - creature.position.y;
          const pDist = Math.sqrt(pdX * pdX + pdY * pdY);

          if (now >= this.state.player.invincibleUntil &&
              pDist < creature.radius + this.state.player.radius - 5) {
            this.hurtPlayer(now);
          }

          if (creature.angerProgress >= 1.0) {
            creature.state = 'disappearing';
            creature.disappearTimer = 0.3;
          }
          break;

        case 'disappearing':
          creature.disappearTimer -= dt;
          creature.radius = Math.max(0, creature.baseRadius * (1 + 0.8) * (creature.disappearTimer / 0.3));

          if (creature.disappearTimer <= 0) {
            let newPos: Vec2;
            let attempts = 0;
            do {
              newPos = {
                x: 300 + Math.random() * (this.worldWidth - 500),
                y: 100 + Math.random() * (this.worldHeight - 200)
              };
              attempts++;
            } while (this.isPositionNearWall(newPos, 80) && attempts < 50);

            creature.position = newPos;
            creature.state = 'idle';
            creature.radius = creature.baseRadius;
            creature.angerProgress = 0;

            eventBus.emit(GameEvents.CREATURE_TELEPORT, { id: creature.id, position: newPos });
          }
          break;
      }
    }
  }

  private hurtPlayer(now: number): void {
    const player = this.state.player;
    player.energy = Math.max(0, player.energy - 1);
    player.invincibleUntil = now + INVINCIBLE_DURATION;

    this.state.hurtFlashUntil = now + 800;
    this.state.screenHurtIntensity = 1;

    eventBus.emit(GameEvents.PLAYER_HURT, { energy: player.energy });
    eventBus.emit(GameEvents.PLAYER_ENERGY_CHANGE, {
      current: player.energy,
      max: player.maxEnergy
    });
    eventBus.emit(GameEvents.AUDIO_PLAY_HURT);

    for (let i = 0; i < 20; i++) {
      this.spawnParticle(player.position, '#FF4444', 2 + Math.random() * 4);
    }
  }

  private updateDoor(dt: number): void {
    if (!this.state.doorUnlocked) return;

    const door = this.state.door;
    if (!door.isOpen) {
      door.openProgress += dt * 0.6;
      if (door.openProgress >= 1) {
        door.openProgress = 1;
        door.isOpen = true;
        eventBus.emit(GameEvents.DOOR_OPEN, {});
      }
    }

    if (door.isOpen) {
      const dx = this.state.player.position.x - (door.position.x + door.width / 2);
      const dy = this.state.player.position.y - (door.position.y + door.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 40) {
        this.nextLevel();
      }
    }
  }

  private nextLevel(): void {
    this.state.level++;
    this.physics.clear();
    this.state = {
      ...this.createInitialState(),
      level: this.state.level
    };
    this.generateLevel();
  }

  private updateBubbles(dt: number): void {
    for (const bubble of this.state.bubbles) {
      bubble.position.y -= bubble.speed * dt;
      bubble.wobble += dt * 2;
      bubble.position.x += Math.sin(bubble.wobble) * 10 * dt;

      if (bubble.position.y < -bubble.radius) {
        bubble.position.y = this.worldHeight + bubble.radius;
        bubble.position.x = Math.random() * this.worldWidth;
      }
    }
  }

  private updateCorals(dt: number, now: number): void {
    for (const coral of this.state.corals) {
      if (Math.random() < dt * 2) {
        this.spawnParticle(
          {
            x: coral.position.x + (Math.random() - 0.5) * 10,
            y: coral.position.y - 5
          },
          coral.color,
          2 + Math.random() * 2
        );
      }
    }
    void now;
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.velocity.y += 30 * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  }

  private spawnParticle(position: Vec2, color: string, size: number): void {
    this.state.particles.push({
      position: { x: position.x, y: position.y },
      velocity: {
        x: (Math.random() - 0.5) * 80,
        y: -20 - Math.random() * 60
      },
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1,
      size,
      color
    });
  }

  public getState(): Readonly<GameState> {
    return this.state;
  }

  public resize(worldWidth: number, worldHeight: number): void {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    const oldState = this.state;
    this.state = {
      ...this.createInitialState(),
      level: oldState.level
    };
    this.state.player.position = {
      x: Math.min(oldState.player.position.x, worldWidth - 100),
      y: Math.min(oldState.player.position.y, worldHeight - 100)
    };
    this.state.door.position = {
      x: worldWidth - 120,
      y: worldHeight / 2 - 60
    };
    this.generateWalls();
    this.generateCollectibles();
    this.generateCreatures();
    this.generateCorals();
    this.generateBubbles();
  }
}
