import { GameEngine } from '../game/engine';
import { LevelData } from '../game/levelElements';

export type EditorTool = 'lightSource' | 'shadowBlock' | 'brick' | null;

export interface EditorCallbacks {
  onToolChange: (tool: EditorTool) => void;
  onModeChange: (playing: boolean) => void;
  onLevelComplete: () => void;
  onPlayerFormChange: (form: string) => void;
}

export class LevelEditor {
  private engine: GameEngine;
  private activeTool: EditorTool = null;
  private callbacks: EditorCallbacks;
  private lastPlaceTime: Map<string, number> = new Map();
  private placeCooldown: number = 150;

  constructor(canvas: HTMLCanvasElement, callbacks: EditorCallbacks) {
    this.callbacks = callbacks;
    this.engine = new GameEngine(canvas, {
      onPlayerFormChange: (form) => callbacks.onPlayerFormChange(form.toString()),
      onLevelComplete: () => callbacks.onLevelComplete(),
      getActiveTool: () => this.activeTool,
      onElementPlaced: (type, x, y) => this.handlePlaceElement(type, x, y)
    });
  }

  public start(): void {
    this.engine.start();
  }

  public stop(): void {
    this.engine.stop();
  }

  public resize(width: number, height: number): void {
    this.engine.resize(width, height);
  }

  public setTool(tool: EditorTool): void {
    if (this.engine.isInPlayMode()) return;
    this.activeTool = tool;
    this.callbacks.onToolChange(tool);
  }

  public getTool(): EditorTool {
    return this.activeTool;
  }

  public isPlaying(): boolean {
    return this.engine.isInPlayMode();
  }

  private handlePlaceElement(type: string, x: number, y: number): void {
    if (this.engine.isInPlayMode()) return;
    const now = performance.now();
    const last = this.lastPlaceTime.get(type) || 0;
    if (now - last < this.placeCooldown) return;
    this.lastPlaceTime.set(type, now);
    this.engine.addElement(type, x, y);
  }

  public clearLevel(): void {
    if (this.engine.isInPlayMode()) return;
    this.engine.clearLevel();
  }

  public startPlayMode(): void {
    this.activeTool = null;
    this.callbacks.onToolChange(null);
    this.engine.startPlayMode();
    this.callbacks.onModeChange(true);
  }

  public stopPlayMode(): void {
    this.engine.startEditorMode();
    this.callbacks.onModeChange(false);
  }

  public serializeLevel(): string {
    return JSON.stringify(this.engine.getLevelData(), null, 2);
  }

  public deserializeLevel(data: string): void {
    try {
      const levelData: LevelData = JSON.parse(data);
      this.engine.loadLevel(levelData);
    } catch (e) {
      console.error('Failed to load level:', e);
    }
  }

  public handleInput(input: {
    keys: Set<string>;
    mouseX: number;
    mouseY: number;
    mouseDown: boolean;
    spacePressed: boolean;
  }): void {
    this.engine.handleInput(input);
  }

  public getEngine(): GameEngine {
    return this.engine;
  }
}
