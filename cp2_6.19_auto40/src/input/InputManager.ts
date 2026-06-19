export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private justPressed: Set<string> = new Set();
  private justReleased: Set<string> = new Set();
  private prevKeys: Map<string, boolean> = new Map();

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
      e.preventDefault();
    });
  }

  update(): void {
    this.justPressed.clear();
    this.justReleased.clear();
    this.keys.forEach((val, key) => {
      const prev = this.prevKeys.get(key) ?? false;
      if (val && !prev) this.justPressed.add(key);
      if (!val && prev) this.justReleased.add(key);
    });
    this.prevKeys = new Map(this.keys);
  }

  isHeld(code: string): boolean {
    return this.keys.get(code) === true;
  }

  isPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  isReleased(code: string): boolean {
    return this.justReleased.has(code);
  }

  getLeft(): boolean {
    return this.isHeld('ArrowLeft') || this.isHeld('KeyA');
  }

  getRight(): boolean {
    return this.isHeld('ArrowRight') || this.isHeld('KeyD');
  }

  getJump(): boolean {
    return this.isHeld('Space') || this.isHeld('ArrowUp') || this.isHeld('KeyW');
  }

  getJumpPressed(): boolean {
    return this.isPressed('Space') || this.isPressed('ArrowUp') || this.isPressed('KeyW');
  }

  getJumpReleased(): boolean {
    return this.isReleased('Space') || this.isReleased('ArrowUp') || this.isReleased('KeyW');
  }

  getRewind(): boolean {
    return this.isHeld('KeyZ');
  }

  getRewindPressed(): boolean {
    return this.isPressed('KeyZ');
  }

  getRewindReleased(): boolean {
    return this.isReleased('KeyZ');
  }
}
