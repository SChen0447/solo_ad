import { v4 as uuidv4 } from 'uuid';
import type { CardData, ElementType, SkillType } from '../shared/types';
import { CARD_NAMES_BY_ELEMENT, SKILL_INFO } from '../shared/constants';

const ELEMENTS: ElementType[] = ['fire', 'water', 'wind', 'earth', 'light', 'dark'];
const SKILLS: SkillType[] = ['combo', 'shield', 'pierce', 'heal', 'taunt', 'dodge'];

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const createCard = (): CardData => {
  const element = pickRandom(ELEMENTS);
  const skill = pickRandom(SKILLS);
  const names = CARD_NAMES_BY_ELEMENT[element];

  return {
    id: uuidv4(),
    name: pickRandom(names),
    element,
    attack: randInt(3, 8),
    defense: randInt(1, 5),
    skill,
    skillName: SKILL_INFO[skill].name,
    skillDesc: SKILL_INFO[skill].desc,
  };
};

export const createDeck = (size: number = 20): CardData[] => {
  const deck: CardData[] = [];
  for (let i = 0; i < size; i++) {
    deck.push(createCard());
  }
  return deck;
};

export const shuffleDeck = <T>(deck: T[]): T[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const drawCards = (deck: CardData[], count: number): { drawn: CardData[]; remaining: CardData[] } => {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { drawn, remaining };
};
