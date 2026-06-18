import { Fragment, FragmentColor, useGameStore, colorMap } from '../store/gameStore';

export interface FragmentGridConfig {
  gridSize: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

export function getGridConfig(
  width: number,
  height: number
): FragmentGridConfig {
  const gridSize = 6;
  const cellSize = 80;
  const offsetX = (width - (gridSize - 1) * cellSize) / 2;
  const offsetY = (height - (gridSize - 1) * cellSize) / 2;
  return { gridSize, cellSize, offsetX, offsetY };
}

export function getFragmentPosition(
  fragment: Fragment,
  config: FragmentGridConfig,
  time: number
): { x: number; y: number } {
  const floatAmplitude = 5;
  const floatPeriod = 2;
  const floatY =
    Math.sin((time / floatPeriod) * Math.PI * 2 + fragment.floatPhase) *
    floatAmplitude;

  return {
    x: config.offsetX + fragment.gridX * config.cellSize,
    y: config.offsetY + fragment.gridY * config.cellSize + floatY,
  };
}

export function getColorHex(color: FragmentColor): string {
  return colorMap[color];
}

export function collectFragment(fragmentId: string): void {
  const state = useGameStore.getState();
  const fragment = state.fragments.find((f) => f.id === fragmentId);
  if (!fragment || fragment.collected) return;

  const config = getGridConfig(
    window.innerWidth * 0.7,
    window.innerHeight
  );
  const pos = getFragmentPosition(fragment, config, performance.now() / 1000);

  state.collectFragment(fragmentId);
  state.addParticles(pos.x, pos.y, colorMap[fragment.color]);
}

export function getCollectedFragmentsByColor(): Record<FragmentColor, number> {
  const state = useGameStore.getState();
  const counts: Record<FragmentColor, number> = {
    gold: 0,
    jade: 0,
    blue: 0,
    red: 0,
  };

  state.fragments.forEach((f) => {
    if (f.collected) {
      counts[f.color] += 1;
    }
  });

  return counts;
}

export function isPointInFragment(
  px: number,
  py: number,
  fx: number,
  fy: number,
  size: number
): boolean {
  const dx = px - fx;
  const dy = py - fy;
  return Math.sqrt(dx * dx + dy * dy) <= size;
}

export function findFragmentAtPosition(
  x: number,
  y: number,
  config: FragmentGridConfig,
  time: number,
  hitRadius: number = 25
): Fragment | null {
  const state = useGameStore.getState();

  for (const fragment of state.fragments) {
    if (fragment.collected) continue;
    const pos = getFragmentPosition(fragment, config, time);
    if (isPointInFragment(x, y, pos.x, pos.y, hitRadius)) {
      return fragment;
    }
  }

  return null;
}
