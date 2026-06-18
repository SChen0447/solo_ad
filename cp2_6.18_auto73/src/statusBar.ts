import { HexCell, GameStats, COLORS } from './types';

interface ChainNode {
  id: string;
  label: string;
  icon: string;
  element: HTMLElement;
  valueElement: HTMLElement;
  circleElement: HTMLElement;
  currentValue: number;
  targetValue: number;
}

export class StatusBar {
  private chainContainer: HTMLElement;
  private statusContainer: HTMLElement;
  private chainNodes: ChainNode[] = [];
  private extractionElement: HTMLElement | null = null;
  private revenueElement: HTMLElement | null = null;
  private minesElement: HTMLElement | null = null;
  private displayedExtraction: number = 0;
  private targetExtraction: number = 0;
  private displayedRevenue: number = 0;
  private targetRevenue: number = 0;
  private animationFrameId: number | null = null;

  constructor(chainContainer: HTMLElement, statusContainer: HTMLElement) {
    this.chainContainer = chainContainer;
    this.statusContainer = statusContainer;
    this.createChain();
    this.createStatusBar();
    this.startAnimation();
  }

  private createChain(): void {
    const nodeConfigs = [
      { id: 'mine', label: '矿场', icon: '⛏' },
      { id: 'transport', label: '运输', icon: '🚚' },
      { id: 'refine', label: '精炼', icon: '⚗' },
      { id: 'sell', label: '出售', icon: '💰' },
    ];

    for (let i = 0; i < nodeConfigs.length; i++) {
      const config = nodeConfigs[i];

      const nodeElement = document.createElement('div');
      nodeElement.className = 'chain-node';

      const circleElement = document.createElement('div');
      circleElement.className = 'chain-node-circle';
      circleElement.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
      circleElement.style.color = COLORS.slider;
      circleElement.textContent = config.icon;

      const labelElement = document.createElement('div');
      labelElement.className = 'chain-node-label';
      labelElement.textContent = config.label;

      const valueElement = document.createElement('div');
      valueElement.className = 'chain-node-value';
      valueElement.style.color = COLORS.slider;
      valueElement.textContent = '0';

      nodeElement.appendChild(circleElement);
      nodeElement.appendChild(labelElement);
      nodeElement.appendChild(valueElement);

      this.chainContainer.appendChild(nodeElement);

      this.chainNodes.push({
        id: config.id,
        label: config.label,
        icon: config.icon,
        element: nodeElement,
        valueElement,
        circleElement,
        currentValue: 0,
        targetValue: 0,
      });

      if (i < nodeConfigs.length - 1) {
        const arrowElement = document.createElement('div');
        arrowElement.className = 'chain-arrow';
        this.chainContainer.appendChild(arrowElement);
      }
    }
  }

  private createStatusBar(): void {
    this.statusContainer.innerHTML = `
      <div class="status-item">
        <span class="status-label">总开采量:</span>
        <span class="status-value" id="total-extraction">0</span>
      </div>
      <div class="status-item">
        <span class="status-label">财务收入:</span>
        <span class="status-value status-value-gold" id="total-revenue">0 金币</span>
      </div>
      <div class="status-item">
        <span class="status-label">已部署矿场数:</span>
        <span class="status-value" id="deployed-mines">0</span>
      </div>
    `;

    this.extractionElement = this.statusContainer.querySelector('#total-extraction');
    this.revenueElement = this.statusContainer.querySelector('#total-revenue');
    this.minesElement = this.statusContainer.querySelector('#deployed-mines');
  }

  private startAnimation(): void {
    const animate = () => {
      const extractionDiff = this.targetExtraction - this.displayedExtraction;
      if (Math.abs(extractionDiff) > 0.1) {
        this.displayedExtraction += extractionDiff * 0.1;
        if (this.extractionElement) {
          this.extractionElement.textContent = Math.floor(this.displayedExtraction).toString();
        }
      }

      const revenueDiff = this.targetRevenue - this.displayedRevenue;
      if (Math.abs(revenueDiff) > 0.01) {
        this.displayedRevenue += revenueDiff * 0.1;
        if (this.revenueElement) {
          this.revenueElement.textContent = `${this.displayedRevenue.toFixed(1)} 金币`;
        }
      }

      for (const node of this.chainNodes) {
        const valueDiff = node.targetValue - node.currentValue;
        if (Math.abs(valueDiff) > 0.1) {
          node.currentValue += valueDiff * 0.1;
          node.valueElement.textContent = Math.floor(node.currentValue).toString();
          this.updateNodeColor(node);
        }
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private updateNodeColor(node: ChainNode): void {
    const intensity = Math.min(1, node.targetValue / 500);
    const r = Math.floor(59 + intensity * (139 - 59));
    const g = Math.floor(130 + intensity * (92 - 130));
    const b = Math.floor(246 + intensity * (246 - 246));
    const color = `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.5})`;
    node.circleElement.style.backgroundColor = color;
    node.circleElement.style.boxShadow = `0 0 ${10 + intensity * 20}px rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.3})`;
    node.valueElement.style.color = `rgb(${r}, ${g}, ${b})`;
  }

  public updateStats(stats: GameStats): void {
    this.targetExtraction = stats.totalExtraction;
    this.targetRevenue = stats.totalRevenue;

    if (this.minesElement) {
      this.minesElement.textContent = stats.deployedMines.toString();
    }

    const baseOutput = stats.totalEfficiency * 10;
    this.chainNodes[0].targetValue = baseOutput;
    this.chainNodes[1].targetValue = baseOutput * 0.9;
    this.chainNodes[2].targetValue = baseOutput * 0.8;
    this.chainNodes[3].targetValue = baseOutput * 0.7;
  }

  public updateFromSelectedCell(cell: HexCell | null): void {
    if (!cell || cell.type === 'obstacle') {
      for (const node of this.chainNodes) {
        node.targetValue = 0;
      }
      return;
    }

    const output = Math.floor(cell.annualOutput * cell.efficiency * (cell.explored / 100));
    this.chainNodes[0].targetValue = output;
    this.chainNodes[1].targetValue = Math.floor(output * 0.9);
    this.chainNodes[2].targetValue = Math.floor(output * 0.8);
    this.chainNodes[3].targetValue = Math.floor(output * 0.7);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.chainContainer.innerHTML = '';
    this.statusContainer.innerHTML = '';
  }
}
