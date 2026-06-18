import { HexMap, type HexTile } from './hexMap';
import { ControlPanel } from './panel';
import { StatusBar } from './statusBar';
import './styles.css';

class SpaceMiningGame {
  private app: HTMLElement;
  private hexMap!: HexMap;
  private controlPanel!: ControlPanel;
  private statusBar!: StatusBar;

  private mapContainer!: HTMLElement;
  private chainContainer!: HTMLElement;
  private panelContainer!: HTMLElement;
  private statusContainer!: HTMLElement;

  private chainNodes: HTMLElement[] = [];
  private chainValues: HTMLElement[] = [];

  private totalMined = 0;
  private totalRevenue = 0;
  private lastTime = 0;
  private animationId: number | null = null;

  private explorationCheckTimer = 0;
  private lastExplorationValues: Map<string, number> = new Map();

  constructor() {
    this.app = document.getElementById('app')!;
    this.initLayout();
    this.initModules();
    this.startGameLoop();
  }

  private initLayout(): void {
    this.app.className = 'app-container';

    const mainContent = document.createElement('div');
    mainContent.className = 'main-content';

    this.mapContainer = document.createElement('div');
    this.mapContainer.className = 'map-container';
    const canvas = document.createElement('canvas');
    canvas.className = 'hex-canvas';
    this.mapContainer.appendChild(canvas);

    this.chainContainer = document.createElement('div');
    this.chainContainer.className = 'chain-container';
    this.createSupplyChain();

    const mapAndChain = document.createElement('div');
    mapAndChain.className = 'map-and-chain';
    mapAndChain.appendChild(this.mapContainer);
    mapAndChain.appendChild(this.chainContainer);

    this.panelContainer = document.createElement('div');
    this.panelContainer.className = 'panel-container';

    mainContent.appendChild(mapAndChain);
    mainContent.appendChild(this.panelContainer);

    this.statusContainer = document.createElement('div');
    this.statusContainer.className = 'status-container';

    this.app.appendChild(mainContent);
    this.app.appendChild(this.statusContainer);

    requestAnimationFrame(() => {
      this.resizeCanvas();
    });

    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
  }

  private createSupplyChain(): void {
    const nodes = [
      { name: '矿场', color: '#8b5cf6' },
      { name: '运输', color: '#3b82f6' },
      { name: '精炼', color: '#10b981' },
      { name: '出售', color: '#f59e0b' }
    ];

    for (let i = 0; i < nodes.length; i++) {
      const nodeWrapper = document.createElement('div');
      nodeWrapper.className = 'chain-node-wrapper';

      const node = document.createElement('div');
      node.className = 'chain-node';
      node.style.backgroundColor = nodes[i].color;
      node.textContent = nodes[i].name;

      const value = document.createElement('div');
      value.className = 'chain-value';
      value.textContent = '0';

      nodeWrapper.appendChild(node);
      nodeWrapper.appendChild(value);
      this.chainContainer.appendChild(nodeWrapper);

      this.chainNodes.push(node);
      this.chainValues.push(value);

      if (i < nodes.length - 1) {
        const arrow = document.createElement('div');
        arrow.className = 'chain-arrow';
        this.chainContainer.appendChild(arrow);
      }
    }
  }

  private initModules(): void {
    const canvas = this.mapContainer.querySelector('.hex-canvas') as HTMLCanvasElement;

    this.hexMap = new HexMap(canvas, {
      onTileSelect: this.handleTileSelect.bind(this)
    });

    this.controlPanel = new ControlPanel(this.panelContainer, {
      onEfficiencyChange: this.handleEfficiencyChange.bind(this)
    });

    this.statusBar = new StatusBar(this.statusContainer);
  }

  private handleTileSelect(tile: HexTile | null): void {
    this.controlPanel.updateTile(tile);
    this.updateStatusBar();
    this.updateChainValues();
  }

  private handleEfficiencyChange(tileId: string, efficiency: number): void {
    this.hexMap.setEfficiency(tileId, efficiency);
    this.updateChainValues();
  }

  private resizeCanvas(): void {
    const rect = this.mapContainer.getBoundingClientRect();
    this.hexMap.resize(rect.width, rect.height);
  }

  private startGameLoop(): void {
    const loop = (time: number) => {
      const deltaTime = (time - this.lastTime) / 1000;
      this.lastTime = time;

      this.update(deltaTime);

      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private update(deltaTime: number): void {
    const mines = this.hexMap.getAllMines();
    let outputPerSecond = 0;

    for (const mine of mines) {
      const explorationFactor = mine.exploration / 100;
      outputPerSecond += (mine.annualOutput / 365) * mine.efficiency * explorationFactor * 0.1;
    }

    this.totalMined += outputPerSecond * deltaTime;
    this.totalRevenue += outputPerSecond * deltaTime * 0.5;

    this.statusBar.updateInstant({
      totalMined: this.totalMined,
      revenue: this.totalRevenue,
      mineCount: mines.length
    });

    this.explorationCheckTimer += deltaTime;
    if (this.explorationCheckTimer >= 0.1) {
      this.explorationCheckTimer = 0;
      this.checkExplorationChanges();
    }
  }

  private checkExplorationChanges(): void {
    const selectedTile = this.hexMap.getSelectedTile();
    if (selectedTile) {
      const lastVal = this.lastExplorationValues.get(selectedTile.id);
      if (lastVal !== selectedTile.exploration) {
        this.lastExplorationValues.set(selectedTile.id, selectedTile.exploration);
        this.controlPanel.updateExploration(selectedTile.id, selectedTile.exploration);
        this.updateChainValues();
      }
    }
  }

  private updateChainValues(): void {
    const mines = this.hexMap.getAllMines();
    let totalOutput = 0;

    for (const mine of mines) {
      const explorationFactor = mine.exploration / 100;
      totalOutput += mine.annualOutput * mine.efficiency * explorationFactor;
    }

    const values = [
      totalOutput,
      totalOutput * 0.9,
      totalOutput * 0.75,
      totalOutput * 0.75 * 0.5
    ];

    const colors = [
      totalOutput > 0 ? '#8b5cf6' : '#4b5563',
      totalOutput > 0 ? '#3b82f6' : '#4b5563',
      totalOutput > 0 ? '#10b981' : '#4b5563',
      totalOutput > 0 ? '#f59e0b' : '#4b5563'
    ];

    for (let i = 0; i < 4; i++) {
      this.chainValues[i].textContent = Math.round(values[i]).toString();
      this.chainNodes[i].style.backgroundColor = colors[i];
      this.chainNodes[i].style.boxShadow = totalOutput > 0 
        ? `0 0 20px ${colors[i]}40` 
        : 'none';
    }
  }

  private updateStatusBar(): void {
    const mines = this.hexMap.getAllMines();
    this.statusBar.update({
      totalMined: this.totalMined,
      revenue: this.totalRevenue,
      mineCount: mines.length
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SpaceMiningGame();
});
