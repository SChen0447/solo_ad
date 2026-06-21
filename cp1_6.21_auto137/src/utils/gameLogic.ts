import { v4 as uuidv4 } from 'uuid';

export type EventType = 'double' | 'gain' | 'lose' | 'freeze' | 'steal' | 'bonus';

export interface GameEvent {
  id: string;
  type: EventType;
  name: string;
  description: string;
  value: number;
  duration: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  score: number;
  roundScores: number[];
  eventCounts: number;
  isFrozen: boolean;
  frozenRounds: number;
  activeEvent: GameEvent | null;
}

export interface Ranking {
  player: Player;
  rank: number;
}

const EVENT_TEMPLATES: Omit<GameEvent, 'id'>[] = [
  { type: 'double', name: '双倍积分', description: '本回合获得的积分翻倍', value: 2, duration: 1 },
  { type: 'gain', name: '幸运降临', description: '获得3分', value: 3, duration: 0 },
  { type: 'gain', name: '意外之财', description: '获得5分', value: 5, duration: 0 },
  { type: 'lose', name: '损失积分', description: '损失2分', value: -2, duration: 0 },
  { type: 'lose', name: '霉运当头', description: '损失4分', value: -4, duration: 0 },
  { type: 'freeze', name: '冻结回合', description: '下回合禁止得分', value: 0, duration: 1 },
  { type: 'bonus', name: '额外奖励', description: '获得1分', value: 1, duration: 0 },
  { type: 'bonus', name: '小试牛刀', description: '获得2分', value: 2, duration: 0 },
];

const AVATAR_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#95E1D3',
  '#A8D8EA',
  '#FF9FF3',
  '#54A0FF',
  '#FF6348',
];

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateEvent(): GameEvent {
  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  return {
    ...template,
    id: uuidv4(),
  };
}

export function applyEventEffect(player: Player, event: GameEvent): Player {
  const updatedPlayer = { ...player };
  updatedPlayer.eventCounts += 1;

  switch (event.type) {
    case 'gain':
    case 'bonus':
      updatedPlayer.score += event.value;
      const roundIdx = Math.max(0, updatedPlayer.roundScores.length - 1);
      if (updatedPlayer.roundScores[roundIdx] !== undefined) {
        updatedPlayer.roundScores[roundIdx] += event.value;
      }
      break;
    case 'lose':
      updatedPlayer.score += event.value;
      const rIdx = Math.max(0, updatedPlayer.roundScores.length - 1);
      if (updatedPlayer.roundScores[rIdx] !== undefined) {
        updatedPlayer.roundScores[rIdx] += event.value;
      }
      break;
    case 'freeze':
      updatedPlayer.isFrozen = true;
      updatedPlayer.frozenRounds = event.duration;
      updatedPlayer.activeEvent = event;
      break;
    case 'double':
      updatedPlayer.activeEvent = event;
      break;
  }

  return updatedPlayer;
}

export function createPlayer(name: string, colorIndex: number): Player {
  return {
    id: uuidv4(),
    name,
    color: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length],
    score: 0,
    roundScores: [],
    eventCounts: 0,
    isFrozen: false,
    frozenRounds: 0,
    activeEvent: null,
  };
}

export function addBaseScore(player: Player, baseScore: number): Player {
  const updatedPlayer = { ...player };
  
  if (player.isFrozen) {
    return updatedPlayer;
  }

  let finalScore = baseScore;
  if (player.activeEvent?.type === 'double') {
    finalScore *= player.activeEvent.value;
  }

  updatedPlayer.score += finalScore;
  const roundIdx = Math.max(0, updatedPlayer.roundScores.length - 1);
  if (updatedPlayer.roundScores[roundIdx] !== undefined) {
    updatedPlayer.roundScores[roundIdx] += finalScore;
  }

  return updatedPlayer;
}

export function startNewRound(player: Player): Player {
  const updatedPlayer = { ...player };
  
  if (updatedPlayer.frozenRounds > 0) {
    updatedPlayer.frozenRounds -= 1;
    if (updatedPlayer.frozenRounds === 0) {
      updatedPlayer.isFrozen = false;
      updatedPlayer.activeEvent = null;
    }
  } else if (updatedPlayer.activeEvent?.type === 'double') {
    updatedPlayer.activeEvent = null;
  }

  updatedPlayer.roundScores = [...updatedPlayer.roundScores, 0];

  return updatedPlayer;
}

export function getHighestSingleRound(player: Player): number {
  if (player.roundScores.length === 0) return 0;
  return Math.max(...player.roundScores);
}

export function rankPlayers(players: Player[]): Ranking[] {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return getHighestSingleRound(b) - getHighestSingleRound(a);
  });

  return sorted.map((player, index) => ({
    player,
    rank: index + 1,
  }));
}

export function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export function shuffleColors(count: number): string[] {
  return shuffleArray(AVATAR_COLORS).slice(0, count);
}
