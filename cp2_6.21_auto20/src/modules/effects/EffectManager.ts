import { EffectItem, EffectType, ONOMATOPOEIA_LIST, SPEEDLINE_TYPES, Panel } from '../../types';

export class EffectManager {
  generateEffectId(): string {
    return `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getOnomatopoeiaList(): string[] {
    return ONOMATOPOEIA_LIST;
  }

  getSpeedlineTypes(): string[] {
    return SPEEDLINE_TYPES;
  }

  createEffect(type: EffectType, subtype: string, panel: Panel): EffectItem {
    const defaultX = panel.width / 2;
    const defaultY = panel.height / 2;

    if (type === 'onomatopoeia') {
      return {
        id: this.generateEffectId(),
        type,
        subtype,
        text: subtype,
        x: defaultX - 40,
        y: defaultY - 20,
        rotation: 0,
        scale: 1,
        opacity: 1
      };
    }

    return {
      id: this.generateEffectId(),
      type,
      subtype,
      x: defaultX,
      y: defaultY,
      rotation: 0,
      scale: 1,
      opacity: 0.6
    };
  }

  validateEffectPosition(effect: EffectItem, panel: Panel): EffectItem {
    const padding = 20;
    return {
      ...effect,
      x: Math.min(Math.max(padding, effect.x), panel.width - padding),
      y: Math.min(Math.max(padding, effect.y), panel.height - padding)
    };
  }

  updateEffectRotation(effect: EffectItem, rotation: number): EffectItem {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    return { ...effect, rotation: normalizedRotation };
  }

  updateEffectOpacity(effect: EffectItem, opacity: number): EffectItem {
    const clampedOpacity = Math.min(Math.max(0.2, opacity), 1.0);
    return { ...effect, opacity: Number(clampedOpacity.toFixed(2)) };
  }

  updateEffectScale(effect: EffectItem, scale: number): EffectItem {
    return { ...effect, scale: Math.max(0.1, scale) };
  }

  moveEffect(effect: EffectItem, dx: number, dy: number, panel: Panel): EffectItem {
    const moved = { ...effect, x: effect.x + dx, y: effect.y + dy };
    return this.validateEffectPosition(moved, panel);
  }
}

export const effectManager = new EffectManager();

export interface SpeedlineData {
  lines: { x1: number; y1: number; x2: number; y2: number; width: number }[];
  size: number;
}

export function getSpeedlineData(type: string, size: number = 100): SpeedlineData {
  const lineCount = 12;
  const lines: { x1: number; y1: number; x2: number; y2: number; width: number }[] = [];

  if (type === 'horizontal') {
    for (let i = 0; i < lineCount; i++) {
      const y = (i / lineCount) * size;
      lines.push({ x1: 0, y1: y, x2: size, y2: y, width: 1.5 });
    }
  } else if (type === 'vertical') {
    for (let i = 0; i < lineCount; i++) {
      const x = (i / lineCount) * size;
      lines.push({ x1: x, y1: 0, x2: x, y2: size, width: 1.5 });
    }
  } else if (type === 'radial') {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.45;
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const x1 = centerX + Math.cos(angle) * (radius * 0.3);
      const y1 = centerY + Math.sin(angle) * (radius * 0.3);
      const x2 = centerX + Math.cos(angle) * radius;
      const y2 = centerY + Math.sin(angle) * radius;
      lines.push({ x1, y1, x2, y2, width: 2 });
    }
  }

  return { lines, size };
}
