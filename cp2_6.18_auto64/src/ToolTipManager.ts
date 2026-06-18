import { HoverInfo } from './types';

export class ToolTipManager {
  private tooltipElement: HTMLElement;
  private isVisible: boolean = false;

  constructor() {
    this.tooltipElement = document.getElementById('tooltip') as HTMLElement;
    if (!this.tooltipElement) {
      this.tooltipElement = document.createElement('div');
      this.tooltipElement.id = 'tooltip';
      document.body.appendChild(this.tooltipElement);
    }
  }

  public show(info: HoverInfo): void {
    const time = new Date(info.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.tooltipElement.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px; color: #eab308;">
        路段 ${info.roadId.toUpperCase()}
      </div>
      <div style="display: flex; justify-content: space-between; gap: 16px;">
        <span>车流密度:</span>
        <span style="color: ${this.getDensityColor(info.density)}; font-weight: 700;">
          ${info.density} 辆/分钟
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 2px; opacity: 0.7;">
        <span>更新时间:</span>
        <span>${time}</span>
      </div>
    `;

    this.tooltipElement.style.display = 'block';
    this.isVisible = true;
    this.updatePosition(info.screenX, info.screenY);
  }

  public hide(): void {
    this.tooltipElement.style.display = 'none';
    this.isVisible = false;
  }

  public updatePosition(clientX: number, clientY: number): void {
    if (!this.isVisible) return;

    const offsetX = 15;
    const offsetY = 15;
    
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = clientX + offsetX;
    let top = clientY + offsetY;

    if (left + tooltipRect.width > viewportWidth) {
      left = clientX - tooltipRect.width - offsetX;
    }

    if (top + tooltipRect.height > viewportHeight) {
      top = clientY - tooltipRect.height - offsetY;
    }

    this.tooltipElement.style.left = `${Math.max(0, left)}px`;
    this.tooltipElement.style.top = `${Math.max(0, top)}px`;
  }

  private getDensityColor(density: number): string {
    if (density < 100) {
      return '#22c55e';
    } else if (density < 150) {
      return '#eab308';
    } else {
      return '#ef4444';
    }
  }

  public dispose(): void {
    this.hide();
  }
}
