import * as THREE from 'three';
import type { CityGenerator } from '../core/CityGenerator';
import type { Simulator } from '../data/Simulator';

export type ViewType = 'bird' | 'street' | 'top' | 'orbit';

interface ViewPreset {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const VIEW_PRESETS: Record<Exclude<ViewType, 'orbit'>, ViewPreset> = {
  bird: {
    name: '鸟瞰',
    position: new THREE.Vector3(60, 70, 60),
    target: new THREE.Vector3(0, 5, 0)
  },
  street: {
    name: '街道',
    position: new THREE.Vector3(8, 6, 20),
    target: new THREE.Vector3(0, 8, 0)
  },
  top: {
    name: '俯视',
    position: new THREE.Vector3(0, 100, 0.01),
    target: new THREE.Vector3(0, 0, 0)
  }
};

export class ControlPanel {
  private container: HTMLDivElement;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cityGenerator: CityGenerator;
  private simulator: Simulator;
  private currentView: ViewType = 'bird';
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();
  private orbitAngle: number = 0;
  private isAnimating: boolean = false;
  private startPosition: THREE.Vector3 = new THREE.Vector3();
  private startLookAt: THREE.Vector3 = new THREE.Vector3();
  private animationProgress: number = 0;
  private readonly ANIMATION_DURATION: number = 1.0;

  constructor(
    parent: HTMLElement,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    cityGenerator: CityGenerator,
    simulator: Simulator
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.cityGenerator = cityGenerator;
    this.simulator = simulator;

    this.container = document.createElement('div');
    this.applyContainerStyles();

    const buttons = [
      { id: 'view-toggle', label: '视角', icon: '◉', title: '切换视角' },
      { id: 'reset', label: '重置', icon: '↺', title: '重置城市' },
      { id: 'screenshot', label: '截图', icon: '◈', title: '导出截图' },
      { id: 'auto', label: '自动', icon: '⚡', title: '切换自动更新' }
    ];

    buttons.forEach((btn, idx) => {
      const el = this.createButton(btn.label, btn.icon, btn.title);
      el.dataset.id = btn.id;
      if (idx === 0) el.addEventListener('click', () => this.cycleView());
      if (idx === 1) el.addEventListener('click', () => this.resetCity());
      if (idx === 2) el.addEventListener('click', () => this.takeScreenshot());
      if (idx === 3) el.addEventListener('click', (e) => this.toggleAuto(el));
      this.container.appendChild(el);
    });

    parent.appendChild(this.container);

    this.setView('bird');
  }

  private applyContainerStyles(): void {
    this.container.style.position = 'absolute';
    this.container.style.bottom = '20px';
    this.container.style.right = '20px';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '10px';
    this.container.style.zIndex = '100';
  }

  private createButton(label: string, icon: string, title: string): HTMLDivElement {
    const btn = document.createElement('div');
    btn.title = title;
    btn.style.cssText = `
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: rgba(10, 14, 39, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 212, 255, 0.2);
      color: #00D4FF;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      user-select: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    `;

    const iconEl = document.createElement('div');
    iconEl.style.cssText = 'font-size: 18px; line-height: 1; margin-bottom: 2px;';
    iconEl.textContent = icon;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = 'font-size: 10px; color: #a8b5cf; letter-spacing: 0.5px;';
    labelEl.textContent = label;

    btn.appendChild(iconEl);
    btn.appendChild(labelEl);

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.08)';
      btn.style.borderColor = 'rgba(0, 212, 255, 0.8)';
      btn.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.5), 0 4px 16px rgba(0, 0, 0, 0.4)';
      (iconEl).style.color = '#FF6B35;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.borderColor = 'rgba(0, 212, 255, 0.2)';
      btn.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
      iconEl.style.color = '#00D4FF';
    });

    return btn;
  }

  private cycleView(): void {
    const views: ViewType[] = ['bird', 'street', 'top', 'orbit'];
    const currentIdx = views.indexOf(this.currentView);
    const nextView = views[(currentIdx + 1) % views.length];
    this.setView(nextView);
  }

  public setView(view: ViewType): void {
    this.currentView = view;
    this.isAnimating = true;
    this.animationProgress = 0;

    this.startPosition.copy(this.camera.position);
    this.startLookAt.copy(this.targetLookAt);

    if (view === 'orbit') {
      this.orbitAngle = Math.atan2(this.camera.position.z, this.camera.position.x);
    }

    this.updateTargetFromView();
  }

  private updateTargetFromView(): void {
    if (this.currentView === 'orbit') {
      const radius = 80;
      this.targetPosition.set(
        Math.cos(this.orbitAngle) * radius,
        40,
        Math.sin(this.orbitAngle) * radius
      );
      this.targetLookAt.set(0, 10, 0);
    } else {
      const preset = VIEW_PRESETS[this.currentView];
      this.targetPosition.copy(preset.position);
      this.targetLookAt.copy(preset.target);
    }
  }

  private resetCity(): void {
    this.simulator.setData({
      time: 12,
      weather: 'sunny',
      populationDensity: 50
    });
    this.setView('bird');
  }

  private takeScreenshot(): void {
    this.renderer.render(this.renderer.info as any, this.camera);
    const dataURL = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `city_${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }

  private autoEnabled: boolean = true;

  private toggleAuto(btn: HTMLDivElement): void {
    this.autoEnabled = !this.autoEnabled;
    if (this.autoEnabled) {
      this.simulator.startAutoUpdate();
      btn.style.borderColor = 'rgba(0, 212, 255, 0.6)';
    } else {
      this.simulator.stopAutoUpdate();
      btn.style.borderColor = 'rgba(255, 107, 53, 0.6)';
    }
  }

  public animate(deltaTime: number): void {
    if (this.currentView === 'orbit' && !this.isAnimating) {
      this.orbitAngle += deltaTime * 0.15;
      this.updateTargetFromView();
      this.camera.position.lerp(this.targetPosition, 0.05);
      this.camera.lookAt(this.targetLookAt);
      this.targetLookAt.copy(this.targetLookAt);
      return;
    }

    if (this.isAnimating) {
      this.animationProgress = Math.min(1, this.animationProgress + deltaTime / this.ANIMATION_DURATION);
      const t = this.easeInOutCubic(this.animationProgress);
      this.camera.position.lerpVectors(this.startPosition, this.targetPosition, t);
      const look = new THREE.Vector3().lerpVectors(this.startLookAt, this.targetLookAt, t);
      this.camera.lookAt(look);
      this.targetLookAt.copy(look);
      if (this.animationProgress >= 1) {
        this.isAnimating = false;
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getCurrentViewName(): string {
    if (this.currentView === 'orbit') return '动态漫游';
    return VIEW_PRESETS[this.currentView].name;
  }
}
