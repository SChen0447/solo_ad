import type { PlateData } from '../data/platesData.js';
import type { PlateRenderer, PlateVelocity } from '../renderer/PlateRenderer.js';
import type { SceneManager } from '../renderer/SceneManager.js';

export class InfoPanel {
  private panel: HTMLElement;
  private nameEl: HTMLElement;
  private areaEl: HTMLElement;
  private speedEl: HTMLElement;
  private currentPlateId: string | null = null;
  private visible: boolean = false;
  private animationFrame: number | null = null;
  private sceneManager: SceneManager;
  private plateRenderer: PlateRenderer;

  constructor(plateRenderer: PlateRenderer, sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.plateRenderer = plateRenderer;

    this.panel = document.createElement('div');
    this.panel.id = 'info-panel';
    this.panel.innerHTML = `
      <div class="info-accent"></div>
      <div class="info-content">
        <div class="info-name" id="info-name"></div>
        <div class="info-stats">
          <div class="info-stat">
            <span class="info-stat-label">面积</span>
            <span class="info-stat-value" id="info-area"></span>
          </div>
          <div class="info-stat">
            <span class="info-stat-label">漂移速度</span>
            <span class="info-stat-value" id="info-speed"></span>
          </div>
        </div>
      </div>
    `;
    this.panel.style.display = 'none';
    document.body.appendChild(this.panel);

    this.nameEl = document.getElementById('info-name')!;
    this.areaEl = document.getElementById('info-area')!;
    this.speedEl = document.getElementById('info-speed')!;

    plateRenderer.setHoverCallback((plate, _position, center) => {
      if (plate) {
        this.show(plate, center);
      } else {
        this.hide();
      }
    });

    const canvas = sceneManager.renderer.domElement;
    canvas.addEventListener('mousemove', (event: MouseEvent) => {
      const mouse = sceneManager.getMouseNDC(event);
      const rect = canvas.getBoundingClientRect();
      plateRenderer.checkHover(
        mouse,
        sceneManager.camera,
        { x: event.clientX, y: event.clientY },
        rect.width,
        rect.height
      );
    });

    canvas.addEventListener('mouseleave', () => {
      this.hide();
    });

    this.applyStyles();
  }

  private formatSpeed(v: PlateVelocity | null): string {
    if (!v || v.speed < 0.01) return '≈ 0 cm/年';
    return `${v.speed.toFixed(2)} cm/年`;
  }

  private show(plate: PlateData, center: { x: number; y: number } | null): void {
    const isNewPlate = this.currentPlateId !== plate.id;
    if (isNewPlate) {
      this.nameEl.textContent = plate.nameCN;
      this.areaEl.textContent = `${plate.area} 百万km²`;
      this.currentPlateId = plate.id;
    }

    const vel = this.plateRenderer.getPlateVelocity(plate.id);
    this.speedEl.textContent = this.formatSpeed(vel);

    this.panel.style.display = 'block';
    this.visible = true;

    let targetLeft: number;
    let targetTop: number;

    if (center) {
      targetLeft = center.x;
      targetTop = center.y;
    } else {
      return;
    }

    const rect = this.panel.getBoundingClientRect();
    const panelWidth = rect.width || 180;
    const panelHeight = rect.height || 110;

    let left = targetLeft - panelWidth / 2;
    let top = targetTop - panelHeight - 20;

    if (left < 10) left = 10;
    if (left + panelWidth > window.innerWidth - 10) {
      left = window.innerWidth - panelWidth - 10;
    }
    if (top < 10) {
      top = targetTop + 20;
    }
    if (top + panelHeight > window.innerHeight - 10) {
      top = targetTop - panelHeight - 20;
    }

    this.panel.style.left = `${left}px`;
    this.panel.style.top = `${top}px`;

    if (isNewPlate || this.panel.style.opacity !== '1') {
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      const startTime = performance.now();
      const duration = 300;
      const startOpacity = parseFloat(this.panel.style.opacity || '0');
      const startScale = parseFloat(this.panel.style.transform?.replace(/[^\d.]/g, '') || '0.85') || 0.85;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const opacity = startOpacity + (1 - startOpacity) * ease;
        const scale = startScale + (1 - startScale) * ease;

        this.panel.style.opacity = opacity.toString();
        this.panel.style.transform = `scale(${scale}) translateY(${(1 - scale) * 10}px)`;

        if (t < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          this.animationFrame = null;
        }
      };
      this.animationFrame = requestAnimationFrame(animate);
    }
  }

  private hide(): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.currentPlateId = null;
    this.visible = false;

    const startTime = performance.now();
    const duration = 200;
    const startOpacity = parseFloat(this.panel.style.opacity || '1');
    const startScale = 1;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t * t;
      const opacity = startOpacity * (1 - ease);
      const scale = startScale * (1 - ease * 0.1);

      this.panel.style.opacity = opacity.toString();
      this.panel.style.transform = `scale(${scale})`;

      if (t < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
        if (!this.visible) {
          this.panel.style.display = 'none';
        }
      }
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #info-panel {
        position: fixed;
        z-index: 200;
        pointer-events: none;
        opacity: 0;
        transform: scale(0.85);
        display: flex;
        min-width: 180px;
      }

      .info-accent {
        width: 4px;
        background: linear-gradient(180deg, #6a8fff, #9b59ff);
        border-radius: 12px 0 0 12px;
        box-shadow: 0 0 12px rgba(106, 143, 255, 0.5);
      }

      .info-content {
        flex: 1;
        padding: 12px 16px;
        background: linear-gradient(135deg, rgba(28, 42, 74, 0.95), rgba(12, 18, 36, 0.97));
        backdrop-filter: blur(14px);
        border: 1px solid rgba(106, 143, 255, 0.22);
        border-radius: 0 12px 12px 0;
        box-shadow:
          0 12px 40px rgba(0, 0, 0, 0.5),
          0 0 20px rgba(106, 143, 255, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }

      .info-name {
        font-size: 15px;
        font-weight: 600;
        color: #e8ecff;
        margin-bottom: 10px;
        text-shadow: 0 0 10px rgba(106, 143, 255, 0.4);
        letter-spacing: 0.5px;
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      }

      .info-stats {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .info-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      .info-stat-label {
        font-size: 11px;
        color: rgba(224, 230, 255, 0.5);
        letter-spacing: 0.5px;
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      }

      .info-stat-value {
        font-size: 13px;
        font-weight: 500;
        color: rgba(224, 230, 255, 0.92);
        font-variant-numeric: tabular-nums;
        text-shadow: 0 0 6px rgba(155, 89, 255, 0.3);
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      }
    `;
    document.head.appendChild(style);
  }
}
