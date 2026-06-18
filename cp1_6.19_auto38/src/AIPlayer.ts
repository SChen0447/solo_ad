import { Card, Faction, Position, useGameStore } from './GameState';

interface AIDecision {
  action: 'move' | 'attack';
  cardId?: string;
  targetPosition?: Position;
  sourceId?: string;
  angle?: number;
}

const BOARD_SIZE = 8;

const calculateDistance = (a: Position, b: Position): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

const getAngleBetween = (from: Position, to: Position): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
  return ((angle % 360) + 360) % 360;
};

const getValidMovePositions = (card: Card, cards: Card[]): Position[] => {
  const positions: Position[] = [];
  const { x, y } = card.position;

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const newX = x + dx;
      const newY = y + dy;
      if (newX < 0 || newX >= BOARD_SIZE || newY < 0 || newY >= BOARD_SIZE) continue;
      const occupied = cards.some(
        (c) => c.position.x === newX && c.position.y === newY
      );
      if (!occupied) {
        positions.push({ x: newX, y: newY });
      }
    }
  }

  return positions;
};

const evaluatePosition = (
  card: Card,
  position: Position,
  enemies: Card[],
  mirrors: Card[]
): number => {
  let score = 0;

  let minDistanceToEnemy = Infinity;
  enemies.forEach((enemy) => {
    const dist = calculateDistance(position, enemy.position);
    minDistanceToEnemy = Math.min(minDistanceToEnemy, dist);
  });

  score -= minDistanceToEnemy * 10;

  mirrors.forEach((mirror) => {
    const distToMirror = calculateDistance(position, mirror.position);
    if (distToMirror > 0 && distToMirror < 4) {
      score += 50 / distToMirror;
    }
  });

  if (position.x >= 2 && position.x <= 5) score += 10;
  if (position.y >= 2 && position.y <= 5) score += 10;

  return score;
};

export const getAIDecision = (): AIDecision | null => {
  const state = useGameStore.getState();
  const { cards, currentPlayer, hasMoved, hasAttacked, calculateBeamPath } = state;

  if (currentPlayer !== 'enemy') return null;

  const myCards = cards.filter((c) => c.faction === 'enemy' && c.type === 'hero');
  const myBase = cards.find((c) => c.faction === 'enemy' && c.type === 'base');
  const playerCards = cards.filter(
    (c) => c.faction === 'player' && (c.type === 'hero' || c.type === 'base')
  );
  const mirrors = cards.filter((c) => c.isMirror);

  const sortedTargets = [...playerCards].sort((a, b) => {
    if (a.type === 'base' && b.type !== 'base') return -1;
    if (b.type === 'base' && a.type !== 'base') return 1;
    return a.hp - b.hp;
  });

  if (!hasMoved && myCards.length > 0) {
    let bestMove: { cardId: string; position: Position; score: number } | null = null;

    myCards.forEach((card) => {
      const validPositions = getValidMovePositions(card, cards);
      validPositions.forEach((pos) => {
        const score = evaluatePosition(card, pos, playerCards, mirrors);
        if (!bestMove || score > bestMove.score) {
          bestMove = { cardId: card.id, position: pos, score };
        }
      });
    });

    if (bestMove && bestMove.score > 0) {
      return {
        action: 'move',
        cardId: bestMove.cardId,
        targetPosition: bestMove.position,
      };
    }
  }

  if (!hasAttacked && sortedTargets.length > 0) {
    const myAttackers = [...myCards];
    if (myBase) myAttackers.push(myBase);

    let bestAttack: { sourceId: string; angle: number; score: number } | null = null;

    myAttackers.forEach((source) => {
      sortedTargets.forEach((target) => {
        let baseAngle = getAngleBetween(
          { x: source.position.x + 0.5, y: source.position.y + 0.5 },
          { x: target.position.x + 0.5, y: target.position.y + 0.5 }
        );

        const testAngles: number[] = [baseAngle];

        if (Math.random() < 0.3) {
          const offset = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 30);
          testAngles.push(baseAngle + offset);
          testAngles.push(baseAngle - offset);
        }

        for (let i = 0; i < 8; i++) {
          testAngles.push(i * 45);
        }

        testAngles.forEach((angle) => {
          const normalizedAngle = Math.round(angle / 5) * 5;
          const { hits } = calculateBeamPath(source, normalizedAngle);

          let score = 0;
          if (hits.length > 0) {
            hits.forEach((hitId) => {
              const hitCard = cards.find((c) => c.id === hitId);
              if (hitCard) {
                const damage = Math.max(1, source.attack - hitCard.defense);
                if (hitCard.type === 'base') {
                  score += 100 + damage * 10;
                } else {
                  score += 50 + damage * 5;
                }
                if (hitCard.hp <= damage) {
                  score += 200;
                }
              }
            });
          } else {
            score -= 10;
          }

          if (!bestAttack || score > bestAttack.score) {
            bestAttack = { sourceId: source.id, angle: normalizedAngle, score };
          }
        });
      });
    });

    if (bestAttack && bestAttack.score > 0) {
      return {
        action: 'attack',
        sourceId: bestAttack.sourceId,
        angle: bestAttack.angle,
      };
    }

    if (bestAttack) {
      return {
        action: 'attack',
        sourceId: bestAttack.sourceId,
        angle: bestAttack.angle,
      };
    }
  }

  return null;
};

export const executeAITurn = (): void => {
  const state = useGameStore.getState();
  if (state.phase !== 'ai' || state.winner) return;

  const startTime = Date.now();
  const maxDecisionTime = 1000;

  const makeDecision = () => {
    if (Date.now() - startTime > maxDecisionTime) {
      state.addLog('AI 思考超时，跳过回合', 'info');
      state.nextTurn();
      return;
    }

    const decision = getAIDecision();

    if (!decision) {
      if (!state.hasMoved || !state.hasAttacked) {
        setTimeout(() => {
          if (!state.hasMoved && !state.hasAttacked) {
            state.nextTurn();
          } else if (!state.hasAttacked) {
            state.nextTurn();
          } else {
            state.nextTurn();
          }
        }, 500 / state.animationSpeed);
      } else {
        setTimeout(() => state.nextTurn(), 500 / state.animationSpeed);
      }
      return;
    }

    setTimeout(() => {
      if (decision.action === 'move' && decision.cardId && decision.targetPosition) {
        state.moveCard(decision.cardId, decision.targetPosition);
        setTimeout(makeDecision, 600 / state.animationSpeed);
      } else if (decision.action === 'attack' && decision.sourceId && decision.angle !== undefined) {
        state.fireBeam(decision.sourceId, decision.angle);
        setTimeout(() => {
          if (!state.winner) {
            state.nextTurn();
          }
        }, 1200 / state.animationSpeed);
      } else {
        state.nextTurn();
      }
    }, 400 / state.animationSpeed);
  };

  setTimeout(makeDecision, 300 / state.animationSpeed);
};
