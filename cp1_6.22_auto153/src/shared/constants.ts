import type { ElementType, SkillType } from './types';

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ef4444',
  water: '#3b82f6',
  wind: '#22c55e',
  earth: '#f97316',
  light: '#eab308',
  dark: '#a855f7',
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  water: '水',
  wind: '风',
  earth: '地',
  light: '光',
  dark: '暗',
};

export const ELEMENT_COUNTERS: Record<ElementType, ElementType> = {
  fire: 'wind',
  wind: 'earth',
  earth: 'water',
  water: 'fire',
  light: 'dark',
  dark: 'light',
};

export const SKILL_INFO: Record<SkillType, { name: string; desc: string }> = {
  combo: { name: '连击', desc: '本回合攻击两次' },
  shield: { name: '护盾', desc: '本回合防御力翻倍' },
  pierce: { name: '穿刺', desc: '无视对方防御' },
  heal: { name: '治愈', desc: '恢复5点生命值' },
  taunt: { name: '嘲讽', desc: '强制对方先攻击此卡' },
  dodge: { name: '闪避', desc: '30%概率躲避攻击' },
};

export const CARD_NAMES_BY_ELEMENT: Record<ElementType, string[]> = {
  fire: ['火焰骑士', '炎龙使者', '烈焰术士', '火山巨兽'],
  water: ['海洋守护', '寒冰法师', '潮汐巨人', '深海猎手'],
  wind: ['疾风刺客', '风暴使者', '飞鹰骑士', '旋风术士'],
  earth: ['大地守护', '岩石巨人', '山岳战士', '荒野猎手'],
  light: ['圣光骑士', '天使使者', '黎明术士', '光辉守护'],
  dark: ['暗影刺客', '暗黑法师', '深渊巨兽', '夜之猎手'],
};

export const INITIAL_HP = 30;
export const HAND_SIZE = 5;
export const FIELD_SIZE = 3;
export const MAX_RECORDS = 10;
export const RECONNECT_TIMEOUT = 30000;

export const SERVER_PORT = 39999;
