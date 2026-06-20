export interface InputState {
  direction: { x: number; y: number };
  isShooting: boolean;
  mouseX: number;
  mouseY: number;
}

export type InputCallback = (state: InputState) => void;

export class InputHandler {
  private keys: Set<string> = new Set();
  private isMouseDown: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private callbacks: InputCallback[] = [];
  private gameContainer: HTMLElement;

  constructor(container: HTMLElement) {
    this.gameContainer = container;
    this.setupKeyboard();
    this.setupMouse();
    this.setupTouch();
    this.setupMobileControls();
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        this.keys.add(key);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        this.keys.delete(key);
      }
    });
  }

  private setupMouse(): void {
    this.gameContainer.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      }
    });

    this.gameContainer.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    this.gameContainer.addEventListener('mousemove', (e) => {
      const rect = this.gameContainer.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    window.addEventListener('blur', () => {
      this.isMouseDown = false;
      this.keys.clear();
    });
  }

  private setupTouch(): void {
    this.gameContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.gameContainer.getBoundingClientRect();
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
      }
    });

    this.gameContainer.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.gameContainer.getBoundingClientRect();
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
      }
    });
  }

  private setupMobileControls(): void {
    const dpadButtons = document.querySelectorAll('.mobile-dpad button');
    const fireButton = document.getElementById('mobile-fire');

    dpadButtons.forEach((btn) => {
      const key = btn.getAttribute('data-key');
      if (!key) return;

      const startHandler = (e: Event) => {
        e.preventDefault();
        this.keys.add(key);
      };
      const endHandler = (e: Event) => {
        e.preventDefault();
        this.keys.delete(key);
      };

      btn.addEventListener('touchstart', startHandler, { passive: false });
      btn.addEventListener('touchend', endHandler, { passive: false });
      btn.addEventListener('mousedown', startHandler);
      btn.addEventListener('mouseup', endHandler);
      btn.addEventListener('mouseleave', endHandler);
    });

    if (fireButton) {
      const fireStart = (e: Event) => {
        e.preventDefault();
        this.isMouseDown = true;
      };
      const fireEnd = (e: Event) => {
        e.preventDefault();
        this.isMouseDown = false;
      };

      fireButton.addEventListener('touchstart', fireStart, { passive: false });
      fireButton.addEventListener('touchend', fireEnd, { passive: false });
      fireButton.addEventListener('mousedown', fireStart);
      fireButton.addEventListener('mouseup', fireEnd);
      fireButton.addEventListener('mouseleave', fireEnd);
    }
  }

  public subscribe(callback: InputCallback): void {
    this.callbacks.push(callback);
  }

  public unsubscribe(callback: InputCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  public update(): void {
    const state = this.getState();
    this.callbacks.forEach((cb) => cb(state));
  }

  public getState(): InputState {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w')) dy -= 1;
    if (this.keys.has('s')) dy += 1;
    if (this.keys.has('a')) dx -= 1;
    if (this.keys.has('d')) dx += 1;

    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) {
      dx /= length;
      dy /= length;
    }

    return {
      direction: { x: dx, y: dy },
      isShooting: this.isMouseDown,
      mouseX: this.mouseX,
      mouseY: this.mouseY,
    };
  }

  public destroy(): void {
    this.callbacks = [];
    this.keys.clear();
  }
}
