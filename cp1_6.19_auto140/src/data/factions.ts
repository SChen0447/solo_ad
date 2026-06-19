import type { Faction } from '@/types/game';

export const FACTIONS: Faction[] = [
  { id: 'federation', name: '星际联邦', color: '#4ea8de' },
  { id: 'empire', name: '银河帝国', color: '#e63946' },
  { id: 'guild', name: '商业行会', color: '#ffd166' },
  { id: 'freeport', name: '自由港', color: '#06d6a0' },
  { id: 'tech', name: '科技联盟', color: '#9d4edd' },
];

export function getFactionById(id: string): Faction {
  return FACTIONS.find(f => f.id === id) ?? FACTIONS[0];
}
