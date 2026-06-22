import {
  Player,
  InputEvent,
  BeatEvent,
  Position,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  PERFECT_WINDOW,
  MISS_PENALTY_TIME,
  STUN_DURATION,
  GRID_WIDTH,
  GRID_HEIGHT,
  TileType
} from '../types';
import { CombatSystem } from './CombatSystem';

interface PendingInput {
  input: InputEvent;
  timeoutId: number;
}

export class PlayerController {
  private player: Player;
  private combatSystem: CombatSystem;
  private lastBeatTime: number = 0;
  private currentBeatIndex: number = -1;
  private pendingInput: PendingInput | null = null;
  private grid: number[][] = [];
  private onRhythmMissCallback: ((damage: number) => void) | null = null;
  private onAttackCallback: ((isPerfect: boolean) => void) | null = null;
  private onMoveCallback: ((newPosition: Position, isPerfect: boolean) => void) | null = null;
  private keysPressed: Set<string> = new Set();

  constructor(player: Player, combatSystem: CombatSystem) {
    this.player = player;
    this.combatSystem = combatSystem;
  }

  setGrid(grid: number[][]): void {
    this.grid = grid;
  }

  onBeat(event: BeatEvent): void {
    this.lastBeatTime = event.timestamp;
    this.currentBeatIndex = event.beatIndex;

    if (this.pendingInput) {
      clearTimeout(this.pendingInput.timeoutId);
      this.processInput(this.pendingInput.input, true);
      this.pendingInput = null;
    }
  }

  handleKeyDown(key: string): void {
    this.keysPressed.add(key.toLowerCase());
    
    if (this.player.isStunned) return;

    const timestamp = performance.now();
    let inputType: 'move' | 'attack' | null = null;

    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key.toLowerCase())) {
      inputType = 'move';
    } else if (key === ' ' || key === 'Space') {
      inputType = 'attack';
    }

    if (!inputType) return;

    const inputEvent: InputEvent = {
      key: key.toLowerCase(),
      timestamp,
      type: inputType
    };

    const timeSinceLastBeat = timestamp - this.lastBeatTime;
    const isNearBeat = timeSinceLastBeat <= PERFECT_WINDOW;

    if (isNearBeat) {
      this.processInput(inputEvent, true);
    } else {
      if (this.pendingInput) {
        clearTimeout(this.pendingInput.timeoutId);
      }

      const timeoutId = window.setTimeout(() => {
        if (this.pendingInput && this.pendingInput.input === inputEvent) {
          this.handleRhythmMiss();
          this.pendingInput = null;
        }
      }, MISS_PENALTY_TIME);

      this.pendingInput = {
        input: inputEvent,
        timeoutId
      };
    }
  }

  handleKeyUp(key: string): void {
    this.keysPressed.delete(key.toLowerCase());
  }

  private processInput(input: InputEvent, isPerfect: boolean): void {
    if (input.type === 'move') {
      this.processMove(input.key, isPerfect);
    } else if (input.type === 'attack') {
      this.processAttack(isPerfect);
    }
  }

  private processMove(key: string, isPerfect: boolean): void {
    let dx = 0;
    let dy = 0;
    let facing: 'up' | 'down' | 'left' | 'right' = this.player.facing;

    switch (key) {
      case 'w':
      case 'arrowup':
        dy = -TILE_SIZE;
        facing = 'up';
        break;
      case 's':
      case 'arrowdown':
        dy = TILE_SIZE;
        facing = 'down';
        break;
      case 'a':
      case 'arrowleft':
        dx = -TILE_SIZE;
        facing = 'left';
        break;
      case 'd':
      case 'arrowright':
        dx = TILE_SIZE;
        facing = 'right';
        break;
    }

    this.player.facing = facing;

    const newPosition: Position = {
      x: this.player.position.x + dx,
      y: this.player.position.y + dy
    };

    if (this.isValidMove(newPosition)) {
      this.player.position = newPosition;
      
      if (this.onMoveCallback) {
        this.onMoveCallback(newPosition, isPerfect);
      }
    }
  }

  private isValidMove(position: Position): boolean {
    if (position.x < 0 || position.x >= MAP_WIDTH || position.y < 0 || position.y >= MAP_HEIGHT) {
      return false;
    }

    const gridX = Math.floor(position.x / TILE_SIZE);
    const gridY = Math.floor(position.y / TILE_SIZE);

    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
      return false;
    }

    if (this.grid[gridY] && this.grid[gridY][gridX] === TileType.WALL) {
      return false;
    }

    return true;
  }

  private processAttack(isPerfect: boolean): void {
    if (this.onAttackCallback) {
      this.onAttackCallback(isPerfect);
    }
  }

  private handleRhythmMiss(): void {
    const damage = this.combatSystem.processRhythmMiss(this.player);
    this.stunPlayer();

    if (this.onRhythmMissCallback) {
      this.onRhythmMissCallback(damage);
    }
  }

  private stunPlayer(): void {
    this.player.isStunned = true;
    this.player.stunEndTime = performance.now() + STUN_DURATION;
  }

  update(currentTime: number): void {
    if (this.player.isStunned && currentTime >= this.player.stunEndTime) {
      this.player.isStunned = false;
    }
  }

  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key.toLowerCase());
  }

  getPlayer(): Player {
    return this.player;
  }

  setOnRhythmMissCallback(callback: (damage: number) => void): void {
    this.onRhythmMissCallback = callback;
  }

  setOnAttackCallback(callback: (isPerfect: boolean) => void): void {
    this.onAttackCallback = callback;
  }

  setOnMoveCallback(callback: (newPosition: Position, isPerfect: boolean) => void): void {
    this.onMoveCallback = callback;
  }

  destroy(): void {
    if (this.pendingInput) {
      clearTimeout(this.pendingInput.timeoutId);
    }
    this.keysPressed.clear();
  }
}

export default PlayerController;
