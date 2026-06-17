import type { BodyType } from '../core/AstroBody';

type EventCallback = (...args: any[]) => void;

export interface ToolbarEvents {
  'create:type': (type: BodyType) => void;
  'gravity:change': (value: number) => void;
  'simulation:pause': (paused: boolean) => void;
  'simulation:clear': () => void;
  'view:top': () => void;
  'view:side': () => void;
  'config:save': () => void;
  'config:load': (id: string) => void;
}

export class Toolbar {
  private eventBus: Map<keyof ToolbarEvents, EventCallback[]> = new Map();
  private currentType: BodyType = 'planet';
  private isPaused: boolean = false;
  private gravityValue: number = 0.5;

  private btnPlanet: HTMLButtonElement;
  private btnStar: HTMLButtonElement;
  private btnPause: HTMLButtonElement;
  private btnClear: HTMLButtonElement;
  private btnTop: HTMLButtonElement;
  private btnSide: HTMLButtonElement;
  private btnSave: HTMLButtonElement;
  private btnLoad: HTMLButtonElement;
  private gravitySlider: HTMLInputElement;
  private gravityValueEl: HTMLElement;
  private loadIdInput: HTMLInputElement;
  private configIdEl: HTMLElement;

  constructor() {
    this.btnPlanet = document.getElementById('btn-planet') as HTMLButtonElement;
    this.btnStar = document.getElementById('btn-star') as HTMLButtonElement;
    this.btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
    this.btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
    this.btnTop = document.getElementById('btn-top') as HTMLButtonElement;
    this.btnSide = document.getElementById('btn-side') as HTMLButtonElement;
    this.btnSave = document.getElementById('btn-save') as HTMLButtonElement;
    this.btnLoad = document.getElementById('btn-load') as HTMLButtonElement;
    this.gravitySlider = document.getElementById('gravity-slider') as HTMLInputElement;
    this.gravityValueEl = document.getElementById('gravity-value') as HTMLElement;
    this.loadIdInput = document.getElementById('load-id-input') as HTMLInputElement;
    this.configIdEl = document.getElementById('config-id') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.btnPlanet.addEventListener('click', () => {
      this.setCreateType('planet');
    });

    this.btnStar.addEventListener('click', () => {
      this.setCreateType('star');
    });

    this.btnPause.addEventListener('click', () => {
      this.togglePause();
    });

    this.btnClear.addEventListener('click', () => {
      this.emit('simulation:clear');
    });

    this.btnTop.addEventListener('click', () => {
      this.emit('view:top');
    });

    this.btnSide.addEventListener('click', () => {
      this.emit('view:side');
    });

    this.btnSave.addEventListener('click', () => {
      this.emit('config:save');
    });

    this.btnLoad.addEventListener('click', () => {
      const id = this.loadIdInput.value.trim();
      if (id) {
        this.emit('config:load', id);
      }
    });

    this.gravitySlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      this.gravityValue = value;
      this.animateValue(this.gravityValueEl, parseFloat(this.gravityValueEl.textContent || '0'), value, 200);
      this.emit('gravity:change', value);
    });
  }

  private animateValue(element: HTMLElement, from: number, to: number, duration: number): void {
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = from + (to - from) * easeProgress;
      element.textContent = currentValue.toFixed(2);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  private setCreateType(type: BodyType): void {
    this.currentType = type;
    this.btnPlanet.classList.toggle('active', type === 'planet');
    this.btnStar.classList.toggle('active', type === 'star');
    this.emit('create:type', type);
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.btnPause.textContent = this.isPaused ? '继续' : '暂停';
    this.btnPause.classList.toggle('active', this.isPaused);
    this.emit('simulation:pause', this.isPaused);
  }

  public on<K extends keyof ToolbarEvents>(event: K, callback: ToolbarEvents[K]): void {
    if (!this.eventBus.has(event)) {
      this.eventBus.set(event, []);
    }
    this.eventBus.get(event)!.push(callback as EventCallback);
  }

  private emit<K extends keyof ToolbarEvents>(event: K, ...args: Parameters<ToolbarEvents[K]>): void {
    const callbacks = this.eventBus.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  public getCurrentType(): BodyType {
    return this.currentType;
  }

  public getGravityValue(): number {
    return this.gravityValue;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public showConfigId(id: string): void {
    this.configIdEl.textContent = `已保存，ID: ${id}`;
    setTimeout(() => {
      if (this.configIdEl.textContent === `已保存，ID: ${id}`) {
        this.configIdEl.textContent = '';
      }
    }, 8000);
  }

  public showMessage(message: string): void {
    this.configIdEl.textContent = message;
    setTimeout(() => {
      if (this.configIdEl.textContent === message) {
        this.configIdEl.textContent = '';
      }
    }, 4000);
  }
}
