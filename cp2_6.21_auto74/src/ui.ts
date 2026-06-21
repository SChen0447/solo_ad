export interface InfoBarCallbacks {
  getCreatureCount: () => number;
  getWorldPosition: (clientX: number, clientY: number) => { x: number; z: number } | null;
}

export class InfoBar {
  private bar: HTMLDivElement;
  private countSpan: HTMLSpanElement;
  private coordSpan: HTMLSpanElement;
  private callbacks: InfoBarCallbacks;
  private fadeTimer: number;
  private isVisible: boolean;

  constructor(callbacks: InfoBarCallbacks) {
    this.callbacks = callbacks;
    this.fadeTimer = 0;
    this.isVisible = true;

    this.bar = document.createElement('div');
    this.bar.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; height: 40px;
      background: rgba(15, 23, 42, 0.6); color: #FFFFFF; font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; align-items: center; justify-content: center; gap: 40px;
      z-index: 90; transition: opacity 0.5s ease; pointer-events: none;
    `;

    this.countSpan = document.createElement('span');
    this.countSpan.textContent = '生物总数: 0';
    this.coordSpan = document.createElement('span');
    this.coordSpan.textContent = '坐标: --';

    this.bar.appendChild(this.countSpan);
    this.bar.appendChild(this.coordSpan);
    document.body.appendChild(this.bar);

    document.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onMouseMove(e: MouseEvent): void {
    this.fadeTimer = 0;
    if (!this.isVisible) {
      this.isVisible = true;
      this.bar.style.opacity = '1';
    }
    const pos = this.callbacks.getWorldPosition(e.clientX, e.clientY);
    if (pos) {
      this.coordSpan.textContent = `坐标: X=${pos.x.toFixed(1)}, Z=${pos.z.toFixed(1)}`;
    } else {
      this.coordSpan.textContent = '坐标: --';
    }
  }

  update(delta: number): void {
    this.countSpan.textContent = `生物总数: ${this.callbacks.getCreatureCount()}`;
    this.fadeTimer += delta;
    if (this.fadeTimer > 3 && this.isVisible) {
      this.isVisible = false;
      this.bar.style.opacity = '0';
    }
  }

  destroy(): void {
    this.bar.remove();
  }
}
