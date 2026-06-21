export interface HudStats {
  faceCount: number;
  vertexCount: number;
  memoryKB: number;
  fps: number;
}

export class Hud {
  private container: HTMLElement;
  private hudRoot: HTMLDivElement;
  private faceCountEl: HTMLSpanElement;
  private vertexCountEl: HTMLSpanElement;
  private memoryKBEl: HTMLSpanElement;
  private fpsEl: HTMLSpanElement;

  constructor(container: HTMLElement) {
    this.container = container;

    this.hudRoot = document.createElement('div');
    this.hudRoot.id = 'hud-panel';
    this.hudRoot.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(22, 27, 34, 0.88);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(88, 166, 255, 0.15);
      border-radius: 10px;
      padding: 14px 18px;
      z-index: 100;
      min-width: 190px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    `;

    const title = document.createElement('div');
    title.textContent = '性能监控';
    title.style.cssText = `
      font-size: 11px;
      font-weight: 600;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(139, 148, 158, 0.15);
    `;
    this.hudRoot.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    const makeRow = (label: string, valueEl: HTMLSpanElement, color: string) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      `;

      const labelEl = document.createElement('span');
      labelEl.textContent = label;
      labelEl.style.cssText = `
        color: #8b949e;
      `;

      valueEl.style.cssText = `
        color: ${color};
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        font-family: -apple-system, 'SF Mono', 'Consolas', monospace;
        transition: color 0.2s ease;
      `;

      row.appendChild(labelEl);
      row.appendChild(valueEl);
      grid.appendChild(row);
    };

    this.faceCountEl = document.createElement('span');
    this.vertexCountEl = document.createElement('span');
    this.memoryKBEl = document.createElement('span');
    this.fpsEl = document.createElement('span');

    makeRow('面数:', this.faceCountEl, '#58a6ff');
    makeRow('顶点数:', this.vertexCountEl, '#a371f7');
    makeRow('显存:', this.memoryKBEl, '#3fb950');
    makeRow('FPS:', this.fpsEl, '#f0883e');

    this.hudRoot.appendChild(grid);
    this.container.appendChild(this.hudRoot);
  }

  private formatNumber(n: number): string {
    return n.toLocaleString('zh-CN');
  }

  private formatMemory(kb: number): string {
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(2)} MB`;
    }
    return `${kb.toFixed(1)} KB`;
  }

  public update(stats: HudStats): void {
    this.faceCountEl.textContent = this.formatNumber(Math.round(stats.faceCount));
    this.vertexCountEl.textContent = this.formatNumber(Math.round(stats.vertexCount));
    this.memoryKBEl.textContent = this.formatMemory(stats.memoryKB);
    this.fpsEl.textContent = `${Math.round(stats.fps)}`;

    const fpsColor =
      stats.fps >= 55 ? '#3fb950' :
      stats.fps >= 30 ? '#f0883e' : '#f85149';
    this.fpsEl.style.color = fpsColor;
  }

  public dispose(): void {
    this.hudRoot.remove();
  }
}
