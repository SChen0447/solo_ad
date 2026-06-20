export type GravityDirection = 'up' | 'down' | 'left' | 'right';

export class InputHandler {
  private onGravityChange: (direction: GravityDirection) => void;

  constructor(onGravityChange: (direction: GravityDirection) => void) {
    this.onGravityChange = onGravityChange;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        e.preventDefault();
        this.onGravityChange('up');
        break;
      case 'arrowdown':
      case 's':
        e.preventDefault();
        this.onGravityChange('down');
        break;
      case 'arrowleft':
      case 'a':
        e.preventDefault();
        this.onGravityChange('left');
        break;
      case 'arrowright':
      case 'd':
        e.preventDefault();
        this.onGravityChange('right');
        break;
    }
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
}
