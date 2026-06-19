import './style.css';
import { EventBus, AppEvent, ToolType, ElementType, MAX_ELEMENTS } from './types';
import { MazeGenerator } from './mazeGenerator';
import { MapEditor } from './mapEditor';
import { Renderer } from './renderer';
import { Exporter } from './exporter';

class Application {
  private eventBus: EventBus;
  private mazeGenerator: MazeGenerator;
  private mapEditor: MapEditor;

  private mazeSizeSelect: HTMLSelectElement;
  private generateBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private toolButtons: NodeListOf<HTMLButtonElement>;
  private startCountEl: HTMLElement;
  private endCountEl: HTMLElement;
  private monsterCountEl: HTMLElement;
  private currentToolEl: HTMLElement;
  private sidebar: HTMLElement;
  private sidebarToggle: HTMLButtonElement;

  private currentTool: ToolType = null;

  constructor() {
    this.eventBus = new EventBus();
    this.mazeGenerator = new MazeGenerator();
    this.mapEditor = new MapEditor(this.eventBus);

    this.mazeSizeSelect = document.getElementById('maze-size') as HTMLSelectElement;
    this.generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    this.toolButtons = document.querySelectorAll('.tool-btn');
    this.startCountEl = document.getElementById('start-count') as HTMLElement;
    this.endCountEl = document.getElementById('end-count') as HTMLElement;
    this.monsterCountEl = document.getElementById('monster-count') as HTMLElement;
    this.currentToolEl = document.getElementById('current-tool') as HTMLElement;
    this.sidebar = document.getElementById('sidebar') as HTMLElement;
    this.sidebarToggle = document.getElementById('sidebar-toggle') as HTMLButtonElement;

    new Renderer(
      this.eventBus,
      'maze-canvas',
      'thumbnail-canvas',
      'maze-wrapper'
    );
    new Exporter(this.eventBus);

    this.setupEventListeners();
    this.setupCustomEvents();
    this.checkResponsiveSidebar();

    this.generateInitialMaze();
  }

  private setupEventListeners(): void {
    this.generateBtn.addEventListener('click', () => this.generateMaze());
    this.exportBtn.addEventListener('click', () => this.exportData());

    this.toolButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool as ElementType;
        this.selectTool(tool);
      });
    });

    this.sidebarToggle.addEventListener('click', () => {
      this.sidebar.classList.toggle('collapsed');
    });

    this.mazeSizeSelect.addEventListener('change', () => {
      this.generateMaze();
    });

    window.addEventListener('resize', () => {
      this.checkResponsiveSidebar();
    });
  }

  private setupCustomEvents(): void {
    this.eventBus.on('cell:click' as any, (payload: { x: number; y: number }) => {
      this.mapEditor.handleCellClick(payload.x, payload.y);
    });

    this.eventBus.on(AppEvent.ELEMENT_PLACED, () => {
      this.updateElementCounts();
    });

    this.eventBus.on(AppEvent.ELEMENT_REMOVED, () => {
      this.updateElementCounts();
    });

    this.eventBus.on(AppEvent.MAZE_GENERATED, () => {
      this.updateElementCounts();
      this.eventBus.emit(AppEvent.TOOL_CHANGED, { tool: null });
      this.currentTool = null;
      this.updateToolButtonStates();
      this.updateCurrentToolDisplay();
    });

    this.eventBus.on(AppEvent.TOOL_CHANGED, (payload) => {
      this.currentTool = payload.tool;
      this.updateToolButtonStates();
      this.updateCurrentToolDisplay();
    });
  }

  private selectTool(tool: ElementType): void {
    if (this.currentTool === tool) {
      this.eventBus.emit(AppEvent.TOOL_CHANGED, { tool: null });
    } else {
      this.eventBus.emit(AppEvent.TOOL_CHANGED, { tool });
    }
  }

  private updateToolButtonStates(): void {
    this.toolButtons.forEach((btn) => {
      const btnTool = btn.dataset.tool;
      if (btnTool === this.currentTool) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updateCurrentToolDisplay(): void {
    const toolNames: Record<string, string> = {
      start: '起点',
      end: '终点',
      monster: '怪物刷新点',
      erase: '擦除'
    };

    if (this.currentTool) {
      this.currentToolEl.textContent = toolNames[this.currentTool] || this.currentTool;
    } else {
      this.currentToolEl.textContent = '未选择';
    }
  }

  private updateElementCounts(): void {
    this.startCountEl.textContent = this.mapEditor.getElementCount('starts').toString();
    this.endCountEl.textContent = this.mapEditor.getElementCount('ends').toString();
    this.monsterCountEl.textContent = this.mapEditor.getElementCount('monsters').toString();

    this.startCountEl.style.color =
      this.mapEditor.getElementCount('starts') >= MAX_ELEMENTS ? '#f87171' : '';
    this.endCountEl.style.color =
      this.mapEditor.getElementCount('ends') >= MAX_ELEMENTS ? '#f87171' : '';
    this.monsterCountEl.style.color =
      this.mapEditor.getElementCount('monsters') >= MAX_ELEMENTS ? '#f87171' : '';
  }

  private generateMaze(): void {
    const size = parseInt(this.mazeSizeSelect.value, 10);
    console.log(`正在生成 ${size}x${size} 迷宫...`);

    const generateTime = performance.now();
    const result = this.mazeGenerator.generate(size, size);
    console.log(`迷宫生成算法耗时: ${(performance.now() - generateTime).toFixed(2)}ms`);

    this.eventBus.emit(AppEvent.MAZE_GENERATED, {
      grid: result.grid,
      width: result.width,
      height: result.height,
      entrance: result.entrance,
      exit: result.exit
    });

    this.eventBus.emit(AppEvent.SHOW_MESSAGE, {
      text: `已生成 ${result.width}x${result.height} 迷宫`,
      type: 'info'
    });
  }

  private generateInitialMaze(): void {
    setTimeout(() => {
      this.generateMaze();
    }, 200);
  }

  private exportData(): void {
    this.eventBus.emit(AppEvent.EXPORT_REQUESTED);
  }

  private checkResponsiveSidebar(): void {
    const width = window.innerWidth;
    if (width < 1200) {
      this.sidebar.classList.add('collapsed');
    } else {
      this.sidebar.classList.remove('collapsed');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Application();
});
