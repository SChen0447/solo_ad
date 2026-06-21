import type { DisplayMode, AtomInfo } from '../molecule/MoleculeRenderer';

export interface UIEventCallbacks {
  onModeChange: (mode: DisplayMode) => void;
  onResetView: () => void;
}

export class UIPanel {
  private container: HTMLElement;
  private callbacks: UIEventCallbacks;
  private panel: HTMLElement;
  private infoCard: HTMLElement;
  private tooltip: HTMLElement;
  private select: HTMLSelectElement;
  private resetBtn: HTMLButtonElement;
  private infoName: HTMLElement;
  private infoElement: HTMLElement;
  private infoCoords: HTMLElement;
  private tooltipText: HTMLElement;
  private tooltipVisible: boolean = false;
  private infoVisible: boolean = false;

  constructor(container: HTMLElement, callbacks: UIEventCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.panel = this.createPanel();
    this.infoCard = this.createInfoCard();
    this.tooltip = this.createTooltip();
    this.select = this.panel.querySelector('#display-mode') as HTMLSelectElement;
    this.resetBtn = this.panel.querySelector('#reset-view') as HTMLButtonElement;
    this.infoName = this.infoCard.querySelector('#info-name') as HTMLElement;
    this.infoElement = this.infoCard.querySelector('#info-element') as HTMLElement;
    this.infoCoords = this.infoCard.querySelector('#info-coords') as HTMLElement;
    this.tooltipText = this.tooltip.querySelector('#tooltip-text') as HTMLElement;
    this.bindPanelEvents();
    this.container.appendChild(this.panel);
    this.container.appendChild(this.infoCard);
    this.container.appendChild(this.tooltip);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.style.cssText = `
      position: fixed;
      top: 24px;
      left: 24px;
      z-index: 100;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 16px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      min-width: 220px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    panel.innerHTML = `
      <h2 style="
        color: #e2e8f0;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 16px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        letter-spacing: 0.5px;
      ">分子查看器</h2>
      <div style="margin-bottom: 16px;">
        <label for="display-mode" style="
          display: block;
          color: #e2e8f0;
          font-size: 12px;
          margin-bottom: 8px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        ">显示模式</label>
        <select id="display-mode" style="
          width: 100%;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          transition: all 0.15s ease;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          appearance: none;
          background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23e2e8f0%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E');
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 32px;
        ">
          <option value="ball-stick" style="background: #1a1a2e; color: #e2e8f0;">球棍模型</option>
          <option value="space-filling" style="background: #1a1a2e; color: #e2e8f0;">空间填充模型</option>
          <option value="wireframe" style="background: #1a1a2e; color: #e2e8f0;">线框模型</option>
        </select>
      </div>
      <button id="reset-view" style="
        width: 100%;
        padding: 10px 16px;
        background: rgba(99, 102, 241, 0.25);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 8px;
        color: #e2e8f0;
        font-size: 13px;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.15s ease;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      ">重置视角</button>
      <div style="
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <p style="
          color: rgba(226, 232, 240, 0.6);
          font-size: 11px;
          line-height: 1.6;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        ">拖拽旋转 · 滚轮缩放 · 点击原子查看信息</p>
      </div>
    `;
    return panel;
  }

  private createInfoCard(): HTMLElement {
    const card = document.createElement('div');
    card.id = 'atom-info-card';
    card.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100;
      width: 200px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 16px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
      transform: translateY(10px);
    `;
    card.innerHTML = `
      <div id="info-name" style="
        color: #e2e8f0;
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 8px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      "></div>
      <div id="info-element" style="
        color: rgba(226, 232, 240, 0.75);
        font-size: 12px;
        margin-bottom: 12px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      "></div>
      <div style="
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <div style="
          color: rgba(226, 232, 240, 0.5);
          font-size: 10px;
          margin-bottom: 6px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        ">三维坐标</div>
        <div id="info-coords" style="
          color: #e2e8f0;
          font-size: 12px;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
          line-height: 1.8;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        "></div>
      </div>
    `;
    return card;
  }

  private createTooltip(): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.id = 'atom-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      z-index: 200;
      background: rgba(0, 0, 0, 0.75);
      color: #ffffff;
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 6px;
      pointer-events: none;
      opacity: 0;
      transform: translateY(5px);
      transition: opacity 0.15s ease, transform 0.15s ease;
      white-space: nowrap;
      font-family: inherit;
    `;
    tooltip.innerHTML = `<span id="tooltip-text"></span>`;
    return tooltip;
  }

  private bindPanelEvents(): void {
    this.select.addEventListener('change', () => {
      this.callbacks.onModeChange(this.select.value as DisplayMode);
    });

    this.select.addEventListener('mouseenter', () => {
      this.select.style.borderColor = 'rgba(99, 102, 241, 0.6)';
    });
    this.select.addEventListener('mouseleave', () => {
      this.select.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    });
    this.select.addEventListener('focus', () => {
      this.select.style.borderColor = 'rgba(99, 102, 241, 0.8)';
      this.select.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.2)';
    });
    this.select.addEventListener('blur', () => {
      this.select.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      this.select.style.boxShadow = 'none';
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.resetBtn.style.transform = 'scale(1)';
      }, 150);
      this.callbacks.onResetView();
    });
    this.resetBtn.addEventListener('mousedown', () => {
      this.resetBtn.style.transform = 'scale(0.95)';
    });
    this.resetBtn.addEventListener('mouseup', () => {
      this.resetBtn.style.transform = 'scale(1)';
    });
    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.background = 'rgba(99, 102, 241, 0.4)';
      this.resetBtn.style.borderColor = 'rgba(99, 102, 241, 0.6)';
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.background = 'rgba(99, 102, 241, 0.25)';
      this.resetBtn.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      this.resetBtn.style.transform = 'scale(1)';
    });
  }

  showAtomInfo(info: AtomInfo): void {
    this.infoName.textContent = info.name;
    this.infoElement.textContent = `元素符号: ${info.element}`;
    this.infoCoords.innerHTML = `
      <div>X: ${info.x.toFixed(2)}</div>
      <div>Y: ${info.y.toFixed(2)}</div>
      <div>Z: ${info.z.toFixed(2)}</div>
    `;
    if (!this.infoVisible) {
      this.infoVisible = true;
      requestAnimationFrame(() => {
        this.infoCard.style.opacity = '1';
        this.infoCard.style.visibility = 'visible';
        this.infoCard.style.transform = 'translateY(0)';
      });
    }
  }

  hideAtomInfo(): void {
    if (this.infoVisible) {
      this.infoVisible = false;
      this.infoCard.style.opacity = '0';
      this.infoCard.style.visibility = 'hidden';
      this.infoCard.style.transform = 'translateY(10px)';
    }
  }

  showTooltip(name: string, event: MouseEvent): void {
    this.tooltipText.textContent = name;
    const offsetX = 12;
    const offsetY = 12;
    this.tooltip.style.left = `${event.clientX + offsetX}px`;
    this.tooltip.style.top = `${event.clientY + offsetY}px`;
    if (!this.tooltipVisible) {
      this.tooltipVisible = true;
      requestAnimationFrame(() => {
        this.tooltip.style.opacity = '1';
        this.tooltip.style.transform = 'translateY(0)';
      });
    }
  }

  moveTooltip(event: MouseEvent): void {
    const offsetX = 12;
    const offsetY = 12;
    this.tooltip.style.left = `${event.clientX + offsetX}px`;
    this.tooltip.style.top = `${event.clientY + offsetY}px`;
  }

  hideTooltip(): void {
    if (this.tooltipVisible) {
      this.tooltipVisible = false;
      this.tooltip.style.opacity = '0';
      this.tooltip.style.transform = 'translateY(5px)';
    }
  }

  setCurrentMode(mode: DisplayMode): void {
    this.select.value = mode;
  }

  dispose(): void {
    if (this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    if (this.infoCard.parentNode) {
      this.infoCard.parentNode.removeChild(this.infoCard);
    }
    if (this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
  }
}
