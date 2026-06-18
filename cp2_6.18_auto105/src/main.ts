import { HexMap, type HexCell } from './hexMap';
import { ControlPanel } from './panel';
import { StatusBar, type StatusBarData } from './statusBar';

interface ChainNode {
  key: string;
  label: string;
  icon: string;
  color: string;
  element: HTMLDivElement;
  valueEl: HTMLElement;
  currentValue: number;
  targetValue: number;
  animStart: number;
}

interface ChainArrow {
  element: SVGSVGElement;
  dashOffset: number;
}

class App {
  private app: HTMLElement;
  private hexMap!: HexMap;
  private controlPanel!: ControlPanel;
  private statusBar!: StatusBar;
  private chainNodes: ChainNode[] = [];
  private chainArrows: ChainArrow[] = [];
  private chainContainer!: HTMLDivElement;

  private totalOutput: number = 0;
  private financialIncome: number = 0;
  private lastFrameTime: number = 0;
  private gameStartTime: number = 0;

  constructor() {
    const appEl = document.getElementById('app');
    if (!appEl) throw new Error('App container not found');
    this.app = appEl;
    this.init();
  }

  private init(): void {
    this.injectGlobalStyles();
    this.createLayout();
    this.initModules();
    this.gameStartTime = performance.now();
    this.lastFrameTime = this.gameStartTime;
    this.startGameLoop();
  }

  private injectGlobalStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dashFlow {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: -24px; }
      }
      .chain-arrow-path {
        animation: dashFlow 1s linear infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
      }
      .chain-node-active {
        animation: pulse 1.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  private createLayout(): void {
    const mainRow = document.createElement('div');
    mainRow.style.cssText = `
      display: flex;
      gap: 20px;
      padding: 20px;
      flex: 1;
      overflow: hidden;
    `;
    this.app.appendChild(mainRow);

    const leftColumn = document.createElement('div');
    leftColumn.style.cssText = `
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      gap: 0;
    `;
    mainRow.appendChild(leftColumn);

    const mapContainer = document.createElement('div');
    mapContainer.style.cssText = `
      width: 100%;
      height: 600px;
      min-height: 600px;
      background: #0b0f19;
      border-radius: 12px;
      position: relative;
      overflow: hidden;
      border: 1px solid #1f2937;
    `;
    leftColumn.appendChild(mapContainer);

    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
    `;
    mapContainer.appendChild(canvas);

    this.chainContainer = document.createElement('div');
    this.chainContainer.style.cssText = `
      width: 100%;
      height: 120px;
      min-height: 120px;
      background: #111827;
      border-radius: 12px;
      margin-top: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 40px;
      gap: 0;
      position: relative;
      border-top: 1px solid #1f2937;
      border-bottom: 1px solid #1f2937;
    `;
    this.createSupplyChain();
    leftColumn.appendChild(this.chainContainer);

    const panelContainer = document.createElement('div');
    panelContainer.style.cssText = `
      display: flex;
      flex-direction: column;
    `;
    mainRow.appendChild(panelContainer);
    (this.app as any)._panelContainer = panelContainer;
    (this.app as any)._canvas = canvas;
  }

  private createSupplyChain(): void {
    const nodeConfigs = [
      { key: 'mine', label: '矿场', icon: '⛏️', color: '#8b5cf6' },
      { key: 'transport', label: '运输', icon: '🚀', color: '#3b82f6' },
      { key: 'refine', label: '精炼', icon: '🔥', color: '#f59e0b' },
      { key: 'sell', label: '出售', icon: '💎', color: '#10b981' },
    ];

    for (let i = 0; i < nodeConfigs.length; i++) {
      const config = nodeConfigs[i];
      const node = this.createChainNode(config.label, config.icon, config.color);
      this.chainContainer.appendChild(node.element);
      this.chainNodes.push({
        key: config.key,
        label: config.label,
        icon: config.icon,
        color: config.color,
        element: node.element,
        valueEl: node.valueEl,
        currentValue: 0,
        targetValue: 0,
        animStart: 0,
      });

      if (i < nodeConfigs.length - 1) {
        const arrow = this.createChainArrow();
        this.chainContainer.appendChild(arrow.element);
        this.chainArrows.push({ element: arrow.element, dashOffset: 0 });
      }
    }
  }

  private createChainNode(label: string, icon: string, color: string) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 100px;
      flex-shrink: 0;
      transition: transform 0.5s ease-out;
    `;

    const iconBox = document.createElement('div');
    iconBox.style.cssText = `
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: ${color}20;
      border: 2px solid ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 0 20px ${color}40;
      transition: all 0.5s ease-out;
    `;
    iconBox.textContent = icon;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = `
      font-size: 12px;
      color: #9ca3af;
    `;
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      color: ${color};
      transition: color 0.5s ease-out;
      min-width: 60px;
      text-align: center;
    `;
    valueEl.textContent = '0 吨/秒';

    wrap.appendChild(iconBox);
    wrap.appendChild(labelEl);
    wrap.appendChild(valueEl);

    return { element: wrap, valueEl };
  }

  private createChainArrow() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '80');
    svg.setAttribute('height', '28');
    svg.setAttribute('viewBox', '0 0 80 28');
    svg.style.cssText = 'flex-shrink: 0;';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 14 L60 14 M54 8 L60 14 L54 20');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#2563eb');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-dasharray', '6 6');
    path.classList.add('chain-arrow-path');
    svg.appendChild(path);

    return { element: svg };
  }

  private initModules(): void {
    const canvas = (this.app as any)._canvas as HTMLCanvasElement;
    const panelContainer = (this.app as any)._panelContainer as HTMLElement;

    this.hexMap = new HexMap(canvas, {
      onSelect: (cell) => this.onHexSelect(cell),
      onUpdate: (cell) => this.onHexUpdate(cell),
      onEfficiencyChange: (cell) => this.onEfficiencyChanged(cell),
    });

    this.controlPanel = new ControlPanel(panelContainer, {
      onEfficiencyChange: (id, eff) => {
        this.hexMap.setEfficiency(id, eff);
      },
    });

    this.statusBar = new StatusBar(this.app);

    this.hexMap.resize();
    this.hexMap.startLoop();
  }

  private onHexSelect(cell: HexCell | null): void {
    this.controlPanel.setCell(cell);
    this.updateStatusBar();
  }

  private onHexUpdate(cell: HexCell): void {
    this.controlPanel.updateCell(cell);
  }

  private onEfficiencyChanged(_cell: HexCell): void {
    this.updateStatusBar();
  }

  private getDeployedRatePerSec(): number {
    const deployed = this.hexMap.getDeployedCells();
    return deployed.reduce((sum, c) => {
      const perYear = c.annualOutput * c.efficiency;
      const perSec = perYear / 31536000;
      return sum + perSec * 100;
    }, 0);
  }

  private updateChainNodes(dt: number): void {
    const rate = this.getDeployedRatePerSec();
    const hasAny = rate > 0;

    for (let i = 0; i < this.chainNodes.length; i++) {
      const node = this.chainNodes[i];
      const val = i === 0 ? rate : rate * (1 - i * 0.05);
      node.targetValue = Math.max(0, val);

      if (node.currentValue !== node.targetValue) {
        const diff = node.targetValue - node.currentValue;
        node.currentValue += diff * Math.min(dt * 4, 1);
      }

      const displayVal = node.currentValue;
      node.valueEl.textContent = `${displayVal.toFixed(2)} 吨/秒`;

      if (hasAny) {
        node.element.classList.add('chain-node-active');
      } else {
        node.element.classList.remove('chain-node-active');
      }
    }
  }

  private updateStatusBar(): void {
    const data: StatusBarData = {
      totalOutput: this.totalOutput,
      financialIncome: this.financialIncome,
      deployedCount: this.hexMap.getDeployedCells().length,
      totalEfficiencyOutput: this.getDeployedRatePerSec(),
    };
    this.statusBar.update(data);
  }

  private startGameLoop(): void {
    const loop = (time: number): void => {
      const dt = Math.min((time - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = time;

      const ratePerSec = this.getDeployedRatePerSec();
      this.totalOutput += ratePerSec * dt;
      this.financialIncome += ratePerSec * dt * 0.5;

      this.updateChainNodes(dt);

      this.statusBar.setDisplayedValues(this.totalOutput, this.financialIncome);
      this.updateStatusBar();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
