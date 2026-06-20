import { Engine, LevelData } from '../game/engine';
import { UIPanel, EditorTool } from './uiPanel';
import { LightSource, ShadowBlock, Brick, Wall } from '../game/levelElements';

interface PlacementAnimation {
  x: number;
  y: number;
  timer: number;
  duration: number;
  type: string;
}

export class Editor {
  engine: Engine;
  uiPanel: UIPanel;
  currentTool: EditorTool = 'none';
  placementAnimations: PlacementAnimation[] = [];
  savedLevelData: LevelData | null = null;

  constructor(engine: Engine) {
    this.engine = engine;
    this.uiPanel = new UIPanel(engine.areaWidth, engine.areaHeight);

    this.uiPanel.onToolSelect = (tool: EditorTool) => {
      this.currentTool = tool;
    };

    this.uiPanel.onRunTest = () => {
      this.runTest();
    };

    this.uiPanel.onClearLevel = () => {
      this.clearLevel();
    };
  }

  handleCanvasClick(canvasX: number, canvasY: number): void {
    if (this.engine.mode === 'play') return;

    const panelResult = this.uiPanel.handleClick(canvasX, canvasY);
    if (panelResult !== null) return;

    if (canvasX >= this.engine.areaWidth) return;

    const gridX = Math.round(canvasX / 40) * 40;
    const gridY = Math.round(canvasY / 40) * 40;

    switch (this.currentTool) {
      case 'light':
        this.engine.lights.push(new LightSource(gridX, gridY));
        this.placementAnimations.push({ x: gridX, y: gridY, timer: 0, duration: 0.2, type: 'light' });
        break;
      case 'shadowBlock':
        this.engine.shadowBlocks.push(new ShadowBlock(gridX - 20, gridY - 20));
        this.placementAnimations.push({ x: gridX, y: gridY, timer: 0, duration: 0.2, type: 'shadowBlock' });
        break;
      case 'brick':
        this.engine.bricks.push(new Brick(gridX - 15, gridY - 10));
        this.placementAnimations.push({ x: gridX, y: gridY, timer: 0, duration: 0.2, type: 'brick' });
        break;
    }
  }

  handleMouseMove(canvasX: number, canvasY: number): void {
    this.uiPanel.handleMouseMove(canvasX, canvasY);
  }

  runTest(): void {
    this.savedLevelData = this.serializeLevel();
    this.engine.loadLevel(this.savedLevelData);
    this.engine.startPlay();
  }

  stopTest(): void {
    if (this.savedLevelData) {
      this.engine.loadLevel(this.savedLevelData);
    }
    this.engine.stopPlay();
  }

  clearLevel(): void {
    this.engine.lights = [];
    this.engine.shadowBlocks = [];
    this.engine.bricks = [];
    this.engine.walls = this.createDefaultWalls();
    this.engine.exit = null;
    this.engine.shadowAreas = [];
    this.currentTool = 'none';
  }

  createDefaultLevel(): LevelData {
    return {
      walls: this.createDefaultWalls().map(w => ({ x: w.x, y: w.y, w: w.w, h: w.h })),
      lights: [],
      shadowBlocks: [],
      bricks: [],
      exit: null,
      playerStart: { x: 100, y: 100 }
    };
  }

  private createDefaultWalls(): Wall[] {
    const w = this.engine.areaWidth;
    const h = this.engine.areaHeight;
    const t = 20;
    return [
      new Wall(0, 0, w, t),
      new Wall(0, h - t, w, t),
      new Wall(0, 0, t, h),
      new Wall(w - t, 0, t, h)
    ];
  }

  serializeLevel(): LevelData {
    return this.engine.getLevelData();
  }

  deserializeLevel(data: LevelData): void {
    this.engine.loadLevel(data);
  }

  update(dt: number): void {
    this.placementAnimations = this.placementAnimations.filter(anim => {
      anim.timer += dt;
      return anim.timer < anim.duration;
    });
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    this.uiPanel.render(ctx, time);
    this.uiPanel.renderSeparator(ctx, this.engine.areaWidth, this.engine.areaHeight);

    if (this.engine.mode === 'editor') {
      this.renderPlacementAnimations(ctx);
      this.renderCursorPreview(ctx, time);
    }
  }

  private renderPlacementAnimations(ctx: CanvasRenderingContext2D): void {
    for (const anim of this.placementAnimations) {
      const progress = anim.timer / anim.duration;
      const scale = 0.3 + 0.7 * this.easeOutBack(progress);
      const alpha = 1 - progress * 0.5;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(anim.x, anim.y);
      ctx.scale(scale, scale);
      ctx.translate(-anim.x, -anim.y);

      if (anim.type === 'light') {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(anim.x, anim.y, 20, 0, Math.PI * 2);
        ctx.fill();
      } else if (anim.type === 'shadowBlock') {
        ctx.fillStyle = 'rgba(74, 74, 90, 0.3)';
        ctx.fillRect(anim.x - 20, anim.y - 20, 40, 40);
      } else if (anim.type === 'brick') {
        ctx.fillStyle = 'rgba(139, 115, 85, 0.3)';
        ctx.fillRect(anim.x - 15, anim.y - 10, 30, 20);
      }

      ctx.restore();
    }
  }

  private renderCursorPreview(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.currentTool === 'none') return;
    if (this.uiPanel.isInsidePanel(this.uiPanel.mouseX)) return;

    const mx = this.uiPanel.mouseX;
    const my = this.uiPanel.mouseY;
    const gridX = Math.round(mx / 40) * 40;
    const gridY = Math.round(my / 40) * 40;

    ctx.save();
    ctx.globalAlpha = 0.4;

    if (this.currentTool === 'light') {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(gridX, gridY, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.currentTool === 'shadowBlock') {
      ctx.fillStyle = '#4A4A5A';
      ctx.fillRect(gridX - 20, gridY - 20, 40, 40);
    } else if (this.currentTool === 'brick') {
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(gridX - 15, gridY - 10, 30, 20);
    }

    ctx.restore();
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
