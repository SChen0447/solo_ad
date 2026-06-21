export type PetType = 'cat' | 'dog' | 'dragon' | 'unicorn' | 'penguin' | 'fox';

export type Mood = 'happy' | 'hungry' | 'sleepy' | 'bored' | 'sick';

export type ActionType = 'feed' | 'play' | 'sleep';

export type InteractionType = 'greet' | 'gift';

export interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
}

export interface Pet {
  id: string;
  name: string;
  type: PetType;
  ownerId: string;
  stats: PetStats;
  mood: Mood;
  isSick: boolean;
  sickStartTime?: number;
  lastActionTime: Record<ActionType, number>;
  createdAt: number;
}

export interface Interaction {
  id: string;
  fromPetId: string;
  toPetId: string;
  type: InteractionType;
  timestamp: number;
}

export interface Notification {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface PetPreset {
  type: PetType;
  name: string;
  description: string;
  initialStats: PetStats;
  colors: {
    from: string;
    to: string;
  };
}

export const PET_PRESETS: PetPreset[] = [
  {
    type: 'cat',
    name: '猫咪',
    description: '优雅神秘的小猫咪',
    initialStats: { hunger: 70, happiness: 60, energy: 80 },
    colors: { from: '#9ca3af', to: '#d1d5db' }
  },
  {
    type: 'dog',
    name: '狗狗',
    description: '忠诚热情的小伙伴',
    initialStats: { hunger: 75, happiness: 85, energy: 90 },
    colors: { from: '#a0522d', to: '#deb887' }
  },
  {
    type: 'dragon',
    name: '小龙',
    description: '威风凛凛的小神龙',
    initialStats: { hunger: 60, happiness: 70, energy: 95 },
    colors: { from: '#8b5cf6', to: '#a78bfa' }
  },
  {
    type: 'unicorn',
    name: '独角兽',
    description: '梦幻神奇的独角兽',
    initialStats: { hunger: 65, happiness: 90, energy: 75 },
    colors: { from: '#ec4899', to: '#f9a8d4' }
  },
  {
    type: 'penguin',
    name: '企鹅',
    description: '憨态可掬的小企鹅',
    initialStats: { hunger: 80, happiness: 75, energy: 60 },
    colors: { from: '#1e3a5f', to: '#3b82f6' }
  },
  {
    type: 'fox',
    name: '狐狸',
    description: '聪明伶俐的小狐狸',
    initialStats: { hunger: 65, happiness: 80, energy: 85 },
    colors: { from: '#f97316', to: '#fdba74' }
  }
];

export const ACTION_COOLDOWN = 2000;
export const STATE_DECREASE_INTERVAL = 180000;
export const SICK_DURATION = 300000;
export const SICK_THRESHOLD = 10;
export const WARNING_THRESHOLD = 20;
