import { HexMap } from './hexMap';
import { ControlPanel } from './panel';
import { StatusBar } from './statusBar';
import { GameStats, HexCell, GameEvent } from './types';

class Game {
  private app: HTMLElement;
  private hexMap: HexMap | null = null;
  private controlPanel: ControlPanel | null = null;
  private statusBar: StatusBar | null = null;
  private totalExtraction: number = 0;
  private totalRevenue: number = 0;
  private lastExtractionUpdate: number = 0;
  private chainContainer: HTMLElement | null = null;
  private statusContainer: HTMLElement | null = null;

  constructor() {
    this.app = document.getElementById('app') as HTMLElement;
    if (!this.app) {
      throw new Error('找不到 #app 元素');
    }
    this.init();
  }

  private init(): void {
    this.createLayout();
    
    const canvas = document.getElementById('hexCanvas') as HTMLCanvasElement;
    const rightSection = document.getElementById('right-section') as HTMLElement;
    this.chainContainer = document.getElementById('chain-container') as HTMLElement;
    this.statusContainer = document.getElementById('status-container') as HTMLElement;

    if (!canvas || !rightSection || !this.chainContainer || !this.statusContainer) {
      throw new Error('初始化失败：找不到必要的DOM元素');
    }

    this.hexMap = new HexMap(canvas);
    this.controlPanel = new ControlPanel(rightSection);
    this.statusBar = new StatusBar(this.chainContainer, this.statusContainer);

    this.setupEventListeners();
    this.startGameLoop();
    this.startExplorationTimer();
  }

  private createLayout(): void {
    this.app.innerHTML = `
      <div class="main-container">
        <div class="map-container">
          <canvas id="hexCanvas"></canvas>
        </div>
        <div class="right-section" id="right-section"></div>
      </div>
      <div class="chain-container" id="chain-container"></div>
      <div class="status-bar" id="status-container"></div>
    `;
  }

  private setupEventListeners(): void {
    if (!this.hexMap || !this.controlPanel || !this.statusBar) return;

    this.hexMap.addEventListener((event: GameEvent) => {
      this.controlPanel!.handleEvent(event);
      
      if (event.type === 'cell-selected') {
        const cell = event.data as HexCell;
        this.statusBar!.updateFromSelectedCell(cell);
      } else if (event.type === 'cell-deselected') {
        this.statusBar!.updateFromSelectedCell(null);
      } else if (event.type === 'exploration-updated') {
        const cell = event.data as HexCell;
        this.statusBar!.updateFromSelectedCell(cell);
      }
    });

    this.controlPanel.addEventListener((event: GameEvent) => {
      if (event.type === 'efficiency-changed' && this.hexMap) {
        const data = event.data as { cellId: string; efficiency: number };
        this.hexMap.updateEfficiency(data.cellId, data.efficiency);
        
        const selectedCell = this.hexMap.getSelectedCell();
        this.statusBar!.updateFromSelectedCell(selectedCell);
      }
    });
  }

  private startGameLoop(): void {
    if (!this.hexMap || !this.statusBar) return;

    this.hexMap.startAnimationLoop((deltaTime: number) => {
      this.updateGameState(deltaTime);
    });
  }

  private updateGameState(deltaTime: number): void {
    if (!this.hexMap || !this.statusBar) return;

    this.lastExtractionUpdate += deltaTime;
    
    if (this.lastExtractionUpdate >= 1) {
      this.lastExtractionUpdate = 0;
      
      const cells = this.hexMap.getCells();
      const selectedCells = cells.filter((c) => c.selected && c.type !== 'obstacle');
      
      let totalEfficiency = 0;
      for (const cell of selectedCells) {
        const output = cell.annualOutput * cell.efficiency * (cell.explored / 100);
        totalEfficiency += output / 365;
      }

      this.totalExtraction += totalEfficiency;
      this.totalRevenue += totalEfficiency * 0.5;

      const stats: GameStats = {
        totalExtraction: Math.floor(this.totalExtraction),
        totalRevenue: parseFloat(this.totalRevenue.toFixed(1)),
        deployedMines: selectedCells.length,
        totalEfficiency,
      };

      this.statusBar.updateStats(stats);
    }
  }

  private startExplorationTimer(): void {
    setInterval(() => {
      if (this.hexMap) {
        this.hexMap.updateExploration();
      }
    }, 2000);
  }

  public destroy(): void {
    if (this.hexMap) this.hexMap.destroy();
    if (this.controlPanel) this.controlPanel.destroy();
    if (this.statusBar) this.statusBar.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
