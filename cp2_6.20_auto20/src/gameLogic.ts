import { v4 as uuidv4 } from 'uuid';

export interface Card {
  id: string;
  attack: number;
}

export interface PlayerState {
  id: string;
  name: string;
  hp: number;
  hand: Card[];
  isTurn: boolean;
}

export interface GameState {
  round: number;
  players: PlayerState[];
  gameOver: boolean;
  winnerId?: string;
  winnerName?: string;
  totalRounds?: number;
}

export const INITIAL_HP = 20;
export const INITIAL_HAND_SIZE = 5;
export const MIN_ATTACK = 1;
export const MAX_ATTACK = 5;

export function generateCard(): Card {
  return {
    id: uuidv4(),
    attack: Math.floor(Math.random() * MAX_ATTACK) + MIN_ATTACK
  };
}

export function generateHand(count: number): Card[] {
  return Array.from({ length: count }, () => generateCard());
}

export function createInitialPlayerState(
  id: string,
  name: string,
  isTurn: boolean = false
): PlayerState {
  return {
    id,
    name,
    hp: INITIAL_HP,
    hand: generateHand(INITIAL_HAND_SIZE),
    isTurn
  };
}

export function createInitialGameState(
  player1Id: string,
  player1Name: string,
  player2Id: string,
  player2Name: string
): GameState {
  return {
    round: 1,
    players: [
      createInitialPlayerState(player1Id, player1Name, true),
      createInitialPlayerState(player2Id, player2Name, false)
    ],
    gameOver: false
  };
}

export function calculateDamage(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.attack, 0);
}

export function applyDamage(player: PlayerState, damage: number): PlayerState {
  const newHp = Math.max(0, player.hp - damage);
  return {
    ...player,
    hp: newHp
  };
}

export function removeCardsFromHand(hand: Card[], cardIds: string[]): Card[] {
  return hand.filter(card => !cardIds.includes(card.id));
}

export function playCards(
  state: GameState,
  playerId: string,
  cardIds: string[]
): {
  newState: GameState;
  playedCards: Card[];
  totalDamage: number;
  gameOver: boolean;
} {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    throw new Error('Player not found');
  }

  const player = state.players[playerIndex];
  if (!player.isTurn) {
    throw new Error('Not your turn');
  }

  const playedCards = player.hand.filter(card => cardIds.includes(card.id));
  if (playedCards.length === 0) {
    throw new Error('No cards selected');
  }

  const totalDamage = calculateDamage(playedCards);
  const opponentIndex = (playerIndex + 1) % 2;
  const opponent = state.players[opponentIndex];
  const damagedOpponent = applyDamage(opponent, totalDamage);
  const gameOver = damagedOpponent.hp <= 0;

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...player,
    hand: removeCardsFromHand(player.hand, cardIds)
  };
  newPlayers[opponentIndex] = damagedOpponent;

  const newState: GameState = {
    ...state,
    players: newPlayers,
    gameOver,
    winnerId: gameOver ? player.id : undefined,
    winnerName: gameOver ? player.name : undefined,
    totalRounds: gameOver ? state.round : undefined
  };

  return {
    newState,
    playedCards,
    totalDamage,
    gameOver
  };
}

export function endTurn(state: GameState): {
  newState: GameState;
  drawnCard: Card;
  nextPlayerId: string;
} {
  if (state.gameOver) {
    throw new Error('Game is over');
  }

  const currentTurnIndex = state.players.findIndex(p => p.isTurn);
  const nextTurnIndex = (currentTurnIndex + 1) % 2;
  const drawnCard = generateCard();

  const newPlayers = state.players.map((player, index) => ({
    ...player,
    isTurn: index === nextTurnIndex,
    hand: index === nextTurnIndex ? [...player.hand, drawnCard] : player.hand
  }));

  const newState: GameState = {
    ...state,
    round: state.round + 1,
    players: newPlayers
  };

  return {
    newState,
    drawnCard,
    nextPlayerId: newPlayers[nextTurnIndex].id
  };
}

export function checkGameOver(state: GameState): boolean {
  return state.players.some(player => player.hp <= 0);
}

export function getWinner(state: GameState): PlayerState | null {
  if (!checkGameOver(state)) return null;
  return state.players.find(player => player.hp > 0) || null;
}

export function getHpColorGradient(hp: number): string {
  const percentage = (hp / INITIAL_HP) * 100;
  if (percentage <= 20) {
    return 'linear-gradient(90deg, #c62828, #ff5252)';
  } else if (percentage <= 50) {
    return 'linear-gradient(90deg, #ef6c00, #ffab40)';
  } else {
    return 'linear-gradient(90deg, #2e7d32, #66bb6a)';
  }
}

export function canPlayCard(player: PlayerState): boolean {
  return player.isTurn && player.hand.length > 0;
}

export function restartGame(
  state: GameState
): GameState {
  const [player1, player2] = state.players;
  return createInitialGameState(
    player1.id,
    player1.name,
    player2.id,
    player2.name
  );
}
