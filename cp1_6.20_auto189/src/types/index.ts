export interface CombatEvent {
  timestamp: string;
  monster_name: string;
  monster_type: string;
  damage: number;
  is_kill: boolean;
  heal: number;
}

export interface Achievement {
  id: string;
  name: string;
  monster_type: string;
  target_count: number;
  deadline: string;
  current_count: number;
  created_at: string;
}

export type MonsterType = '人形' | '野兽' | '亡灵' | '元素' | '恶魔';

export type Theme = 'light' | 'dark';
