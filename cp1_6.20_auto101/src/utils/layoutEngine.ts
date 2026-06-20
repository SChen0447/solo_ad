export type ComponentType = 'button' | 'input' | 'card' | 'image' | 'alert' | 'navbar';

export interface CanvasComponent {
  id: string;
  type: ComponentType;
  minWidth: number;
  defaultHeight: number;
}

export interface ComponentPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComponentMeta {
  type: ComponentType;
  name: string;
  icon: string;
  minWidth: number;
  defaultHeight: number;
}

export interface LayoutSnapshot {
  id: string;
  containerWidth: number;
  components: CanvasComponent[];
  timestamp: number;
}

export const COMPONENT_METAS: ComponentMeta[] = [
  { type: 'button', name: '按钮', icon: '🔘', minWidth: 80, defaultHeight: 40 },
  { type: 'input', name: '输入框', icon: '📝', minWidth: 180, defaultHeight: 40 },
  { type: 'card', name: '卡片', icon: '🗂️', minWidth: 200, defaultHeight: 120 },
  { type: 'image', name: '图片占位', icon: '🖼️', minWidth: 150, defaultHeight: 100 },
  { type: 'alert', name: '警告条', icon: '⚠️', minWidth: 280, defaultHeight: 48 },
  { type: 'navbar', name: '导航栏', icon: '🧭', minWidth: 400, defaultHeight: 56 },
];

export const GAP = 12;

export function getComponentMeta(type: ComponentType): ComponentMeta {
  const meta = COMPONENT_METAS.find(m => m.type === type);
  if (!meta) throw new Error(`Unknown component type: ${type}`);
  return meta;
}

export function calculatePositions(
  containerWidth: number,
  components: CanvasComponent[],
  gap: number = GAP
): ComponentPosition[] {
  const positions: ComponentPosition[] = [];
  let currentX = 0;
  let currentY = 0;
  let rowMaxHeight = 0;
  const rowComponents: Array<{ component: CanvasComponent; index: number }> = [];

  const flushRow = () => {
    if (rowComponents.length === 0) return;
    const numInRow = rowComponents.length;
    const totalMinWidth = rowComponents.reduce((sum, rc) => sum + rc.component.minWidth, 0);
    const totalGapWidth = (numInRow - 1) * gap;
    const remainingSpace = containerWidth - totalMinWidth - totalGapWidth;
    const extraPerComponent = remainingSpace > 0 ? remainingSpace / numInRow : 0;

    let xOffset = 0;
    for (const rc of rowComponents) {
      const width = rc.component.minWidth + extraPerComponent;
      positions[rc.index] = {
        id: rc.component.id,
        x: xOffset,
        y: currentY,
        width,
        height: rc.component.defaultHeight,
      };
      xOffset += width + gap;
    }

    currentY += rowMaxHeight + gap;
    rowMaxHeight = 0;
    rowComponents.length = 0;
    currentX = 0;
  };

  components.forEach((component, index) => {
    const spaceNeeded = component.minWidth + (rowComponents.length > 0 ? gap : 0);
    if (currentX + spaceNeeded > containerWidth && rowComponents.length > 0) {
      flushRow();
    }

    rowComponents.push({ component, index });
    currentX += component.minWidth + gap;
    rowMaxHeight = Math.max(rowMaxHeight, component.defaultHeight);
  });

  flushRow();

  return positions;
}

export function calculateTotalHeight(
  positions: ComponentPosition[],
  gap: number = GAP
): number {
  if (positions.length === 0) return 0;
  let maxY = 0;
  for (const pos of positions) {
    maxY = Math.max(maxY, pos.y + pos.height);
  }
  return maxY;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
