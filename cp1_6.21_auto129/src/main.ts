import { MapEditor } from './MapEditor';
import { PlayerSimulator } from './PlayerSimulator';
import { TileType, TILE_INFO, GRID_SIZE, TILE_SIZE } from './types';

type AppMode = 'edit' | 'test';

class App {
  private container: HTMLElement;
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private canvasContainer: HTMLElement;
  private canvas: HTMLCanvasElement;
  private mapEditor: MapEditor;
  private playerSimulator: PlayerSimulator | null = null;
  private mode: AppMode = 'edit';
  private tileButtons: HTMLButtonElement[] = [];
  private exportBtn: HTMLButtonElement;
  private testToggleBtn: HTMLButtonElement;
  private exportInfo: HTMLElement;
  private isExporting: boolean = false;

  constructor() {
    this.container = document.getElementById('app')!;
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'row';
    this.container.style.height = '100vh';
    this.container.style.width = '100vw';
    this.container.style.minWidth = '1280px';
    this.container.style.overflow = 'hidden';

    this.leftPanel = this.createLeftPanel();
    this.canvasContainer = this.createCanvasContainer();
    this.rightPanel = this.createRightPanel();

    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'crosshair';
    this.canvas.width = GRID_SIZE * TILE_SIZE;
    this.canvas.height = GRID_SIZE * TILE_SIZE;

    this.canvasContainer.appendChild(this.canvas);

    this.mapEditor = new MapEditor(this.canvas);
    this.mapEditor.resize();

    this.exportBtn = this.createExportButton();
    this.testToggleBtn = this.createTestToggleButton();
    this.exportInfo = this.createExportInfo();

    const rightContent = this.rightPanel.querySelector('.right-panel-content') as HTMLElement;
    rightContent.appendChild(this.testToggleBtn);
    rightContent.appendChild(this.exportBtn);
    rightContent.appendChild(this.exportInfo);

    this.container.appendChild(this.leftPanel);
    this.container.appendChild(this.canvasContainer);
    this.container.appendChild(this.rightPanel);

    this.setupTileButtons();
    this.bindExport();
    this.bindTestToggle();

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private createLeftPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.width = '220px';
    panel.style.minWidth = '220px';
    panel.style.background = '#2a2a2a';
    panel.style.borderRight = '1px solid #3a3a3a';
    panel.style.padding = '16px';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = '12px';
    panel.style.overflowY = 'auto';

    const title = document.createElement('h3');
    title.textContent = '图块工具';
    title.style.color = '#fff';
    title.style.fontSize = '16px';
    title.style.marginBottom = '8px';
    panel.appendChild(title);

    const tileContainer = document.createElement('div');
    tileContainer.className = 'tile-buttons';
    tileContainer.style.display = 'flex';
    tileContainer.style.flexDirection = 'column';
    tileContainer.style.gap = '8px';
    panel.appendChild(tileContainer);

    return panel;
  }

  private createCanvasContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.flex = '1';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.overflow = 'auto';
    container.style.background = '#2a2a2a';
    container.style.position = 'relative';
    return container;
  }

  private createRightPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.width = '280px';
    panel.style.minWidth = '280px';
    panel.style.background = '#2a2a2a';
    panel.style.borderLeft = '1px solid #3a3a3a';
    panel.style.padding = '16px';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';

    const title = document.createElement('h3');
    title.textContent = '操作面板';
    title.style.color = '#fff';
    title.style.fontSize = '16px';
    title.style.marginBottom = '16px';
    panel.appendChild(title);

    const content = document.createElement('div');
    content.className = 'right-panel-content';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '12px';
    content.style.alignItems = 'center';
    panel.appendChild(content);

    return panel;
  }

  private createExportButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = '导出 JSON';
    btn.style.width = '120px';
    btn.style.height = '40px';
    btn.style.borderRadius = '6px';
    btn.style.border = 'none';
    btn.style.background = '#4a90d9';
    btn.style.color = '#fff';
    btn.style.fontSize = '14px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'background 0.2s';
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#3a7bd5';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#4a90d9';
    });

    return btn;
  }

  private createTestToggleButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = '进入测试模式';
    btn.style.width = '120px';
    btn.style.height = '40px';
    btn.style.borderRadius = '6px';
    btn.style.border = 'none';
    btn.style.background = '#5aa05a';
    btn.style.color = '#fff';
    btn.style.fontSize = '14px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'background 0.2s';

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#4a904a';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#5aa05a';
    });

    return btn;
  }

  private createExportInfo(): HTMLElement {
    const info = document.createElement('div');
    info.style.marginTop = '12px';
    info.style.fontSize = '12px';
    info.style.color = '#aaa';
    info.style.textAlign = 'center';
    info.style.lineHeight = '1.6';
    info.style.display = 'none';
    return info;
  }

  private setupTileButtons(): void {
    const tileContainer = this.leftPanel.querySelector('.tile-buttons') as HTMLElement;

    const tileTypes = [
      TileType.Grass,
      TileType.StonePath,
      TileType.WoodFloor,
      TileType.Water,
      TileType.Wall
    ];

    for (const tileType of tileTypes) {
      const info = TILE_INFO[tileType];
      const btn = document.createElement('button');
      btn.style.display = 'flex';
      btn.style.flexDirection = 'column';
      btn.style.alignItems = 'center';
      btn.style.gap = '6px';
      btn.style.padding = '10px';
      btn.style.border = 'none';
      btn.style.borderRadius = '6px';
      btn.style.background = '#3a3a3a';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'transform 0.2s, background 0.2s';
      btn.style.opacity = '0.85';

      const icon = document.createElement('div');
      icon.style.width = '48px';
      icon.style.height = '48px';
      icon.style.borderRadius = '4px';
      icon.style.background = info.color;
      icon.style.position = 'relative';
      icon.style.overflow = 'hidden';

      if (tileType === TileType.Grass) {
        icon.innerHTML = '<div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 30%, rgba(60,100,45,0.4) 2px, transparent 2px),radial-gradient(circle at 70% 60%, rgba(60,100,45,0.4) 2px, transparent 2px);"></div>';
      } else if (tileType === TileType.Wall) {
        icon.innerHTML = '<div style="position:absolute;inset:2px;border:1px solid rgba(100,100,100,0.6);display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr 1fr;"><div style="border-right:1px solid rgba(100,100,100,0.4);border-bottom:1px solid rgba(100,100,100,0.4);"></div><div style="border-bottom:1px solid rgba(100,100,100,0.4);"></div><div style="border-right:1px solid rgba(100,100,100,0.4);border-bottom:1px solid rgba(100,100,100,0.4);"></div><div style="border-bottom:1px solid rgba(100,100,100,0.4);"></div></div>';
      }

      const label = document.createElement('span');
      label.textContent = info.name;
      label.style.fontSize = '12px';
      label.style.color = '#ddd';

      btn.appendChild(icon);
      btn.appendChild(label);

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
      });

      btn.addEventListener('click', () => {
        this.selectTile(tileType);
      });

      tileContainer.appendChild(btn);
      this.tileButtons.push(btn);
    }

    this.selectTile(TileType.Grass);
  }

  private selectTile(tileType: TileType): void {
    this.mapEditor.setSelectedTile(tileType);

    this.tileButtons.forEach((btn, index) => {
      const types = [
        TileType.Grass,
        TileType.StonePath,
        TileType.WoodFloor,
        TileType.Water,
        TileType.Wall
      ];
      if (types[index] === tileType) {
        btn.style.background = '#4a90d9';
        btn.style.opacity = '1';
        btn.style.boxShadow = '0 2px 8px rgba(74, 144, 217, 0.4)';
      } else {
        btn.style.background = '#3a3a3a';
        btn.style.opacity = '0.85';
        btn.style.boxShadow = 'none';
      }
    });
  }

  private bindExport(): void {
    this.exportBtn.addEventListener('click', async () => {
      if (this.isExporting) return;
      this.isExporting = true;

      const originalText = this.exportBtn.textContent;
      this.exportBtn.textContent = '';

      const spinner = document.createElement('div');
      spinner.style.width = '18px';
      spinner.style.height = '18px';
      spinner.style.border = '2px solid rgba(255,255,255,0.3)';
      spinner.style.borderTopColor = '#fff';
      spinner.style.borderRadius = '50%';
      spinner.style.animation = 'spin 1s linear infinite';
      spinner.style.display = 'inline-block';
      this.exportBtn.appendChild(spinner);

      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const jsonString = this.mapEditor.exportToJSONString();
      const dataSize = new Blob([jsonString]).size;
      const matrix = this.mapEditor.getMatrix();
      const cols = matrix[0].length;
      const rows = matrix.length;

      try {
        await navigator.clipboard.writeText(jsonString);
      } catch (err) {
        console.warn('复制到剪贴板失败', err);
      }

      this.exportInfo.innerHTML = `
        <div style="color:#5aa05a;margin-bottom:4px;">✓ 已复制到剪贴板</div>
        <div>矩阵尺寸: ${cols} × ${rows}</div>
        <div>数据大小: ${dataSize} 字节</div>
      `;
      this.exportInfo.style.display = 'block';

      this.exportBtn.textContent = originalText;
      this.isExporting = false;

      setTimeout(() => {
        this.exportInfo.style.display = 'none';
      }, 5000);
    });
  }

  private bindTestToggle(): void {
    this.testToggleBtn.addEventListener('click', () => {
      if (this.mode === 'edit') {
        this.enterTestMode();
      } else {
        this.exitTestMode();
      }
    });
  }

  private enterTestMode(): void {
    this.mode = 'test';
    this.testToggleBtn.textContent = '退出测试模式';
    this.testToggleBtn.style.background = '#d95a5a';

    this.canvas.style.cursor = 'default';

    this.tileButtons.forEach((btn) => {
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.4';
    });

    this.exportBtn.style.pointerEvents = 'none';
    this.exportBtn.style.opacity = '0.5';

    if (!this.playerSimulator) {
      this.playerSimulator = new PlayerSimulator(this.canvas, this.mapEditor.getMatrix());
    } else {
      this.playerSimulator.setMatrix(this.mapEditor.getMatrix());
    }

    this.playerSimulator.setOnStop(() => {
      if (this.mode === 'test') {
        this.exitTestMode();
      }
    });

    this.playerSimulator.start();
  }

  private exitTestMode(): void {
    this.mode = 'edit';
    this.testToggleBtn.textContent = '进入测试模式';
    this.testToggleBtn.style.background = '#5aa05a';

    this.canvas.style.cursor = 'crosshair';

    this.tileButtons.forEach((btn) => {
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '0.85';
    });

    this.selectTile(this.mapEditor.getSelectedTile());

    this.exportBtn.style.pointerEvents = 'auto';
    this.exportBtn.style.opacity = '1';

    if (this.playerSimulator) {
      this.playerSimulator.stop();
    }
  }

  private handleResize(): void {
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    if (this.playerSimulator) {
      this.playerSimulator.stop();
    }
  }
}

const app = new App();
(window as any).__app = app;
