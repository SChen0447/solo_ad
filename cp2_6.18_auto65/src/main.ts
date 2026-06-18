import { HexMap } from './hexMap';
import type { HexCell } from './hexMap';
import { Panel } from './panel';
import { StatusBar } from './statusBar';

interface SupplyChainNode {
  label: string;
  icon: string;
  value: number;
  element: HTMLElement;
  valueElement: HTMLElement;
  iconElement: HTMLElement;
}

class App {
  private app: HTMLElement;
  private hexMap: HexMap | null = null;
  private panel: Panel | null = null;
  private statusBar: StatusBar | null = null;
  private supplyChainNodes: SupplyChainNode[] = [];

  private animationFrameId: number | null = null;
  private lastTime = 0;
  private totalOutput = 0;
  private displayedOutput = 0;

  constructor() {
    this.app = document.getElementById('app')!;
    this.init();
  }

  private init(): void {
    this.createLayout();
    requestAnimationFrame(() => {
      this.resizeCanvas();
      this.initHexMap();
      this.initPanel();
      this.initStatusBar();
      this.initSupplyChain();
      this.bindEvents();
      this.startUpdateLoop();
    });
  }

  private createLayout(): void {
    const mainContent = document.createElement('div');
    mainContent.className = 'main-content';

    const leftSection = document.createElement('div');
    leftSection.className = 'left-section';

    const mapContainer = document.createElement('div');
    mapContainer.className = 'map-container';
    const canvas = document.createElement('canvas');
    canvas.id = 'hexCanvas';
    mapContainer.appendChild(canvas);

    const supplyChain = document.createElement('div');
    supplyChain.className = 'supply-chain';
    supplyChain.id = 'supplyChain';

    leftSection.appendChild(mapContainer);
    leftSection.appendChild(supplyChain);

    const panelContainer = document.createElement('div');
    panelContainer.className = 'panel-container';
    panelContainer.id = 'panelContainer';

    mainContent.appendChild(leftSection);
    mainContent.appendChild(panelContainer);

    const statusBarContainer = document.createElement('div');
    statusBarContainer.className = 'status-bar-container';
    statusBarContainer.id = 'statusBarContainer';

    this.app.appendChild(mainContent);
    this.app.appendChild(statusBarContainer);

    const canvasEl = document.getElementById('hexCanvas') as HTMLCanvasElement;
    const mapContainerEl = document.querySelector('.map-container') as HTMLElement;
    canvasEl.width = mapContainerEl.clientWidth;
    canvasEl.height = 600;
  }

  private initHexMap(): void {
    const canvas = document.getElementById('hexCanvas') as HTMLCanvasElement;
    this.hexMap = new HexMap({
      rows: 6,
      cols: 8,
      hexSize: 40,
      canvas,
    });
  }

  private initPanel(): void {
    const container = document.getElementById('panelContainer')!;
    this.panel = new Panel({ container });
  }

  private initStatusBar(): void {
    const container = document.getElementById('statusBarContainer')!;
    this.statusBar = new StatusBar({ container });
  }

  private initSupplyChain(): void {
    const container = document.getElementById('supplyChain')!;
    const nodeConfigs = [
      { label: '矿场', icon: '⛏️' },
      { label: '运输', icon: '🚀' },
      { label: '精炼', icon: '⚗️' },
      { label: '出售', icon: '💰' },
    ];

    for (let i = 0; i < nodeConfigs.length; i++) {
      const config = nodeConfigs[i];

      const node = document.createElement('div');
      node.className = 'supply-chain-node';

      const iconEl = document.createElement('div');
      iconEl.className = 'supply-chain-node-icon';
      iconEl.textContent = config.icon;
      node.appendChild(iconEl);

      const labelEl = document.createElement('div');
      labelEl.className = 'supply-chain-node-label';
      labelEl.textContent = config.label;
      node.appendChild(labelEl);

      const valueEl = document.createElement('div');
      valueEl.className = 'supply-chain-node-value';
      valueEl.textContent = '0';
      node.appendChild(valueEl);

      container.appendChild(node);

      this.supplyChainNodes.push({
        label: config.label,
        icon: config.icon,
        value: 0,
        element: node,
        valueElement: valueEl,
        iconElement: iconEl,
      });

      if (i < nodeConfigs.length - 1) {
        const arrow = document.createElement('div');
        arrow.className = 'supply-chain-arrow';
        container.appendChild(arrow);
      }
    }
  }

  private bindEvents(): void {
    if (this.hexMap) {
      this.hexMap.onSelectionChange = (hex: HexCell | null) => {
        this.handleSelectionChange(hex);
      };

      this.hexMap.onEfficiencyChange = (hex: HexCell) => {
        this.handleEfficiencyChange(hex);
      };

      this.hexMap.onExplorationChange = (hex: HexCell) => {
        this.handleExplorationChange(hex);
      };
    }

    if (this.panel) {
      this.panel.onEfficiencyChange = (q: number, r: number, efficiency: number) => {
        if (this.hexMap) {
          this.hexMap.setEfficiency(q, r, efficiency);
        }
      };
    }

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleSelectionChange(hex: HexCell | null): void {
    if (this.panel) {
      this.panel.updateSelectedHex(hex);
    }
    this.updateStatusBar();
    this.updateSupplyChain();
  }

  private handleEfficiencyChange(hex: HexCell): void {
    this.updateStatusBar();
    this.updateSupplyChain();
  }

  private handleExplorationChange(hex: HexCell): void {
    if (this.panel) {
      this.panel.updateExploration(hex);
    }
  }

  private updateStatusBar(): void {
    if (!this.hexMap || !this.statusBar) return;

    const mineCount = this.hexMap.getSelectedMineCount();
    this.statusBar.setMineCount(mineCount);

    const totalAnnualOutput = this.calculateTotalAnnualOutput();
    const outputPerSecond = totalAnnualOutput / 365 / 24 / 3600;
    this.statusBar.setOutputPerSecond(outputPerSecond);
  }

  private calculateTotalAnnualOutput(): number {
    if (!this.hexMap) return 0;
    let total = 0;
    for (const hex of this.hexMap.getAllHexes()) {
      if (hex.selected && hex.resource !== 'obstacle') {
        total += hex.annualOutput * hex.efficiency;
      }
    }
    return total;
  }

  private updateSupplyChain(): void {
    const totalAnnualOutput = this.calculateTotalAnnualOutput();
    const mineCount = this.hexMap?.getSelectedMineCount() || 0;

    const hasProduction = mineCount > 0;

    for (let i = 0; i < this.supplyChainNodes.length; i++) {
      const node = this.supplyChainNodes[i];

      if (hasProduction) {
        node.element.classList.add('active');
      } else {
        node.element.classList.remove('active');
      }

      let value = 0;
      if (i === 0) {
        value = totalAnnualOutput;
      } else if (i === 1) {
        value = totalAnnualOutput * 0.95;
      } else if (i === 2) {
        value = totalAnnualOutput * 0.85;
      } else {
        value = totalAnnualOutput * 0.5;
      }

      node.value = value;
      node.valueElement.textContent = value > 0 ? value.toFixed(0) : '0';
    }
  }

  private startUpdateLoop(): void {
    const loop = (time: number) => {
      const deltaTime = this.lastTime ? (time - this.lastTime) / 1000 : 0;
      this.lastTime = time;

      const totalAnnualOutput = this.calculateTotalAnnualOutput();
      const outputPerSecond = totalAnnualOutput / 365 / 24 / 3600;

      if (deltaTime > 0 && outputPerSecond > 0) {
        this.totalOutput += outputPerSecond * deltaTime;
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private handleResize(): void {
    const canvas = document.getElementById('hexCanvas') as HTMLCanvasElement;
    const mapContainer = document.querySelector('.map-container') as HTMLElement;
    if (canvas && mapContainer) {
      canvas.width = mapContainer.clientWidth;
      canvas.height = 600;
    }
  }

  public destroy(): void {
    if (this.hexMap) {
      this.hexMap.destroy();
    }
    if (this.panel) {
      this.panel.destroy();
    }
    if (this.statusBar) {
      this.statusBar.destroy();
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

const app = new App();
(window as any).app = app;
