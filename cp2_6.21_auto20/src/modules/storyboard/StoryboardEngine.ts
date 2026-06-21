import { Panel, Size, GRID_SIZE, DEFAULT_PANEL_WIDTH, DEFAULT_PANEL_HEIGHT, MIN_PANEL_SIZE, CANVAS_PADDING } from '../../types';

export class StoryboardEngine {
  private gridSize: number = GRID_SIZE;

  constructor(gridSize: number = GRID_SIZE) {
    this.gridSize = gridSize;
  }

  snapToGrid(value: number): number {
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  snapPanelToGrid(panel: Panel): Panel {
    return {
      ...panel,
      x: this.snapToGrid(panel.x),
      y: this.snapToGrid(panel.y)
    };
  }

  generatePanelId(): string {
    return `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createDefaultPanel(x: number = CANVAS_PADDING, y: number = CANVAS_PADDING, order: number = 0): Panel {
    return {
      id: this.generatePanelId(),
      x: this.snapToGrid(x),
      y: this.snapToGrid(y),
      width: DEFAULT_PANEL_WIDTH,
      height: DEFAULT_PANEL_HEIGHT,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: '#333333',
      order,
      bubbles: [],
      effects: []
    };
  }

  clampPanelPosition(panel: Panel, canvasSize: Size, spacing: number = 10): Panel {
    const minX = CANVAS_PADDING;
    const minY = CANVAS_PADDING;
    const maxX = Math.max(minX, canvasSize.width - panel.width - CANVAS_PADDING);
    const maxY = Math.max(minY, canvasSize.height - panel.height - CANVAS_PADDING);

    return {
      ...panel,
      x: Math.min(Math.max(panel.x, minX), maxX),
      y: Math.min(Math.max(panel.y, minY), maxY)
    };
  }

  clampPanelSize(panel: Panel): Panel {
    return {
      ...panel,
      width: Math.max(MIN_PANEL_SIZE, this.snapToGrid(panel.width)),
      height: Math.max(MIN_PANEL_SIZE, this.snapToGrid(panel.height))
    };
  }

  checkPanelSpacing(panels: Panel[], movingId: string, spacing: number): string[] {
    const warnings: string[] = [];
    const movingPanel = panels.find(p => p.id === movingId);
    if (!movingPanel) return warnings;

    for (const other of panels) {
      if (other.id === movingId) continue;
      const overlap = this.getPanelOverlap(movingPanel, other, spacing);
      if (overlap) {
        warnings.push(other.id);
      }
    }
    return warnings;
  }

  private getPanelOverlap(a: Panel, b: Panel, spacing: number): boolean {
    const ax1 = a.x - spacing;
    const ay1 = a.y - spacing;
    const ax2 = a.x + a.width + spacing;
    const ay2 = a.y + a.height + spacing;
    const bx1 = b.x;
    const by1 = b.y;
    const bx2 = b.x + b.width;
    const by2 = b.y + b.height;

    return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
  }

  movePanelByKeyboard(panel: Panel, dx: number, dy: number, canvasSize: Size, useGrid: boolean = true): Panel {
    let newX = panel.x + dx;
    let newY = panel.y + dy;
    if (useGrid) {
      newX = this.snapToGrid(newX);
      newY = this.snapToGrid(newY);
    }
    const moved = { ...panel, x: newX, y: newY };
    return this.clampPanelPosition(moved, canvasSize);
  }

  resizePanel(panel: Panel, newWidth: number, newHeight: number, canvasSize: Size): Panel {
    let resized = {
      ...panel,
      width: Math.max(MIN_PANEL_SIZE, this.snapToGrid(newWidth)),
      height: Math.max(MIN_PANEL_SIZE, this.snapToGrid(newHeight))
    };
    return this.clampPanelPosition(resized, canvasSize);
  }

  autoArrangePanels(panels: Panel[], canvasSize: Size, spacing: number): Panel[] {
    if (panels.length === 0) return panels;

    const sorted = [...panels].sort((a, b) => a.order - b.order);
    let x = CANVAS_PADDING;
    let y = CANVAS_PADDING;
    let rowMaxHeight = 0;
    const result: Panel[] = [];

    for (const panel of sorted) {
      if (x + panel.width > canvasSize.width - CANVAS_PADDING && rowMaxHeight > 0) {
        x = CANVAS_PADDING;
        y += rowMaxHeight + spacing;
        rowMaxHeight = 0;
      }

      result.push({
        ...panel,
        x: this.snapToGrid(x),
        y: this.snapToGrid(y)
      });

      x += panel.width + spacing;
      rowMaxHeight = Math.max(rowMaxHeight, panel.height);
    }

    return result;
  }

  reorderPanels(panels: Panel[], fromIndex: number, toIndex: number): Panel[] {
    const sorted = [...panels].sort((a, b) => a.order - b.order);
    const [removed] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, removed);
    return sorted.map((panel, idx) => ({ ...panel, order: idx }));
  }
}

export const storyboardEngine = new StoryboardEngine();
