import { Season } from './plantLibrary';
import * as sceneManager from './sceneManager';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_NAMES: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

let currentIndex = 0;
let isTransitioning = false;
let onSeasonChange: ((season: Season) => void) | null = null;

export function init(): void {
  currentIndex = 0;
}

export function dispatch(season: Season): void {
  const newIndex = SEASONS.indexOf(season);
  if (newIndex === -1 || newIndex === currentIndex) return;
  if (isTransitioning) return;

  isTransitioning = true;
  currentIndex = newIndex;

  sceneManager.setSeason(season, true);

  if (onSeasonChange) onSeasonChange(season);

  setTimeout(() => {
    isTransitioning = false;
  }, 2000);
}

export function dispatchByIndex(index: number): void {
  const clamped = Math.max(0, Math.min(3, index));
  dispatch(SEASONS[clamped]);
}

export function getCurrentSeason(): Season {
  return SEASONS[currentIndex];
}

export function getCurrentIndex(): number {
  return currentIndex;
}

export function getSeasons(): Season[] {
  return SEASONS;
}

export function getSeasonName(season: Season): string {
  return SEASON_NAMES[season];
}

export function setOnSeasonChange(cb: (season: Season) => void): void {
  onSeasonChange = cb;
}
