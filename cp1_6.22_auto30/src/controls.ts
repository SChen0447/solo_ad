import type { ShapeType, Vec2 } from './softbody';

export interface ControlParams {
  shape: ShapeType;
  stiffness: number;
  damping: number;
  pressure: number;
  gravity: Vec2;
  performanceMode: boolean;
}

export interface ControlCallbacks {
  onShapeChange: (shape: ShapeType) => void;
  onStiffnessChange: (value: number) => void;
  onDampingChange: (value: number) => void;
  onPressureChange: (value: number) => void;
  onGravityChange: (gravity: Vec2) => void;
  onPerformanceModeChange: (enabled: boolean) => void;
}

export class Controls {
  private shapeSelect: HTMLSelectElement;
  private stiffnessSlider: HTMLInputElement;
  private stiffnessValue: HTMLElement;
  private dampingSlider: HTMLInputElement;
  private dampingValue: HTMLElement;
  private pressureSlider: HTMLInputElement;
  private pressureValue: HTMLElement;
  private gravityButtons: NodeListOf<HTMLButtonElement>;
  private perfToggle: HTMLElement;
  private controlPanel: HTMLElement;
  private mobileToggle: HTMLElement;

  private params: ControlParams;
  private callbacks: ControlCallbacks;

  private targetStiffness: number;
  private targetDamping: number;
  private targetPressure: number;
  private currentStiffness: number;
  private currentDamping: number;
  private currentPressure: number;
  private transitionSpeed = 1;

  constructor(callbacks: ControlCallbacks, initialParams: ControlParams) {
    this.callbacks = callbacks;
    this.params = { ...initialParams };

    this.targetStiffness = initialParams.stiffness;
    this.targetDamping = initialParams.damping;
    this.targetPressure = initialParams.pressure;
    this.currentStiffness = initialParams.stiffness;
    this.currentDamping = initialParams.damping;
    this.currentPressure = initialParams.pressure;

    this.shapeSelect = document.getElementById('shape-select') as HTMLSelectElement;
    this.stiffnessSlider = document.getElementById('stiffness-slider') as HTMLInputElement;
    this.stiffnessValue = document.getElementById('stiffness-value') as HTMLElement;
    this.dampingSlider = document.getElementById('damping-slider') as HTMLInputElement;
    this.dampingValue = document.getElementById('damping-value') as HTMLElement;
    this.pressureSlider = document.getElementById('pressure-slider') as HTMLInputElement;
    this.pressureValue = document.getElementById('pressure-value') as HTMLElement;
    this.gravityButtons = document.querySelectorAll('.gravity-btn') as NodeListOf<HTMLButtonElement>;
    this.perfToggle = document.getElementById('perf-toggle') as HTMLElement;
    this.controlPanel = document.getElementById('control-panel') as HTMLElement;
    this.mobileToggle = document.getElementById('mobile-toggle') as HTMLElement;

    this.bindEvents();
    this.updateUI();
  }

  private bindEvents(): void {
    this.shapeSelect.addEventListener('change', (e) => {
      const shape = (e.target as HTMLSelectElement).value as ShapeType;
      this.params.shape = shape;
      this.callbacks.onShapeChange(shape);
      this.animateElement(this.shapeSelect);
    });

    this.stiffnessSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.targetStiffness = value;
      this.stiffnessValue.textContent = value.toFixed(1);
      this.animateSlider(this.stiffnessSlider);
    });

    this.stiffnessSlider.addEventListener('change', () => {
      this.currentStiffness = this.targetStiffness;
    });

    this.dampingSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.targetDamping = value;
      this.dampingValue.textContent = value.toFixed(2);
      this.animateSlider(this.dampingSlider);
    });

    this.dampingSlider.addEventListener('change', () => {
      this.currentDamping = this.targetDamping;
    });

    this.pressureSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.targetPressure = value;
      this.pressureValue.textContent = value.toFixed(2);
      this.animateSlider(this.pressureSlider);
    });

    this.pressureSlider.addEventListener('change', () => {
      this.currentPressure = this.targetPressure;
    });

    this.gravityButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('empty')) return;
        const direction = btn.dataset.direction as string;
        this.setGravityDirection(direction);
        this.animateElement(btn);
      });
    });

    this.perfToggle.addEventListener('click', () => {
      this.params.performanceMode = !this.params.performanceMode;
      this.perfToggle.classList.toggle('active', this.params.performanceMode);
      this.callbacks.onPerformanceModeChange(this.params.performanceMode);
      this.animateElement(this.perfToggle);
    });

    this.mobileToggle.addEventListener('click', () => {
      this.controlPanel.classList.toggle('open');
    });

    this.controlPanel.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        const target = e.target as HTMLElement;
        if (target.closest('.slider') || target.closest('select') || 
            target.closest('.gravity-btn') || target.closest('.toggle-switch')) {
          return;
        }
      }
    });
  }

  private setGravityDirection(direction: string): void {
    let gravity: Vec2 = { x: 0, y: 0 };
    const magnitude = 100;

    switch (direction) {
      case 'up':
        gravity = { x: 0, y: -magnitude };
        break;
      case 'down':
        gravity = { x: 0, y: magnitude };
        break;
      case 'left':
        gravity = { x: -magnitude, y: 0 };
        break;
      case 'right':
        gravity = { x: magnitude, y: 0 };
        break;
    }

    this.params.gravity = gravity;
    this.callbacks.onGravityChange(gravity);

    this.gravityButtons.forEach(btn => {
      if (btn.dataset.direction === direction) {
        btn.classList.add('active');
      } else if (!btn.classList.contains('empty')) {
        btn.classList.remove('active');
      }
    });
  }

  private animateElement(el: HTMLElement): void {
    el.style.transform = 'scale(0.95)';
    setTimeout(() => {
      el.style.transform = 'scale(1.05)';
    }, 50);
    setTimeout(() => {
      el.style.transform = 'scale(1)';
    }, 150);
  }

  private animateSlider(slider: HTMLInputElement): void {
    const thumb = slider.querySelector('::-webkit-slider-thumb') as HTMLElement;
    if (thumb) {
      thumb.style.transform = 'scale(1.2)';
      setTimeout(() => {
        thumb.style.transform = 'scale(1)';
      }, 150);
    }
  }

  private updateUI(): void {
    this.shapeSelect.value = this.params.shape;
    this.stiffnessSlider.value = this.params.stiffness.toString();
    this.stiffnessValue.textContent = this.params.stiffness.toFixed(1);
    this.dampingSlider.value = this.params.damping.toString();
    this.dampingValue.textContent = this.params.damping.toFixed(2);
    this.pressureSlider.value = this.params.pressure.toString();
    this.pressureValue.textContent = this.params.pressure.toFixed(2);

    this.perfToggle.classList.toggle('active', this.params.performanceMode);

    this.gravityButtons.forEach(btn => {
      if (btn.classList.contains('empty')) return;
      const dir = btn.dataset.direction;
      const isActive = 
        (dir === 'up' && this.params.gravity.y < 0) ||
        (dir === 'down' && this.params.gravity.y > 0) ||
        (dir === 'left' && this.params.gravity.x < 0) ||
        (dir === 'right' && this.params.gravity.x > 0);
      btn.classList.toggle('active', isActive);
    });
  }

  public update(dt: number): void {
    const stiffnessDiff = this.targetStiffness - this.currentStiffness;
    if (Math.abs(stiffnessDiff) > 0.001) {
      this.currentStiffness += stiffnessDiff * Math.min(1, dt * this.transitionSpeed);
      this.callbacks.onStiffnessChange(this.currentStiffness);
    }

    const dampingDiff = this.targetDamping - this.currentDamping;
    if (Math.abs(dampingDiff) > 0.001) {
      this.currentDamping += dampingDiff * Math.min(1, dt * this.transitionSpeed);
      this.callbacks.onDampingChange(this.currentDamping);
    }

    const pressureDiff = this.targetPressure - this.currentPressure;
    if (Math.abs(pressureDiff) > 0.001) {
      this.currentPressure += pressureDiff * Math.min(1, dt * this.transitionSpeed);
      this.callbacks.onPressureChange(this.currentPressure);
    }
  }
}
