import type { ObjectInfo } from './sceneBuilder';

type OnGenerateCallback = (text: string) => void;
type OnReshuffleCallback = () => void;
type OnColorChangeCallback = (id: string, color: string) => void;
type OnPositionChangeCallback = (id: string, x: number, y: number, z: number) => void;

export class UIManager {
  private textInput: HTMLTextAreaElement;
  private generateBtn: HTMLButtonElement;
  private reshuffleBtn: HTMLButtonElement;
  private detailContent: HTMLElement;
  private sidebar: HTMLElement;
  private sidebarToggle: HTMLButtonElement;
  private fpsCounter: HTMLElement;

  private onGenerate: OnGenerateCallback = () => {};
  private onReshuffle: OnReshuffleCallback = () => {};
  private onColorChange: OnColorChangeCallback = () => {};
  private onPositionChange: OnPositionChangeCallback = () => {};

  private selectedInfo: ObjectInfo | null = null;
  private isInputEnabled = true;

  constructor() {
    this.textInput = document.getElementById('textInput') as HTMLTextAreaElement;
    this.generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    this.reshuffleBtn = document.getElementById('reshuffleBtn') as HTMLButtonElement;
    this.detailContent = document.getElementById('detailContent') as HTMLElement;
    this.sidebar = document.getElementById('sidebar') as HTMLElement;
    this.sidebarToggle = document.getElementById('sidebarToggle') as HTMLButtonElement;
    this.fpsCounter = document.getElementById('fpsCounter') as HTMLElement;

    this.bindEvents();
    this.checkResponsive();
  }

  private bindEvents(): void {
    this.generateBtn.addEventListener('click', () => {
      if (!this.isInputEnabled) return;
      const text = this.textInput.value.trim();
      if (text) {
        this.onGenerate(text);
      }
    });

    this.reshuffleBtn.addEventListener('click', () => {
      this.onReshuffle();
    });

    this.sidebarToggle.addEventListener('click', () => {
      this.toggleSidebar();
    });

    window.addEventListener('resize', () => {
      this.checkResponsive();
    });
  }

  private toggleSidebar(): void {
    if (this.sidebar.classList.contains('collapsed')) {
      this.sidebar.classList.remove('collapsed');
      this.sidebarToggle.textContent = '◀';
    } else {
      this.sidebar.classList.add('collapsed');
      this.sidebarToggle.textContent = '▶';
    }
  }

  private checkResponsive(): void {
    if (window.innerWidth < 1024) {
      this.sidebar.classList.add('collapsed');
      this.sidebarToggle.textContent = '▶';
    } else {
      this.sidebar.classList.remove('collapsed');
      this.sidebarToggle.textContent = '◀';
    }
  }

  setOnGenerate(callback: OnGenerateCallback): void {
    this.onGenerate = callback;
  }

  setOnReshuffle(callback: OnReshuffleCallback): void {
    this.onReshuffle = callback;
  }

  setOnColorChange(callback: OnColorChangeCallback): void {
    this.onColorChange = callback;
  }

  setOnPositionChange(callback: OnPositionChangeCallback): void {
    this.onPositionChange = callback;
  }

  setInputEnabled(enabled: boolean): void {
    this.isInputEnabled = enabled;
    this.generateBtn.disabled = !enabled;
    this.generateBtn.style.opacity = enabled ? '1' : '0.6';
    this.generateBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  }

  showDetail(info: ObjectInfo | null): void {
    this.selectedInfo = info;

    if (!info) {
      this.detailContent.innerHTML = `
        <div class="detail-empty">点击场景中的物体查看详情</div>
      `;
      return;
    }

    const pos = info.position;
    this.detailContent.innerHTML = `
      <div class="detail-name">${this.escapeHtml(info.type)}</div>
      <div class="detail-item">
        <div class="detail-label">颜色</div>
        <div class="detail-row">
          <input type="color" id="colorInput" value="${info.color}" />
          <span id="colorValue">${info.color}</span>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">X 坐标</div>
        <div class="detail-row">
          <input type="number" id="posX" step="0.1" value="${pos.x.toFixed(2)}" />
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Y 坐标</div>
        <div class="detail-row">
          <input type="number" id="posY" step="0.1" value="${pos.y.toFixed(2)}" />
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Z 坐标</div>
        <div class="detail-row">
          <input type="number" id="posZ" step="0.1" value="${pos.z.toFixed(2)}" />
        </div>
      </div>
    `;

    const colorInput = document.getElementById('colorInput') as HTMLInputElement;
    const colorValue = document.getElementById('colorValue') as HTMLElement;
    colorInput.addEventListener('input', (e) => {
      const color = (e.target as HTMLInputElement).value;
      colorValue.textContent = color;
      this.onColorChange(info.id, color);
    });

    const posX = document.getElementById('posX') as HTMLInputElement;
    const posY = document.getElementById('posY') as HTMLInputElement;
    const posZ = document.getElementById('posZ') as HTMLInputElement;

    let positionUpdateTimer: number | null = null;
    const handlePositionChange = () => {
      if (positionUpdateTimer) {
        clearTimeout(positionUpdateTimer);
      }
      positionUpdateTimer = window.setTimeout(() => {
        const x = parseFloat(posX.value) || 0;
        const y = parseFloat(posY.value) || 0;
        const z = parseFloat(posZ.value) || 0;
        this.onPositionChange(info.id, x, y, z);
      }, 100);
    };

    posX.addEventListener('input', handlePositionChange);
    posY.addEventListener('input', handlePositionChange);
    posZ.addEventListener('input', handlePositionChange);
  }

  updateDetailPosition(x: number, y: number, z: number): void {
    if (!this.selectedInfo) return;

    const posX = document.getElementById('posX') as HTMLInputElement;
    const posY = document.getElementById('posY') as HTMLInputElement;
    const posZ = document.getElementById('posZ') as HTMLInputElement;

    if (posX) posX.value = x.toFixed(2);
    if (posY) posY.value = y.toFixed(2);
    if (posZ) posZ.value = z.toFixed(2);
  }

  updateFps(fps: number): void {
    this.fpsCounter.textContent = `FPS: ${fps}`;
    if (fps >= 50) {
      this.fpsCounter.style.color = '#00d4aa';
    } else if (fps >= 30) {
      this.fpsCounter.style.color = '#ffcc33';
    } else {
      this.fpsCounter.style.color = '#ff4444';
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
