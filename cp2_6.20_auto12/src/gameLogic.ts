export interface Card {
  id: string;
  attack: number;
  name: string;
}

export interface PlayerState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  hand: Card[];
  deck: Card[];
}

export interface GameState {
  players: [PlayerState, PlayerState];
  currentTurn: number;
  turnNumber: number;
  gameOver: boolean;
  winner: string | null;
}

const CARD_NAMES = [
  '烈焰斩', '冰霜箭', '雷电击', '暗影刃', '圣光波',
  '风暴锤', '毒雾弹', '地狱火', '月光斩', '星辰击',
  '混沌球', '元素冲', '灵魂弹', '魔力箭', '虚空击',
  '龙息吐', '雷霆怒', '冰晶刺', '炎爆术', '暗夜袭',
  '圣盾击', '旋风斩', '寒冰掌', '烈阳拳', '冥火弹',
];

export function generateDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 20; i++) {
    deck.push({
      id: `card-${Math.random().toString(36).substring(2, 9)}`,
      attack: Math.floor(Math.random() * 5) + 1,
      name: CARD_NAMES[Math.floor(Math.random() * CARD_NAMES.length)],
    });
  }
  return deck;
}

export function drawCard(player: PlayerState): PlayerState {
  if (player.deck.length === 0) {
    return { ...player };
  }
  const [drawn, ...remainingDeck] = player.deck;
  return {
    ...player,
    hand: [...player.hand, drawn],
    deck: remainingDeck,
  };
}

export function createInitialGameState(player1Id: string, player1Name: string, player2Id: string, player2Name: string): GameState {
  const deck1 = generateDeck();
  const deck2 = generateDeck();
  const hand1 = deck1.splice(0, 5);
  const hand2 = deck2.splice(0, 5);

  return {
    players: [
      {
        id: player1Id,
        name: player1Name,
        hp: 20,
        maxHp: 20,
        hand: hand1,
        deck: deck1,
      },
      {
        id: player2Id,
        name: player2Name,
        hp: 20,
        maxHp: 20,
        hand: hand2,
        deck: deck2,
      },
    ],
    currentTurn: 0,
    turnNumber: 1,
    gameOver: false,
    winner: null,
  };
}

export function playCard(state: GameState, playerIndex: number, cardId: string): GameState {
  const player = state.players[playerIndex];
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const opponent = state.players[opponentIndex];

  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return state;

  const card = player.hand[cardIndex];
  const newHand = player.hand.filter((_, i) => i !== cardIndex);
  const newOpponentHp = Math.max(0, opponent.hp - card.attack);

  const newPlayers: [PlayerState, PlayerState] = [...state.players] as [PlayerState, PlayerState];
  newPlayers[playerIndex] = { ...player, hand: newHand };
  newPlayers[opponentIndex] = { ...opponent, hp: newOpponentHp };

  const gameOver = newOpponentHp <= 0;
  const winner = gameOver ? player.id : null;

  return {
    ...state,
    players: newPlayers,
    gameOver,
    winner,
  };
}

export function endTurn(state: GameState): GameState {
  const nextTurn = state.currentTurn === 0 ? 1 : 0;
  const nextTurnNumber = state.currentTurn === 1 ? state.turnNumber + 1 : state.turnNumber;

  const newPlayers: [PlayerState, PlayerState] = [...state.players] as [PlayerState, PlayerState];
  newPlayers[nextTurn] = drawCard(newPlayers[nextTurn]);

  return {
    ...state,
    currentTurn: nextTurn,
    turnNumber: nextTurnNumber,
    players: newPlayers,
  };
}

export function checkGameWinner(state: GameState): { gameOver: boolean; winner: string | null } {
  if (state.players[0].hp <= 0) {
    return { gameOver: true, winner: state.players[1].id };
  }
  if (state.players[1].hp <= 0) {
    return { gameOver: true, winner: state.players[0].id };
  }
  return { gameOver: false, winner: null };
}
