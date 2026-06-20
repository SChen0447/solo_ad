export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type TabType = 'editor' | 'battle' | 'deck';

export type CardSide = 'player' | 'enemy';

export interface Card {
  id: string;
  name: string;
  hp: number;
  attack: number;
  skill: string;
  rarity: Rarity;
  currentHp?: number;
  position?: { row: number; col: number };
  side?: CardSide;
}

export interface RarityConfig {
  color: string;
  gradient: { start: string; end: string };
  label: string;
}

export interface BattleCell {
  row: number;
  col: number;
  card: Card | null;
}

export interface AttackState {
  active: boolean;
  from: { x: number; y: number } | null;
  to: { x: number; y: number } | null;
}

export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  common: {
    color: '#B0B0B0',
    gradient: { start: '#E0E0E0', end: '#808080' },
    label: '普通'
  },
  rare: {
    color: '#4A90D9',
    gradient: { start: '#6BB3FF', end: '#2D5AA8' },
    label: '稀有'
  },
  epic: {
    color: '#9B59B6',
    gradient: { start: '#C39BD3', end: '#6C3483' },
    label: '史诗'
  },
  legendary: {
    color: '#F39C12',
    gradient: { start: '#FFD700', end: '#D35400' },
    label: '传说'
  }
};

export const THEME = {
  background: '#1A1A2E',
  text: '#EAEAEA',
  accent: '#E94560',
  gridLine: '#E0E0E0',
  deckBackground: '#2C3E50',
  modalOverlay: '#00000080'
};

export const ANIMATION_CONFIG = {
  tabSwitch: { duration: 0.2 },
  attack: { duration: 0.2 },
  hpUpdate: { duration: 0.15 },
  cardDelete: { duration: 0.3 },
  modal: { duration: 0.2 }
};

export const SIZES = {
  cardWidth: 300,
  cardHeight: 420,
  cardRadius: 8,
  cellSize: 80,
  sidebarWidth: 250,
  menuWidth: 280,
  thumbnailWidth: 80,
  thumbnailHeight: 112,
  thumbnailRadius: 4
};

export const FIELDS = [
  { key: 'name', label: '卡牌名称', type: 'text', placeholder: '请输入卡牌名称' },
  { key: 'hp', label: '生命值', type: 'number', placeholder: '0' },
  { key: 'attack', label: '攻击力', type: 'number', placeholder: '0' },
  { key: 'skill', label: '技能描述', type: 'textarea', placeholder: '请输入技能描述' },
  { key: 'rarity', label: '稀有度', type: 'select', options: ['common', 'rare', 'epic', 'legendary'] }
];
