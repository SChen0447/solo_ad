import type { PlateData } from '../data/platesData.js';
import type { PlateRenderer } from '../renderer/PlateRenderer.js';
import type { SceneManager } from '../renderer/SceneManager.js';

export class InfoPanel {
  private panel: HTMLElement;
  private nameEl: HTMLElement;
  private areaEl: HTMLElement;
  private currentPlate: PlateData | null = null;
  private visible: boolean = false;

  constructor(plateRenderer: PlateRenderer, sceneManager: SceneManager) {
    this.panel = document.createElement('div');
    this.panel.id = 'info-panel';
    this.panel.innerHTML = `
      <div class="info-name" id="info-name"></div>
      <div class="info-area" id="info-area"></div>
    `;
    this.panel.style.display = 'none';
    document.body.appendChild(this.panel);

    this.nameEl = document.getElementById('info-name')!;
    this.areaEl = document.getElementById('info-area')!;

    plateRenderer.setHoverCallback((plate, position) => {
      if (plate) {
        this.show(plate, position);
      } else {
        this.hide();
      }
    });

    const canvas = sceneManager.renderer.domElement;
    canvas.addEventListener('mousemove', (event: MouseEvent) => {
      const mouse = sceneManager.getMouseNDC(event);
      plateRenderer.checkHover(mouse, sceneManager.camera, {
        x: event.clientX,
        y: event.clientY,
      });
    });

    canvas.addEventListener('mouseleave', () => {
      this.hide();
    });

    this.applyStyles();
  }

  private show(plate: PlateData, position: { x: number; y: number }): void {
    if (this.currentPlate?.id !== plate.id) {
      this.nameEl.textContent = plate.nameCN;
      this.areaEl.textContent = `面积：${plate.area} 百万km²`;
      this.currentPlate = plate;
    }

    this.panel.style.display = 'block';
    this.visible = true;

    const offsetX = 20;
    const offsetY = -10;
    let left = position.x + offsetX;
    let top = position.y + offsetY;

    const rect = this.panel.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - 10) {
      left = position.x - rect.width - offsetX;
    }
    if (top + rect.height > window.innerHeight - 10) {
      top = position.y - rect.height - offsetY;
    }
    if (top < 10) top = 10;

    this.panel.style.left = `${left}px`;
    this.panel.style.top = `${top}px`;
    this.panel.style.opacity = '1';
    this.panel.style.transform = 'scale(1)';
  }

  private hide(): void {
    this.panel.style.opacity = '0';
    this.panel.style.transform = 'scale(0.95)';
    this.currentPlate = null;
    this.visible = false;
    setTimeout(() => {
      if (!this.visible) {
        this.panel.style.display = 'none';
      }
    }, 200);
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #info-panel {
        position: fixed;
        z-index: 200;
        padding: 12px 18px;
        background: linear-gradient(135deg, rgba(28,42,74,0.92), rgba(10,15,30,0.95));
        backdrop-filter: blur(12px);
        border: 1px solid rgba(106,143,255,0.25);
        border-radius: 12px;
        box-shadow: 
          0 8px 24px rgba(0,0,0,0.4),
          0 0 12px rgba(106,143,255,0.1),
          inset 0 1px 0 rgba(255,255,255,0.05);
        pointer-events: none;
        opacity: 0;
        transform: scale(0.95);
        transition: opacity 0.2s ease, transform 0.2s ease;
        min-width: 140px;
      }
      
      .info-name {
        font-size: 15px;
        font-weight: 600;
        color: #e0e6ff;
        margin-bottom: 4px;
        text-shadow: 0 0 8px rgba(106,143,255,0.3);
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      }
      
      .info-area {
        font-size: 12px;
        color: rgba(224,230,255,0.6);
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      }
    `;
    document.head.appendChild(style);
  }
}
