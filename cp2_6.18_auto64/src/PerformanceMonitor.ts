import Stats from 'stats.js';
import { LOW_FPS_THRESHOLD } from './types';

export class PerformanceMonitor {
  private stats: Stats;
  private warningElement: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  private isWarningVisible: boolean = false;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    
    this.stats = new Stats();
    this.stats.showPanel(0);
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.left = '10px';
    this.stats.dom.style.bottom = '10px';
    this.stats.dom.style.top = 'auto';
    this.stats.dom.style.zIndex = '1000';
    document.body.appendChild(this.stats.dom);

    this.warningElement = document.getElementById('fps-warning') as HTMLElement;
    if (!this.warningElement) {
      this.warningElement = document.createElement('div');
      this.warningElement.id = 'fps-warning';
      this.warningElement.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 22H22L12 2Z" fill="#ef4444"/>
          <path d="M12 9V14" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="17" r="1" fill="white"/>
        </svg>
      `;
      document.body.appendChild(this.warningElement);
    }
  }

  public begin(): void {
    this.stats.begin();
  }

  public end(): number {
    this.stats.end();
    
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      
      this.updateWarning(this.currentFps);
    }

    return this.currentFps;
  }

  private updateWarning(fps: number): void {
    if (fps < LOW_FPS_THRESHOLD && !this.isWarningVisible) {
      this.warningElement.style.display = 'block';
      this.isWarningVisible = true;
    } else if (fps >= LOW_FPS_THRESHOLD && this.isWarningVisible) {
      this.warningElement.style.display = 'none';
      this.isWarningVisible = false;
    }
  }

  public getTriangleCount(): number {
    const info = this.renderer.info;
    return info.render.triangles;
  }

  public getDrawCalls(): number {
    const info = this.renderer.info;
    return info.render.calls;
  }

  public getCurrentFps(): number {
    return this.currentFps;
  }

  public dispose(): void {
    document.body.removeChild(this.stats.dom);
    if (this.warningElement.parentNode) {
      this.warningElement.style.display = 'none';
    }
  }
}
