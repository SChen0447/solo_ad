import { useGameStore, Blessing, FragmentColor } from '../store/gameStore';
import { getCollectedFragmentsByColor } from './collectible';

export function canActivateBlessing(blessing: Blessing): boolean {
  if (blessing.activated) return false;
  const collected = getCollectedFragmentsByColor();

  for (const req of blessing.requirements) {
    if (collected[req.color] < req.count) {
      return false;
    }
  }

  return true;
}

export function getAvailableBlessings(): Blessing[] {
  const state = useGameStore.getState();
  return state.blessings.filter((b) => canActivateBlessing(b));
}

export function getActivatedBlessings(): Blessing[] {
  const state = useGameStore.getState();
  return state.blessings.filter((b) => b.activated);
}

export function activateBlessingById(blessingId: string): boolean {
  const state = useGameStore.getState();
  const blessing = state.blessings.find((b) => b.id === blessingId);

  if (!blessing || !canActivateBlessing(blessing)) {
    return false;
  }

  state.activateBlessing(blessingId);
  state.triggerFlash();

  return true;
}

export function getBlessingList(): Blessing[] {
  return useGameStore.getState().blessings;
}

export function getBlessingRequirementText(blessing: Blessing): string {
  const colorNames: Record<FragmentColor, string> = {
    gold: '金色',
    jade: '翠绿',
    blue: '蓝色',
    red: '红色',
  };

  return blessing.requirements
    .map((r) => `${r.count}个${colorNames[r.color]}碎片`)
    .join(' + ');
}

export function getStatDisplayName(stat: 'attack' | 'defense' | 'speed'): string {
  const names = {
    attack: '攻击力',
    defense: '防御力',
    speed: '移动速度',
  };
  return names[stat];
}

export function checkHiddenStoryUnlock(): boolean {
  const activated = getActivatedBlessings();
  return activated.length >= 4;
}
