import { Unit } from './Unit';

export type FormationType = 'rect' | 'wedge' | 'line';

export const FORMATION_NAMES: Record<FormationType, string> = {
  rect: '矩形阵型',
  wedge: '楔形阵型',
  line: '线列阵型',
};

export class Formation {
  private static readonly UNIT_SPACING = 40;

  public static computeRectFormation(units: Unit[], _center: { x: number; y: number }): Array<{ x: number; y: number }> {
    const count = units.length;
    if (count === 0) return [];

    const cols = Math.max(2, Math.ceil(Math.sqrt(count * 2)));
    const rows = Math.ceil(count / cols);

    const offsets: Array<{ x: number; y: number }> = [];
    const totalWidth = (cols - 1) * Formation.UNIT_SPACING;
    const totalHeight = (rows - 1) * Formation.UNIT_SPACING;
    const startX = -totalWidth / 2;
    const startY = -totalHeight / 2;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      offsets.push({
        x: startX + col * Formation.UNIT_SPACING,
        y: startY + row * Formation.UNIT_SPACING,
      });
    }

    return offsets;
  }

  public static computeWedgeFormation(units: Unit[], _center: { x: number; y: number }): Array<{ x: number; y: number }> {
    const count = units.length;
    if (count === 0) return [];

    const offsets: Array<{ x: number; y: number }> = [];
    let remaining = count;
    let rowIndex = 0;
    let unitsInRow = 1;

    while (remaining > 0) {
      const actualInRow = Math.min(remaining, unitsInRow);
      const rowWidth = (actualInRow - 1) * Formation.UNIT_SPACING;
      const startX = -rowWidth / 2;
      const rowY = rowIndex * Formation.UNIT_SPACING;

      for (let i = 0; i < actualInRow; i++) {
        offsets.push({
          x: startX + i * Formation.UNIT_SPACING,
          y: rowY,
        });
      }

      remaining -= actualInRow;
      rowIndex++;
      unitsInRow += 2;
    }

    const maxY = Math.max(...offsets.map(o => o.y));
    for (const offset of offsets) {
      offset.y -= maxY / 2;
    }

    return offsets;
  }

  public static computeLineFormation(units: Unit[], _center: { x: number; y: number }): Array<{ x: number; y: number }> {
    const count = units.length;
    if (count === 0) return [];

    const offsets: Array<{ x: number; y: number }> = [];
    const totalWidth = (count - 1) * Formation.UNIT_SPACING;
    const startX = -totalWidth / 2;

    for (let i = 0; i < count; i++) {
      offsets.push({
        x: startX + i * Formation.UNIT_SPACING,
        y: 0,
      });
    }

    return offsets;
  }

  public static computeFormation(
    type: FormationType,
    units: Unit[],
    center: { x: number; y: number }
  ): Array<{ x: number; y: number }> {
    switch (type) {
      case 'rect':
        return Formation.computeRectFormation(units, center);
      case 'wedge':
        return Formation.computeWedgeFormation(units, center);
      case 'line':
        return Formation.computeLineFormation(units, center);
      default:
        return Formation.computeRectFormation(units, center);
    }
  }
}
