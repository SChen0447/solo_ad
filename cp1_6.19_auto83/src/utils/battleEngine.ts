import { CardData, Element, getElementAdvantage, ELEMENT_LABELS } from '../stores/cardStore';

export const calculateEffectivePower = (
  card: CardData,
  opponentElement: Element,
  options: { resonanceActive?: boolean } = {}
): number => {
  const elementMultiplier = getElementAdvantage(card.element, opponentElement);
  const skillBonus = card.skill.powerBonus || 0;
  let power = (card.basePower + skillBonus) * elementMultiplier;

  if (options.resonanceActive) {
    power *= 1.3;
  }

  return Math.round(power);
};

export const checkResonance = (playedElements: Element[]): Element | null => {
  if (playedElements.length < 3) return null;
  const lastThree = playedElements.slice(-3);
  if (
    lastThree[0] === lastThree[1] &&
    lastThree[1] === lastThree[2]
  ) {
    return lastThree[0];
  }
  return null;
};

export const resolveBattle = (
  playerCard: CardData,
  aiCard: CardData,
  resonanceActive: boolean
): {
  winner: 'player' | 'ai' | 'draw';
  playerDamage: number;
  aiDamage: number;
  playerPower: number;
  aiPower: number;
} => {
  const playerPower = calculateEffectivePower(playerCard, aiCard.element, { resonanceActive });
  const aiPower = calculateEffectivePower(aiCard, playerCard.element);

  if (playerPower > aiPower) {
    return {
      winner: 'player',
      playerDamage: 0,
      aiDamage: playerPower - aiPower,
      playerPower,
      aiPower,
    };
  } else if (aiPower > playerPower) {
    return {
      winner: 'ai',
      playerDamage: aiPower - playerPower,
      aiDamage: 0,
      playerPower,
      aiPower,
    };
  }
  return {
    winner: 'draw',
    playerDamage: 0,
    aiDamage: 0,
    playerPower,
    aiPower,
  };
};

export const calculateDeckStats = (
  deck: CardData[]
): {
  totalPower: number;
  elementDistribution: Record<Element, number>;
  averagePower: number;
} => {
  const totalPower = deck.reduce((sum, c) => sum + c.basePower, 0);
  const elementDistribution: Record<Element, number> = {
    fire: 0,
    water: 0,
    earth: 0,
    wind: 0,
    light: 0,
    dark: 0,
  };
  deck.forEach((c) => {
    elementDistribution[c.element]++;
  });
  return {
    totalPower,
    elementDistribution,
    averagePower: deck.length > 0 ? Math.round(totalPower / deck.length) : 0,
  };
};

export const getElementColor = (element: Element): string => {
  const colors: Record<Element, string> = {
    fire: '#ff5722',
    water: '#03a9f4',
    earth: '#8bc34a',
    wind: '#00bcd4',
    light: '#ffeb3b',
    dark: '#9c27b0',
  };
  return colors[element];
};

export const formatBattleMessage = (
  winner: 'player' | 'ai' | 'draw',
  playerCard: CardData,
  aiCard: CardData,
  playerPower: number,
  aiPower: number,
  damage: number
): string => {
  const playerName = `${playerCard.name}(${playerPower})`;
  const aiName = `${aiCard.name}(${aiPower})`;

  if (winner === 'player') {
    return `${playerName} 击败了 ${aiName}，造成 ${damage} 点伤害！`;
  } else if (winner === 'ai') {
    return `${aiName} 击败了 ${playerName}，造成 ${damage} 点伤害！`;
  }
  return `${playerName} 与 ${aiName} 势均力敌！`;
};

export { ELEMENT_LABELS };
