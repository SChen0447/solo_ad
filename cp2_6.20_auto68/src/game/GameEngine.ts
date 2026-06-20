import { levels, LevelConfig } from './levelData';
import type { SoundData } from '../sound/SoundEngine';

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  onGround: boolean;
  pushingBlock: boolean;
}

export interface PlatformState {
  x: number;
  y: number;
  width: number;
  height: number;
  originalY: number;
  moveAxis: 'y';
  moveRange: number;
  frequencyMin: number;
  frequencyMax: number;
  isVoiceControlled: boolean;
}

export interface DoorState {
  x: number;
  y: number;
  width: number;
  height: number;
  originalX: number;
  frequencyMin: number;
  frequencyMax: number;
  volumeThreshold: number;
  openProgress: number;
  isOpen: boolean;
}

export interface BlockState {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
}

export interface WallState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GoalState {
  x: number;
  y: number;
  diameter: number;
  blinkTimer: number;
}

export interface GameState {
  player: PlayerState;
  platforms: PlatformState[];
  doors: DoorState[];
  blocks: BlockState[];
  walls: WallState[];
  goal: GoalState;
  levelComplete: boolean;
  levelIndex: number;
  levelWidth: number;
  levelHeight: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  jump: boolean;
  push: boolean;
  reset: boolean;
}

const PLAYER_SPEED = 150;
const JUMP_FORCE = 300;
const GRAVITY = 500;
const PLATFORM_SPEED = 100;
const DOOR_OPEN_DURATION = 0.3;
const MAX_BLOCK_SPEED = 200;
const PLAYER_RADIUS = 10;

export class GameEngine {
  private state!: GameState;
  private currentLevelIndex = 0;
  private unlockedLevels = 1;

  constructor() {
    this.loadLevel(0);
  }

  loadLevel(levelIndex: number): void {
    if (levelIndex < 0 || levelIndex >= levels.length) return;

    this.currentLevelIndex = levelIndex;
    const config = levels[levelIndex];

    this.state = {
      player: {
        x: config.playerStart.x,
        y: config.playerStart.y,
        vx: 0,
        vy: 0,
        radius: PLAYER_RADIUS,
        onGround: false,
        pushingBlock: false
      },
      platforms: config.platforms.map(p => ({
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        originalY: p.originalY ?? p.y,
        moveAxis: p.moveAxis,
        moveRange: p.moveRange,
        frequencyMin: p.frequencyMin,
        frequencyMax: p.frequencyMax,
        isVoiceControlled: p.frequencyMin > 0 && p.frequencyMax > 0
      })),
      doors: config.doors.map(d => ({
        x: d.x,
        y: d.y,
        width: d.width,
        height: d.height,
        originalX: d.x,
        frequencyMin: d.frequencyMin,
        frequencyMax: d.frequencyMax,
        volumeThreshold: d.volumeThreshold,
        openProgress: 0,
        isOpen: false
      })),
      blocks: config.blocks.map(b => ({
        x: b.x,
        y: b.y,
        size: b.size,
        vx: 0,
        vy: 0
      })),
      walls: config.walls.map(w => ({ ...w })),
      goal: {
        x: config.goal.x,
        y: config.goal.y,
        diameter: 40,
        blinkTimer: 0
      },
      levelComplete: false,
      levelIndex: levelIndex,
      levelWidth: config.width,
      levelHeight: config.height
    };
  }

  update(dt: number, soundData: SoundData, input: InputState): void {
    if (this.state.levelComplete) return;

    if (input.reset) {
      this.resetLevel();
      return;
    }

    const frequency = soundData.frequency;
    const volume = soundData.volume;

    this.updatePlayer(dt, input, soundData);
    this.updatePlatforms(dt, frequency);
    this.updateDoors(dt, frequency, volume);
    this.updateBlocks(dt, input, soundData);
    this.updateGoal(dt);
    this.checkWinCondition();

    if (this.state.player.y > this.state.levelHeight + 100) {
      this.resetLevel();
    }
  }

  getState(): GameState {
    return this.state;
  }

  getUnlockedLevels(): number {
    return this.unlockedLevels;
  }

  completeLevel(): void {
    if (this.currentLevelIndex + 1 < levels.length) {
      this.unlockedLevels = Math.max(this.unlockedLevels, this.currentLevelIndex + 2);
    }
  }

  resetLevel(): void {
    this.loadLevel(this.currentLevelIndex);
  }

  private updatePlayer(dt: number, input: InputState, soundData: SoundData): void {
    const player = this.state.player;

    player.vx = 0;
    if (input.left) player.vx = -PLAYER_SPEED;
    if (input.right) player.vx = PLAYER_SPEED;

    if (input.jump && player.onGround) {
      player.vy = -JUMP_FORCE;
      player.onGround = false;
    }

    player.vy += GRAVITY * dt;
    if (player.vy > 800) player.vy = 800;

    player.x += player.vx * dt;
    this.resolveCollisionsX(player);

    player.y += player.vy * dt;
    player.onGround = false;
    this.resolveCollisionsY(player);

    if (player.x - player.radius < 0) player.x = player.radius;
    if (player.x + player.radius > this.state.levelWidth) player.x = this.state.levelWidth - player.radius;
  }

  private resolveCollisionsX(player: PlayerState): void {
    for (const wall of this.state.walls) {
      if (this.circleRectCollision(player, wall)) {
        if (player.vx > 0) {
          player.x = wall.x - player.radius;
        } else if (player.vx < 0) {
          player.x = wall.x + wall.width + player.radius;
        }
      }
    }

    for (const platform of this.state.platforms) {
      if (this.circleRectCollision(player, platform)) {
        if (player.vx > 0) {
          player.x = platform.x - player.radius;
        } else if (player.vx < 0) {
          player.x = platform.x + platform.width + player.radius;
        }
      }
    }

    for (const door of this.state.doors) {
      if (!door.isOpen && this.circleRectCollision(player, door)) {
        if (player.vx > 0) {
          player.x = door.x - player.radius;
        } else if (player.vx < 0) {
          player.x = door.x + door.width + player.radius;
        }
      }
    }
  }

  private resolveCollisionsY(player: PlayerState): void {
    for (const wall of this.state.walls) {
      if (this.circleRectCollision(player, wall)) {
        if (player.vy > 0) {
          player.y = wall.y - player.radius;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = wall.y + wall.height + player.radius;
          player.vy = 0;
        }
      }
    }

    for (const platform of this.state.platforms) {
      if (this.circleRectCollision(player, platform)) {
        if (player.vy > 0) {
          player.y = platform.y - player.radius;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = platform.y + platform.height + player.radius;
          player.vy = 0;
        }
      }
    }

    for (const door of this.state.doors) {
      if (!door.isOpen && this.circleRectCollision(player, door)) {
        if (player.vy > 0) {
          player.y = door.y - player.radius;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = door.y + door.height + player.radius;
          player.vy = 0;
        }
      }
    }

    for (const block of this.state.blocks) {
      if (this.circleRectCollision(player, block)) {
        if (player.vy > 0) {
          player.y = block.y - player.radius;
          player.vy = 0;
          player.onGround = true;
        }
      }
    }
  }

  private updatePlatforms(dt: number, frequency: number): void {
    for (const platform of this.state.platforms) {
      if (!platform.isVoiceControlled) continue;

      const inRange = frequency >= platform.frequencyMin && frequency <= platform.frequencyMax;

      if (inRange) {
        platform.y -= PLATFORM_SPEED * dt;
        const minY = platform.originalY - platform.moveRange;
        if (platform.y < minY) platform.y = minY;
      } else {
        platform.y += PLATFORM_SPEED * dt;
        if (platform.y > platform.originalY) platform.y = platform.originalY;
      }
    }
  }

  private updateDoors(dt: number, frequency: number, volume: number): void {
    for (const door of this.state.doors) {
      const freqInRange = frequency >= door.frequencyMin && frequency <= door.frequencyMax;
      const volAboveThreshold = volume >= door.volumeThreshold;
      const shouldOpen = freqInRange && volAboveThreshold;

      if (shouldOpen) {
        door.openProgress += dt / DOOR_OPEN_DURATION;
        if (door.openProgress > 1) door.openProgress = 1;
        door.isOpen = door.openProgress >= 1;
      } else {
        door.openProgress -= dt / DOOR_OPEN_DURATION;
        if (door.openProgress < 0) door.openProgress = 0;
        door.isOpen = false;
      }

      door.x = door.originalX + door.width * door.openProgress;
    }
  }

  private updateBlocks(dt: number, input: InputState, soundData: SoundData): void {
    const player = this.state.player;

    for (const block of this.state.blocks) {
      const touching = this.circleRectCollision(player, block);

      if (touching && input.push) {
        const pushSpeed = Math.min(MAX_BLOCK_SPEED, soundData.volume * MAX_BLOCK_SPEED);
        const pushDir = player.x < block.x + block.size / 2 ? 1 : -1;
        block.vx = pushDir * pushSpeed;
        player.pushingBlock = true;
      } else {
        block.vx *= 0.9;
        if (Math.abs(block.vx) < 1) block.vx = 0;
        player.pushingBlock = false;
      }

      block.vy += GRAVITY * dt;
      if (block.vy > 800) block.vy = 800;

      block.x += block.vx * dt;
      block.y += block.vy * dt;

      for (const wall of this.state.walls) {
        if (this.rectRectCollision(block, wall)) {
          if (block.vx > 0) block.x = wall.x - block.size;
          else if (block.vx < 0) block.x = wall.x + wall.width;
          block.vx = 0;

          if (block.vy > 0) {
            block.y = wall.y - block.size;
            block.vy = 0;
          } else if (block.vy < 0) {
            block.y = wall.y + wall.height;
            block.vy = 0;
          }
        }
      }

      for (const platform of this.state.platforms) {
        if (this.rectRectCollision(block, platform)) {
          if (block.vy > 0) {
            block.y = platform.y - block.size;
            block.vy = 0;
          }
        }
      }

      if (block.x < 0) block.x = 0;
      if (block.x + block.size > this.state.levelWidth) block.x = this.state.levelWidth - block.size;
    }
  }

  private updateGoal(dt: number): void {
    this.state.goal.blinkTimer += dt;
    if (this.state.goal.blinkTimer > 1) {
      this.state.goal.blinkTimer -= 1;
    }
  }

  private checkWinCondition(): void {
    const player = this.state.player;
    const goal = this.state.goal;

    const dx = player.x - goal.x;
    const dy = player.y - goal.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < goal.diameter / 2 + player.radius) {
      this.state.levelComplete = true;
      this.completeLevel();
    }
  }

  private circleRectCollision(circle: PlayerState, rect: { x: number; y: number; width: number; height: number }): boolean {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;

    return (dx * dx + dy * dy) < (circle.radius * circle.radius);
  }

  private rectRectCollision(
    a: { x: number; y: number; size: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return a.x < b.x + b.width &&
      a.x + a.size > b.x &&
      a.y < b.y + b.height &&
      a.y + a.size > b.y;
  }
}
