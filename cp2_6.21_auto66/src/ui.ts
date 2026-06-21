import * as THREE from 'three';

export interface UIState {
  creatureCount: number;
  mouseXZ: { x: number; z: number } | null;
}

export class UIManager {
  private infoBar: HTMLDivElement;
  private countSpan: HTMLSpanElement;
  private coordsSpan: HTMLSpanElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private groundPlane: THREE.Plane;
  private lastMouseActivity: number = 0;
  private isVisible: boolean = true;
  private idleTimeout: number = 3000;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.infoBar = document.createElement('div');
    this.countSpan = document.createElement('span');
    this.coordsSpan = document.createElement('span');

    this.createInfoBar();
    this.setupEventListeners();
    this.startIdleCheck();
  }

  private createInfoBar(): void {
    this.infoBar.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #FFFFFF;
      z-index: 999;
      transition: opacity 0.5s ease-in-out;
      pointer-events: none;
    `;

    const leftSection = document.createElement('div');
    leftSection.style.display = 'flex';
    leftSection.style.alignItems = 'center';
    leftSection.style.gap = '8px';

    const fishIcon = document.createElement('span');
    fishIcon.textContent = '🐠';
    fishIcon.style.fontSize = '18px';

    this.countSpan.style.cssText = `
      font-weight: 600;
      color: #38bdf8;
    `;

    leftSection.appendChild(fishIcon);
    leftSection.appendChild(document.createTextNode('生物总数: '));
    leftSection.appendChild(this.countSpan);

    const rightSection = document.createElement('div');
    rightSection.style.display = 'flex';
    rightSection.style.alignItems = 'center';
    rightSection.style.gap = '8px';

    const coordIcon = document.createElement('span');
    coordIcon.textContent = '📍';
    coordIcon.style.fontSize = '16px';

    this.coordsSpan.style.cssText = `
      font-weight: 500;
      color: #fbbf24;
      min-width: 120px;
      display: inline-block;
    `;
    this.coordsSpan.textContent = 'X: --, Z: --';

    rightSection.appendChild(coordIcon);
    rightSection.appendChild(document.createTextNode('坐标: '));
    rightSection.appendChild(this.coordsSpan);

    this.infoBar.appendChild(leftSection);
    this.infoBar.appendChild(rightSection);

    document.body.appendChild(this.infoBar);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (event) => {
      this.updateMouseActivity();
      this.updateMousePosition(event);
    });

    this.canvas.addEventListener('mouseenter', () => {
      this.updateMouseActivity();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -2;
      this.mouse.y = -2;
      this.coordsSpan.textContent = 'X: --, Z: --';
    });

    document.addEventListener('keydown', () => {
      this.updateMouseActivity();
    });

    document.addEventListener('mousedown', () => {
      this.updateMouseActivity();
    });

    document.addEventListener('wheel', () => {
      this.updateMouseActivity();
    });
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateMouseActivity(): void {
    this.lastMouseActivity = Date.now();
    if (!this.isVisible) {
      this.showInfoBar();
    }
  }

  private startIdleCheck(): void {
    const checkIdle = () => {
      const now = Date.now();
      if (now - this.lastMouseActivity > this.idleTimeout && this.isVisible) {
        this.hideInfoBar();
      }
      requestAnimationFrame(checkIdle);
    };
    checkIdle();
  }

  private showInfoBar(): void {
    this.isVisible = true;
    this.infoBar.style.opacity = '1';
  }

  private hideInfoBar(): void {
    this.isVisible = false;
    this.infoBar.style.opacity = '0';
  }

  update(state: UIState): void {
    this.countSpan.textContent = state.creatureCount.toString();

    if (this.mouse.x >= -1 && this.mouse.x <= 1 && this.mouse.y >= -1 && this.mouse.y <= 1) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersectPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);

      if (intersectPoint) {
        const x = Math.round(intersectPoint.x * 10) / 10;
        const z = Math.round(intersectPoint.z * 10) / 10;
        this.coordsSpan.textContent = `X: ${x.toFixed(1)}, Z: ${z.toFixed(1)}`;
      } else {
        this.coordsSpan.textContent = 'X: --, Z: --';
      }
    }
  }

  setCreatureCount(count: number): void {
    this.countSpan.textContent = count.toString();
  }
}
