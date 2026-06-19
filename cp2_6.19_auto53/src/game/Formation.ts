import type { Unit, Position } from './Unit';

export type FormationType = 'rect' | 'wedge' | 'line';

const UNIT_SPACING = 40;

export class Formation {
  public static computeRectFormation(units: Unit[], center: Position): Position[] {
    const count = units.length;
    const offsets: Position[] = [];

    if (count === 0) return offsets;

    const cols = Math.ceil(count / 2);
    const rows = 2;

    const totalWidth = (cols - 1) * UNIT_SPACING;
    const totalHeight = (rows - 1) * UNIT_SPACING;

    const startX = center.x - totalWidth / 2;
    const startY = center.y - totalHeight / 2;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      offsets.push({
        x: startX + col * UNIT_SPACING - center.x,
        y: startY + row * UNIT_SPACING - center.y
      });
    }

    return offsets;
  }

  public static computeWedgeFormation(units: Unit[], center: Position): Position[] {
    const count = units.length;
    const offsets: Position[] = [];

    if (count === 0) return offsets;

    const rows: number[] = [];
    let remaining = count;
    let currentRowCount = 1;
    let totalUnitsInRows = 0;

    while (totalUnitsInRows < count) {
      const addCount = Math.min(currentRowCount, remaining);
      rows.push(addCount);
      remaining -= addCount;
      totalUnitsInRows += addCount;
      currentRowCount += 2;
    }

    const rowCount = rows.length;
    const totalHeight = (rowCount - 1) * UNIT_SPACING;
    const startY = center.y - totalHeight / 2;

    let unitIndex = 0;
    for (let row = 0; row < rowCount; row++) {
      const unitsInRow = rows[row];
      const rowWidth = (unitsInRow - 1) * UNIT_SPACING;
      const startX = center.x - rowWidth / 2;

      for (let col = 0; col < unitsInRow; col++) {
        if (unitIndex >= count) break;
        offsets.push({
          x: startX + col * UNIT_SPACING - center.x,
          y: startY + row * UNIT_SPACING - center.y
        });
        unitIndex++;
      }
    }

    return offsets;
  }

  public static computeLineFormation(units: Unit[], center: Position): Position[] {
    const count = units.length;
    const offsets: Position[] = [];

    if (count === 0) return offsets;

    const totalWidth = (count - 1) * UNIT_SPACING;
    const startX = center.x - totalWidth / 2;

    for (let i = 0; i < count; i++) {
      offsets.push({
        x: startX + i * UNIT_SPACING - center.x,
        y: 0
      });
    }

    return offsets;
  }

  public static computeFormation(
    type: FormationType,
    units: Unit[],
    center: Position
  ): Position[] {
    switch (type) {
      case 'rect':
        return this.computeRectFormation(units, center);
      case 'wedge':
        return this.computeWedgeFormation(units, center);
      case 'line':
        return this.computeLineFormation(units, center);
      default:
        return this.computeRectFormation(units, center);
    }
  }

  public static getFormationName(type: FormationType): string {
    switch (type) {
      case 'rect':
        return '矩形阵型';
      case 'wedge':
        return '楔形阵型';
      case 'line':
        return '线列阵型';
      default:
        return '矩形阵型';
    }
  }
}
