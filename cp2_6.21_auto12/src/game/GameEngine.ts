import { eventBus } from '../EventBus';
import { getLevel, getTotalLevels } from './levelData';
import type {
  GameState,
  GameScreen,
  Player,
  Level,
  SoundData,
  Rect,
  SoundPlatform,
  SoundDoor,
  PushableBlock
} from '../types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GRAVITY,
  PLAYER_SPEED,
  JUMP_FORCE,
  PLATFORM_SPEED,
  MAX_PUSH_SPEED
} from '../types';

export class GameEngine {
  private state: GameState;
  private currentSoundData: SoundData;
  private keys: Set<string> = new Set();
  private lastSoundData: SoundData | null = null;

  constructor() {
    this.state = {
      currentScreen: 'start',
      currentLevel: 0,
      unlockedLevels: [1],
      player: this.createPlayer(),
      level: null,
      isPaused: false
    };

    this.currentSoundData = {
      frequency: 0,
      volume: 0,
      waveform: new Float32Array(40)
    };

    this.setupEventListeners();
    this.setupKeyboardListeners();
  }

  private createPlayer(x: number = 100, y: number = 500): Player {
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      width: 20,
      height: 20,
      onGround: false
    };
  }

  private setupEventListeners(): void {
    eventBus.on('sound:data', (data: SoundData) => {
      this.currentSoundData = data;
      this.lastSoundData = data;
    });

    eventBus.on('ui:showScreen', (screen: GameScreen) => {
      this.state.currentScreen = screen;
      eventBus.emit('game:stateChange', this.state);
    });

    eventBus.on('ui:levelSelected', (levelId: number) => {
      this.loadLevel(levelId);
    });

    eventBus.on('game:restart', () => {
      this.restartLevel();
    });

    eventBus.on('ui:nextLevel', () => {
      const nextLevel = this.state.currentLevel + 1;
      if (nextLevel <= getTotalLevels()) {
        this.loadLevel(nextLevel);
      }
    });

    eventBus.on('ui:backToLevelSelect', () => {
      this.state.currentScreen = 'levelSelect';
      eventBus.emit('game:stateChange', this.state);
    });
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      eventBus.emit('key:down', e.code);

      if (e.code === 'KeyR' && this.state.currentScreen === 'playing') {
        this.restartLevel();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      eventBus.emit('key:up', e.code);
    });
  }

  loadLevel(levelId: number): void {
    const levelData = getLevel(levelId);
    if (!levelData) return;

    const level: Level = JSON.parse(JSON.stringify(levelData));

    this.state.currentLevel = levelId;
    this.state.level = level;
    this.state.player = this.createPlayer(level.playerStart.x, level.playerStart.y);
    this.state.currentScreen = 'playing';

    eventBus.emit('game:stateChange', this.state);
    eventBus.emit('game:levelLoaded', level);
  }

  restartLevel(): void {
    if (this.state.currentLevel > 0) {
      this.loadLevel(this.state.currentLevel);
    }
  }

  update(dt: number): void {
    if (this.state.currentScreen !== 'playing' || !this.state.level || this.state.isPaused) {
      return;
    }

    this.updateMechanisms(dt);
    this.updatePlayer(dt);
    this.checkLevelComplete();
    this.checkPlayerFall();

    eventBus.emit('game:update', {
      state: this.state,
      soundData: this.currentSoundData
    });
  }

  private updateMechanisms(dt: number): void {
    if (!this.state.level) return;

    const { frequency, volume } = this.currentSoundData;

    this.state.level.platforms.forEach(platform => {
      this.updatePlatform(platform, frequency, dt);
    });

    this.state.level.doors.forEach(door => {
      this.updateDoor(door, frequency, volume, dt);
    });

    this.state.level.blocks.forEach(block => {
      this.updateBlock(block, volume, dt);
    });
  }

  private updatePlatform(platform: SoundPlatform, frequency: number, dt: number): void {
    const [minFreq, maxFreq] = platform.activeFrequencyRange;
    const isActive = frequency >= minFreq && frequency <= maxFreq;

    platform.targetY = isActive ? platform.minY : platform.maxY;

    const diff = platform.targetY - platform.y;
    const moveAmount = Math.sign(diff) * Math.min(Math.abs(diff), PLATFORM_SPEED * dt);
    platform.y += moveAmount;
  }

  private updateDoor(door: SoundDoor, frequency: number, volume: number, dt: number): void {
    const [minFreq, maxFreq] = door.requiredFrequencyRange;
    const shouldOpen = volume >= door.requiredVolume &&
      frequency >= minFreq && frequency <= maxFreq;

    if (shouldOpen) {
      door.openProgress = Math.min(1, door.openProgress + dt / 0.3);
    } else {
      door.openProgress = Math.max(0, door.openProgress - dt / 0.3);
    }

    door.isOpen = door.openProgress > 0.9;
  }

  private updateBlock(block: PushableBlock, volume: number, dt: number): void {
    if (!this.state.level) return;

    const playerRect = this.getPlayerRect();
    const blockRect = {
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height
    };

    const isTouching = this.aabbCollides(playerRect, blockRect);
    const isPushing = isTouching && this.keys.has('KeyW');

    if (isPushing && volume > 0.1) {
      const pushDirection = playerRect.x < blockRect.x ? 1 : -1;
      block.vx = pushDirection * Math.min(MAX_PUSH_SPEED, volume * MAX_PUSH_SPEED);
    } else {
      block.vx *= 0.9;
      if (Math.abs(block.vx) < 1) block.vx = 0;
    }

    let newX = block.x + block.vx * dt;

    for (const wall of this.state.level.walls) {
      if (wall.height <= 0) continue;
      const testBlock = { ...block, x: newX };
      if (this.aabbCollides(testBlock, wall)) {
        newX = block.x;
        block.vx = 0;
        break;
      }
    }

    for (const other of this.state.level.blocks) {
      if (other.id === block.id) continue;
      const testBlock = { ...block, x: newX };
      if (this.aabbCollides(testBlock, other)) {
        newX = block.x;
        block.vx = 0;
        break;
      }
    }

    newX = Math.max(20, Math.min(GAME_WIDTH - 20 - block.width, newX));
    block.x = newX;
  }

  private updatePlayer(dt: number): void {
    const player = this.state.player;
    const level = this.state.level;
    if (!level) return;

    player.vx = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      player.vx = -PLAYER_SPEED;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      player.vx = PLAYER_SPEED;
    }

    if ((this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW')) && player.onGround) {
      player.vy = -JUMP_FORCE;
      player.onGround = false;
    }

    player.vy += GRAVITY * dt;

    let newX = player.x + player.vx * dt;
    let newY = player.y + player.vy * dt;

    player.onGround = false;

    const allSolids: Rect[] = [];

    level.walls.forEach(wall => {
      if (wall.height > 0) {
        allSolids.push(wall);
      }
    });

    level.platforms.forEach(platform => {
      allSolids.push({
        x: platform.x,
        y: platform.y,
        width: platform.width,
        height: platform.height
      });
    });

    level.doors.forEach(door => {
      if (!door.isOpen) {
        const renderX = door.x - door.openProgress * door.width;
        const effectiveWidth = door.width * (1 - door.openProgress);
        if (effectiveWidth > 5) {
          allSolids.push({
            x: renderX,
            y: door.y,
            width: effectiveWidth,
            height: door.height
          });
        }
      }
    });

    level.blocks.forEach(block => {
      allSolids.push({
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height
      });
    });

    const testX: Rect = { x: newX, y: player.y, width: player.width, height: player.height };
    for (const solid of allSolids) {
      if (this.aabbCollides(testX, solid)) {
        if (player.vx > 0) {
          newX = solid.x - player.width;
        } else if (player.vx < 0) {
          newX = solid.x + solid.width;
        }
        player.vx = 0;
        break;
      }
    }

    const testY: Rect = { x: newX, y: newY, width: player.width, height: player.height };
    for (const solid of allSolids) {
      if (this.aabbCollides(testY, solid)) {
        if (player.vy > 0) {
          newY = solid.y - player.height;
          player.onGround = true;
        } else if (player.vy < 0) {
          newY = solid.y + solid.height;
        }
        player.vy = 0;
        break;
      }
    }

    player.x = Math.max(20, Math.min(GAME_WIDTH - 20 - player.width, newX));
    player.y = newY;
  }

  private checkLevelComplete(): void {
    if (!this.state.level) return;

    const player = this.state.player;
    const goal = this.state.level.goal;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    const dx = playerCenterX - goal.x;
    const dy = playerCenterY - goal.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < goal.radius + player.width / 2) {
      this.onLevelComplete();
    }
  }

  private onLevelComplete(): void {
    const nextLevel = this.state.currentLevel + 1;
    if (nextLevel <= getTotalLevels() && !this.state.unlockedLevels.includes(nextLevel)) {
      this.state.unlockedLevels.push(nextLevel);
    }

    this.state.currentScreen = 'complete';
    eventBus.emit('game:levelComplete', this.state.currentLevel);
    eventBus.emit('game:stateChange', this.state);
  }

  private checkPlayerFall(): void {
    const player = this.state.player;
    if (player.y > GAME_HEIGHT + 100) {
      this.restartLevel();
    }
  }

  private aabbCollides(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
  }

  private getPlayerRect(): Rect {
    const p = this.state.player;
    return { x: p.x, y: p.y, width: p.width, height: p.height };
  }

  getState(): GameState {
    return this.state;
  }

  getCurrentSoundData(): SoundData {
    return this.currentSoundData;
  }

  getUnlockedLevels(): number[] {
    return [...this.state.unlockedLevels];
  }
}
