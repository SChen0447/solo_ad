import type {
  BattleState,
  PlayerState,
  PlacedCard,
  CardData,
  BattleEvent,
  BattleActionResult,
  PlayCardPayload,
} from './types';
import {
  ELEMENT_COUNTERS,
  ELEMENT_NAMES,
  INITIAL_HP,
  FIELD_SIZE,
  HAND_SIZE,
  SKILL_INFO,
} from './constants';
import { createDeck, shuffleDeck, drawCards } from './cardFactory';

const getElementMod = (attacker: CardData, defender: CardData): number => {
  if (ELEMENT_COUNTERS[attacker.element] === defender.element) return 1.3;
  if (ELEMENT_COUNTERS[defender.element] === attacker.element) return 0.7;
  return 1;
};

const isCounter = (attacker: CardData, defender: CardData): 'strong' | 'weak' | 'neutral' => {
  if (ELEMENT_COUNTERS[attacker.element] === defender.element) return 'strong';
  if (ELEMENT_COUNTERS[defender.element] === attacker.element) return 'weak';
  return 'neutral';
};

export const createInitialPlayer = (
  id: string,
  nickname: string,
  socketId: string
): PlayerState => {
  const rawDeck = createDeck(25);
  const deck = shuffleDeck(rawDeck);
  const { drawn: hand, remaining } = drawCards(deck, HAND_SIZE);

  return {
    id,
    nickname,
    hp: INITIAL_HP,
    maxHp: INITIAL_HP,
    hand,
    deck: remaining,
    field: Array(FIELD_SIZE).fill(null),
    socketId,
    isConnected: true,
  };
};

export const createBattleState = (
  roomId: string,
  players: [PlayerState, PlayerState]
): BattleState => {
  const [p1, p2] = players;
  return {
    roomId,
    players: { [p1.id]: p1, [p2.id]: p2 },
    playerIds: [p1.id, p2.id],
    currentTurnPlayerId: p1.id,
    turnNumber: 1,
    phase: 'playing',
    winnerId: null,
    startedAt: Date.now(),
    lastActionAt: Date.now(),
  };
};

const applySkillsToCard = (card: PlacedCard, isDefending: boolean): PlacedCard => {
  let effAtk = card.attack;
  let effDef = card.defense;

  if (!isDefending) {
    if (card.skill === 'shield') effDef = card.defense * 2;
  }

  return {
    ...card,
    effectiveAttack: effAtk,
    effectiveDefense: effDef,
  };
};

interface AttackResult {
  damageToCard: number;
  damageToPlayer: number;
  isDodged: boolean;
  counterRelation: 'strong' | 'weak' | 'neutral';
  events: BattleEvent[];
}

const performAttack = (
  attacker: PlacedCard,
  defender: PlacedCard | null,
  defenderPlayer: PlayerState
): AttackResult => {
  const events: BattleEvent[] = [];
  const atkCard = applySkillsToCard(attacker, false);
  const defCard = defender ? applySkillsToCard(defender, true) : null;

  const effAttackerAtk = defCard ? Math.round(atkCard.effectiveAttack * getElementMod(atkCard, defCard)) : atkCard.effectiveAttack;
  const counterRelation = defCard ? isCounter(atkCard, defCard) : 'neutral';

  if (defCard && defCard.skill === 'dodge') {
    const dodged = Math.random() < 0.3;
    if (dodged) {
      events.push({
        type: 'skill_triggered',
        message: `${defCard.name} 触发闪避，躲避了攻击！`,
        playerId: defCard.ownerId,
        card: defCard,
        bannerColor: 'info',
      });
      return { damageToCard: 0, damageToPlayer: 0, isDodged: true, counterRelation: 'neutral', events };
    }
  }

  if (defCard) {
    const pierce = attacker.skill === 'pierce';
    const defVal = pierce ? 0 : defCard.effectiveDefense;
    const cardDmg = Math.max(0, effAttackerAtk - defVal);

    let elemMsg = '';
    if (counterRelation === 'strong') {
      elemMsg = `（${ELEMENT_NAMES[attacker.element]}克${ELEMENT_NAMES[defCard.element]}，攻击+30%）`;
    } else if (counterRelation === 'weak') {
      elemMsg = `（${ELEMENT_NAMES[defCard.element]}克${ELEMENT_NAMES[attacker.element]}，攻击-30%）`;
    }

    if (cardDmg > 0) {
      events.push({
        type: 'damage_dealt',
        message: `${attacker.name} 对 ${defCard.name} 造成 ${cardDmg} 点伤害${elemMsg}`,
        playerId: attacker.ownerId,
        card: attacker,
        damage: cardDmg,
        bannerColor: 'danger',
      });
    } else {
      events.push({
        type: 'damage_dealt',
        message: `${attacker.name} 的攻击被 ${defCard.name} 的防御完全抵挡${elemMsg}`,
        playerId: attacker.ownerId,
        card: attacker,
        damage: 0,
        bannerColor: 'info',
      });
    }

    return { damageToCard: cardDmg, damageToPlayer: 0, isDodged: false, counterRelation, events };
  } else {
    const playerDmg = effAttackerAtk;
    events.push({
      type: 'damage_dealt',
      message: `${attacker.name} 直接攻击玩家，造成 ${playerDmg} 点伤害！`,
      playerId: attacker.ownerId,
      card: attacker,
      damage: playerDmg,
      bannerColor: 'danger',
    });
    return { damageToCard: 0, damageToPlayer: playerDmg, isDodged: false, counterRelation, events };
  }
};

export const playCard = (
  state: BattleState,
  playerId: string,
  payload: PlayCardPayload
): BattleActionResult => {
  const events: BattleEvent[] = [];
  const player = state.players[playerId];
  if (!player) return { state, events };

  const cardIndex = player.hand.findIndex((c) => c.id === payload.cardId);
  if (cardIndex === -1) return { state, events };
  if (payload.position < 0 || payload.position >= FIELD_SIZE) return { state, events };
  if (player.field[payload.position] !== null) return { state, events };

  const card = player.hand[cardIndex];
  const placedCard: PlacedCard = {
    ...card,
    position: payload.position,
    ownerId: playerId,
    hasAttacked: true,
    skillUsed: false,
    effectiveAttack: card.attack,
    effectiveDefense: card.defense,
  };

  const newHand = [...player.hand];
  newHand.splice(cardIndex, 1);
  const newField = [...player.field];
  newField[payload.position] = placedCard;

  state.players[playerId] = { ...player, hand: newHand, field: newField };

  events.push({
    type: 'card_placed',
    message: `${player.nickname} 放置了 ${card.name}（${ELEMENT_NAMES[card.element]}）`,
    playerId,
    card,
    bannerColor: 'info',
  });

  if (card.skill === 'heal' && !placedCard.skillUsed) {
    const healAmt = 5;
    const actualHeal = Math.min(healAmt, player.maxHp - player.hp);
    state.players[playerId].hp = Math.min(player.maxHp, player.hp + healAmt);
    newField[payload.position] = { ...placedCard, skillUsed: true };
    state.players[playerId].field = newField;
    if (actualHeal > 0) {
      events.push({
        type: 'heal_done',
        message: `${card.name} 触发治愈，恢复 ${actualHeal} 点生命！`,
        playerId,
        card,
        damage: actualHeal,
        bannerColor: 'success',
      });
    }
  }

  state.lastActionAt = Date.now();
  return { state, events };
};

export const endTurn = (state: BattleState): BattleActionResult => {
  const allEvents: BattleEvent[] = [];
  if (state.phase !== 'playing') return { state, events: allEvents };

  const attackerId = state.currentTurnPlayerId;
  const defenderId = state.playerIds.find((pid) => pid !== attackerId)!;
  const attacker = state.players[attackerId];
  const defender = state.players[defenderId];

  const tauntPositions = defender.field
    .map((c, i) => (c && c.skill === 'taunt' ? i : -1))
    .filter((i) => i !== -1);

  for (const card of attacker.field) {
    if (!card) continue;
    if (card.hasAttacked) continue;

    const attacks = card.skill === 'combo' ? 2 : 1;
    for (let a = 0; a < attacks; a++) {
      if (state.phase === 'ended') break;

      let targetCard: PlacedCard | null = null;
      let targetPos = -1;

      if (tauntPositions.length > 0) {
        const p = tauntPositions[0];
        targetCard = defender.field[p];
        targetPos = p;
      } else {
        for (let i = 0; i < FIELD_SIZE; i++) {
          if (defender.field[i]) {
            targetCard = defender.field[i]!;
            targetPos = i;
            break;
          }
        }
      }

      const result = performAttack(card, targetCard, defender);
      allEvents.push(...result.events);

      if (targetCard && !result.isDodged && result.damageToCard > 0) {
        const cur = defender.field[targetPos]!;
        const newDef = cur.defense - result.damageToCard;
        if (newDef <= 0) {
          defender.field[targetPos] = null;
          allEvents.push({
            type: 'card_destroyed',
            message: `${cur.name} 被摧毁！`,
            playerId: defenderId,
            card: cur,
            bannerColor: 'danger',
          });
        } else {
          defender.field[targetPos] = { ...cur, defense: newDef, effectiveDefense: newDef };
        }
      }

      if (result.damageToPlayer > 0) {
        defender.hp = Math.max(0, defender.hp - result.damageToPlayer);
        if (defender.hp <= 0) {
          state.phase = 'ended';
          state.winnerId = attackerId;
          allEvents.push({
            type: 'battle_ended',
            message: `${attacker.nickname} 获得胜利！`,
            playerId: attackerId,
            bannerColor: 'success',
          });
          break;
        }
      }
    }
  }

  if (state.phase === 'ended') {
    state.lastActionAt = Date.now();
    return { state, events: allEvents };
  }

  state.currentTurnPlayerId = defenderId;
  state.turnNumber += 1;

  const nextPlayer = state.players[state.currentTurnPlayerId];
  if (nextPlayer.deck.length > 0 && nextPlayer.hand.length < HAND_SIZE + 2) {
    const { drawn, remaining } = drawCards(nextPlayer.deck, 1);
    nextPlayer.hand = [...nextPlayer.hand, ...drawn];
    nextPlayer.deck = remaining;
  }

  for (const c of nextPlayer.field) {
    if (c) c.hasAttacked = false;
  }
  for (const c of attacker.field) {
    if (c) c.hasAttacked = true;
  }

  allEvents.push({
    type: 'turn_ended',
    message: `轮到 ${nextPlayer.nickname} 的回合（第 ${state.turnNumber} 回合）`,
    playerId: state.currentTurnPlayerId,
    bannerColor: 'info',
  });

  state.lastActionAt = Date.now();
  return { state, events: allEvents };
};
