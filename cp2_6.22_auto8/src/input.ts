export interface InputState {
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  weaponSwitch: number | null;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private state: InputState = {
    mouseX: 400,
    mouseY: 300,
    mouseDown: false,
    weaponSwitch: null,
  };
  private switchConsumed = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.state.mouseX = e.clientX - rect.left;
      this.state.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) {
        this.state.mouseDown = true;
      }
    });

    this.canvas.addEventListener('mouseup', (e: MouseEvent) => {
      if (e.button === 0) {
        this.state.mouseDown = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e: Event) => {
      e.preventDefault();
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === '1') {
        this.state.weaponSwitch = 0;
        this.switchConsumed = false;
      } else if (e.key === '2') {
        this.state.weaponSwitch = 1;
        this.switchConsumed = false;
      } else if (e.key === '3') {
        this.state.weaponSwitch = 2;
        this.switchConsumed = false;
      }
    });
  }

  getState(): InputState {
    return { ...this.state };
  }

  consumeWeaponSwitch(): number | null {
    if (!this.switchConsumed && this.state.weaponSwitch !== null) {
      const val = this.state.weaponSwitch;
      this.switchConsumed = true;
      this.state.weaponSwitch = null;
      return val;
    }
    return null;
  }
}
