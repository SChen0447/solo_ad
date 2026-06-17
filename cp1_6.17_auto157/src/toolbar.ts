import { ElementType, ELEMENT_CONFIGS, LevelManager } from './level';
import { PathResult } from './pathfinder';

export interface ToolbarCallbacks {
  onDragStart: (type: ElementType) => void;
  onDragEnd: () => void;
  onDetectPaths: () => void;
  onStartPosChange: (x: number, y: number) => void;
  onEndPosChange: (x: number, y: number) => void;
  onDeleteSelected: () => void;
  onRotateSelected: (direction: 1 | -1) => void;
  onCopySelected: () => void;
}

export class Toolbar {
  private container: HTMLElement;
  private level: LevelManager;
  private callbacks: ToolbarCallbacks;
  private leftPanel!: HTMLElement;
  private rightPanel!: HTMLElement;
  private startXInput!: HTMLInputElement;
  private startYInput!: HTMLInputElement;
  private endXInput!: HTMLInputElement;
  private endYInput!: HTMLInputElement;
  private widthDisplay!: HTMLElement;
  private heightDisplay!: HTMLElement;
  private resultContainer!: HTMLElement;
  private draggedType: ElementType | null = null;

  constructor(container: HTMLElement, level: LevelManager, callbacks: ToolbarCallbacks) {
    this.container = container;
    this.level = level;
    this.callbacks = callbacks;
    this.createUI();
  }

  private