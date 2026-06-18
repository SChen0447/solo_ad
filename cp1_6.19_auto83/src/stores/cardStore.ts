import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type Element = 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Page = 'codex' | 'deck' | 'battle';

export interface CardSkill {
  name: string;
  description: string;
  powerBonus?: number;
}

export interface CardData {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  stars: number;
  basePower: number;
  icon: string;
  skill: CardSkill;
  evolution?: string[];
}

export interface BattleState {
  playerHp: number;
  aiHp: number;
  playerHand: CardData[];
  aiDeck: CardData[];
  turn: number;
  isPlayerTurn: boolean;
  playerCard: CardData | null;
  aiCard: CardData | null;
  battleLog: string[];
  resonanceChain: Element[];
  resonanceTriggered: boolean;
  battleOver: boolean;
  winner: 'player' | 'ai' | null;
  score: number;
}

interface AppState {
  currentPage: Page;
  allCards: CardData[];
  collectedCardIds: string[];
  playerDeck: CardData[];
  battle: BattleState | null;
  cardsLoaded: boolean;
  setCurrentPage: (page: Page) => void;
  initCards: () => Promise<void>;
  addToDeck: (card: CardData) => boolean;
  removeFromDeck: (index: number) => void;
  startBattle: () => void;
  playCard: (cardIndex: number) => void;
  aiPlay: () => void;
  endBattle: (winner: 'player' | 'ai') => void;
  resetResonance: () => void;
}

const MOCK_CARDS: Omit<CardData, 'id'>[] = [
  {
    name: '炎龙兽',
    element: 'fire',
    rarity: 'legendary',
    stars: 5,
    basePower: 150,
    icon: '🐲',
    skill: { name: '烈焰吐息', description: '对敌方造成额外20点火焰伤害', powerBonus: 20 },
    evolution: ['幼龙', '火龙', '炎龙兽'],
  },
  {
    name: '碧波灵',
    element: 'water',
    rarity: 'epic',
    stars: 4,
    basePower: 120,
    icon: '🌊',
    skill: { name: '海啸冲击', description: '水系卡牌战力+15', powerBonus: 15 },
    evolution: ['水滴精', '碧波灵'],
  },
  {
    name: '岩甲龟',
    element: 'earth',
    rarity: 'rare',
    stars: 3,
    basePower: 95,
    icon: '🐢',
    skill: { name: '大地守护', description: '受到伤害减少10点', powerBonus: 0 },
  },
  {
    name: '疾风燕',
    element: 'wind',
    rarity: 'rare',
    stars: 3,
    basePower: 88,
    icon: '🦅',
    skill: { name: '狂风斩', description: '先手攻击+10', powerBonus: 10 },
  },
  {
    name: '圣光天使',
    element: 'light',
    rarity: 'epic',
    stars: 4,
    basePower: 130,
    icon: '👼',
    skill: { name: '神圣祝福', description: '恢复15点生命', powerBonus: 0 },
    evolution: ['光精灵', '圣光天使'],
  },
  {
    name: '暗影魔',
    element: 'dark',
    rarity: 'epic',
    stars: 4,
    basePower: 125,
    icon: '👹',
    skill: { name: '虚空吞噬', description: '吸收敌方10点战力', powerBonus: 10 },
  },
  {
    name: '火花精',
    element: 'fire',
    rarity: 'common',
    stars: 2,
    basePower: 60,
    icon: '🔥',
    skill: { name: '火花', description: '造成5点额外伤害', powerBonus: 5 },
  },
  {
    name: '露珠精',
    element: 'water',
    rarity: 'common',
    stars: 2,
    basePower: 58,
    icon: '💧',
    skill: { name: '水珠弹', description: '水系小技能', powerBonus: 5 },
  },
  {
    name: '小草妖',
    element: 'earth',
    rarity: 'common',
    stars: 2,
    basePower: 55,
    icon: '🌱',
    skill: { name: '缠绕', description: '降低敌方5点战力', powerBonus: 0 },
  },
  {
    name: '微风蝶',
    element: 'wind',
    rarity: 'common',
    stars: 1,
    basePower: 45,
    icon: '🦋',
    skill: { name: '微风', description: '普通攻击', powerBonus: 0 },
  },
  {
    name: '光点兽',
    element: 'light',
    rarity: 'rare',
    stars: 3,
    basePower: 85,
    icon: '✨',
    skill: { name: '闪光', description: '使敌方短暂失明', powerBonus: 8 },
  },
  {
    name: '暗影蝠',
    element: 'dark',
    rarity: 'rare',
    stars: 3,
    basePower: 90,
    icon: '🦇',
    skill: { name: '音波', description: '暗系声波攻击', powerBonus: 8 },
  },
  {
    name: '凤凰',
    element: 'fire',
    rarity: 'legendary',
    stars: 5,
    basePower: 160,
    icon: '🔥',
    skill: { name: '涅槃重生', description: '死亡时复活一次', powerBonus: 25 },
    evolution: ['火雀', '朱雀', '凤凰'],
  },
  {
    name: '海神龙',
    element: 'water',
    rarity: 'legendary',
    stars: 5,
    basePower: 155,
    icon: '🐉',
    skill: { name: '深海漩涡', description: '全体水系+30', powerBonus: 30 },
    evolution: ['水龙', '海神龙'],
  },
  {
    name: '山神',
    element: 'earth',
    rarity: 'legendary',
    stars: 5,
    basePower: 145,
    icon: '⛰️',
    skill: { name: '地裂', description: '大地震颤伤害', powerBonus: 22 },
  },
  {
    name: '雷神',
    element: 'wind',
    rarity: 'epic',
    stars: 4,
    basePower: 135,
    icon: '⚡',
    skill: { name: '雷霆一击', description: '风系+20伤害', powerBonus: 20 },
  },
];

const ELEMENT_ADVANTAGE: Record<Element, Element> = {
  fire: 'earth',
  water: 'fire',
  earth: 'wind',
  wind: 'water',
  light: 'dark',
  dark: 'light',
};

export const getElementAdvantage = (attacker: Element, defender: Element): number => {
  if (ELEMENT_ADVANTAGE[attacker] === defender) return 1.5;
  if (ELEMENT_ADVANTAGE[defender] === attacker) return 0.75;
  return 1;
};

export const ELEMENT_LABELS: Record<Element, string> = {
  fire: '火',
  water: '水',
  earth: '土',
  wind: '风',
  light: '光',
  dark: '暗',
};

const MAX_DECK_SIZE = 10;
const INITIAL_HP = 500;

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'codex',
  allCards: [],
  collectedCardIds: [],
  playerDeck: [],
  battle: null,
  cardsLoaded: false,

  setCurrentPage: (page) => set({ currentPage: page }),

  initCards: async () => {
    await new Promise((r) => setTimeout(r, 200));
    const cards: CardData[] = MOCK_CARDS.map((c) => ({ ...c, id: uuidv4() }));
    set({
      allCards: cards,
      collectedCardIds: cards.map((c) => c.id),
      cardsLoaded: true,
    });
  },

  addToDeck: (card) => {
    const state = get();
    if (state.playerDeck.length >= MAX_DECK_SIZE) return false;
    set({ playerDeck: [...state.playerDeck, card] });
    return true;
  },

  removeFromDeck: (index) => {
    const state = get();
    const newDeck = [...state.playerDeck];
    newDeck.splice(index, 1);
    set({ playerDeck: newDeck });
  },

  startBattle: () => {
    const state = get();
    if (state.playerDeck.length < 3) return;

    const allCards = state.allCards;
    const playerElements = state.playerDeck.map((c) => c.element);
    const elementCount: Record<string, number> = {};
    playerElements.forEach((e) => {
      elementCount[e] = (elementCount[e] || 0) + 1;
    });

    const sortedElements = Object.entries(elementCount).sort((a, b) => b[1] - a[1]);
    const aiCardPool: CardData[] = [];

    sortedElements.forEach(([element]) => {
      const counters = (Object.entries(ELEMENT_ADVANTAGE) as [Element, Element][])
        .filter(([, v]) => v === element)
        .map(([k]) => k);
      counters.forEach((ce) => {
        const matching = allCards.filter((c) => c.element === ce);
        aiCardPool.push(...matching);
      });
    });

    if (aiCardPool.length < 10) {
      allCards.forEach((c) => {
        if (!aiCardPool.includes(c)) aiCardPool.push(c);
      });
    }

    const shuffled = [...aiCardPool].sort(() => Math.random() - 0.5).slice(0, 10);
    const playerShuffled = [...state.playerDeck].sort(() => Math.random() - 0.5);
    const initialHand = playerShuffled.slice(0, 5);

    set({
      currentPage: 'battle',
      battle: {
        playerHp: INITIAL_HP,
        aiHp: INITIAL_HP,
        playerHand: initialHand,
        aiDeck: shuffled,
        turn: 1,
        isPlayerTurn: true,
        playerCard: null,
        aiCard: null,
        battleLog: ['⚔️ 战斗开始！'],
        resonanceChain: [],
        resonanceTriggered: false,
        battleOver: false,
        winner: null,
        score: 0,
      },
    });
  },

  playCard: (cardIndex) => {
    const state = get();
    if (!state.battle || !state.battle.isPlayerTurn || state.battle.battleOver) return;

    const card = state.battle.playerHand[cardIndex];
    if (!card) return;

    const newHand = [...state.battle.playerHand];
    newHand.splice(cardIndex, 1);

    const resonanceChain = [...state.battle.resonanceChain, card.element];
    const lastThree = resonanceChain.slice(-3);
    let resonanceTriggered = false;
    if (
      lastThree.length === 3 &&
      lastThree[0] === lastThree[1] &&
      lastThree[1] === lastThree[2]
    ) {
      resonanceTriggered = true;
    }

    set({
      battle: {
        ...state.battle,
        playerHand: newHand,
        playerCard: card,
        isPlayerTurn: false,
        resonanceChain,
        resonanceTriggered,
        battleLog: [...state.battle.battleLog, `🎴 你打出了 ${card.name}（${ELEMENT_LABELS[card.element]}系）`],
      },
    });
  },

  aiPlay: () => {
    const state = get();
    if (!state.battle || state.battle.battleOver) return;

    const aiDeck = state.battle.aiDeck;
    if (aiDeck.length === 0) {
      set({
        battle: {
          ...state.battle,
          battleOver: true,
          winner: 'player',
          battleLog: [...state.battle.battleLog, '🎉 AI卡组耗尽，你获胜了！'],
        },
      });
      return;
    }

    const aiCardIndex = Math.floor(Math.random() * aiDeck.length);
    const aiCard = aiDeck[aiCardIndex];
    const newAiDeck = [...aiDeck];
    newAiDeck.splice(aiCardIndex, 1);

    set({
      battle: {
        ...state.battle,
        aiDeck: newAiDeck,
        aiCard,
        battleLog: [...state.battle.battleLog, `🤖 AI打出了 ${aiCard.name}（${ELEMENT_LABELS[aiCard.element]}系）`],
      },
    });
  },

  endBattle: (winner) => {
    const state = get();
    if (!state.battle) return;

    const remainingHp = winner === 'player' ? state.battle.playerHp : state.battle.aiHp;
    const baseScore = winner === 'player' ? 100 : 20;
    const hpBonus = Math.floor(remainingHp / 10);
    const score = baseScore + hpBonus;

    set({
      battle: {
        ...state.battle,
        battleOver: true,
        winner,
        score,
        battleLog: [
          ...state.battle.battleLog,
          winner === 'player' ? `🏆 你获胜了！获得 ${score} 积分` : `💀 你失败了，获得 ${score} 积分`,
        ],
      },
    });
  },

  resetResonance: () => {
    const state = get();
    if (!state.battle) return;
    set({
      battle: {
        ...state.battle,
        resonanceTriggered: false,
      },
    });
  },
}));
