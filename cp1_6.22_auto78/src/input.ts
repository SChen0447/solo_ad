export interface Direction {
  x: number;
  y: number;
}

type KeyName = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export class InputManager {
  private pressedKeys: Set<KeyName> = new Set();
  private lastPressed: KeyName | null = null;
  private readonly GAME_WIDTH = 800;
  private readonly GAME_HEIGHT = 600;
  private readonly PENGUIN_WIDTH = 30;
  private readonly PENGUIN_HEIGHT = 50;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key as KeyName;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      if (!this.pressedKeys.has(key)) {
        this.lastPressed = key;
      }
      this.pressedKeys.add(key);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key as KeyName;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      this.pressedKeys.delete(key);
      if (this.lastPressed === key) {
        this.lastPressed = null;
      }
    }
  }

  public getDirection(): Direction {
    if (this.lastPressed && this.pressedKeys.has(this.lastPressed)) {
      return this.keyToDirection(this.lastPressed);
    }
    const keys = Array.from(this.pressedKeys);
    if (keys.length > 0) {
      return this.keyToDirection(keys[keys.length - 1]);
    }
    return { x: 0, y: 0 };
  }

  private keyToDirection(key: KeyName): Direction {
    switch (key) {
      case 'ArrowUp':
        return { x: 0, y: -1 };
      case 'ArrowDown':
        return { x: 0, y: 1 };
      case 'ArrowLeft':
        return { x: -1, y: 0 };
      case 'ArrowRight':
        return { x: 1, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }

  public clampPosition(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.max(0, Math.min(this.GAME_WIDTH - this.PENGUIN_WIDTH, x)),
      y: Math.max(0, Math.min(this.GAME_HEIGHT - this.PENGUIN_HEIGHT, y)),
    };
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }
}
