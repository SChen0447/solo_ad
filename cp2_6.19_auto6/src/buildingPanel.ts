export interface BuildingConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  bodyColor: string;
  roofType: 'flat' | 'pointed' | 'dome' | 'antenna';
  roofColor: string;
  windowRows: number;
  windowCols: number;
  accentColor: string;
  heightThreshold: number;
}

export const BUILDING_PRESETS: BuildingConfig[] = [
  {
    id: 'glass-tower',
    name: '玻璃幕墙办公楼',
    width: 60,
    height: 280,
    bodyColor: '#3a6b8c',
    roofType: 'antenna',
    roofColor: '#5a8aab',
    windowRows: 14,
    windowCols: 4,
    accentColor: '#7ec8e3',
    heightThreshold: 200,
  },
  {
    id: 'red-brick-apt',
    name: '红砖公寓',
    width: 70,
    height: 140,
    bodyColor: '#8b4513',
    roofType: 'flat',
    roofColor: '#6b3410',
    windowRows: 7,
    windowCols: 5,
    accentColor: '#d4a76a',
    heightThreshold: 200,
  },
  {
    id: 'spire-tower',
    name: '尖顶塔楼',
    width: 50,
    height: 320,
    bodyColor: '#4a4a6a',
    roofType: 'pointed',
    roofColor: '#6a6a8a',
    windowRows: 16,
    windowCols: 3,
    accentColor: '#b8b8d8',
    heightThreshold: 200,
  },
  {
    id: 'dome-office',
    name: '穹顶商务中心',
    width: 80,
    height: 200,
    bodyColor: '#5a7a5a',
    roofType: 'dome',
    roofColor: '#7a9a7a',
    windowRows: 10,
    windowCols: 6,
    accentColor: '#a0d0a0',
    heightThreshold: 200,
  },
  {
    id: 'slim-skyscraper',
    name: '纤细摩天楼',
    width: 36,
    height: 360,
    bodyColor: '#5a5a7a',
    roofType: 'antenna',
    roofColor: '#8a8aaa',
    windowRows: 18,
    windowCols: 2,
    accentColor: '#c0c0e0',
    heightThreshold: 200,
  },
  {
    id: 'wide-mall',
    name: '宽体商业广场',
    width: 100,
    height: 110,
    bodyColor: '#7a6a5a',
    roofType: 'flat',
    roofColor: '#9a8a7a',
    windowRows: 5,
    windowCols: 8,
    accentColor: '#e0c8a0',
    heightThreshold: 200,
  },
];

export type BuildingSelectCallback = (config: BuildingConfig | null) => void;

export class BuildingPanel {
  private container: HTMLElement;
  private cardList: HTMLElement;
  private selectedId: string | null = null;
  private onSelect: BuildingSelectCallback;
  private previewCanvases: Map<string, HTMLCanvasElement> = new Map();

  constructor(onSelect: BuildingSelectCallback) {
    this.onSelect = onSelect;
    this.container = document.getElementById('building-panel')!;
    this.cardList = document.getElementById('card-list')!;
    this.render();
  }

  private render(): void {
    this.cardList.innerHTML = '';
    for (const preset of BUILDING_PRESETS) {
      const card = document.createElement('div');
      card.className = 'building-card';
      card.dataset.buildingId = preset.id;

      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = 160;
      previewCanvas.height = 90;
      card.appendChild(previewCanvas);
      this.previewCanvases.set(preset.id, previewCanvas);

      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.textContent = preset.name;
      card.appendChild(nameEl);

      card.addEventListener('click', () => this.selectBuilding(preset.id));

      card.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        this.startDrag(preset, e.clientX, e.clientY);
      });

      this.cardList.appendChild(card);
      this.drawPreview(preset, previewCanvas);
    }
  }

  private drawPreview(preset: BuildingConfig, canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const scale = Math.min((cw - 20) / preset.width, (ch - 20) / preset.height) * 0.85;
    const bw = preset.width * scale;
    const bh = preset.height * scale;
    const bx = (cw - bw) / 2;
    const by = ch - 10 - bh;

    ctx.fillStyle = preset.bodyColor;
    ctx.fillRect(bx, by, bw, bh);

    if (preset.roofType === 'pointed') {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + bw / 2, by - bh * 0.15);
      ctx.lineTo(bx + bw, by);
      ctx.closePath();
      ctx.fillStyle = preset.roofColor;
      ctx.fill();
    } else if (preset.roofType === 'dome') {
      ctx.beginPath();
      ctx.ellipse(bx + bw / 2, by, bw / 2, bh * 0.1, 0, Math.PI, 0);
      ctx.fillStyle = preset.roofColor;
      ctx.fill();
    } else if (preset.roofType === 'antenna') {
      ctx.strokeStyle = preset.roofColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, by);
      ctx.lineTo(bx + bw / 2, by - bh * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx + bw / 2, by - bh * 0.12, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3333';
      ctx.fill();
    } else {
      ctx.fillStyle = preset.roofColor;
      ctx.fillRect(bx, by - 3, bw, 3);
    }

    const padX = bw * 0.15;
    const padY = bh * 0.08;
    const areaW = bw - padX * 2;
    const areaH = bh - padY * 2;
    const cellW = areaW / preset.windowCols;
    const cellH = areaH / preset.windowRows;
    const winW = cellW * 0.5;
    const winH = cellH * 0.4;

    for (let r = 0; r < preset.windowRows; r++) {
      for (let c = 0; c < preset.windowCols; c++) {
        const wx = bx + padX + c * cellW + (cellW - winW) / 2;
        const wy = by + padY + r * cellH + (cellH - winH) / 2;
        ctx.fillStyle = preset.accentColor;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(wx, wy, winW, winH);
      }
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#2a3a5a';
    ctx.fillRect(0, ch - 10, cw, 10);
  }

  selectBuilding(id: string | null): void {
    this.selectedId = id;
    const cards = this.cardList.querySelectorAll('.building-card');
    cards.forEach((card) => {
      const el = card as HTMLElement;
      if (el.dataset.buildingId === id) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
    const config = id ? BUILDING_PRESETS.find((p) => p.id === id) || null : null;
    this.onSelect(config);
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  deselect(): void {
    this.selectBuilding(null);
  }

  private startDrag(preset: BuildingConfig, startX: number, startY: number): void {
    this.selectBuilding(preset.id);

    const ghost = document.createElement('div');
    ghost.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.7;
      width: ${preset.width}px;
      height: ${preset.height}px;
      background: ${preset.bodyColor};
      border: 2px solid #00d2ff;
      border-radius: 2px;
      left: ${startX - preset.width / 2}px;
      top: ${startY - preset.height}px;
      transition: none;
    `;
    document.body.appendChild(ghost);

    const onMove = (e: MouseEvent) => {
      ghost.style.left = `${e.clientX - preset.width / 2}px`;
      ghost.style.top = `${e.clientY - preset.height}px`;
    };

    const onUp = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.removeChild(ghost);

      const canvasContainer = document.getElementById('canvas-container');
      if (!canvasContainer) return;
      const rect = canvasContainer.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        this.onDropOnCanvas(preset, cx, cy);
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private onDropOnCanvas: (config: BuildingConfig, cx: number, cy: number) => void = () => {};

  setDropHandler(handler: (config: BuildingConfig, cx: number, cy: number) => void): void {
    this.onDropOnCanvas = handler;
  }
}
